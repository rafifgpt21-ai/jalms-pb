"use server"

import { db as prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { getUser } from "@/lib/actions/user.actions"
import { revalidatePath } from "next/cache"

import { unlink } from "fs/promises"
import path from "path"

export async function getStudentCourses(explicitStudentId?: string) {
    try {
        let studentId = explicitStudentId
        if (!studentId) {
            const user = await getUser()
            if (!user) return { error: "Unauthorized" }
            studentId = user.id
        }

        const courses = await prisma.course.findMany({
            where: {
                OR: [
                    { studentIds: { has: studentId } },
                    { courseEnrollments: { some: { studentId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] } } }
                ],
                deletedAt: { isSet: false },
                term: { isActive: true }
            },
            include: {
                teacher: true,
                term: true,
                subject: true,
                class: true,
                assignments: {
                    where: {
                        deletedAt: { isSet: false },
                        OR: [
                            { status: { isSet: false } },
                            { status: null },
                            { status: { not: "ARCHIVED" } }
                        ],
                        dueDate: { gte: new Date() }
                    },
                    select: { id: true }
                },
                materialAssignments: {
                    where: { material: { deletedAt: { isSet: false } } },
                    select: { id: true }
                },
                _count: {
                    select: {
                        assignments: {
                            where: {
                                deletedAt: { isSet: false },
                                OR: [
                                    { status: { isSet: false } },
                                    { status: null },
                                    { status: { not: "ARCHIVED" } }
                                ]
                            }
                        }
                    }
                }
            },
            orderBy: {
                name: "asc"
            }
        })

        return { courses }
    } catch (error) {
        console.error("Error fetching student courses:", error)
        return { error: "Failed to fetch courses" }
    }
}

export async function getStudentSchedule(explicitStudentId?: string) {
    try {
        let studentId = explicitStudentId
        if (!studentId) {
            const user = await getUser()
            if (!user) return { error: "Unauthorized" }
            studentId = user.id
        }

        const today = new Date()
        const dayOfWeek = today.getDay()
        const startOfDay = new Date(today)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(today)
        endOfDay.setHours(23, 59, 59, 999)

        const schedule = await prisma.schedule.findMany({
            where: {
                dayOfWeek,
                course: {
                    studentIds: { has: studentId },
                    term: { isActive: true },
                    deletedAt: { isSet: false }
                },
                deletedAt: { isSet: false }
            },
            include: {
                course: {
                    include: { teacher: true, subject: true }
                }
            },
            orderBy: {
                period: 'asc'
            }
        })

        // Enrich with attendance
        const courseIds = schedule.map(s => s.courseId)
        let attendanceTopics: { topic: string | null, status: string, courseId: string, period: number }[] = []

        if (courseIds.length > 0) {
            attendanceTopics = await prisma.attendance.findMany({
                where: {
                    courseId: { in: courseIds },
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    deletedAt: { isSet: false }
                },
                select: { topic: true, status: true, courseId: true, period: true }
            })
        }

        const filteredSchedule = schedule.map(slot => {
            const attendance = attendanceTopics.find(a =>
                a.courseId === slot.courseId && a.period === slot.period
            )
            return {
                ...slot,
                topic: attendance?.topic || null,
                isSkipped: attendance?.status === "SKIPPED"
            }
        }).filter(slot => !slot.isSkipped)

        return { schedule: filteredSchedule }

    } catch (error) {
        console.error("Error fetching student schedule:", error)
        return { error: "Failed to fetch schedule" }
    }
}

