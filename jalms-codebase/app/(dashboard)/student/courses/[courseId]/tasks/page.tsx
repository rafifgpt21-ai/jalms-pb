import Link from "next/link"
import { format, isToday, isTomorrow } from "date-fns"
import {
    AlertCircle,
    CalendarClock,
    CheckCircle2,
    ChevronRight,
    CircleDashed,
    ClipboardCheck,
    FileText,
} from "lucide-react"

import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { Badge } from "@/components/ui/badge"
import { StatusBadge, statusTone } from "@/components/ui/status-badge"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"
import { getUser } from "@/lib/actions/user.actions"
import { db as prisma } from "@/lib/db"
import { cn } from "@/lib/utils"

type StudentTaskStatus = "To Do" | "Submitted" | "Graded" | "Missing"

function dueLabel(dueDate: Date, status: StudentTaskStatus) {
    const time = format(dueDate, "h:mm a")

    if (status === "Missing") return `Was due ${format(dueDate, "MMM d, h:mm a")}`
    if (isToday(dueDate)) return `Due today, ${time}`
    if (isTomorrow(dueDate)) return `Due tomorrow, ${time}`
    return `Due ${format(dueDate, "MMM d, h:mm a")}`
}

function TaskList({
    title,
    description,
    tasks,
    courseId,
}: {
    title: string
    description: string
    tasks: Array<{
        id: string
        title: string
        dueDate: Date
        maxPoints: number
        isExtraCredit: boolean
        type: "SUBMISSION" | "NON_SUBMISSION" | "QUIZ"
        status: StudentTaskStatus
        submission?: { grade: number | null } | undefined
    }>
    courseId: string
}) {
    if (tasks.length === 0) return null

    return (
        <WorkspacePanel className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-3 py-2.5">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <p className="truncate text-xs text-muted-foreground">{description}</p>
                </div>
                <Badge variant="outline" className="shrink-0 bg-background tabular-nums">
                    {tasks.length}
                </Badge>
            </div>

            <div className="divide-y">
                {tasks.map((task) => {
                    const TaskIcon = task.status === "Missing"
                        ? AlertCircle
                        : task.status === "Graded" || task.status === "Submitted"
                            ? CheckCircle2
                            : task.type === "QUIZ"
                                ? ClipboardCheck
                                : FileText
                    const typeLabel = task.type === "QUIZ"
                        ? "Quiz"
                        : task.type === "NON_SUBMISSION"
                            ? "In class"
                            : "Submission"

                    return (
                        <Link
                            key={task.id}
                            href={`/student/courses/${courseId}/tasks/${task.id}`}
                            prefetch
                            className="group grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--workspace-row-hover)] focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40 sm:grid-cols-[auto_minmax(0,1fr)_minmax(9rem,auto)_auto]"
                            aria-label={`Open ${task.title}, ${task.status}`}
                        >
                            <div className={cn("flex size-9 items-center justify-center rounded-md border", statusTone(task.status))}>
                                <TaskIcon className="size-4" aria-hidden="true" />
                            </div>

                            <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                    <h3 className="truncate text-sm font-semibold text-foreground">{task.title}</h3>
                                    {task.isExtraCredit && (
                                        <Badge variant="outline" className="hidden shrink-0 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 min-[430px]:inline-flex">
                                            Extra credit
                                        </Badge>
                                    )}
                                </div>
                                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground sm:hidden">
                                    <span className={cn("truncate", task.status === "Missing" && "text-destructive")}>
                                        {task.type === "NON_SUBMISSION" ? "No upload required" : dueLabel(task.dueDate, task.status)}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="shrink-0 tabular-nums">{task.maxPoints} pts</span>
                                </div>
                                <div className="mt-1 flex items-center gap-1.5">
                                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                                        {typeLabel}
                                    </Badge>
                                    <StatusBadge status={task.status} label={task.status} className="h-5 px-1.5 text-[10px]" />
                                </div>
                            </div>

                            <div className="hidden min-w-0 text-right sm:block">
                                <p className={cn("truncate text-xs font-medium", task.status === "Missing" && "text-destructive")}>
                                    {task.type === "NON_SUBMISSION" ? "No upload required" : dueLabel(task.dueDate, task.status)}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {task.status === "Graded" && task.submission?.grade !== null
                                        ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">{task.submission?.grade} / {task.maxPoints}</span>
                                        : `${task.maxPoints} points`}
                                </p>
                            </div>

                            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
                        </Link>
                    )
                })}
            </div>
        </WorkspacePanel>
    )
}

