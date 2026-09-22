"use client"

import { useState, useEffect, Fragment, memo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, X, ArrowLeft, AlertCircle } from "lucide-react"
import { saveTeacherSchedule, getTeacherSchedule } from "@/lib/actions/schedule.actions"
import { Course, Schedule, Class, Subject, Term, AcademicYear } from "@prisma/client"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ConflictListDialog } from "./conflict-list-dialog"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

import { useRouter } from "next/navigation"

type CourseWithDetails = Course & {
    schedules: Schedule[];
    class: Class | null;
    subject: Subject | null;
    term: Term & { academicYear: AcademicYear };
}

import { getPeriodLabel } from "@/lib/helpers/period-label"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const PERIODS = [0, 1, 2, 3, 4, 5, 6, 7]

interface ScheduleGridProps {
    teacherId: string
    initialCourses: CourseWithDetails[]
}

export function ScheduleGrid({ teacherId, initialCourses }: ScheduleGridProps) {
    const router = useRouter()
    const [courses, setCourses] = useState<CourseWithDetails[]>(initialCourses)
    // assignments: key `${day}-${period}` -> courseId
    const [assignments, setAssignments] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
    const [conflictEvents, setConflictEvents] = useState<any[]>([])
    const [selectedDay, setSelectedDay] = useState(0)

    // Initialize assignments from initialCourses
    useEffect(() => {
        const initialAssignments: Record<string, string> = {}
        initialCourses.forEach(course => {
            course.schedules.forEach(schedule => {
                if (!schedule.deletedAt) {
                    // Map DB day (1-7) to index (0-6)
                    initialAssignments[`${schedule.dayOfWeek}-${schedule.period}`] = course.id
                }
            })
        })
        setAssignments(initialAssignments)
        setCourses(initialCourses)
        setHasChanges(false)
    }, [initialCourses])

    // Helper to find course at a specific slot
    const getCourseIdAtSlot = (dayIndex: number, period: number) => {
        const dbDay = dayIndex === 6 ? 0 : dayIndex + 1
        return assignments[`${dbDay}-${period}`]
    }

    const getCourseDetails = (courseId: string) => {
        return courses.find(c => c.id === courseId)
    }

    const handleAssign = useCallback((courseId: string | null, dayIndex: number, period: number) => {
        const dbDay = dayIndex === 6 ? 0 : dayIndex + 1
        const key = `${dbDay}-${period}`

        setAssignments(prev => {
            const next = { ...prev }
            if (courseId) {
                next[key] = courseId
            } else {
                delete next[key]
            }
            return next
        })
        setHasChanges(true)
        toast.success(courseId ? "Slot updated (unsaved)" : "Slot cleared (unsaved)")
    }, [])

    async function handleSave() {
        setSaving(true)
        const schedules = Object.entries(assignments).map(([key, courseId]) => {
            const [day, period] = key.split('-').map(Number)
            return { day, period, courseId }
        })

        const result = await saveTeacherSchedule(teacherId, schedules)

        if (result.success) {
            toast.success("Schedule saved successfully")
            setHasChanges(false)
            router.refresh()

        } else if (result.conflictEvents) {
            setConflictEvents(result.conflictEvents)
            setConflictDialogOpen(true)
        } else {
            toast.error(result.error)
        }
        setSaving(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!hasChanges || saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-card p-2 shadow-sm">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedDay(prev => prev === 0 ? 6 : prev - 1)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-bold text-lg">{DAYS[selectedDay]}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedDay(prev => prev === 6 ? 0 : prev + 1)}
                    >
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Button>
                </div>

                <div className="space-y-3">
                    {PERIODS.map(period => {
                        const courseId = getCourseIdAtSlot(selectedDay, period)
                        const assignedCourse = courseId ? getCourseDetails(courseId) : null

                        return (
                            <div key={period} className="flex items-center gap-4 rounded-lg border bg-card p-3 shadow-sm">
                                <div className="font-bold text-sm text-gray-500 w-16 text-center">{getPeriodLabel(period)}</div>
                                <div className="flex-1">
                                    <ScheduleSlot
                                        dayIndex={selectedDay}
                                        period={period}
                                        assignedCourse={assignedCourse || null}
                                        courses={courses}
                                        hasChanges={hasChanges}
                                        onAssign={handleAssign}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Desktop View */}
            {/* Desktop View */}

            <div className="max-md:hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl p-4 shadow-sm overflow-x-auto">
                <div className="grid grid-cols-8 gap-2 min-w-[800px]">
                    {/* Header Row */}
                    <div className="font-semibold text-slate-700 dark:text-slate-200 text-center p-2 flex items-center justify-center bg-white/20 dark:bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">Period</div>
                    {DAYS.map(day => (
                        <div key={day} className="font-semibold text-slate-700 dark:text-slate-200 text-center p-2 bg-white/20 dark:bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm flex items-center justify-center">
                            {day}
                        </div>
                    ))}

                    {/* Grid */}
                    {PERIODS.map(period => (
                        <Fragment key={period}>
                            <div className="font-medium text-slate-600 dark:text-slate-300 flex items-center justify-center bg-white/10 dark:bg-white/5 border border-white/10 rounded-xl min-h-[100px] text-xs uppercase px-1 text-center backdrop-blur-sm">
                                {getPeriodLabel(period)}
                            </div>
                            {DAYS.map((day, dayIndex) => {
                                const courseId = getCourseIdAtSlot(dayIndex, period)
                                const assignedCourse = courseId ? getCourseDetails(courseId) : null

                                return (
                                    <ScheduleSlot
                                        key={`${day}-${period}`}
                                        dayIndex={dayIndex}
                                        period={period}
                                        assignedCourse={assignedCourse || null}
                                        courses={courses}
                                        hasChanges={hasChanges}
                                        onAssign={handleAssign}
                                    />
                                )
                            })}
                        </Fragment>
                    ))}
                </div>
            </div>

            <ConflictListDialog
                open={conflictDialogOpen}
                onOpenChange={setConflictDialogOpen}
                conflicts={conflictEvents}
            />
        </div>
    )
}

interface ScheduleSlotProps {
    dayIndex: number
    period: number
    assignedCourse: CourseWithDetails | null
    courses: CourseWithDetails[]
    hasChanges: boolean
    onAssign: (courseId: string | null, dayIndex: number, period: number) => void
}

const ScheduleSlot = memo(function ScheduleSlot({
    dayIndex,
    period,
    assignedCourse,
    courses,
    hasChanges,
    onAssign
}: ScheduleSlotProps) {
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div
                    className={cn(
                        "min-h-[100px] p-2 border rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-center items-center text-center text-xs relative group backdrop-blur-sm",
                        assignedCourse
                            ? "bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200/50 dark:border-indigo-800/50 border-solid hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30"
                            : "border-white/20 dark:border-white/10 border-dashed hover:bg-white/20 dark:hover:bg-white/5 hover:border-white/40",
                        hasChanges && "border-yellow-200/50 bg-yellow-50/30"
                    )}
                >
                    {assignedCourse ? (
                        <>
                            <span className="font-medium text-slate-700 dark:text-slate-200 line-clamp-2 text-sm">{assignedCourse.name}</span>
                            <span className="text-slate-500 dark:text-slate-400 mt-1">{assignedCourse.class?.name}</span>
                        </>
                    ) : (
                        <Plus className="h-6 w-6 text-gray-300 group-hover:text-gray-500" />
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
                <Command>
                    <CommandInput placeholder="Select course..." />
                    <CommandList>
                        <CommandEmpty>No courses found.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                onSelect={() => {
                                    onAssign(null, dayIndex, period)
                                    setOpen(false)
                                }}
                                className="text-red-500 cursor-pointer"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Clear Slot
                            </CommandItem>
                            {courses.map(course => (
                                <CommandItem
                                    key={course.id}
                                    onSelect={() => {
                                        onAssign(course.id, dayIndex, period)
                                        setOpen(false)
                                    }}
                                    className="cursor-pointer"
                                >
                                    <div className="flex flex-col">
                                        <span>{course.name}</span>
                                        <span className="text-xs text-gray-500">{course.class?.name}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
})
