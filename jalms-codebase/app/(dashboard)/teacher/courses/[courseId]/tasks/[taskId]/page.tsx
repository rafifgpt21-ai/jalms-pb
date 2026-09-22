import { notFound } from "next/navigation"

import { getAssignmentDetails } from "@/lib/actions/teacher.actions"
import { TaskGradingWorkspace } from "@/components/teacher/tasks/task-grading-workspace"

export default async function TaskWorkspacePage({
    params,
}: {
    params: Promise<{ courseId: string; taskId: string }>
}) {
    const { courseId, taskId } = await params
    const { assignment } = await getAssignmentDetails(taskId)

    if (!assignment || assignment.courseId !== courseId) notFound()

    return <TaskGradingWorkspace assignment={assignment} />
}
