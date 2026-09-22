import { Skeleton } from "@/components/ui/skeleton"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return <div className="flex h-12 items-center justify-between border-b px-4"><div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-36" /></div>{action && <Skeleton className="h-8 w-20" />}</div>
}

export function GradesSkeleton() {
  return <WorkspacePanel className="grid overflow-hidden sm:grid-cols-2" aria-label="Loading learning summary" aria-busy="true">{Array.from({ length: 2 }, (_, index) => <div key={index} className="flex h-16 items-center gap-3 border-t px-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0"><Skeleton className="size-9" /><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-36" /></div></div>)}</WorkspacePanel>
}

export function UpNextSkeleton() {
  return <WorkspacePanel className="overflow-hidden" aria-label="Loading next class" aria-busy="true"><HeaderSkeleton /><div className="flex h-28 items-center gap-4 px-4"><Skeleton className="size-11" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-3 w-2/5" /></div><Skeleton className="size-4" /></div></WorkspacePanel>
}

export function ScheduleSkeleton() {
  return <WorkspacePanel className="overflow-hidden" aria-label="Loading today’s schedule" aria-busy="true"><HeaderSkeleton /><div className="divide-y">{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex h-14 items-center gap-3 px-4"><Skeleton className="h-4 w-16" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="size-4" /></div>)}</div></WorkspacePanel>
}

export function DeadlinesSkeleton() {
  return <WorkspacePanel className="overflow-hidden" aria-label="Loading deadlines" aria-busy="true"><HeaderSkeleton /><div className="divide-y">{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex h-16 items-center gap-3 px-4"><Skeleton className="size-8" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-4/5" /></div><Skeleton className="h-5 w-16" /></div>)}</div></WorkspacePanel>
}
