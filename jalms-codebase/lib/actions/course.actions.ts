"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { CourseEnrollmentMode } from "@prisma/client";
import { recordManagementChange } from "@/lib/management-audit";

export async function getCourses(options: { showAll?: boolean } = {}) {
  try {
    const activeTerm = await prisma.term.findFirst({
      where: { isActive: true, deletedAt: { isSet: false } },
    });

    const whereClause: any = {
      deletedAt: { isSet: false },
    };

    if (!options.showAll) {
      if (!activeTerm) {
        return { courses: [] };
      }
      whereClause.termId = activeTerm.id;
    }

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: {
        teacher: true,
        term: {
          include: { academicYear: true },
        },
        subject: true,
        class: true,
        _count: {
          select: { students: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const coursesWithCount = courses.map((course) => ({
      ...course,
      _count: { students: course.studentIds.length },
    }));

    return { courses: coursesWithCount };
  } catch (error) {
    console.error("Error fetching courses:", error);
    return { courses: [] };
  }
}

export async function getCourse(id: string) {
  try {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: true,
        term: {
          include: { academicYear: true },
        },
        subject: true,
        class: true,
        students: true,
      },
    });
    return { course };
  } catch (error) {
    console.error("Error fetching course:", error);
    return { error: "Failed to fetch course" };
  }
}

type CourseInput = {
  name: string;
  reportName?: string;
  teacherId: string;
  termId: string;
  subjectId?: string;
  classId?: string;
  enrollmentMode?: CourseEnrollmentMode;
};

export async function createCourse(data: CourseInput) {
  try {
    const course = await prisma.course.create({
      data: {
        name: data.name,
        reportName: data.reportName,
        teacherId: data.teacherId,
        termId: data.termId,
        subjectId: data.subjectId || null,
        classId: data.classId || null,
        enrollmentMode: data.enrollmentMode || "MANUAL",
      },
    });
    await recordManagementChange({ entityType: "COURSE", entityId: course.id, action: "CREATE", after: course });

    revalidatePath("/admin/courses");
    return { success: true, course };
  } catch (error) {
    console.error("Error creating course:", error);
    return { error: "Failed to create course" };
  }
}

export async function createBulkCourses(data: {
  name: string;
  teacherId: string;
  termId: string;
  subjectId?: string;
  classIds: string[];
  autoEnroll: boolean;
  enrollmentMode?: CourseEnrollmentMode;
}) {
  try {
    const { name, teacherId, termId, subjectId, classIds, autoEnroll } = data;

    // Fetch class names
    const classes = await prisma.class.findMany({
      where: { id: { in: classIds } },
      select: { id: true, name: true },
    });

    const createdCourses: any[] = [];
    let enrolledCount = 0;

    for (const cls of classes) {
      // Create course with appended class name
      const courseName = `${name} ${cls.name}`;

      const course = await prisma.course.create({
        data: {
          name: courseName,
          teacherId,
          termId,
          subjectId: subjectId || null,
          classId: cls.id,
          enrollmentMode:
            data.enrollmentMode || (autoEnroll ? "CLASS_SEEDED" : "MANUAL"),
        },
      });

      createdCourses.push(course);
      await recordManagementChange({ entityType: "COURSE", entityId: course.id, action: "BULK_CREATE", after: course });

      // Auto-enroll if requested
      if (autoEnroll) {
        const { enrollClassToCourse } =
          await import("@/lib/actions/enrollment.actions");
        const result = await enrollClassToCourse(course.id, cls.id);
        if (result.success && result.count) {
          enrolledCount += result.count;
        }
      }
    }

    revalidatePath("/admin/courses");
    return { success: true, count: createdCourses.length, enrolledCount };
  } catch (error) {
    console.error("Error creating bulk courses:", error);
    return { error: "Failed to create courses" };
  }
}