export async function getStudentAssignments(explicitStudentId?: string) {
    try {
        let studentId = explicitStudentId
        if (!studentId) {
            const user = await getUser()
            if (!user) return { error: "Unauthorized" }
            studentId = user.id
        }

        // Bound the dashboard query so years of historical work cannot delay the first render.
        const allAssignments = await prisma.assignment.findMany({
            where: {
                course: {
                    studentIds: { has: studentId },
                    term: { isActive: true },
                    deletedAt: { isSet: false }
                },
                deletedAt: { isSet: false },
                type: { in: ["SUBMISSION", "QUIZ"] }
            },
            orderBy: { dueDate: "desc" },
            take: 40,
            select: {
                id: true,
                courseId: true,
                title: true,
                dueDate: true,
                course: {
                    select: {
                        name: true,
                        reportName: true,
                        subject: { select: { name: true, reportName: true } }
                    }
                },
                submissions: {
                    where: {
                        studentId,
                        deletedAt: { isSet: false }
                    },
                    select: { id: true, submittedAt: true }
                }
            }
        })

        // Process Upcoming Deadlines in Memory
        const now = new Date()
        const upcomingDeadlines = allAssignments.filter(assignment => {
            if (!assignment.dueDate) return false

            // Allow if due in future
            if (assignment.dueDate >= now) return true

            // Allow if Overdue AND Not Submitted
            const isSubmitted = assignment.submissions.length > 0
            if (assignment.dueDate < now && !isSubmitted) return true

            return false
        }).sort((a, b) => {
            // Sort by due date ascending
            if (!a.dueDate || !b.dueDate) return 0
            return a.dueDate.getTime() - b.dueDate.getTime()
        }).slice(0, 5)

        return { upcomingDeadlines }

    } catch (error) {
        console.error("Error fetching student assignments:", error)
        return { error: "Failed to fetch assignments" }
    }
}

export async function getRecentGrades(explicitStudentId?: string) {
    try {
        let studentId = explicitStudentId
        if (!studentId) {
            const user = await getUser()
            if (!user) return { error: "Unauthorized" }
            studentId = user.id
        }

        const recentGrades = await prisma.submission.findMany({
            where: {
                studentId,
                grade: { not: null },
                deletedAt: { isSet: false }
            },
            take: 5,
            orderBy: { submittedAt: 'desc' },
            include: {
                assignment: {
                    include: {
                        course: {
                            include: { subject: true }
                        }
                    }
                }
            }
        })

        return { recentGrades }

    } catch (error) {
        console.error("Error fetching recent grades:", error)
        return { error: "Failed to fetch recent grades" }
    }
}

export async function getStudentDashboardStats() {
    try {
        const user = await getUser()
        if (!user) return { error: "Unauthorized" }
        const [scheduleRes, assignmentsRes, gradesRes] = await Promise.all([
            getStudentSchedule(user.id),
            getStudentAssignments(user.id),
            getRecentGrades(user.id)
        ])

        if (scheduleRes.error || assignmentsRes.error || gradesRes.error) {
            return { error: "Failed to fetch dashboard stats" }
        }

        return {
            schedule: scheduleRes.schedule!,
            upcomingDeadlines: assignmentsRes.upcomingDeadlines!,
            recentGrades: gradesRes.recentGrades!
        }
    } catch (error) {
        console.error("Error fetching student dashboard stats:", error)
        return { error: "Failed to fetch dashboard stats" }
    }
}

export async function getStudentSemesters(explicitStudentId?: string) {
    try {
        let studentId = explicitStudentId
        if (!studentId) {
            const user = await getUser()
            if (!user) return { error: "Unauthorized" }
            studentId = user.id
        }

        const terms = await prisma.term.findMany({
            where: {
                courses: {
                    some: {
                        OR: [
                            { studentIds: { has: studentId } },
                            { courseEnrollments: { some: { studentId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] } } }
                        ],
                        deletedAt: { isSet: false }
                    }
                },
                deletedAt: { isSet: false }
            },
            include: {
                academicYear: true
            },
            orderBy: {
                startDate: 'desc'
            }
        })

        return { semesters: terms }
    } catch (error) {
        console.error("Error fetching student semesters:", error)
        return { error: "Failed to fetch semesters" }
    }
}

