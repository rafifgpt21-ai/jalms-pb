
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const materials = await prisma.material.findMany({
            where: { teacherId: "69709faac599ce20021489ba" }
        })

        console.log(`\n--- DELETED_AT CHECK ---`)
        if (materials.length === 0) {
            console.log("No materials found for this teacher ID in raw query!")
        } else {
            materials.forEach(m => {
                console.log(`ID: ${m.id} | DeletedAt: ${m.deletedAt}`)
            })
        }

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
