import { db } from "@/lib/db"
import { MaterialForm } from "@/components/teacher/materials/material-form"
import { notFound } from "next/navigation"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"

export default async function EditMaterialPage({
    params,
}: {
    params: Promise<{ courseId: string; materialId: string }>
}) {
    const { courseId, materialId } = await params

    const material = await db.material.findUnique({
        where: {
            id: materialId,
            courseId,
            deletedAt: { isSet: false },
        },
    })

    if (!material) {
        notFound()
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <MobileHeaderSetter title="Edit Study Material" subtitle={material.title} />

            <MaterialForm courseId={courseId} initialData={material ? {
                id: material.id,
                title: material.title,
                description: material.description,
                fileUrl: material.fileUrl
            } : undefined} />
        </div>
    )
}
