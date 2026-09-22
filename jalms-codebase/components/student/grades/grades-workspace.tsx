"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { BookOpen, CircleGauge, Trophy } from "lucide-react"
import type { GradeHistoryPoint, StudentGradeRecord, StudentSemester } from "@/lib/student-grades"
import { gradeWithoutAttendance } from "@/lib/student-grades"
import { SemesterSelector } from "@/components/student/grades/semester-selector"
import { GradesTable } from "@/components/student/grades/grades-table"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

const GradeHistoryChart = dynamic(() => import("@/components/student/grades/grade-history-chart"), { loading: () => <WorkspacePanel className="h-72 p-3"><Skeleton className="size-full" /></WorkspacePanel> })

export function GradesWorkspace({ grades, semesters, history, semesterTitle, selectedTermId }: { grades: StudentGradeRecord[]; semesters: StudentSemester[]; history: GradeHistoryPoint[]; semesterTitle: string; selectedTermId: string }) {
  const [excludeAttendance, setExcludeAttendance] = useState(false)
  const displayedScores = useMemo(() => new Map(grades.map((grade) => [grade.courseId, excludeAttendance ? gradeWithoutAttendance(grade) : grade.grade])), [excludeAttendance, grades])
  const scores = [...displayedScores.values()]
  const average = scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : 0
  const highest = scores.length ? Math.max(...scores) : 0

  return (
    <>
      <WorkspacePanel className="grid overflow-hidden lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="grid grid-cols-3 divide-x border-b lg:border-r lg:border-b-0">
          <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5"><CircleGauge className="hidden size-4 text-primary min-[430px]:block" /><div className="min-w-0"><p className="text-base font-semibold leading-none">{average.toFixed(1)}%</p><p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Average</p></div></div>
          <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5"><BookOpen className="hidden size-4 text-primary min-[430px]:block" /><div className="min-w-0"><p className="text-base font-semibold leading-none">{grades.length}</p><p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Courses</p></div></div>
          <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5"><Trophy className="hidden size-4 text-primary min-[430px]:block" /><div className="min-w-0"><p className="text-base font-semibold leading-none">{highest}%</p><p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Highest</p></div></div>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-3 p-2">
          <SemesterSelector key={selectedTermId} semesters={semesters} initialValue={selectedTermId} />
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap"><Switch id="exclude-attendance" checked={excludeAttendance} onCheckedChange={setExcludeAttendance} /><Label htmlFor="exclude-attendance" className="hidden sm:block">Exclude attendance</Label><Label htmlFor="exclude-attendance" className="sm:hidden">No attendance</Label></div>
        </div>
      </WorkspacePanel>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
        <GradesTable grades={grades} semesterTitle={semesterTitle} displayedScores={displayedScores} />
        <GradeHistoryChart history={history} />
      </div>
    </>
  )
}
