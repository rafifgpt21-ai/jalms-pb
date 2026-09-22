import { Skeleton } from "@/components/ui/skeleton"
import { WorkspacePanel } from "@/components/workspace/workspace-page"
import { cn } from "@/lib/utils"
import { DashboardActionGroup, type DashboardAction } from "@/components/dashboard/dashboard-action-group"

const links: DashboardAction[] = [
  { label: "Courses", href: "/student/courses", icon: "bookOpen", primary: true },
  { label: "Schedule", href: "/student/schedule", icon: "calendar", primary: true },
  { label: "Grades", href: "/student/grades", icon: "graduationCap" },
  { label: "Attendance", href: "/student/attendance", icon: "checklist" },
  { label: "Profile", href: "/student/learning-profile", icon: "user" },
]

export function QuickMenu() {
  return <DashboardActionGroup actions={links} moreLabel="More learning actions" />
}

export function QuickMenuSkeleton() {
  return <WorkspacePanel className="grid grid-cols-2 overflow-hidden sm:grid-cols-5" aria-label="Loading learning shortcuts" aria-busy="true">{Array.from({ length: 5 }, (_, index) => <div key={index} className={cn("flex h-14 items-center gap-2.5 px-3 sm:border-l sm:border-t-0 sm:first:border-l-0", index >= 2 && "border-t", index % 2 === 1 && "border-l")}><Skeleton className="size-8" /><Skeleton className="h-4 w-16" /></div>)}</WorkspacePanel>
}
