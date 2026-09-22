import { notFound } from "next/navigation"
import { MaterialList } from "@/components/teacher/materials/material-list"
import { CourseMaterialPicker } from "@/components/teacher/materials/course-material-picker"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"
import { getTeacherMaterials } from "@/lib/actions/material.actions"
import { getCourseWorkspace } from "@/lib/actions/course-workspace.actions"

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const [access, result] = await Promise.all([getCourseWorkspace(courseId, "teacher"), getTeacherMaterials()])
  if (!access.course) notFound()
  const materials = (result.materials || []).filter((material: any) => material.courseId === courseId || material.assignments?.some((assignment: any) => assignment.courseId === courseId))
  return <WorkspacePage>
    <MobileHeaderSetter title="Course materials" subtitle="Resources your students can access from this course." />
    <MaterialList
      materials={materials}
      isTeacher
      courseId={courseId}
      variant="course"
      toolbarAction={<CourseMaterialPicker courseId={courseId} materials={result.materials || []} />}
    />
  </WorkspacePage>
}
