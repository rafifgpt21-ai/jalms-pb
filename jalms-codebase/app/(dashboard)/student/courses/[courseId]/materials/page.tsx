import { db } from "@/lib/db"
import { MaterialList } from "@/components/teacher/materials/material-list"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"

export default async function StudentCourseMaterialsPage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = await params
    const materials = await db.material.findMany({
        where: {
            assignments: {
                some: {
                    courseId: courseId
                }
            },
            deletedAt: { isSet: false }
        },
        orderBy: {
            uploadedAt: 'desc'
        }
    })

    return (
        <WorkspacePage>
            <MobileHeaderSetter title="Study materials" subtitle="Read, open, or download resources shared for this course." />
            <MaterialList materials={materials} isTeacher={false} courseId={courseId} variant="course" />
        </WorkspacePage>
    )
}
