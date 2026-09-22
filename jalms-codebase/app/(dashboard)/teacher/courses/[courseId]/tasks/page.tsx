import { getCourseAssignments } from "@/lib/actions/teacher.actions"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import {
    WorkspacePage,
    WorkspacePanel,
} from "@/components/workspace/workspace-page"
import { TaskManagementList } from "@/components/teacher/tasks/task-management-list"

export default async function CourseTasksPage({ params }: { params: { courseId: string } }) {
    // Await params before using (Next.js 15 requirement, good practice generally if generic)
    const { courseId } = await params
    const { assignments, error } = await getCourseAssignments(courseId)

    if (error || !assignments) {
        return <WorkspacePanel className="p-4 text-sm text-destructive">Error loading tasks: {error}</WorkspacePanel>
    }

    const now = new Date()
    const upcomingCutoff = new Date(now)
    upcomingCutoff.setDate(upcomingCutoff.getDate() + 7)
    const activeAssignments = assignments.filter((assignment) => assignment.status !== "ARCHIVED")
    const dueSoon = activeAssignments.filter((assignment) => {
        const dueDate = new Date(assignment.dueDate)
        return dueDate >= now && dueDate <= upcomingCutoff
    }).length
    const overdue = activeAssignments.filter((assignment) => new Date(assignment.dueDate) < now).length

    return (
        <WorkspacePage>
            <MobileHeaderSetter title="Tasks" subtitle="Create and manage course assignments." />

            <TaskManagementList
                assignments={assignments}
                courseId={courseId}
                dueSoon={dueSoon}
                overdue={overdue}
            />
        </WorkspacePage>
    )
}
