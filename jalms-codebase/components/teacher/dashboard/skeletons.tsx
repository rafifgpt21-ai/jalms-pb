import { Skeleton } from "@/components/ui/skeleton"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

function PanelHeaderSkeleton({ action = false }: { action?: boolean }) {
  return <div className="flex h-12 items-center justify-between border-b px-4"><div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-40" /></div>{action && <Skeleton className="h-8 w-32" />}</div>
}

export function ClassesSkeleton() {
  return <WorkspacePanel className="overflow-hidden" aria-label="Loading today’s classes" aria-busy="true"><PanelHeaderSkeleton action /><div className="divide-y">{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex h-14 items-center gap-3 px-4"><Skeleton className="h-4 w-16" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3 w-3/5" /></div><Skeleton className="hidden h-4 w-24 sm:block" /></div>)}</div></WorkspacePanel>
}

export function AssignmentsSkeleton() {
  return <WorkspacePanel className="overflow-hidden" aria-label="Loading assignment progress" aria-busy="true"><PanelHeaderSkeleton /><div className="divide-y">{Array.from({ length: 3 }, (_, index) => <div key={index} className="space-y-2 px-4 py-3"><div className="flex gap-2"><Skeleton className="h-5 w-12" /><Skeleton className="h-4 w-2/5" /></div><Skeleton className="h-3 w-1/3" /><div className="flex items-center gap-3"><Skeleton className="h-1.5 flex-1" /><Skeleton className="h-3 w-20" /></div></div>)}</div></WorkspacePanel>
}
