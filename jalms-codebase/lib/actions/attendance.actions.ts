"use server"

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { AttendanceStatus } from "@prisma/client"

export async function getDailySchedule(teacherId: string, date: Date) {
    try {
        const dayOfWeek = date.getDay() // 0-6

        // 1. Get schedules for this day
        // We need to ensure we only get schedules for active courses/terms
        const schedules = await prisma.schedule.findMany({
            where: {
                dayOfWeek,
                deletedAt: { isSet: false },
                course: {
                    teacherId,
                    term: { isActive: true },
                    deletedAt: { isSet: false }
                }
            },
            include: {
                course: {
                    include: {
                        class: true,
                        subject: true,
                        term: true
                    }
                }
            },
            orderBy: {
                period: 'asc'
            }
        })

        // Filter schedules based on term dates
        const validSchedules = schedules.filter(schedule => {
            const term = schedule.course.term
            // Ensure we compare just dates or handle time correctly
            // Assuming startDate and endDate are set to midnight or relevant boundaries
            const targetDate = new Date(date)
            return targetDate >= term.startDate && targetDate <= term.endDate
        })

        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        const attendanceRecords = validSchedules.length > 0
            ? await prisma.attendance.findMany({
                where: {
                    courseId: { in: [...new Set(validSchedules.map(schedule => schedule.courseId))] },
                    date: { gte: startOfDay, lte: endOfDay },
                    deletedAt: { isSet: false }
                },
                select: { courseId: true, period: true, status: true, topic: true }
            })
            : []

        const statusBySession = new Map<string, { isAttendanceTaken: boolean, isSkipped: boolean, topic: string | null }>()
        for (const record of attendanceRecords) {
            const key = `${record.courseId}:${record.period}`
            const current = statusBySession.get(key) || { isAttendanceTaken: false, isSkipped: false, topic: null }
            if (record.status !== "PENDING" && record.status !== "SKIPPED") current.isAttendanceTaken = true
            if (record.status === "SKIPPED") current.isSkipped = true
            if (!current.topic && record.topic) current.topic = record.topic
            statusBySession.set(key, current)
        }

        const schedulesWithStatus = validSchedules.map(schedule => ({
            ...schedule,
            ...(statusBySession.get(`${schedule.courseId}:${schedule.period}`) || {
                isAttendanceTaken: false,
                isSkipped: false,
                topic: null
            })
        }))

        return { schedules: schedulesWithStatus, error: undefined }
    } catch (error) {
        console.error("Error fetching daily schedule:", error)
        return { schedules: [], error: "Failed to fetch daily schedule" }
    }
}

export async function getCourseAttendance(courseId: string, date: Date, period: number) {
    try {
        // 1. Get course details and students
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                students: {
                    orderBy: { name: 'asc' }
                },
                class: true,
                subject: true
            }
        })

        if (!course) {
            return { error: "Course not found", course: null, students: [], topic: null, attendancePoolScore: 0 }
        }

        // 2. Get existing attendance records for this date and period
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                courseId,
                period,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                deletedAt: { isSet: false }
            }
        })

        // 3. Map students to their attendance status
        const studentsWithAttendance = course.students.map(student => {
            const record = attendanceRecords.find(r => r.studentId === student.id)
            return {
                student,
                status: record && record.status !== "PENDING" ? record.status : null, // null means not taken yet
                recordId: record ? record.id : null,
                topic: record ? record.topic : null,
                excuseReason: record ? record.excuseReason : null
            }
        })

        // Get topic from the first record if exists (assuming topic is same for all in a session)
        const topic = attendanceRecords.length > 0 ? attendanceRecords[0].topic : ""

        return {
            course,
            students: studentsWithAttendance,
            topic,
            attendancePoolScore: course.attendancePoolScore,
            error: undefined
        }

    } catch (error) {
        console.error("Error fetching course attendance:", error)
        return { error: "Failed to fetch course attendance", course: null, students: [], topic: null, attendancePoolScore: 0 }
    }
}

export async function updateAttendancePoolScore(courseId: string, score: number) {
    try {
        await prisma.course.update({
            where: { id: courseId },
            data: { attendancePoolScore: score }
        })

        revalidatePath(`/teacher/courses/${courseId}/attendance`)
        return { success: true }
    } catch (error) {
        console.error("Error updating attendance pool score:", error)
        return { error: "Failed to update attendance pool score" }
    }
}

