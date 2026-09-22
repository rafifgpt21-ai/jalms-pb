"use client"

import { useState, useMemo, useCallback, memo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, X, Search, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react"
import { updateSchedule } from "@/lib/actions/schedule.actions"
import { getPeriodLabel } from "@/lib/helpers/period-label"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ConflictListDialog } from "./conflict-list-dialog"

// Constants
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const UI_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const DB_DAY_MAPPING: Record<string, number> = {
    "Monday": 1,
    "Tuesday": 2,
    "Wednesday": 3,
    "Thursday": 4,
    "Friday": 5,
    "Saturday": 6,
    "Sunday": 0
}

const PERIODS = [0, 1, 2, 3, 4, 5, 6, 7]

interface Teacher {
    id: string
    name: string
    email: string
    image: string | null
    nickname: string | null
    taughtCourses: Course[]
}

interface Course {
    id: string
    name: string
    class: { name: string } | null
    subject: { name: string } | null
    schedules: Schedule[]
}

interface Schedule {
    dayOfWeek: number
    period: number
    deletedAt: Date | null
}

interface MasterScheduleManagerProps {
    teachers: Teacher[]
}

interface EditingSlot {
    teacherId: string
    teacherName: string
    period: number
    dayStr: string
    currentCourseId: string | null
    availableCourses: Course[]
}

// ----------------------------------------------------------------------
// Memoized Components
// ----------------------------------------------------------------------

interface ScheduleCellProps {
    assignedCourse: Course | null
    onClick: () => void
    disabled: boolean
    compact?: boolean
}

const ScheduleCell = memo(function ScheduleCell({ assignedCourse, onClick, disabled, compact }: ScheduleCellProps) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={cn(
                "rounded-md border flex flex-col items-center justify-center text-center cursor-pointer", // Removed dashed border for solid cleaner look
                compact ? "h-[40px] p-0.5 text-[9px]" : "h-[50px] p-1",
                assignedCourse
                    ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-200 dark:hover:bg-indigo-900/60" // Solid colors
                    : "bg-background border-border hover:bg-muted", // Solid background
                disabled && "opacity-50 cursor-wait"
            )}
        >
            {assignedCourse ? (
                <>
                    <span className={cn("font-medium text-slate-900 dark:text-slate-100 leading-tight line-clamp-1", compact ? "text-[9px]" : "text-xs line-clamp-2")}>
                        {assignedCourse.name}
                    </span>
                    {!compact && (
                        <span className="text-[10px] text-muted-foreground mt-0.5 max-w-full truncate">
                            {assignedCourse.class?.name}
                        </span>
                    )}
                </>
            ) : (
                <div className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                    <Plus className={cn("text-muted-foreground", compact ? "h-3 w-3" : "h-4 w-4")} />
                </div>
            )}
        </div>
    )
}, (prev, next) => {
    return (
        prev.assignedCourse?.id === next.assignedCourse?.id &&
        prev.disabled === next.disabled &&
        prev.compact === next.compact
    )
})

interface TeacherScheduleRowProps {
    teacher: Teacher
    viewMode: "day" | "week"
    selectedDay: string
    isUpdating: boolean
    assignmentMap: Record<string, Record<number, Record<number, Course>>>
    onCellClick: (teacher: Teacher, period: number, dayStr: string, assignedCourse: Course | null) => void
}

