import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspaceActions } from "@/components/workspace/workspace-page"

interface MaterialPageProps {
    params: Promise<{
        courseId: string
        materialId: string
    }>
}

export default async function MaterialPage({ params }: MaterialPageProps) {
    const { courseId, materialId } = await params
    const session = await auth()

    if (!session?.user) {
        return redirect("/")
    }

    const material = await db.material.findUnique({
        where: {
            id: materialId,
            courseId: courseId,
        },
    })

    if (!material) {
        return redirect(`/teacher/courses/${courseId}/materials`)
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4">
            <MobileHeaderSetter title={material.title} subtitle={`Uploaded ${format(new Date(material.uploadedAt), "MMM d, yyyy")}`} />
            <WorkspaceActions>
                    {material.fileUrl && (
                        <Button variant="outline" asChild>
                            <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" download>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </a>
                        </Button>
                    )}
                    <Button asChild>
                        <Link href={`/teacher/courses/${courseId}/materials/${materialId}/edit`}>
                            Edit
                        </Link>
                    </Button>
            </WorkspaceActions>

            {material.description && (
                <div className="bg-muted/50 p-4 rounded-lg text-sm">
                    <p>{material.description}</p>
                </div>
            )}

            <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border">
                <iframe
                    src={material.fileUrl || undefined}
                    className="w-full h-full"
                    title={material.title}
                />
            </div>
        </div>
    )
}
