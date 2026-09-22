import Link from "next/link"
import type { GradeLevel } from "@prisma/client"
import { ArrowRight, GraduationCap, School, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DashboardMetricStrip, DashboardPreviewList, DashboardSectionHeading } from "@/components/dashboard/dashboard-primitives"
import { WorkspacePanel } from "@/components/workspace/workspace-page"
import { educationStage, gradeLevelLabel } from "@/lib/grade-level"

interface HomeroomDashboardViewProps {
  classes: Array<{
    id: string
    name: string
    gradeLevel: GradeLevel
    term: { type: string; academicYear?: { name: string } | null }
    _count: { students: number }
  }>
}

export function HomeroomDashboardView({ classes }: HomeroomDashboardViewProps) {
  const studentCount = classes.reduce((total, item) => total + item._count.students, 0)

  return (
    <>
      <DashboardMetricStrip metrics={[
        { icon: School, value: classes.length, label: "Active classes", description: "Assigned this term" },
        { icon: Users, value: studentCount, label: "Students", description: "Across homeroom classes" },
      ]} />

      <WorkspacePanel className="overflow-hidden">
        <DashboardSectionHeading title="Your homeroom classes" description="Open a class to review students and prepare report cards." />
        <DashboardPreviewList
          items={classes}
          getKey={(item) => item.id}
          showAllLabel="Show all classes"
          renderItem={(item) => (
            <Link href={`/homeroom/${item.id}`} className="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--workspace-row-hover)]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><GraduationCap className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-medium">{item.name}</span><Badge variant="outline" className="shrink-0 text-[10px]">{educationStage(item.gradeLevel)}</Badge></span>
                <span className="block truncate text-xs text-muted-foreground">{gradeLevelLabel(item.gradeLevel)} · {item.term.academicYear?.name || "Current academic year"} · {item.term.type.toLowerCase()} semester</span>
              </span>
              <span className="shrink-0 text-right"><span className="block text-sm font-semibold tabular-nums">{item._count.students}</span><span className="text-[11px] text-muted-foreground">students</span></span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            </Link>
          )}
          empty={<div className="px-4 py-10 text-center"><GraduationCap className="mx-auto mb-3 size-6 text-muted-foreground" /><p className="text-sm font-medium">No homeroom class assigned</p><p className="mt-1 text-xs text-muted-foreground">An administrator can assign an active class to this account.</p></div>}
        />
      </WorkspacePanel>
    </>
  )
}
