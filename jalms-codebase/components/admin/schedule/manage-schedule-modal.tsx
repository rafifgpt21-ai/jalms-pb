"use client"

import { useState, useEffect, Fragment } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar, Loader2, Plus, X, AlertCircle } from "lucide-react"
import { getTeacherSchedule, updateSchedule, getConflictingCourses } from "@/lib/actions/schedule.actions"
import { Course, Schedule, Class, Subject, Term, AcademicYear } from "@prisma/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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

interface ManageScheduleModalProps {
    teacherId: string
    teacherName: string
}

type CourseWithDetails = Course & {
    schedules: Schedule[];
    class: Class | null;
    subject: Subject | null;
    term: Term & { academicYear: AcademicYear };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
import { getPeriodLabel } from "@/lib/helpers/period-label"

const PERIODS = [0, 1, 2, 3, 4, 5, 6, 7]

export function ManageScheduleModal({ teacherId, teacherName }: ManageScheduleModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [courses, setCourses] = useState<CourseWithDetails[]>([])
    const [selectedSlot, setSelectedSlot] = useState<{ day: number, period: number } | null>(null)
    const [updating, setUpdating] = useState(false)
    const [conflictingCourseIds, setConflictingCourseIds] = useState<string[]>([])

    useEffect(() => {
        if (open) {
            fetchSchedule()
        }
    }, [open])

    useEffect(() => {
        async function checkConflicts() {
            if (selectedSlot) {
                const dbDay = selectedSlot.day === 6 ? 0 : selectedSlot.day + 1
                const result = await getConflictingCourses(teacherId, dbDay, selectedSlot.period)
                if (result.conflictingCourseIds) {
                    setConflictingCourseIds(result.conflictingCourseIds)
                }
            } else {
                setConflictingCourseIds([])
            }
        }
        checkConflicts()
    }, [selectedSlot, teacherId])

    async function fetchSchedule() {
        setLoading(true)
        const result = await getTeacherSchedule(teacherId)
        if (result.courses) {
            setCourses(result.courses as any)
        } else {
            toast.error("Failed to load schedule")
        }
        setLoading(false)
    }

    // Helper to find course at a specific slot
    const getCourseAtSlot = (dayIndex: number, period: number) => {
        const dbDay = dayIndex === 6 ? 0 : dayIndex + 1

        for (const course of courses) {
            const schedule = course.schedules.find(s =>
                s.dayOfWeek === dbDay && s.period === period && !s.deletedAt
            )
            if (schedule) return course
        }
        return null
    }

    async function handleAssign(courseId: string | null) {
        if (!selectedSlot) return

        // OPTIMISTIC UPDATE
        const dbDay = selectedSlot.day === 6 ? 0 : selectedSlot.day + 1
        const period = selectedSlot.period
        const previousCourses = [...courses]

        // Update local state immediately
        setCourses(prev => {
            return prev.map(course => {
                // Remove existing assignment for this slot from ANY course
                const cleanSchedules = course.schedules.filter(s =>
                    !(s.dayOfWeek === dbDay && s.period === period && !s.deletedAt)
                )

                // If this is the course we are assigning, add the new schedule
                if (courseId && course.id === courseId) {
                    // Create a temporary schedule object
                    const newSchedule: any = {
                        id: "temp-" + Date.now(),
                        dayOfWeek: dbDay,
                        period: period,
                        courseId: courseId,
                        deletedAt: null
                    }
                    cleanSchedules.push(newSchedule)
                }

                return { ...course, schedules: cleanSchedules }
            })
        })

        setSelectedSlot(null) // Close popover immediately
        setUpdating(true)

        try {
            const result = await updateSchedule(teacherId, dbDay, period, courseId)

            if (result.success) {
                toast.success(courseId ? "Schedule assigned" : "Schedule cleared")
                // We don't need to fetchSchedule() here if successful, 
                // but we might want to do it in background to ensure sync eventually.
                // For now, trust the optimistic update.
            } else {
                toast.error(result.error)
                // Revert on error
                setCourses(previousCourses)
            }
        } catch (err) {
            toast.error("Failed to update schedule")
            setCourses(previousCourses)
        } finally {
            setUpdating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    Manage
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage Schedule - {teacherName}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-8 gap-2 min-w-[800px]">
                        {/* Header Row */}
                        <div className="font-bold text-center p-2">Period</div>
                        {DAYS.map(day => (
                            <div key={day} className="rounded bg-muted p-2 text-center font-bold">
                                {day}
                            </div>
                        ))}

                        {/* Grid */}
                        {PERIODS.map(period => (
                            <Fragment key={period}>
                                <div className="flex items-center justify-center rounded bg-muted/50 font-bold">
                                    {getPeriodLabel(period)} {/* Using getPeriodLabel for display */}
                                </div>
                                {DAYS.map((day, dayIndex) => {
                                    const assignedCourse = getCourseAtSlot(dayIndex, period)
                                    return (
                                        <Popover key={`${day}-${period}`}>
                                            <PopoverTrigger asChild>
                                                <div
                                                    className={cn(
                                                        "group relative flex h-24 cursor-pointer flex-col items-center justify-center rounded border p-2 text-center text-xs transition-colors hover:bg-muted/60",
                                                        assignedCourse ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40" : "border-dashed"
                                                    )}
                                                    onClick={() => setSelectedSlot({ day: dayIndex, period })}
                                                >
                                                    {assignedCourse ? (
                                                        <>
                                                            <span className="font-semibold line-clamp-2">{assignedCourse.name}</span>
                                                            <span className="text-gray-500 mt-1">{assignedCourse.class?.name}</span>
                                                        </>
                                                    ) : (
                                                        <Plus className="h-4 w-4 text-gray-300 group-hover:text-gray-500" />
                                                    )}
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-0">
                                                <Command>
                                                    <CommandInput placeholder="Select course..." />
                                                    <CommandList>
                                                        <CommandEmpty>No courses found.</CommandEmpty>
                                                        <CommandGroup>
                                                            <CommandItem onSelect={() => handleAssign(null)} className="text-red-500">
                                                                <X className="mr-2 h-4 w-4" />
                                                                Clear Slot
                                                            </CommandItem>
                                                            {courses.map(course => {
                                                                const isConflicting = conflictingCourseIds.includes(course.id)
                                                                return (
                                                                    <CommandItem
                                                                        key={course.id}
                                                                        onSelect={() => handleAssign(course.id)}
                                                                        className={isConflicting ? "aria-selected:bg-red-50" : ""}
                                                                    >
                                                                        <div className="flex flex-col w-full">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className={isConflicting ? "text-red-600 font-medium" : ""}>
                                                                                    {course.name}
                                                                                </span>
                                                                                {isConflicting && <AlertCircle className="h-4 w-4 text-red-500" />}
                                                                            </div>
                                                                            <span className="text-xs text-gray-500">{course.class?.name}</span>
                                                                            {isConflicting && <span className="text-xs text-red-500">Conflict detected!</span>}
                                                                        </div>
                                                                    </CommandItem>
                                                                )
                                                            })}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    )
                                })}
                            </Fragment>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
