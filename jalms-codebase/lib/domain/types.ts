import type {
  AcademicDomain,
  AssignmentType,
  AttendanceStatus,
  ContentStatus,
  CourseEnrollmentMode,
  CourseRoleContext,
  GradeLevel,
  Role,
  SemesterType,
} from "./enums"

export type PocketBaseRecord = {
  id: string
  collectionId?: string
  collectionName?: string
  created?: string
  updated?: string
  [key: string]: unknown
}

export type DomainUser = PocketBaseRecord & {
  name: string
  email: string
  nickname?: string | null
  image?: string | null
  avatarConfig?: Record<string, unknown> | null
  roles: Role[]
  isActive: boolean
}

export type DomainCourse = PocketBaseRecord & {
  name: string
  reportName?: string | null
  subjectId?: string | null
  classId?: string | null
  termId: string
  teacherId: string
  studentIds: string[]
  attendancePoolScore: number
  competencyRules?: unknown
  iconImageUrl?: string | null
  iconImageKey?: string | null
  enrollmentMode?: CourseEnrollmentMode | null
}

export type DomainAssignment = PocketBaseRecord & {
  title: string
  description?: string | null
  dueDate: string
  type: AssignmentType
  maxPoints: number
  courseId: string
  academicDomains: AcademicDomain[]
  status?: ContentStatus | null
}

export type DomainAcademicTerm = PocketBaseRecord & {
  type: SemesterType
  startDate: string
  endDate: string
  academicYearId: string
}

export type DomainClass = PocketBaseRecord & {
  name: string
  termId: string
  homeroomTeacherId?: string | null
  gradeLevel: GradeLevel
}

export type DomainAttendance = PocketBaseRecord & {
  date: string
  status: AttendanceStatus
  courseId: string
  studentId: string
  period: number
}

export type DomainCourseChatMessage = PocketBaseRecord & {
  courseId: string
  senderId: string
  content: string
  createdAt: string
}

export type DomainMessage = PocketBaseRecord & {
  conversationId: string
  senderId: string
  content: string
  readByIds: string[]
  createdAt: string
}

export type SessionUserShape = {
  id: string
  name?: string | null
  email?: string | null
  roles: Role[]
  nickname?: string | null
  image?: string | null
  avatarConfig?: unknown
}

export type CourseNavigationKey = {
  userId: string
  courseId: string
  roleContext: CourseRoleContext
}
