"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  executeAcademicRollover,
  previewAcademicRollover,
  type AcademicRolloverPreview,
  type RolloverExecutionPlan,
  type RolloverOptions,
} from "@/lib/actions/rollover.actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WorkspacePanel } from "@/components/workspace/workspace-page"
import { StatusBadge } from "@/components/ui/status-badge"

const defaults: RolloverOptions = {
  classes: true,
  classRosters: true,
  courses: true,
  courseMemberships: true,
  assignmentsAsDrafts: true,
  announcementsAsDrafts: true,
  schedules: true,
  materials: true,
}

const labels: Record<keyof RolloverOptions, string> = {
  classes: "Classes, grades, and colors",
  classRosters: "Selected class rosters",
  courses: "Courses and settings",
  courseMemberships: "Course memberships",
  assignmentsAsDrafts: "Tasks as drafts",
  announcementsAsDrafts: "Announcements as drafts",
  schedules: "Schedules",
  materials: "Material assignments",
}

function createExecutionPlan(preview: AcademicRolloverPreview): RolloverExecutionPlan {
  return {
    classes: preview.classes.filter((item) => !item.graduated).map((item) => ({
      sourceClassId: item.sourceClassId,
      targetName: item.suggestedTargetName || item.sourceName,
      reuseTargetClassId: item.reuseCandidate?.id ?? null,
      confirmReuse: false,
      includedStudentIds: item.students.filter((student) => student.selected).map((student) => student.id),
    })),
    courses: preview.courses.filter((item) => !item.excluded).map((item) => ({
      sourceCourseId: item.sourceCourseId,
      targetName: item.suggestedTargetName,
      reuseTargetCourseId: item.reuseCandidate?.id ?? null,
      confirmReuse: false,
    })),
  }
}

