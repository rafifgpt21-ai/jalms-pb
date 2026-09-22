import { db as prisma } from "@/lib/db"

export type ScheduleConflict = {
    courseName: string
    dayOfWeek: number
    period: number
}

/**
 * Checks if a student has a schedule conflict with a target course.
 * @param studentId The ID of the student to check.
 * @param targetCourseId The ID of the course the student is trying to enroll in.
 * @returns A conflict object if found, otherwise null.
 */
export async function checkStudentScheduleConflict(
    studentId: string,
    targetCourseId: string
): Promise<ScheduleConflict | null> {
    // 1. Get the target course's schedule
    const targetCourse = await prisma.course.findUnique({
        where: { id: targetCourseId },
        include: {
            schedules: {
                where: { deletedAt: { isSet: false } }
            },
            term: true
        }
    })

    if (!targetCourse || !targetCourse.schedules.length) {
        return null // No schedule for this course, so no conflict possible
    }

    // 2. Get the student's currently enrolled courses in the SAME term
    // We only care about conflicts within the same active term/semester
    const enrolledCourses = await prisma.course.findMany({
        where: {
            studentIds: { has: studentId },
            termId: targetCourse.termId, // Same term
            id: { not: targetCourseId }, // Exclude the target course itself
            deletedAt: { isSet: false }
        },
        include: {
            schedules: {
                where: { deletedAt: { isSet: false } }
            }
        }
    })

    // 3. Check for overlaps
    for (const targetSchedule of targetCourse.schedules) {
        for (const enrolledCourse of enrolledCourses) {
            for (const existingSchedule of enrolledCourse.schedules) {
                if (
                    targetSchedule.dayOfWeek === existingSchedule.dayOfWeek &&
                    targetSchedule.period === existingSchedule.period
                ) {
                    return {
                        courseName: enrolledCourse.name,
                        dayOfWeek: targetSchedule.dayOfWeek,
                        period: targetSchedule.period
                    }
                }
            }
        }
    }

    return null
}

/**
 * Checks if updating a course's schedule will create conflicts for any enrolled students.
 * @param courseId The ID of the course being updated.
 * @param newSchedules The proposed new schedule slots.
 * @returns A list of conflicts, where each item contains the student name and the conflicting details.
 */
export async function checkCourseScheduleUpdateConflict(
    courseId: string,
    newSchedules: { day: number; period: number }[]
): Promise<{ studentName: string; conflict: ScheduleConflict }[]> {
    // 1. Get the course and its enrolled students
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
            termId: true,
            students: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    })

    if (!course || course.students.length === 0) {
        return []
    }

    const conflicts: { studentName: string; conflict: ScheduleConflict }[] = []

    // 2. For each student, check against their OTHER courses
    NextStudent: for (const student of course.students) {
        // Fetch other courses this student is enrolled in for the same term
        const otherCourses = await prisma.course.findMany({
            where: {
                studentIds: { has: student.id },
                termId: course.termId,
                id: { not: courseId },
                deletedAt: { isSet: false }
            },
            include: {
                schedules: {
                    where: { deletedAt: { isSet: false } }
                }
            }
        })

        // Check each new schedule slot against existing schedules
        for (const newSlot of newSchedules) {
            for (const otherCourse of otherCourses) {
                for (const existingSchedule of otherCourse.schedules) {
                    if (
                        newSlot.day === existingSchedule.dayOfWeek &&
                        newSlot.period === existingSchedule.period
                    ) {
                        conflicts.push({
                            studentName: student.name,
                            conflict: {
                                courseName: otherCourse.name,
                                dayOfWeek: newSlot.day,
                                period: newSlot.period
                            }
                        })
                        // Break inner loops to avoid reporting multiple conflicts for the same student
                        continue NextStudent
                    }
                }
            }
        }
    }

    return conflicts
}
