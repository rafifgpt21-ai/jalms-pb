import { format } from "date-fns"
import { Users } from "lucide-react"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"

export default function ParentDashboard() {
  return (
    <WorkspacePage>
      <MobileHeaderSetter title="Family dashboard" subtitle={format(new Date(), "EEEE, MMMM d")} showMobileSubtitle={false} />
      <WorkspacePanel className="flex min-h-44 items-center justify-center px-6 py-8 text-center">
        <div className="max-w-md"><span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"><Users className="size-5" /></span><h2 className="text-base font-semibold">Family access is ready to be linked</h2><p className="mt-1 text-sm text-muted-foreground">No student relationship is configured for this account yet. Ask a school administrator to connect the appropriate student record.</p></div>
      </WorkspacePanel>
    </WorkspacePage>
  )
}
