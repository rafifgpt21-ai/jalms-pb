import { notFound } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"
import { getStudentGrades } from "@/lib/actions/student.actions"
import { getCourseWorkspace } from "@/lib/actions/course-workspace.actions"

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const [access, result] = await Promise.all([getCourseWorkspace(courseId, "student"), getStudentGrades()])
  if (!access.course) notFound()
  const grade = "grades" in result && Array.isArray(result.grades) ? result.grades.find(item => item.courseId === courseId) : null
  return <WorkspacePage>
    <MobileHeaderSetter title="Grades" subtitle={`Current progress for ${access.course.name}.`} />
    <WorkspacePanel className="mx-auto w-full max-w-3xl p-5">
      {grade ? <><div className="flex items-end justify-between"><div><div className="text-sm text-muted-foreground">Current score</div><div className="text-4xl font-semibold">{grade.grade}%</div></div><div className="text-right text-sm text-muted-foreground">Attendance {grade.attendancePercentage}%</div></div><Progress value={grade.grade} className="mt-4" /><div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">{Object.entries(grade.breakdown).map(([label, value]) => <div key={label} className="rounded-md bg-muted p-2"><div className="font-medium">{String(value)}</div><div className="truncate text-xs capitalize text-muted-foreground">{label.replace(/([A-Z])/g, " $1")}</div></div>)}</div></> : <div className="py-10 text-center text-sm text-muted-foreground">No grade data is available yet.</div>}
    </WorkspacePanel>
  </WorkspacePage>
}
