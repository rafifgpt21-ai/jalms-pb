import { Suspense } from "react"
import { format } from "date-fns"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"
import { DashboardActionGroup, type DashboardAction } from "@/components/dashboard/dashboard-action-group"
import { ClassesTodayCard, AssignmentsWidgetWrapper } from "@/components/teacher/dashboard/dashboard-components"
import { ClassesSkeleton, AssignmentsSkeleton } from "@/components/teacher/dashboard/skeletons"

export const dynamic = "force-dynamic"

const quickActions: DashboardAction[] = [
  { href: "/teacher/attendance", label: "Take attendance", icon: "checklist", primary: true },
  { href: "/teacher/quiz-manager", label: "Quiz library", icon: "fileQuestion" },
  { href: "/teacher/materials", label: "Material library", icon: "fileText" },
]

export default function TeacherDashboard() {
  return (
    <WorkspacePage>
      <MobileHeaderSetter title="Teaching dashboard" subtitle={format(new Date(), "EEEE, MMMM d")} showMobileSubtitle={false} />

      <Suspense fallback={<ClassesSkeleton />}><ClassesTodayCard /></Suspense>
      <DashboardActionGroup actions={quickActions} moreLabel="More teaching actions" />
      <Suspense fallback={<AssignmentsSkeleton />}><AssignmentsWidgetWrapper /></Suspense>
    </WorkspacePage>
  )
}
