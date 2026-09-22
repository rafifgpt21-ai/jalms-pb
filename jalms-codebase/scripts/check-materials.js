
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        console.log("Connecting to database...")
        const materials = await prisma.material.findMany()
        console.log(`Found ${materials.length} materials in the database:`)
        materials.forEach(m => {
            console.log(`- ID: ${m.id}, Title: ${m.title}, TeacherID: ${m.teacherId}, Type: ${m.materialType}, File: ${m.fileUrl}, Link: ${m.linkUrl}`)
        })

        if (materials.length === 0) {
            console.log("Database appears empty properly.")
        }

        const userCount = await prisma.user.count()
        console.log(`Total users: ${userCount}`)

    } catch (e) {
        console.error("Error connecting or querying:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
