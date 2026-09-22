import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { notFound } from "next/navigation"
import { getUser } from "@/lib/actions/user.actions"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspaceActions } from "@/components/workspace/workspace-page"

export default async function MaterialViewPage({ params }: { params: Promise<{ materialId: string }> }) {
    const { materialId } = await params
    const user = await getUser()

    if (!user) return <div>Unauthorized</div>

    const material = await db.material.findUnique({
        where: { id: materialId }
    })

    if (!material) {
        return notFound()
    }

    // Basic authorization check: Teacher must own the material
    if (material.teacherId !== user.id) {
        return <div>Unauthorized</div>
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4">
            <MobileHeaderSetter title={material.title} subtitle={material.description || "Study material"} backLink="/teacher/materials" />
            <WorkspaceActions>
                <Button asChild>
                    <a href={`${material.fileUrl}?download=true`} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </a>
                </Button>
            </WorkspaceActions>

            <div className="flex-1 border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                {material.fileUrl ? (
                    <iframe
                        src={material.fileUrl}
                        className="w-full h-full"
                        title={material.title}
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                        No file available
                    </div>
                )}
            </div>
        </div>
    )
}