export async function getStudentGrades(termId?: string, explicitStudentId?: string) {
    try {
        let studentId = explicitStudentId
        if (!studentId) {
            const user = await getUser()
            if (!user) return { error: "Unauthorized" }
            studentId = user.id
        }

        const whereClause: Prisma.CourseWhereInput = {
            OR: [
                { studentIds: { has: studentId } },
                { courseEnrollments: { some: { studentId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] } } }
            ],
            deletedAt: { isSet: false }
        }

        if (termId && termId !== 'all') {
            whereClause.termId = termId
        } else if (termId === 'all') {
            // No term filter, fetch all
        } else {
            whereClause.term = { isActive: true }
        }

        const courses = await prisma.course.findMany({
            where: whereClause,
            include: {
                teacher: true,
                assignments: {
                    where: { deletedAt: { isSet: false } },
                    include: {
                        submissions: {
                            where: { studentId, deletedAt: { isSet: false } }
                        }
                    }
                },
                attendances: {
                    where: { studentId, deletedAt: { isSet: false } }
                },
                subject: true
            }
        })

        const grades = courses.map(course => {
            // 1. Calculate Attendance %
            // Count Present and Excused as "Attended"
            // Exclude SKIPPED from total sessions if we treat it as "Class Cancelled"
            // But if SKIPPED is "Student Skipped", it should count as absent.
            // Let's assume SKIPPED is "Student Skipped" (Absent) for now based on typical usage, 
            // OR if it means "Excused/Exempt", it shouldn't count. 
            // Teacher gradebook logic: totalSessions = filter(a => a.status !== "SKIPPED").length
            // So SKIPPED is excluded from denominator.

            const totalSessions = course.attendances.filter(a => a.status !== "SKIPPED").length
            const attendedCount = course.attendances.filter(a =>
                a.status === "PRESENT" || a.status === "EXCUSED"
            ).length

            const attendancePercentage = totalSessions > 0 ? (attendedCount / totalSessions) : 1

            // 2. Calculate Points
            let studentPoints = 0
            let maxPointsPossible = 0
            let extraCreditPoints = 0

            course.assignments.forEach(assignment => {
                const submission = assignment.submissions[0] // Should be only one per student

                if (!assignment.isExtraCredit) {
                    maxPointsPossible += assignment.maxPoints
                }

                if (submission && submission.grade !== null) {
                    let actualPoints = (submission.grade / 100) * assignment.maxPoints

                    // Late Penalty
                    const isLate = assignment.dueDate && submission.submittedAt > assignment.dueDate
                    if (isLate && assignment.latePenalty > 0) {
                        const penaltyAmount = actualPoints * (assignment.latePenalty / 100)
                        actualPoints -= penaltyAmount
                    }

                    if (assignment.isExtraCredit) {
                        extraCreditPoints += Math.round(actualPoints)
                    } else {
                        studentPoints += Math.round(actualPoints)
                    }
                }
            })

            // 3. Apply Formula
            const attendancePool = course.attendancePoolScore || 0
            const attendanceScore = attendancePercentage * attendancePool

            const numerator = studentPoints + extraCreditPoints + attendanceScore
            const denominator = maxPointsPossible + attendancePool

            let totalScore = 0
            if (denominator > 0) {
                totalScore = (numerator / denominator) * 100
            } else {
                // If no assignments and no attendance pool, start at 100? Or 0?
                // Usually 100 if nothing to grade yet.
                totalScore = 100
            }

            totalScore = Math.min(totalScore, 100)

            return {
                courseId: course.id,
                courseName: course.subject?.reportName || course.reportName || course.name,
                teacherName: course.teacher.name,
                grade: Math.round(totalScore),
                attendancePercentage: Math.round(attendancePercentage * 100),
                breakdown: {
                    studentPoints,
                    maxPointsPossible,
                    attendanceScore,
                    extraCreditPoints,
                    attendancePool
                }
            }
        })

        return { grades }

    } catch (error) {
        console.error("Error fetching student grades:", error)
        return { error: "Failed to fetch grades" }
    }
}

