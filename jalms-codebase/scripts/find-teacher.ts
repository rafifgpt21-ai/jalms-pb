
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const teacher = await prisma.user.findFirst({
        where: { roles: { has: "SUBJECT_TEACHER" } }
    })
    if (teacher) {
        console.log(`TEACHER_ID:${teacher.id}`)
    } else {
        console.log("No teacher found")
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
