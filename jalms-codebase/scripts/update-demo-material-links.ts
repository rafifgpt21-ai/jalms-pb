import { PrismaClient } from "@prisma/client"
import { DEMO_MATERIAL_LINKS } from "../lib/demo-material-links"

const prisma = new PrismaClient()

async function main() {
    let updated = 0

    for (const [title, linkUrl] of Object.entries(DEMO_MATERIAL_LINKS)) {
        const result = await prisma.material.updateMany({
            where: { title },
            data: { linkUrl },
        })

        updated += result.count
        console.log(`${result.count ? "updated" : "missing"}: ${title}`)
    }

    console.log(`Updated ${updated} material records.`)
}

main()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
