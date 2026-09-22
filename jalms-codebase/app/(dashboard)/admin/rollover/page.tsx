import { db } from "@/lib/db"
import { RolloverWorkspace } from "@/components/admin/rollover/rollover-workspace"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"

export default async function Page() {
  const [terms, recent] = await Promise.all([
    db.term.findMany({ where: { deletedAt: { isSet: false } }, include: { academicYear: true }, orderBy: { startDate: "desc" } }),
    db.academicRollover.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ])
  return <WorkspacePage><MobileHeaderSetter title="Semester rollover" subtitle="Carry teaching setup forward without copying academic outcomes." /><RolloverWorkspace terms={terms} recent={recent} /></WorkspacePage>
}
