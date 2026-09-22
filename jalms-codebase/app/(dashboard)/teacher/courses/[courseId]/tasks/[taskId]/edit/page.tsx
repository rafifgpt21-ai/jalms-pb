import { TaskForm } from "@/components/teacher/task-form"
import { getAssignmentDetails } from "@/lib/actions/teacher.actions"
import { getQuizzes } from "@/lib/actions/quiz.actions"
import { notFound } from "next/navigation"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"

interface EditTaskPageProps {
    params: Promise<{
        courseId: string
        taskId: string
    }>
}

export default async function EditTaskPage(props: EditTaskPageProps) {
    const params = await props.params;

    const {
        courseId,
        taskId
    } = params;

    // getAssignmentDetails includes course and subject
    const [{ assignment }, { quizzes, folders }] = await Promise.all([
        getAssignmentDetails(taskId),
        getQuizzes(),
    ])

    if (!assignment) {
        notFound()
    }

    return (
        <>
            <MobileHeaderSetter
                title="Edit task"
                subtitle={assignment.title}
                backLink={`/teacher/courses/${courseId}/tasks/${taskId}`}
            />
            <TaskForm
                courseId={courseId}
                initialData={assignment}
                course={assignment.course}
                quizzes={quizzes || []}
                quizFolders={folders || []}
            />
        </>
    )
}
