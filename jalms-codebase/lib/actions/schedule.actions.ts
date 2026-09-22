"use server"

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getTeacherSchedule(teacherId: string) {
    try {
        // Fetch all courses taught by this teacher in active semesters
        const courses = await prisma.course.findMany({
            where: {
                teacherId,
                deletedAt: { isSet: false },
                term: { isActive: true }
            },
            include: {
                schedules: {
                    where: { deletedAt: { isSet: false } }
                },
                class: true,
                subject: true,
                term: { include: { academicYear: true } }
            }
        })

        return { courses }
    } catch (error) {
        console.error("Error fetching teacher schedule:", error)
        return { error: "Failed to fetch schedule" }
    }
}

export async function getTeacherWeeklySchedule(teacherId: string) {
    try {
        const courses = await prisma.course.findMany({
            where: {
                teacherId,
                deletedAt: { isSet: false },
                term: { isActive: true }
            },
            select: {
                id: true,
                name: true,
                reportName: true,
                schedules: {
                    where: { deletedAt: { isSet: false } },
                    select: { id: true, dayOfWeek: true, period: true }
                },
                class: { select: { name: true, color: true } },
                subject: { select: { name: true, reportName: true, code: true } }
            },
            orderBy: { name: "asc" }
        })

        return { courses }
    } catch (error) {
        console.error("Error fetching teacher weekly schedule:", error)
        return { error: "Failed to fetch weekly schedule" }
    }
}

export async function updateSchedule(
    teacherId: string,
    dayOfWeek: number,
    period: number,
    courseId: string | null // null to remove
) {
    try {
        // Find existing schedule at this slot for this teacher
        const existingSchedule = await prisma.schedule.findFirst({
            where: {
                dayOfWeek,
                period,
                course: {
                    teacherId,
                    term: { isActive: true } // Only check active semester courses
                },
                deletedAt: { isSet: false }
            }
        })

        if (courseId) {
            // Assigning a course

            // Check for conflicts with enrolled students
            const { checkCourseScheduleUpdateConflict } = await import("@/lib/helpers/schedule-conflict")
            const conflicts = await checkCourseScheduleUpdateConflict(courseId, [{ day: dayOfWeek, period }])

            if (conflicts.length > 0) {
                const conflictEvents = conflicts.map(c => ({
                    studentName: c.studentName,
                    courseName: c.conflict.courseName,
                    day: c.conflict.dayOfWeek,
                    period: c.conflict.period
                }))

                return {
                    error: "Schedule conflict detected",
                    conflictEvents
                }
            }

            if (existingSchedule) {
                // Update existing
                await prisma.schedule.update({
                    where: { id: existingSchedule.id },
                    data: { courseId }
                })
            } else {
                // Create new
                await prisma.schedule.create({
                    data: {
                        dayOfWeek,
                        period,
                        courseId
                    }
                })
            }
        } else {
            // Removing schedule
            if (existingSchedule) {
                await prisma.schedule.update({
                    where: { id: existingSchedule.id },
                    data: { deletedAt: new Date() }
                })
            }
        }

        revalidatePath("/admin/schedule")
        revalidatePath("/admin/schedule/overview")
        return { success: true }
    } catch (error) {
        console.error("Error updating schedule:", error)
        return { error: "Failed to update schedule" }
    }
}

