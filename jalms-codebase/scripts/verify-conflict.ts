import { db as prisma } from "@/lib/db"
import { checkStudentScheduleConflict, checkCourseScheduleUpdateConflict } from "@/lib/helpers/schedule-conflict"

async function main() {
    console.log("Verifying Schedule Conflict Detection...")

    // 1. Check if Schedule model exists in client
    if (!('schedule' in prisma)) {
        console.error("CRITICAL: 'schedule' model not found in Prisma Client. Please run 'npx prisma generate'.")
        return
    }

    try {
        // 2. Setup Test Data
        console.log("Setting up test data...")

        // Create a test term
        const term = await prisma.term.create({
            data: {
                type: "ODD",
                startDate: new Date(),
                endDate: new Date(),
                isActive: true,
                academicYear: {
                    create: {
                        name: "Test Year",
                        startDate: new Date(),
                        endDate: new Date(),
                        isActive: true
                    }
                }
            }
        })

        // Create a teacher
        const teacher = await prisma.user.create({
            data: {
                name: "Test Teacher",
                email: `teacher-${Date.now()}@test.com`,
                roles: ["SUBJECT_TEACHER"]
            }
        })

        // Create Course A
        const courseA = await prisma.course.create({
            data: {
                name: "Course A",
                termId: term.id,
                teacherId: teacher.id
            }
        })

        // Create Course B
        const courseB = await prisma.course.create({
            data: {
                name: "Course B",
                termId: term.id,
                teacherId: teacher.id
            }
        })

        // Create Student
        const student = await prisma.user.create({
            data: {
                name: "Test Student",
                email: `student-${Date.now()}@test.com`,
                roles: ["STUDENT"]
            }
        })

        // Schedule Course A: Monday (1), Period 1
        await prisma.schedule.create({
            data: {
                dayOfWeek: 1,
                period: 1,
                courseId: courseA.id
            }
        })

        // Enroll Student in Course A
        await prisma.course.update({
            where: { id: courseA.id },
            data: { students: { connect: { id: student.id } } }
        })

        console.log("Test data created.")

        // 3. Test Enrollment Conflict
        console.log("Testing Enrollment Conflict...")
        // Schedule Course B: Monday (1), Period 1 (Conflict!)
        await prisma.schedule.create({
            data: {
                dayOfWeek: 1,
                period: 1,
                courseId: courseB.id
            }
        })

        const conflict1 = await checkStudentScheduleConflict(student.id, courseB.id)
        if (conflict1) {
            console.log("SUCCESS: Detected enrollment conflict:", conflict1)
        } else {
            console.error("FAILURE: Did not detect enrollment conflict")
        }

        // 4. Test Schedule Update Conflict
        console.log("Testing Schedule Update Conflict...")
        // Create Course C (No schedule)
        const courseC = await prisma.course.create({
            data: {
                name: "Course C",
                termId: term.id,
                teacherId: teacher.id
            }
        })
        // Enroll Student in Course C
        await prisma.course.update({
            where: { id: courseC.id },
            data: { students: { connect: { id: student.id } } }
        })

        // Try to update Course C to Monday Period 1 (Conflict with Course A)
        const conflicts2 = await checkCourseScheduleUpdateConflict(courseC.id, [{ day: 1, period: 1 }])
        if (conflicts2.length > 0) {
            console.log("SUCCESS: Detected schedule update conflict:", conflicts2)
        } else {
            console.error("FAILURE: Did not detect schedule update conflict")
        }

        // Cleanup (Optional, but good practice)
        // ...

    } catch (error) {
        console.error("Error during verification:", error)
    }
}

main()
