import { getQuiz } from "@/lib/actions/quiz.actions"
import { notFound } from "next/navigation"
import { QuizEditorClient } from "@/components/teacher/quiz/quiz-editor-client"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"

interface QuizEditorPageProps {
    params: Promise<{
        quizId: string
    }>
}

export default async function QuizEditorPage(props: QuizEditorPageProps) {
    const params = await props.params;
    const {
        quizId
    } = params;

    const { quiz, error } = await getQuiz(quizId)

    if (error || !quiz) {
        if (error === "Quiz not found") notFound()
        return <WorkspacePanel className="p-4 text-sm text-destructive">Could not load this quiz. Return to the quiz library and try again.</WorkspacePanel>
    }

    return (
        <WorkspacePage className="pb-16">
            <MobileHeaderSetter title={quiz.title} subtitle="Quiz editor" backLink="/teacher/quiz-manager" />
            <QuizEditorClient quiz={quiz} />
        </WorkspacePage>
    )
}
