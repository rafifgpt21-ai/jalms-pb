import type { Role } from "@prisma/client"

const DASHBOARD_PRIORITY: ReadonlyArray<{ role: Role; href: string }> = [
  { role: "SUBJECT_TEACHER", href: "/teacher" },
  { role: "STUDENT", href: "/student" },
  { role: "HOMEROOM_TEACHER", href: "/homeroom" },
  { role: "ADMIN", href: "/admin" },
  { role: "PARENT", href: "/parent" },
]

/**
 * Daily academic work takes priority over management-only work for multi-role users.
 * Every authenticated user should have at least one role; Messages is a safe fallback
 * for an incomplete account record and avoids a redirect loop through /home.
 */
export function getDefaultDashboardHref(roles: readonly Role[]) {
  return DASHBOARD_PRIORITY.find(({ role }) => roles.includes(role))?.href ?? "/socials"
}

