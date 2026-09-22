import { ReportCardForm } from "@/components/homeroom/report-card-form"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"
import { getStudentReportCard } from "@/lib/actions/homeroom.actions"
import type { ReportAchievement, ReportAttendanceSummary, ReportCourseResult, ReportDevelopment, ReportExtracurricular } from "@/lib/report-card"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ classId: string; studentId: string }>
}

export default async function ReportCardPage({ params }: PageProps) {
  const { classId, studentId } = await params
  const result = await getStudentReportCard(studentId, classId)

  if (result.error || !result.student || !result.classData || !result.courses) {
    return <WorkspacePage><WorkspacePanel className="border-destructive/30 px-4 py-8 text-center text-sm text-destructive">{result.error || "Unable to load the report card."}</WorkspacePanel></WorkspacePage>
  }

  return (
    <WorkspacePage>
      <MobileHeaderSetter title={`Report · ${result.student.name}`} subtitle={`${result.classData.name} · ${result.classData.term.academicYear?.name || "Current academic year"}`} backLink={`/homeroom/${classId}`} />
      <ReportCardForm
        student={result.student}
        classData={result.classData}
        courses={result.courses as unknown as ReportCourseResult[]}
        extracurriculars={(result.extracurriculars || []) as unknown as ReportExtracurricular[]}
        achievements={(result.achievements || []) as unknown as ReportAchievement[]}
        development={(result.development || []) as unknown as ReportDevelopment[]}
        attendance={(result.attendance || { sick: 0, excused: 0, alpha: 0 }) as unknown as ReportAttendanceSummary}
        homeroomTeacherNote={result.homeroomTeacherNote || ""}
        principalName={result.principalName || ""}
        isSnapshot={result.isSnapshot || false}
        calculatedAttendance={result.calculatedAttendance}
      />
    </WorkspacePage>
  )
}
