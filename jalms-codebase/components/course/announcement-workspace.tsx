"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Archive, Edit3, FileText, Megaphone, MoreHorizontal, Pin, PinOff, Plus, Search, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createCourseAnnouncement, deleteCourseAnnouncement, updateCourseAnnouncement } from "@/lib/actions/course-workspace.actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"

type Announcement = {
  id: string
  title: string
  body: string
  isPinned: boolean
  status: AnnouncementStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  author: { name: string; image: string | null }
}

type Filter = "ALL" | AnnouncementStatus | "PINNED"

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
})

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A"
}

function announcementDate(item: Announcement) {
  return dateFormatter.format(new Date(item.publishedAt ?? item.createdAt))
}

function ComposerDialog({
  courseId,
  open,
  onOpenChange,
  announcement,
}: {
  courseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  announcement: Announcement | null
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const editing = Boolean(announcement)

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update the message or change how it appears in the course feed." : "Share a clear update with everyone in this course."}
          </DialogDescription>
        </DialogHeader>
        <form
          key={announcement?.id ?? "new"}
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
            const status = (submitter?.value || announcement?.status || "PUBLISHED") as AnnouncementStatus
            const input = {
              title: String(form.get("title") || ""),
              body: String(form.get("body") || ""),
              isPinned: form.get("pinned") === "on",
            }

            startTransition(async () => {
              const result = announcement
                ? await updateCourseAnnouncement(courseId, announcement.id, { ...input, status })
                : await createCourseAnnouncement(courseId, { ...input, publish: status === "PUBLISHED" })
              if (result.error) {
                toast.error(result.error)
                return
              }
              toast.success(status === "PUBLISHED" ? "Announcement published" : editing ? "Draft updated" : "Draft saved")
              onOpenChange(false)
              router.refresh()
            })
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="announcement-title" className="text-sm font-medium">Title</label>
            <Input id="announcement-title" name="title" defaultValue={announcement?.title} maxLength={160} placeholder="What does the class need to know?" autoFocus required />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="announcement-body" className="text-sm font-medium">Message</label>
            <Textarea id="announcement-body" name="body" defaultValue={announcement?.body} maxLength={10000} placeholder="Write the announcement details..." rows={7} required />
          </div>
          <label className="flex min-h-8 items-center gap-2 text-sm">
            <Checkbox name="pinned" defaultChecked={announcement?.isPinned} />
            Pin this announcement to the top of the feed
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" name="status" value="DRAFT" variant="secondary" disabled={pending}>
              <FileText /> {pending ? "Saving..." : "Save draft"}
            </Button>
            <Button type="submit" name="status" value="PUBLISHED" disabled={pending}>
              <Send /> {pending ? "Saving..." : announcement?.status === "PUBLISHED" ? "Save changes" : "Publish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AnnouncementWorkspace({
  courseId,
  canManage,
  initialAnnouncements,
}: {
  courseId: string
  canManage: boolean
  initialAnnouncements: Announcement[]
}) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("ALL")
  const [composerOpen, setComposerOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const counts = useMemo(() => ({
    published: initialAnnouncements.filter((item) => item.status === "PUBLISHED").length,
    drafts: initialAnnouncements.filter((item) => item.status === "DRAFT").length,
    pinned: initialAnnouncements.filter((item) => item.isPinned && item.status !== "ARCHIVED").length,
  }), [initialAnnouncements])

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return initialAnnouncements.filter((item) => {
      const matchesFilter = filter === "ALL" || (filter === "PINNED" ? item.isPinned && item.status !== "ARCHIVED" : item.status === filter)
      const matchesSearch = !query || item.title.toLocaleLowerCase().includes(query) || item.body.toLocaleLowerCase().includes(query) || item.author.name.toLocaleLowerCase().includes(query)
      return matchesFilter && matchesSearch
    })
  }, [filter, initialAnnouncements, search])

  function mutate(item: Announcement, input: Parameters<typeof updateCourseAnnouncement>[2], successMessage: string) {
    setPendingId(item.id)
    startTransition(async () => {
      const result = await updateCourseAnnouncement(courseId, item.id, input)
      setPendingId(null)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(successMessage)
      router.refresh()
    })
  }

  function openCreate() {
    setEditing(null)
    setComposerOpen(true)
  }

  return (
    <>
      <WorkspacePanel className="grid overflow-hidden lg:grid-cols-[auto_minmax(24rem,1fr)]">
        <div className={`hidden ${canManage ? "grid-cols-3" : "grid-cols-2"} divide-x lg:grid lg:border-r`}>
          <div className="min-w-0 px-3 py-2.5">
            <p className="text-lg font-semibold leading-none">{counts.published}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Published</p>
          </div>
          {canManage && <div className="min-w-0 px-3 py-2.5">
            <p className="text-lg font-semibold leading-none">{counts.drafts}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Drafts</p>
          </div>}
          <div className="min-w-0 px-3 py-2.5">
            <p className="text-lg font-semibold leading-none">{counts.pinned}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Pinned</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 p-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full pl-8" placeholder="Search announcements" aria-label="Search announcements" />
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            <SelectTrigger className="w-[8.5rem]" aria-label="Filter announcements"><SelectValue /></SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="ALL">All updates</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              {canManage && <SelectItem value="DRAFT">Drafts</SelectItem>}
              <SelectItem value="PINNED">Pinned</SelectItem>
              {canManage && <SelectItem value="ARCHIVED">Archived</SelectItem>}
            </SelectContent>
          </Select>
          {canManage && <Button onClick={openCreate} className="hidden sm:inline-flex"><Plus /> New announcement</Button>}
          {canManage && <Button onClick={openCreate} size="icon" className="sm:hidden" aria-label="New announcement"><Plus /></Button>}
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="overflow-hidden">
        <div className="flex min-h-11 items-center justify-between gap-3 border-b bg-muted/20 px-3">
          <div>
            <h2 className="text-sm font-semibold">Course feed</h2>
            <p className="text-xs text-muted-foreground">{canManage ? "Students see published announcements only." : "Important course updates in one place."}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? "update" : "updates"}</span>
        </div>

        {visible.length > 0 ? <div className="divide-y">
          {visible.map((item) => (
            <article key={item.id} className={`relative px-3 py-3 sm:px-4 ${item.isPinned && item.status !== "ARCHIVED" ? "bg-primary/[0.025]" : ""}`}>
              <div className="flex items-start gap-3">
                <Avatar className="mt-0.5 size-8">
                  <AvatarImage src={item.author.image ?? undefined} alt="" />
                  <AvatarFallback className="text-[11px] font-semibold">{initials(item.author.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-semibold leading-5">{item.title}</h3>
                        {item.isPinned && item.status !== "ARCHIVED" && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"><Pin className="size-3" /> Pinned</span>}
                        {(canManage || item.status !== "PUBLISHED") && <StatusBadge status={item.status} />}
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                        <span>{item.author.name}</span><span aria-hidden>·</span><time dateTime={item.publishedAt ?? item.createdAt}>{announcementDate(item)}</time>
                        {item.updatedAt !== item.createdAt && <><span aria-hidden>·</span><span>Edited</span></>}
                      </p>
                    </div>
                    {canManage && <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-1 -mt-1" disabled={pending && pendingId === item.id} aria-label={`Manage ${item.title}`}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => { setEditing(item); setComposerOpen(true) }}><Edit3 /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => mutate(item, { isPinned: !item.isPinned }, item.isPinned ? "Announcement unpinned" : "Announcement pinned")}>
                          {item.isPinned ? <PinOff /> : <Pin />} {item.isPinned ? "Unpin" : "Pin to top"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {item.status !== "PUBLISHED" && <DropdownMenuItem onSelect={() => mutate(item, { status: "PUBLISHED" }, "Announcement published")}><Send /> Publish</DropdownMenuItem>}
                        {item.status === "PUBLISHED" && <DropdownMenuItem onSelect={() => mutate(item, { status: "DRAFT" }, "Moved to drafts")}><FileText /> Move to draft</DropdownMenuItem>}
                        {item.status !== "ARCHIVED" && <DropdownMenuItem onSelect={() => mutate(item, { status: "ARCHIVED", isPinned: false }, "Announcement archived")}><Archive /> Archive</DropdownMenuItem>}
                        {item.status === "ARCHIVED" && <DropdownMenuItem onSelect={() => mutate(item, { status: "DRAFT" }, "Restored as draft")}><FileText /> Restore as draft</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(item)}><Trash2 /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{item.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div> : <div className="flex min-h-52 flex-col items-center justify-center px-4 py-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground"><Megaphone className="size-5" /></div>
          <h3 className="mt-3 text-sm font-semibold">{initialAnnouncements.length ? "No matching announcements" : "No announcements yet"}</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {initialAnnouncements.length ? "Try a different search or filter." : canManage ? "Publish the first update for this course." : "New course updates will appear here."}
          </p>
          {initialAnnouncements.length ? <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearch(""); setFilter("ALL") }}>Clear filters</Button>
            : canManage ? <Button size="sm" className="mt-3" onClick={openCreate}><Plus /> New announcement</Button> : null}
        </div>}
      </WorkspacePanel>

      {canManage && <ComposerDialog courseId={courseId} open={composerOpen} onOpenChange={setComposerOpen} announcement={editing} />}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && !pending && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>This removes “{deleteTarget?.title}” from the course feed. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={pending}>Cancel</Button>
            <Button variant="destructive" disabled={pending} onClick={() => {
              if (!deleteTarget) return
              const target = deleteTarget
              setPendingId(target.id)
              startTransition(async () => {
                const result = await deleteCourseAnnouncement(courseId, target.id)
                setPendingId(null)
                if (result.error) {
                  toast.error(result.error)
                  return
                }
                setDeleteTarget(null)
                toast.success("Announcement deleted")
                router.refresh()
              })
            }}><Trash2 /> {pending ? "Deleting..." : "Delete"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
