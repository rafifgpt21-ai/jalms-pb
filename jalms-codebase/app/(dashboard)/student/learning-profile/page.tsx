import { Suspense } from "react"
import dynamicLoader from "next/dynamic"
import { redirect } from "next/navigation"
import { Activity, BarChart3, BookCheck, CircleGauge, Sparkles } from "lucide-react"
import { getStudentLearningProfile } from "@/lib/actions/intelligence.actions"
import { getUser } from "@/lib/actions/user.actions"
import { ACADEMIC_DOMAIN_LABELS } from "@/lib/learning-profile"
import { LearningProfileTable } from "@/components/student/intelligence/profile-table"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { LearningProfileContentSkeleton } from "@/components/navigation/route-skeletons"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"

const LearningRadarChart = dynamicLoader(
  () => import("@/components/student/intelligence/radar-chart"),
  { loading: () => <WorkspacePanel className="h-[21rem] p-3"><Skeleton className="size-full" /></WorkspacePanel> },
)

export const dynamic = "force-dynamic"

async function LearningProfileContent() {
  const user = await getUser()
  if (!user?.id) redirect("/login")

  if (!user.roles.includes("STUDENT")) {
    return <WorkspacePanel className="p-4 text-sm text-muted-foreground">Learning profiles are available to student accounts only.</WorkspacePanel>
  }

  const { profile, error } = await getStudentLearningProfile(user.id)
  if (error || !profile) {
    return <WorkspacePanel className="flex min-h-52 flex-col items-center justify-center p-6 text-center"><BarChart3 className="size-6 text-destructive" /><h2 className="mt-3 text-sm font-semibold">Profile could not be calculated</h2><p className="mt-1 text-sm text-muted-foreground">Refresh the page to try again.</p></WorkspacePanel>
  }

  const activeDomains = profile.filter((item) => item.count > 0)
  const totalEvidence = profile.reduce((total, item) => total + item.count, 0)
  const averageScore = activeDomains.length ? Math.round(activeDomains.reduce((total, item) => total + item.score, 0) / activeDomains.length) : 0
  const strongest = [...activeDomains].sort((a, b) => b.score - a.score || b.count - a.count)[0]
  const mostObserved = [...activeDomains].sort((a, b) => b.count - a.count || b.score - a.score)[0]

  return (
    <>
      <WorkspacePanel className="grid grid-cols-3 overflow-hidden">
        <div className="flex min-w-0 items-center gap-2.5 border-r px-3 py-2.5"><CircleGauge className="hidden size-4 shrink-0 text-primary min-[430px]:block" /><div className="min-w-0"><p className="text-base font-semibold leading-none">{averageScore}%</p><p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Domain avg.</p></div></div>
        <div className="flex min-w-0 items-center gap-2.5 border-r px-3 py-2.5"><BookCheck className="hidden size-4 shrink-0 text-primary min-[430px]:block" /><div className="min-w-0"><p className="text-base font-semibold leading-none">{totalEvidence}</p><p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Evidence</p></div></div>
        <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5"><Activity className="hidden size-4 shrink-0 text-primary min-[430px]:block" /><div className="min-w-0"><p className="text-base font-semibold leading-none">{activeDomains.length}/6</p><p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Coverage</p></div></div>
      </WorkspacePanel>

      <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,.6fr)]">
        <LearningRadarChart data={profile} />
        <WorkspacePanel className="overflow-hidden">
          <div className="border-b px-3 py-2.5"><h2 className="text-sm font-semibold">Profile insight</h2><p className="text-xs text-muted-foreground">What the available graded evidence currently shows.</p></div>
          {totalEvidence > 0 ? <div className="space-y-4 p-3">
            <div className="rounded-md border bg-muted/20 p-3"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Sparkles className="size-3.5 text-primary" />Strongest current domain</div><p className="mt-1 text-base font-semibold">{ACADEMIC_DOMAIN_LABELS[strongest.domain]}</p><p className="mt-0.5 text-xs text-muted-foreground">{strongest.score}% average from {strongest.count} {strongest.count === 1 ? "activity" : "activities"}.</p></div>
            <div>
              <div className="flex items-center justify-between text-xs"><span className="font-medium">Domain coverage</span><span className="text-muted-foreground">{activeDomains.length} of 6</span></div>
              <Progress value={(activeDomains.length / 6) * 100} className="mt-2 h-1.5" />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Domains without graded activities remain at 0% and are not included in the overall domain average.</p>
            </div>
            {mostObserved && <div className="border-t pt-3"><p className="text-xs font-medium">Largest evidence base</p><p className="mt-1 text-sm">{ACADEMIC_DOMAIN_LABELS[mostObserved.domain]}</p><p className="mt-0.5 text-xs text-muted-foreground">Based on {mostObserved.count} scored {mostObserved.count === 1 ? "activity" : "activities"}.</p></div>}
          </div> : <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center"><BookCheck className="size-6 text-muted-foreground" /><h3 className="mt-3 text-sm font-semibold">Your profile is still forming</h3><p className="mt-1 max-w-xs text-sm text-muted-foreground">Scores will appear after graded activities are linked to academic domains.</p></div>}
        </WorkspacePanel>
      </div>

      <LearningProfileTable data={profile} />
    </>
  )
}

export default function LearningProfilePage() {
  return (
    <WorkspacePage>
      <MobileHeaderSetter title="Learning Profile" subtitle="Performance across academic domains" />
      <Suspense fallback={<LearningProfileContentSkeleton />}><LearningProfileContent /></Suspense>
    </WorkspacePage>
  )
}