export async function updateCourse(id: string, data: CourseInput) {
  try {
    const before = await prisma.course.findUnique({ where: { id } });
    const updated = await prisma.course.update({
      where: { id },
      data: {
        name: data.name,
        reportName: data.reportName,
        teacherId: data.teacherId,
        termId: data.termId,
        subjectId: data.subjectId || null,
        classId: data.classId || null,
        enrollmentMode: data.enrollmentMode || "MANUAL",
      },
    });
    if (updated.classId && updated.enrollmentMode === "CLASS_SYNC") {
      const { syncCourseEnrollmentFromClass } = await import("@/lib/actions/enrollment.actions");
      await syncCourseEnrollmentFromClass(updated.id);
    } else if (updated.classId && updated.enrollmentMode === "CLASS_SEEDED" && before?.classId !== updated.classId) {
      const { enrollClassToCourse } = await import("@/lib/actions/enrollment.actions");
      await enrollClassToCourse(updated.id, updated.classId);
    }
    await recordManagementChange({ entityType: "COURSE", entityId: id, action: "UPDATE", before, after: updated });

    revalidatePath("/admin/courses");
    return { success: true };
  } catch (error) {
    console.error("Error updating course:", error);
    return { error: "Failed to update course" };
  }
}

export async function deleteCourse(id: string) {
  try {
    const before = await prisma.course.findUnique({ where: { id } });
    await prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await recordManagementChange({ entityType: "COURSE", entityId: id, action: "ARCHIVE", before, after: { deletedAt: new Date() } });
    revalidatePath("/admin/courses");
    return { success: true };
  } catch (error) {
    console.error("Error deleting course:", error);
    return { error: "Failed to delete course" };
  }
}

// Competency Rules Logic

export async function getCourseCompetencySettings(courseId: string) {
  try {
    const user = await import("@/lib/actions/user.actions").then((m) =>
      m.getUser(),
    );
    if (!user) return { error: "Unauthorized" };

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, competencyRules: true, teacherId: true },
    });

    if (!course) return { error: "Course not found" };
    // Allow admin or the teacher
    if (course.teacherId !== user.id && !user.roles.includes("ADMIN")) {
      return { error: "Unauthorized" };
    }

    // Also fetch system defaults
    const sysConfig = await prisma.systemConfig.findUnique({
      where: { id: "grading_scale" },
    });

    return {
      competencyRules: course.competencyRules,
      systemDefaults: sysConfig?.value,
    };
  } catch (error) {
    console.error("Error fetching competency settings:", error);
    return { error: "Failed to fetch settings" };
  }
}

export async function updateCourseCompetencySettings(
  courseId: string,
  rules: any[],
) {
  try {
    const user = await import("@/lib/actions/user.actions").then((m) =>
      m.getUser(),
    );
    if (!user) return { error: "Unauthorized" };

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });

    if (!course) return { error: "Course not found" };
    if (course.teacherId !== user.id && !user.roles.includes("ADMIN")) {
      return { error: "Unauthorized" };
    }

    await prisma.course.update({
      where: { id: courseId },
      data: { competencyRules: rules },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating competency settings:", error);
    return { error: "Failed to update settings" };
  }
}

export async function updateCourseIcon(courseId: string, icon: { url?: string | null; key?: string | null }) {
  try {
    const user = await import("@/lib/actions/user.actions").then((module) => module.getUser());
    if (!user) return { error: "Unauthorized" };
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } });
    if (!course || (course.teacherId !== user.id && !user.roles.includes("ADMIN"))) return { error: "Unauthorized" };
    await prisma.course.update({
      where: { id: courseId },
      data: { iconImageUrl: icon.url || null, iconImageKey: icon.key || null },
    });
    revalidatePath(`/teacher/courses/${courseId}`);
    revalidatePath(`/teacher/courses/${courseId}/settings`);
    return { success: true };
  } catch (error) {
    console.error("Error updating course icon:", error);
    return { error: "Failed to update course icon" };
  }
}
