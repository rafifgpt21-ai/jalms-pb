import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { CourseChat } from "@/components/course/course-chat"
import { getCourseChatMessages } from "@/lib/actions/course-chat.actions"

export default async function StudentCourseChatPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const [session, result] = await Promise.all([auth(), getCourseChatMessages(courseId, undefined, "student")])
  if (!session?.user?.id || "error" in result) notFound()
  return <CourseChat courseId={courseId} currentUserId={session.user.id} initialPage={result} />
}
