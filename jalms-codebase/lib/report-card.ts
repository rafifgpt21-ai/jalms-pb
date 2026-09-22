import type { GradeLevel } from "@prisma/client"

export interface ReportStudent {
  id: string
  name: string
  email?: string
  image?: string | null
  nis?: string | null
  nisn?: string | null
  officialId?: string | null
}

export interface ReportClassData {
  id: string
  name: string
  gradeLevel: GradeLevel
  term: {
    type: string
    academicYear?: { name: string } | null
  }
  homeroomTeacher?: { name: string } | null
}

export interface ReportCourseResult {
  id?: string
  name: string
  teacher?: string
  grade: number
  letter?: string
  competency?: string
  attendance?: number
}

export interface ReportExtracurricular {
  activity: string
  predicate: string
  note: string
}

export interface ReportAchievement {
  name: string
  note: string
}

export interface ReportDevelopment {
  activity: string
  note: string
}

export interface ReportAttendanceSummary {
  sick: number
  excused: number
  alpha: number
}

export interface ReportCompetencyRule {
  grade: string
  description?: string
}
