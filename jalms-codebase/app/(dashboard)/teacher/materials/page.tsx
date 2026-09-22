import { getTeacherMaterials } from "@/lib/actions/material.actions"
import { MaterialList } from "@/components/teacher/materials/material-list"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"

export const dynamic = 'force-dynamic'

export default async function TeacherMaterialsPage() {
    const { materials, folders, error } = await getTeacherMaterials()

    if (error) {
        return <div>Error loading materials</div>
    }

    return (
        <WorkspacePage>
            <MobileHeaderSetter title="Material Library" subtitle="Organize resources once, then reuse them across your courses." />
            <MaterialList materials={materials || []} folders={folders || []} isTeacher variant="library" />
        </WorkspacePage>
    )
}
