import { AcademicDomain, PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function assertMinimum(label: string, actual: number, minimum: number) {
    if (actual < minimum) throw new Error(`${label}: expected at least ${minimum}, received ${actual}`)
}

async function main() {
    const teacher = await prisma.user.findUnique({ where: { email: "guru@demo.jalms.id" } })
    const student = await prisma.user.findUnique({ where: { email: "siswa@demo.jalms.id" } })
    if (!teacher || !student) throw new Error("Focus demo accounts were not found")

    const activeCourses = await prisma.course.findMany({
        where: { studentIds: { has: student.id }, term: { isActive: true }, deletedAt: { isSet: false } },
        include: {
            assignments: { where: { deletedAt: { isSet: false } }, include: { submissions: { where: { studentId: student.id, deletedAt: { isSet: false } } } } },
            attendances: { where: { studentId: student.id, deletedAt: { isSet: false } }, select: { status: true } },
            materialAssignments: true,
            announcements: { where: { deletedAt: { isSet: false } } },
            chatMessages: { select: { id: true } },
            subject: { select: { academicDomains: true } },
        },
    })
    const teacherCourses = await prisma.course.findMany({ where: { teacherId: teacher.id, term: { isActive: true }, deletedAt: { isSet: false } } })
    const classEnrollment = await prisma.enrollment.findFirst({ where: { studentId: student.id, class: { term: { isActive: true } } }, include: { class: { include: { students: true } } } })
    const reportCards = await prisma.reportCard.count({ where: { studentId: student.id } })
    const quizzes = await prisma.quiz.count({ where: { teacherId: teacher.id, deletedAt: { isSet: false } } })
    const teacherMaterials = await prisma.material.count({ where: { teacherId: teacher.id, deletedAt: { isSet: false } } })
    const todaySchedules = await prisma.schedule.count({ where: { dayOfWeek: new Date().getDay(), course: { teacherId: teacher.id, term: { isActive: true } }, deletedAt: { isSet: false } } })
    const draftAnnouncements = await prisma.courseAnnouncement.count({ where: { authorId: teacher.id, status: "DRAFT", deletedAt: { isSet: false } } })
    const demoQuiz = await prisma.quiz.findFirst({
        where: { teacherId: teacher.id, title: "Kuis Formatif 2 — Sistem Pernapasan Manusia", deletedAt: { isSet: false } },
        include: {
            questions: { include: { choices: true } },
            assignments: { include: { submissions: { where: { studentId: student.id, deletedAt: { isSet: false } } } } },
        },
    })

    const assignments = activeCourses.flatMap((course) => course.assignments)
    const missing = assignments.filter((assignment) => assignment.dueDate < new Date() && assignment.submissions.length === 0)
    const upcoming = assignments.filter((assignment) => assignment.dueDate >= new Date() && assignment.submissions.length === 0)
    const late = assignments.flatMap((assignment) => assignment.submissions.filter((submission) => submission.submittedAt > assignment.dueDate))
    const domains = new Set(activeCourses.flatMap((course) => course.subject?.academicDomains ?? []))

    const totals = {
        activeCourses: activeCourses.length,
        activeAssignments: assignments.length,
        gradedSubmissions: assignments.flatMap((assignment) => assignment.submissions).filter((submission) => submission.grade !== null).length,
        writtenSubmissions: assignments.flatMap((assignment) => assignment.submissions).filter((submission) => Boolean(submission.submissionUrl)).length,
        missingWork: missing.length,
        upcomingWork: upcoming.length,
        lateSubmissions: late.length,
        attendanceRecords: activeCourses.reduce((sum, course) => sum + course.attendances.length, 0),
        assignedMaterials: activeCourses.reduce((sum, course) => sum + course.materialAssignments.length, 0),
        announcements: activeCourses.reduce((sum, course) => sum + course.announcements.length, 0),
        chatMessages: activeCourses.reduce((sum, course) => sum + course.chatMessages.length, 0),
        learningDomains: domains.size,
        classmates: classEnrollment?.class.students.length ?? 0,
        teacherCourses: teacherCourses.length,
        teacherQuizzes: quizzes,
        teacherMaterials,
        teacherClassesToday: todaySchedules,
        teacherDrafts: draftAnnouncements,
        reportCards,
        demoQuizQuestions: demoQuiz?.questions.length ?? 0,
        pendingDemoQuizzes: demoQuiz?.assignments.filter((assignment) => assignment.dueDate > new Date() && assignment.submissions.length === 0).length ?? 0,
    }

    if (totals.activeCourses !== 8) throw new Error(`activeCourses: expected 8, received ${totals.activeCourses}`)
    if (totals.classmates !== 24) throw new Error(`classmates: expected 24, received ${totals.classmates}`)
    assertMinimum("activeAssignments", totals.activeAssignments, 57)
    assertMinimum("gradedSubmissions", totals.gradedSubmissions, 47)
    assertMinimum("writtenSubmissions", totals.writtenSubmissions, 46)
    assertMinimum("missingWork", totals.missingWork, 1)
    assertMinimum("upcomingWork", totals.upcomingWork, 9)
    assertMinimum("lateSubmissions", totals.lateSubmissions, 1)
    assertMinimum("attendanceRecords", totals.attendanceRecords, 112)
    assertMinimum("assignedMaterials", totals.assignedMaterials, 13)
    assertMinimum("announcements", totals.announcements, 18)
    assertMinimum("chatMessages", totals.chatMessages, 20)
    if (totals.learningDomains !== Object.values(AcademicDomain).length) throw new Error(`learningDomains: expected all ${Object.values(AcademicDomain).length}, received ${totals.learningDomains}`)
    assertMinimum("teacherCourses", totals.teacherCourses, 2)
    assertMinimum("teacherQuizzes", totals.teacherQuizzes, 3)
    assertMinimum("teacherMaterials", totals.teacherMaterials, 7)
    assertMinimum("teacherClassesToday", totals.teacherClassesToday, new Date().getDay() === 0 ? 0 : 2)
    assertMinimum("teacherDrafts", totals.teacherDrafts, 1)
    assertMinimum("reportCards", totals.reportCards, 2)
    if (!demoQuiz) throw new Error("The playable demo quiz was not found")
    if (totals.demoQuizQuestions !== 8) throw new Error(`demoQuizQuestions: expected 8, received ${totals.demoQuizQuestions}`)
    const demoQuizPoints = demoQuiz.questions.reduce((sum, question) => sum + question.points, 0)
    if (demoQuizPoints !== 100) throw new Error(`demoQuizPoints: expected 100, received ${demoQuizPoints}`)
    if (totals.pendingDemoQuizzes !== 1) throw new Error(`pendingDemoQuizzes: expected 1, received ${totals.pendingDemoQuizzes}`)

    console.log("Demo seed verification passed")
    console.table(totals)
}

main().catch((error) => {
    console.error("Demo seed verification failed:", error)
    process.exitCode = 1
}).finally(async () => {
    await prisma.$disconnect()
})
