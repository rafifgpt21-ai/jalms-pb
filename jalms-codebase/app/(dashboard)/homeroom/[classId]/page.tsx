import { getHomeroomClassDetails } from "@/lib/actions/homeroom.actions"
import { ClassDetailsView } from "@/components/homeroom/class-details-view"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{
        classId: string
    }>
}

export default async function HomeroomClassPage(props: PageProps) {
    const params = await props.params;

    const { classId } = params;

    const { classData, students, error } = await getHomeroomClassDetails(classId)

    if (error || !classData || !students) {
        return <WorkspacePage><WorkspacePanel className="border-destructive/30 px-4 py-8 text-center text-sm text-destructive">{error || "Failed to load class data"}</WorkspacePanel></WorkspacePage>
    }

    return (
        <WorkspacePage>
            <ClassDetailsView classData={classData} students={students!} />
        </WorkspacePage>
    )
}
