import { Skeleton } from "@/components/ui/skeleton"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"

export default function ReportCardLoading() {
  return (
    <WorkspacePage aria-busy="true" aria-label="Loading report card editor">
      <WorkspacePanel className="mx-auto w-full max-w-5xl overflow-hidden"><div className="flex items-center justify-between gap-3 p-3"><div className="flex items-center gap-3"><Skeleton className="size-10" /><div className="space-y-1.5"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-52" /></div></div><div className="hidden gap-2 sm:flex"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-28" /></div></div><div className="grid grid-cols-3 divide-x border-t p-2"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" /></div></WorkspacePanel>
      {[5, 3, 4].map((rows, section) => <WorkspacePanel key={section} className="mx-auto w-full max-w-5xl overflow-hidden"><div className="border-b px-4 py-3"><Skeleton className="h-4 w-36" /><Skeleton className="mt-1.5 h-3 w-64 max-w-full" /></div><div className="divide-y">{Array.from({ length: rows }).map((_, row) => <div key={row} className="flex items-center gap-3 px-4 py-3"><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 w-20" /></div>)}</div></WorkspacePanel>)}
    </WorkspacePage>
  )
}
