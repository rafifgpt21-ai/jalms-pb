"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import {
  educationStage,
  getGradeTransition,
  gradeLevelNumber,
  nextGradeLevel,
  suggestPromotedClassName,
  suggestRolloverCourseName,
  type GradeTransition,
} from "@/lib/grade-level"
import { recordManagementChange } from "@/lib/management-audit"
import { GradeLevel, Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"

export type RolloverOptions = {
  classes: boolean
  classRosters: boolean
  courses: boolean
  courseMemberships: boolean
  assignmentsAsDrafts: boolean
  announcementsAsDrafts: boolean
  schedules: boolean
  materials: boolean
}

export type RolloverClassMapping = {
  sourceClassId: string
  targetName: string
  reuseTargetClassId: string | null
  confirmReuse: boolean
  includedStudentIds: string[]
}

export type RolloverCourseMapping = {
  sourceCourseId: string
  targetName: string
  reuseTargetCourseId: string | null
  confirmReuse: boolean
}

export type RolloverExecutionPlan = {
  classes: RolloverClassMapping[]
  courses: RolloverCourseMapping[]
}

type PreviewStudent = {
  id: string
  name: string
  selected: boolean
  conflictingTargetClass: { id: string; name: string } | null
}

type PreviewClass = {
  sourceClassId: string
  sourceName: string
  sourceGradeLevel: GradeLevel
  sourceGrade: number
  sourceStage: "SMP" | "SMA"
  targetGradeLevel: GradeLevel | null
  targetGrade: number | null
  targetStage: "SMP" | "SMA" | null
  suggestedTargetName: string | null
  graduated: boolean
  reuseCandidate: { id: string; name: string } | null
  students: PreviewStudent[]
}

type PreviewCourse = {
  sourceCourseId: string
  sourceName: string
  sourceClassId: string | null
  sourceClassName: string | null
  suggestedTargetName: string
  excluded: boolean
  reuseCandidate: { id: string; name: string } | null
}

export type AcademicRolloverPreview = {
  source: string
  target: string
  transition: GradeTransition
  classes: PreviewClass[]
  courses: PreviewCourse[]
  counts: {
    classes: number
    students: number
    courses: number
    assignments: number
    graduatingClasses: number
    graduatingStudents: number
  }
}

const activeRecord = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] }

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { roles: true } })
  return user?.roles.includes("ADMIN") ? session.user.id : null
}