export async function saveAttendance(
    courseId: string,
    date: Date,
    period: number,
    topic: string | null,
    records: { studentId: string, status: AttendanceStatus, excuseReason?: string | null }[],
    applyToAllSessions: boolean = false
) {
    try {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)

        // Determine which periods to update
        let periodsToUpdate = [period]

        if (applyToAllSessions) {
            const dayOfWeek = date.getDay()
            const schedules = await prisma.schedule.findMany({
                where: {
                    courseId,
                    dayOfWeek,
                    deletedAt: { isSet: false }
                },
                select: { period: true }
            })
            periodsToUpdate = schedules.map(s => s.period)
        }

        // Transactional update
        await prisma.$transaction(async (tx) => {
            for (const currentPeriod of periodsToUpdate) {
                for (const record of records) {
                    // Check if record exists
                    const existing = await tx.attendance.findFirst({
                        where: {
                            courseId,
                            studentId: record.studentId,
                            period: currentPeriod,
                            date: {
                                gte: startOfDay,
                                lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
                            },
                            deletedAt: { isSet: false }
                        }
                    })

                    if (existing) {
                        // Update
                        if (existing.status !== record.status || existing.topic !== topic || existing.excuseReason !== record.excuseReason) {
                            await tx.attendance.update({
                                where: { id: existing.id },
                                data: {
                                    status: record.status,
                                    topic: topic,
                                    excuseReason: record.excuseReason
                                }
                            })
                        }
                    } else {
                        // Create
                        await tx.attendance.create({
                            data: {
                                date: date,
                                courseId,
                                studentId: record.studentId,
                                period: currentPeriod,
                                status: record.status,
                                topic: topic,
                                excuseReason: record.excuseReason
                            }
                        })
                    }
                }
            }
        })

        revalidatePath("/teacher/attendance")
        revalidatePath(`/teacher/attendance/${courseId}`)

        return { success: true }
    } catch (error) {
        console.error("Error saving attendance:", error)
        return { error: "Failed to save attendance" }
    }
}

export async function saveAttendanceTopic(
    courseId: string,
    date: Date,
    period: number,
    topic: string,
    applyToAllSessions: boolean = false
) {
    try {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)

        // Determine which periods to update
        let periodsToUpdate = [period]

        if (applyToAllSessions) {
            const dayOfWeek = date.getDay()
            const schedules = await prisma.schedule.findMany({
                where: {
                    courseId,
                    dayOfWeek,
                    deletedAt: { isSet: false }
                },
                select: { period: true }
            })
            periodsToUpdate = schedules.map(s => s.period)
        }

        // Get all students in the course to ensure we create records for everyone if needed
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { students: { select: { id: true } } }
        })

        if (!course) return { error: "Course not found" }

        await prisma.$transaction(async (tx) => {
            for (const currentPeriod of periodsToUpdate) {
                for (const student of course.students) {
                    const existing = await tx.attendance.findFirst({
                        where: {
                            courseId,
                            studentId: student.id,
                            period: currentPeriod,
                            date: {
                                gte: startOfDay,
                                lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
                            },
                            deletedAt: { isSet: false }
                        }
                    })

                    if (existing) {
                        await tx.attendance.update({
                            where: { id: existing.id },
                            data: { topic }
                        })
                    } else {
                        // Create with default status PRESENT if record doesn't exist
                        await tx.attendance.create({
                            data: {
                                date,
                                courseId,
                                studentId: student.id,
                                period: currentPeriod,
                                status: "PENDING",
                                topic
                            }
                        })
                    }
                }
            }
        })

        revalidatePath("/teacher/attendance")
        revalidatePath(`/teacher/attendance/${courseId}`)

        return { success: true }
    } catch (error) {
        console.error("Error saving attendance topic:", error)
        return { error: "Failed to save topic" }
    }
}

