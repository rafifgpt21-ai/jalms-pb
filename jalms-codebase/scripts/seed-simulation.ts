
import { PrismaClient, Role, SemesterType, AttendanceStatus, AssignmentType, GradeLevel } from "@prisma/client"
import { faker } from "@faker-js/faker"
import bcrypt from "bcryptjs"
import { addDays, isWeekend, eachDayOfInterval } from "date-fns"

const prisma = new PrismaClient()

// Configuration
const CONFIG = {
    TEACHER_COUNT: 10,
    STUDENT_COUNT: 100, // Reduced from 90 to 100 round number
    CLASSES_PER_TERM: 3,
    STUDENTS_PER_CLASS: 30, // 3 * 30 = 90 students used
    SUBJECTS: [
        { name: "Mathematics", code: "MAT" },
        { name: "Physics", code: "PHY" },
        { name: "Biology", code: "BIO" },
        { name: "English", code: "ENG" },
        { name: "History", code: "HIS" },
        { name: "Computer Science", code: "CS" }
    ]
}

async function main() {
    if (!process.env.SIMULATION_PASSWORD) throw new Error("SIMULATION_PASSWORD wajib diisi di environment lokal.")
    console.log("🌱 STARTING REALISTIC DATA SIMULATION...")

    // 1. Users (Teachers & Students)
    const teachers = await seedUsers(CONFIG.TEACHER_COUNT, 'teacher', Role.SUBJECT_TEACHER)
    const students = await seedUsers(CONFIG.STUDENT_COUNT, 'student', Role.STUDENT)

    // Upgrade first 3 teachers to Homeroom for valid logic
    for (let i = 0; i < 3; i++) {
        await prisma.user.update({ where: { id: teachers[i].id }, data: { roles: { push: Role.HOMEROOM_TEACHER } } })
    }

    // 2. Academic Years & Terms (4 Semesters)
    // Year 1: 2023/2024
    // Year 2: 2024/2025
    const years = [
        { name: "2023/2024", start: new Date("2023-07-15"), end: new Date("2024-06-20") },
        { name: "2024/2025", start: new Date("2024-07-15"), end: new Date("2025-06-20") }
    ]

    for (const y of years) {
        let academicYear = await prisma.academicYear.findFirst({ where: { name: y.name } })
        if (!academicYear) {
            academicYear = await prisma.academicYear.create({
                data: {
                    name: y.name,
                    startDate: y.start,
                    endDate: y.end,
                    isActive: y.name === "2024/2025" // Activate current year
                }
            })
        }

        // Terms for this year
        const terms = [
            { type: SemesterType.ODD, start: y.start, end: new Date(y.start.getFullYear(), 11, 20) }, // July - Dec
            { type: SemesterType.EVEN, start: new Date(y.start.getFullYear() + 1, 0, 8), end: y.end } // Jan - June
        ]

        for (const t of terms) {
            let term = await prisma.term.findFirst({ where: { academicYearId: academicYear.id, type: t.type } })
            if (!term) {
                term = await prisma.term.create({
                    data: {
                        type: t.type,
                        startDate: t.start,
                        endDate: t.end,
                        isActive: t.type === SemesterType.ODD && y.name === "2024/2025", // Just a guess for active term
                        academicYearId: academicYear.id
                    }
                })
            }
            console.log(`\n📅 Processing Term: ${y.name} ${t.type} (${t.start.toDateString()} - ${t.end.toDateString()})`)

            await simulateTermData(term, teachers, students)
        }
    }

    console.log("\n🎉 SIMULATION COMPLETE!")
}

async function seedUsers(count: number, prefix: string, role: Role) {
    console.log(`Creating/Fetching ${count} ${prefix}s...`)
    const password = await bcrypt.hash(process.env.SIMULATION_PASSWORD!, 10)
    const users = []

    for (let i = 1; i <= count; i++) {
        const email = `${prefix}${i}@jalms.com`
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                name: faker.person.fullName(),
                email,
                password,
                roles: [role],
                isActive: true,
                officialId: prefix === 'student' ? `STU${2023000 + i}` : undefined,
                lastLoginAt: faker.date.recent()
            }
        })
        users.push(user)
    }
    return users
}

