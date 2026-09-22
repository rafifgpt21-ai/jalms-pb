import type { LucideIcon } from "lucide-react"
import {
  Activity, BookOpen, Calendar, CalendarDays, CalendarRange, Clock, FileQuestion, FileText,
  GraduationCap, LayoutDashboard, Library, ListTodo, MessageSquare,
  MessagesSquare, PackageOpen, PieChart, RotateCcw, School, Settings, Table, Users,
} from "lucide-react"
import type { Role } from "@prisma/client"
import type { NavigationCourse } from "@/types/navigation"

export type NavigationSection = { id: string; label: string; href: string; icon: LucideIcon; actionHref?: string }
export type NavigationGroup = { id: string; label?: string; sections: NavigationSection[] }
export type BrowseContext =
  | { kind: "home" }
  | { kind: "messages" }
  | { kind: "admin" | "homeroom" | "family" }
  | { kind: "course"; course: NavigationCourse }

export const ADMIN_NAV_SECTIONS: NavigationSection[] = [
  { id: "dashboard", label: "Overview", href: "/admin", icon: LayoutDashboard },
  { id: "users", label: "Users", href: "/admin/users", icon: Users },
  { id: "classes", label: "Classes", href: "/admin/classes", icon: School },
  { id: "subjects", label: "Subjects", href: "/admin/subjects", icon: Library },
  { id: "courses", label: "Courses", href: "/admin/courses", icon: BookOpen },
  { id: "semesters", label: "Semesters", href: "/admin/semesters", icon: CalendarRange },
  { id: "rollover", label: "Rollover", href: "/admin/rollover", icon: RotateCcw },
  { id: "schedule", label: "Schedule", href: "/admin/schedule", icon: Calendar },
  { id: "grading", label: "Grading", href: "/admin/grading", icon: PieChart },
  { id: "miscellaneous", label: "Miscellaneous", href: "/admin/miscellaneous", icon: PackageOpen },
  { id: "socials", label: "Socials", href: "/admin/socials", icon: Activity },
]

export function contextFromPath(pathname: string, courses: NavigationCourse[]): BrowseContext {
  const match = pathname.match(/^\/(teacher|student)\/courses\/([^/]+)/)
  if (match) {
    const course = courses.find((item) => item.roleContext === match[1] && item.id === match[2])
    if (course) return { kind: "course", course }
  }
  if (pathname.startsWith("/socials")) return { kind: "messages" }
  if (["/teacher", "/student", "/parent"].includes(pathname)) return { kind: "home" }
  if (pathname.startsWith("/admin")) return { kind: "admin" }
  if (pathname.startsWith("/homeroom")) return { kind: "homeroom" }
  if (pathname.startsWith("/parent")) return { kind: "family" }
  return { kind: "home" }
}

export function defaultCourseHref(course: NavigationCourse) {
  const base = `/${course.roleContext}/courses/${course.id}`
  const allowed = course.roleContext === "teacher"
    ? new Set(["announcements", "chat", "tasks", "materials", "tasks-summary", "attendance", "gradebook", "settings"])
    : new Set(["announcements", "chat", "tasks", "materials", "grades", "attendance"])
  const key = course.lastSectionKey && allowed.has(course.lastSectionKey) ? course.lastSectionKey : "tasks"
  return `${base}/${key}`
}

