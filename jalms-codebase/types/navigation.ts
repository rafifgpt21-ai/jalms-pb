import type { ClassColor, Role } from "@prisma/client"

export type CourseRoleContext = "teacher" | "student"

export interface CourseNavigationSummary {
  taskCount: number
  materialCount: number
  upcomingCount: number
  studentCount?: number
}

export interface NavigationCourse {
  id: string
  name: string
  reportName?: string | null
  roleContext: CourseRoleContext
  subject?: { name: string; code: string } | null
  class?: { name: string; color?: ClassColor | null } | null
  teacherName?: string | null
  iconImageUrl?: string | null
  lastSectionKey?: string | null
  summary?: CourseNavigationSummary
}

export interface WorkspaceUser {
  id: string
  name?: string | null
  nickname?: string | null
  email?: string | null
  image?: string | null
  roles: Role[]
}
