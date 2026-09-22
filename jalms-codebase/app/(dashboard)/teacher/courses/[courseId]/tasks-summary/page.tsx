import { getCourseTaskSummary } from "@/lib/actions/teacher.actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/ui/status-badge"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  ListChecks,
  Users,
} from "lucide-react"
import {
  RecordPanelHeader,
  RecordStat,
  RecordStats,
} from "@/components/teacher/records/records-page"

type TaskStatus = "MISSING" | "SUBMITTED" | "GRADED" | "PENDING"

function TaskResult({ status, grade }: { status: TaskStatus; grade: number | null }) {
  if (status === "GRADED") {
    return (
      <span className="inline-flex min-w-12 items-center justify-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        {grade ?? 0}%
      </span>
    )
  }

  return (
    <StatusBadge
      status={status}
      label={status === "SUBMITTED" ? "Turned in" : status === "PENDING" ? "Upcoming" : "Missing"}
      className="justify-center text-[10px]"
    />
  )
}

export default async function TasksSummaryPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const response = await getCourseTaskSummary(courseId)

  if ("error" in response) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        We couldn&apos;t load this task summary. {response.error}
      </div>
    )
  }

  const { data: students = [], assignments = [], courseName } = response
  const allTasks = students.flatMap((student) => student.tasks)
  const submittedCount = allTasks.filter((task) => task.status === "SUBMITTED" || task.status === "GRADED").length
  const missingCount = allTasks.filter((task) => task.status === "MISSING").length
  const submissionRate = allTasks.length ? Math.round((submittedCount / allTasks.length) * 100) : 0

  return (
    <div className="space-y-3">
      <MobileHeaderSetter title="Task Summary" subtitle={`${courseName} · Course records`} />

      <RecordStats>
        <RecordStat label="Students" value={students.length} detail="enrolled" icon={Users} tone="indigo" />
        <RecordStat label="Assignments" value={assignments.length} detail="total" icon={ListChecks} tone="sky" />
        <RecordStat label="Turned in" value={`${submissionRate}%`} detail={`${submittedCount} submissions`} icon={ClipboardCheck} tone="emerald" />
        <RecordStat label="Missing" value={missingCount} detail="overdue" icon={AlertTriangle} tone={missingCount ? "rose" : "emerald"} />
      </RecordStats>

      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <RecordPanelHeader
          title="Student progress"
          description={`${students.length} students across ${assignments.length} assignments`}
          trailing={
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <StatusBadge status="GRADED" label="Graded" />
              <StatusBadge status="SUBMITTED" label="Turned in" />
              <StatusBadge status="MISSING" label="Missing" />
            </div>
          }
        />

        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <Users className="mb-3 size-8 text-muted-foreground/50" />
            <p className="font-semibold">No students enrolled</p>
            <p className="mt-1 text-sm text-muted-foreground">Students will appear here after they join the course.</p>
          </div>
        ) : (
          <>
            <div className="hidden p-3 md:block">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky left-0 z-20 min-w-56 border-r bg-muted">Student</TableHead>
                    {assignments.map((assignment) => (
                      <TableHead key={assignment.id} className="min-w-32 border-r text-center last:border-r-0">
                        <div className="mx-auto max-w-36 normal-case tracking-normal">
                          <span className="block truncate text-xs font-semibold text-foreground" title={assignment.title}>
                            {assignment.title}
                          </span>
                          <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                            {assignment.dueDate
                              ? new Date(assignment.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                              : "No due date"}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.studentId} className="group">
                      <TableCell className="sticky left-0 z-10 border-r bg-card group-hover:bg-[var(--workspace-row-hover)]">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8 border">
                            <AvatarImage src={student.studentAvatar || undefined} />
                            <AvatarFallback className="text-xs font-bold">{student.studentName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="max-w-40 truncate font-semibold" title={student.studentName}>{student.studentName}</span>
                        </div>
                      </TableCell>
                      {student.tasks.map((task) => (
                        <TableCell key={task.assignmentId} className="border-r text-center last:border-r-0">
                          <TaskResult status={task.status} grade={task.grade} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y md:hidden">
              {students.map((student) => {
                const completed = student.tasks.filter((task) => task.status === "SUBMITTED" || task.status === "GRADED").length
                const missing = student.tasks.filter((task) => task.status === "MISSING").length
                const progress = student.tasks.length ? Math.round((completed / student.tasks.length) * 100) : 0

                return (
                  <article key={student.studentId} className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 border">
                        <AvatarImage src={student.studentAvatar || undefined} />
                        <AvatarFallback className="font-bold">{student.studentName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-sm font-bold">{student.studentName}</h3>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{progress}%</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {completed} of {student.tasks.length} turned in{missing > 0 ? ` · ${missing} missing` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 overflow-hidden rounded-lg border">
                      {student.tasks.map((task, index) => (
                        <div key={task.assignmentId} className="flex items-center justify-between gap-3 border-b px-3 py-2.5 last:border-b-0">
                          <div className="flex min-w-0 items-center gap-2">
                            {task.status === "GRADED" || task.status === "SUBMITTED"
                              ? <FileCheck2 className="size-4 shrink-0 text-emerald-600" />
                              : task.status === "MISSING"
                                ? <AlertTriangle className="size-4 shrink-0 text-rose-600" />
                                : <CheckCircle2 className="size-4 shrink-0 text-muted-foreground/50" />}
                            <span className="truncate text-xs font-medium">{assignments[index]?.title ?? task.assignmentTitle}</span>
                          </div>
                          <TaskResult status={task.status} grade={task.grade} />
                        </div>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
