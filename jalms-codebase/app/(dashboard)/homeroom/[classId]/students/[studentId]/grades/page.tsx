import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { HomeroomStudentGradesView } from "@/components/homeroom/student-grades-view"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"
import { getStudentBasicInfo, getStudentGradeHistoryForTeacher, getStudentGradesForTeacher, getStudentSemestersForTeacher } from "@/lib/actions/homeroom.actions"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ classId: string; studentId: string }>
  searchParams: Promise<{ termId?: string | string[] }>
}

export default async function TeacherStudentGradesPage({ params, searchParams }: PageProps) {
  const [{ classId, studentId }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const termId = typeof resolvedSearchParams.termId === "string" ? resolvedSearchParams.termId : undefined
  const [studentResult, gradesResult, semestersResult, historyResult] = await Promise.all([
    getStudentBasicInfo(studentId),
    getStudentGradesForTeacher(studentId, termId),
    getStudentSemestersForTeacher(studentId),
    getStudentGradeHistoryForTeacher(studentId),
  ])

  if (studentResult.error || gradesResult.error || semestersResult.error || historyResult.error || !studentResult.student) {
    return <WorkspacePage><WorkspacePanel className="border-destructive/30 px-4 py-8 text-center text-sm text-destructive">Unable to load this student&apos;s grades.</WorkspacePanel></WorkspacePage>
  }

  const grades = gradesResult.grades ?? []
  const semesters = semestersResult.semesters ?? []
  const history = historyResult.history ?? []
  const selectedTermId = termId || semesters.find((semester) => semester.isActive)?.id || "all"
  let semesterTitle = "Active semester"
  if (termId === "all") semesterTitle = "All grade history"
  else if (termId) {
    const selectedSemester = semesters.find((semester) => semester.id === termId)
    if (selectedSemester) semesterTitle = `${selectedSemester.academicYear.name} · ${selectedSemester.type === "ODD" ? "Odd" : "Even"} semester`
  }

  return (
    <WorkspacePage>
      <MobileHeaderSetter title={`${studentResult.student.name}'s grades`} subtitle={studentResult.student.email} backLink={`/homeroom/${classId}`} />
      <HomeroomStudentGradesView grades={grades} semesters={semesters} history={history} semesterTitle={semesterTitle} selectedTermId={selectedTermId} />
    </WorkspacePage>
  )
}
