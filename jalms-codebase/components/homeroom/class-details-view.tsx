"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { GradeLevel } from "@prisma/client"
import { ArrowDownAZ, BarChart3, FileText, Search, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePanel } from "@/components/workspace/workspace-page"
import { educationStage, gradeLevelLabel } from "@/lib/grade-level"

interface StudentStat {
  id: string
  name: string
  image: string | null
  email: string
  attendance: number
  averageGrade: number
}

interface ClassDetailsViewProps {
  classData: {
    id: string
    name: string
    gradeLevel: GradeLevel
    term: { type: string; academicYear?: { name: string } | null }
  }
  students: StudentStat[]
}

function toneForPercentage(value: number) {
  if (value >= 90) return "GOOD"
  if (value >= 75) return "WARNING"
  return "CRITICAL"
}

export function ClassDetailsView({ classData, students }: ClassDetailsViewProps) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<"name" | "attendance" | "averageGrade">("name")
  const [descending, setDescending] = useState(false)

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return students
      .filter((student) => !query || student.name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query))
      .sort((first, second) => {
        const comparison = sortKey === "name"
          ? first.name.localeCompare(second.name)
          : first[sortKey] - second[sortKey]
        return descending ? -comparison : comparison
      })
  }, [descending, search, sortKey, students])

  const averageGrade = students.length ? students.reduce((total, student) => total + student.averageGrade, 0) / students.length : 0
  const averageAttendance = students.length ? students.reduce((total, student) => total + student.attendance, 0) / students.length : 0

  function changeSort(nextKey: typeof sortKey) {
    if (nextKey === sortKey) setDescending((value) => !value)
    else {
      setSortKey(nextKey)
      setDescending(false)
    }
  }

  return (
    <>
      <MobileHeaderSetter title={classData.name} subtitle={`${gradeLevelLabel(classData.gradeLevel)} · ${classData.term.academicYear?.name || "Current academic year"}`} backLink="/homeroom" />

      <WorkspacePanel className="grid overflow-hidden lg:grid-cols-[auto_minmax(16rem,1fr)]">
        <div className="grid grid-cols-3 divide-x border-b lg:border-r lg:border-b-0">
          <div className="min-w-24 px-3 py-2.5"><p className="text-base font-semibold tabular-nums">{students.length}</p><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Students</p></div>
          <div className="min-w-24 px-3 py-2.5"><p className="text-base font-semibold tabular-nums">{averageGrade.toFixed(1)}</p><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Avg grade</p></div>
          <div className="min-w-24 px-3 py-2.5"><p className="text-base font-semibold tabular-nums">{averageAttendance.toFixed(0)}%</p><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Attendance</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-2 p-2">
          <div className="relative min-w-0 flex-1"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students" className="pl-8" /></div>
          <StatusBadge status="ACTIVE" label={`${educationStage(classData.gradeLevel)} · ${gradeLevelLabel(classData.gradeLevel)}`} className="hidden shrink-0 sm:inline-flex" />
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="overflow-hidden">
        <div className="flex min-h-11 items-center justify-between gap-3 border-b bg-muted/20 px-3 py-2"><div><h2 className="text-sm font-semibold">Student records</h2><p className="text-xs text-muted-foreground">{filteredStudents.length} of {students.length} students</p></div><Users className="size-4 text-muted-foreground" /></div>

        {filteredStudents.length ? (
          <>
            <div className="divide-y md:hidden">
              {filteredStudents.map((student) => (
                <div key={student.id} className="px-3 py-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-9 border"><AvatarImage src={student.image || undefined} /><AvatarFallback>{student.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{student.name}</p><p className="truncate text-xs text-muted-foreground">{student.email}</p></div>
                    <div className="text-right"><p className="text-sm font-semibold tabular-nums">{student.averageGrade.toFixed(1)}</p><p className="text-[11px] text-muted-foreground">grade</p></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t pt-2">
                    <StatusBadge status={toneForPercentage(student.attendance)} label={`${student.attendance}% attendance`} />
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" asChild><Link href={`/homeroom/${classData.id}/students/${student.id}/grades`}><BarChart3 className="size-4" />Grades</Link></Button>
                      <Button variant="outline" size="sm" asChild><Link href={`/homeroom/${classData.id}/students/${student.id}/report`}><FileText className="size-4" />Report</Link></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead><button className="flex items-center gap-1.5" onClick={() => changeSort("name")}>Student <ArrowDownAZ className="size-3" /></button></TableHead><TableHead className="text-center"><button className="mx-auto flex items-center gap-1.5" onClick={() => changeSort("attendance")}>Attendance <ArrowDownAZ className="size-3" /></button></TableHead><TableHead className="text-center"><button className="mx-auto flex items-center gap-1.5" onClick={() => changeSort("averageGrade")}>Average grade <ArrowDownAZ className="size-3" /></button></TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>{filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell><div className="flex items-center gap-3"><Avatar className="size-8 border"><AvatarImage src={student.image || undefined} /><AvatarFallback>{student.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-medium">{student.name}</p><p className="truncate text-xs text-muted-foreground">{student.email}</p></div></div></TableCell>
                    <TableCell className="text-center"><StatusBadge status={toneForPercentage(student.attendance)} label={`${student.attendance}%`} /></TableCell>
                    <TableCell className="text-center font-semibold tabular-nums">{student.averageGrade.toFixed(1)}</TableCell>
                    <TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" asChild><Link href={`/homeroom/${classData.id}/students/${student.id}/grades`}><BarChart3 className="size-4" />Grades</Link></Button><Button variant="outline" size="sm" asChild><Link href={`/homeroom/${classData.id}/students/${student.id}/report`}><FileText className="size-4" />Report</Link></Button></div></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="px-4 py-10 text-center"><Search className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No students found</p><p className="mt-1 text-xs text-muted-foreground">Try a different name or email.</p></div>
        )}
      </WorkspacePanel>
    </>
  )
}
