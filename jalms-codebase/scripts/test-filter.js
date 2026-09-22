
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const teacherId = "69709faac599ce20021489ba"

        const all = await prisma.material.findMany({
            where: { teacherId }
        })
        console.log(`Total materials for teacher: ${all.length}`)

        const withNull = await prisma.material.findMany({
            where: {
                teacherId,
                deletedAt: null
            }
        })
        console.log(`Materials with deletedAt: null => ${withNull.length}`)

        // Test with isSet: false (requires raw or any cast usually, but let's try strict first)
        // Prisma usually maps null to "is null or is not set" for optional fields, but let's check.

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
