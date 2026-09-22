import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getTeacherActiveCourses } from "@/lib/actions/teacher.actions"
import { getWorkspacePreference } from "@/lib/actions/workspace-preferences.actions"
import { ChatNotificationProvider } from "@/components/chat/chat-notification-provider"
import { MobileHeaderProvider } from "@/components/mobile-header-context"
import { AppearancePreferenceHydrator } from "@/components/appearance-preference-hydrator"
import { WorkspaceShell } from "@/components/navigation/workspace-shell"
import type { NavigationCourse } from "@/types/navigation"
import { isDirectMessagingEnabled } from "@/lib/features"
import { CourseChatNotificationProvider } from "@/components/course/course-chat-notification-provider"
import { latestSeenChatByCourse } from "@/lib/course-chat.shared"

function orderCourses(courses: NavigationCourse[], order: string[]) {
  const positions = new Map(order.map((id, index) => [id, index]))
  return [...courses].sort((a, b) => {
    const left = positions.get(a.id)
    const right = positions.get(b.id)
    if (left !== undefined || right !== undefined) return (left ?? Number.MAX_SAFE_INTEGER) - (right ?? Number.MAX_SAFE_INTEGER)
    return a.name.localeCompare(b.name)
  })
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userRecord = await db.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  })
  const roles = userRecord?.roles ?? session.user.roles ?? []

  const [teacherResult, studentResult, workspacePreference, navigationStates] = await Promise.all([
    roles.includes("SUBJECT_TEACHER") ? getTeacherActiveCourses(session.user.id) : Promise.resolve({ courses: [] }),
    roles.includes("STUDENT")
      ? import("@/lib/actions/student.actions").then(({ getStudentCourses }) => getStudentCourses(session.user.id))
      : Promise.resolve({ courses: [] }),
    getWorkspacePreference(session.user.id),
    db.courseNavigationState.findMany({ where: { userId: session.user.id } }).catch(() => []),
  ])

  const stateByKey = new Map<string, string | null | undefined>(
    navigationStates.map((state): [string, string | null | undefined] => [
      `${state.roleContext.toLowerCase()}:${state.courseId}`,
      typeof state.lastSectionKey === "string" ? state.lastSectionKey : null,
    ]),
  )
  const teacherCourses: NavigationCourse[] = (teacherResult.courses ?? []).map((course: any) => ({
    id: course.id,
    name: course.name,
    reportName: course.reportName,
    roleContext: "teacher",
    subject: course.subject ? { name: course.subject.name, code: course.subject.code } : null,
    class: course.class ? { name: course.class.name, color: course.class.color } : null,
    teacherName: session.user.name,
    iconImageUrl: course.iconImageUrl,
    lastSectionKey: stateByKey.get(`teacher:${course.id}`),
    summary: {
      studentCount: new Set([
        ...course.studentIds,
        ...course.courseEnrollments.map((enrollment: { studentId: string }) => enrollment.studentId),
      ]).size,
      taskCount: course._count.assignments,
      materialCount: course.materialAssignments.length,
      upcomingCount: course.assignments.length,
    },
  }))
  const studentCourses: NavigationCourse[] = (studentResult.courses ?? []).map((course: any) => ({
    id: course.id,
    name: course.name,
    reportName: course.reportName,
    roleContext: "student",
    subject: course.subject ? { name: course.subject.name, code: course.subject.code } : null,
    class: course.class ? { name: course.class.name, color: course.class.color } : null,
    teacherName: course.teacher?.name,
    iconImageUrl: course.iconImageUrl,
    lastSectionKey: stateByKey.get(`student:${course.id}`),
    summary: {
      taskCount: course._count.assignments,
      materialCount: course.materialAssignments.length,
      upcomingCount: course.assignments.length,
    },
  }))
  const courses = [
    ...orderCourses(teacherCourses, workspacePreference.teachingCourseOrder),
    ...orderCourses(studentCourses, workspacePreference.enrolledCourseOrder),
  ]
  const courseIds = [...new Set(courses.map((course) => course.id))]
  const latestMessages = await Promise.all(courseIds.map((courseId) => db.courseChatMessage.findFirst({
    where: { courseId, senderId: { not: session.user.id } },
    select: { courseId: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })))
  const latestByCourseId = new Map(latestMessages.filter((message) => message !== null).map((message) => [message.courseId, message.createdAt]))
  const seenByCourseId = latestSeenChatByCourse(navigationStates)
  const initialUnreadCourseIds = courses.filter((course) => {
    const latest = latestByCourseId.get(course.id)
    const seen = seenByCourseId.get(course.id)
    return latest && (!seen || latest > seen)
  }).map((course) => course.id)

  const directMessagesEnabled = isDirectMessagingEnabled()
  const workspace = (
    <CourseChatNotificationProvider courseIds={courseIds} initialUnreadCourseIds={[...new Set(initialUnreadCourseIds)]} currentUserId={session.user.id}>
      <MobileHeaderProvider>
        <AppearancePreferenceHydrator density={workspacePreference.density} theme={workspacePreference.theme} />
        <WorkspaceShell
          user={{
            id: session.user.id,
            name: session.user.name,
            nickname: session.user.nickname,
            email: session.user.email,
            image: session.user.image,
            roles,
          }}
          courses={courses}
          channelSidebarCollapsed={workspacePreference.channelSidebarCollapsed}
          directMessagesEnabled={directMessagesEnabled}
        >
          {children}
        </WorkspaceShell>
      </MobileHeaderProvider>
    </CourseChatNotificationProvider>
  )

  return directMessagesEnabled ? (
    <ChatNotificationProvider initialConversations={[]} userId={session.user.id}>
      {workspace}
    </ChatNotificationProvider>
  ) : workspace
}
