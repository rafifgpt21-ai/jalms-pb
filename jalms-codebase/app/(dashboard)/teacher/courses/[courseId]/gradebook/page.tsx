import { AlertCircle } from "lucide-react"

import { getCourseGradebook } from "@/lib/actions/teacher.actions"
import { GradebookView, type GradebookData } from "@/components/teacher/gradebook/gradebook-view"

export default async function GradebookPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const response = await getCourseGradebook(courseId)

  if (!("gradebook" in response) || !response.gradebook) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <p className="mt-3 font-semibold text-destructive">Gradebook unavailable</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {response.error || "Gradebook not found"}
        </p>
      </div>
    )
  }

  return <GradebookView data={response as GradebookData} />
}
