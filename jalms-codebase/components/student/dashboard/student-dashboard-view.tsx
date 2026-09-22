import Link from "next/link"
import { format, isPast, isToday } from "date-fns"
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, GraduationCap } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { DashboardMetricStrip, DashboardPreviewList, DashboardSectionHeading } from "@/components/dashboard/dashboard-primitives"
import { WorkspacePanel } from "@/components/workspace/workspace-page"
import { getPeriodLabel } from "@/lib/helpers/period-label"

interface StudentScheduleItem {
  id: string
  courseId: string
  period: number
  topic: string | null
  course: { name: string; reportName?: string | null; teacher: { name: string }; subject?: { name: string; reportName?: string | null } | null }
}

interface StudentDeadlineItem {
  id: string
  courseId: string
  title: string
  dueDate: Date | string
  submissions: Array<{ id: string }>
  course: { name: string; reportName?: string | null; subject?: { name: string; reportName?: string | null } | null }
}

interface StudentGradeItem {
  grade: number | null
  assignment: { title: string }
}

export function StudentUpNextCard({ schedule }: { schedule: StudentScheduleItem[] }) {
  const nextClass = schedule[0]
  const courseHref = nextClass ? `/student/courses/${nextClass.courseId}` : "/student/schedule"

  return (
    <WorkspacePanel className="overflow-hidden">
      <DashboardSectionHeading
        title="Up next"
        description={format(new Date(), "EEEE, MMMM d")}
        action={<Button asChild size="sm" variant="ghost"><Link href="/student/schedule">Schedule<ArrowRight /></Link></Button>}
      />
      <Link href={courseHref} className="group flex min-h-28 items-center gap-4 px-4 py-4 transition-colors hover:bg-[var(--workspace-row-hover)]">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"><Clock3 className="size-5" /></span>
        {nextClass ? (
          <>
            <span className="min-w-0 flex-1"><span className="block text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{getPeriodLabel(nextClass.period)}</span><span className="mt-1 block truncate text-base font-semibold">{nextClass.course.subject?.reportName || nextClass.course.reportName || nextClass.course.name}</span><span className="block truncate text-xs text-muted-foreground">{nextClass.course.teacher.name}{nextClass.topic ? ` · ${nextClass.topic}` : ""}</span></span>
            <span className="hidden text-right sm:block"><span className="block text-sm font-semibold tabular-nums">{schedule.length}</span><span className="text-xs text-muted-foreground">classes today</span></span>
          </>
        ) : (
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">No classes scheduled today</span><span className="block text-xs text-muted-foreground">Review upcoming work or continue learning.</span></span>
        )}
        <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      </Link>
    </WorkspacePanel>
  )
}

export function StudentScheduleCard({ schedule }: { schedule: StudentScheduleItem[] }) {
  return (
    <WorkspacePanel className="overflow-hidden">
      <DashboardSectionHeading
        title="Today’s schedule"
        description={`${schedule.length} class${schedule.length === 1 ? "" : "es"}`}
        action={<Button asChild size="sm" variant="ghost"><Link href="/student/schedule">View all<ArrowRight /></Link></Button>}
      />
      <DashboardPreviewList
        items={schedule}
        getKey={(slot) => slot.id}
        viewAllHref="/student/schedule"
        showViewAllFooter={false}
        renderItem={(slot) => (
          <Link href={`/student/courses/${slot.courseId}`} className="group grid min-h-14 grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--workspace-row-hover)]">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">{getPeriodLabel(slot.period)}</span>
            <span className="min-w-0"><span className="block truncate text-sm font-medium">{slot.course.subject?.reportName || slot.course.reportName || slot.course.name}</span><span className="block truncate text-xs text-muted-foreground">{slot.course.teacher.name}{slot.topic ? ` · ${slot.topic}` : ""}</span></span>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground" />
          </Link>
        )}
        empty={<div className="px-4 py-8 text-center"><p className="text-sm font-medium">Your schedule is clear</p><p className="mt-1 text-xs text-muted-foreground">There are no classes today.</p></div>}
      />
    </WorkspacePanel>
  )
}

export function StudentDeadlinesWidget({ upcomingDeadlines }: { upcomingDeadlines: StudentDeadlineItem[] }) {
  return (
    <WorkspacePanel className="overflow-hidden">
      <DashboardSectionHeading
        title="Deadlines"
        description="Work that needs attention"
        action={<Button asChild size="sm" variant="ghost"><Link href="/student/courses">Courses<ArrowRight /></Link></Button>}
      />
      <DashboardPreviewList
        items={upcomingDeadlines}
        getKey={(assignment) => assignment.id}
        viewAllHref="/student/courses"
        showViewAllFooter={false}
        renderItem={(assignment) => {
          const submitted = assignment.submissions.length > 0
          const overdue = !submitted && isPast(new Date(assignment.dueDate))
          return (
            <Link href={`/student/courses/${assignment.courseId}/tasks/${assignment.id}`} className="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--workspace-row-hover)]">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">{submitted ? <CheckCircle2 className="size-4 text-emerald-600" /> : <BookOpen className="size-4" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{assignment.title}</span><span className="block truncate text-xs text-muted-foreground">{assignment.course.subject?.reportName || assignment.course.reportName || assignment.course.name} · {format(new Date(assignment.dueDate), "MMM d, h:mm a")}</span></span>
              <StatusBadge status={submitted ? "SUBMITTED" : overdue ? "OVERDUE" : isToday(new Date(assignment.dueDate)) ? "PENDING" : "TODO"} label={submitted ? "Submitted" : overdue ? "Overdue" : isToday(new Date(assignment.dueDate)) ? "Due today" : "To do"} />
            </Link>
          )
        }}
        empty={<div className="px-4 py-8 text-center"><p className="text-sm font-medium">No upcoming deadlines</p><p className="mt-1 text-xs text-muted-foreground">You’re caught up for now.</p></div>}
      />
    </WorkspacePanel>
  )
}

export function StudentGradesWidget({ recentGrades, deadlinesCount }: { recentGrades: StudentGradeItem[]; deadlinesCount: number }) {
  const latestGrade = recentGrades[0]
  return <DashboardMetricStrip metrics={[
    { href: "/student/courses", icon: CalendarDays, value: deadlinesCount, label: "Open deadlines", description: "Submitted and pending work" },
    { href: "/student/grades", icon: GraduationCap, value: latestGrade?.grade != null ? `${Math.round(latestGrade.grade)}%` : "—", label: "Latest grade", description: latestGrade ? latestGrade.assignment.title : "No graded work yet" },
  ]} />
}
