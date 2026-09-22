import { cache } from "react"
import {
    getStudentSchedule,
    getStudentAssignments,
    getRecentGrades
} from "@/lib/actions/student.actions"
import { getUser } from "@/lib/actions/user.actions"
import { WorkspacePanel } from "@/components/workspace/workspace-page"
import {
    StudentUpNextCard,
    StudentScheduleCard,
    StudentDeadlinesWidget,
    StudentGradesWidget
} from "@/components/student/dashboard/student-dashboard-view"

const getDashboardStudentId = cache(async () => (await getUser())?.id)
const getCachedSchedule = cache((studentId: string) => getStudentSchedule(studentId))
const getCachedAssignments = cache((studentId: string) => getStudentAssignments(studentId))

function DashboardError({ label }: { label: string }) {
    return <WorkspacePanel className="border-destructive/30 px-4 py-6 text-center text-sm text-destructive">Unable to load {label}. Refresh to try again.</WorkspacePanel>
}

export async function DashboardUpNext() {
    const studentId = await getDashboardStudentId()
    if (!studentId) return <DashboardError label="your next class" />
    const { schedule, error } = await getCachedSchedule(studentId)
    if (error || !schedule) return <DashboardError label="your next class" />
    return <StudentUpNextCard schedule={schedule} />
}

export async function DashboardSchedule() {
    const studentId = await getDashboardStudentId()
    if (!studentId) return <DashboardError label="today's schedule" />
    const { schedule, error } = await getCachedSchedule(studentId)
    if (error || !schedule) return <DashboardError label="today's schedule" />
    return <StudentScheduleCard schedule={schedule} />
}

export async function DashboardDeadlines() {
    const studentId = await getDashboardStudentId()
    if (!studentId) return <DashboardError label="deadlines" />
    const { upcomingDeadlines, error } = await getCachedAssignments(studentId)
    if (error || !upcomingDeadlines) return <DashboardError label="deadlines" />
    return <StudentDeadlinesWidget upcomingDeadlines={upcomingDeadlines} />
}

export async function DashboardGrades() {
    const studentId = await getDashboardStudentId()
    if (!studentId) return <DashboardError label="grade summary" />
    const [{ recentGrades, error }, { upcomingDeadlines }] = await Promise.all([getRecentGrades(studentId), getCachedAssignments(studentId)])

    if (error || !recentGrades) return <DashboardError label="grade summary" />
    return <StudentGradesWidget recentGrades={recentGrades} deadlinesCount={upcomingDeadlines?.length || 0} />
}
