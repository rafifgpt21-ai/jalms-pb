import { getTeacherSchedule } from "@/lib/actions/schedule.actions"
import { db as prisma } from "@/lib/db"
import { ScheduleGrid } from "@/components/admin/schedule/schedule-grid"
import { notFound } from "next/navigation"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"

export const dynamic = "force-dynamic"

export default async function TeacherSchedulePage({
    params
}: {
    params: Promise<{ teacherId: string }>
}) {
    const { teacherId } = await params

    const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { id: true, name: true, email: true }
    })

    if (!teacher) {
        notFound()
    }

    const { courses, error } = await getTeacherSchedule(teacherId)

    if (error) {
        return <div className="p-6 text-red-500">Error loading schedule: {error}</div>
    }

    return (
        <WorkspacePage>
            <MobileHeaderSetter title={`Schedule: ${teacher.name}`} subtitle={teacher.email} backLink="/admin/schedule" />

            <ScheduleGrid teacherId={teacherId} initialCourses={courses || []} />
        </WorkspacePage>
    )
}
