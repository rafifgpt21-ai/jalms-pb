import { getSubjects } from "@/lib/actions/subject.actions"
import { SubjectList } from "@/components/admin/subjects/subject-list"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"

export const dynamic = "force-dynamic"

export default async function SubjectsPage() {
    const { subjects } = await getSubjects()

    return (
        <WorkspacePage>
            <MobileHeaderSetter title="Subjects" subtitle="Three-letter subject identities shared across courses." />
            <SubjectList subjects={subjects} />
        </WorkspacePage>
    )
}
