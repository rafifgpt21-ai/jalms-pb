import { getQuizzes } from "@/lib/actions/quiz.actions"

export const dynamic = "force-dynamic"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { QuizLibrary } from "@/components/teacher/quiz/quiz-library"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"

export default async function QuizManagerPage() {
    const { quizzes, folders, error } = await getQuizzes()

    return (
        <WorkspacePage>
            <MobileHeaderSetter title="Quiz Library" subtitle="Build quizzes once, then reuse them across your courses." />
            {error ? (
                <WorkspacePanel className="p-4 text-sm text-destructive">Could not load your quizzes. Refresh the page to try again.</WorkspacePanel>
            ) : (
                <QuizLibrary quizzes={quizzes || []} folders={folders || []} />
            )}
        </WorkspacePage>
    )
}

