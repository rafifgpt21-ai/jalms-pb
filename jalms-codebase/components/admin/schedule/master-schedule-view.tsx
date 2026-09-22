"use client"

import { useState } from "react"
import { Schedule, Course, Class, Subject } from "@prisma/client"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

type ScheduleWithDetails = Schedule & {
    course: Course & {
        teacher: {
            id: string
            name: string | null
            nickname: string | null
            image: string | null
        }
        class: Class | null
        subject: Subject | null
    }
}

interface MasterScheduleViewProps {
    schedules: ScheduleWithDetails[]
}

import { getPeriodLabel } from "@/lib/helpers/period-label"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const PERIODS = [0, 1, 2, 3, 4, 5, 6, 7]

export function MasterScheduleView({ schedules }: MasterScheduleViewProps) {
    const [selectedDay, setSelectedDay] = useState(0) // 0 = Monday

    // Group schedules by Teacher ID -> Period -> Schedule
    // First, identify all unique teachers
    const teachersMap = new Map<string, {
        id: string
        name: string
        nickname: string | null
        image: string | null
    }>()

    schedules.forEach(s => {
        if (s.course && s.course.teacher) {
            teachersMap.set(s.course.teacher.id, {
                id: s.course.teacher.id,
                name: s.course.teacher.name || "Unknown",
                nickname: s.course.teacher.nickname,
                image: s.course.teacher.image
            })
        }
    })

    const teachers = Array.from(teachersMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    // Helper to get schedule for a specific teacher, day, and period
    const getSchedule = (teacherId: string, dayIndex: number, period: number) => {
        // DB Day: 1=Mon, 2=Tue... 6=Sat, 0=Sun (Wait, usually 0=Sun in JS, but let's check prisma usage. 
        // In previous code `schedule-grid.tsx`:
        // const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        // dayIndex 0 (Mon) -> dbDay 1
        // dayIndex 6 (Sun) -> dbDay 0

        let dbDay = dayIndex + 1
        if (dayIndex === 6) dbDay = 0

        return schedules.find(s =>
            s.course.teacherId === teacherId &&
            s.dayOfWeek === dbDay &&
            s.period === period
        )
    }

    return (
        <div className="space-y-6">
            {/* Day Selector */}
            <div className="flex flex-wrap justify-center gap-2 rounded-lg border bg-card p-2 shadow-sm md:justify-start">
                {DAYS.map((day, index) => (
                    <Button
                        key={day}
                        variant={selectedDay === index ? "default" : "ghost"}
                        onClick={() => setSelectedDay(index)}
                        className={cn(
                            "flex-1 md:flex-none",
                            selectedDay === index && "shadow-sm"
                        )}
                    >
                        {day}
                    </Button>
                ))}
            </div>

            {/* Timetable Grid */}
            <div className="bg-white/40 dark:bg-slate-900/40 border border-white/20 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="min-w-[1000px]">
                        <TableHeader className="bg-white/20 dark:bg-white/5 border-b border-white/10">
                            <TableRow className="hover:bg-transparent border-white/10">
                                <TableHead className="w-[250px] bg-white/80 dark:bg-slate-900/80 sticky left-0 z-10 border-r border-white/10 text-slate-700 dark:text-slate-200 font-medium">Teacher</TableHead>
                                {PERIODS.map(period => (
                                    <TableHead key={period} className="text-center w-[150px] border-r border-white/10 last:border-r-0 text-slate-700 dark:text-slate-200 font-medium">
                                        {getPeriodLabel(period)}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teachers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={PERIODS.length + 1} className="h-24 text-center">
                                        No schedules found for this active semester.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                teachers.map(teacher => (
                                    <TableRow key={teacher.id} className="hover:bg-white/30 dark:hover:bg-white/5 border-b border-white/10 dark:border-white/5 transition-colors">
                                        <TableCell className="font-medium bg-white/80 dark:bg-slate-900/80 sticky left-0 z-10 border-r border-white/10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={teacher.image || undefined} />
                                                    <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{teacher.name}</span>
                                                    {teacher.nickname && (
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">{teacher.nickname}</span>
                                                    )}
                                                    <Link
                                                        href={`/admin/schedule?search=${encodeURIComponent(teacher.name)}`}
                                                        className="text-[10px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline mt-0.5"
                                                    >
                                                        View Schedule
                                                    </Link>
                                                </div>
                                            </div>
                                        </TableCell>
                                        {PERIODS.map(period => {
                                            const schedule = getSchedule(teacher.id, selectedDay, period)
                                            return (
                                                <TableCell key={period} className="p-2 border-r border-white/10 last:border-r-0 align-top h-[100px]">
                                                    {schedule ? (
                                                        <div className="h-full w-full bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200/50 dark:border-indigo-800/50 rounded-xl p-2 flex flex-col gap-1 text-center justify-center hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors">
                                                            <div className="font-medium text-slate-700 dark:text-slate-200 text-xs line-clamp-2" title={schedule.course.name}>
                                                                {schedule.course.name}
                                                            </div>
                                                            {schedule.course.class?.name && (
                                                                <Badge variant="outline" className="w-fit mx-auto text-[10px] bg-white/50 dark:bg-slate-900/50 border-white/20 whitespace-nowrap">
                                                                    {schedule.course.class.name}
                                                                </Badge>
                                                            )}
                                                            {schedule.course.subject && (
                                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                                                    {schedule.course.subject.code}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center">
                                                            <span className="text-gray-200 text-xs">-</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
