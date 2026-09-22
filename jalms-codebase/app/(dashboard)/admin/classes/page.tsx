import { Suspense } from "react"
import { getClasses, getHomeroomTeachers, getActiveTerms } from "@/lib/actions/class.actions"
import { ClassList } from "@/components/admin/classes/class-list"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"
import { TablePanelSkeleton } from "@/components/navigation/route-skeletons"

export const dynamic = "force-dynamic"

async function ClassesContent() {
    const [classesData, teachersData, termsData] = await Promise.all([
        getClasses(),
        getHomeroomTeachers(),
        getActiveTerms()
    ])

    const classes = classesData.classes || []
    const teachers = teachersData.teachers || []
    const terms = termsData.terms || []

    const error = classesData.error || teachersData.error || termsData.error

    if (error) {
        return <div className="p-6 text-red-500">Error loading data: {error}</div>
    }

    return <ClassList classes={classes} teachers={teachers} terms={terms} />
}

export default function ClassesPage() {
    return <WorkspacePage>
        <MobileHeaderSetter title="Classes" subtitle="Manage rosters, class colors, homeroom teachers, and linked courses." />
        <Suspense fallback={<TablePanelSkeleton />}><ClassesContent /></Suspense>
    </WorkspacePage>
}
