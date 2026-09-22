
import { db } from "../lib/db"

async function main() {
    console.log("Checking DB users...")
    const total = await db.user.count()
    console.log("Total users:", total)

    const active = await db.user.count({ where: { isActive: true } })
    console.log("Active users:", active)

    const deleted = await db.user.count({ where: { NOT: { deletedAt: null } } })
    console.log("Deleted users:", deleted)

    const visible = await db.user.count({ where: { deletedAt: null } })
    console.log("Visible (deletedAt=null):", visible)

    try {
        // @ts-ignore
        const isSetFalse = await db.user.count({ where: { deletedAt: { isSet: false } } })
        console.log("Visible (deletedAt={isSet:false}):", isSetFalse)
    } catch (e: any) {
        console.log("isSet filter failed:", e.message)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
