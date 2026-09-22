import { PrismaClient, Role, AssignmentType } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding Teacher Data...")

    // 1. Get Active Term
    const term = await prisma.term.findFirst({
        where: { isActive: true }
    })

    if (!term) {
        console.error("❌ No active term found. Please run main seed first or ensure a term is active.")
        return
    }

    // 2. Create Teacher
    const teacherPassword = process.env.SEED_TEACHER_PASSWORD
    const studentPasswordValue = process.env.SEED_STUDENT_PASSWORD
    if (!teacherPassword || !studentPasswordValue) {
        throw new Error("SEED_TEACHER_PASSWORD dan SEED_STUDENT_PASSWORD wajib diisi di environment lokal.")
    }
    const hashedPassword = await bcrypt.hash(teacherPassword, 10)
    const teacher = await prisma.user.upsert({
        where: { email: "teacher@jalms.com" },
        update: {},
        create: {
            email: "teacher@jalms.com",
            name: "John Teacher",
            password: hashedPassword,
            roles: [Role.SUBJECT_TEACHER],
            isActive: true
        }
    })
    console.log(`✅ Teacher: ${teacher.email}`)

    // 3. Create Students
    const studentPassword = await bcrypt.hash(studentPasswordValue, 10)
    const students = []
    for (let i = 1; i <= 5; i++) {
        const student = await prisma.user.upsert({
            where: { email: `student${i}@jalms.com` },
            update: {},
            create: {
                email: `student${i}@jalms.com`,
                name: `Student ${i}`,
                password: studentPassword,
                roles: [Role.STUDENT],
                isActive: true
            }
        })
        students.push(student)
    }
    console.log(`✅ Created ${students.length} students`)

    // 4. Create Course
    const course = await prisma.course.create({
        data: {
            name: "Biology 101",
            termId: term.id,
            teacherId: teacher.id,
            studentIds: students.map(s => s.id)
        }
    })
    console.log(`✅ Course: ${course.name}`)

    // 5. Create Assignment
    const assignment = await prisma.assignment.create({
        data: {
            title: "Cell Structure Quiz",
            description: "Quiz about plant and animal cells.",
            courseId: course.id,
            type: AssignmentType.SUBMISSION,
            maxPoints: 100,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
            isExtraCredit: false
        }
    })
    console.log(`✅ Assignment: ${assignment.title}`)

    // 6. Create Submission (for Student 1)
    await prisma.submission.create({
        data: {
            assignmentId: assignment.id,
            studentId: students[0].id,
            submittedAt: new Date(),
            // No grade yet
        }
    })
    console.log(`✅ Submission created for ${students[0].name}`)

    console.log("🎉 Seeding complete!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
