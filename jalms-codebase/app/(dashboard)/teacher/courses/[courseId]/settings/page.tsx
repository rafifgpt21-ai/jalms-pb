import { notFound } from "next/navigation"
import { CourseCompetencySettings } from "@/components/teacher/course-competency-settings"
import { CourseIdentitySettings } from "@/components/teacher/course-identity-settings"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"
import { getCourseWorkspace } from "@/lib/actions/course-workspace.actions"

export default async function CourseSettingsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const result = await getCourseWorkspace(courseId, "teacher")
  if (!result.course) notFound()
  return <WorkspacePage>
    <MobileHeaderSetter title="Course settings" subtitle="Identity, relationships, enrollment, and grading behavior." />
    <WorkspacePanel className="p-4"><CourseIdentitySettings course={result.course} /></WorkspacePanel>
    <div className="max-w-4xl"><CourseCompetencySettings courseId={courseId} /></div>
  </WorkspacePage>
}
