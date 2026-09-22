"use server"

import { db as prisma } from "@/lib/db"
import { getUser } from "@/lib/actions/user.actions"
import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import {
    readSchoolPrincipalNames,
    SCHOOL_PRINCIPALS_KEY,
    type SchoolPrincipalNames,
} from "@/lib/school-principals"

const GRADING_SCALE_KEY = "grading_scale"

export interface GradingScale {
    grade: string // "A", "B", "C", "D", "E"
    min: number
    max: number
}

export async function getGradingScaleDefaults() {
    try {
        const user = await getUser()
        // Allow teachers to read it too for their course settings
        if (!user) return { error: "Unauthorized" }

        const config = await prisma.systemConfig.findUnique({
            where: { id: GRADING_SCALE_KEY }
        })

        if (!config?.value) {
            // Default Values if not set
            return {
                scale: [
                    { grade: "A", min: 90, max: 100 },
                    { grade: "B", min: 80, max: 89 },
                    { grade: "C", min: 70, max: 79 },
                    { grade: "D", min: 60, max: 69 },
                    { grade: "E", min: 0, max: 59 },
                ] as GradingScale[]
            }
        }

        return { scale: config.value as unknown as GradingScale[] }

    } catch (error) {
        console.error("Error fetching grading scale:", error)
        return { error: "Failed to fetch grading scale" }
    }
}

export async function updateGradingScaleDefaults(scale: GradingScale[]) {
    try {
        const user = await getUser()
        if (!user || !user.roles.includes("ADMIN")) return { error: "Unauthorized" }

        await prisma.systemConfig.upsert({
            where: { id: GRADING_SCALE_KEY },
            update: { value: scale as unknown as Prisma.InputJsonValue },
            create: { id: GRADING_SCALE_KEY, value: scale as unknown as Prisma.InputJsonValue }
        })

        revalidatePath("/admin/grading")
        return { success: true }
    } catch (error) {
        console.error("Error updating grading scale:", error)
        return { error: "Failed to update grading scale" }
    }

}

export async function getSchoolPrincipalNames() {
    try {
        const user = await getUser()
        if (!user) return { error: "Unauthorized" }

        return { principals: await readSchoolPrincipalNames() }
    } catch (error) {
        console.error("Error fetching school principals:", error)
        return { error: "Failed to fetch school principals" }
    }
}

export async function updateSchoolPrincipalNames(principals: SchoolPrincipalNames) {
    try {
        const user = await getUser()
        if (!user || !user.roles.includes("ADMIN")) return { error: "Unauthorized" }

        const normalized = {
            SMP: principals.SMP.trim(),
            SMA: principals.SMA.trim(),
        }

        await prisma.systemConfig.upsert({
            where: { id: SCHOOL_PRINCIPALS_KEY },
            update: { value: normalized },
            create: { id: SCHOOL_PRINCIPALS_KEY, value: normalized }
        })

        revalidatePath("/admin/miscellaneous")
        revalidatePath("/homeroom", "layout")
        return { success: true }
    } catch (error) {
        console.error("Error updating school principals:", error)
        return { error: "Failed to update school principals" }
    }
}
