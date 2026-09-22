import { Suspense } from "react"
import { format } from "date-fns"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"
import { DashboardActionGroup, type DashboardAction } from "@/components/dashboard/dashboard-action-group"
import { AdminSummaryCard, RecentLoginList } from "@/components/admin/dashboard/admin-dashboard-components"
import { AdminSummarySkeleton, RecentLoginSkeleton } from "@/components/admin/dashboard/admin-skeletons"
import { isDirectMessagingEnabled } from "@/lib/features"

export const dynamic = "force-dynamic"

const quickActions: DashboardAction[] = [
  { href: "/admin/schedule", icon: "calendar", label: "Schedule", primary: true },
  { href: "/admin/classes", icon: "school", label: "Classes" },
  { href: "/admin/courses", icon: "bookOpen", label: "Courses" },
  { href: "/admin/users", icon: "users", label: "Users", primary: true },
  { href: "/admin/semesters", icon: "calendarRange", label: "Semesters" },
  { href: "/admin/socials", icon: "activity", label: "Socials" },
]

export default function AdminDashboard() {
  const visibleQuickActions = isDirectMessagingEnabled() ? quickActions : quickActions.filter((action) => action.href !== "/admin/socials")
  return (
    <WorkspacePage>
      <MobileHeaderSetter title="Administration dashboard" subtitle={format(new Date(), "EEEE, MMMM d")} showMobileSubtitle={false} />

      <Suspense fallback={<AdminSummarySkeleton />}><AdminSummaryCard /></Suspense>
      <DashboardActionGroup actions={visibleQuickActions} moreLabel="More administration actions" />

      <Suspense fallback={<RecentLoginSkeleton />}><RecentLoginList /></Suspense>
    </WorkspacePage>
  )
}
