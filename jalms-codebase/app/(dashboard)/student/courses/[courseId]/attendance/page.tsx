import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { StatusBadge } from "@/components/ui/status-badge"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"
import { getCourseWorkspace } from "@/lib/actions/course-workspace.actions"

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const [session, access] = await Promise.all([auth(), getCourseWorkspace(courseId, "student")])
  if (!session?.user?.id || !access.course) notFound()
  const records = await db.attendance.findMany({ where: { courseId, studentId: session.user.id, deletedAt: { isSet: false } }, orderBy: { date: "desc" } })
  const counted = records.filter(record => record.status !== "SKIPPED")
  const counts = Object.fromEntries(["PRESENT", "ABSENT", "EXCUSED"].map(status => [status, counted.filter(record => record.status === status).length]))
  const rate = counted.length ? Math.round(((counts.PRESENT + counts.EXCUSED) / counted.length) * 100) : 100
  return <WorkspacePage>
    <MobileHeaderSetter title="Attendance" subtitle={`${rate}% attendance across ${counted.length} recorded sessions.`} />
    <div className="grid grid-cols-3 gap-2">{Object.entries(counts).map(([label, value]) => <WorkspacePanel key={label} className="p-3"><div className="text-xl font-semibold">{value}</div><div className="text-xs capitalize text-muted-foreground">{label.toLowerCase()}</div></WorkspacePanel>)}</div>
    <WorkspacePanel className="divide-y overflow-hidden">{records.map(record => <div key={record.id} className="flex items-center justify-between px-4 py-3"><div><div className="text-sm font-medium">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(record.date)}</div><div className="text-xs text-muted-foreground">{record.topic || `Period ${record.period}`}</div></div><StatusBadge status={record.status} /></div>)}{!records.length && <div className="p-10 text-center text-sm text-muted-foreground">No attendance has been recorded yet.</div>}</WorkspacePanel>
  </WorkspacePage>
}
