import { notFound } from "next/navigation"
import { AnnouncementsView } from "@/components/course/announcements-view"
import { getCourseAnnouncements } from "@/lib/actions/course-workspace.actions"

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const result = await getCourseAnnouncements(courseId, "teacher")
  if (!("announcements" in result) || !result.course) notFound()
  return <AnnouncementsView courseId={courseId} announcements={result.announcements} canPost />
}