export async function getStudentGradeHistory(explicitStudentId?: string) {
    try {
        let studentId = explicitStudentId
        if (!studentId) {
            const user = await getUser()
            if (!user) return { error: "Unauthorized" }
            studentId = user.id
        }

        const courses = await prisma.course.findMany({
            where: {
                OR: [
                    { studentIds: { has: studentId } },
                    { courseEnrollments: { some: { studentId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] } } }
                ],
                deletedAt: { isSet: false }
            },
            include: {
                term: {
                    include: { academicYear: true }
                },
                assignments: {
                    where: { deletedAt: { isSet: false } },
                    include: {
                        submissions: {
                            where: { studentId, deletedAt: { isSet: false } }
                        }
                    }
                },
                attendances: {
                    where: { studentId, deletedAt: { isSet: false } }
                }
            },
            orderBy: {
                term: { startDate: 'asc' }
            }
        })

        type GradeHistoryTerm = (typeof courses)[number]["term"]
        const termGroups = new Map<string, { term: GradeHistoryTerm, grades: number[] }>()

        for (const course of courses) {
            // Calculate Grade (Logic duplicated from getStudentGrades for now)
            const totalSessions = course.attendances.filter(a => a.status !== "SKIPPED").length
            const attendedCount = course.attendances.filter(a =>
                a.status === "PRESENT" || a.status === "EXCUSED"
            ).length
            const attendancePercentage = totalSessions > 0 ? (attendedCount / totalSessions) : 1

            let studentPoints = 0
            let maxPointsPossible = 0
            let extraCreditPoints = 0

            course.assignments.forEach(assignment => {
                const submission = assignment.submissions[0]
                if (!assignment.isExtraCredit) maxPointsPossible += assignment.maxPoints
                if (submission && submission.grade !== null) {
                    let actualPoints = (submission.grade / 100) * assignment.maxPoints
                    const isLate = assignment.dueDate && submission.submittedAt > assignment.dueDate
                    if (isLate && assignment.latePenalty > 0) {
                        actualPoints -= actualPoints * (assignment.latePenalty / 100)
                    }
                    if (assignment.isExtraCredit) extraCreditPoints += Math.round(actualPoints)
                    else studentPoints += Math.round(actualPoints)
                }
            })

            const attendancePool = course.attendancePoolScore || 0
            const attendanceScore = attendancePercentage * attendancePool
            const numerator = studentPoints + extraCreditPoints + attendanceScore
            const denominator = maxPointsPossible + attendancePool
            let totalScore = denominator > 0 ? (numerator / denominator) * 100 : 100
            totalScore = Math.min(totalScore, 100)

            if (!termGroups.has(course.termId)) {
                termGroups.set(course.termId, { term: course.term, grades: [] })
            }
            termGroups.get(course.termId)?.grades.push(totalScore)
        }

        const history = Array.from(termGroups.values()).map(({ term, grades }) => {
            const average = grades.reduce((a, b) => a + b, 0) / grades.length
            const name = `${term.academicYear.name} ${term.type}`
            return {
                termId: term.id,
                name: name,
                average: Math.round(average)
            }
        })

        return { history }
    } catch (error) {
        console.error("Error fetching student grade history:", error)
        return { error: "Failed to fetch grade history" }
    }
}

