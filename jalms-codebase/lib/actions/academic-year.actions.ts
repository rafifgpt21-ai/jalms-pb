"use server"

import { db as prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { SemesterType } from "@prisma/client"

export async function getSemesters() {
    try {
        const allTerms = await prisma.term.findMany({
            include: {
                academicYear: true,
                _count: {
                    select: { courses: true }
                }
            },
            orderBy: {
                startDate: "desc",
            },
        })

        // Robust in-memory filtering
        const terms = allTerms.filter(term => {
            // Check if deletedAt is set and is a valid date
            if (!term.deletedAt) return true; // Not deleted (null or undefined)
            return false; // Deleted
        })

        return { terms, error: undefined }
    } catch (error) {
        console.error("Error fetching semesters:", error)
        return { terms: [], error: "Failed to fetch semesters" }
    }
}

export async function createSemester(data: {
    academicYearName: string;
    type: SemesterType;
    startDate: Date;
    endDate: Date
}) {
    console.log("createSemester called with:", data)
    try {
        // 1. Find or Create Academic Year
        let academicYear = await prisma.academicYear.findFirst({
            where: { name: data.academicYearName }
        })
        console.log("Found academicYear:", academicYear)

        if (!academicYear) {
            console.log("Creating new academicYear...")
            academicYear = await prisma.academicYear.create({
                data: {
                    name: data.academicYearName,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    isActive: false,
                }
            })
            console.log("Created academicYear:", academicYear)
        } else {
            console.log("Updating existing academicYear...")
            const newStart = data.startDate < academicYear.startDate ? data.startDate : academicYear.startDate
            const newEnd = data.endDate > academicYear.endDate ? data.endDate : academicYear.endDate

            if (newStart.getTime() !== academicYear.startDate.getTime() || newEnd.getTime() !== academicYear.endDate.getTime()) {
                await prisma.academicYear.update({
                    where: { id: academicYear.id },
                    data: { startDate: newStart, endDate: newEnd }
                })
                console.log("Updated academicYear dates")
            }
        }

        // 2. Create the Term (Semester)
        console.log("Creating term...")
        const term = await prisma.term.create({
            data: {
                type: data.type,
                startDate: data.startDate,
                endDate: data.endDate,
                academicYearId: academicYear.id,
                isActive: false,
            }
        })
        console.log("Created term:", term)

        revalidatePath("/admin/semesters")
        return { success: true, term }
    } catch (error) {
        console.error("Error creating semester:", error)
        return { error: "Failed to create semester: " + (error as Error).message }
    }
}

export async function updateSemester(id: string, data: {
    academicYearName: string;
    type: SemesterType;
    startDate: Date;
    endDate: Date
}) {
    try {
        // 1. Find or Create Academic Year
        let academicYear = await prisma.academicYear.findFirst({
            where: { name: data.academicYearName }
        })

        if (!academicYear) {
            academicYear = await prisma.academicYear.create({
                data: {
                    name: data.academicYearName,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    isActive: false,
                }
            })
        } else {
            const newStart = data.startDate < academicYear.startDate ? data.startDate : academicYear.startDate
            const newEnd = data.endDate > academicYear.endDate ? data.endDate : academicYear.endDate

            if (newStart.getTime() !== academicYear.startDate.getTime() || newEnd.getTime() !== academicYear.endDate.getTime()) {
                await prisma.academicYear.update({
                    where: { id: academicYear.id },
                    data: { startDate: newStart, endDate: newEnd }
                })
            }
        }

        // 2. Update the Term
        const term = await prisma.term.update({
            where: { id },
            data: {
                type: data.type,
                startDate: data.startDate,
                endDate: data.endDate,
                academicYearId: academicYear.id,
            }
        })

        revalidatePath("/admin/semesters")
        return { success: true, term }
    } catch (error) {
        console.error("Error updating semester:", error)
        return { error: "Failed to update semester: " + (error as Error).message }
    }
}

export async function toggleSemesterStatus(id: string) {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.term.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            })

            const term = await tx.term.update({
                where: { id },
                data: { isActive: true },
                include: { academicYear: true }
            })

            await tx.academicYear.updateMany({
                where: { isActive: true },
                data: { isActive: false }
            })

            await tx.academicYear.update({
                where: { id: term.academicYearId },
                data: { isActive: true }
            })
        })

        revalidatePath("/admin/semesters")
        return { success: true }
    } catch (error) {
        console.error("Error setting active semester:", error)
        return { error: "Failed to set active semester" }
    }
}

export async function deleteSemester(id: string) {
    try {
        await prisma.term.update({
            where: { id },
            data: { deletedAt: new Date() },
        })

        revalidatePath("/admin/semesters")
        return { success: true }
    } catch (error) {
        console.error("Error deleting semester:", error)
        return { error: "Failed to delete semester: " + (error as Error).message }
    }
}

export async function setActiveAcademicYear(id: string) {
    try {
        await prisma.$transaction(async (tx) => {
            // Deactivate all
            await tx.academicYear.updateMany({
                where: { isActive: true },
                data: { isActive: false }
            })

            // Activate target
            await tx.academicYear.update({
                where: { id },
                data: { isActive: true }
            })
        })

        revalidatePath("/admin/academic-years")
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error setting active academic year:", error)
        return { success: false, error: "Failed to set active academic year" }
    }
}

export async function deleteAcademicYear(id: string) {
    try {
        await prisma.academicYear.update({
            where: { id },
            data: { deletedAt: new Date() }
        })

        revalidatePath("/admin/academic-years")
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error deleting academic year:", error)
        return { success: false, error: "Failed to delete academic year" }
    }
}

export async function createAcademicYear(data: { name: string, startDate: Date, endDate: Date }) {
    try {
        await prisma.academicYear.create({
            data: {
                ...data,
                isActive: false
            }
        })
        revalidatePath("/admin/academic-years")
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error creating academic year:", error)
        return { success: false, error: "Failed to create academic year" }
    }
}
