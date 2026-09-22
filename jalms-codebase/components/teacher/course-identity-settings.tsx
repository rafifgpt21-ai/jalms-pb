"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { updateCourseIcon } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { CourseIdentityBadge } from "@/components/course/course-identity-badge"

export function CourseIdentitySettings({ course }: { course: any }) {
  const [imageUrl, setImageUrl] = useState<string | null>(course.iconImageUrl)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const preview = { ...course, iconImageUrl: imageUrl, roleContext: "teacher" as const }

  function save(url: string | null, key: string | null) {
    startTransition(async () => {
      const result = await updateCourseIcon(course.id, { url, key })
      if (result.error) { toast.error(result.error); return }
      setImageUrl(url)
      toast.success(url ? "Custom course icon saved" : "Default subject badge restored")
    })
  }

  return <div className="flex flex-wrap items-center gap-4">
    <CourseIdentityBadge course={preview} className="size-16 rounded-2xl" />
    <div className="min-w-0 flex-1"><div className="font-medium">Course identity</div><p className="text-sm text-muted-foreground">Default: {course.subject?.code || "course initials"} on {course.class?.name ? `${course.class.name}'s color` : "an automatic color"}. Custom images keep the class-color ring.</p></div>
    <div className="flex items-center gap-2">
      <label className="inline-flex h-8 w-auto cursor-pointer items-center rounded-md bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90">
        {uploading ? "Uploading..." : "Upload image"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            setUploading(true)
            try {
              const form = new FormData()
              form.append("endpoint", "courseIcon")
              form.append("collection", "courses")
              form.append("recordId", course.id)
              form.append("field", "icon")
              form.append("files", file, file.name)
              const response = await fetch("/api/pocketbase/upload", { method: "POST", body: form })
              const result = await response.json()
              if (!response.ok) throw new Error(result?.error || "Upload failed")
              const uploaded = result?.[0]
              if (uploaded?.url) save(uploaded.url, uploaded.key || null)
            } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed") }
            finally { setUploading(false) }
          }}
        />
      </label>
      {imageUrl && <Button variant="outline" size="sm" disabled={pending} onClick={() => save(null, null)}>Use default</Button>}
    </div>
  </div>
}