export function RolloverWorkspace({ terms, recent }: { terms: any[]; recent: any[] }) {
  const [source, setSource] = useState("")
  const [target, setTarget] = useState("")
  const [options, setOptions] = useState(defaults)
  const [preview, setPreview] = useState<AcademicRolloverPreview | null>(null)
  const [plan, setPlan] = useState<RolloverExecutionPlan>({ classes: [], courses: [] })
  const [pending, startTransition] = useTransition()

  const resetPreview = () => {
    setPreview(null)
    setPlan({ classes: [], courses: [] })
  }

  const runPreview = () => startTransition(async () => {
    const result = await previewAcademicRollover(source, target)
    if (result.error || !result.preview) {
      toast.error(result.error || "Unable to preview rollover")
      return
    }
    setPreview(result.preview)
    setPlan(createExecutionPlan(result.preview))
  })

  const execute = () => startTransition(async () => {
    const result = await executeAcademicRollover(source, target, options, plan)
    if (("error" in result && result.error) || !("status" in result)) {
      toast.error(("error" in result && result.error) || "Rollover could not be completed")
      return
    }
    toast.success(result.status === "COMPLETED" ? "Semester rollover completed" : "Rollover completed with warnings")
    resetPreview()
  })

  const updateClassName = (sourceClassId: string, targetName: string) => {
    const candidate = preview?.classes.find((item) => item.sourceClassId === sourceClassId)?.reuseCandidate
    const matchesCandidate = candidate?.name.toLowerCase() === targetName.trim().toLowerCase()
    setPlan((current) => ({
      ...current,
      classes: current.classes.map((item) => item.sourceClassId === sourceClassId
        ? { ...item, targetName, reuseTargetClassId: matchesCandidate ? candidate.id : null, confirmReuse: false }
        : item),
    }))
  }

  const updateCourseName = (sourceCourseId: string, targetName: string) => {
    const candidate = preview?.courses.find((item) => item.sourceCourseId === sourceCourseId)?.reuseCandidate
    const matchesCandidate = candidate?.name.toLowerCase() === targetName.trim().toLowerCase()
    setPlan((current) => ({
      ...current,
      courses: current.courses.map((item) => item.sourceCourseId === sourceCourseId
        ? { ...item, targetName, reuseTargetCourseId: matchesCandidate ? candidate.id : null, confirmReuse: false }
        : item),
    }))
  }

  const updateOption = (key: keyof RolloverOptions, checked: boolean) => {
    setOptions((current) => {
      const next = { ...current, [key]: checked }
      if (key === "classes" && !checked) Object.assign(next, { classRosters: false, courses: false, courseMemberships: false })
      if (key === "courses" && !checked) next.courseMemberships = false
      if (key === "classRosters" && checked) next.classes = true
      if (key === "courses" && checked) next.classes = true
      if (key === "courseMemberships" && checked) Object.assign(next, { classes: true, courses: true })
      return next
    })
  }

  const toggleStudent = (sourceClassId: string, studentId: string, checked: boolean) => {
    setPlan((current) => ({
      ...current,
      classes: current.classes.map((item) => {
        if (item.sourceClassId !== sourceClassId) return item
        const selected = new Set(item.includedStudentIds)
        checked ? selected.add(studentId) : selected.delete(studentId)
        return { ...item, includedStudentIds: [...selected] }
      }),
    }))
  }

  const unconfirmedReuse = preview?.classes.some((item) => {
    const mapping = plan.classes.find((candidate) => candidate.sourceClassId === item.sourceClassId)
    return item.reuseCandidate && mapping?.reuseTargetClassId === item.reuseCandidate.id && !mapping.confirmReuse
  }) || preview?.courses.some((item) => {
    const mapping = plan.courses.find((candidate) => candidate.sourceCourseId === item.sourceCourseId)
    return item.reuseCandidate && mapping?.reuseTargetCourseId === item.reuseCandidate.id && !mapping.confirmReuse
  })

  return <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="space-y-3">
      <WorkspacePanel className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-sm font-medium">Copy from</div>
            <Select value={source} onValueChange={(value) => { setSource(value); resetPreview() }}>
              <SelectTrigger><SelectValue placeholder="Source semester" /></SelectTrigger>
              <SelectContent>{terms.map((term) => <SelectItem key={term.id} value={term.id}>{term.academicYear.name} · {term.type.toLowerCase()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">Copy into</div>
            <Select value={target} onValueChange={(value) => { setTarget(value); resetPreview() }}>
              <SelectTrigger><SelectValue placeholder="Target semester" /></SelectTrigger>
              <SelectContent>{terms.map((term) => <SelectItem key={term.id} value={term.id}>{term.academicYear.name} · {term.type.toLowerCase()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">Teaching setup to carry forward</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(labels).map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <Checkbox checked={options[key as keyof RolloverOptions]} onCheckedChange={(checked) => updateOption(key as keyof RolloverOptions, checked === true)} />
              {label}
            </label>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Grades, submissions, attendance records, and report cards are never copied. Tasks and announcements are drafts.</p>
        </div>
        {!preview && <Button disabled={pending || !source || !target} onClick={runPreview}>{pending ? "Checking..." : "Preview impact"}</Button>}
      </WorkspacePanel>

      {preview && <>
        <WorkspacePanel className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{preview.source} → {preview.target}</div>
              <div className="text-sm text-muted-foreground">{preview.transition === "PROMOTE" ? "Annual grade promotion" : "Same-grade semester continuation"}</div>
            </div>
            <Badge variant={preview.transition === "PROMOTE" ? "default" : "secondary"}>{preview.transition.toLowerCase()}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div><b>{preview.counts.classes}</b><br />target classes</div>
            <div><b>{preview.counts.students}</b><br />eligible students</div>
            <div><b>{preview.counts.courses}</b><br />courses</div>
            <div><b>{preview.counts.assignments}</b><br />tasks</div>
          </div>
          {preview.counts.graduatingClasses > 0 && <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-200">
            {preview.counts.graduatingClasses} grade 12 class(es) and {preview.counts.graduatingStudents} student(s) will be excluded as graduates.
          </div>}
        </WorkspacePanel>

        <WorkspacePanel className="overflow-hidden">
          <div className="border-b px-4 py-3">
            <div className="font-medium">Class and roster mapping</div>
            <div className="text-xs text-muted-foreground">Edit target names and exclude students who should not move with their class.</div>
          </div>
          <div className="divide-y">
            {preview.classes.map((item) => {
              const mapping = plan.classes.find((candidate) => candidate.sourceClassId === item.sourceClassId)
              if (item.graduated) return <div key={item.sourceClassId} className="flex items-center justify-between gap-3 bg-amber-500/5 px-4 py-3">
                <div><div className="font-medium">{item.sourceName}</div><div className="text-xs text-muted-foreground">Grade {item.sourceGrade} · {item.sourceStage}</div></div>
                <Badge variant="secondary">Graduating · {item.students.length} students</Badge>
              </div>

              if (!mapping) return null
              return <div key={item.sourceClassId} className="space-y-3 px-4 py-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,1fr)] md:items-end">
                  <div>
                    <div className="font-medium">{item.sourceName}</div>
                    <div className="text-xs text-muted-foreground">Grade {item.sourceGrade} · {item.sourceStage} → Grade {item.targetGrade} · {item.targetStage}</div>
                  </div>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Target class name</span>
                    <Input value={mapping.targetName} onChange={(event) => updateClassName(item.sourceClassId, event.target.value)} placeholder={`${item.targetGrade} or ${item.targetGrade}A`} />
                  </label>
                </div>
                {item.reuseCandidate && mapping.reuseTargetClassId === item.reuseCandidate.id && <label className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-sm">
                  <Checkbox checked={mapping.confirmReuse} onCheckedChange={(checked) => setPlan((current) => ({
                    ...current,
                    classes: current.classes.map((candidate) => candidate.sourceClassId === item.sourceClassId ? { ...candidate, confirmReuse: checked === true } : candidate),
                  }))} />
                  Reuse existing class “{item.reuseCandidate.name}” and add the selected students
                </label>}
                {options.classRosters && <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Roster selection</span>
                    <span>{mapping.includedStudentIds.length} of {item.students.length} selected</span>
                  </div>
                  <div className="grid max-h-44 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
                    {item.students.map((student) => <label key={student.id} className="flex items-start gap-2 rounded p-1.5 text-sm hover:bg-muted/50">
                      <Checkbox
                        checked={mapping.includedStudentIds.includes(student.id)}
                        disabled={Boolean(student.conflictingTargetClass)}
                        onCheckedChange={(checked) => toggleStudent(item.sourceClassId, student.id, checked === true)}
                      />
                      <span>{student.name}{student.conflictingTargetClass && <span className="block text-xs text-amber-700 dark:text-amber-300">Already in {student.conflictingTargetClass.name}</span>}</span>
                    </label>)}
                  </div>
                </div>}
              </div>
            })}
          </div>
        </WorkspacePanel>

        {options.courses && <WorkspacePanel className="overflow-hidden">
          <div className="border-b px-4 py-3">
            <div className="font-medium">Course names</div>
            <div className="text-xs text-muted-foreground">Suggested names replace an exact old class name and remain editable.</div>
          </div>
          <div className="divide-y">
            {preview.courses.filter((item) => !item.excluded).map((item) => {
              const mapping = plan.courses.find((candidate) => candidate.sourceCourseId === item.sourceCourseId)
              if (!mapping) return null
              return <div key={item.sourceCourseId} className="space-y-2 px-4 py-3">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(260px,1fr)] md:items-center">
                  <div><div className="text-sm font-medium">{item.sourceName}</div><div className="text-xs text-muted-foreground">Source course</div></div>
                  <Input value={mapping.targetName} onChange={(event) => updateCourseName(item.sourceCourseId, event.target.value)} />
                </div>
                {item.reuseCandidate && mapping.reuseTargetCourseId === item.reuseCandidate.id && <label className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <Checkbox checked={mapping.confirmReuse} onCheckedChange={(checked) => setPlan((current) => ({
                    ...current,
                    courses: current.courses.map((candidate) => candidate.sourceCourseId === item.sourceCourseId ? { ...candidate, confirmReuse: checked === true } : candidate),
                  }))} />
                  Reuse existing course “{item.reuseCandidate.name}”; teaching content will not be duplicated
                </label>}
              </div>
            })}
          </div>
        </WorkspacePanel>}

        <WorkspacePanel className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">Execution revalidates grades, names, rosters, and target conflicts.</p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={pending} onClick={runPreview}>Refresh preview</Button>
            <Button disabled={pending || Boolean(unconfirmedReuse)} onClick={execute}>{pending ? "Running..." : unconfirmedReuse ? "Confirm existing targets" : "Confirm rollover"}</Button>
          </div>
        </WorkspacePanel>
      </>}
    </div>

    <WorkspacePanel className="h-fit overflow-hidden">
      <div className="border-b px-4 py-3 font-medium">Recent runs</div>
      <div className="divide-y">{recent.map((run) => <div key={run.id} className="px-4 py-3 text-sm">
        <div className="flex items-center justify-between"><StatusBadge status={run.status} /><span className="text-xs text-muted-foreground">{new Date(run.createdAt).toLocaleDateString()}</span></div>
        <div className="mt-1 text-xs text-muted-foreground">{(run.summary as any)?.classesCreated || 0} created · {(run.summary as any)?.classesReused || 0} reused · {(run.summary as any)?.studentsPromoted || 0} students</div>
      </div>)}{!recent.length && <div className="p-8 text-center text-sm text-muted-foreground">No rollover runs yet.</div>}</div>
    </WorkspacePanel>
  </div>
}
