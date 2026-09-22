import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
    console.log("--- Seeding Default Academic Year & Semesters ---")

    // 1. Create Academic Year
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

    // 2. Create Semesters (Terms)
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

    console.log("\n--- Seeding Complete! ---")
    console.log("You should now see '2024/2025 - Odd' in your dropdowns.")
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect())
