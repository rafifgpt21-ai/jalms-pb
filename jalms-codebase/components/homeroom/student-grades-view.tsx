import dynamic from "next/dynamic"
import type { GradeHistoryPoint, StudentGradeRecord, StudentSemester } from "@/lib/student-grades"
import { GradesTable } from "@/components/student/grades/grades-table"
import { SemesterSelector } from "@/components/student/grades/semester-selector"
import { Skeleton } from "@/components/ui/skeleton"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

const GradeHistoryChart = dynamic(() => import("@/components/student/grades/grade-history-chart"), {
  loading: () => <WorkspacePanel className="h-72 p-3"><Skeleton className="size-full" /></WorkspacePanel>,
})

export function HomeroomStudentGradesView({ grades, semesters, history, semesterTitle, selectedTermId }: {
  grades: StudentGradeRecord[]
  semesters: StudentSemester[]
  history: GradeHistoryPoint[]
  semesterTitle: string
  selectedTermId: string
}) {
  const scores = grades.map((grade) => grade.grade)
  const average = scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : 0
  const highest = scores.length ? Math.max(...scores) : 0
  const lowest = scores.length ? Math.min(...scores) : 0

  return (
    <>
      <WorkspacePanel className="grid overflow-hidden lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="grid grid-cols-4 divide-x border-b lg:border-r lg:border-b-0">
          <div className="min-w-20 px-3 py-2.5"><p className="text-base font-semibold tabular-nums">{average.toFixed(1)}</p><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Average</p></div>
          <div className="min-w-20 px-3 py-2.5"><p className="text-base font-semibold tabular-nums">{grades.length}</p><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Courses</p></div>
          <div className="min-w-20 px-3 py-2.5"><p className="text-base font-semibold tabular-nums">{highest}</p><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Highest</p></div>
          <div className="min-w-20 px-3 py-2.5"><p className="text-base font-semibold tabular-nums">{lowest}</p><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lowest</p></div>
        </div>
        <div className="flex min-w-0 items-center justify-end p-2"><SemesterSelector key={selectedTermId} semesters={semesters} initialValue={selectedTermId} /></div>
      </WorkspacePanel>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
        <GradesTable grades={grades} semesterTitle={semesterTitle} courseLinks={false} />
        <GradeHistoryChart history={history} />
      </div>
    </>
  )
}
