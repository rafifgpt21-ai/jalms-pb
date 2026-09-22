import { format } from "date-fns"
import { AlertCircle, CalendarOff, CheckCircle2, Clock3, Layers3 } from "lucide-react"
import Link from "next/link"
import { auth } from "@/auth"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { DateNavigator } from "@/components/teacher/attendance/date-navigator"
import { SkipAllButton } from "@/components/teacher/attendance/skip-all-button"
import { SkipSessionButton } from "@/components/teacher/attendance/skip-session-button"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"
import { getDailySchedule } from "@/lib/actions/attendance.actions"
import { getPeriodLabel } from "@/lib/helpers/period-label"

function SummaryCell({ value, label, icon: Icon }: { value: number, label: string, icon: typeof Layers3 }) {
    return (
        <div className="flex min-w-0 items-center gap-2 border-r px-3 py-2.5 last:border-r-0">
            <Icon className="hidden size-4 shrink-0 text-muted-foreground min-[430px]:block" />
            <div className="min-w-0">
                <p className="text-base font-semibold leading-none tabular-nums">{value}</p>
                <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
        </div>
    )
}

function SessionStatus({ isSkipped, isAttendanceTaken }: { isSkipped: boolean, isAttendanceTaken: boolean }) {
    if (isSkipped) return <StatusBadge status="SKIPPED" label="Skipped" />
    if (isAttendanceTaken) return <StatusBadge status="TAKEN" label="Recorded" />
    return <StatusBadge status="PENDING" label="Pending" />
}

