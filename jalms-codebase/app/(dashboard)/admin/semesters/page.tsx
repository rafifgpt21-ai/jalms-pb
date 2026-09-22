import { Suspense } from "react"
import { getSemesters } from "@/lib/actions/academic-year.actions"
import { SemesterList } from "@/components/admin/academic/semester-list"
import { SemesterModal } from "@/components/admin/academic/semester-modal"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspaceActions, WorkspacePage } from "@/components/workspace/workspace-page"

export const dynamic = "force-dynamic"

export default async function SemestersPage() {
    console.log("SemestersPage: Rendering...")
    const { terms, error } = await getSemesters()
    console.log("SemestersPage: Received terms:", terms?.length)

    if (error) {
        console.error("SemestersPage: Error:", error)
        return <div>Error loading semesters</div>
    }

    return (
        <WorkspacePage>
            <MobileHeaderSetter title="Semester Manager" subtitle="Control academic periods and the semester currently in use." />
            <WorkspaceActions>
                <SemesterModal />
            </WorkspaceActions>

            <Suspense fallback={<div>Loading...</div>}>
                <SemesterList terms={terms || []} />
            </Suspense>
        </WorkspacePage>
    )
}
