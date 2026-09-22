"use client"

import Link from "next/link"
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer"
import { ArrowLeft, Download, Loader2 } from "lucide-react"
import ReportCardDocument from "@/components/homeroom/report-card-pdf"
import { Button } from "@/components/ui/button"
import type {
  ReportAchievement,
  ReportAttendanceSummary,
  ReportClassData,
  ReportCourseResult,
  ReportDevelopment,
  ReportExtracurricular,
  ReportStudent,
} from "@/lib/report-card"

interface ReportPreviewClientProps {
  student: ReportStudent
  classData: ReportClassData
  courses: ReportCourseResult[]
  extracurriculars: ReportExtracurricular[]
  achievements: ReportAchievement[]
  development: ReportDevelopment[]
  attendance: ReportAttendanceSummary
  homeroomTeacherNote: string
  principalName: string
  classId: string
  studentId: string
}

export function ReportPreviewClient(props: ReportPreviewClientProps) {
  const documentProps = {
    student: props.student,
    classData: props.classData,
    courses: props.courses,
    extracurriculars: props.extracurriculars,
    achievements: props.achievements,
    development: props.development,
    attendance: props.attendance,
    note: props.homeroomTeacherNote,
    principalName: props.principalName,
    publishedDate: new Date(),
  }

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-[32rem] flex-col overflow-hidden rounded-md border bg-card">
      <div className="flex min-h-12 items-center justify-between gap-2 border-b px-2 py-1.5">
        <Button variant="ghost" size="sm" asChild><Link href={`/homeroom/${props.classId}/students/${props.studentId}/report`}><ArrowLeft className="size-4" />Back to editor</Link></Button>
        <PDFDownloadLink document={<ReportCardDocument {...documentProps} />} fileName={`Report_Card_${props.student.name.replace(/\s+/g, "_")}.pdf`}>
          {({ loading }: { loading: boolean }) => <Button variant="outline" size="sm" disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}{loading ? "Preparing" : "Download PDF"}</Button>}
        </PDFDownloadLink>
      </div>
      <div className="relative min-h-0 flex-1 bg-muted/40">
        <PDFViewer width="100%" height="100%" style={{ border: "none" }} showToolbar={false}><ReportCardDocument {...documentProps} /></PDFViewer>
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-md border bg-card/95 p-3 text-center text-xs text-muted-foreground shadow-xs sm:hidden">If the embedded preview is unavailable on your phone, use Download PDF above.</div>
      </div>
    </div>
  )
}
