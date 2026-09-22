"use client"

import { useMemo, useState } from "react"
import type { AttendanceStatus, User } from "@prisma/client"
import { AlertCircle, CheckCircle2, CircleDashed, HelpCircle, Loader2, Save, Search, UserCheck, XCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WorkspacePanel, WorkspaceToolbar } from "@/components/workspace/workspace-page"
import { saveAttendance } from "@/lib/actions/attendance.actions"
import { cn } from "@/lib/utils"
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

const EDITABLE_STATUSES = ["PRESENT", "ABSENT", "EXCUSED"] as const
type EditableStatus = typeof EDITABLE_STATUSES[number]

const STATUS_OPTIONS: Array<{
    value: EditableStatus
    label: string
    icon: typeof CheckCircle2
    selectedClassName: string
}> = [
    {
        value: "PRESENT",
        label: "Present",
        icon: CheckCircle2,
        selectedClassName: "border-emerald-400 bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-300 hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-600 dark:text-white dark:ring-emerald-400 dark:hover:bg-emerald-600",
    },
    {
        value: "ABSENT",
        label: "Absent",
        icon: XCircle,
        selectedClassName: "border-red-400 bg-red-50 text-red-800 ring-1 ring-inset ring-red-300 hover:bg-red-100 dark:border-red-500 dark:bg-red-600 dark:text-white dark:ring-red-400 dark:hover:bg-red-600",
    },
    {
        value: "EXCUSED",
        label: "Excused",
        icon: HelpCircle,
        selectedClassName: "border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-300 hover:bg-amber-100 dark:border-amber-400 dark:bg-amber-500 dark:text-slate-950 dark:ring-amber-300 dark:hover:bg-amber-500",
    },
]

interface StudentWithStatus {
    student: User
    status: AttendanceStatus | null
    recordId: string | null
    topic: string | null
    excuseReason: string | null
}

interface AttendanceFormProps {
    courseId: string
    date: Date
    period: number
    initialStudents: StudentWithStatus[]
    initialTopic: string
    completionHref?: string
}

function isEditableStatus(status: AttendanceStatus | null): status is EditableStatus {
    return status !== null && EDITABLE_STATUSES.includes(status as EditableStatus)
}

function studentName(student: User) {
    return student.name || student.email || "Student"
}

function studentInitials(student: User) {
    return studentName(student).split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()
}

function StatusPicker({ status, onChange }: { status: AttendanceStatus | null, onChange: (status: EditableStatus) => void }) {
    return (
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Attendance status">
            {STATUS_OPTIONS.map(option => {
                const Icon = option.icon
                const selected = status === option.value
                return (
                    <Button
                        key={option.value}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        aria-pressed={selected}
                        data-attendance-status={option.value}
                        className={cn(
                            "min-w-0 gap-1 px-2",
                            selected ? option.selectedClassName : "text-muted-foreground"
                        )}
                        onClick={() => onChange(option.value)}
                    >
                        <Icon className="size-4" />
                        <span className="truncate">{option.label}</span>
                    </Button>
                )
            })}
        </div>
    )
}

function CountCell({ value, label, last = false }: { value: number, label: string, last?: boolean }) {
    return (
        <div className={cn("flex min-w-0 flex-col justify-center border-r px-2 py-1 text-center sm:px-3 lg:flex-row lg:items-center lg:gap-1.5", last && "border-r-0 lg:border-r")}>
            <p className="text-sm font-semibold tabular-nums">{value}</p>
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">{label}</p>
        </div>
    )
}

