import { Suspense } from "react"
import { format } from "date-fns"
import { getHomeroomClasses } from "@/lib/actions/homeroom.actions"
import { HomeroomDashboardView } from "@/components/homeroom/homeroom-dashboard-view"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { DashboardRouteSkeleton } from "@/components/navigation/route-skeletons"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"

export const dynamic = "force-dynamic"

async function HomeroomContent() {
  const { classes, error } = await getHomeroomClasses()
  if (error || !classes) return <WorkspacePanel className="border-destructive/30 px-4 py-8 text-center text-sm text-destructive">Unable to load homeroom classes. Refresh to try again.</WorkspacePanel>
  return <HomeroomDashboardView classes={classes} />
}

export default function HomeroomDashboard() {
  return (
    <WorkspacePage>
      <MobileHeaderSetter title="Homeroom dashboard" subtitle={format(new Date(), "EEEE, MMMM d")} showMobileSubtitle={false} />
      <Suspense fallback={<DashboardRouteSkeleton variant="homeroom" nested />}><HomeroomContent /></Suspense>
    </WorkspacePage>
  )
}
