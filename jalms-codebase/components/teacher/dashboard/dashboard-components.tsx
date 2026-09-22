import { cache } from "react"
import { getAssignmentsOverview, getClassesToday } from "@/lib/actions/teacher.actions"
import { getUser } from "@/lib/actions/user.actions"
import { AssignmentsWidget, ClassesSection } from "@/components/teacher/dashboard/teacher-dashboard-view"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

const getDashboardTeacherId = cache(async () => (await getUser())?.id)

function DashboardError({ label }: { label: string }) {
  return <WorkspacePanel className="border-destructive/30 px-4 py-6 text-center text-sm text-destructive">Unable to load {label}. Refresh to try again.</WorkspacePanel>
}

export async function ClassesTodayCard() {
  const teacherId = await getDashboardTeacherId()
  if (!teacherId) return <DashboardError label="today’s classes" />

  const { classesToday, error } = await getClassesToday(teacherId)
  if (error || !classesToday) return <DashboardError label="today’s classes" />
  return <ClassesSection classesToday={classesToday} />
}

export async function AssignmentsWidgetWrapper() {
  const teacherId = await getDashboardTeacherId()
  if (!teacherId) return <DashboardError label="assignments" />

  const { allAssignments, error } = await getAssignmentsOverview(teacherId)
  if (error || !allAssignments) return <DashboardError label="assignments" />
  return <AssignmentsWidget allAssignments={allAssignments} />
}