export function AttendanceForm({ courseId, date, period, initialStudents, initialTopic, completionHref }: AttendanceFormProps) {
    const [students, setStudents] = useState(initialStudents)
    const [query, setQuery] = useState("")
    const [applyToAll, setApplyToAll] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [showApplyAllConfirm, setShowApplyAllConfirm] = useState(false)

    const counts = useMemo(() => {
        const present = students.filter(item => item.status === "PRESENT").length
        const absent = students.filter(item => item.status === "ABSENT").length
        const excused = students.filter(item => item.status === "EXCUSED").length
        const marked = present + absent + excused
        return { present, absent, excused, marked, unmarked: students.length - marked }
    }, [students])

    const visibleStudents = useMemo(() => {
        const normalized = query.trim().toLowerCase()
        if (!normalized) return students
        return students.filter(({ student }) =>
            studentName(student).toLowerCase().includes(normalized) ||
            (student.email || "").toLowerCase().includes(normalized)
        )
    }, [query, students])

    const markDirty = () => {
        setSaved(false)
        setSaveError(null)
    }

    const handleStatusChange = (studentId: string, status: EditableStatus) => {
        markDirty()
        setStudents(current => current.map(item =>
            item.student.id === studentId
                ? { ...item, status, excuseReason: status === "EXCUSED" ? item.excuseReason : null }
                : item
        ))
    }

    const handleExcuseReasonChange = (studentId: string, excuseReason: string) => {
        markDirty()
        setStudents(current => current.map(item => item.student.id === studentId ? { ...item, excuseReason } : item))
    }

    const markRemainingPresent = () => {
        markDirty()
        setStudents(current => current.map(item => isEditableStatus(item.status) ? item : { ...item, status: "PRESENT" }))
    }

    const saveRecords = async () => {
        setShowApplyAllConfirm(false)
        setSaving(true)
        setSaveError(null)

        const records = students.flatMap(item => isEditableStatus(item.status) ? [{
            studentId: item.student.id,
            status: item.status,
            excuseReason: item.status === "EXCUSED" ? item.excuseReason : null,
        }] : [])

        const result = await saveAttendance(courseId, date, period, initialTopic, records, applyToAll)
        if (result.success) {
            setSaved(true)
            toast.success("Attendance saved")
        } else {
            const message = result.error || "Attendance could not be saved"
            setSaveError(message)
            toast.error(message)
        }
        setSaving(false)
    }

    const handleSaveClick = () => {
        if (counts.unmarked > 0 || students.length === 0) return
        if (applyToAll) setShowApplyAllConfirm(true)
        else void saveRecords()
    }

    const progress = students.length > 0 ? (counts.marked / students.length) * 100 : 0

    return (
        <div className="space-y-3">
            <WorkspacePanel className="overflow-hidden">
                <div className="grid grid-cols-4 lg:grid-cols-[minmax(12rem,1.1fr)_repeat(4,minmax(5.5rem,.42fr))_auto] lg:items-stretch">
                    <div className="col-span-4 border-b p-2 lg:col-span-1 lg:border-b-0 lg:border-r">
                        <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-xs font-medium text-muted-foreground"><span className="font-semibold text-foreground">{counts.marked}/{students.length}</span> marked</p>
                            <span className="text-sm font-semibold tabular-nums">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="mt-1 h-1" />
                    </div>
                    <CountCell value={counts.present} label="Present" />
                    <CountCell value={counts.absent} label="Absent" />
                    <CountCell value={counts.excused} label="Excused" />
                    <CountCell value={counts.unmarked} label="Unmarked" last />
                    {counts.unmarked > 0 ? (
                        <div className="col-span-4 border-t p-2 lg:col-span-1 lg:flex lg:items-center lg:border-t-0">
                            <Button type="button" variant="outline" size="sm" className="w-full" onClick={markRemainingPresent}>
                                <UserCheck className="size-4" />
                                Mark remaining
                            </Button>
                        </div>
                    ) : (
                        <div className="hidden items-center gap-1.5 px-3 text-xs font-medium text-emerald-700 dark:text-emerald-300 lg:flex">
                            <CheckCircle2 className="size-4" />
                            Complete
                        </div>
                    )}
                </div>
                <div className="flex min-h-11 items-center justify-between gap-3 border-t bg-muted/20 px-2.5 py-1 sm:min-h-8">
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 lg:flex-none lg:justify-start">
                        <div className="min-w-0">
                            <Label htmlFor="apply-all-sessions" className="cursor-pointer whitespace-nowrap">Apply to all periods</Label>
                            <span className="sr-only">Copies this attendance roster to the other periods for this course today.</span>
                        </div>
                        <Switch
                            id="apply-all-sessions"
                            checked={applyToAll}
                            onCheckedChange={checked => {
                                setApplyToAll(checked)
                                markDirty()
                            }}
                        />
                    </div>
                    <div className="relative hidden w-72 lg:block">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            aria-label="Search students"
                            placeholder="Search students"
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
            </WorkspacePanel>

            <section className="space-y-1.5" aria-labelledby="student-roster-heading">
                <h2 id="student-roster-heading" className="sr-only">Student roster</h2>
                <WorkspaceToolbar className="justify-end lg:hidden">
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            aria-label="Search students"
                            placeholder="Search students"
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            className="pl-8"
                        />
                    </div>
                </WorkspaceToolbar>

                {students.length === 0 ? (
                    <WorkspacePanel className="flex min-h-40 items-center justify-center p-6 text-center">
                        <div>
                            <CircleDashed className="mx-auto size-7 text-muted-foreground" />
                            <p className="mt-2 font-medium">No students in this roster</p>
                            <p className="mt-1 text-sm text-muted-foreground">Add students to the course before recording attendance.</p>
                        </div>
                    </WorkspacePanel>
                ) : visibleStudents.length === 0 ? (
                    <WorkspacePanel className="p-6 text-center text-sm text-muted-foreground">No students match “{query}”.</WorkspacePanel>
                ) : (
                    <>
                        <WorkspacePanel className="divide-y overflow-hidden xl:hidden">
                            {visibleStudents.map(({ student, status, excuseReason }) => (
                                <article key={student.id} className="space-y-3 p-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Avatar className="size-9">
                                            <AvatarImage src={student.image || undefined} />
                                            <AvatarFallback>{studentInitials(student)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{studentName(student)}</p>
                                            <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                                        </div>
                                    </div>
                                    <StatusPicker status={status} onChange={nextStatus => handleStatusChange(student.id, nextStatus)} />
                                    {status === "EXCUSED" ? (
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`excuse-mobile-${student.id}`}>Excuse reason</Label>
                                            <Input
                                                id={`excuse-mobile-${student.id}`}
                                                value={excuseReason || ""}
                                                placeholder="Add a reason"
                                                onChange={event => handleExcuseReasonChange(student.id, event.target.value)}
                                            />
                                        </div>
                                    ) : null}
                                </article>
                            ))}
                        </WorkspacePanel>

                        <div className="hidden xl:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[36%]">Student</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleStudents.map(({ student, status, excuseReason }) => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <Avatar className="size-8">
                                                        <AvatarImage src={student.image || undefined} />
                                                        <AvatarFallback>{studentInitials(student)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">{studentName(student)}</p>
                                                        <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-2">
                                                <div className="max-w-xl space-y-2">
                                                    <StatusPicker status={status} onChange={nextStatus => handleStatusChange(student.id, nextStatus)} />
                                                    {status === "EXCUSED" ? (
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor={`excuse-desktop-${student.id}`}>Excuse reason</Label>
                                                            <Input
                                                                id={`excuse-desktop-${student.id}`}
                                                                value={excuseReason || ""}
                                                                placeholder="Add a reason"
                                                                onChange={event => handleExcuseReasonChange(student.id, event.target.value)}
                                                                className="max-w-sm"
                                                            />
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </section>

            <WorkspacePanel className="sticky bottom-0 z-20 border-primary/20 p-2 shadow-md">
                {saveError ? (
                    <div role="alert" className="mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <AlertCircle className="size-4 shrink-0" />
                        {saveError}. Check your connection and try again.
                    </div>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2 px-1">
                        {counts.unmarked === 0 && students.length > 0
                            ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                            : <CircleDashed className="size-4 shrink-0 text-muted-foreground" />}
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                                {students.length === 0
                                    ? "No attendance to save"
                                    : counts.unmarked === 0
                                        ? "Roster complete"
                                        : `${counts.unmarked} ${counts.unmarked === 1 ? "student needs" : "students need"} a status`}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                {applyToAll ? "Will apply to every period for this course today" : "Saving updates this period only"}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            type="button"
                            onClick={handleSaveClick}
                            disabled={saving || counts.unmarked > 0 || students.length === 0}
                            className={cn(saved && "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700")}
                        >
                            {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}
                            {saving ? "Saving…" : saved ? "Attendance saved" : "Save attendance"}
                        </Button>
                        {saved && completionHref ? (
                            <Button asChild variant="outline">
                                <Link href={completionHref} prefetch>Done</Link>
                            </Button>
                        ) : null}
                    </div>
                </div>
            </WorkspacePanel>

            <AlertDialog open={showApplyAllConfirm} onOpenChange={setShowApplyAllConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apply this roster to every period?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This copies every student status and excuse reason to all scheduled periods for this course today. Existing attendance in those periods may be replaced.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void saveRecords()} disabled={saving}>
                            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                            Apply and save
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