export default async function AttendancePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await auth()
    if (!session?.user?.id) return <div>Not authenticated</div>

    const resolvedSearchParams = await searchParams
    const dateParam = typeof resolvedSearchParams.date === "string" ? resolvedSearchParams.date : undefined
    const date = dateParam ? new Date(dateParam) : new Date()
    const { schedules = [], error } = await getDailySchedule(session.user.id, date)

    const recordedCount = schedules.filter(schedule => schedule.isAttendanceTaken && !schedule.isSkipped).length
    const skippedCount = schedules.filter(schedule => schedule.isSkipped).length
    const pendingCount = Math.max(0, schedules.length - recordedCount - skippedCount)
    const dateString = format(date, "yyyy-MM-dd")

    return (
        <WorkspacePage>
            <MobileHeaderSetter
                title="Daily attendance"
                subtitle={`${format(date, "EEEE, MMMM d, yyyy")} · ${recordedCount} of ${schedules.length} recorded`}
            />

            <WorkspacePanel className="overflow-hidden">
                <div className="grid grid-cols-4">
                    <SummaryCell value={schedules.length} label="Sessions" icon={Layers3} />
                    <SummaryCell value={recordedCount} label="Recorded" icon={CheckCircle2} />
                    <SummaryCell value={pendingCount} label="Pending" icon={Clock3} />
                    <SummaryCell value={skippedCount} label="Skipped" icon={CalendarOff} />
                </div>
                <div className="flex flex-col gap-2 border-t p-2 sm:flex-row sm:items-center sm:justify-between">
                    <DateNavigator />
                    <SkipAllButton teacherId={session.user.id} date={date} pendingCount={pendingCount} />
                </div>
            </WorkspacePanel>

            {error ? (
                <WorkspacePanel role="alert" className="flex items-start gap-3 border-destructive/40 p-3 text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <div>
                        <p className="font-medium">Could not load the daily schedule</p>
                        <p className="mt-0.5 text-xs">{error}. Refresh the page to try again.</p>
                    </div>
                </WorkspacePanel>
            ) : schedules.length === 0 ? (
                <WorkspacePanel className="flex min-h-48 items-center justify-center p-6 text-center">
                    <div>
                        <CalendarOff className="mx-auto size-8 text-muted-foreground" />
                        <p className="mt-3 font-medium">No sessions scheduled</p>
                        <p className="mt-1 text-sm text-muted-foreground">There are no active classes on {format(date, "EEEE, MMMM d")}.</p>
                    </div>
                </WorkspacePanel>
            ) : (
                <WorkspacePanel className="overflow-hidden">
                    <div className="flex items-center justify-between border-b px-3 py-2.5">
                        <div>
                            <h2>Session plan</h2>
                            <p className="text-xs text-muted-foreground">Record each roster or skip sessions that will not meet.</p>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{schedules.length} total</span>
                    </div>

                    <div className="divide-y xl:hidden">
                        {schedules.map(schedule => {
                            const href = `/teacher/attendance/${schedule.course.id}?date=${dateString}&period=${schedule.period}`
                            return (
                                <article key={schedule.id} className="space-y-3 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{getPeriodLabel(schedule.period)}</p>
                                            <h3 className="mt-1 truncate font-semibold">{schedule.course.name}</h3>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {[schedule.course.class?.name, schedule.course.subject?.name].filter(Boolean).join(" · ") || "Course session"}
                                            </p>
                                        </div>
                                        <SessionStatus isSkipped={!!schedule.isSkipped} isAttendanceTaken={!!schedule.isAttendanceTaken} />
                                    </div>

                                    <p className="min-h-5 text-sm text-muted-foreground">
                                        {schedule.topic || (schedule.isSkipped ? "Session will not meet" : "No lesson topic yet")}
                                    </p>

                                    <div className="grid grid-cols-2 gap-2">
                                        {!schedule.isSkipped ? (
                                            <Button asChild variant={schedule.isAttendanceTaken ? "outline" : "default"}>
                                                <Link href={href} prefetch>
                                                    {schedule.isAttendanceTaken ? "Review attendance" : "Take attendance"}
                                                </Link>
                                            </Button>
                                        ) : <div />}
                                        <SkipSessionButton
                                            courseId={schedule.course.id}
                                            courseName={schedule.course.name}
                                            date={date}
                                            period={schedule.period}
                                            isSkipped={!!schedule.isSkipped}
                                            hasAttendance={!!schedule.isAttendanceTaken}
                                        />
                                    </div>
                                </article>
                            )
                        })}
                    </div>

                    <div className="hidden xl:block">
                        <div className="grid min-h-9 grid-cols-[7rem_minmax(12rem,1.35fr)_minmax(10rem,1fr)_7rem_15rem] items-center gap-3 border-b bg-muted/60 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>Period</span>
                            <span>Course</span>
                            <span>Topic</span>
                            <span>Status</span>
                            <span className="text-right">Actions</span>
                        </div>
                        <div className="divide-y">
                            {schedules.map(schedule => {
                                const href = `/teacher/attendance/${schedule.course.id}?date=${dateString}&period=${schedule.period}`
                                return (
                                    <div key={schedule.id} className="grid min-h-16 grid-cols-[7rem_minmax(12rem,1.35fr)_minmax(10rem,1fr)_7rem_15rem] items-center gap-3 px-3 transition-colors hover:bg-[var(--workspace-row-hover)]">
                                        <p className="text-xs font-semibold text-muted-foreground">{getPeriodLabel(schedule.period)}</p>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{schedule.course.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {[schedule.course.class?.name, schedule.course.subject?.name].filter(Boolean).join(" · ") || "Course session"}
                                            </p>
                                        </div>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {schedule.topic || (schedule.isSkipped ? "Session will not meet" : "No topic yet")}
                                        </p>
                                        <SessionStatus isSkipped={!!schedule.isSkipped} isAttendanceTaken={!!schedule.isAttendanceTaken} />
                                        <div className="flex justify-end gap-2">
                                            {!schedule.isSkipped ? (
                                                <Button asChild size="sm" variant={schedule.isAttendanceTaken ? "outline" : "default"}>
                                                    <Link href={href} prefetch>
                                                        {schedule.isAttendanceTaken ? "Review" : "Take attendance"}
                                                    </Link>
                                                </Button>
                                            ) : null}
                                            <SkipSessionButton
                                                courseId={schedule.course.id}
                                                courseName={schedule.course.name}
                                                date={date}
                                                period={schedule.period}
                                                isSkipped={!!schedule.isSkipped}
                                                hasAttendance={!!schedule.isAttendanceTaken}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </WorkspacePanel>
            )}
        </WorkspacePage>
    )
}
