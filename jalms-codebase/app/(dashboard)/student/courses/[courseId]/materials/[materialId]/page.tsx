import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { notFound } from "next/navigation"
import { getUser } from "@/lib/actions/user.actions"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspaceActions } from "@/components/workspace/workspace-page"

export default async function StudentMaterialViewPage({ params }: { params: Promise<{ courseId: string, materialId: string }> }) {
    const { courseId, materialId } = await params
    const user = await getUser()

    if (!user) return <div>Unauthorized</div>

    const material = await db.material.findUnique({
        where: { id: materialId },
        include: {
            assignments: true
        }
    })

    if (!material) {
        return notFound()
    }

    // Verify enrollment or assignment
    // For simplicity, check if material is assigned to the course
    const isAssigned = material.assignments.some(a => a.courseId === courseId)
    if (!isAssigned) {
        return <div>Unauthorized</div>
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4">
            <MobileHeaderSetter title={material.title} subtitle={material.description || "Study material"} />
            <WorkspaceActions>
                {material.fileUrl && (
                    <Button asChild>
                        <a href={`${material.fileUrl}?download=true`} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </a>
                    </Button>
                )}
            </WorkspaceActions>

            <div className="flex-1 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                <iframe
                    src={material.fileUrl || undefined}
                    className="w-full h-full"
                    title={material.title}
                />
            </div>
        </div>
    )
}
