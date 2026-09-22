import { GradingScaleForm } from "@/components/admin/grading/grading-scale-form"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"

export default function GradingPage() {
    return (
        <WorkspacePage>
            <MobileHeaderSetter title="Grading Settings" subtitle="Configure global grading standards and defaults." />

            <div className="max-w-3xl">
                <GradingScaleForm />
            </div>
        </WorkspacePage>
    )
}
