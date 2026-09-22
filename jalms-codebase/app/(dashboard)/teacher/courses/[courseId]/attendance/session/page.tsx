import { auth } from "@/auth"
import { getCourseAttendance } from "@/lib/actions/attendance.actions"
import { AttendanceForm } from "@/components/teacher/attendance/attendance-form"
import { getPeriodLabel } from "@/lib/helpers/period-label"
import { format } from "date-fns"
import { notFound } from "next/navigation"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"

export default async function CourseAttendanceSessionPage({
    params,
    searchParams,
}: {
    params: Promise<{ courseId: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await auth()
    if (!session?.user?.id) return <div>Not authenticated</div>

    const { courseId } = await params
    const resolvedSearchParams = await searchParams
    const dateParam = typeof resolvedSearchParams.date === 'string' ? resolvedSearchParams.date : undefined
    const date = dateParam ? new Date(dateParam) : new Date()
    const periodParam = typeof resolvedSearchParams.period === 'string' ? resolvedSearchParams.period : "1"
    const period = parseInt(periodParam)

    const { course, students, topic, error } = await getCourseAttendance(courseId, date, period)

    if (error || !course) {
        if (error === "Course not found") return notFound()
        return <div>Error: {error}</div>
    }

    return (
        <WorkspacePage>
            <MobileHeaderSetter
                title={`${course.name} attendance`}
                subtitle={`${getPeriodLabel(period)} · ${course.class?.name || "Course"} · ${format(date, "MMM d, yyyy")}`}
            />

            <AttendanceForm
                courseId={courseId}
                date={date}
                period={period}
                initialStudents={students}
                initialTopic={topic || ""}
            />
        </WorkspacePage>
    )
}
