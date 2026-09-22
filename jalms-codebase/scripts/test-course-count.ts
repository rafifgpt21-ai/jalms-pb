
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Fetching first 3 courses...")

    const courses = await prisma.course.findMany({
        take: 3,
        include: {
            _count: {
                select: { students: true }
            },
            students: {
                select: { id: true }
            }
        }
    })

    console.log(`Found ${courses.length} courses.`)

    for (const course of courses) {
        console.log(`Course: ${course.name} (${course.id})`)
        console.log(`studentIds field: ${JSON.stringify(course.studentIds)}`)
        console.log(`students relation length: ${course.students.length}`)
        console.log(`_count.students: ${course._count.students}`)
        console.log("-------------------")
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