export function groupsForContext(context: BrowseContext, roles: Role[], directMessagesEnabled = true): NavigationGroup[] {
  if (context.kind === "course") {
    const base = `/${context.course.roleContext}/courses/${context.course.id}`
    if (context.course.roleContext === "teacher") return [
      { id: "course", sections: [
        { id: "announcements", label: "Announcements", href: `${base}/announcements`, icon: MessageSquare },
        { id: "chat", label: "Chat", href: `${base}/chat`, icon: MessagesSquare },
      ] },
      { id: "classroom", label: "Classroom", sections: [
        { id: "tasks", label: "Tasks", href: `${base}/tasks`, icon: ListTodo, actionHref: `${base}/tasks/new` },
        { id: "materials", label: "Materials", href: `${base}/materials`, icon: FileText },
      ] },
      { id: "records", label: "Records", sections: [
        { id: "tasks-summary", label: "Task Summary", href: `${base}/tasks-summary`, icon: Table },
        { id: "attendance", label: "Attendance", href: `${base}/attendance`, icon: Clock },
        { id: "gradebook", label: "Gradebook", href: `${base}/gradebook`, icon: GraduationCap },
      ] },
      { id: "manage", label: "Manage", sections: [{ id: "settings", label: "Settings", href: `${base}/settings`, icon: Settings }] },
    ]
    return [
      { id: "course", sections: [
        { id: "announcements", label: "Announcements", href: `${base}/announcements`, icon: MessageSquare },
        { id: "chat", label: "Chat", href: `${base}/chat`, icon: MessagesSquare },
      ] },
      { id: "learn", label: "Learn", sections: [
        { id: "tasks", label: "Tasks", href: `${base}/tasks`, icon: ListTodo },
        { id: "materials", label: "Materials", href: `${base}/materials`, icon: FileText },
      ] },
      { id: "progress", label: "Progress", sections: [
        { id: "grades", label: "Grades", href: `${base}/grades`, icon: GraduationCap },
        { id: "attendance", label: "Attendance", href: `${base}/attendance`, icon: Clock },
      ] },
    ]
  }

  if (context.kind === "admin") return [{ id: "admin", sections: directMessagesEnabled ? ADMIN_NAV_SECTIONS : ADMIN_NAV_SECTIONS.filter((section) => section.id !== "socials") }]
  if (context.kind === "homeroom") return [{ id: "homeroom", sections: [{ id: "class", label: "My Class", href: "/homeroom", icon: School }] }]
  if (context.kind === "family") return [{ id: "family", sections: [{ id: "overview", label: "Family Overview", href: "/parent", icon: Users }] }]
  if (context.kind === "messages") return directMessagesEnabled ? [{ id: "messages", sections: [{ id: "messages", label: "Direct Messages", href: "/socials", icon: MessageSquare }] }] : []

  const groups: NavigationGroup[] = []
  if (roles.includes("SUBJECT_TEACHER")) groups.push({ id: "teaching", label: "Teaching", sections: [
    { id: "teacher", label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { id: "attendance", label: "Daily Attendance", href: "/teacher/attendance", icon: Clock },
    { id: "schedule", label: "Weekly Schedule", href: "/teacher/schedule", icon: CalendarDays },
    { id: "quizzes", label: "Quiz Library", href: "/teacher/quiz-manager", icon: FileQuestion },
    { id: "materials", label: "Material Library", href: "/teacher/materials", icon: FileText },
  ] })
  if (roles.includes("STUDENT")) groups.push({ id: "learning", label: "Learning", sections: [
    { id: "student", label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { id: "courses", label: "My Courses", href: "/student/courses", icon: BookOpen },
    { id: "grades", label: "Grades", href: "/student/grades", icon: GraduationCap },
    { id: "attendance", label: "Attendance", href: "/student/attendance", icon: Clock },
    { id: "schedule", label: "Schedule", href: "/student/schedule", icon: Calendar },
    { id: "profile", label: "Learning Profile", href: "/student/learning-profile", icon: PieChart },
  ] })
  if (roles.includes("PARENT")) groups.push({ id: "family", label: "Family", sections: [
    { id: "family-dashboard", label: "Family Dashboard", href: "/parent", icon: Users },
  ] })
  return groups
}

export function contextLabel(context: BrowseContext) {
  if (context.kind === "course") return context.course.reportName || context.course.name
  return { home: "Home", messages: "Messages", admin: "Administration", homeroom: "Homeroom", family: "Family" }[context.kind]
}

export function isSectionActive(pathname: string, section: NavigationSection) {
  if (["dashboard", "teacher", "student", "homeroom-dashboard", "family-dashboard"].includes(section.id)) return pathname === section.href
  return pathname === section.href || pathname.startsWith(`${section.href}/`)
}
