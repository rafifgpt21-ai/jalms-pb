import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
    console.log("Checking for Active Academic Year...")
    const activeYear = await db.academicYear.findFirst({
        where: { isActive: true }
    })
    console.log("Active Year:", activeYear)

    console.log("\nChecking for Homeroom Teachers...")
    const teachers = await db.user.findMany({
        where: {
            roles: {
                has: "HOMEROOM_TEACHER"
            }
        }
    })
    console.log("Homeroom Teachers found:", teachers.length)
    teachers.forEach(t => console.log(`- ${t.name} (${t.email}) | Active: ${t.isActive} | Deleted: ${t.deletedAt}`))

    console.log("\nChecking all users roles...")
    const allUsers = await db.user.findMany()
    allUsers.forEach(u => console.log(`- ${u.name}: ${u.roles}`))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
