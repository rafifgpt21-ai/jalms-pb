import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
    console.log("--- Wiping All Classes ---")

    // Delete all classes
    const { count } = await db.class.deleteMany({})

    console.log(`Deleted ${count} classes.`)
    console.log("The database is now clean of orphaned class records.")
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect())
