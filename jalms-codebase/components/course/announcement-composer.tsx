"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createCourseAnnouncement } from "@/lib/actions/course-workspace.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

export function AnnouncementComposer({ courseId }: { courseId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  if (!expanded) return <Button size="sm" onClick={() => setExpanded(true)}>New announcement</Button>

  return (
    <form className="space-y-3 rounded-lg border bg-background p-3" onSubmit={(event) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      startTransition(async () => {
        const result = await createCourseAnnouncement(courseId, {
          title: String(form.get("title") || ""), body: String(form.get("body") || ""), isPinned: form.get("pinned") === "on", publish: true,
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success("Announcement published")
        setExpanded(false)
        router.refresh()
      })
    }}>
      <Input name="title" placeholder="Announcement title" autoFocus required />
      <Textarea name="body" placeholder="Write a clear update for this course..." rows={4} required />
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm"><Checkbox name="pinned" />Pin to the top</label>
        <div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => setExpanded(false)}>Cancel</Button><Button disabled={pending}>{pending ? "Publishing..." : "Publish"}</Button></div>
      </div>
    </form>
  )
}
