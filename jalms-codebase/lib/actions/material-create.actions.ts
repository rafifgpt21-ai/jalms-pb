"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { getUser } from "@/lib/actions/user.actions"

export async function createMaterial(data: {
    title: string
    description?: string
    fileUrl?: string
    linkUrl?: string
}) {
    try {
        const user = await getUser()
        if (!user?.id) return { success: false, material: null, error: "Unauthorized" }

        const title = data.title.trim()
        const description = data.description?.trim() || null
        const fileUrl = data.fileUrl?.trim() || null
        const linkUrl = data.linkUrl?.trim() || null

        if (!title) return { success: false, material: null, error: "Title is required" }
        if (!fileUrl && !linkUrl) return { success: false, material: null, error: "Add a PDF or an external link" }

        const material = await db.material.create({
            data: {
                title,
                description,
                fileUrl,
                linkUrl,
                materialType: "HYBRID",
                teacherId: user.id,
            },
        })

        revalidatePath("/teacher/materials")
        return { success: true, material, error: undefined }
    } catch (error) {
        console.error("Error creating material:", error)
        return { success: false, material: null, error: "Failed to create material" }
    }
}
