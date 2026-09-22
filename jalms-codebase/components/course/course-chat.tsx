"use client"

import * as React from "react"
import { format } from "date-fns"
import { Hash, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import {
  getCourseChatMessages,
  getCourseChatUpdates,
  sendCourseChatMessage,
  type CourseChatCursor,
  type CourseChatMessageDto,
  type CourseChatPage,
} from "@/lib/actions/course-chat.actions"
import { COURSE_CHAT_MAX_LENGTH } from "@/lib/course-chat.shared"
import { syncPocketBaseAuth } from "@/lib/pocketbase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMobileHeader } from "@/components/mobile-header-context"
import { cn } from "@/lib/utils"

function mergeMessages(current: CourseChatMessageDto[], incoming: CourseChatMessageDto[]) {
  const byId = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort((left, right) => {
    const time = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    return time || left.id.localeCompare(right.id)
  })
}

function cursorFor(message: CourseChatMessageDto | undefined): CourseChatCursor | null {
  return message ? { id: message.id, createdAt: message.createdAt } : null
}

function dayKey(value: string) {
  return format(new Date(value), "yyyy-MM-dd")
}

function isGroupedWithPrevious(message: CourseChatMessageDto, previous: CourseChatMessageDto | undefined) {
  if (!previous || previous.sender.id !== message.sender.id || dayKey(previous.createdAt) !== dayKey(message.createdAt)) return false
  return new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000
}

export function CourseChat({
  courseId,
  currentUserId,
  initialPage,
}: {
  courseId: string
  currentUserId: string
  initialPage: CourseChatPage
}) {
  const [messages, setMessages] = React.useState(initialPage.messages)
  const [oldestCursor, setOldestCursor] = React.useState(initialPage.oldestCursor)
  const [hasMore, setHasMore] = React.useState(initialPage.hasMore)
  const [content, setContent] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [isLoadingOlder, setIsLoadingOlder] = React.useState(false)
  const { setHeader, resetHeader } = useMobileHeader()
  const latestCursorRef = React.useRef<CourseChatCursor | null>(initialPage.latestCursor)
  const syncInFlightRef = React.useRef<Promise<void> | null>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const lastMessageId = messages.at(-1)?.id

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lastMessageId])

  React.useEffect(() => () => resetHeader(), [resetHeader])

  React.useEffect(() => {
    setHeader({
      title: "Chat",
      subtitle: null,
      rightAction: null,
    })
  }, [setHeader])

  const syncUpdates = React.useCallback(async () => {
    if (syncInFlightRef.current) return syncInFlightRef.current
    const work = (async () => {
      let cursor = latestCursorRef.current
      let hasAnotherPage = true
      while (hasAnotherPage) {
        const result = await getCourseChatUpdates(courseId, cursor)
        if ("error" in result) {
          toast.error(result.error)
          return
        }
        if (result.messages.length) {
          setMessages((current) => mergeMessages(current, result.messages))
          cursor = result.latestCursor
          latestCursorRef.current = cursor
        }
        hasAnotherPage = result.hasMore && result.messages.length > 0
      }
    })().finally(() => {
      syncInFlightRef.current = null
    })
    syncInFlightRef.current = work
    return work
  }, [courseId])

  React.useEffect(() => {
    let isMounted = true
    let unsubscribe: (() => void) | undefined
    let pollTimeout: ReturnType<typeof setTimeout> | undefined

    const poll = async () => {
      if (!isMounted) return
      // PocketBase realtime is preferred, but this keeps chat working when a
      // browser, proxy, or development server cannot keep a websocket open.
      try {
        await syncUpdates()
      } catch {
        // The next cycle retries after a transient server or network error.
      } finally {
        if (isMounted) pollTimeout = setTimeout(poll, document.hidden ? 15000 : 3000)
      }
    }

    const onVisibility = () => {
      if (!document.hidden) void syncUpdates().catch(() => {})
    }

    void poll()
    void syncPocketBaseAuth().then(async (pb) => {
      if (!isMounted || !pb.authStore.isValid) return
      try {
        const removeSubscription = await pb.collection("course_chat_messages").subscribe("*", (event) => {
          if (String(event.record.courseId || "") === courseId) void syncUpdates().catch(() => {})
        })
        if (isMounted) unsubscribe = removeSubscription
        else removeSubscription()
      } catch {
        // Polling above is the fallback when realtime is unavailable.
      }
    }).catch(() => {})
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      isMounted = false
      if (pollTimeout) clearTimeout(pollTimeout)
      unsubscribe?.()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [courseId, syncUpdates])

  const loadOlder = async () => {
    if (!oldestCursor || isLoadingOlder) return
    setIsLoadingOlder(true)
    try {
      const result = await getCourseChatMessages(courseId, oldestCursor)
      if ("error" in result) return toast.error(result.error)
      setMessages((current) => mergeMessages(result.messages, current))
      setOldestCursor(result.oldestCursor)
      setHasMore(result.hasMore)
    } catch {
      toast.error("Unable to load earlier messages")
    } finally {
      setIsLoadingOlder(false)
    }
  }

  const send = async () => {
    const value = content.trim()
    if (!value || isSending) return
    setIsSending(true)
    try {
      const result = await sendCourseChatMessage(courseId, value)
      if ("error" in result) return toast.error(result.error)
      setMessages((current) => mergeMessages(current, [result.message]))
      latestCursorRef.current = cursorFor(result.message)
      setContent("")
    } catch {
      toast.error("Unable to send message")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-[#313338] dark:bg-[var(--workspace-canvas)] dark:text-foreground">
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        {hasMore && (
          <div className="mb-5 flex justify-center">
            <Button variant="outline" size="sm" className="border-[#d5d7dc] bg-white text-[#4e5058] hover:bg-[#f2f3f5] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted" onClick={loadOlder} disabled={isLoadingOlder}>
              {isLoadingOlder && <Loader2 className="size-4 animate-spin" />}Load earlier messages
            </Button>
          </div>
        )}

        {!messages.length ? (
          <div className="flex min-h-full flex-col justify-end px-4 pb-8 sm:px-6">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#6d6f78] text-white dark:bg-muted dark:text-muted-foreground"><Hash className="size-10" /></div>
            <p className="text-2xl font-bold text-[#060607] dark:text-foreground">Welcome to #chat!</p>
            <p className="mt-1 text-sm text-[#5c5e66] dark:text-muted-foreground">This is the beginning of this course&apos;s group chat.</p>
          </div>
        ) : (
          <div>
            {messages.map((message, index) => {
              const mine = message.sender.id === currentUserId
              const previous = messages[index - 1]
              const grouped = isGroupedWithPrevious(message, previous)
              const showDate = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt)
              const senderName = message.sender.nickname || message.sender.name
              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="relative mx-4 my-6 flex items-center justify-center border-t border-[#e3e5e8] dark:border-border">
                      <span className="absolute bg-white px-2 text-[11px] font-semibold text-[#6d6f78] dark:bg-[var(--workspace-canvas)] dark:text-muted-foreground">
                        {format(new Date(message.createdAt), "MMMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  <div className={cn("group/message flex px-4 hover:bg-[#f2f3f5] dark:hover:bg-[var(--workspace-row-hover)]", grouped ? "min-h-6 py-0.5" : "mt-4 min-h-11 pt-0.5 pb-1")}>
                    <div className="mr-4 flex w-10 shrink-0 justify-center">
                      {grouped ? (
                        <span className="invisible pt-0.5 text-[9px] text-[#80848e] group-hover/message:visible dark:text-muted-foreground">{format(new Date(message.createdAt), "HH:mm")}</span>
                      ) : (
                        <Avatar className="mt-0.5 size-10"><AvatarImage src={message.sender.image || undefined} /><AvatarFallback className="bg-[#5865f2] text-xs font-semibold text-white">{senderName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pr-3">
                      {!grouped && (
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className={cn("text-sm font-semibold hover:underline", mine ? "text-[#5865f2] dark:text-primary" : "text-[#1f6f5c] dark:text-emerald-300")}>{senderName}</span>
                          {mine && <span className="rounded bg-[#5865f2] px-1 py-px text-[9px] font-bold uppercase leading-3 text-white">You</span>}
                          <span className="text-[10px] font-medium text-[#80848e] dark:text-muted-foreground">{format(new Date(message.createdAt), "MMM d, yyyy 'at' HH:mm")}</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.375rem] text-[#313338] dark:text-foreground">{message.content}</p>
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="bg-white px-4 pb-5 pt-2 dark:bg-[var(--workspace-canvas)]">
        <form className="flex min-h-11 items-end rounded-lg bg-[#ebedef] dark:bg-[var(--workspace-sidebar)]" onSubmit={(event) => { event.preventDefault(); void send() }}>
          <div className="min-w-0 flex-1 py-1.5 pl-3">
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void send()
                }
              }}
              maxLength={COURSE_CHAT_MAX_LENGTH}
              placeholder="Message #chat"
              rows={1}
              className="max-h-32 min-h-8 resize-none border-0 bg-transparent px-0 py-1.5 text-[15px] text-[#313338] shadow-none placeholder:text-[#80848e] focus-visible:ring-0 dark:text-foreground dark:placeholder:text-muted-foreground"
              disabled={isSending}
            />
            {content.length > COURSE_CHAT_MAX_LENGTH * 0.8 && <div className="pr-2 text-right text-[10px] text-[#80848e] dark:text-muted-foreground">{content.length}/{COURSE_CHAT_MAX_LENGTH}</div>}
          </div>
          <Button type="submit" variant="ghost" size="icon" className="mb-0.5 size-11 shrink-0 text-[#5865f2] hover:bg-transparent hover:text-[#4752c4] disabled:text-[#b5bac1] dark:text-primary dark:hover:text-foreground dark:disabled:text-muted-foreground" disabled={!content.trim() || isSending} aria-label="Send message">
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </div>
    </section>
  )
}
