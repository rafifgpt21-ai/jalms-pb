import { Suspense } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, CalendarClock, ClipboardList, FolderOpen, GraduationCap, UserRound } from "lucide-react"
import { getStudentCourses } from "@/lib/actions/student.actions"
import { CourseIdentityBadge } from "@/components/course/course-identity-badge"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { StudentCoursesContentSkeleton } from "@/components/navigation/route-skeletons"
import { Badge } from "@/components/ui/badge"
import { WorkspacePage, WorkspacePanel } from "@/components/workspace/workspace-page"

export const dynamic = "force-dynamic"

async function StudentCoursesContent() {
  const { courses, error } = await getStudentCourses()

  if (error || !courses) {
    return (
      <WorkspacePanel className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-md border border-destructive/20 bg-destructive/10 text-destructive">
          <BookOpen className="size-5" />
        </div>
        <h2 className="mt-3 text-sm font-semibold">Courses could not be loaded</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Refresh the page to try again. If the issue continues, contact your administrator.</p>
      </WorkspacePanel>
    )
  }

  const upcomingTasks = courses.reduce((total, course) => total + course.assignments.length, 0)
  const materials = courses.reduce((total, course) => total + course.materialAssignments.length, 0)

  return (
    <>
      <WorkspacePanel className="grid grid-cols-3 overflow-hidden">
        <div className="flex min-w-0 items-center gap-2.5 border-r px-3 py-2.5">
          <GraduationCap className="hidden size-4 shrink-0 text-primary min-[430px]:block" />
          <div className="min-w-0"><p className="text-base font-semibold leading-none">{courses.length}</p><p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Courses</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-2.5 border-r px-3 py-2.5">
          <CalendarClock className="hidden size-4 shrink-0 text-primary min-[430px]:block" />
          <div className="min-w-0"><p className="text-base font-semibold leading-none">{upcomingTasks}</p><p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Upcoming</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
          <FolderOpen className="hidden size-4 shrink-0 text-primary min-[430px]:block" />
          <div className="min-w-0"><p className="text-base font-semibold leading-none">{materials}</p><p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Materials</p></div>
        </div>
      </WorkspacePanel>

      {courses.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const courseName = course.reportName || course.name
            const subjectLabel = course.subject ? `${course.subject.code} · ${course.subject.name}` : "Course workspace"
            const termLabel = course.term.type === "ODD" ? "Odd term" : "Even term"

            return (
              <Link
                href={`/student/courses/${course.id}`}
                key={course.id}
                prefetch
                className="group rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                aria-label={`Open ${courseName}`}
              >
                <WorkspacePanel className="flex h-full min-h-40 flex-col overflow-hidden transition-[border-color,box-shadow] duration-150 group-hover:border-primary/35 group-hover:shadow-sm">
                  <div className="flex items-start gap-3 p-3">
                    <CourseIdentityBadge
                      course={{
                        id: course.id,
                        name: course.name,
                        reportName: course.reportName,
                        iconImageUrl: course.iconImageUrl,
                        subject: course.subject ? { code: course.subject.code, name: course.subject.name } : null,
                        class: course.class ? { name: course.class.name, color: course.class.color } : null,
                        roleContext: "student",
                      }}
                      className="size-10 rounded-md text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold leading-5 group-hover:text-primary">{courseName}</h2>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subjectLabel}</p>
                        </div>
                        <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex min-w-0 items-center gap-1.5"><UserRound className="size-3.5 shrink-0" /><span className="truncate">{course.teacher.name}</span></span>
                        {course.class && <Badge variant="outline" className="max-w-full font-normal"><span className="truncate">{course.class.name}</span></Badge>}
                        <span>{termLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-3 divide-x border-t bg-muted/20">
                    <div className="flex min-w-0 items-center gap-2 px-3 py-2">
                      <CalendarClock className="hidden size-3.5 shrink-0 text-muted-foreground min-[430px]:block" />
                      <div className="min-w-0"><p className="text-sm font-semibold leading-none">{course.assignments.length}</p><p className="mt-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">Upcoming</p></div>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 px-3 py-2">
                      <ClipboardList className="hidden size-3.5 shrink-0 text-muted-foreground min-[430px]:block" />
                      <div className="min-w-0"><p className="text-sm font-semibold leading-none">{course._count.assignments}</p><p className="mt-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">Tasks</p></div>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 px-3 py-2">
                      <FolderOpen className="hidden size-3.5 shrink-0 text-muted-foreground min-[430px]:block" />
                      <div className="min-w-0"><p className="text-sm font-semibold leading-none">{course.materialAssignments.length}</p><p className="mt-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">Materials</p></div>
                    </div>
                  </div>
                </WorkspacePanel>
              </Link>
            )
          })}
        </div>
      ) : (
        <WorkspacePanel className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
          <div className="flex size-10 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground"><BookOpen className="size-5" /></div>
          <h2 className="mt-3 text-sm font-semibold">No active courses</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Your enrolled courses will appear here when an active term begins.</p>
        </WorkspacePanel>
      )}
    </>
  )
}

export default function StudentCoursesPage() {
  return (
    <WorkspacePage>
      <MobileHeaderSetter title="My Courses" subtitle="Your active learning spaces" />
      <Suspense fallback={<StudentCoursesContentSkeleton />}><StudentCoursesContent /></Suspense>
    </WorkspacePage>
  )
}
