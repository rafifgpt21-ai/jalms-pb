import { db } from "@/lib/db"

async function main() {
    try {
        console.log("Attempting to connect to MongoDB...")
        await db.$connect()
        console.log("✅ Successfully connected to MongoDB!")

        const userCount = await db.user.count()
        console.log(`Current user count: ${userCount}`)

    } catch (error) {
        console.error("❌ Failed to connect to MongoDB:", error)
    } finally {
        await db.$disconnect()
    }
}

main()
