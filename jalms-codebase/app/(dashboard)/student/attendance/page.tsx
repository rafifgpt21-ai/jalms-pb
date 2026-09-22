import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, CalendarCheck, Check, ShieldCheck, X } from "lucide-react"
import { getUser } from "@/lib/actions/user.actions"
import { db as prisma } from "@/lib/db"
import { cn } from "@/lib/utils"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { StudentAttendanceContentSkeleton } from "@/components/navigation/route-skeletons"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/ui/status-badge"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"

type AttendanceCounts = {
  present: number
  absent: number
  excused: number
  total: number
}

function countAttendance(records: { status: string }[]): AttendanceCounts {
  return records.reduce<AttendanceCounts>((counts, record) => {
    if (record.status === "SKIPPED") return counts
    counts.total += 1
    if (record.status === "PRESENT") counts.present += 1
    if (record.status === "ABSENT") counts.absent += 1
    if (record.status === "EXCUSED") counts.excused += 1
    return counts
  }, { present: 0, absent: 0, excused: 0, total: 0 })
}

function getRate(counts: AttendanceCounts) {
  return counts.total > 0 ? Math.round(((counts.present + counts.excused) / counts.total) * 100) : null
}

function getStanding(rate: number | null) {
  if (rate === null) return { status: "N/A", label: "No records" }
  if (rate < 75) return { status: "CRITICAL", label: "Critical" }
  if (rate < 85) return { status: "WARNING", label: "Warning" }
  return { status: "GOOD", label: "Good" }
}

const summaryItems = [
  { key: "rate", label: "Attendance", icon: CalendarCheck, tone: "text-indigo-600 dark:text-indigo-300" },
  { key: "present", label: "Present", icon: Check, tone: "text-emerald-600 dark:text-emerald-400" },
  { key: "absent", label: "Absent", icon: X, tone: "text-red-600 dark:text-red-400" },
  { key: "excused", label: "Excused", icon: ShieldCheck, tone: "text-amber-600 dark:text-amber-400" },
] as const

