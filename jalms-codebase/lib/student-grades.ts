export type StudentGradeRecord = {
  courseId: string
  courseName: string
  teacherName: string
  grade: number
  attendancePercentage: number
  breakdown: {
    studentPoints: number
    maxPointsPossible: number
    attendanceScore: number
    extraCreditPoints: number
    attendancePool: number
  }
}

export type StudentSemester = {
  id: string
  type: string
  isActive: boolean
  academicYear: { name: string }
}

export type GradeHistoryPoint = {
  termId: string
  name: string
  average: number
}

export function gradeWithoutAttendance(grade: StudentGradeRecord) {
  const { studentPoints, maxPointsPossible, extraCreditPoints } = grade.breakdown
  if (maxPointsPossible <= 0) return 0
  return Math.round(Math.min(((studentPoints + extraCreditPoints) / maxPointsPossible) * 100, 100) * 10) / 10
}
