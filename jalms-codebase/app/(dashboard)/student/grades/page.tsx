import { Suspense } from "react"
import { redirect } from "next/navigation"
import { BarChart3 } from "lucide-react"
import { getStudentGradeHistory, getStudentGrades, getStudentSemesters } from "@/lib/actions/student.actions"
import { getUser } from "@/lib/actions/user.actions"
import type { GradeHistoryPoint, StudentGradeRecord, StudentSemester } from "@/lib/student-grades"
import { GradesWorkspace } from "@/components/student/grades/grades-workspace"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { StudentGradesContentSkeleton } from "@/components/navigation/route-skeletons"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

async function GradesContent({ searchParams }: { searchParams: SearchParams }) {
  const user = await getUser()
  if (!user?.id) redirect("/login")

  const params = await searchParams
  const termId = typeof params.termId === "string" ? params.termId : undefined
  const [gradesRes, semestersRes, historyRes] = await Promise.all([
    getStudentGrades(termId, user.id),
    getStudentSemesters(user.id),
    getStudentGradeHistory(user.id),
  ])

  if ("error" in gradesRes || "error" in semestersRes || "error" in historyRes) {
    return <WorkspacePanel className="flex min-h-52 flex-col items-center justify-center p-6 text-center"><BarChart3 className="size-6 text-destructive" /><h2 className="mt-3 text-sm font-semibold">Grades could not be loaded</h2><p className="mt-1 text-sm text-muted-foreground">Refresh the page to try again.</p></WorkspacePanel>
  }

  const grades = gradesRes.grades as StudentGradeRecord[]
  const semesters = semestersRes.semesters as StudentSemester[]
  const history = historyRes.history as GradeHistoryPoint[]
  const activeSemester = semesters.find((semester) => semester.isActive)
  const selectedTermId = termId || activeSemester?.id || "all"
  const selectedSemester = selectedTermId === "all" ? null : semesters.find((semester) => semester.id === selectedTermId)
  const semesterTitle = selectedTermId === "all"
    ? "All available semesters"
    : selectedSemester
      ? `${selectedSemester.academicYear.name} · ${selectedSemester.type === "ODD" ? "Odd" : "Even"} semester`
      : "Active semester"

  return <GradesWorkspace grades={grades} semesters={semesters} history={history} semesterTitle={semesterTitle} selectedTermId={selectedTermId} />
}

export default function StudentGradesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <WorkspacePage>
      <MobileHeaderSetter title="My Grades" subtitle="Course results and semester progress" />
      <Suspense fallback={<StudentGradesContentSkeleton />}><GradesContent searchParams={searchParams} /></Suspense>
    </WorkspacePage>
  )
}
