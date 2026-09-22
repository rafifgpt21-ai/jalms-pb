import { db } from "../lib/db"

async function main() {
    console.log("Checking materials for course 692fefb17313c02da254ae9a...")
    const materials = await db.material.findMany({
        where: {
            courseId: "692fefb17313c02da254ae9a",
            deletedAt: null
        }
    })
    console.log(`Found ${materials.length} materials for this course.`)
    materials.forEach(m => {
        console.log({
            id: m.id,
            title: m.title,
            courseId: m.courseId,
            deletedAt: m.deletedAt,
        })
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
