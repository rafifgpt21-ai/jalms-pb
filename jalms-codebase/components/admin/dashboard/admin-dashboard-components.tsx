import Link from "next/link"
import { format } from "date-fns"
import { Activity, ArrowRight, Clock3, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DashboardMetricStrip, DashboardPreviewList, DashboardSectionHeading } from "@/components/dashboard/dashboard-primitives"
import { WorkspacePanel } from "@/components/workspace/workspace-page"
import { getAttendancePulse, getTotalUsersCount, getLastLoggedInUsers } from "@/lib/actions/dashboard.actions"

export async function AdminSummaryCard() {
  const [{ attendance }, { totalUsers }] = await Promise.all([getAttendancePulse(), getTotalUsersCount()])
  const stats = attendance || { percentage: 0, totalRecords: 0, presentCount: 0, absentCount: 0 }
  return <DashboardMetricStrip metrics={[
    {
      href: "/admin/schedule",
      icon: Activity,
      value: `${stats.percentage}%`,
      label: "Attendance today",
      description: `${stats.presentCount} present · ${stats.absentCount} other records`,
      progress: stats.percentage,
    },
    {
      href: "/admin/users",
      icon: Users,
      value: totalUsers || 0,
      label: "Active accounts",
      description: "Users able to access ARSync",
    },
  ]} />
}

export async function RecentLoginList() {
  const { lastLoggedInUsers } = await getLastLoggedInUsers()
  return (
    <WorkspacePanel className="overflow-hidden">
      <DashboardSectionHeading
        title="Recent login activity"
        description="Latest workspace access"
        action={<Button asChild size="sm" variant="ghost"><Link href="/admin/users">Users<ArrowRight /></Link></Button>}
      />
      <DashboardPreviewList
        items={lastLoggedInUsers ?? []}
        getKey={(user: any) => user.id}
        viewAllHref="/admin/users"
        showViewAllFooter={false}
        renderItem={(user: any) => (
          <Link href="/admin/users" className="group flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--workspace-row-hover)]">
            <Avatar className="size-8"><AvatarImage src={user.image || undefined} alt={user.name} /><AvatarFallback className="text-xs font-semibold">{user.name.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user.name}</span><span className="block truncate text-xs text-muted-foreground">{user.email}</span></span>
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground"><Clock3 className="size-3.5" />{user.lastLoginAt ? format(new Date(user.lastLoginAt), "MMM d, h:mm a") : "Never"}</span>
          </Link>
        )}
        empty={<div className="px-4 py-8 text-center"><p className="text-sm font-medium">No recent login activity</p><p className="mt-1 text-xs text-muted-foreground">New activity will appear here.</p></div>}
      />
    </WorkspacePanel>
  )
}
