
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const teacherId = '6936667b5b2354cb30ad6e86' // Saiful Bahri

    console.log("--- Query with Fix ---")
    const assignments = await prisma.assignment.findMany({
        where: {
            course: {
                teacherId,
                term: { isActive: true },
                deletedAt: { isSet: false } // The fix
            },
            deletedAt: { isSet: false },
        },
        include: {
            course: {
                select: { name: true }
            }
        }
    })

    console.log(`Found ${assignments.length} assignments`)
    assignments.forEach(a => {
        console.log(`- ${a.title} (${a.course.name})`)
    })

    const hasMath12 = assignments.some(a => a.course.name === "Math 12")
    if (hasMath12) {
        console.error("FAIL: Math 12 still present!")
    } else {
        console.log("SUCCESS: Math 12 is gone.")
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
