import { GradeLevel, SemesterType } from "@prisma/client"

export const GRADE_LEVELS: GradeLevel[] = [
  GradeLevel.GRADE_7,
  GradeLevel.GRADE_8,
  GradeLevel.GRADE_9,
  GradeLevel.GRADE_10,
  GradeLevel.GRADE_11,
  GradeLevel.GRADE_12,
]

const GRADE_NUMBERS: Record<GradeLevel, number> = {
  GRADE_7: 7,
  GRADE_8: 8,
  GRADE_9: 9,
  GRADE_10: 10,
  GRADE_11: 11,
  GRADE_12: 12,
}

const GRADE_BY_NUMBER = new Map(
  Object.entries(GRADE_NUMBERS).map(([grade, value]) => [value, grade as GradeLevel]),
)

export type EducationStage = "SMP" | "SMA"
export type GradeTransition = "CONTINUE" | "PROMOTE"

export function gradeLevelNumber(gradeLevel: GradeLevel) {
  return GRADE_NUMBERS[gradeLevel]
}

export function gradeLevelLabel(gradeLevel: GradeLevel | null | undefined) {
  return gradeLevel ? `Grade ${gradeLevelNumber(gradeLevel)}` : "Grade not assigned"
}

export function educationStage(gradeLevel: GradeLevel): EducationStage {
  return gradeLevelNumber(gradeLevel) <= 9 ? "SMP" : "SMA"
}

export function nextGradeLevel(gradeLevel: GradeLevel): GradeLevel | null {
  return GRADE_BY_NUMBER.get(gradeLevelNumber(gradeLevel) + 1) ?? null
}

export function inferGradeLevelFromName(name: string): GradeLevel | null {
  const match = name.trim().match(/^(?:(?:grade|kelas)\s*)?(7|8|9|10|11|12)(?=$|[\s-]|[A-Za-z])/i)
  return match ? GRADE_BY_NUMBER.get(Number(match[1])) ?? null : null
}

export function suggestPromotedClassName(
  name: string,
  sourceGrade: GradeLevel,
  targetGrade: GradeLevel,
) {
  const source = String(gradeLevelNumber(sourceGrade))
  const target = String(gradeLevelNumber(targetGrade))
  const pattern = new RegExp(`^((?:(?:grade|kelas)\\s*)?)${source}(?=$|[\\s-]|[A-Za-z])`, "i")
  return pattern.test(name.trim()) ? name.trim().replace(pattern, `$1${target}`) : name
}

export function suggestRolloverCourseName(
  courseName: string,
  sourceClassName: string,
  targetClassName: string,
) {
  const index = courseName.indexOf(sourceClassName)
  if (index < 0) return courseName
  return `${courseName.slice(0, index)}${targetClassName}${courseName.slice(index + sourceClassName.length)}`
}

export function getGradeTransition(source: {
  type: SemesterType
  academicYearId: string
}, target: {
  type: SemesterType
  academicYearId: string
}): GradeTransition | null {
  if (
    source.academicYearId === target.academicYearId &&
    source.type === SemesterType.ODD &&
    target.type === SemesterType.EVEN
  ) return "CONTINUE"

  if (
    source.academicYearId !== target.academicYearId &&
    source.type === SemesterType.EVEN &&
    target.type === SemesterType.ODD
  ) return "PROMOTE"

  return null
}
