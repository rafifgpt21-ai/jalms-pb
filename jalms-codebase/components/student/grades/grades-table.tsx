"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { StudentGradeRecord } from "@/lib/student-grades"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

function scoreTone(score: number) {
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 80) return "text-blue-600 dark:text-blue-400"
  if (score >= 70) return "text-amber-700 dark:text-amber-400"
  return "text-destructive"
}

export function GradesTable({ grades, semesterTitle, displayedScores = new Map<string, number>(), courseLinks = true }: { grades: StudentGradeRecord[]; semesterTitle: string; displayedScores?: Map<string, number>; courseLinks?: boolean }) {
  return (
    <WorkspacePanel className="overflow-hidden">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b bg-muted/20 px-3 py-2"><div><h2 className="text-sm font-semibold">Course grades</h2><p className="text-xs text-muted-foreground">{semesterTitle}</p></div><span className="text-xs text-muted-foreground">{grades.length} {grades.length === 1 ? "course" : "courses"}</span></div>

      {grades.length ? <>
        <div className="divide-y md:hidden">
          {grades.map((grade) => {
            const score = displayedScores.get(grade.courseId) ?? grade.grade
            const content = <>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{grade.courseName}</h3><p className="mt-0.5 truncate text-xs text-muted-foreground">{grade.teacherName}</p></div><div className="flex items-center gap-1.5"><span className={`text-lg font-semibold tabular-nums ${scoreTone(score)}`}>{score}%</span>{courseLinks ? <ArrowRight className="size-4 text-muted-foreground" /> : null}</div></div>
              <div className="mt-3 grid grid-cols-2 gap-3"><div><div className="flex justify-between text-[11px] text-muted-foreground"><span>Overall grade</span><span>{score}%</span></div><Progress value={score} className="mt-1 h-1.5" /></div><div><div className="flex justify-between text-[11px] text-muted-foreground"><span>Attendance</span><span>{grade.attendancePercentage}%</span></div><Progress value={grade.attendancePercentage} className="mt-1 h-1.5" /></div></div>
            </>
            return courseLinks
              ? <Link key={grade.courseId} href={`/student/courses/${grade.courseId}/grades`} className="block px-3 py-3 transition-colors hover:bg-[var(--workspace-row-hover)]">{content}</Link>
              : <div key={grade.courseId} className="px-3 py-3">{content}</div>
          })}
        </div>

        <div className="hidden md:block">
          <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Course</TableHead><TableHead>Teacher</TableHead><TableHead className="w-[28%]">Attendance</TableHead><TableHead className="w-28 text-right">Overall grade</TableHead><TableHead className="w-10"><span className="sr-only">Open</span></TableHead></TableRow></TableHeader><TableBody>
            {grades.map((grade) => {
              const score = displayedScores.get(grade.courseId) ?? grade.grade
              return <TableRow key={grade.courseId}><TableCell className="font-medium">{grade.courseName}</TableCell><TableCell className="text-muted-foreground">{grade.teacherName}</TableCell><TableCell><div className="flex items-center gap-2"><Progress value={grade.attendancePercentage} className="h-1.5 flex-1" /><span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{grade.attendancePercentage}%</span></div></TableCell><TableCell className={`text-right text-base font-semibold tabular-nums ${scoreTone(score)}`}>{score}%</TableCell><TableCell>{courseLinks ? <Link href={`/student/courses/${grade.courseId}/grades`} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Open grades for ${grade.courseName}`}><ArrowRight className="size-4" /></Link> : null}</TableCell></TableRow>
            })}
          </TableBody></Table>
        </div>
      </> : <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center"><Badge variant="outline">No grade data</Badge><p className="mt-2 text-sm text-muted-foreground">No course grades are available for this semester.</p></div>}
    </WorkspacePanel>
  )
}