export async function submitAssignment(assignmentId: string, content: string, attachmentUrl?: string, link?: string) {
    try {
        const user = await getUser()
        if (!user || !user.id) return { error: "Unauthorized" }

        // Check if assignment exists and is open
        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId }
        })

        if (!assignment) return { error: "Assignment not found" }

        // Check if already submitted?
        const existing = await prisma.submission.findFirst({
            where: {
                assignmentId,
                studentId: user.id,
                deletedAt: { isSet: false }
            }
        })

        if (existing) {
            // Update existing submission
            const updateData: Prisma.SubmissionUncheckedUpdateInput = {
                submittedAt: new Date(),
                submissionUrl: content,
                link: link || null
            }

            if (attachmentUrl !== undefined) {
                // Check if we need to delete old file (if replacing)
                if (existing.attachmentUrl && existing.attachmentUrl !== attachmentUrl) {
                    console.log("Replacing file. Old:", existing.attachmentUrl, "New:", attachmentUrl)
                    if (existing.attachmentUrl.startsWith("/api/files/")) {
                        // Local deletion - Fire and forget
                        const relativePath = existing.attachmentUrl.replace(/^\/api\/files\//, "")
                        const fullPath = path.join(process.cwd(), "uploads", relativePath)
                        unlink(fullPath).catch((err) => {
                            console.log("Bg unlink failed:", err)
                        })
                    }
                }
                updateData.attachmentUrl = attachmentUrl
            }

            await prisma.submission.update({
                where: { id: existing.id },
                data: updateData
            })

        } else {
            await prisma.submission.create({
                data: {
                    assignmentId,
                    studentId: user.id,
                    submittedAt: new Date(),
                    submissionUrl: content,
                    link: link || null,
                    attachmentUrl: attachmentUrl || null
                }
            })
        }

        revalidatePath("/student/dashboard")
        return { success: true }
    } catch (error) {
        console.error("Error submitting assignment:", error)
        return { error: "Failed to submit assignment" }
    }
}

