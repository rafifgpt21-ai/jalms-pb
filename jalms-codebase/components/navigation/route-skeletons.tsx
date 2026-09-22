import { Skeleton } from "@/components/ui/skeleton"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"

function SkeletonHeader() {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 border-b pb-2" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-64 max-w-[60vw]" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  )
}

type DashboardSkeletonVariant = "teacher" | "student" | "admin" | "homeroom" | "parent" | "generic"

function DashboardPanelSkeleton({ rows = 4, tall = false }: { rows?: number; tall?: boolean }) {
  return <WorkspacePanel className="overflow-hidden"><div className="flex h-12 items-center justify-between border-b px-4"><div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-40" /></div><Skeleton className="h-8 w-20" /></div><div className="divide-y">{Array.from({ length: rows }, (_, index) => <div key={index} className={`flex items-center gap-3 px-4 ${tall ? "h-16" : "h-14"}`}><Skeleton className="size-8" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3 w-3/5" /></div><Skeleton className="h-4 w-16" /></div>)}</div></WorkspacePanel>
}

function DashboardMetricSkeleton({ count }: { count: number }) {
  return <WorkspacePanel className={`grid overflow-hidden ${count === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>{Array.from({ length: count }, (_, index) => <div key={index} className="flex h-16 items-center gap-3 border-t px-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0"><Skeleton className="size-9" /><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-28" /></div></div>)}</WorkspacePanel>
}

function DashboardActionsSkeleton({ mobileCount, desktopCount }: { mobileCount: number; desktopCount: number }) {
  return <div aria-hidden><div className="flex gap-2 sm:hidden">{Array.from({ length: mobileCount }, (_, index) => <Skeleton key={index} className="h-11 flex-1" />)}</div><div className="hidden gap-2 sm:flex sm:flex-wrap">{Array.from({ length: desktopCount }, (_, index) => <Skeleton key={index} className="h-11 min-w-40 flex-1" />)}</div></div>
}

function DashboardSkeletonContent({ variant }: { variant: DashboardSkeletonVariant }) {
  if (variant === "parent") return <WorkspacePanel className="flex min-h-44 items-center justify-center"><div className="space-y-3 text-center"><Skeleton className="mx-auto size-10" /><Skeleton className="mx-auto h-5 w-56" /><Skeleton className="mx-auto h-4 w-80 max-w-[70vw]" /></div></WorkspacePanel>
  if (variant === "homeroom") return <><DashboardMetricSkeleton count={2} /><DashboardPanelSkeleton rows={3} tall /></>
  if (variant === "admin") return <><DashboardMetricSkeleton count={2} /><DashboardActionsSkeleton mobileCount={2} desktopCount={6} /><DashboardPanelSkeleton rows={3} /></>
  if (variant === "student") return <><DashboardPanelSkeleton rows={1} tall /><DashboardActionsSkeleton mobileCount={2} desktopCount={5} /><DashboardMetricSkeleton count={2} /><div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,.65fr)]"><DashboardPanelSkeleton rows={3} /><DashboardPanelSkeleton rows={3} tall /></div></>
  if (variant === "teacher") return <><DashboardPanelSkeleton rows={3} /><DashboardActionsSkeleton mobileCount={1} desktopCount={3} /><DashboardPanelSkeleton rows={3} tall /></>
  return <><DashboardMetricSkeleton count={4} /><div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.7fr)]"><div className="space-y-3"><DashboardPanelSkeleton rows={3} /><DashboardPanelSkeleton rows={5} tall /></div><DashboardPanelSkeleton rows={5} tall /></div></>
}

export function DashboardRouteSkeleton({ variant = "generic", nested = false }: { variant?: DashboardSkeletonVariant; nested?: boolean }) {
  const content = <DashboardSkeletonContent variant={variant} />
  if (nested) return <div className="contents" aria-label={`Loading ${variant} dashboard`} aria-busy="true">{content}</div>
  return <WorkspacePage aria-label={`Loading ${variant} dashboard`} aria-busy="true">{content}</WorkspacePage>
}

export function AttendanceRouteSkeleton({ detail = false }: { detail?: boolean }) {
  return (
    <WorkspacePage aria-label={detail ? "Loading attendance roster" : "Loading daily attendance"} aria-busy="true">
      <WorkspacePanel className="overflow-hidden">
        <div className="grid grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-1.5 border-r px-3 py-2.5 last:border-r-0">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-3 w-14 max-w-full" />
            </div>
          ))}
        </div>
        {detail ? (
          <div className="flex min-h-8 items-center justify-between border-t px-2.5 py-1">
            <div className="flex items-center gap-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-5 w-9" /></div>
            <Skeleton className="hidden h-8 w-72 lg:block" />
          </div>
        ) : (
          <div className="flex gap-2 border-t p-2">
            <Skeleton className="h-8 flex-1 sm:w-44 sm:flex-none" />
            <Skeleton className="h-8 w-20" />
          </div>
        )}
      </WorkspacePanel>

      {detail ? (
        <Skeleton className="h-11 w-full lg:hidden" />
      ) : null}

      <WorkspacePanel className="overflow-hidden">
        <div className="flex h-12 items-center justify-between border-b px-3"><div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-48" /></div><Skeleton className="h-3 w-12" /></div>
        <div className="divide-y">
          {Array.from({ length: detail ? 7 : 5 }, (_, index) => (
            <div key={index} className="flex min-h-16 items-center gap-3 px-3">
              <Skeleton className="size-8 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3 w-3/5" /></div>
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      </WorkspacePanel>
    </WorkspacePage>
  )
}

export function AnnouncementRouteSkeleton({ canManage = false }: { canManage?: boolean }) {
  return (
    <WorkspacePage aria-label="Loading announcements" aria-busy="true">
      <WorkspacePanel className="grid overflow-hidden lg:grid-cols-[auto_minmax(24rem,1fr)]">
        <div className={`hidden ${canManage ? "grid-cols-3" : "grid-cols-2"} divide-x lg:grid lg:border-r`}>
          {Array.from({ length: canManage ? 3 : 2 }, (_, index) => <div key={index} className="space-y-1.5 px-3 py-2.5"><Skeleton className="h-5 w-8" /><Skeleton className="h-3 w-16" /></div>)}
        </div>
        <div className="flex items-center gap-2 p-2"><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 w-[8.5rem]" />{canManage && <Skeleton className="hidden h-8 w-36 sm:block" />}</div>
      </WorkspacePanel>
      <WorkspacePanel className="overflow-hidden">
        <div className="flex h-12 items-center justify-between border-b bg-muted/20 px-3"><div className="space-y-1.5"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-52" /></div><Skeleton className="h-3 w-16" /></div>
        <div className="divide-y">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="flex gap-3 px-3 py-3 sm:px-4"><Skeleton className="size-8 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><div className="flex justify-between gap-3"><div className="space-y-1.5"><Skeleton className="h-4 w-48 max-w-[50vw]" /><Skeleton className="h-3 w-40" /></div>{canManage && <Skeleton className="size-8" />}</div><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div></div>)}
        </div>
      </WorkspacePanel>
    </WorkspacePage>
  )
}

export function TableRouteSkeleton() {
  return (
    <WorkspacePage aria-label="Loading list" aria-busy="true">
      <SkeletonHeader />
      <TablePanelSkeleton />
    </WorkspacePage>
  )
}

export function TablePanelSkeleton() {
  return (
      <WorkspacePanel className="min-h-[34rem] overflow-hidden" aria-label="Loading table" aria-busy="true">
        <div className="flex min-h-14 items-center gap-3 border-b p-3">
          <Skeleton className="h-8 flex-1 max-w-sm" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid h-10 grid-cols-[2fr_1fr_1fr_6rem] gap-4 border-b bg-muted/30 px-4 py-3">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-3 w-full" />)}
        </div>
        <div className="divide-y">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="grid h-14 grid-cols-[2fr_1fr_1fr_6rem] items-center gap-4 px-4">
              <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-5 w-20" /><Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </WorkspacePanel>
  )
}

export function CourseRouteSkeleton() {
  return (
    <WorkspacePage aria-label="Loading course" aria-busy="true">
      <div className="flex min-h-16 items-center gap-3 border-b pb-3">
        <Skeleton className="size-14 rounded-xl" />
        <div className="space-y-2"><Skeleton className="h-6 w-52" /><Skeleton className="h-4 w-72 max-w-[60vw]" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <WorkspacePanel key={index} className="h-16 p-3"><Skeleton className="h-full w-full" /></WorkspacePanel>)}
      </div>
      <div className="grid min-h-[25rem] gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
        {[5, 4].map((rows, panel) => (
          <WorkspacePanel key={panel} className="overflow-hidden">
            <div className="flex h-12 items-center justify-between border-b px-4"><Skeleton className="h-5 w-32" /><Skeleton className="h-8 w-16" /></div>
            <div className="divide-y">{Array.from({ length: rows }, (_, index) => <div key={index} className="flex h-16 items-center justify-between px-4"><div className="w-2/3 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-6 w-20" /></div>)}</div>
          </WorkspacePanel>
        ))}
      </div>
    </WorkspacePage>
  )
}

export function TaskRouteSkeleton() {
  return (
    <WorkspacePage aria-label="Loading tasks" aria-busy="true">
      <WorkspacePanel className="grid grid-cols-3 overflow-hidden sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={`flex min-w-0 items-center gap-2 px-3 py-2.5 sm:gap-3 ${index < 2 ? "border-r" : "sm:border-r"}`}>
            <Skeleton className="hidden size-4 shrink-0 min-[430px]:block" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-3 w-16 max-w-full" />
            </div>
          </div>
        ))}
        <div className="col-span-3 flex gap-2 border-t p-2 sm:col-span-1 sm:items-center sm:border-t-0 sm:px-3">
          <Skeleton className="h-11 min-w-0 flex-1 sm:hidden" />
          <Skeleton className="h-11 min-w-0 flex-1 sm:h-8 sm:w-28 sm:flex-none" />
        </div>
      </WorkspacePanel>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <Skeleton className="h-8 w-full sm:max-w-xs" />
            <Skeleton className="h-8 w-full sm:w-40" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>

        <WorkspacePanel className="divide-y overflow-hidden md:hidden">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="space-y-2 px-3 py-3">
              <div className="flex items-center gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-16" /></div>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </WorkspacePanel>

        <WorkspacePanel className="hidden min-h-[24rem] overflow-hidden md:block">
          <div className="grid h-10 grid-cols-[2fr_1fr_1fr_5rem_5rem_7rem] items-center gap-4 border-b bg-muted/30 px-3">
            {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-3 w-full" />)}
          </div>
          <div className="divide-y">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="grid h-14 grid-cols-[2fr_1fr_1fr_5rem_5rem_7rem] items-center gap-4 px-3">
                <div className="space-y-1.5"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-3/4" /></div>
                <Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-16" /><Skeleton className="h-4 w-8" /><Skeleton className="h-4 w-8" /><Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>
    </WorkspacePage>
  )
}

export function StudentTaskRouteSkeleton() {
  return (
    <WorkspacePage aria-label="Loading student tasks" aria-busy="true">
      <WorkspacePanel className="grid grid-cols-4 overflow-hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={`flex min-w-0 items-center gap-2 px-2.5 py-2.5 sm:px-3 ${index < 3 ? "border-r" : ""}`}>
            <Skeleton className="hidden size-4 min-[430px]:block" />
            <div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-4 w-7" /><Skeleton className="h-3 w-14 max-w-full" /></div>
          </div>
        ))}
      </WorkspacePanel>

      <div className="space-y-3">
        {[4, 3].map((rows, panelIndex) => (
          <WorkspacePanel key={panelIndex} className="overflow-hidden">
            <div className="flex h-[3.25rem] items-center justify-between border-b bg-muted/30 px-3">
              <div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-48 max-w-[60vw]" /></div>
              <Skeleton className="h-5 w-8" />
            </div>
            <div className="divide-y">
              {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_9rem_auto]">
                  <Skeleton className="size-9" />
                  <div className="space-y-2"><Skeleton className="h-4 w-2/3" /><div className="flex gap-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-16" /></div></div>
                  <div className="hidden space-y-2 sm:block"><Skeleton className="h-3 w-full" /><Skeleton className="ml-auto h-3 w-12" /></div>
                  <Skeleton className="size-4" />
                </div>
              ))}
            </div>
          </WorkspacePanel>
        ))}
      </div>
    </WorkspacePage>
  )
}

export function StudentTaskDetailRouteSkeleton() {
  return (
    <WorkspacePage aria-label="Loading task submission" aria-busy="true">
      <WorkspacePanel className="grid grid-cols-2 overflow-hidden md:grid-cols-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={`flex min-w-0 items-center gap-2 px-3 py-2.5 ${index < 2 ? "border-b" : ""} ${index % 2 === 0 ? "border-r" : ""} md:border-b-0 md:border-r`}>
            <Skeleton className="hidden size-4 min-[430px]:block" />
            <div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-3 w-10" /><Skeleton className="h-4 w-20 max-w-full" /></div>
          </div>
        ))}
        <div className="col-span-2 flex gap-2 border-t p-2 md:col-span-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:px-3"><Skeleton className="h-8 flex-1 lg:w-20" /><Skeleton className="hidden h-8 w-24 lg:block" /></div>
      </WorkspacePanel>

      <div className="space-y-3">
        <div className="space-y-3">
          <WorkspacePanel className="overflow-hidden">
            <div className="flex h-11 items-center justify-between border-b bg-muted/30 px-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-20" /></div>
            <div className="space-y-3 p-3"><Skeleton className="h-3 w-48" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-11/12" /><Skeleton className="h-3 w-3/4" /></div>
          </WorkspacePanel>
          <WorkspacePanel className="h-28 p-3"><Skeleton className="h-4 w-32" /><Skeleton className="mt-4 h-3 w-4/5" /></WorkspacePanel>
        </div>
        <WorkspacePanel>
          <div className="flex h-[3.25rem] items-center justify-between border-b bg-muted/30 px-3"><div className="space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-44" /></div><Skeleton className="h-5 w-16" /></div>
          <div className="space-y-4 p-3 lg:p-4"><Skeleton className="h-5 w-28" /><Skeleton className="h-56 w-full lg:h-[22rem]" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div><Skeleton className="h-9 w-full" /></div>
        </WorkspacePanel>
      </div>
    </WorkspacePage>
  )
}

export function TaskGradingRouteSkeleton() {
  return (
    <WorkspacePage aria-label="Loading task grading" aria-busy="true">
      <WorkspacePanel className="grid grid-cols-3 overflow-hidden sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={`flex min-w-0 items-center gap-2 px-3 py-2.5 sm:gap-3 ${index < 2 ? "border-r" : "sm:border-r"}`}>
            <Skeleton className="hidden size-4 shrink-0 min-[430px]:block" />
            <div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-3 w-14" /><Skeleton className="h-4 w-24 max-w-full" /></div>
          </div>
        ))}
        <div className="col-span-3 gap-2 border-t p-2 sm:col-span-1 sm:flex sm:items-center sm:border-t-0 sm:px-3">
          <Skeleton className="hidden h-7 w-24 lg:block" />
          <Skeleton className="h-7 w-full sm:w-24" />
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="overflow-hidden">
        <div className="flex h-11 items-center justify-between border-b px-3"><Skeleton className="h-4 w-32" /><Skeleton className="size-4" /></div>
        <div className="space-y-2 px-3 py-3"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div>
      </WorkspacePanel>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <WorkspacePanel key={index} className="flex h-16 items-center gap-2 p-3">
            <Skeleton className="size-4" /><div className="space-y-1.5"><Skeleton className="h-4 w-8" /><Skeleton className="h-3 w-20" /></div>
          </WorkspacePanel>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row"><Skeleton className="h-8 w-full sm:max-w-xs" /><Skeleton className="h-8 w-full sm:w-44" /></div>
          <Skeleton className="h-3 w-20" />
        </div>
        <WorkspacePanel className="divide-y overflow-hidden md:hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-3 p-3">
              <div className="flex justify-between gap-3"><div className="w-1/2 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-full" /></div><Skeleton className="h-8 w-20" /></div>
              <Skeleton className="h-5 w-28" /><Skeleton className="h-10 w-full" />
            </div>
          ))}
        </WorkspacePanel>
        <WorkspacePanel className="hidden min-h-[22rem] overflow-hidden md:block">
          <div className="grid h-10 grid-cols-[1.5fr_1fr_1fr_.7fr_1fr] items-center gap-4 border-b bg-muted/30 px-3">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-3 w-full" />)}</div>
          <div className="divide-y">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="grid h-14 grid-cols-[1.5fr_1fr_1fr_.7fr_1fr] items-center gap-4 px-3">
                <div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-40" /></div><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-16" /><Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>
    </WorkspacePage>
  )
}

export function GridRouteSkeleton() {
  return (
    <WorkspacePage aria-label="Loading cards" aria-busy="true">
      <SkeletonHeader />
      <GridContentSkeleton />
    </WorkspacePage>
  )
}

export function GridContentSkeleton() {
  return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <WorkspacePanel key={index} className="h-64 overflow-hidden p-0">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="space-y-3 p-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-full" /></div>
          </WorkspacePanel>
        ))}
      </div>
  )
}

export function MaterialFormRouteSkeleton() {
  return (
    <WorkspacePage className="mx-auto max-w-4xl" aria-label="Loading material form" aria-busy="true">
      <WorkspacePanel className="overflow-hidden">
        <div className="space-y-2 border-b px-4 py-3 sm:px-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>

        <div className="grid gap-4 border-b px-4 py-4 sm:px-5 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-6">
          <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-3 w-32" /></div>
          <div className="space-y-4">
            <div className="space-y-2"><Skeleton className="h-3 w-12" /><Skeleton className="h-8 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-24 w-full" /></div>
          </div>
        </div>

        <div className="grid gap-4 px-4 py-4 sm:px-5 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-6">
          <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-28" /></div>
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-28 w-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/20 px-4 py-3 sm:px-5">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
      </WorkspacePanel>
    </WorkspacePage>
  )
}

export function StudentCoursesRouteSkeleton() {
  return (
    <WorkspacePage aria-label="Loading courses" aria-busy="true">
      <StudentCoursesContentSkeleton />
    </WorkspacePage>
  )
}

export function StudentCoursesContentSkeleton() {
  return (
    <>
      <WorkspacePanel className="grid grid-cols-3 overflow-hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={`flex items-center gap-2.5 px-3 py-2.5 ${index < 2 ? "border-r" : ""}`}>
            <Skeleton className="hidden size-4 min-[430px]:block" />
            <div className="space-y-1.5"><Skeleton className="h-4 w-8" /><Skeleton className="h-3 w-16" /></div>
          </div>
        ))}
      </WorkspacePanel>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <WorkspacePanel key={index} className="flex min-h-40 flex-col overflow-hidden">
            <div className="flex gap-3 p-3">
              <Skeleton className="size-10 shrink-0" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /><div className="flex gap-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-16" /></div></div>
              <Skeleton className="size-4" />
            </div>
            <div className="mt-auto grid grid-cols-3 divide-x border-t bg-muted/20">
              {Array.from({ length: 3 }, (_, metricIndex) => <div key={metricIndex} className="space-y-1.5 px-3 py-2"><Skeleton className="h-4 w-7" /><Skeleton className="h-3 w-14" /></div>)}
            </div>
          </WorkspacePanel>
        ))}
      </div>
    </>
  )
}

export function LearningProfileRouteSkeleton() {
  return <WorkspacePage aria-label="Loading learning profile" aria-busy="true"><LearningProfileContentSkeleton /></WorkspacePage>
}

export function LearningProfileContentSkeleton() {
  return (
    <>
      <WorkspacePanel className="grid grid-cols-3 overflow-hidden">
        {Array.from({ length: 3 }, (_, index) => <div key={index} className={`flex items-center gap-2.5 px-3 py-2.5 ${index < 2 ? "border-r" : ""}`}><Skeleton className="hidden size-4 min-[430px]:block" /><div className="space-y-1.5"><Skeleton className="h-4 w-9" /><Skeleton className="h-3 w-16" /></div></div>)}
      </WorkspacePanel>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,.6fr)]">
        <WorkspacePanel className="h-[21rem] p-3"><Skeleton className="size-full" /></WorkspacePanel>
        <WorkspacePanel className="h-[21rem] space-y-3 p-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-20 w-full" /><Skeleton className="h-4 w-36" /><Skeleton className="h-2 w-full" /><Skeleton className="h-12 w-full" /></WorkspacePanel>
      </div>
      <WorkspacePanel className="overflow-hidden">
        <div className="flex h-12 items-center justify-between border-b px-3"><div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-64 max-w-[60vw]" /></div><Skeleton className="hidden h-3 w-24 sm:block" /></div>
        <div className="divide-y">{Array.from({ length: 6 }, (_, index) => <div key={index} className="grid min-h-14 grid-cols-[minmax(0,1fr)_30%_5rem] items-center gap-4 px-3"><Skeleton className="h-4 w-3/4" /><div className="flex gap-2"><Skeleton className="h-2 flex-1" /><Skeleton className="h-4 w-8" /></div><Skeleton className="ml-auto h-5 w-8" /></div>)}</div>
      </WorkspacePanel>
    </>
  )
}

export function StudentGradesRouteSkeleton() {
  return <WorkspacePage aria-label="Loading grades" aria-busy="true"><StudentGradesContentSkeleton /></WorkspacePage>
}

export function StudentGradesContentSkeleton() {
  return (
    <>
      <WorkspacePanel className="grid overflow-hidden lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="grid grid-cols-3 divide-x border-b lg:border-r lg:border-b-0">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center gap-2.5 px-3 py-2.5"><Skeleton className="hidden size-4 min-[430px]:block" /><div className="space-y-1.5"><Skeleton className="h-4 w-10" /><Skeleton className="h-3 w-14" /></div></div>)}
        </div>
        <div className="flex items-center justify-end gap-3 p-2"><Skeleton className="h-8 flex-1 sm:w-52 sm:flex-none" /><Skeleton className="h-8 w-28" /></div>
      </WorkspacePanel>
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
        <WorkspacePanel className="overflow-hidden"><div className="h-12 border-b p-3"><Skeleton className="h-4 w-28" /></div><div className="divide-y">{Array.from({ length: 5 }, (_, index) => <div key={index} className="grid min-h-14 grid-cols-[minmax(0,1fr)_1fr_28%_6rem] items-center gap-4 px-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-2 w-full" /><Skeleton className="ml-auto h-5 w-10" /></div>)}</div></WorkspacePanel>
        <WorkspacePanel className="h-72 p-3"><Skeleton className="size-full" /></WorkspacePanel>
      </div>
    </>
  )
}

export function StudentAttendanceRouteSkeleton() {
  return <WorkspacePage aria-label="Loading attendance" aria-busy="true"><StudentAttendanceContentSkeleton /></WorkspacePage>
}

export function StudentAttendanceContentSkeleton() {
  return (
    <>
      <WorkspacePanel className="grid grid-cols-2 overflow-hidden sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={`flex min-h-16 items-center gap-2.5 px-3 py-2.5 ${index % 2 !== 0 ? "border-l" : ""} ${index >= 2 ? "border-t sm:border-t-0" : ""} ${index > 0 ? "sm:border-l" : ""}`}>
            <Skeleton className="size-8 shrink-0" /><div className="space-y-1.5"><Skeleton className="h-4 w-10" /><Skeleton className="h-3 w-16" /></div>
          </div>
        ))}
      </WorkspacePanel>
      <WorkspacePanel className="overflow-hidden">
        <div className="flex min-h-12 items-center justify-between border-b px-3 py-2"><div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div><Skeleton className="h-5 w-14" /></div>
        <div className="divide-y md:hidden">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="p-3"><div className="flex justify-between gap-3"><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-5 w-16" /></div><div className="mt-3 flex gap-3"><Skeleton className="h-1.5 flex-1" /><Skeleton className="h-4 w-9" /></div><div className="mt-3 grid grid-cols-3 gap-px"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div></div>)}
        </div>
        <div className="hidden md:block"><div className="h-9 bg-muted/45" /><div className="divide-y">{Array.from({ length: 6 }, (_, index) => <div key={index} className="grid min-h-14 grid-cols-[minmax(14rem,1.25fr)_7rem_minmax(11rem,.65fr)_6.5rem_2rem] items-center gap-4 px-3"><div className="space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div><div className="space-y-2"><Skeleton className="h-4 w-6" /><Skeleton className="h-3 w-20" /></div><div className="flex gap-3"><Skeleton className="h-1.5 flex-1" /><Skeleton className="h-4 w-9" /></div><Skeleton className="h-5 w-16" /><Skeleton className="size-4" /></div>)}</div></div>
      </WorkspacePanel>
    </>
  )
}

export function StudentScheduleRouteSkeleton() {
  return <WorkspacePage aria-label="Loading schedule" aria-busy="true"><StudentScheduleContentSkeleton /></WorkspacePage>
}

export function TeacherScheduleRouteSkeleton() {
  return <WorkspacePage aria-label="Loading weekly schedule" aria-busy="true"><TeacherScheduleContentSkeleton /></WorkspacePage>
}

export function TeacherScheduleContentSkeleton() {
  return <StudentScheduleContentSkeleton />
}

export function StudentScheduleContentSkeleton() {
  return (
    <>
      <WorkspacePanel className="grid grid-cols-7 overflow-hidden">
        {Array.from({ length: 7 }, (_, index) => <div key={index} className="flex min-h-14 flex-col items-center justify-center gap-1.5 border-l px-1.5 first:border-l-0"><Skeleton className="h-3 w-8" /><Skeleton className="h-4 w-4" /></div>)}
      </WorkspacePanel>
      <WorkspacePanel className="overflow-hidden">
        <div className="flex min-h-12 items-center justify-between border-b px-3 py-2"><div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-52" /></div><Skeleton className="hidden h-4 w-24 sm:block" /></div>
        <div className="divide-y">
          {Array.from({ length: 4 }, (_, dayIndex) => (
            <div key={dayIndex} className="grid gap-2 p-3 lg:grid-cols-[7.5rem_minmax(0,1fr)]">
              <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-14" /></div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: dayIndex === 1 ? 2 : 1 }, (_, courseIndex) => <Skeleton key={courseIndex} className="h-20 w-full" />)}
              </div>
            </div>
          ))}
        </div>
      </WorkspacePanel>
    </>
  )
}
