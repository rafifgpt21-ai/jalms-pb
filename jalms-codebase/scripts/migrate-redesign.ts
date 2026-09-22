import { ClassColor, CourseEnrollmentSource, PrismaClient } from "@prisma/client"

const db = new PrismaClient()
const apply = process.argv.includes("--apply")

const COLORS: ClassColor[] = [
  "RED", "ORANGE", "AMBER", "EMERALD", "TEAL", "CYAN",
  "BLUE", "INDIGO", "VIOLET", "PURPLE", "PINK", "ROSE",
]

function hash(value: string) {
  let result = 0
  for (let index = 0; index < value.length; index += 1) result = ((result << 5) - result + value.charCodeAt(index)) | 0
  return Math.abs(result)
}

function baseCode(name: string, current: string) {
  const normalizedCurrent = current.toUpperCase().replace(/[^A-Z]/g, "")
  if (normalizedCurrent.length === 3) return normalizedCurrent
  if (normalizedCurrent.length > 0) return `${normalizedCurrent}XXX`.slice(0, 3)
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "")
  if (!letters) return "XXX"
  const consonants = letters.slice(1).replace(/[AEIOU]/g, "")
  const remaining = letters.slice(1).replace(new RegExp(`[${consonants}]`, "g"), "")
  return `${letters[0]}${consonants}${remaining}XX`.slice(0, 3)
}

function availableCode(candidate: string, used: Set<string>) {
  if (!used.has(candidate)) return candidate
  const first = candidate[0] || "X"
  for (let value = 0; value < 26 * 26; value += 1) {
    const next = `${first}${String.fromCharCode(65 + Math.floor(value / 26))}${String.fromCharCode(65 + (value % 26))}`
    if (!used.has(next)) return next
  }
  throw new Error(`No available subject code beginning with ${first}`)
}

async function main() {
  const [subjects, classes, courses, classEnrollments, existingCourseEnrollments] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.class.findMany({ include: { term: true } }),
    db.course.findMany({ select: { id: true, name: true, termId: true, classId: true, studentIds: true, enrollmentMode: true } }),
    db.enrollment.findMany({ where: { deletedAt: { isSet: false } }, select: { id: true, studentId: true, classId: true } }),
    db.courseEnrollment.findMany({ where: { deletedAt: { isSet: false } }, select: { courseId: true, studentId: true } }),
  ])

  const usedCodes = new Set<string>()
  const validCodeCounts = new Map<string, number>()
  for (const subject of subjects) {
    const normalized = subject.code.toUpperCase().replace(/[^A-Z]/g, "")
    if (normalized.length === 3) validCodeCounts.set(normalized, (validCodeCounts.get(normalized) ?? 0) + 1)
  }
  for (const [code, count] of validCodeCounts) if (count === 1) usedCodes.add(code)

  const subjectUpdates = subjects.map((subject) => {
    const normalized = subject.code.toUpperCase().replace(/[^A-Z]/g, "")
    const keepsUniqueCode = normalized.length === 3 && validCodeCounts.get(normalized) === 1
    const code = keepsUniqueCode ? normalized : availableCode(baseCode(subject.name, subject.code), usedCodes)
    usedCodes.add(code)
    return { id: subject.id, name: subject.name, before: subject.code, after: code }
  })

  const classUpdates = classes.map((item) => ({
    id: item.id,
    name: item.name,
    before: item.color,
    after: item.color ?? COLORS[hash(item.id) % COLORS.length],
  }))

  const classById = new Map(classes.map((item) => [item.id, item]))
  const studentClassIds = new Map<string, Set<string>>()
  for (const enrollment of classEnrollments) {
    const ids = studentClassIds.get(enrollment.studentId) ?? new Set<string>()
    ids.add(enrollment.classId)
    studentClassIds.set(enrollment.studentId, ids)
  }

  const repairedLinks: Array<{ courseId: string; courseName: string; classId: string }> = []
  for (const course of courses) {
    if (course.classId || course.studentIds.length === 0) continue
    const first = studentClassIds.get(course.studentIds[0]) ?? new Set<string>()
    const common = [...first].filter((classId) => {
      const candidate = classById.get(classId)
      return candidate?.termId === course.termId && course.studentIds.every((studentId) => studentClassIds.get(studentId)?.has(classId))
    })
    if (common.length === 1) repairedLinks.push({ courseId: course.id, courseName: course.name, classId: common[0] })
  }

  const existingKeys = new Set(existingCourseEnrollments.map((item) => `${item.courseId}:${item.studentId}`))
  const classEnrollmentKeyCounts = new Map<string, number>()
  for (const enrollment of classEnrollments) {
    const key = `${enrollment.classId}:${enrollment.studentId}`
    classEnrollmentKeyCounts.set(key, (classEnrollmentKeyCounts.get(key) ?? 0) + 1)
  }
  const duplicateClassEnrollmentKeys = [...classEnrollmentKeyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }))
  const courseEnrollmentCreates = courses.flatMap((course) => course.studentIds
    .filter((studentId) => !existingKeys.has(`${course.id}:${studentId}`))
    .map((studentId) => ({
      courseId: course.id,
      studentId,
      source: (course.classId && studentClassIds.get(studentId)?.has(course.classId) ? "CLASS_SEED" : "LEGACY") as CourseEnrollmentSource,
      sourceClassId: course.classId,
    })))

  const report = {
    mode: apply ? "apply" : "dry-run",
    subjects: subjectUpdates,
    classes: classUpdates,
    inferredCourseClassLinks: repairedLinks,
    courseEnrollmentsToCreate: courseEnrollmentCreates.length,
    legacyCourseMemberships: courses.reduce((total, course) => total + course.studentIds.length, 0),
    existingNormalizedMemberships: existingCourseEnrollments.length,
    duplicateClassEnrollmentKeys,
  }
  console.log(JSON.stringify(report, null, 2))

  if (!apply) {
    console.log("Dry run only. Re-run with --apply after reviewing this report.")
    return
  }

  for (const subject of subjectUpdates) {
    if (subject.before !== subject.after) await db.subject.update({ where: { id: subject.id }, data: { code: subject.after } })
  }
  for (const item of classUpdates) {
    if (!item.before) await db.class.update({ where: { id: item.id }, data: { color: item.after } })
  }
  for (const repair of repairedLinks) {
    await db.course.update({ where: { id: repair.courseId }, data: { classId: repair.classId } })
  }
  for (const enrollment of courseEnrollmentCreates) {
    await db.courseEnrollment.upsert({
      where: { courseId_studentId: { courseId: enrollment.courseId, studentId: enrollment.studentId } },
      create: enrollment,
      update: { deletedAt: null },
    })
  }

  console.log("Redesign migration applied successfully.")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => db.$disconnect())
