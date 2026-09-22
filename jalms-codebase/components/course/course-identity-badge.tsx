"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { resolveCourseIdentity } from "@/lib/course-identity"

type IdentityCourse = Parameters<typeof resolveCourseIdentity>[0]

export function CourseIdentityBadge({ course, className }: { course: IdentityCourse; className?: string }) {
  const identity = resolveCourseIdentity(course)
  const [imageFailed, setImageFailed] = React.useState(false)

  return (
    <span
      role="img"
      aria-label={identity.accessibleName}
      className={cn(
        "course-code-mark flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-base font-extrabold",
        identity.background,
        identity.foreground,
        identity.imageUrl && !imageFailed && `ring-2 ${identity.ring}`,
        className,
      )}
    >
      {identity.imageUrl && !imageFailed ? (
        <img src={identity.imageUrl} alt="" className="size-full object-cover" onError={() => setImageFailed(true)} />
      ) : identity.label}
    </span>
  )
}
