"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  getCourseChatMessages,
  getCourseChatUpdates,
  markCourseChatRead,
  type CourseChatCursor,
} from "@/lib/actions/course-chat.actions"
import { type CourseChatRoleContext } from "@/lib/course-chat.shared"
import { syncPocketBaseAuth } from "@/lib/pocketbase/client"

type CourseChatNotificationContextValue = {
  unreadCourseIds: ReadonlySet<string>
  clearCourseUnread: (courseId: string, roleContext: CourseChatRoleContext) => void
}

const CourseChatNotificationContext = React.createContext<CourseChatNotificationContextValue>({
  unreadCourseIds: new Set(),
  clearCourseUnread: () => {},
})

function chatContextFromPath(pathname: string) {
  const match = pathname.match(/^\/(teacher|student)\/courses\/([^/]+)\/chat\/?$/)
  return match ? { roleContext: match[1] as CourseChatRoleContext, courseId: match[2] } : null
}

export function CourseChatNotificationProvider({
  children,
  courseIds,
  initialUnreadCourseIds,
  currentUserId,
}: {
  children: React.ReactNode
  courseIds: string[]
  initialUnreadCourseIds: string[]
  currentUserId: string
}) {
  const pathname = usePathname()
  const activeChatContext = React.useMemo(() => chatContextFromPath(pathname), [pathname])
  const activeChatContextRef = React.useRef(activeChatContext)
  const [unreadCourseIds, setUnreadCourseIds] = React.useState<Set<string>>(() => new Set(initialUnreadCourseIds))
  const courseIdKey = courseIds.join(":")

  React.useEffect(() => {
    activeChatContextRef.current = activeChatContext
  }, [activeChatContext])

  const clearCourseUnread = React.useCallback((courseId: string, roleContext: CourseChatRoleContext) => {
    setUnreadCourseIds((current) => {
      if (!current.has(courseId)) return current
      const next = new Set(current)
      next.delete(courseId)
      return next
    })
    void markCourseChatRead(courseId, roleContext)
  }, [])

  React.useEffect(() => {
    if (activeChatContext) clearCourseUnread(activeChatContext.courseId, activeChatContext.roleContext)
  }, [activeChatContext, clearCourseUnread])

  React.useEffect(() => {
    if (!courseIds.length) return
    let isMounted = true
    let unsubscribe: (() => void) | undefined
    let pollTimeout: ReturnType<typeof setTimeout> | undefined
    const cursors = new Map<string, CourseChatCursor | null>()

    const markIncoming = (courseId: string, senderId: string) => {
      if (senderId === currentUserId) return
      const activeContext = activeChatContextRef.current
      if (activeContext?.courseId === courseId) {
        void markCourseChatRead(courseId, activeContext.roleContext)
        return
      }
      setUnreadCourseIds((current) => {
        if (current.has(courseId)) return current
        const next = new Set(current)
        next.add(courseId)
        return next
      })
    }

    const initializeCursors = async () => {
      const pages = await Promise.all(courseIds.map((courseId) => getCourseChatMessages(courseId)))
      if (!isMounted) return
      pages.forEach((page, index) => {
        if (!("error" in page)) cursors.set(courseIds[index], page.latestCursor)
      })
    }

    const poll = async () => {
      if (!isMounted) return
      try {
        await Promise.all(courseIds.map(async (courseId) => {
          const result = await getCourseChatUpdates(courseId, cursors.get(courseId) ?? null)
          if (!isMounted || "error" in result) return
          cursors.set(courseId, result.latestCursor)
          for (const message of result.messages) markIncoming(courseId, message.sender.id)
        }))
      } catch {
        // Realtime and polling are best effort; the next cycle retries.
      } finally {
        if (isMounted) pollTimeout = setTimeout(poll, document.hidden ? 15000 : 5000)
      }
    }

    void initializeCursors().then(() => { if (isMounted) void poll() }).catch(() => { if (isMounted) void poll() })

    void syncPocketBaseAuth().then(async (pb) => {
      if (!isMounted || !pb.authStore.isValid) return
      try {
        const removeSubscription = await pb.collection("course_chat_messages").subscribe("*", (event) => {
          const courseId = String(event.record.courseId || "")
          if (!courseIds.includes(courseId)) return
          markIncoming(courseId, String(event.record.senderId || ""))
        })
        if (isMounted) unsubscribe = removeSubscription
        else removeSubscription()
      } catch {
        // The polling fallback above keeps unread indicators functional.
      }
    }).catch(() => {})

    return () => {
      isMounted = false
      if (pollTimeout) clearTimeout(pollTimeout)
      unsubscribe?.()
    }
  }, [courseIdKey, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = React.useMemo(() => ({ unreadCourseIds, clearCourseUnread }), [unreadCourseIds, clearCourseUnread])
  return <CourseChatNotificationContext.Provider value={value}>{children}</CourseChatNotificationContext.Provider>
}

export function useCourseChatNotifications() {
  return React.useContext(CourseChatNotificationContext)
}
