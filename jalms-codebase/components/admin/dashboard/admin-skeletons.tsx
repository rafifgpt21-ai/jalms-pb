import { Skeleton } from "@/components/ui/skeleton"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

function HeaderSkeleton() {
  return <div className="flex h-12 items-center justify-between border-b px-4"><div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-40" /></div><Skeleton className="h-8 w-20" /></div>
}

export function AdminSummarySkeleton() {
  return <WorkspacePanel className="grid grid-cols-2 overflow-hidden" aria-label="Loading school summary" aria-busy="true">{Array.from({ length: 2 }, (_, index) => <div key={index} className="min-w-0 border-l px-4 py-3 first:border-l-0"><div className="flex items-center gap-3"><Skeleton className="size-9" /><div className="space-y-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-3 w-28" /></div></div>{index === 0 && <Skeleton className="mt-3 h-1.5 w-full" />}</div>)}</WorkspacePanel>
}

export function PulseSkeleton() {
  return <WorkspacePanel className="overflow-hidden" aria-label="Loading attendance pulse" aria-busy="true"><HeaderSkeleton /><div className="flex h-32 items-center gap-4 px-4"><Skeleton className="size-11" /><div className="flex-1 space-y-3"><Skeleton className="h-7 w-32" /><Skeleton className="h-2 w-full" /><Skeleton className="h-3 w-64 max-w-full" /></div></div></WorkspacePanel>
}

export function TotalUsersSkeleton() {
  return <WorkspacePanel className="overflow-hidden" aria-label="Loading active accounts" aria-busy="true"><HeaderSkeleton /><div className="flex h-32 items-center gap-4 px-4"><Skeleton className="size-11" /><div className="flex-1 space-y-2"><Skeleton className="h-8 w-20" /><Skeleton className="h-3 w-40" /></div><Skeleton className="size-4" /></div></WorkspacePanel>
}

export function RecentLoginSkeleton() {
  return <WorkspacePanel className="overflow-hidden" aria-label="Loading recent login activity" aria-busy="true"><HeaderSkeleton /><div className="divide-y">{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex h-14 items-center gap-3 px-4"><Skeleton className="size-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div><Skeleton className="h-3 w-24" /></div>)}</div></WorkspacePanel>
}
