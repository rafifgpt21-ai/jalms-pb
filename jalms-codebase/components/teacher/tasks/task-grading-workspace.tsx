"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
    ArrowLeft,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ClipboardCheck,
    Edit3,
    Eye,
    FileCheck2,
    RotateCcw,
    Save,
    Search,
    Users,
} from "lucide-react"
import { toast } from "sonner"

import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { SubmissionGradeDialog } from "@/components/teacher/tasks/submission-grade-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    WorkspacePage,
    WorkspacePanel,
    WorkspaceToolbar,
} from "@/components/workspace/workspace-page"
import { updateSubmissionScore } from "@/lib/actions/teacher.actions"
import { cn } from "@/lib/utils"

type Student = {
    id: string
    name: string
    email: string
    image?: string | null
}

type Submission = {
    id: string
    studentId: string
    grade?: number | null
    feedback?: string | null
    submissionUrl?: string | null
    attachmentUrl?: string | null
    link?: string | null
    submittedAt: Date | string
}

type GradingAssignment = {
    id: string
    courseId: string
    title: string
    description?: string | null
    dueDate: Date | string
    type: "SUBMISSION" | "NON_SUBMISSION" | "QUIZ"
    maxPoints: number
    isExtraCredit: boolean
    latePenalty: number
    course: {
        id: string
        name: string
        students: Student[]
    }
    submissions: Submission[]
}

type StudentRow = {
    student: Student
    submission?: Submission
    isLate: boolean
    score?: number
    status: "GRADED" | "NEEDS_GRADING" | "MISSING"
}

function taskTypeLabel(type: GradingAssignment["type"]) {
    if (type === "QUIZ") return "Quiz"
    if (type === "NON_SUBMISSION") return "In-class task"
    return "Assignment"
}

function StudentStatus({ row }: { row: StudentRow }) {
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {row.status === "GRADED" && <StatusBadge status="GRADED" label="Graded" />}
            {row.status === "NEEDS_GRADING" && <StatusBadge status="PENDING" label="Needs grading" />}
            {row.status === "MISSING" && <StatusBadge status="MISSING" label="Missing" />}
            {row.isLate && <StatusBadge status="LATE" label="Late" />}
        </div>
    )
}

