import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, BookOpen, CalendarDays, Clock3 } from "lucide-react"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { TeacherScheduleContentSkeleton } from "@/components/navigation/route-skeletons"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"
import { getTeacherWeeklySchedule } from "@/lib/actions/schedule.actions"
import { getUser } from "@/lib/actions/user.actions"
import { CLASS_COLOR_SURFACE_STYLES } from "@/lib/course-identity"
import { getPeriodLabel } from "@/lib/helpers/period-label"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const

async function TeacherScheduleContent() {
  const user = await getUser()
  if (!user?.id) redirect("/login")

  const result = await getTeacherWeeklySchedule(user.id)
  if ("error" in result) {
    return (
      <WorkspacePanel className="flex min-h-52 flex-col items-center justify-center p-6 text-center" role="alert">
        <CalendarDays className="size-6 text-destructive" />
        <h2 className="mt-3 text-sm font-semibold">Weekly schedule could not be loaded</h2>
        <p className="mt-1 text-sm text-muted-foreground">Refresh the page to try again.</p>
      </WorkspacePanel>
    )
  }

  const entries = result.courses.flatMap((course) => course.schedules.map((schedule) => ({ course, schedule })))
  const scheduleByDay = DAYS.map((day, dayIndex) => ({
    day,
    dayIndex,
    entries: entries
      .filter(({ schedule }) => schedule.dayOfWeek === dayIndex)
      .sort((left, right) => left.schedule.period - right.schedule.period),
  }))
  const scheduledDays = scheduleByDay.filter(({ entries: dayEntries }) => dayEntries.length > 0)
  const todayName = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Jakarta" }).format(new Date())
  const todayIndex = DAYS.findIndex((day) => day === todayName)

  return (
    <>
      <WorkspacePanel className="grid grid-cols-7 overflow-hidden" aria-label="Teaching sessions scheduled by day">
        {scheduleByDay.map(({ day, dayIndex, entries: dayEntries }) => {
          const isToday = dayIndex === todayIndex
          return (
            <div
              key={day}
              className={cn(
                "min-w-0 border-l px-1.5 py-2 text-center first:border-l-0 sm:px-3",
                isToday && "bg-indigo-50 dark:bg-indigo-950/35",
              )}
            >
              <div className={cn("truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]", isToday && "text-indigo-700 dark:text-indigo-300")}>
                <span className="sm:hidden">{day.slice(0, 3)}</span><span className="hidden sm:inline">{day}</span>
              </div>
              <div className={cn("mt-0.5 text-base font-semibold tabular-nums", dayEntries.length === 0 && "text-muted-foreground", isToday && "text-indigo-700 dark:text-indigo-300")}>{dayEntries.length}</div>
              <span className="sr-only">{dayEntries.length === 1 ? "class" : "classes"}{isToday ? ", today" : ""}</span>
            </div>
          )
        })}
      </WorkspacePanel>

      <WorkspacePanel className="overflow-hidden">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3 py-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Weekly teaching agenda</h2>
            <p className="truncate text-xs text-muted-foreground">
              {entries.length} scheduled {entries.length === 1 ? "class" : "classes"} across {scheduledDays.length} active {scheduledDays.length === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><CalendarDays className="size-3.5" />Active semester</div>
        </div>

        {scheduledDays.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center px-4 py-10 text-center">
            <CalendarDays className="size-6 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold">No classes scheduled</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Your weekly teaching schedule will appear here when classes are added to an active course.</p>
          </div>
        ) : (
          <div className="divide-y">
            {scheduledDays.map(({ day, dayIndex, entries: dayEntries }) => {
              const isToday = dayIndex === todayIndex
              return (
                <section key={day} className={cn("grid gap-2 p-3 lg:grid-cols-[7.5rem_minmax(0,1fr)]", isToday && "bg-indigo-50/45 dark:bg-indigo-950/15")}>
                  <div className="flex items-center justify-between gap-2 lg:block">
                    <div>
                      <h3 className={cn("text-sm font-semibold", isToday && "text-indigo-700 dark:text-indigo-300")}>{day}</h3>
                      <p className="text-xs text-muted-foreground">{dayEntries.length} {dayEntries.length === 1 ? "class" : "classes"}</p>
                    </div>
                    {isToday && <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">Today</span>}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {dayEntries.map(({ course, schedule }) => {
                      const courseName = course.subject?.reportName || course.reportName || course.subject?.name || course.name
                      const surface = course.class?.color ? CLASS_COLOR_SURFACE_STYLES[course.class.color] : "bg-background"
                      return (
                        <Link
                          key={`${course.id}-${schedule.id}`}
                          href={`/teacher/courses/${course.id}/tasks`}
                          prefetch
                          className={cn(
                            "group flex min-h-20 items-start gap-3 rounded-md border p-3 transition-colors hover:border-indigo-300 hover:bg-[var(--workspace-row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:border-indigo-700",
                            surface,
                          )}
                        >
                          <span className="flex min-w-14 shrink-0 flex-col items-center justify-center rounded-md border bg-background/70 px-2 py-1.5 text-center dark:bg-background/45">
                            <Clock3 className="size-3.5 text-muted-foreground" />
                            <span className="mt-0.5 text-[10px] font-semibold leading-4 text-muted-foreground">{getPeriodLabel(schedule.period)}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-sm font-semibold leading-5">{courseName}</span>
                            <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><BookOpen className="size-3.5 shrink-0" /><span className="truncate">{course.class?.name || course.name}</span></span>
                            {course.subject?.code && <span className="mt-1 block truncate text-[10px] text-muted-foreground">{course.subject.code}</span>}
                          </span>
                          <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </WorkspacePanel>
    </>
  )
}

export default function TeacherSchedulePage() {
  return (
    <WorkspacePage>
      <MobileHeaderSetter title="Weekly Schedule" subtitle="Your teaching timetable for the active semester" />
      <Suspense fallback={<TeacherScheduleContentSkeleton />}><TeacherScheduleContent /></Suspense>
    </WorkspacePage>
  )
}