const TeacherScheduleRow = memo(function TeacherScheduleRow({
    teacher,
    viewMode,
    selectedDay,
    isUpdating,
    assignmentMap,
    onCellClick
}: TeacherScheduleRowProps) {
    // Local helper to avoid passing the huge map down too deep if we extracted further
    // But here we are just in the row.
    const getAssignment = (period: number, dayStr: string) => {
        const dbDay = DB_DAY_MAPPING[dayStr]
        return assignmentMap[teacher.id]?.[dbDay]?.[period] || null
    }

    return (
        <TableRow className="hover:bg-muted/50 border-b border-border transition-colors">
            {/* Teacher Sticky Column */}
            <TableCell className="font-medium sticky left-0 bg-background z-10 w-[200px] min-w-[200px] align-top py-2 border-b border-r border-border transition-colors group-hover:bg-muted/50">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={teacher.image || ""} />
                        <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm font-medium">{teacher.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{teacher.nickname || teacher.email.split('@')[0]}</span>
                    </div>
                </div>
            </TableCell>

            {/* Period Cells */}
            {viewMode === "day" ? (
                PERIODS.map(period => {
                    const assignedCourse = getAssignment(period, selectedDay)
                    const handleClick = () => onCellClick(teacher, period, selectedDay, assignedCourse)
                    return (
                        <TableCell key={period} className="p-1 border-l border-border w-[140px]">
                            <ScheduleCell
                                assignedCourse={assignedCourse}
                                onClick={handleClick}
                                disabled={isUpdating}
                            />
                        </TableCell>
                    )
                })
            ) : (
                ALL_DAYS.map(day => (
                    <TableCell key={day} className="p-1 border-l border-border w-[160px] align-top">
                        <div className="grid grid-cols-1 gap-1">
                            {PERIODS.map(period => {
                                const assignedCourse = getAssignment(period, day)
                                const handleClick = () => onCellClick(teacher, period, day, assignedCourse)
                                return (
                                    <div key={period} className="flex items-center gap-1">
                                        <div className="w-4 text-[10px] text-muted-foreground font-mono shrink-0 text-right">
                                            {period === 0 ? "M" : period === 7 ? "N" : period}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <ScheduleCell
                                                assignedCourse={assignedCourse}
                                                onClick={handleClick}
                                                disabled={isUpdating}
                                                compact={true}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </TableCell>
                ))
            )}
        </TableRow>
    )
}, (prev, next) => {
    // Custom comparison for performance
    if (prev.viewMode !== next.viewMode) return false
    if (prev.viewMode === 'day' && prev.selectedDay !== next.selectedDay) return false
    if (prev.isUpdating !== next.isUpdating) return false
    if (prev.teacher !== next.teacher) return false

    if (prev.assignmentMap !== next.assignmentMap) {
        return false
    }

    return true
})


// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

export function MasterScheduleManager({ teachers }: MasterScheduleManagerProps) {
    const router = useRouter()
    const [selectedDay, setSelectedDay] = useState("Monday")
    const [searchQuery, setSearchQuery] = useState("")
    const [isUpdating, setIsUpdating] = useState(false)
    const [viewMode, setViewMode] = useState<"day" | "week">("day")

    const [conflictEvents, setConflictEvents] = useState<any[]>([])
    const [showConflictDialog, setShowConflictDialog] = useState(false)

    // Editor State
    const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null)

    // Memoize assignment map for O(1) lookup
    // Structure: map[teacherId][dayOfWeek][period] = Course
    const assignmentMap = useMemo(() => {
        const map: Record<string, Record<number, Record<number, Course>>> = {}

        for (const teacher of teachers) {
            map[teacher.id] = {}
            for (const course of teacher.taughtCourses) {
                for (const schedule of course.schedules) {
                    if (schedule.deletedAt) continue

                    if (!map[teacher.id][schedule.dayOfWeek]) {
                        map[teacher.id][schedule.dayOfWeek] = {}
                    }
                    map[teacher.id][schedule.dayOfWeek][schedule.period] = course
                }
            }
        }
        return map
    }, [teachers])

    // Filter teachers based on search
    const filteredTeachers = useMemo(() => {
        if (!searchQuery) return teachers
        const lower = searchQuery.toLowerCase()
        return teachers.filter(t =>
            t.name.toLowerCase().includes(lower) ||
            t.nickname?.toLowerCase().includes(lower) ||
            t.email.toLowerCase().includes(lower)
        )
    }, [teachers, searchQuery])

    const handleCellClick = useCallback((teacher: Teacher, period: number, dayStr: string, assignedCourse: Course | null) => {
        if (isUpdating) return
        setEditingSlot({
            teacherId: teacher.id,
            teacherName: teacher.name,
            period,
            dayStr,
            currentCourseId: assignedCourse?.id || null,
            availableCourses: teacher.taughtCourses
        })
    }, [isUpdating])

    const handleUpdateSchedule = async (courseId: string | null) => {
        if (!editingSlot) return

        try {
            setIsUpdating(true)
            // Close dialog immediately for better UX assignment feel
            const { teacherId, period, dayStr } = editingSlot
            setEditingSlot(null) // Optimistically close

            const dbDay = DB_DAY_MAPPING[dayStr]
            const result = await updateSchedule(teacherId, dbDay, period, courseId)



            if (result.conflictEvents) {
                setConflictEvents(result.conflictEvents)
                setShowConflictDialog(true)
            } else if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Schedule updated")
                router.refresh()
            }
        } catch (error) {
            toast.error("Failed to update schedule")
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col gap-6">
            {/* Conflict Dialog */}

            <ConflictListDialog
                open={showConflictDialog}
                onOpenChange={setShowConflictDialog}
                conflicts={conflictEvents}
            />

            {/* Assignment Editor Dialog */}
            <Dialog open={!!editingSlot} onOpenChange={(open) => !open && setEditingSlot(null)}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-w-sm">
                    <DialogHeader className="px-4 py-2 bg-muted/50 border-b">
                        <DialogTitle className="text-base">
                            Edit Schedule
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground">
                            {editingSlot?.dayStr} • Period {editingSlot?.period !== undefined && getPeriodLabel(editingSlot.period)} • {editingSlot?.teacherName}
                        </p>
                    </DialogHeader>
                    <Command className="border-none shadow-none">
                        <CommandInput placeholder="Select course..." />
                        <CommandList>
                            <CommandEmpty>No courses found.</CommandEmpty>
                            <CommandGroup heading="Actions">
                                <CommandItem
                                    onSelect={() => handleUpdateSchedule(null)}
                                    className="text-red-600 cursor-pointer"
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Clear Slot
                                </CommandItem>
                            </CommandGroup>
                            <CommandGroup heading="Available Courses">
                                {editingSlot?.availableCourses.map(course => (
                                    <CommandItem
                                        key={course.id}
                                        onSelect={() => handleUpdateSchedule(course.id)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{course.name}</span>
                                            <span className="text-xs text-muted-foreground">{course.class?.name || "No Class"}</span>
                                        </div>
                                        {editingSlot.currentCourseId === course.id && (
                                            <span className="ml-auto text-xs text-primary font-medium">Current</span>
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </DialogContent>
            </Dialog>

            {/* Header Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                <div className="flex w-full items-center gap-3 overflow-x-auto md:w-auto">
                    <div className="hidden items-center whitespace-nowrap rounded-lg border bg-muted p-1 md:flex">
                        <Button
                            variant={viewMode === "day" ? "secondary" : "ghost"}
                            size="sm"
                            className="text-xs"
                            onClick={() => setViewMode("day")}
                        >
                            Day View
                        </Button>
                        <Button
                            variant={viewMode === "week" ? "secondary" : "ghost"}
                            size="sm"
                            className="text-xs"
                            onClick={() => setViewMode("week")}
                        >
                            Full Week
                        </Button>
                    </div>

                    <Tabs value={selectedDay} onValueChange={setSelectedDay} className={cn("w-full md:w-auto", viewMode !== "day" && "md:hidden")}>
                            <TabsList className="grid h-auto grid-cols-4 p-1 sm:grid-cols-7">
                                {UI_DAYS.map(day => (
                                    <TabsTrigger key={day} value={day} className="px-2 py-1.5 text-xs md:text-sm">
                                        {day.slice(0, 3)}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                    </Tabs>
                </div>

                <div className="relative w-full md:w-64 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search teachers..."
                        className="pl-9 bg-background border-border rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Mobile schedule cards */}
            <div className="grid gap-3 md:hidden">
                {filteredTeachers.length === 0 ? (
                    <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">No teachers found.</div>
                ) : filteredTeachers.map((teacher) => (
                    <section key={teacher.id} className="admin-mobile-schedule-card overflow-hidden">
                        <div className="flex items-center gap-3 border-b p-3">
                            <Avatar className="size-9">
                                <AvatarImage src={teacher.image || ""} />
                                <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold">{teacher.name}</h3>
                                <p className="truncate text-xs text-muted-foreground">{teacher.nickname || teacher.email}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-2">
                            {PERIODS.map((period) => {
                                const assignedCourse = assignmentMap[teacher.id]?.[DB_DAY_MAPPING[selectedDay]]?.[period] || null
                                return (
                                    <button
                                        key={period}
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleCellClick(teacher, period, selectedDay, assignedCourse)}
                                        className={cn(
                                            "flex min-h-14 min-w-0 flex-col justify-center rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-50",
                                            assignedCourse
                                                ? "border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-800 dark:bg-indigo-950/35 dark:text-indigo-100"
                                                : "border-dashed bg-muted/25 hover:bg-muted/60"
                                        )}
                                    >
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{getPeriodLabel(period)}</span>
                                        <span className={cn("mt-0.5 truncate text-xs", assignedCourse ? "font-semibold" : "text-muted-foreground")}>
                                            {assignedCourse?.name || "Free slot"}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </section>
                ))}
            </div>

            {/* Tablet and desktop grid */}
            <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm md:flex">
                <div className="overflow-auto w-full max-w-[100vw] h-full">
                    <table className="relative min-w-full w-auto caption-bottom text-sm">
                        <TableHeader className="sticky top-0 bg-background z-20 shadow-sm border-b border-border">
                            <TableRow className="hover:bg-transparent border-border">
                                <TableHead className="w-[200px] min-w-[200px] max-w-[200px] bg-background z-30 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-foreground font-medium border-b border-r border-border">
                                    Teacher
                                </TableHead>

                                {viewMode === "day" ? (
                                    PERIODS.map(period => (
                                        <TableHead key={period} className="text-center min-w-[140px] w-[140px] px-2 border-l border-border text-foreground font-medium">
                                            {getPeriodLabel(period)}
                                        </TableHead>
                                    ))
                                ) : (
                                    ALL_DAYS.map(day => (
                                        <TableHead key={day} className="text-center min-w-[160px] w-[160px] px-1 border-l border-border text-foreground font-medium">
                                            {day}
                                        </TableHead>
                                    ))
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTeachers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={viewMode === "day" ? PERIODS.length + 1 : ALL_DAYS.length + 1} className="h-24 text-center">
                                        No teachers found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTeachers.map(teacher => (
                                    <TeacherScheduleRow
                                        key={teacher.id}
                                        teacher={teacher}
                                        viewMode={viewMode}
                                        selectedDay={selectedDay}
                                        isUpdating={isUpdating}
                                        assignmentMap={assignmentMap}
                                        onCellClick={handleCellClick}
                                    />
                                ))
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>

        </div>
    )
}
