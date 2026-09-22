export const ROLES = ["ADMIN", "SUBJECT_TEACHER", "HOMEROOM_TEACHER", "STUDENT", "PARENT"] as const
export type Role = (typeof ROLES)[number]

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "EXCUSED", "SKIPPED", "PENDING"] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]

export const ASSIGNMENT_TYPES = ["SUBMISSION", "NON_SUBMISSION", "QUIZ"] as const
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number]

export const COURSE_ROLE_CONTEXTS = ["TEACHER", "STUDENT"] as const
export type CourseRoleContext = (typeof COURSE_ROLE_CONTEXTS)[number]

export const COURSE_ENROLLMENT_SOURCES = ["LEGACY", "MANUAL", "CLASS_SEED", "CLASS_SYNC", "IMPORT", "ROLLOVER"] as const
export type CourseEnrollmentSource = (typeof COURSE_ENROLLMENT_SOURCES)[number]

export const CLASS_ENROLLMENT_SOURCES = ["LEGACY", "MANUAL", "IMPORT", "COPY", "ROLLOVER"] as const
export type ClassEnrollmentSource = (typeof CLASS_ENROLLMENT_SOURCES)[number]

export const SEMESTER_TYPES = ["ODD", "EVEN"] as const
export type SemesterType = (typeof SEMESTER_TYPES)[number]

export const GRADE_LEVELS = ["GRADE_7", "GRADE_8", "GRADE_9", "GRADE_10", "GRADE_11", "GRADE_12"] as const
export type GradeLevel = (typeof GRADE_LEVELS)[number]

export const ACADEMIC_DOMAINS = ["SCIENCE_TECHNOLOGY", "SOCIAL_HUMANITIES", "LANGUAGE_COMMUNICATION", "ARTS_CREATIVITY", "PHYSICAL_EDUCATION", "SPIRITUALITY_ETHICS"] as const
export type AcademicDomain = (typeof ACADEMIC_DOMAINS)[number]

export type UiDensity = "COMPACT" | "COMFORTABLE"
export type ThemePreference = "SYSTEM" | "LIGHT" | "DARK"
export type CourseEnrollmentMode = "MANUAL" | "CLASS_SEEDED" | "CLASS_SYNC"
export type RolloverStatus = "DRAFT" | "VALIDATING" | "READY" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED"
export type QuizGradingType = "ALL_OR_NOTHING" | "RIGHT_MINUS_WRONG"
