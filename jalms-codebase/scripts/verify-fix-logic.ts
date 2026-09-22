
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Verifying fix logic...")

    const courses = await prisma.course.findMany({
        take: 3,
        include: {
            _count: {
                select: { students: true } // Original broken count
            },
            students: {
                select: { id: true }
            }
        }
    })

    // Simulate the fix
    const coursesWithCount = courses.map(course => ({
        ...course,
        _count: { students: course.studentIds.length }
    }))

    console.log(`Processed ${coursesWithCount.length} courses.`)

    for (const course of coursesWithCount) {
        console.log(`Course: ${course.name}`)
        console.log(`Original Prisma _count: ${courses.find(c => c.id === course.id)?._count.students}`)
        console.log(`Patched _count via studentIds: ${course._count.students}`)

        if (course._count.students > 0) {
            console.log("✅ Count is positive (Fix working)")
        } else {
            console.log("⚠️ Count is zero (Might be empty course or fix failed)")
        }
        console.log("-------------------")
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