async function simulateTermData(term: any, teachers: any[], students: any[]) {
    // 3. Classes
    // We recycle class names but they are distinct DB records per term usually? 
    // Schema says Class has termId. So yes, new classes per term.
    // Let's pretend cohort progression: 
    // 2023/2024 -> Grade 10
    // 2024/2025 -> Grade 11

    // Determine grade level based on year
    // term.academicYear isn't fetched, but we know context.
    // Let's rely on year from date.
    const yearStart = term.startDate.getFullYear()
    const gradeLevel = yearStart === 2023 ? 10 : 11
    const classNames = [`${gradeLevel}-A`, `${gradeLevel}-B`, `${gradeLevel}-C`]

    const classes = []

    for (let i = 0; i < classNames.length; i++) {
        const homeroomTeacher = teachers[i] // Simple assignment
        const name = classNames[i]

        const cls = await prisma.class.create({
            data: {
                name,
                gradeLevel: gradeLevel === 10 ? GradeLevel.GRADE_10 : GradeLevel.GRADE_11,
                termId: term.id,
                homeroomTeacherId: homeroomTeacher.id
            }
        })
        classes.push(cls)

        // Assign students (static groups for simplicity)
        const startIdx = i * CONFIG.STUDENTS_PER_CLASS
        const classStudents = students.slice(startIdx, startIdx + CONFIG.STUDENTS_PER_CLASS)

        await prisma.enrollment.createMany({
            data: classStudents.map(s => ({
                classId: cls.id,
                studentId: s.id
            }))
        })

        // 4. Courses & Transactions
        await simulateCoursesAndTransactions(term, cls, classStudents, teachers)
    }
}

async function simulateCoursesAndTransactions(term: any, cls: any, students: any[], teachers: any[]) {
    // Create courses for this class
    let teacherIdx = 3 // Start after homeroom teachers

    for (const sub of CONFIG.SUBJECTS) {
        teacherIdx = (teacherIdx + 1) % teachers.length
        const teacher = teachers[teacherIdx]

        const course = await prisma.course.create({
            data: {
                name: sub.name,
                termId: term.id,
                classId: cls.id,
                teacherId: teacher.id,
                studentIds: students.map(s => s.id)
            }
        })

        // A. Attendance Simulation
        // Iterate days
        const days = eachDayOfInterval({ start: term.startDate, end: term.endDate })
        const weekdays = days.filter(d => !isWeekend(d))

        // Batch attendance to avoid thousands of individual inserts
        const attendanceData = []

        for (const date of weekdays) {
            // 90% chance class happens (holidays etc simulated by missing)
            if (Math.random() > 0.95) continue;

            for (const student of students) {
                // Sked: 
                // 85% Present
                // 5% Absent
                // 5% Late/Excused
                // 5% Skipped
                const rand = Math.random()
                let status: AttendanceStatus = AttendanceStatus.PRESENT
                if (rand > 0.95) status = AttendanceStatus.ABSENT
                else if (rand > 0.90) status = AttendanceStatus.EXCUSED
                else if (rand > 0.88) status = AttendanceStatus.SKIPPED

                if (status === AttendanceStatus.PRESENT && Math.random() > 0.8) {
                    // Don't save ALL present records if we want to save space?
                    // Actually user asked for data, let's save all.
                }

                attendanceData.push({
                    date,
                    status,
                    courseId: course.id,
                    studentId: student.id,
                    period: 1 // Simplified
                })
            }
        }

        // Insert in chunks of 500
        for (let i = 0; i < attendanceData.length; i += 500) {
            await prisma.attendance.createMany({ data: attendanceData.slice(i, i + 500) })
        }

        // B. Assignments & Submissions
        // Create 5 assignments
        for (let i = 1; i <= 5; i++) {
            const dueDate = addDays(term.startDate, i * 20) // Spread out
            if (dueDate > term.endDate) continue;

            const assignment = await prisma.assignment.create({
                data: {
                    title: `${sub.name} Assignment ${i}`,
                    description: faker.lorem.sentence(),
                    dueDate,
                    courseId: course.id,
                    maxPoints: 100
                }
            })

            // Submissions
            const submissions = []
            for (const student of students) {
                // 90% submission rate
                if (Math.random() > 0.1) {
                    const score = Math.floor(Math.random() * (100 - 60) + 60) // 60-100
                    submissions.push({
                        assignmentId: assignment.id,
                        studentId: student.id,
                        grade: score,
                        feedback: score < 75 ? "Needs improvement" : "Good job",
                        submittedAt: addDays(dueDate, Math.floor(Math.random() * 5) - 2) // +/- days
                    })
                }
            }
            await prisma.submission.createMany({ data: submissions })
        }
    }
}

main()
    .catch((e) => {
        console.error(e)
        // process.exit(1) // Don't crash hard, just log
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
