import "server-only"

import type { GradeLevel } from "@prisma/client"
import { db as prisma } from "@/lib/db"
import { educationStage, type EducationStage } from "@/lib/grade-level"

export const SCHOOL_PRINCIPALS_KEY = "school_principals"
const LEGACY_PRINCIPAL_NAME_KEY = "principal_name"

export type SchoolPrincipalNames = Record<EducationStage, string>

export const EMPTY_SCHOOL_PRINCIPALS: SchoolPrincipalNames = {
  SMP: "",
  SMA: "",
}

function principalName(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export async function readSchoolPrincipalNames(): Promise<SchoolPrincipalNames> {
  const [config, legacyConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { id: SCHOOL_PRINCIPALS_KEY } }),
    prisma.systemConfig.findUnique({ where: { id: LEGACY_PRINCIPAL_NAME_KEY } }),
  ])

  const value = config?.value as { SMP?: unknown; SMA?: unknown } | null
  const legacyValue = legacyConfig?.value as { name?: unknown } | null
  const legacyName = principalName(legacyValue?.name)

  if (config?.value) {
    return {
      SMP: principalName(value?.SMP),
      SMA: principalName(value?.SMA),
    }
  }

  return {
    SMP: legacyName,
    SMA: legacyName,
  }
}

export async function readPrincipalNameForGrade(gradeLevel: GradeLevel) {
  const principals = await readSchoolPrincipalNames()
  return principals[educationStage(gradeLevel)]
}