async function AttendanceContent() {
  const user = await getUser()
  if (!user?.id) redirect("/login")

  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { studentIds: { has: user.id } },
        { courseEnrollments: { some: { studentId: user.id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] } } },
      ],
      term: { isActive: true },
      deletedAt: { isSet: false },
    },
    select: {
      id: true,
      name: true,
      reportName: true,
      class: { select: { name: true } },
      attendances: {
        where: { studentId: user.id, deletedAt: { isSet: false } },
        select: { status: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const rows: any[] = courses.map((course: any) => {
    const counts = countAttendance(course.attendances)
    const rate = getRate(counts)
    return { ...course, counts, rate, standing: getStanding(rate) }
  })

  const totals = rows.reduce((result: AttendanceCounts, course: any) => ({
    present: result.present + course.counts.present,
    absent: result.absent + course.counts.absent,
    excused: result.excused + course.counts.excused,
    total: result.total + course.counts.total,
  }), { present: 0, absent: 0, excused: 0, total: 0 })
  const overallRate = getRate(totals)
  const summaryValues = {
    rate: overallRate === null ? "—" : `${overallRate}%`,
    present: totals.present,
    absent: totals.absent,
    excused: totals.excused,
  }

  return (
    <>
      <WorkspacePanel className="grid grid-cols-2 overflow-hidden sm:grid-cols-4">
        {summaryItems.map(({ key, label, icon: Icon, tone }, index) => (
          <div
            key={key}
            className={cn(
              "flex min-h-16 items-center gap-2.5 px-3 py-2.5",
              index % 2 !== 0 && "border-l",
              index >= 2 && "border-t sm:border-t-0",
              index > 0 && "sm:border-l",
            )}
          >
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md bg-muted", tone)}><Icon className="size-4" /></span>
            <div className="min-w-0">
              <div className="text-lg font-semibold tabular-nums leading-5">{summaryValues[key]}</div>
              <div className="truncate text-xs text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </WorkspacePanel>

      <WorkspacePanel className="overflow-hidden">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3 py-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Course attendance</h2>
            <p className="truncate text-xs text-muted-foreground">
              {rows.length} active {rows.length === 1 ? "course" : "courses"} · {totals.total} recorded {totals.total === 1 ? "session" : "sessions"}
            </p>
          </div>
          {overallRate !== null && <StatusBadge {...getStanding(overallRate)} />}
        </div>

        {rows.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-4 py-10 text-center">
            <CalendarCheck className="size-6 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold">No active courses</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Your course attendance will appear here after you are enrolled in an active course.</p>
          </div>
        ) : (
          <>
            <div className="divide-y md:hidden">
              {rows.map((course) => (
                <Link
                  key={course.id}
                  href={`/student/courses/${course.id}/attendance`}
                  prefetch
                  className="block min-h-11 p-3 transition-colors hover:bg-[var(--workspace-row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{course.reportName || course.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{course.class?.name || "Independent course"} · {course.counts.total} {course.counts.total === 1 ? "session" : "sessions"}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2"><StatusBadge status={course.standing.status} label={course.standing.label} /><ArrowRight className="size-4 text-muted-foreground" /></div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={course.rate ?? 0} className="h-1.5 flex-1" aria-label={`${course.rate ?? 0}% attendance`} />
                    <span className="w-9 text-right text-sm font-semibold tabular-nums">{course.rate === null ? "—" : `${course.rate}%`}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 divide-x rounded-md border bg-muted/20">
                    <AttendanceMetric value={course.counts.present} label="Present" tone="text-emerald-600 dark:text-emerald-400" />
                    <AttendanceMetric value={course.counts.absent} label="Absent" tone="text-red-600 dark:text-red-400" />
                    <AttendanceMetric value={course.counts.excused} label="Excused" tone="text-amber-600 dark:text-amber-400" />
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden md:block">
              <div className="grid min-h-9 grid-cols-[minmax(14rem,1.25fr)_7rem_minmax(11rem,.65fr)_6.5rem_2rem] items-center gap-4 bg-muted/45 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <div>Course</div><div>Sessions</div><div>Attendance</div><div>Status</div><span className="sr-only">Open</span>
              </div>
              <div className="divide-y">
                {rows.map((course) => (
                  <Link
                    key={course.id}
                    href={`/student/courses/${course.id}/attendance`}
                    prefetch
                    className="grid min-h-14 grid-cols-[minmax(14rem,1.25fr)_7rem_minmax(11rem,.65fr)_6.5rem_2rem] items-center gap-4 px-3 transition-colors hover:bg-[var(--workspace-row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <div className="min-w-0"><div className="truncate text-sm font-medium">{course.reportName || course.name}</div><div className="truncate text-xs text-muted-foreground">{course.class?.name || "Independent course"}</div></div>
                    <div><div className="text-sm font-medium tabular-nums">{course.counts.total}</div><div className="text-xs text-muted-foreground">P {course.counts.present} · A {course.counts.absent} · E {course.counts.excused}</div></div>
                    <div className="flex items-center gap-3"><Progress value={course.rate ?? 0} className="h-1.5 flex-1" aria-label={`${course.rate ?? 0}% attendance`} /><span className="w-9 text-right text-sm font-semibold tabular-nums">{course.rate === null ? "—" : `${course.rate}%`}</span></div>
                    <StatusBadge status={course.standing.status} label={course.standing.label} className="w-fit" />
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </WorkspacePanel>
    </>
  )
}

function AttendanceMetric({ value, label, tone }: { value: number; label: string; tone: string }) {
  return <div className="min-w-0 px-2 py-2 text-center"><div className={cn("text-sm font-semibold tabular-nums", tone)}>{value}</div><div className="truncate text-[10px] text-muted-foreground">{label}</div></div>
}

export default function StudentAttendancePage() {
  return (
    <WorkspacePage>
      <MobileHeaderSetter title="My Attendance" subtitle="Attendance by course and active semester" />
      <Suspense fallback={<StudentAttendanceContentSkeleton />}><AttendanceContent /></Suspense>
    </WorkspacePage>
  )
}
