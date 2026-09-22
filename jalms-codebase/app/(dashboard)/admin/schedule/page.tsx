import { getTeachersWithCourses } from "@/lib/actions/teacher.actions"
import { MasterScheduleManager } from "@/components/admin/schedule/master-schedule-manager"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"

export const dynamic = "force-dynamic"

export default async function SchedulePage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string }>
}) {
    const params = await searchParams
    const { teachers, error } = await getTeachersWithCourses(params.search)

    if (error) {
        return <div className="p-6 text-red-500">Error loading schedule: {error}</div>
    }

    return (
        <WorkspacePage className="h-full">
            <MobileHeaderSetter title="Schedule Manager" subtitle="Build and review teaching schedules across the active semester." />
            <MasterScheduleManager teachers={(teachers as any) || []} />
        </WorkspacePage>
    )
}
