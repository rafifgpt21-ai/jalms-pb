
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const materials = await prisma.material.findMany({
            include: { teacher: true }
        })
        console.log(`\n--- DB CHECK RESULTS ---`)
        console.log(`Total Materials Found: ${materials.length}`)

        materials.forEach((m, i) => {
            console.log(`\n[${i + 1}] ID: ${m.id}`)
            console.log(`    Title: ${m.title}`)
            console.log(`    File: ${m.fileUrl || "N/A"}`)
            console.log(`    Link: ${m.linkUrl || "N/A"}`)
            console.log(`    Teacher: ${m.teacher.name} (${m.teacherId})`)
            console.log(`    Email: ${m.teacher.email}`)
        })

        const users = await prisma.user.findMany({ take: 5 })
        console.log(`\n--- USERS SAMPLE (${users.length}) ---`)
        users.forEach(u => console.log(`User: ${u.name} (${u.email}) - ID: ${u.id}`))

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
