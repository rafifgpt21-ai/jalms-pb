"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, FileCheck2, Loader2, Plus, RefreshCcw, Save, Send, Trash2, UserRoundCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { upsertReportCard } from "@/lib/actions/homeroom.actions"
import { educationStage, gradeLevelLabel } from "@/lib/grade-level"
import type {
  ReportAchievement,
  ReportAttendanceSummary,
  ReportClassData,
  ReportCourseResult,
  ReportDevelopment,
  ReportExtracurricular,
  ReportStudent,
} from "@/lib/report-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { WorkspacePanel } from "@/components/workspace/workspace-page"

interface ReportCardFormProps {
  student: ReportStudent
  classData: ReportClassData
  courses: ReportCourseResult[]
  extracurriculars: ReportExtracurricular[]
  achievements: ReportAchievement[]
  development: ReportDevelopment[]
  attendance: ReportAttendanceSummary
  homeroomTeacherNote: string
  principalName: string
  isSnapshot: boolean
  calculatedAttendance?: ReportAttendanceSummary
}

function PanelHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4 py-2.5"><div><h2 className="text-sm font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{description}</p></div>{action}</div>
}

export function ReportCardForm({
  student,
  classData,
  courses,
  extracurriculars: initialExtracurriculars,
  achievements: initialAchievements,
  development: initialDevelopment,
  attendance: initialAttendance,
  homeroomTeacherNote: initialNote,
  principalName,
  isSnapshot,
  calculatedAttendance,
}: ReportCardFormProps) {
  const router = useRouter()
  const [extracurriculars, setExtracurriculars] = useState(initialExtracurriculars)
  const [achievements, setAchievements] = useState(initialAchievements)
  const [development, setDevelopment] = useState(initialDevelopment)
  const [attendance, setAttendance] = useState(initialAttendance)
  const [note, setNote] = useState(initialNote)
  const [savingMode, setSavingMode] = useState<"draft" | "publish" | null>(null)
  const averageGrade = courses.length ? courses.reduce((total, course) => total + course.grade, 0) / courses.length : 0
  const stage = educationStage(classData.gradeLevel)

  async function save(published: boolean) {
    setSavingMode(published ? "publish" : "draft")
    try {
      const result = await upsertReportCard(classData.id, student.id, {
        extracurriculars,
        achievements,
        development,
        attendance: {
          sick: Number(attendance.sick) || 0,
          excused: Number(attendance.excused) || 0,
          alpha: Number(attendance.alpha) || 0,
        },
        homeroomTeacherNote: note,
        published,
      })

      if (result.error) toast.error(result.error)
      else {
        toast.success(published ? (isSnapshot ? "Published report updated" : "Report published") : "Draft saved")
        router.refresh()
      }
    } catch {
      toast.error("Unable to save the report card")
    } finally {
      setSavingMode(null)
    }
  }

  function updateAttendance(field: keyof ReportAttendanceSummary, value: string) {
    setAttendance((current) => ({ ...current, [field]: Math.max(0, Number(value) || 0) }))
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[var(--workspace-section-gap)]">
      <WorkspacePanel className="overflow-hidden">
        <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FileCheck2 className="size-5" /></span>
            <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-semibold">{student.name}</h2><StatusBadge status={isSnapshot ? "PUBLISHED" : "DRAFT"} /></div><p className="truncate text-xs text-muted-foreground">{classData.name} · {gradeLevelLabel(classData.gradeLevel)} · {classData.term.academicYear?.name || "Current academic year"}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button variant="outline" size="sm" asChild><Link href={`/homeroom/${classData.id}/students/${student.id}/report/preview`}><Eye className="size-4" />Preview PDF</Link></Button>
            {!isSnapshot && <Button variant="secondary" size="sm" onClick={() => save(false)} disabled={savingMode !== null}>{savingMode === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save draft</Button>}
            <Button size="sm" onClick={() => save(true)} disabled={savingMode !== null} className={isSnapshot ? "" : "col-span-2 sm:col-span-1"}>{savingMode === "publish" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}{isSnapshot ? "Save published report" : "Publish report"}</Button>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x border-t bg-muted/20">
          <div className="px-3 py-2"><p className="text-sm font-semibold tabular-nums">{courses.length}</p><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Subjects</p></div>
          <div className="px-3 py-2"><p className="text-sm font-semibold tabular-nums">{averageGrade.toFixed(1)}</p><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Average</p></div>
          <div className="min-w-0 px-3 py-2"><p className="truncate text-sm font-semibold">{principalName || "Not configured"}</p><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{stage} principal</p></div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="overflow-hidden">
        <PanelHeading title="Academic results" description="Calculated course results that will appear in the report." />
        {courses.length ? <div className="divide-y">{courses.map((course, index) => (
          <div key={course.id || `${course.name}-${index}`} className="grid grid-cols-[minmax(0,1fr)_4rem] gap-3 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_4rem]">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{course.name}</p><p className="truncate text-xs text-muted-foreground">{course.competency || course.teacher || "No competency description"}</p></div>
            <div className="hidden text-right sm:block"><p className="text-sm tabular-nums">{course.attendance ?? 0}%</p><p className="text-[11px] text-muted-foreground">attendance</p></div>
            <div className="text-right"><p className="text-base font-semibold tabular-nums">{course.grade}</p><p className="text-[11px] text-muted-foreground">{course.letter || "score"}</p></div>
          </div>
        ))}</div> : <div className="px-4 py-8 text-center text-sm text-muted-foreground">No course results are available.</div>}
      </WorkspacePanel>

      <WorkspacePanel className="overflow-hidden">
        <PanelHeading title="Attendance summary" description="Days absent during this semester." action={calculatedAttendance && !isSnapshot ? <Button size="sm" variant="ghost" onClick={() => { setAttendance(calculatedAttendance); toast.info("Attendance restored from recorded sessions") }}><RefreshCcw className="size-4" />Use calculated</Button> : undefined} />
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          {([['sick', 'Sick'], ['excused', 'Excused'], ['alpha', 'Unexcused']] as const).map(([field, label]) => <div key={field} className="space-y-1.5"><Label htmlFor={`attendance-${field}`}>{label}</Label><div className="relative"><Input id={`attendance-${field}`} type="number" min={0} value={attendance[field]} onChange={(event) => updateAttendance(field, event.target.value)} className="pr-12" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">days</span></div></div>)}
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="overflow-hidden">
        <PanelHeading title="Extracurricular activities" description="Activities, predicates, and progress notes." action={<Button size="sm" variant="outline" onClick={() => setExtracurriculars((items) => [...items, { activity: "", predicate: "", note: "" }])}><Plus className="size-4" />Add activity</Button>} />
        {extracurriculars.length ? <div className="divide-y">{extracurriculars.map((item, index) => <div key={index} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1.4fr)_2.25rem] sm:items-end"><div className="space-y-1"><Label className="text-xs">Activity</Label><Input value={item.activity} onChange={(event) => setExtracurriculars((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, activity: event.target.value } : value))} placeholder="e.g. Scouts" /></div><div className="space-y-1"><Label className="text-xs">Predicate</Label><Input value={item.predicate} onChange={(event) => setExtracurriculars((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, predicate: event.target.value } : value))} placeholder="A / B / C" /></div><div className="space-y-1"><Label className="text-xs">Progress note</Label><Input value={item.note} onChange={(event) => setExtracurriculars((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, note: event.target.value } : value))} placeholder="Describe the student's progress" /></div><Button variant="ghost" size="icon-sm" onClick={() => setExtracurriculars((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove activity ${index + 1}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></div>)}</div> : <div className="px-4 py-8 text-center text-sm text-muted-foreground">No extracurricular activities added.</div>}
      </WorkspacePanel>

      <div className="grid items-start gap-[var(--workspace-section-gap)] lg:grid-cols-2">
        <WorkspacePanel className="overflow-hidden">
          <PanelHeading title="Achievements" description="Awards or notable accomplishments." action={<Button variant="ghost" size="icon-sm" onClick={() => setAchievements((items) => [...items, { name: "", note: "" }])} aria-label="Add achievement"><Plus className="size-4" /></Button>} />
          {achievements.length ? <div className="divide-y">{achievements.map((item, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2 p-3"><div className="space-y-2"><Input value={item.name} onChange={(event) => setAchievements((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, name: event.target.value } : value))} placeholder="Achievement" /><Input value={item.note} onChange={(event) => setAchievements((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, note: event.target.value } : value))} placeholder="Description" /></div><Button variant="ghost" size="icon-sm" onClick={() => setAchievements((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove achievement ${index + 1}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></div>)}</div> : <div className="px-4 py-8 text-center text-sm text-muted-foreground">No achievements added.</div>}
        </WorkspacePanel>

        <WorkspacePanel className="overflow-hidden">
          <PanelHeading title="Personal development" description="Development activities and observations." action={<Button variant="ghost" size="icon-sm" onClick={() => setDevelopment((items) => [...items, { activity: "", note: "" }])} aria-label="Add development activity"><Plus className="size-4" /></Button>} />
          {development.length ? <div className="divide-y">{development.map((item, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2 p-3"><div className="space-y-2"><Input value={item.activity} onChange={(event) => setDevelopment((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, activity: event.target.value } : value))} placeholder="Activity" /><Input value={item.note} onChange={(event) => setDevelopment((items) => items.map((value, itemIndex) => itemIndex === index ? { ...value, note: event.target.value } : value))} placeholder="Observation" /></div><Button variant="ghost" size="icon-sm" onClick={() => setDevelopment((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove development activity ${index + 1}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></div>)}</div> : <div className="px-4 py-8 text-center text-sm text-muted-foreground">No development activities added.</div>}
        </WorkspacePanel>
      </div>

      <WorkspacePanel className="overflow-hidden">
        <PanelHeading title="Homeroom teacher note" description="A concise message for the student and family." />
        <div className="p-4"><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write encouragement, guidance, or an overall progress note…" className="min-h-32 resize-y" /></div>
      </WorkspacePanel>

      <WorkspacePanel className="flex items-start gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><UserRoundCheck className="size-4" /></span>
        <div className="min-w-0"><h2 className="text-sm font-semibold">Principal signature</h2><p className="mt-0.5 text-sm">{principalName || "No principal has been configured for this school stage."}</p><p className="mt-1 text-xs text-muted-foreground">Automatically selected from the {stage} principal setting because this class is {gradeLevelLabel(classData.gradeLevel)}.</p></div>
      </WorkspacePanel>
    </div>
  )
}
