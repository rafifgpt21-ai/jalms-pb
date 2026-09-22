import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
    console.log("--- Cleaning and Seeding Database ---")

    // 1. Clean existing data
    console.log("Deleting all Terms...")
    await db.term.deleteMany({})

    console.log("Deleting all Academic Years...")
    await db.academicYear.deleteMany({})

    // 2. Create Academic Year
    const yearName = "2024/2025"
    console.log(`Creating Academic Year: ${yearName}...`)

    const academicYear = await db.academicYear.create({
        data: {
            name: yearName,
            startDate: new Date("2024-07-01"),
            endDate: new Date("2025-06-30"),
            isActive: true,
        }
    })
    console.log(`Created Year ID: ${academicYear.id}`)

    // 3. Create Semesters (Terms)
    console.log("Creating Semesters...")

    // Odd Semester
    const oddTerm = await db.term.create({
        data: {
            type: "ODD",
            startDate: new Date("2024-07-01"),
            endDate: new Date("2024-12-31"),
            isActive: true, // Set Odd as active by default
            academicYearId: academicYear.id
        }
    })
    console.log(`Created Odd Semester ID: ${oddTerm.id}`)

    // Even Semester
    const evenTerm = await db.term.create({
        data: {
            type: "EVEN",
            startDate: new Date("2025-01-01"),
            endDate: new Date("2025-06-30"),
            isActive: false,
            academicYearId: academicYear.id
        }
    })
    console.log(`Created Even Semester ID: ${evenTerm.id}`)

    console.log("\n--- Clean & Seed Complete! ---")
    console.log("Database is now in a consistent state.")
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect())