export default async function StudentCourseTasksPage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = await params
    const user = await getUser()

    if (!user?.id) {
        return <WorkspacePanel className="p-4 text-sm text-destructive">Sign in to view your tasks.</WorkspacePanel>
    }
    const userId = user.id

    const [course, assignments, studentSubmissions] = await Promise.all([
        prisma.course.findUnique({
            where: { id: courseId },
            select: { name: true, studentIds: true },
        }),
        prisma.assignment.findMany({
            where: {
                courseId,
                deletedAt: { isSet: false },
                OR: [{ status: "PUBLISHED" }, { status: { isSet: false } }, { status: null }],
            },
            select: {
                id: true,
                title: true,
                dueDate: true,
                type: true,
                maxPoints: true,
                isExtraCredit: true,
                showGradeAfterSubmission: true,
            },
            orderBy: { dueDate: "asc" },
        }),
        prisma.submission.findMany({
            where: {
                studentId: userId,
                assignment: { courseId },
                deletedAt: { isSet: false },
            },
            select: { assignmentId: true, grade: true },
        }),
    ])

    if (!course || !course.studentIds.includes(userId)) {
        return (
            <WorkspacePanel className="p-4">
                <h2 className="text-sm font-semibold">Course access unavailable</h2>
                <p className="mt-1 text-sm text-muted-foreground">This task list is only available to students enrolled in the course.</p>
            </WorkspacePanel>
        )
    }

    const submissionByAssignment = new Map<string, any>(
        (studentSubmissions as any[]).map((submission: any) => [submission.assignmentId, submission]),
    )
    const now = new Date()
    const tasksWithStatus = assignments.map((assignment) => {
        const submission = submissionByAssignment.get(assignment.id)
        const isSubmitted = Boolean(submission)
        const isGraded = submission?.grade !== null && submission?.grade !== undefined
        const showGrade = assignment.type !== "QUIZ" || assignment.showGradeAfterSubmission
        const isMissing = assignment.type !== "NON_SUBMISSION" && assignment.dueDate < now && !isSubmitted

        let status: StudentTaskStatus = "To Do"
        if (isGraded && showGrade) status = "Graded"
        else if (isSubmitted) status = "Submitted"
        else if (isMissing) status = "Missing"

        return { ...assignment, submission, status }
    })

    const needsAttention = tasksWithStatus.filter((task) => task.status === "Missing" || task.status === "To Do")
    const completed = tasksWithStatus.filter((task) => task.status === "Submitted" || task.status === "Graded")
    const missingCount = tasksWithStatus.filter((task) => task.status === "Missing").length

    return (
        <WorkspacePage>
            <MobileHeaderSetter title="Tasks" subtitle={course.name} />

            <WorkspacePanel className="grid grid-cols-4 overflow-hidden">
                {[
                    { icon: FileText, value: tasksWithStatus.length, label: "All tasks" },
                    { icon: CircleDashed, value: needsAttention.length, label: "Open" },
                    { icon: CheckCircle2, value: completed.length, label: "Complete" },
                    { icon: CalendarClock, value: missingCount, label: "Missing" },
                ].map(({ icon: Icon, value, label }, index) => (
                    <div key={label} className={cn("flex min-w-0 items-center gap-2 px-2.5 py-2.5 sm:gap-3 sm:px-3", index < 3 && "border-r")}>
                        <Icon className={cn("hidden size-4 shrink-0 min-[430px]:block", label === "Missing" && missingCount > 0 ? "text-destructive" : "text-primary")} aria-hidden="true" />
                        <div className="min-w-0">
                            <div className="font-semibold tabular-nums">{value}</div>
                            <div className="truncate text-[10px] text-muted-foreground sm:text-xs">{label}</div>
                        </div>
                    </div>
                ))}
            </WorkspacePanel>

            {tasksWithStatus.length === 0 ? (
                <WorkspacePanel className="flex min-h-44 flex-col items-center justify-center px-4 py-8 text-center">
                    <CheckCircle2 className="size-8 text-muted-foreground/50" aria-hidden="true" />
                    <h2 className="mt-3 text-sm font-semibold">You’re all caught up</h2>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">No tasks have been published for this course yet.</p>
                </WorkspacePanel>
            ) : (
                <div className="space-y-3">
                    <TaskList
                        title="Needs attention"
                        description="Upcoming work and anything past due"
                        tasks={needsAttention}
                        courseId={courseId}
                    />
                    <TaskList
                        title="Completed"
                        description="Submitted work and released grades"
                        tasks={completed}
                        courseId={courseId}
                    />
                </div>
            )}
        </WorkspacePage>
    )
}
