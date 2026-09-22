import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { NewMaterialForm } from "@/components/teacher/materials/new-material-form"
import { WorkspacePage } from "@/components/workspace/workspace-page"

export default function NewMaterialPage() {
    return (
        <WorkspacePage className="mx-auto max-w-4xl">
            <MobileHeaderSetter title="Add study material" subtitle="Create a reusable resource for your courses." />
            <NewMaterialForm />
        </WorkspacePage>
    )
}