export async function deleteSubmissionFile(assignmentId: string, fileUrl: string) {
    try {
        console.log("deleteSubmissionFile called for:", fileUrl)
        const user = await getUser()
        if (!user || !user.id) return { error: "Unauthorized" }

        // 1. Try to remove from DB if it exists there
        const existing = await prisma.submission.findFirst({
            where: {
                assignmentId,
                studentId: user.id,
                deletedAt: { isSet: false }
            }
        })

        if (existing && existing.attachmentUrl === fileUrl) {
            await prisma.submission.update({
                where: { id: existing.id },
                data: { attachmentUrl: null }
            })
        }

        // 2. Delete from Storage
        if (fileUrl.startsWith("/api/files/")) {
            // Local file deletion
            try {
                const relativePath = fileUrl.replace(/^\/api\/files\//, "")
                const fullPath = path.join(process.cwd(), "uploads", relativePath)
                console.log("Unlinking local file:", fullPath)
                await unlink(fullPath).catch((err) => { console.log("Local unlink fail:", err) })
            } catch (fsError) {
                console.error("Error deleting local file:", fsError)
            }
        } else {
            console.log("Unknown file format for delete:", fileUrl)
        }


        return { success: true }
    } catch (error) {
        console.error("Error deleting submission file:", error)
        return { error: "Failed to delete file" }
    }
}

export async function submitQuizAttempt(assignmentId: string, answers: Record<string, string | string[]>) {
    try {
        const user = await getUser()
        if (!user || !user.id) return { error: "Unauthorized" }

        // Start transaction for consistency
        const result = await prisma.$transaction(async (tx) => {

            // 1. Fetch Assignment and Quiz with Correct Answers
            const assignment = await tx.assignment.findUnique({
                where: { id: assignmentId },
                include: {
                    quiz: {
                        include: {
                            questions: {
                                include: {
                                    choices: true
                                }
                            }
                        }
                    }
                }
            })

            if (!assignment || !assignment.quiz) throw new Error("Quiz not found")

            // 2. Calculate Score
            let totalMaxPoints = 0
            let studentTotalPoints = 0

            // If no questions, score is 0 or 100? Assume 100 if empty? Using 0 safer.
            if (assignment.quiz.questions.length === 0) return { success: true, grade: 100 }

            for (const q of assignment.quiz.questions) {
                const questionPoints = q.points || 1
                totalMaxPoints += questionPoints

                const correctChoices = q.choices.filter(c => c.isCorrect)
                const correctChoiceIds = new Set(correctChoices.map(c => c.id))

                // Get student answer(s) for this question
                // Input 'answers' value can be string (single) or string[] (multiple, json-parsed if needed?)
                // The client sends Record<string, string | string[]> but here we receive it. 
                // Let's assume the input type is handled, but we need to normalize it.
                // We'll treat all inputs as array of IDs to be safe.

                let studentSelectedIds: string[] = []
                const rawAnswer = answers[q.id]

                if (Array.isArray(rawAnswer)) {
                    studentSelectedIds = rawAnswer
                } else if (typeof rawAnswer === 'string') {
                    // It might be a single ID or a JSON string if multiple? 
                    // Let's assume frontend sends array if multiple allowed, 
                    // but for compatibility with existing single-choice radio:
                    studentSelectedIds = [rawAnswer]
                }

                studentSelectedIds = studentSelectedIds.filter(Boolean) // remove null/undefined/empty

                // Grading Logic
                if (q.gradingType === 'RIGHT_MINUS_WRONG') {
                    // Partial Credit
                    let correctSelected = 0
                    let incorrectSelected = 0

                    studentSelectedIds.forEach(id => {
                        if (correctChoiceIds.has(id)) {
                            correctSelected++
                        } else {
                            incorrectSelected++
                        }
                    })

                    const totalCorrectOptions = correctChoiceIds.size

                    // Prevent division by zero if question has NO correct answers set (teacher error)
                    if (totalCorrectOptions > 0) {
                        const ratio = (correctSelected - incorrectSelected) / totalCorrectOptions
                        // Points cannot be negative
                        const earnedPoints = Math.max(0, ratio * questionPoints)
                        studentTotalPoints += earnedPoints
                    } else {
                        // If no correct options exist, usually full points or zero?
                        // Let's give zero to be safe, or full if they selected nothing?
                        if (studentSelectedIds.length === 0) {
                            // effectively correct to select nothing? No, let's just ignore.
                        }
                    }

                } else {
                    // ALL_OR_NOTHING (Default)
                    // Must select ALL correct IDs and NO incorrect IDs.
                    // Set equality check.

                    const selectedSet = new Set(studentSelectedIds)

                    // 1. Check size match
                    if (selectedSet.size === correctChoiceIds.size) {
                        // 2. Check every selected is correct
                        const isAllCorrect = studentSelectedIds.every(id => correctChoiceIds.has(id))
                        if (isAllCorrect) {
                            studentTotalPoints += questionPoints
                        }
                    }
                }
            }

            const finalScorePercentage = totalMaxPoints > 0
                ? (studentTotalPoints / totalMaxPoints) * 100
                : 0 // or 100?

            const roundedScore = Math.round(finalScorePercentage) // integer

            // 3. Save Submission
            const existing = await tx.submission.findFirst({
                where: {
                    assignmentId,
                    studentId: user.id,
                    deletedAt: { isSet: false }
                }
            })

            const submissionData = {
                grade: roundedScore,
                submittedAt: new Date(),
                submissionUrl: JSON.stringify(answers), // Store raw answers
            }

            if (existing) {
                await tx.submission.update({
                    where: { id: existing.id },
                    data: submissionData
                })
            } else {
                await tx.submission.create({
                    data: {
                        assignmentId,
                        studentId: user.id!,
                        ...submissionData
                    }
                })
            }

            return { success: true, grade: roundedScore }
        })

        if (!result) return { error: "Transaction failed" }
        revalidatePath(`/student/courses/${assignmentId}/tasks`) // simplified path invalidation
        return result

    } catch (error: unknown) {
        console.error("Error submitting quiz:", error)
        return { error: error instanceof Error ? error.message : "Failed to submit quiz" }
    }
}
