"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ClassColor, GradeLevel } from "@prisma/client";
import { recordManagementChange } from "@/lib/management-audit";
import { GRADE_LEVELS } from "@/lib/grade-level";

function validGradeLevel(value: GradeLevel) {
  return GRADE_LEVELS.includes(value);
}

export async function getClasses() {
  try {
    const classes = await prisma.class.findMany({
      where: {
        deletedAt: { isSet: false },
      },
      include: {
        term: {
          include: { academicYear: true },
        },
        homeroomTeacher: true,
        _count: {
          select: { students: true, courses: true },
        },
      },
      orderBy: [{ term: { startDate: "desc" } }, { name: "asc" }],
    });

    return { classes, error: null };
  } catch (error) {
    console.error("Error fetching classes:", error);
    return { classes: [], error: "Failed to fetch classes" };
  }
}

export async function createClass(data: {
  name: string;
  termId: string;
  homeroomTeacherId?: string;
  color: ClassColor;
  gradeLevel: GradeLevel;
}) {
  try {
    const name = data.name.trim();
    if (!name) return { error: "Class name is required" };
    if (!validGradeLevel(data.gradeLevel)) return { error: "Choose a valid grade from 7 to 12" };

    // Check for duplicate name in same term
    const existing = await prisma.class.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        termId: data.termId,
        deletedAt: { isSet: false },
      },
    });

    if (existing) {
      return { error: "Class name already exists in this semester" };
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        termId: data.termId,
        homeroomTeacherId: data.homeroomTeacherId || null,
        color: data.color,
        gradeLevel: data.gradeLevel,
      },
    });
    await recordManagementChange({ entityType: "CLASS", entityId: newClass.id, action: "CREATE", after: newClass });

    revalidatePath("/admin/classes");
    return { success: true, class: newClass };
  } catch (error) {
    console.error("Error creating class:", error);
    return { error: "Failed to create class" };
  }
}

export async function updateClass(
  id: string,
  data: {
    name: string;
    homeroomTeacherId?: string;
    color: ClassColor;
    gradeLevel: GradeLevel;
  },
) {
  try {
    const before = await prisma.class.findUnique({ where: { id } });
    if (!before) return { error: "Class not found" };
    const name = data.name.trim();
    if (!name) return { error: "Class name is required" };
    if (!validGradeLevel(data.gradeLevel)) return { error: "Choose a valid grade from 7 to 12" };
    const duplicate = await prisma.class.findFirst({
      where: {
        id: { not: id },
        termId: before.termId,
        name: { equals: name, mode: "insensitive" },
        deletedAt: { isSet: false },
      },
      select: { id: true },
    });
    if (duplicate) return { error: "Class name already exists in this semester" };

    const updated = await prisma.class.update({
      where: { id },
      data: {
        name,
        homeroomTeacherId: data.homeroomTeacherId || null,
        color: data.color,
        gradeLevel: data.gradeLevel,
      },
    });
    await recordManagementChange({ entityType: "CLASS", entityId: id, action: "UPDATE", before, after: updated });

    revalidatePath("/admin/classes");
    revalidatePath(`/admin/classes/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating class:", error);
    return { error: "Failed to update class" };
  }
}

export async function deleteClass(id: string) {
  try {
    const before = await prisma.class.findUnique({ where: { id } });
    await prisma.class.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await recordManagementChange({ entityType: "CLASS", entityId: id, action: "ARCHIVE", before, after: { deletedAt: new Date() } });

    revalidatePath("/admin/classes");
    return { success: true };
  } catch (error) {
    console.error("Error deleting class:", error);
    return { error: "Failed to delete class" };
  }
}

// Helper to get potential homeroom teachers
export async function getHomeroomTeachers() {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        roles: {
          has: "HOMEROOM_TEACHER",
        },
        isActive: true,
        // deletedAt filter removed
      },
      select: {
        id: true,
        name: true,
      },
    });
    return { teachers, error: null };
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return { teachers: [], error: "Failed to fetch teachers" };
  }
}

// Helper to get active terms for dropdown
export async function getActiveTerms(includeTermId?: string) {
  try {
    const where: any = {
      deletedAt: { isSet: false },
    };

    if (includeTermId) {
      // If we need to include a specific term (even if deleted), we change the query
      // OR logic: deletedAt is null OR id is includeTermId
      where.OR = [{ deletedAt: { isSet: false } }, { id: includeTermId }];
      delete where.deletedAt;
    }

    const terms = await prisma.term.findMany({
      where,
      include: { academicYear: true },
      orderBy: { startDate: "desc" },
    });
    return { terms, error: null };
  } catch (error) {
    console.error("Error fetching terms:", error);
    return { terms: [], error: "Failed to fetch terms" };
  }
}

export async function getAvailableClassesForDropdown(
  search: string = "",
  activeSemesterOnly: boolean = true,
  limit: number = 10,
) {
  try {
    const where: any = {
      deletedAt: { isSet: false },
    };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (activeSemesterOnly) {
      // Find active terms first
      const activeTerms = await prisma.term.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      const activeTermIds = activeTerms.map((t) => t.id);
      where.termId = { in: activeTermIds };
    }

    const classes = await prisma.class.findMany({
      where,
      take: limit === -1 ? undefined : limit, // -1 means no limit
      orderBy: { name: "asc" },
      include: {
        term: {
          include: { academicYear: true },
        },
        _count: {
          select: { students: true },
        },
      },
    });

    return { classes };
  } catch (error) {
    console.error("Error fetching classes for dropdown:", error);
    return { classes: [] };
  }
}
