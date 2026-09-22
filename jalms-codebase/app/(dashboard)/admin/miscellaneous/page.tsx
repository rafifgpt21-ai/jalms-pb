import { SchoolPrincipalsForm } from "@/components/admin/miscellaneous/school-principals-form"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"
import { getSchoolPrincipalNames } from "@/lib/actions/system-config.actions"
import { EMPTY_SCHOOL_PRINCIPALS } from "@/lib/school-principals"

export const dynamic = "force-dynamic"

export default async function MiscellaneousPage() {
  const result = await getSchoolPrincipalNames()

  return (
    <WorkspacePage>
      <MobileHeaderSetter title="Miscellaneous" subtitle="Shared school details and administrative defaults." />
      {result.error ? (
        <WorkspacePanel className="max-w-3xl border-destructive/30 px-4 py-8 text-center text-sm text-destructive">Unable to load school settings. Refresh to try again.</WorkspacePanel>
      ) : (
        <SchoolPrincipalsForm initialPrincipals={result.principals ?? EMPTY_SCHOOL_PRINCIPALS} />
      )}
    </WorkspacePage>
  )
}
