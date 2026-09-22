import Link from "next/link"
import { format } from "date-fns"
import {
    ArrowDown,
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    FileCheck2,
    FileText,
    GraduationCap,
    Trophy,
} from "lucide-react"

import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { QuizPlayer } from "@/components/student/quiz/quiz-player"
import { SubmissionForm } from "@/components/student/submission-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"
import { getUser } from "@/lib/actions/user.actions"
import { db as prisma } from "@/lib/db"
import { cn } from "@/lib/utils"

type StudentTaskStatus = "To Do" | "Submitted" | "Graded" | "Missing"

export default async function StudentTaskDetailPage({
    params,
}: {
    params: Promise<{ courseId: string; taskId: string }>
}) {
    const { courseId, taskId } = await params
    const user = await getUser()

    if (!user?.id) {
        return <WorkspacePanel className="p-4 text-sm text-destructive">Sign in to view this task.</WorkspacePanel>
    }
    const userId = user.id

    const [assignment, submission] = await Promise.all([
        prisma.assignment.findFirst({
            where: {
                id: taskId,
                courseId,
                deletedAt: { isSet: false },
                OR: [{ status: "PUBLISHED" }, { status: { isSet: false } }, { status: null }],
            },
            select: {
                id: true,
                title: true,
                description: true,
                dueDate: true,
                type: true,
                maxPoints: true,
                isExtraCredit: true,
                latePenalty: true,
                quizId: true,
                showGradeAfterSubmission: true,
                course: {
                    select: {
                        id: true,
                        name: true,
                        studentIds: true,
                    },
                },
            },
        }),
        prisma.submission.findFirst({
            where: {
                assignmentId: taskId,
                studentId: userId,
                deletedAt: { isSet: false },
            },
            select: {
                grade: true,
                feedback: true,
                submissionUrl: true,
                attachmentUrl: true,
                link: true,
                submittedAt: true,
            },
        }),
    ])

    if (!assignment) {
        return (
            <WorkspacePanel className="p-4">
                <h2 className="text-sm font-semibold">Task not found</h2>
                <p className="mt-1 text-sm text-muted-foreground">It may have been removed or is no longer published.</p>
            </WorkspacePanel>
        )
    }

    if (!assignment.course.studentIds.includes(userId)) {
        return (
            <WorkspacePanel className="p-4">
                <h2 className="text-sm font-semibold">Task access unavailable</h2>
                <p className="mt-1 text-sm text-muted-foreground">This task is only available to students enrolled in the course.</p>
            </WorkspacePanel>
        )
    }

    const isSubmitted = Boolean(submission)
    const isGraded = submission?.grade !== null && submission?.grade !== undefined
    const isMissing = assignment.type !== "NON_SUBMISSION" && assignment.dueDate < new Date() && !isSubmitted
    const wasLate = Boolean(submission && submission.submittedAt > assignment.dueDate)
    const showGrade = isGraded && (assignment.type !== "QUIZ" || assignment.showGradeAfterSubmission)

    let status: StudentTaskStatus = "To Do"
    if (showGrade) status = "Graded"
    else if (isSubmitted) status = "Submitted"
    else if (isMissing) status = "Missing"

    const taskType = assignment.type === "QUIZ"
        ? "Quiz"
        : assignment.type === "NON_SUBMISSION"
            ? "In-class task"
            : "Submission"
    const tasksHref = `/student/courses/${courseId}/tasks`

    return (
        <WorkspacePage>
            <MobileHeaderSetter
                title={assignment.title}
                subtitle={assignment.course.name}
                backLink={tasksHref}
            />

            <WorkspacePanel className="grid grid-cols-2 overflow-hidden md:grid-cols-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
                <div className="flex min-w-0 items-center gap-2 border-b border-r px-3 py-2.5 md:border-b-0">
                    <FileCheck2 className="hidden size-4 shrink-0 text-primary min-[430px]:block" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">Status</p>
                        <StatusBadge status={status} label={status} className="mt-0.5 h-5 px-1.5 text-[10px]" />
                    </div>
                </div>
                <div className="flex min-w-0 items-center gap-2 border-b px-3 py-2.5 md:border-b-0 md:border-r">
                    <CalendarDays className="hidden size-4 shrink-0 text-primary min-[430px]:block" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">Due</p>
                        <p className={cn("truncate text-xs font-semibold sm:text-sm", isMissing && "text-destructive")}>
                            {assignment.type === "NON_SUBMISSION" ? "No upload" : format(assignment.dueDate, "MMM d, h:mm a")}
                        </p>
                    </div>
                </div>
                <div className="flex min-w-0 items-center gap-2 border-r px-3 py-2.5">
                    <Trophy className="hidden size-4 shrink-0 text-primary min-[430px]:block" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">Points</p>
                        <p className="truncate text-xs font-semibold tabular-nums sm:text-sm">
                            {assignment.maxPoints}{assignment.isExtraCredit ? " extra" : " pts"}
                        </p>
                    </div>
                </div>
                <div className="flex min-w-0 items-center gap-2 px-3 py-2.5">
                    <GraduationCap className="hidden size-4 shrink-0 text-primary min-[430px]:block" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">Score</p>
                        <p className={cn("truncate text-xs font-semibold tabular-nums sm:text-sm", showGrade && "text-emerald-600 dark:text-emerald-400")}>
                            {showGrade ? `${submission?.grade} / ${assignment.maxPoints}` : "Not graded"}
                        </p>
                    </div>
                </div>
                <div className="col-span-2 flex gap-2 border-t p-2 md:col-span-4 lg:col-span-1 lg:items-center lg:border-l lg:border-t-0 lg:px-3">
                    <Button variant="outline" size="sm" asChild className="hidden lg:inline-flex">
                        <Link href={tasksHref}>
                            <ArrowLeft className="size-4" />
                            Tasks
                        </Link>
                    </Button>
                    {assignment.type !== "NON_SUBMISSION" && (
                        <Button size="sm" asChild className="min-w-0 flex-1 lg:flex-none">
                            <a href="#your-work">
                                <ArrowDown className="size-4" />
                                {isSubmitted ? "Review work" : assignment.type === "QUIZ" ? "Start quiz" : "Add work"}
                            </a>
                        </Button>
                    )}
                </div>
            </WorkspacePanel>

            <div className="space-y-3">
                <div className="min-w-0 space-y-3">
                    <WorkspacePanel className="overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-2">
                                <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                                <h2 className="text-sm font-semibold">Instructions</h2>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="text-[10px]">{taskType}</Badge>
                                {assignment.isExtraCredit && (
                                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        Extra credit
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="px-3 py-3 lg:px-4 lg:py-4">
                            {assignment.description ? (
                                <div
                                    className="max-w-[90ch] text-sm leading-6 text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-3 [&_li]:ml-5 [&_ol]:list-decimal [&_p+p]:mt-3 [&_ul]:list-disc"
                                    dangerouslySetInnerHTML={{ __html: assignment.description }}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">No additional instructions were provided.</p>
                            )}
                        </div>
                    </WorkspacePanel>

                    {showGrade && (
                        <WorkspacePanel className="overflow-hidden border-emerald-200 dark:border-emerald-900/70">
                            <div className="flex items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-900/70 dark:bg-emerald-950/40">
                                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                                    <CheckCircle2 className="size-4" aria-hidden="true" />
                                    <h2 className="text-sm font-semibold">Teacher feedback</h2>
                                </div>
                                <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                                    {submission?.grade} / {assignment.maxPoints}
                                </span>
                            </div>
                            <div className="px-3 py-3 text-sm leading-6">
                                {submission?.feedback || <span className="text-muted-foreground">No written feedback was added.</span>}
                            </div>
                        </WorkspacePanel>
                    )}

                    {assignment.latePenalty > 0 && assignment.type !== "NON_SUBMISSION" && (
                        <WorkspacePanel className="flex items-start gap-2 border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
                            <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <p>Late submissions may receive a {assignment.latePenalty}% deduction.</p>
                        </WorkspacePanel>
                    )}
                </div>

                <WorkspacePanel id="your-work" className="scroll-mt-3">
                    <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-3 py-2.5">
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold">Your work</h2>
                            <p className="truncate text-xs text-muted-foreground">
                                {submission
                                    ? `Submitted ${format(submission.submittedAt, "MMM d, h:mm a")}${wasLate ? " · Late" : ""}`
                                    : assignment.type === "QUIZ"
                                        ? "Complete the quiz when you’re ready"
                                        : assignment.type === "NON_SUBMISSION"
                                            ? "Nothing needs to be uploaded"
                                            : "Add a response, link, or attachment"}
                            </p>
                        </div>
                        <StatusBadge status={status} label={status} className="shrink-0" />
                    </div>

                    <div className="p-3 lg:p-4">
                        {assignment.type === "SUBMISSION" ? (
                            <SubmissionForm
                                assignmentId={assignment.id}
                                initialUrl={submission?.submissionUrl || ""}
                                initialAttachmentUrl={submission?.attachmentUrl || ""}
                                initialLink={submission?.link || ""}
                                isLate={isMissing || wasLate}
                            />
                        ) : assignment.type === "QUIZ" && assignment.quizId ? (
                            <QuizPlayer
                                quizId={assignment.quizId}
                                assignmentId={assignment.id}
                                initialAnswers={submission?.submissionUrl ? JSON.parse(submission.submissionUrl) : undefined}
                                isReadOnly={Boolean(submission)}
                                showGradeAfterSubmission={assignment.showGradeAfterSubmission}
                            />
                        ) : (
                            <div className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center">
                                <CheckCircle2 className="size-7 text-muted-foreground/60" aria-hidden="true" />
                                <p className="mt-2 text-sm font-medium">No submission required</p>
                                <p className="mt-1 text-xs text-muted-foreground">Follow the teacher’s instructions and complete this task in class.</p>
                            </div>
                        )}
                    </div>
                </WorkspacePanel>
            </div>
        </WorkspacePage>
    )
}