export function TaskGradingWorkspace({ assignment }: { assignment: GradingAssignment }) {
    const backLink = `/teacher/courses/${assignment.courseId}/tasks`
    const [scores, setScores] = useState<Record<string, number>>(() => {
        const initialScores: Record<string, number> = {}
        assignment.submissions.forEach((submission) => {
            if (submission.grade !== null && submission.grade !== undefined) {
                initialScores[submission.studentId] = submission.grade
            }
        })
        return initialScores
    })
    const [dirty, setDirty] = useState<Record<string, boolean>>({})
    const [showDescription, setShowDescription] = useState(false)
    const [unGradeId, setUnGradeId] = useState<string | null>(null)
    const [query, setQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [reviewStudentId, setReviewStudentId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const rows = useMemo<StudentRow[]>(() => {
        const submissionsByStudent = new Map(assignment.submissions.map((submission) => [submission.studentId, submission]))
        const dueDate = new Date(assignment.dueDate)

        return assignment.course.students.map((student) => {
            const submission = submissionsByStudent.get(student.id)
            const score = scores[student.id]
            const isLate = Boolean(submission && new Date(submission.submittedAt) > dueDate)
            let status: StudentRow["status"] = "MISSING"

            if (score !== undefined) status = "GRADED"
            else if (submission || assignment.type === "NON_SUBMISSION") status = "NEEDS_GRADING"

            return { student, submission, isLate, score, status }
        })
    }, [assignment, scores])

    const visibleRows = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase()
        return rows.filter((row) => {
            const matchesQuery = !normalizedQuery
                || row.student.name.toLowerCase().includes(normalizedQuery)
                || row.student.email.toLowerCase().includes(normalizedQuery)
            const matchesStatus = statusFilter === "ALL"
                || row.status === statusFilter
                || (statusFilter === "LATE" && row.isLate)
            return matchesQuery && matchesStatus
        })
    }, [query, rows, statusFilter])

    const gradedCount = rows.filter((row) => row.status === "GRADED").length
    const submittedCount = rows.filter((row) => row.submission).length
    const needsGradingCount = rows.filter((row) => row.status === "NEEDS_GRADING").length
    const completion = rows.length ? Math.round((gradedCount / rows.length) * 100) : 0
    const reviewRow = rows.find((row) => row.student.id === reviewStudentId)

    function handleScoreChange(studentId: string, value: string) {
        if (value === "") {
            setScores((previous) => {
                const next = { ...previous }
                delete next[studentId]
                return next
            })
            setDirty((previous) => ({ ...previous, [studentId]: true }))
            return
        }

        const parsed = Number(value)
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
            setScores((previous) => ({ ...previous, [studentId]: parsed }))
            setDirty((previous) => ({ ...previous, [studentId]: true }))
        }
    }

    function saveScore(studentId: string) {
        const score = scores[studentId]
        if (score === undefined) {
            toast.error("Enter a score from 0 to 100 first")
            return
        }

        startTransition(async () => {
            const result = await updateSubmissionScore(assignment.id, studentId, score)
            if (result.submission) {
                setDirty((previous) => ({ ...previous, [studentId]: false }))
                toast.success("Grade saved")
            } else {
                toast.error(result.error || "Failed to save grade")
            }
        })
    }

    function confirmUnGrade() {
        if (!unGradeId) return
        const studentId = unGradeId

        startTransition(async () => {
            const result = await updateSubmissionScore(assignment.id, studentId, null)
            if (result.submission) {
                setScores((previous) => {
                    const next = { ...previous }
                    delete next[studentId]
                    return next
                })
                setDirty((previous) => ({ ...previous, [studentId]: false }))
                toast.success("Grade removed")
            } else {
                toast.error(result.error || "Failed to remove grade")
            }
            setUnGradeId(null)
        })
    }

    function GradeControls({ row, mobile = false }: { row: StudentRow; mobile?: boolean }) {
        const calculatedPoints = row.score === undefined
            ? null
            : Math.round((row.score / 100) * assignment.maxPoints * 10) / 10

        return (
            <div className={cn("flex items-center gap-2", mobile && "w-full")}>
                <div className={cn("relative", mobile ? "min-w-0 flex-1" : "w-24")}>
                    <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={row.score ?? ""}
                        onChange={(event) => handleScoreChange(row.student.id, event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && saveScore(row.student.id)}
                        disabled={assignment.type === "QUIZ" || isPending}
                        aria-label={`Percentage score for ${row.student.name}`}
                        placeholder="Score"
                        className={cn(
                            "pr-7 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                            assignment.isExtraCredit && "border-emerald-500 focus-visible:ring-emerald-500/25"
                        )}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <div className={cn("text-xs text-muted-foreground", mobile ? "w-16" : "w-14")}>
                    {calculatedPoints === null ? "—" : `${calculatedPoints} pts`}
                </div>
                {assignment.type !== "QUIZ" && (
                    dirty[row.student.id] ? (
                        <Button
                            type="button"
                            size="icon-sm"
                            onClick={() => saveScore(row.student.id)}
                            disabled={isPending || row.score === undefined}
                            aria-label={`Save grade for ${row.student.name}`}
                        >
                            <Save />
                        </Button>
                    ) : row.score !== undefined ? (
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setUnGradeId(row.student.id)}
                            disabled={isPending}
                            aria-label={`Remove grade for ${row.student.name}`}
                        >
                            <RotateCcw />
                        </Button>
                    ) : <div className="size-7" aria-hidden="true" />
                )}
            </div>
        )
    }

    return (
        <WorkspacePage>
            <MobileHeaderSetter
                title={assignment.title}
                subtitle={`${assignment.course.name} · ${taskTypeLabel(assignment.type)}${assignment.isExtraCredit ? " · Extra credit" : ""}`}
                backLink={backLink}
            />

            <WorkspacePanel className="overflow-hidden">
                <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_2.75rem] sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
                    <div className="flex min-w-0 items-center gap-2 border-r px-2 py-1.5 sm:px-3">
                        <CalendarClock className="hidden size-4 shrink-0 text-primary min-[430px]:block" />
                        <div className="min-w-0">
                            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Due</div>
                            <div className="truncate text-xs font-medium sm:text-sm">
                                {format(new Date(assignment.dueDate), "MMM d, yyyy")}
                                <span className="block text-[10px] text-muted-foreground sm:inline sm:text-sm sm:text-foreground"> <span className="hidden sm:inline">· </span>{format(new Date(assignment.dueDate), "h:mm a")}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 border-r px-2 py-1.5 sm:px-3">
                        <FileCheck2 className="hidden size-4 shrink-0 text-primary min-[430px]:block" />
                        <div className="min-w-0">
                            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Maximum</div>
                            <div className="truncate text-xs font-medium sm:text-sm">{assignment.maxPoints} points</div>
                        </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 border-r px-2 py-1.5 sm:px-3">
                        <CheckCircle2 className="hidden size-4 shrink-0 text-primary min-[430px]:block" />
                        <div className="min-w-0">
                            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Grading</div>
                            <div className="truncate text-xs font-medium sm:text-sm">{assignment.latePenalty > 0 ? `${assignment.latePenalty}% penalty` : "No penalty"}</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-1 p-1 sm:px-2">
                        <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
                            <Link href={backLink}>
                                <ArrowLeft /> Back to tasks
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="icon" className="size-11 sm:h-8 sm:w-auto sm:px-3">
                            <Link
                                href={`/teacher/courses/${assignment.courseId}/tasks/${assignment.id}/edit`}
                                aria-label="Edit task"
                            >
                                <Edit3 /> <span className="hidden sm:inline">Edit task</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {assignment.description && (
                    <div className="border-t">
                    <button
                        type="button"
                        onClick={() => setShowDescription((current) => !current)}
                        className="flex min-h-9 w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition-colors hover:bg-[var(--workspace-row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        aria-expanded={showDescription}
                    >
                        <span className="font-medium">Task description</span>
                        {showDescription ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                    {showDescription && (
                        <div className="border-t px-3 py-2">
                            <div
                                className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert"
                                dangerouslySetInnerHTML={{ __html: assignment.description }}
                            />
                        </div>
                    )}
                    </div>
                )}
            </WorkspacePanel>

            <div className="space-y-2">
                <WorkspacePanel className="overflow-hidden lg:flex">
                    <div className="grid grid-cols-4 divide-x border-b lg:w-[46%] lg:shrink-0 lg:border-b-0 lg:border-r">
                        {[
                            { icon: Users, value: rows.length, label: "Students" },
                            { icon: FileCheck2, value: submittedCount, label: "Submitted" },
                            { icon: CheckCircle2, value: gradedCount, label: `Graded · ${completion}%` },
                            { icon: ClipboardCheck, value: needsGradingCount, label: "Needs grading" },
                        ].map(({ icon: Icon, value, label }) => (
                            <div key={label} className="flex min-w-0 items-center justify-center gap-1.5 px-1.5 py-1.5 sm:justify-start sm:px-3 sm:py-2">
                                <Icon className="hidden size-3.5 shrink-0 text-primary min-[400px]:block" />
                                <div className="min-w-0 text-center sm:text-left">
                                    <div className="text-sm font-semibold leading-4 tabular-nums">{value}</div>
                                    <div className="truncate text-[10px] leading-4 text-muted-foreground sm:text-[11px]">{label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <WorkspaceToolbar className="min-h-0 flex-1 flex-nowrap gap-1.5 p-1.5">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search students"
                                aria-label="Search students"
                                className="pl-8"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            aria-label="Filter grading status"
                            className="h-11 w-32 shrink-0 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-xs outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 sm:h-8 sm:w-40 sm:text-sm"
                        >
                            <option value="ALL">All statuses</option>
                            <option value="NEEDS_GRADING">Needs grading</option>
                            <option value="GRADED">Graded</option>
                            <option value="MISSING">Missing</option>
                            <option value="LATE">Late</option>
                        </select>
                        <div className="hidden shrink-0 px-1 text-xs text-muted-foreground sm:block" aria-live="polite">{visibleRows.length} students</div>
                    </WorkspaceToolbar>
                </WorkspacePanel>

                {visibleRows.length ? (
                    <>
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Work</TableHead>
                                        <TableHead className="w-56">Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleRows.map((row) => (
                                        <TableRow key={row.student.id}>
                                            <TableCell>
                                                <div className="font-medium">{row.student.name}</div>
                                                <div className="text-xs text-muted-foreground">{row.student.email}</div>
                                            </TableCell>
                                            <TableCell><StudentStatus row={row} /></TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {row.submission ? format(new Date(row.submission.submittedAt), "MMM d, h:mm a") : "—"}
                                            </TableCell>
                                            <TableCell>
                                                {row.submission && assignment.type === "SUBMISSION" ? (
                                                    <Button variant="ghost" size="sm" onClick={() => setReviewStudentId(row.student.id)}>
                                                        <Eye /> Review
                                                    </Button>
                                                ) : <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell><GradeControls row={row} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <WorkspacePanel className="divide-y overflow-hidden md:hidden">
                            {visibleRows.map((row) => (
                                <article key={row.student.id} className="p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate font-medium">{row.student.name}</div>
                                            <div className="truncate text-xs text-muted-foreground">{row.student.email}</div>
                                            <div className="mt-1.5"><StudentStatus row={row} /></div>
                                        </div>
                                        {row.submission && assignment.type === "SUBMISSION" && (
                                            <Button variant="outline" size="sm" onClick={() => setReviewStudentId(row.student.id)}>
                                                <Eye /> Review
                                            </Button>
                                        )}
                                    </div>
                                    {row.submission && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            Submitted {format(new Date(row.submission.submittedAt), "MMM d, h:mm a")}
                                        </div>
                                    )}
                                    <div className="mt-3 border-t pt-3">
                                        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Percentage score</div>
                                        <GradeControls row={row} mobile />
                                    </div>
                                </article>
                            ))}
                        </WorkspacePanel>
                    </>
                ) : (
                    <WorkspacePanel className="px-4 py-10 text-center">
                        <Users className="mx-auto mb-2 size-5 text-muted-foreground" />
                        <h2 className="text-sm font-semibold">No matching students</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Try a different name or grading status.</p>
                    </WorkspacePanel>
                )}
            </div>

            {reviewRow?.submission && (
                <SubmissionGradeDialog
                    key={reviewRow.student.id}
                    student={reviewRow.student}
                    submission={reviewRow.submission}
                    assignment={assignment}
                    currentScore={reviewRow.score}
                    onScoreUpdate={(studentId, score) => {
                        setScores((previous) => ({ ...previous, [studentId]: score }))
                        setDirty((previous) => ({ ...previous, [studentId]: false }))
                    }}
                    open
                    onOpenChange={(open) => !open && setReviewStudentId(null)}
                    trigger={null}
                />
            )}

            <AlertDialog open={Boolean(unGradeId)} onOpenChange={(open) => !open && setUnGradeId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove this grade?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The student&apos;s submission will remain available, but its recorded score will be cleared.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUnGrade} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remove grade
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </WorkspacePage>
    )
}
