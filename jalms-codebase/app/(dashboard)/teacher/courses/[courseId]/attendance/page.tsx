import { auth } from "@/auth"
import { getCourseAttendanceStats } from "@/lib/actions/attendance.actions"
import { AttendanceScoreDialog } from "@/components/teacher/attendance/attendance-score-dialog"
import { notFound } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/ui/status-badge"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { AlertTriangle, CalendarCheck2, CircleDollarSign, TrendingUp, Users } from "lucide-react"
import {
  RecordPanelHeader,
  RecordStat,
  RecordStats,
} from "@/components/teacher/records/records-page"
import { cn } from "@/lib/utils"

function percentageTone(value: number) {
  if (value >= 90) return "text-emerald-700 dark:text-emerald-300"
  if (value >= 75) return "text-amber-700 dark:text-amber-300"
  return "text-rose-700 dark:text-rose-300"
}

export default async function CourseAttendanceStatsPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Please sign in to view attendance.</div>
  }

  const { courseId } = await params
  const { course, studentsStats, attendancePoolScore, error } = await getCourseAttendanceStats(courseId)

  if (error || !course || !studentsStats) {
    if (error === "Course not found") return notFound()
    return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">We couldn&apos;t load attendance. {error}</div>
  }

  const averageAttendance = studentsStats.length
    ? Math.round(studentsStats.reduce((total, student) => total + student.attendancePercentage, 0) / studentsStats.length)
    : 0
  const totalSessions = studentsStats.reduce((highest, student) => Math.max(highest, student.totalSessions), 0)
  const needsAttention = studentsStats.filter((student) => student.attendancePercentage < 75).length

  return (
    <div className="space-y-3">
      <MobileHeaderSetter title="Attendance" subtitle={`${course.name} · Course records`} />

      <RecordStats>
        <RecordStat label="Students" value={studentsStats.length} detail="enrolled" icon={Users} tone="indigo" />
        <RecordStat label="Class average" value={`${averageAttendance}%`} detail="attendance" icon={TrendingUp} tone={averageAttendance >= 75 ? "emerald" : "rose"} />
        <RecordStat label="Sessions" value={totalSessions} detail="recorded" icon={CalendarCheck2} tone="sky" />
        <RecordStat label="Below 75%" value={needsAttention} detail="need attention" icon={AlertTriangle} tone={needsAttention ? "rose" : "emerald"} />
      </RecordStats>

      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <RecordPanelHeader
          title="Attendance overview"
          description={`Attendance contributes up to ${attendancePoolScore || 0} points to the course grade.`}
          trailing={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex h-8 items-center justify-center gap-2 rounded-lg bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                <CircleDollarSign className="size-4" />
                {attendancePoolScore || 0} point pool
              </div>
              <AttendanceScoreDialog courseId={courseId} currentScore={attendancePoolScore || 0} />
            </div>
          }
        />

        {studentsStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <Users className="mb-3 size-8 text-muted-foreground/50" />
            <p className="font-semibold">No attendance records yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Student attendance will appear after the first session.</p>
          </div>
        ) : (
          <>
            <div className="hidden p-3 md:block">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky left-0 z-20 min-w-52 border-r bg-muted">Student</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Excused</TableHead>
                    <TableHead className="text-center">Skipped</TableHead>
                    <TableHead className="text-center">Sessions</TableHead>
                    <TableHead className="min-w-36 text-center">Attendance</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsStats.map((stat) => (
                    <TableRow key={stat.student.id} className="group">
                      <TableCell className="sticky left-0 z-10 border-r bg-card font-semibold group-hover:bg-[var(--workspace-row-hover)]">
                        {stat.student.name}
                      </TableCell>
                      <TableCell className="text-center"><StatusBadge status="PRESENT" label={String(stat.presentCount)} /></TableCell>
                      <TableCell className="text-center"><StatusBadge status="ABSENT" label={String(stat.absentCount)} /></TableCell>
                      <TableCell className="text-center"><StatusBadge status="EXCUSED" label={String(stat.excusedCount)} /></TableCell>
                      <TableCell className="text-center text-muted-foreground">{stat.skippedCount}</TableCell>
                      <TableCell className="text-center">{stat.totalSessions}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full", stat.attendancePercentage >= 90 ? "bg-emerald-500" : stat.attendancePercentage >= 75 ? "bg-amber-500" : "bg-rose-500")}
                              style={{ width: `${stat.attendancePercentage}%` }}
                            />
                          </div>
                          <span className={cn("w-10 text-right text-xs font-bold", percentageTone(stat.attendancePercentage))}>{stat.attendancePercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-indigo-700 dark:text-indigo-300">{stat.attendanceScore} pts</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y md:hidden">
              {studentsStats.map((stat) => (
                <article key={stat.student.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold">{stat.student.name}</h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.totalSessions} recorded sessions</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-xl font-bold tracking-tight", percentageTone(stat.attendancePercentage))}>{stat.attendancePercentage}%</p>
                      <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">{stat.attendanceScore} pts</p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", stat.attendancePercentage >= 90 ? "bg-emerald-500" : stat.attendancePercentage >= 75 ? "bg-amber-500" : "bg-rose-500")}
                      style={{ width: `${stat.attendancePercentage}%` }}
                    />
                  </div>

                  <dl className="mt-3 grid grid-cols-4 gap-1.5">
                    <div className="rounded-lg bg-emerald-50 p-2 text-center dark:bg-emerald-950/50">
                      <dt className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Present</dt>
                      <dd className="mt-0.5 text-base font-bold text-emerald-800 dark:text-emerald-200">{stat.presentCount}</dd>
                    </div>
                    <div className="rounded-lg bg-rose-50 p-2 text-center dark:bg-rose-950/50">
                      <dt className="text-[9px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">Absent</dt>
                      <dd className="mt-0.5 text-base font-bold text-rose-800 dark:text-rose-200">{stat.absentCount}</dd>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2 text-center dark:bg-amber-950/50">
                      <dt className="text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Excused</dt>
                      <dd className="mt-0.5 text-base font-bold text-amber-800 dark:text-amber-200">{stat.excusedCount}</dd>
                    </div>
                    <div className="rounded-lg bg-muted p-2 text-center">
                      <dt className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Skipped</dt>
                      <dd className="mt-0.5 text-base font-bold">{stat.skippedCount}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
