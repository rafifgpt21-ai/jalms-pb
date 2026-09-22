import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
    console.log("Checking database connection...")
    try {
        console.log("Deleting all terms to clean up...")
        await db.term.deleteMany({})
        console.log("Deleted all terms.")

        console.log("Creating a test Term...")
        const years = await db.academicYear.findMany()
        let year = years[0]
        if (!year) {
            year = await db.academicYear.create({
                data: {
                    name: "Test Year",
                    startDate: new Date(),
                    endDate: new Date(),
                    isActive: false
                }
            })
        }

        const term = await db.term.create({
            data: {
                type: "ODD",
                startDate: new Date(),
                endDate: new Date(),
                academicYearId: year.id,
                isActive: false
            }
        })
        console.log("Created term:", term)

        console.log("Querying all terms...")
        const allTerms = await db.term.findMany({
            include: { academicYear: true }
        })
        console.log("Found terms:", allTerms.length)
        console.log(JSON.stringify(allTerms, null, 2))

    } catch (error) {
        console.error("Error querying database:", error)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
