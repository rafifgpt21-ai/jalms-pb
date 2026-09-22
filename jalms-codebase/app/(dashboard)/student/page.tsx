import { Suspense } from "react"
import { format } from "date-fns"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"
import { DashboardUpNext, DashboardSchedule, DashboardDeadlines, DashboardGrades } from "@/components/student/dashboard/student-dashboard-components"
import { ScheduleSkeleton, DeadlinesSkeleton, GradesSkeleton, UpNextSkeleton } from "@/components/student/dashboard/student-skeletons"
import { QuickMenu } from "@/components/student/dashboard/quick-menu"

export const dynamic = "force-dynamic"

export default function StudentDashboard() {
  return (
    <WorkspacePage>
      <MobileHeaderSetter title="Learning dashboard" subtitle={format(new Date(), "EEEE, MMMM d")} showMobileSubtitle={false} />
      <Suspense fallback={<UpNextSkeleton />}><DashboardUpNext /></Suspense>
      <QuickMenu />
      <Suspense fallback={<GradesSkeleton />}><DashboardGrades /></Suspense>
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,.65fr)]">
        <div className="space-y-3">
          <Suspense fallback={<ScheduleSkeleton />}><DashboardSchedule /></Suspense>
        </div>
        <Suspense fallback={<DeadlinesSkeleton />}><DashboardDeadlines /></Suspense>
      </div>
    </WorkspacePage>
  )
}
