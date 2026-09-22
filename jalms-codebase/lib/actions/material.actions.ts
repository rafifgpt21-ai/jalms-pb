"use server"

import { db as prisma } from "@/lib/db"
import { getUser } from "@/lib/actions/user.actions"
import { revalidatePath } from "next/cache"

import { unlink } from "fs/promises"
import path from "path"




export async function deleteMaterialFile(materialId: string, fileUrl: string) {
    try {
        const user = await getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        const material = await prisma.material.findUnique({
            where: { id: materialId }
        })

        if (!material || material.teacherId !== user.id) {
            return { success: false, error: "Unauthorized or material not found" }
        }

        // Extract file key from URL
        // Extract file key from URL
        // Local File Deletion
        if (fileUrl.startsWith("/api/files/")) {
            // Background local delete
            const relativePath = fileUrl.replace(/^\/api\/files\//, "")
            const fullPath = path.join(process.cwd(), "uploads", relativePath)
            unlink(fullPath).catch((err) => console.log("Bg unlink error:", err))
        }


        await prisma.material.update({
            where: { id: materialId },
            data: { fileUrl: "" }
        })

        revalidatePath("/teacher/materials")
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error deleting material file:", error)
        return { success: false, error: "Failed to delete file" }
    }
}

export async function createMaterial(data: {
    title: string
    description?: string
    fileUrl?: string
    linkUrl?: string
    type?: string // Deprecated
}) {
    try {
        console.log("createMaterial: Starting", JSON.stringify(data, null, 2))
        const user = await getUser()
        if (!user || !user.id) return { success: false, material: null, error: "Unauthorized" }

        const material = await prisma.material.create({
            data: {
                title: data.title,
                description: data.description || null,
                fileUrl: data.fileUrl || null,
                linkUrl: data.linkUrl || null,
                materialType: "HYBRID", // Just default
                teacherId: user.id
            }
        })

        console.log("createMaterial: DB Create Success", material.id)
        revalidatePath("/teacher/materials")
        return { success: true, material, error: undefined }
    } catch (error) {
        console.error("Error creating material (DETAILED):", error)
        return { success: false, material: null, error: "Failed to create material" }
    }
}

export async function getTeacherMaterials() {
    try {
        const user = await getUser()
        console.log("getTeacherMaterials: User", user?.id, user?.email)

        if (!user) return { materials: [], folders: [], error: "Unauthorized" }

        const [materials, folders] = await Promise.all([
            prisma.material.findMany({
                where: {
                    teacherId: user.id,
                    deletedAt: { isSet: false } as any
                },
                include: {
                    folder: true,
                    assignments: {
                        include: {
                            course: {
                                include: {
                                    term: {
                                        include: {
                                            academicYear: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    uploadedAt: "desc"
                }
            }),
            prisma.materialFolder.findMany({
                where: { teacherId: user.id },
                include: {
                    _count: {
                        select: {
                            materials: {
                                where: { deletedAt: { isSet: false } as any }
                            }
                        }
                    }
                },
                orderBy: { name: "asc" }
            })
        ])

        console.log("getTeacherMaterials: Found", materials.length, "materials")
        return { materials, folders, error: undefined }
    } catch (error) {
        console.error("Error fetching teacher materials:", error)
        return { materials: [], folders: [], error: "Failed to fetch materials" }
    }
}

const MATERIAL_FOLDER_COLORS = new Set(["indigo", "sky", "emerald", "amber", "rose", "violet"])

export async function createMaterialFolder(name: string, color = "indigo") {
    try {
        const user = await getUser()
        if (!user?.id) return { folder: null, error: "Unauthorized" }

        const cleanName = name.trim()
        if (!cleanName) return { folder: null, error: "Folder name is required" }
        if (cleanName.length > 60) return { folder: null, error: "Folder name is too long" }

        const existing = await prisma.materialFolder.findFirst({
            where: { teacherId: user.id, name: { equals: cleanName, mode: "insensitive" } }
        })
        if (existing) return { folder: null, error: "A folder with this name already exists" }

        const folder = await prisma.materialFolder.create({
            data: {
                name: cleanName,
                color: MATERIAL_FOLDER_COLORS.has(color) ? color : "indigo",
                teacherId: user.id
            }
        })
        revalidatePath("/teacher/materials")
        return { folder, error: undefined }
    } catch (error) {
        console.error("Error creating material folder:", error)
        return { folder: null, error: "Failed to create folder" }
    }
}

export async function renameMaterialFolder(folderId: string, name: string) {
    try {
        const user = await getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        const cleanName = name.trim()
        if (!cleanName) return { success: false, error: "Folder name is required" }
        if (cleanName.length > 60) return { success: false, error: "Folder name is too long" }

        const folder = await prisma.materialFolder.findUnique({ where: { id: folderId } })
        if (!folder || folder.teacherId !== user.id) return { success: false, error: "Folder not found" }

        const duplicate = await prisma.materialFolder.findFirst({
            where: {
                teacherId: user.id,
                id: { not: folderId },
                name: { equals: cleanName, mode: "insensitive" }
            }
        })
        if (duplicate) return { success: false, error: "A folder with this name already exists" }

        await prisma.materialFolder.update({ where: { id: folderId }, data: { name: cleanName } })
        revalidatePath("/teacher/materials")
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error renaming material folder:", error)
        return { success: false, error: "Failed to rename folder" }
    }
}

export async function deleteMaterialFolder(folderId: string) {
    try {
        const user = await getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        const folder = await prisma.materialFolder.findUnique({ where: { id: folderId } })
        if (!folder || folder.teacherId !== user.id) return { success: false, error: "Folder not found" }

        // Deleting a folder never deletes its resources; they return to Unfiled.
        await prisma.material.updateMany({ where: { teacherId: user.id, folderId }, data: { folderId: null } })
        await prisma.materialFolder.delete({ where: { id: folderId } })
        revalidatePath("/teacher/materials")
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error deleting material folder:", error)
        return { success: false, error: "Failed to delete folder" }
    }
}

export async function moveMaterialToFolder(materialId: string, folderId: string | null) {
    try {
        const user = await getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        const material = await prisma.material.findUnique({ where: { id: materialId } })
        if (!material || material.teacherId !== user.id) {
            return { success: false, error: "Material not found" }
        }

        if (folderId) {
            const folder = await prisma.materialFolder.findUnique({ where: { id: folderId } })
            if (!folder || folder.teacherId !== user.id) return { success: false, error: "Folder not found" }
        }

        await prisma.material.update({ where: { id: materialId }, data: { folderId } })
        revalidatePath("/teacher/materials")
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error moving material:", error)
        return { success: false, error: "Failed to move material" }
    }
}

export async function assignMaterialToCourse(materialId: string, courseId: string) {
    try {
        const user = await getUser()
        if (!user) return { assignment: null, error: "Unauthorized" }

        // Verify ownership
        const material = await prisma.material.findUnique({
            where: { id: materialId }
        })

        if (!material || material.teacherId !== user.id) {
            return { assignment: null, error: "Unauthorized or material not found" }
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { teacherId: true }
        })
        if (!course || course.teacherId !== user.id) {
            return { assignment: null, error: "Course not found" }
        }

        // Check if already assigned
        const existing = await prisma.materialAssignment.findFirst({
            where: {
                materialId,
                courseId
            }
        })

        if (existing) {
            return { assignment: null, error: "Material already assigned to this course" }
        }

        const assignment = await prisma.materialAssignment.create({
            data: {
                materialId,
                courseId
            }
        })

        revalidatePath("/teacher/materials")
        revalidatePath(`/teacher/courses/${courseId}/materials`)
        revalidatePath(`/student/courses/${courseId}/materials`)
        return { assignment, error: undefined }
    } catch (error) {
        console.error("Error assigning material:", error)
        return { assignment: null, error: "Failed to assign material" }
    }
}

export async function removeMaterialFromCourse(materialId: string, courseId: string) {
    try {
        const user = await getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        // Verify ownership
        const material = await prisma.material.findUnique({
            where: { id: materialId }
        })

        if (!material || material.teacherId !== user.id) {
            return { success: false, error: "Unauthorized or material not found" }
        }

        await prisma.materialAssignment.deleteMany({
            where: {
                materialId,
                courseId
            }
        })

        revalidatePath("/teacher/materials")
        revalidatePath(`/teacher/courses/${courseId}/materials`)
        revalidatePath(`/student/courses/${courseId}/materials`)
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error removing material assignment:", error)
        return { success: false, error: "Failed to remove material assignment" }
    }
}

export async function searchTeacherCourses(query: string) {
    try {
        const user = await getUser()
        if (!user) return { courses: [], error: "Unauthorized" }

        const courses = await prisma.course.findMany({
            where: {
                teacherId: user.id,
                name: { contains: query, mode: "insensitive" },
                deletedAt: { isSet: false },
                term: { isActive: true } // Only active semester
            },
            select: {
                id: true,
                name: true,
                term: {
                    select: {
                        type: true,
                        academicYear: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            },
            take: 10
        })

        return { courses, error: undefined }
    } catch (error) {
        console.error("Error searching courses:", error)
        return { courses: [], error: "Failed to search courses" }
    }
}

export async function deleteMaterial(materialId: string) {
    try {
        const user = await getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        const material = await prisma.material.findUnique({
            where: { id: materialId }
        })

        if (!material || material.teacherId !== user.id) {
            return { success: false, error: "Unauthorized or material not found" }
        }

        // Delete associated file if it exists
        if (material.fileUrl) {
            if (material.fileUrl.startsWith("/api/files/")) {
                const relativePath = material.fileUrl.replace(/^\/api\/files\//, "")
                const fullPath = path.join(process.cwd(), "uploads", relativePath)
                unlink(fullPath).catch(() => { })
            }
        }

        await prisma.material.update({
            where: { id: materialId },
            data: {
                deletedAt: new Date(),
                fileUrl: "" // Clear the file URL since we deleted the file
            }
        })

        revalidatePath("/teacher/materials")
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error deleting material:", error)
        return { success: false, error: "Failed to delete material" }
    }
}

export async function updateMaterial(
    materialId: string,
    title: string,
    description: string,
    fileUrl: string | null,
    linkUrl: string | null,
    // type: string // Deprecated
) {
    try {
        const user = await getUser()
        if (!user) return { success: false, material: null, error: "Unauthorized" }

        const material = await prisma.material.findUnique({
            where: { id: materialId }
        })

        if (!material || material.teacherId !== user.id) {
            return { success: false, material: null, error: "Unauthorized or material not found" }
        }

        // Delete old file if it's being replaced
        if (material.fileUrl && material.fileUrl !== fileUrl) {
            console.log("Replacing Material file. Old:", material.fileUrl)
            // Local File Deletion
            if (material.fileUrl.startsWith("/api/files/")) {
                const relativePath = material.fileUrl.replace(/^\/api\/files\//, "")
                const fullPath = path.join(process.cwd(), "uploads", relativePath)
                unlink(fullPath).catch((err) => {
                    console.warn(`Bg unlink error: ${fullPath}`, err)
                })
            }
        }

        const updated = await prisma.material.update({
            where: { id: materialId },
            data: {
                title,
                description,
                fileUrl,
                linkUrl,
                materialType: "HYBRID"
            }
        })

        revalidatePath("/teacher/materials")
        return { success: true, material: updated, error: undefined }
    } catch (error) {
        console.error("Error updating material:", error)
        return { success: false, material: null, error: "Failed to update material" }
    }
}
