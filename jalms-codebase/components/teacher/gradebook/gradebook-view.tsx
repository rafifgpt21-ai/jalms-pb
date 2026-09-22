"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Award, Download, Search, Sigma, TrendingUp, Users } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  RecordPanelHeader,
  RecordStat,
  RecordStats,
} from "@/components/teacher/records/records-page"
import { cn } from "@/lib/utils"

export interface GradebookData {
  gradebook: Array<{
    studentId: string
    studentName: string
    studentImage?: string | null
    attendancePercentage: number
    totalScore: number
    earnedPoints: number
    scores: Record<string, number | null>
  }>
  assignments: Array<{
    id: string
    title: string
    maxPoints: number
    isExtraCredit: boolean
    dueDate?: Date | string | null
    type?: string
  }>
  courseName: string
  maxPoints: number
}

function gradeTone(score: number) {
  if (score >= 90) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
  if (score >= 80) return "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
  if (score >= 70) return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
  return "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`
}

export function GradebookView({ data }: { data: GradebookData }) {
  const { gradebook, assignments, courseName, maxPoints } = data
  const [searchQuery, setSearchQuery] = useState("")

  const filteredStudents = useMemo(
    () => gradebook.filter((student) => student.studentName.toLowerCase().includes(searchQuery.trim().toLowerCase())),
    [gradebook, searchQuery],
  )
  const averageGrade = gradebook.length
    ? Math.round(gradebook.reduce((total, student) => total + student.totalScore, 0) / gradebook.length)
    : 0
  const highestGrade = gradebook.length ? Math.max(...gradebook.map((student) => student.totalScore)) : 0
  const needsSupport = gradebook.filter((student) => student.totalScore < 70).length
  const taskMaxPoints = assignments.reduce(
    (total, assignment) => total + (assignment.isExtraCredit ? 0 : assignment.maxPoints),
    0,
  )

  function getTaskPoints(student: GradebookData["gradebook"][number]) {
    return assignments.reduce((total, assignment) => total + (student.scores[assignment.id] ?? 0), 0)
  }

  function exportGradebook() {
    const header = ["Student", ...assignments.map((assignment) => `${assignment.title} (${assignment.maxPoints} pts)`), "Attendance", "Points earned", "Final grade"]
    const rows = filteredStudents.map((student) => [
      student.studentName,
      ...assignments.map((assignment) => student.scores[assignment.id] ?? "Not graded"),
      `${Math.round(student.attendancePercentage)}%`,
      `${student.earnedPoints}/${maxPoints}`,
      `${student.totalScore}%`,
    ])
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${courseName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-gradebook.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <MobileHeaderSetter title="Gradebook" subtitle={`${courseName} · Course records`} />

      <RecordStats>
        <RecordStat label="Students" value={gradebook.length} detail="graded" icon={Users} tone="indigo" />
        <RecordStat label="Class average" value={`${averageGrade}%`} detail="overall" icon={TrendingUp} tone={averageGrade >= 70 ? "emerald" : "rose"} />
        <RecordStat label="Highest grade" value={`${highestGrade}%`} detail="top score" icon={Award} tone="sky" />
        <RecordStat label="Below 70%" value={needsSupport} detail="need support" icon={AlertTriangle} tone={needsSupport ? "rose" : "emerald"} />
      </RecordStats>

      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <RecordPanelHeader
          title="Course grades"
          description={`${assignments.length} assignments · ${maxPoints} total points available`}
          trailing={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search students"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={exportGradebook} className="h-11 w-full sm:h-7 sm:w-auto">
                <Download className="size-4" />
                Export CSV
              </Button>
            </div>
          }
        />

        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <Search className="mb-3 size-8 text-muted-foreground/50" />
            <p className="font-semibold">No students found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different student name.</p>
          </div>
        ) : (
          <>
            <div className="hidden p-3 md:block">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky left-0 z-20 min-w-56 border-r bg-muted">Student</TableHead>
                    <TableHead className="min-w-32 text-center">Task total</TableHead>
                    <TableHead className="min-w-28 text-center">Attendance</TableHead>
                    <TableHead className="min-w-28 text-center">Total points</TableHead>
                    <TableHead className="min-w-24 text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.studentId} className="group">
                      <TableCell className="sticky left-0 z-10 border-r bg-card group-hover:bg-[var(--workspace-row-hover)]">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8 border">
                            <AvatarImage src={student.studentImage || undefined} />
                            <AvatarFallback className="text-xs font-bold">{student.studentName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="max-w-40 truncate font-semibold" title={student.studentName}>{student.studentName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {getTaskPoints(student)}
                        <span className="text-[10px] font-normal text-muted-foreground">/{taskMaxPoints}</span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{Math.round(student.attendancePercentage)}%</TableCell>
                      <TableCell className="text-center font-bold">{student.earnedPoints}/{maxPoints}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn("inline-flex min-w-14 justify-center rounded-md px-2 py-1 text-xs font-bold", gradeTone(student.totalScore))}>
                          {student.totalScore}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y md:hidden">
              {filteredStudents.map((student) => (
                <article key={student.studentId} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 border">
                      <AvatarImage src={student.studentImage || undefined} />
                      <AvatarFallback className="font-bold">{student.studentName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold">{student.studentName}</h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{student.earnedPoints} of {maxPoints} points earned</p>
                    </div>
                    <span className={cn("rounded-lg px-2.5 py-1.5 text-base font-bold", gradeTone(student.totalScore))}>{student.totalScore}%</span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(student.totalScore, 100)}%` }} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Task total</p>
                      <p className="mt-1 text-sm font-bold">{getTaskPoints(student)} / {taskMaxPoints}</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Attendance</p>
                      <p className="mt-1 text-sm font-bold">{Math.round(student.attendancePercentage)}%</p>
                    </div>
                  </div>

                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
