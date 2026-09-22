import Link from "next/link"
import { format } from "date-fns"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DashboardPreviewList, DashboardSectionHeading } from "@/components/dashboard/dashboard-primitives"
import { WorkspacePanel } from "@/components/workspace/workspace-page"
import { getPeriodLabel } from "@/lib/helpers/period-label"

interface TeacherScheduleItem {
  id: string
  courseId: string
  period: number
  topic: string | null
  course: { name: string; subject?: { name: string; reportName?: string | null } | null; class?: { name: string } | null }
}

interface TeacherAssignmentItem {
  id: string
  title: string
  type: string
  dueDate: Date | string
  course: { id: string; name: string; studentIds: string[]; courseEnrollments: Array<{ studentId: string }>; _count: { students: number } }
  submissions: Array<{ id: string }>
}

export function ClassesSection({ classesToday }: { classesToday: TeacherScheduleItem[] }) {
  return (
    <WorkspacePanel className="overflow-hidden">
      <DashboardSectionHeading
        title="Today’s classes"
        description={format(new Date(), "EEEE, MMMM d")}
        action={<Button asChild size="sm" variant="ghost"><Link href="/teacher/schedule" prefetch>Full schedule<ArrowRight /></Link></Button>}
      />
      <DashboardPreviewList
        items={classesToday}
        getKey={(schedule) => schedule.id}
        viewAllHref="/teacher/schedule"
        showViewAllFooter={false}
        renderItem={(schedule) => (
          <Link
            href={`/teacher/courses/${schedule.courseId}/attendance/session?date=${format(new Date(), "yyyy-MM-dd")}&period=${schedule.period}`}
            className="group grid min-h-14 grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--workspace-row-hover)]"
          >
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">{getPeriodLabel(schedule.period)}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{schedule.course.subject?.reportName || schedule.course.subject?.name || schedule.course.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{schedule.course.class?.name || schedule.course.name}{schedule.topic ? ` · ${schedule.topic}` : " · Topic not set"}</span>
            </span>
            <span className="hidden items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground sm:flex">Take attendance<ArrowRight className="size-3.5" /></span>
          </Link>
        )}
        empty={<div className="px-4 py-8 text-center"><p className="text-sm font-medium">No classes scheduled today</p><p className="mt-1 text-xs text-muted-foreground">Use the time to prepare upcoming lessons.</p></div>}
      />
    </WorkspacePanel>
  )
}

export function AssignmentsWidget({ allAssignments }: { allAssignments: TeacherAssignmentItem[] }) {
  return (
    <WorkspacePanel className="overflow-hidden">
      <DashboardSectionHeading title="Assignment progress" description={`${allAssignments.length} most recent assignment${allAssignments.length === 1 ? "" : "s"}`} />
      <DashboardPreviewList
        items={allAssignments}
        getKey={(assignment) => assignment.id}
        showAllLabel="Show all assignments"
        renderItem={(assignment) => {
          const graded = assignment.submissions.length
          const students = new Set([
            ...assignment.course.studentIds,
            ...assignment.course.courseEnrollments.map((enrollment) => enrollment.studentId),
          ]).size || assignment.course._count.students
          const progress = students ? Math.min(100, Math.round((graded / students) * 100)) : 0
          return (
            <Link href={`/teacher/courses/${assignment.course.id}/tasks/${assignment.id}`} className="group block px-4 py-3 transition-colors hover:bg-[var(--workspace-row-hover)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><Badge variant="outline" className="h-5 px-1.5 text-[10px]">{assignment.type === "SUBMISSION" ? "TASK" : assignment.type}</Badge><span className="truncate text-sm font-medium">{assignment.title}</span></div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{assignment.course.name} · due {format(new Date(assignment.dueDate), "MMM d")}</p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
                <span className="w-20 text-right text-[11px] text-muted-foreground tabular-nums">{graded}/{students} graded</span>
              </div>
            </Link>
          )
        }}
        empty={<div className="px-4 py-8 text-center"><p className="text-sm font-medium">No recent assignments</p><p className="mt-1 text-xs text-muted-foreground">New work will appear here.</p></div>}
      />
    </WorkspacePanel>
  )
}