export async function unskipSession(courseId: string, date: Date, period: number) {
    try {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)

        // Delete all attendance records for this session (effectively resetting to Pending)
        await prisma.attendance.deleteMany({
            where: {
                courseId,
                period,
                date: {
                    gte: startOfDay,
                    lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        })

        revalidatePath("/teacher/attendance")
        return { success: true }
    } catch (error) {
        console.error("Error unskipping session:", error)
        return { error: "Failed to unskip session" }
    }
}

export async function skipSession(courseId: string, date: Date, period: number) {
    try {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)

        // 1. Get all students in the course
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                students: { select: { id: true } }
            }
        })

        if (!course) return { error: "Course not found" }

        // 2. Create SKIPPED attendance records for all students
        await prisma.$transaction(async (tx) => {
            for (const student of course.students) {
                const existing = await tx.attendance.findFirst({
                    where: {
                        courseId,
                        studentId: student.id,
                        period,
                        date: {
                            gte: startOfDay,
                            lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
                        },
                        deletedAt: { isSet: false }
                    }
                })

                if (existing) {
                    await tx.attendance.update({
                        where: { id: existing.id },
                        data: { status: "SKIPPED", topic: "Session Skipped", excuseReason: null }
                    })
                } else {
                    await tx.attendance.create({
                        data: {
                            date,
                            courseId,
                            studentId: student.id,
                            period,
                            status: "SKIPPED",
                            topic: "Session Skipped"
                        }
                    })
                }
            }
        })

        revalidatePath("/teacher/attendance")
        return { success: true }
    } catch (error) {
        console.error("Error skipping session:", error)
        return { error: "Failed to skip session" }
    }
}

export async function skipAllSessions(teacherId: string, date: Date) {
    try {
        const { schedules, error } = await getDailySchedule(teacherId, date)

        if (error) {
            return { error, message: "Error fetching schedule" }
        }

        if (!schedules || schedules.length === 0) {
            return { success: false, message: "No class sessions found for this date." }
        }

        const pendingSchedules = schedules.filter(schedule => !schedule.isAttendanceTaken && !schedule.isSkipped)
        if (pendingSchedules.length === 0) {
            return { success: false, message: "There are no pending sessions to skip." }
        }

        let skippedCount = 0
        for (const schedule of pendingSchedules) {
            const result = await skipSession(schedule.courseId, date, schedule.period)
            if (result.success) skippedCount++
        }

        revalidatePath("/teacher/attendance")
        return { success: true, message: `Skipped ${skippedCount} pending ${skippedCount === 1 ? "session" : "sessions"}.` }
    } catch (error) {
        console.error("Error skipping pending sessions:", error)
        return { error: "Failed to skip all sessions", message: "Unexpected error occurred." }
    }
}

export async function getCourseAttendanceStats(courseId: string) {
    try {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                students: {
                    orderBy: { name: 'asc' }
                },
                class: true,
                subject: true
            }
        })

        if (!course) return { error: "Course not found" }

        // Get all attendance records for this course, excluding deleted ones
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                courseId,
                deletedAt: { isSet: false },
                status: { not: "PENDING" }
            }
        })

        // Calculate stats for each student
        const studentsStats = course.students.map(student => {
            const studentRecords = attendanceRecords.filter(r => r.studentId === student.id)

            const presentCount = studentRecords.filter(r => r.status === "PRESENT").length
            const absentCount = studentRecords.filter(r => r.status === "ABSENT").length
            const excusedCount = studentRecords.filter(r => r.status === "EXCUSED").length
            const skippedCount = studentRecords.filter(r => r.status === "SKIPPED").length

            // Total sessions considered for grading (usually excluding skipped, but let's clarify)
            // If skipped means "class didn't happen", it shouldn't count towards total.
            // If skipped means "student skipped", it's absent. 
            // Based on previous context, SKIPPED is "Session Skipped" (class didn't happen).
            const totalSessions = studentRecords.length - skippedCount

            let attendancePercentage = 0
            if (totalSessions > 0) {
                // Formula: (Present + Excused) / Total * 100 ? Or just Present?
                // Usually Excused doesn't penalize. Let's assume (Present + Excused) / Total.
                // Or maybe Excused is removed from total?
                // Let's go with: (Present + Excused) / Total * 100 for now.
                attendancePercentage = ((presentCount + excusedCount) / totalSessions) * 100
            }

            // Calculate Attendance Score
            // Formula: (Attendance% * AttendancePool) / 100
            // Wait, the user provided a complex formula for TOTAL GRADE.
            // For "Attendance Score" specifically, it's likely just the portion of the pool they earned.
            // If pool is 100, and they have 90%, they get 90 points.
            const attendanceScore = (attendancePercentage / 100) * (course.attendancePoolScore || 0)

            return {
                student,
                presentCount,
                absentCount,
                excusedCount,
                skippedCount,
                totalSessions,
                attendancePercentage: Math.round(attendancePercentage * 10) / 10, // Round to 1 decimal
                attendanceScore: Math.round(attendanceScore * 100) / 100 // Round to 2 decimals
            }
        })

        return {
            course,
            studentsStats,
            attendancePoolScore: course.attendancePoolScore
        }

    } catch (error) {
        console.error("Error fetching course attendance stats:", error)
        return { error: "Failed to fetch course attendance stats" }
    }
}
