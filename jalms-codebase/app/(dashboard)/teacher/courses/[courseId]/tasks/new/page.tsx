import { TaskForm } from "@/components/teacher/task-form"
import { getCourse } from "@/lib/actions/course.actions"
import { getQuizzes } from "@/lib/actions/quiz.actions"
import { notFound } from "next/navigation"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"

interface AddTaskPageProps {
    params: Promise<{
        courseId: string
    }>
}

export default async function AddTaskPage(props: AddTaskPageProps) {
    const params = await props.params;
    const { courseId } = params;

    const [{ course }, { quizzes, folders }] = await Promise.all([
        getCourse(courseId),
        getQuizzes(),
    ])

    if (!course) {
        notFound()
    }

    return (
        <>
            <MobileHeaderSetter
                title="Create new task"
                subtitle={`${course.name} · New assignment`}
                backLink={`/teacher/courses/${courseId}/tasks`}
            />
            <TaskForm
                courseId={courseId}
                course={course}
                quizzes={quizzes || []}
                quizFolders={folders || []}
            />
        </>
    )
}