async function buildPreview(sourceTermId: string, targetTermId: string): Promise<{ preview?: AcademicRolloverPreview; error?: string }> {
  if (!sourceTermId || !targetTermId || sourceTermId === targetTermId) return { error: "Choose two different semesters" }

  const [source, target] = await Promise.all([
    db.term.findUnique({ where: { id: sourceTermId }, include: { academicYear: true } }),
    db.term.findUnique({ where: { id: targetTermId }, include: { academicYear: true } }),
  ])
  if (!source || !target) return { error: "Semester not found" }

  const expectedTarget = await db.term.findFirst({
    where: { startDate: { gt: source.startDate }, ...activeRecord },
    orderBy: { startDate: "asc" },
    select: { id: true },
  })
  if (expectedTarget?.id !== target.id) return { error: "Rollover only supports the immediately following semester" }

  const transition = getGradeTransition(source, target)
  if (!transition) return { error: "Use Odd to Even within one academic year, or Even to Odd in the following academic year" }

  const [sourceClasses, sourceCourses, targetClasses, targetCourses, targetEnrollments] = await Promise.all([
    db.class.findMany({
      where: { termId: sourceTermId, ...activeRecord },
      include: {
        students: { where: activeRecord, include: { student: { select: { id: true, name: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    db.course.findMany({
      where: { termId: sourceTermId, ...activeRecord },
      include: { _count: { select: { assignments: true } }, class: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    db.class.findMany({ where: { termId: targetTermId, ...activeRecord }, select: { id: true, name: true, gradeLevel: true } }),
    db.course.findMany({ where: { termId: targetTermId, ...activeRecord }, select: { id: true, name: true, teacherId: true } }),
    db.enrollment.findMany({
      where: { class: { termId: targetTermId }, ...activeRecord },
      include: { class: { select: { id: true, name: true } } },
    }),
  ])

  const missingGrades = sourceClasses.filter((item) => !item.gradeLevel)
  if (missingGrades.length) {
    return { error: `Assign a grade level before rollover: ${missingGrades.map((item) => item.name).join(", ")}` }
  }

  const targetEnrollmentByStudent = new Map(targetEnrollments.map((item) => [item.studentId, item.class]))
  const classes: PreviewClass[] = sourceClasses.map((item) => {
    const sourceGradeLevel = item.gradeLevel as GradeLevel
    const targetGradeLevel = transition === "PROMOTE" ? nextGradeLevel(sourceGradeLevel) : sourceGradeLevel
    const graduated = transition === "PROMOTE" && !targetGradeLevel
    const suggestedTargetName = targetGradeLevel
      ? transition === "PROMOTE"
        ? suggestPromotedClassName(item.name, sourceGradeLevel, targetGradeLevel)
        : item.name
      : null
    const reuseCandidate: any = targetGradeLevel && suggestedTargetName
      ? targetClasses.find((candidate) =>
        candidate.name.toLowerCase() === suggestedTargetName.toLowerCase() && candidate.gradeLevel === targetGradeLevel,
      ) ?? null
      : null

    return {
      sourceClassId: item.id,
      sourceName: item.name,
      sourceGradeLevel,
      sourceGrade: gradeLevelNumber(sourceGradeLevel),
      sourceStage: educationStage(sourceGradeLevel),
      targetGradeLevel,
      targetGrade: targetGradeLevel ? gradeLevelNumber(targetGradeLevel) : null,
      targetStage: targetGradeLevel ? educationStage(targetGradeLevel) : null,
      suggestedTargetName,
      graduated,
      reuseCandidate: reuseCandidate ? { id: reuseCandidate.id, name: reuseCandidate.name } : null,
      students: item.students.map((enrollment) => {
        const existing = targetEnrollmentByStudent.get(enrollment.studentId) ?? null
        const conflict = existing && (existing as any).id !== reuseCandidate?.id ? existing : null
        return {
          id: enrollment.student.id,
          name: enrollment.student.name,
          selected: !graduated && !conflict,
          conflictingTargetClass: conflict,
        }
      }),
    }
  })

  const classPreviewById = new Map(classes.map((item) => [item.sourceClassId, item]))
  const courses: PreviewCourse[] = sourceCourses.map((item) => {
    const classPreview = item.classId ? classPreviewById.get(item.classId) : null
    const excluded = Boolean(classPreview?.graduated)
    const suggestedTargetName = classPreview?.suggestedTargetName && item.class
      ? suggestRolloverCourseName(item.name, item.class.name, classPreview.suggestedTargetName)
      : item.name
    const candidate = !excluded
      ? targetCourses.find((targetCourse) =>
        targetCourse.name.toLowerCase() === suggestedTargetName.toLowerCase() && targetCourse.teacherId === item.teacherId,
      ) ?? null
      : null
    return {
      sourceCourseId: item.id,
      sourceName: item.name,
      sourceClassId: item.classId,
      sourceClassName: item.class?.name ?? null,
      suggestedTargetName,
      excluded,
      reuseCandidate: candidate ? { id: candidate.id, name: candidate.name } : null,
    }
  })

  const graduatingClasses = classes.filter((item) => item.graduated)
  return {
    preview: {
      source: `${source.academicYear.name} ${source.type}`,
      target: `${target.academicYear.name} ${target.type}`,
      transition,
      classes,
      courses,
      counts: {
        classes: classes.filter((item) => !item.graduated).length,
        students: classes.reduce((total, item) => total + item.students.filter((student) => student.selected).length, 0),
        courses: courses.filter((item) => !item.excluded).length,
        assignments: sourceCourses.filter((item) => !classPreviewById.get(item.classId ?? "")?.graduated).reduce((total, item) => total + item._count.assignments, 0),
        graduatingClasses: graduatingClasses.length,
        graduatingStudents: graduatingClasses.reduce((total, item) => total + item.students.length, 0),
      },
    },
  }
}

export async function previewAcademicRollover(sourceTermId: string, targetTermId: string) {
  if (!await requireAdmin()) return { error: "Unauthorized" }
  return buildPreview(sourceTermId, targetTermId)
}

export async function executeAcademicRollover(
  sourceTermId: string,
  targetTermId: string,
  options: RolloverOptions,
  plan: RolloverExecutionPlan,
) {
  const actorId = await requireAdmin()
  if (!actorId) return { error: "Unauthorized" }
  if (options.classRosters && !options.classes) return { error: "Class rosters require Classes and colors" }
  if (options.courses && !options.classes) return { error: "Grade-aware course rollover requires Classes and colors" }
  if (options.courseMemberships && !options.courses) return { error: "Course memberships require Courses and settings" }

  const previewResult = await buildPreview(sourceTermId, targetTermId)
  if (!previewResult.preview) return previewResult
  const preview = previewResult.preview
  const eligibleClasses = preview.classes.filter((item) => !item.graduated)
  const eligibleCourses = preview.courses.filter((item) => !item.excluded)
  const submittedClasses = new Map(plan.classes.map((item) => [item.sourceClassId, item]))
  const submittedCourses = new Map(plan.courses.map((item) => [item.sourceCourseId, item]))

  if (options.classes && eligibleClasses.some((item) => !submittedClasses.has(item.sourceClassId))) {
    return { error: "Rollover plan is incomplete. Preview again before confirming." }
  }
  if (options.courses && eligibleCourses.some((item) => !submittedCourses.has(item.sourceCourseId))) {
    return { error: "Course rollover plan is incomplete. Preview again before confirming." }
  }

  const targetNames = new Set<string>()
  for (const item of eligibleClasses) {
    if (!options.classes) break
    const mapping = submittedClasses.get(item.sourceClassId)!
    const targetName = mapping.targetName.trim()
    if (!targetName) return { error: `Choose a target name for ${item.sourceName}` }
    const normalized = targetName.toLowerCase()
    if (targetNames.has(normalized)) return { error: `Target class name is duplicated: ${targetName}` }
    targetNames.add(normalized)

    const collision = await db.class.findFirst({
      where: { termId: targetTermId, name: { equals: targetName, mode: "insensitive" }, ...activeRecord },
      select: { id: true, gradeLevel: true },
    })
    if (collision) {
      if (collision.id !== mapping.reuseTargetClassId || !mapping.confirmReuse) {
        return { error: `Confirm reuse of the existing target class ${targetName}` }
      }
      if (collision.gradeLevel !== item.targetGradeLevel) return { error: `${targetName} has a different grade level` }
    } else if (mapping.reuseTargetClassId) {
      return { error: `The selected target class for ${targetName} changed. Preview again.` }
    }

    const selectedIds = new Set(mapping.includedStudentIds)
    for (const student of item.students) {
      if (!selectedIds.has(student.id)) continue
      const existingTargetEnrollment = await db.enrollment.findFirst({
        where: { studentId: student.id, class: { termId: targetTermId }, ...activeRecord },
        include: { class: { select: { id: true, name: true } } },
      })
      if (existingTargetEnrollment && existingTargetEnrollment.classId !== mapping.reuseTargetClassId) {
        return { error: `${student.name} is already enrolled in ${existingTargetEnrollment.class.name}` }
      }
    }
    if ([...selectedIds].some((id) => !item.students.some((student) => student.id === id))) {
      return { error: `The roster for ${item.sourceName} changed. Preview again.` }
    }
  }

  const courseTargetKeys = new Set<string>()
  for (const item of eligibleCourses) {
    if (!options.courses) break
    const mapping = submittedCourses.get(item.sourceCourseId)!
    const targetName = mapping.targetName.trim()
    if (!targetName) return { error: `Choose a target name for ${item.sourceName}` }
    const sourceCourse = await db.course.findUnique({ where: { id: item.sourceCourseId }, select: { teacherId: true } })
    if (!sourceCourse) return { error: `Course ${item.sourceName} no longer exists` }
    const targetKey = `${sourceCourse.teacherId}:${targetName.toLowerCase()}`
    if (courseTargetKeys.has(targetKey)) return { error: `Target course name is duplicated for the same teacher: ${targetName}` }
    courseTargetKeys.add(targetKey)
    const collision = await db.course.findFirst({
      where: { termId: targetTermId, teacherId: sourceCourse.teacherId, name: { equals: targetName, mode: "insensitive" }, ...activeRecord },
      select: { id: true },
    })
    if (collision && (collision.id !== mapping.reuseTargetCourseId || !mapping.confirmReuse)) {
      return { error: `Confirm reuse of the existing target course ${targetName}` }
    }
    if (!collision && mapping.reuseTargetCourseId) return { error: `The selected target course for ${targetName} changed. Preview again.` }
  }

  const rollover = await db.academicRollover.create({
    data: {
      sourceTermId,
      targetTermId,
      actorId,
      status: "RUNNING",
      options: options as Prisma.InputJsonObject,
      mappings: plan as unknown as Prisma.InputJsonObject,
    },
  })
  const classMap: Record<string, string> = {}
  const courseMap: Record<string, string> = {}
  const errors: string[] = []
  let classesCreated = 0
  let classesReused = 0
  let coursesCreated = 0
  let coursesReused = 0
  let studentsPromoted = 0
  let studentsExcluded = preview.classes.reduce((total, item) => total + (item.graduated ? 0 : item.students.length), 0)

  try {
    const sourceClasses = await db.class.findMany({
      where: { id: { in: eligibleClasses.map((item) => item.sourceClassId) } },
      include: { students: { where: activeRecord } },
    })
    if (options.classes) {
      for (const source of sourceClasses) {
        const previewClass = eligibleClasses.find((item) => item.sourceClassId === source.id)!
        const mapping = submittedClasses.get(source.id)!
        try {
          const target = mapping.reuseTargetClassId
            ? await db.class.findUniqueOrThrow({ where: { id: mapping.reuseTargetClassId } })
            : await db.class.create({ data: {
              name: mapping.targetName.trim(),
              termId: targetTermId,
              gradeLevel: previewClass.targetGradeLevel!,
              homeroomTeacherId: source.homeroomTeacherId,
              color: source.color,
            } })
          mapping.reuseTargetClassId ? classesReused++ : classesCreated++
          classMap[source.id] = target.id
          if (options.classRosters) {
            const included = new Set(mapping.includedStudentIds)
            const enrollments = source.students.filter((item) => included.has(item.studentId))
            await Promise.all(enrollments.map((enrollment) => db.enrollment.upsert({
              where: { studentId_classId: { studentId: enrollment.studentId, classId: target.id } },
              create: { studentId: enrollment.studentId, classId: target.id, source: "ROLLOVER", createdById: actorId },
              update: { deletedAt: null, source: "ROLLOVER", createdById: actorId },
            })))
            studentsPromoted += enrollments.length
            studentsExcluded -= enrollments.length
          }
        } catch (error) {
          errors.push(`Class ${source.name}: ${error instanceof Error ? error.message : "failed"}`)
        }
      }
    }

    const sourceCourses = await db.course.findMany({
      where: { id: { in: eligibleCourses.map((item) => item.sourceCourseId) } },
      include: {
        assignments: { where: activeRecord },
        announcements: { where: activeRecord },
        materialAssignments: true,
        schedules: { where: activeRecord },
      },
    })
    if (options.courses) {
      for (const source of sourceCourses) {
        const mapping = submittedCourses.get(source.id)!
        try {
          const isReuse = Boolean(mapping.reuseTargetCourseId)
          const targetClassId = source.classId ? classMap[source.classId] : null
          if (source.classId && !targetClassId) throw new Error("Target class mapping was not created")
          const target = mapping.reuseTargetCourseId
            ? await db.course.findUniqueOrThrow({ where: { id: mapping.reuseTargetCourseId } })
            : await db.course.create({ data: {
              name: mapping.targetName.trim(),
              reportName: source.reportName,
              subjectId: source.subjectId,
              classId: targetClassId,
              termId: targetTermId,
              teacherId: source.teacherId,
              attendancePoolScore: source.attendancePoolScore,
              competencyRules: source.competencyRules as Prisma.InputJsonValue | null,
              iconImageUrl: source.iconImageUrl,
              iconImageKey: source.iconImageKey,
              enrollmentMode: source.enrollmentMode || "MANUAL",
            } })
          if (isReuse && target.classId !== targetClassId) throw new Error("Existing course is linked to a different target class")
          isReuse ? coursesReused++ : coursesCreated++
          courseMap[source.id] = target.id

          if (!isReuse && options.assignmentsAsDrafts) await Promise.all(source.assignments.map((item) => db.assignment.create({ data: {
            title: item.title,
            description: item.description,
            dueDate: item.dueDate,
            type: item.type,
            maxPoints: item.maxPoints,
            isExtraCredit: item.isExtraCredit,
            latePenalty: item.latePenalty,
            academicDomains: item.academicDomains,
            courseId: target.id,
            quizId: item.quizId,
            showGradeAfterSubmission: item.showGradeAfterSubmission,
            status: "DRAFT",
          } })))
          if (!isReuse && options.announcementsAsDrafts) await Promise.all(source.announcements.map((item) => db.courseAnnouncement.create({ data: {
            courseId: target.id,
            authorId: item.authorId,
            title: item.title,
            body: item.body,
            isPinned: item.isPinned,
            status: "DRAFT",
          } })))
          if (options.materials) await Promise.all(source.materialAssignments.map((item) => db.materialAssignment.upsert({
            where: { materialId_courseId: { materialId: item.materialId, courseId: target.id } },
            create: { materialId: item.materialId, courseId: target.id },
            update: {},
          })))
          if (!isReuse && options.schedules) await Promise.all(source.schedules.map((item) => db.schedule.create({ data: {
            courseId: target.id,
            dayOfWeek: item.dayOfWeek,
            period: item.period,
          } })))
          if (options.courseMemberships && target.classId) {
            const { enrollClassToCourse } = await import("@/lib/actions/enrollment.actions")
            const enrollmentResult = await enrollClassToCourse(target.id, target.classId)
            if (enrollmentResult.error) throw new Error(enrollmentResult.error)
          }
        } catch (error) {
          errors.push(`Course ${source.name}: ${error instanceof Error ? error.message : "failed"}`)
        }
      }
    }

    const status = errors.length ? "PARTIAL" : "COMPLETED"
    const summary = {
      transition: preview.transition,
      classesCreated,
      classesReused,
      coursesCreated,
      coursesReused,
      studentsPromoted,
      studentsExcluded,
      graduatingClasses: preview.counts.graduatingClasses,
      graduatingStudents: preview.counts.graduatingStudents,
      errors,
    }
    await db.academicRollover.update({
      where: { id: rollover.id },
      data: { status, mappings: { classes: classMap, courses: courseMap }, summary },
    })
    await recordManagementChange({ entityType: "ROLLOVER", entityId: rollover.id, action: status, after: summary })
    revalidatePath("/admin/rollover")
    revalidatePath("/admin/classes")
    revalidatePath("/admin/courses")
    return { success: true, rolloverId: rollover.id, status, summary }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rollover failed"
    await db.academicRollover.update({ where: { id: rollover.id }, data: { status: "FAILED", summary: { errors: [message] } } })
    return { error: "Rollover failed. Review the saved run for details." }
  }
}
