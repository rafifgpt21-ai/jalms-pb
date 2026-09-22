import type { ContentStatus } from "@prisma/client"
import { AnnouncementWorkspace } from "@/components/course/announcement-workspace"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"

type AnnouncementRecord = {
  id: string
  title: string
  body: string
  isPinned: boolean
  status: ContentStatus
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  author: { name: string; image: string | null }
}

export function AnnouncementsView({ courseId, announcements, canPost }: { courseId: string; announcements: AnnouncementRecord[]; canPost: boolean }) {
  const toIsoString = (value: Date | string | null | undefined) => {
    if (!value) return null
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
  }

  return <WorkspacePage>
    <MobileHeaderSetter title="Announcements" subtitle={canPost ? "Publish and manage course updates." : "Course updates from your teacher."} />
    <AnnouncementWorkspace
      courseId={courseId}
      canManage={canPost}
      initialAnnouncements={announcements.map((item) => ({
        ...item,
        publishedAt: toIsoString(item.publishedAt),
        createdAt: toIsoString(item.createdAt)!,
        updatedAt: toIsoString(item.updatedAt)!,
      }))}
    />
  </WorkspacePage>
}
