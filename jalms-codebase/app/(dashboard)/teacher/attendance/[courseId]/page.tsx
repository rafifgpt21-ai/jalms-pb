import { auth } from "@/auth"
import { getCourseAttendance } from "@/lib/actions/attendance.actions"
import { AttendanceForm } from "@/components/teacher/attendance/attendance-form"
import { Button } from "@/components/ui/button"
import { WorkspacePage } from "@/components/workspace/workspace-page"
import { getPeriodLabel } from "@/lib/helpers/period-label"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"

export default async function CourseAttendancePage({
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
    const dateParam = typeof resolvedSearchParams.date === "string" ? resolvedSearchParams.date : undefined
    const date = dateParam ? new Date(dateParam) : new Date()
    const periodParam = resolvedSearchParams.period
    const period = typeof periodParam === "string" ? parseInt(periodParam) : 1

    const { course, students, topic, error } = await getCourseAttendance(courseId, date, period)

    if (error || !course) {
        if (error === "Course not found") return notFound()
        return <div>Error: {error}</div>
    }

    const returnHref = `/teacher/attendance?date=${format(date, "yyyy-MM-dd")}`

    return (
        <WorkspacePage>
            <MobileHeaderSetter
                title={`${course.name} attendance`}
                subtitle={`${getPeriodLabel(period)} · ${course.class?.name || "Course"} · ${format(date, "MMM d, yyyy")}`}
                backLink={returnHref}
                rightAction={
                    <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
                        <Link href={returnHref}>
                            <ArrowLeft className="size-4" />
                            Daily schedule
                        </Link>
                    </Button>
                }
            />

            <AttendanceForm
                courseId={courseId}
                date={date}
                period={period}
                initialStudents={students}
                initialTopic={topic || ""}
                completionHref={returnHref}
            />
        </WorkspacePage>
    )
}