export async function saveTeacherSchedule(
    teacherId: string,
    schedules: { day: number; period: number; courseId: string }[]
) {
    try {
        // 1. Get all active courses for this teacher to identify the scope
        const activeCourses = await prisma.course.findMany({
            where: {
                teacherId,
                term: { isActive: true },
                deletedAt: { isSet: false }
            },
            select: { id: true }
        })

        const activeCourseIds = activeCourses.map(c => c.id)

        // 2. Get all existing schedules for these courses
        // 2. Get all existing schedules for these courses
        const existingSchedules = await prisma.schedule.findMany({
            where: {
                courseId: { in: activeCourseIds },
                deletedAt: { isSet: false }
            }
        })

        // Check for conflicts for all new schedules
        const { checkCourseScheduleUpdateConflict } = await import("@/lib/helpers/schedule-conflict")

        // Group by courseId to batch checks
        const schedulesByCourse = new Map<string, { day: number, period: number }[]>()
        schedules.forEach(s => {
            if (!schedulesByCourse.has(s.courseId)) {
                schedulesByCourse.set(s.courseId, [])
            }
            schedulesByCourse.get(s.courseId)!.push({ day: s.day, period: s.period })
        })


        // Defined explicit type for conflict collection
        const conflicts: { studentName: string; courseName: string; day: number; period: number }[] = []
        for (const [courseId, slots] of schedulesByCourse.entries()) {
            const courseConflicts = await checkCourseScheduleUpdateConflict(courseId, slots)
            if (courseConflicts.length > 0) {
                // Return every conflict so the UI can present the complete result.
                courseConflicts.forEach(c => {
                    conflicts.push({
                        studentName: c.studentName,
                        courseName: c.conflict.courseName,
                        day: c.conflict.dayOfWeek,
                        period: c.conflict.period
                    })
                })
            }
        }

        if (conflicts.length > 0) {
            return {
                error: "Schedule conflicts detected",
                conflictEvents: conflicts
            }
        }

        // 3. Process updates
        // We will iterate through all possible slots (or just the ones involved)
        // But simpler: 
        // - For each new schedule item: upsert (or find match and update)
        // - For each existing schedule item: if not in new list, delete

        // Map new schedules for easy lookup: `${day}-${period}` -> courseId
        const newScheduleMap = new Map<string, string>()
        schedules.forEach(s => newScheduleMap.set(`${s.day}-${s.period}`, s.courseId))

        // Transactional updates would be ideal, but Prisma Mongo doesn't support nested writes easily here across many rows.
        // We'll do it in parallel promises.

        const promises: Promise<any>[] = []

        // Handle removals and updates of existing
        for (const existing of existingSchedules) {
            const key = `${existing.dayOfWeek}-${existing.period}`
            if (newScheduleMap.has(key)) {
                const newCourseId = newScheduleMap.get(key)!
                if (existing.courseId !== newCourseId) {
                    // Update course
                    promises.push(
                        prisma.schedule.update({
                            where: { id: existing.id },
                            data: { courseId: newCourseId }
                        })
                    )
                }
                // Remove from map so we know it's handled
                newScheduleMap.delete(key)
            } else {
                // Not in new list -> Delete
                promises.push(
                    prisma.schedule.update({
                        where: { id: existing.id },
                        data: { deletedAt: new Date() }
                    })
                )
            }
        }

        // Handle creations (remaining items in map)
        for (const [key, courseId] of newScheduleMap.entries()) {
            const [day, period] = key.split('-').map(Number)
            promises.push(
                prisma.schedule.create({
                    data: {
                        dayOfWeek: day,
                        period,
                        courseId
                    }
                })
            )
        }

        await Promise.all(promises)

        revalidatePath("/admin/schedule")
        revalidatePath("/admin/schedule/overview")
        revalidatePath(`/admin/schedule/${teacherId}`)

        return { success: true }
    } catch (error) {
        console.error("Error saving teacher schedule:", error)
        return { error: "Failed to save schedule" }
    }
}

export async function getConflictingCourses(teacherId: string, day: number, period: number) {
    try {
        // 1. Get all active courses for this teacher
        const courses = await prisma.course.findMany({
            where: {
                teacherId,
                term: { isActive: true },
                deletedAt: { isSet: false }
            },
            select: { id: true }
        })

        const conflictingCourseIds: string[] = []
        const { checkCourseScheduleUpdateConflict } = await import("@/lib/helpers/schedule-conflict")

        // 2. Check each course for conflicts at this slot
        // This might be heavy if many courses, but usually a teacher has < 10 active courses.
        // We can run in parallel.
        await Promise.all(courses.map(async (course) => {
            const conflicts = await checkCourseScheduleUpdateConflict(course.id, [{ day, period }])
            if (conflicts.length > 0) {
                conflictingCourseIds.push(course.id)
            }
        }))

        return { conflictingCourseIds }
    } catch (error) {
        console.error("Error checking conflicting courses:", error)
        return { error: "Failed to check conflicts", conflictingCourseIds: [] }
    }
}

export async function getMasterSchedule() {
    try {
        const schedules = await prisma.schedule.findMany({
            where: {
                deletedAt: { isSet: false },
                course: {
                    term: { isActive: true },
                    deletedAt: { isSet: false }
                }
            },
            include: {
                course: {
                    include: {
                        teacher: {
                            select: {
                                id: true,
                                name: true,
                                nickname: true,
                                image: true
                            }
                        },
                        class: true,
                        subject: true
                    }
                }
            }
        })

        return { schedules }
    } catch (error) {
        console.error("Error fetching master schedule:", error)
        return { error: "Failed to fetch master schedule" }
    }
}

export async function getStudentSchedule(studentId: string) {
    try {
        const courses = await prisma.course.findMany({
            where: {
                OR: [
                    { studentIds: { has: studentId } },
                    { courseEnrollments: { some: { studentId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] } } }
                ],
                deletedAt: { isSet: false },
                term: { isActive: true }
            },
            select: {
                id: true,
                name: true,
                reportName: true,
                schedules: {
                    where: { deletedAt: { isSet: false } },
                    select: { id: true, dayOfWeek: true, period: true }
                },
                teacher: {
                    select: {
                        name: true,
                        nickname: true
                    }
                },
                subject: { select: { reportName: true, code: true } },
                class: { select: { name: true, color: true } }
            },
            orderBy: { name: "asc" }
        })

        return { courses }
    } catch (error) {
        console.error("Error fetching student schedule:", error)
        return { error: "Failed to fetch schedule" }
    }
}
