"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { AcademicDomain } from "@prisma/client";
import { recordManagementChange } from "@/lib/management-audit";

function normalizeSubjectCode(value: string) {
  return value.trim().toUpperCase();
}

function validateSubjectInput(data: { name: string; code: string }) {
  if (!data.name.trim()) return "Subject name is required";
  if (!/^[A-Z]{3}$/.test(normalizeSubjectCode(data.code))) {
    return "Subject code must be exactly three letters";
  }
}

export async function getSubjects() {
  try {
        const subjects = await prisma.subject.findMany({
      where: {
        OR: [{ deletedAt: { isSet: false } }, { deletedAt: null }],
      },
            include: { _count: { select: { courses: true } } },
            orderBy: { name: "asc" },
    });
    return { subjects };
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return { subjects: [] };
  }
}

export async function createSubject(data: {
  name: string;
  code: string;
  description?: string;
  reportName?: string;
  academicDomains: AcademicDomain[];
}) {
  try {
    const validationError = validateSubjectInput(data);
    if (validationError) return { error: validationError };
    const code = normalizeSubjectCode(data.code);
    const existing = await prisma.subject.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existing) return { error: `Subject code ${code} is already in use` };
    const subject = await prisma.subject.create({
      data: {
        name: data.name.trim(),
        code,
        description: data.description,
        reportName: data.reportName,
        academicDomains: data.academicDomains,
      },
    });
    await recordManagementChange({ entityType: "SUBJECT", entityId: subject.id, action: "CREATE", after: subject });
    revalidatePath("/admin/subjects");
    revalidatePath("/admin/courses");
    return { success: true, subject };
  } catch (error) {
    console.error("Error creating subject:", error);
    return { error: "Failed to create subject" };
  }
}

export async function updateSubject(
  id: string,
  data: {
    name: string;
    code: string;
    description?: string;
    reportName?: string;
    academicDomains: AcademicDomain[];
  },
) {
  try {
    const validationError = validateSubjectInput(data);
    if (validationError) return { error: validationError };
    const code = normalizeSubjectCode(data.code);
    const existing = await prisma.subject.findFirst({
      where: { code, id: { not: id } },
      select: { id: true },
    });
    if (existing) return { error: `Subject code ${code} is already in use` };
    const before = await prisma.subject.findUnique({ where: { id } });
    const subject = await prisma.subject.update({
      where: { id },
      data: {
        name: data.name.trim(),
        code,
        description: data.description,
        reportName: data.reportName,
        academicDomains: data.academicDomains,
      },
    });
    await recordManagementChange({ entityType: "SUBJECT", entityId: id, action: "UPDATE", before, after: subject });
    revalidatePath("/admin/subjects");
    return { success: true, subject };
  } catch (error) {
    console.error("Error updating subject:", error);
    return { error: "Failed to update subject" };
  }
}

export async function deleteSubject(id: string) {
  try {
    const before = await prisma.subject.findUnique({ where: { id } });
    // Soft delete
    await prisma.subject.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await recordManagementChange({ entityType: "SUBJECT", entityId: id, action: "ARCHIVE", before, after: { deletedAt: new Date() } });
    revalidatePath("/admin/subjects");
    return { success: true };
  } catch (error) {
    console.error("Error deleting subject:", error);
    return { error: "Failed to delete subject" };
  }
}
