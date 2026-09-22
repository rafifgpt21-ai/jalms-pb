
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("🔍 VERIFYING DATABASE STATE...")

    const users = await prisma.user.count()
    const teachers = await prisma.user.count({ where: { roles: { has: 'SUBJECT_TEACHER' } } })
    const students = await prisma.user.count({ where: { roles: { has: 'STUDENT' } } })

    const years = await prisma.academicYear.count()
    const terms = await prisma.term.count()

    const classes = await prisma.class.count()
    const courses = await prisma.course.count()
    const enrollments = await prisma.enrollment.count()

    const assignments = await prisma.assignment.count()
    const submissions = await prisma.submission.count()
    const attendances = await prisma.attendance.count()

    console.log(`
    📊 COUNTS:
    - Users: ${users} (Teachers: ${teachers}, Students: ${students})
    - Academic Years: ${years}
    - Terms: ${terms}
    - Classes: ${classes}
    - Courses: ${courses}
    - Enrollments: ${enrollments}
    - Assignments: ${assignments}
    - Submissions: ${submissions}
    - Attendance Records: ${attendances}
    `)

    if (terms < 4) console.warn("⚠️ Expected 4 Terms, found " + terms)
    if (attendances < 1000) console.warn("⚠️ Attendance seems low")
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
