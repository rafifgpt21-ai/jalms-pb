import type { ClassColor } from "@prisma/client"
import type { NavigationCourse } from "@/types/navigation"

export const CLASS_COLOR_STYLES: Record<ClassColor, { background: string; foreground: string; ring: string; swatch: string }> = {
  RED: { background: "bg-red-600 dark:bg-red-800", foreground: "text-white dark:text-red-50", ring: "ring-red-500 dark:ring-red-700", swatch: "bg-red-500 dark:bg-red-700" },
  ORANGE: { background: "bg-orange-600 dark:bg-orange-800", foreground: "text-white dark:text-orange-50", ring: "ring-orange-500 dark:ring-orange-700", swatch: "bg-orange-500 dark:bg-orange-700" },
  AMBER: { background: "bg-amber-500 dark:bg-amber-700", foreground: "text-slate-950 dark:text-amber-50", ring: "ring-amber-500 dark:ring-amber-600", swatch: "bg-amber-500 dark:bg-amber-700" },
  EMERALD: { background: "bg-emerald-600 dark:bg-emerald-800", foreground: "text-white dark:text-emerald-50", ring: "ring-emerald-500 dark:ring-emerald-700", swatch: "bg-emerald-500 dark:bg-emerald-700" },
  TEAL: { background: "bg-teal-600 dark:bg-teal-800", foreground: "text-white dark:text-teal-50", ring: "ring-teal-500 dark:ring-teal-700", swatch: "bg-teal-500 dark:bg-teal-700" },
  CYAN: { background: "bg-cyan-600 dark:bg-cyan-800", foreground: "text-white dark:text-cyan-50", ring: "ring-cyan-500 dark:ring-cyan-700", swatch: "bg-cyan-500 dark:bg-cyan-700" },
  BLUE: { background: "bg-blue-600 dark:bg-blue-800", foreground: "text-white dark:text-blue-50", ring: "ring-blue-500 dark:ring-blue-700", swatch: "bg-blue-500 dark:bg-blue-700" },
  INDIGO: { background: "bg-indigo-600 dark:bg-indigo-800", foreground: "text-white dark:text-indigo-50", ring: "ring-indigo-500 dark:ring-indigo-700", swatch: "bg-indigo-500 dark:bg-indigo-700" },
  VIOLET: { background: "bg-violet-600 dark:bg-violet-800", foreground: "text-white dark:text-violet-50", ring: "ring-violet-500 dark:ring-violet-700", swatch: "bg-violet-500 dark:bg-violet-700" },
  PURPLE: { background: "bg-purple-600 dark:bg-purple-800", foreground: "text-white dark:text-purple-50", ring: "ring-purple-500 dark:ring-purple-700", swatch: "bg-purple-500 dark:bg-purple-700" },
  PINK: { background: "bg-pink-600 dark:bg-pink-800", foreground: "text-white dark:text-pink-50", ring: "ring-pink-500 dark:ring-pink-700", swatch: "bg-pink-500 dark:bg-pink-700" },
  ROSE: { background: "bg-rose-600 dark:bg-rose-800", foreground: "text-white dark:text-rose-50", ring: "ring-rose-500 dark:ring-rose-700", swatch: "bg-rose-500 dark:bg-rose-700" },
}

export const CLASS_COLOR_SURFACE_STYLES: Record<ClassColor, string> = {
  RED: "bg-red-50/80 dark:bg-red-950/25",
  ORANGE: "bg-orange-50/80 dark:bg-orange-950/25",
  AMBER: "bg-amber-50/80 dark:bg-amber-950/25",
  EMERALD: "bg-emerald-50/80 dark:bg-emerald-950/25",
  TEAL: "bg-teal-50/80 dark:bg-teal-950/25",
  CYAN: "bg-cyan-50/80 dark:bg-cyan-950/25",
  BLUE: "bg-blue-50/80 dark:bg-blue-950/25",
  INDIGO: "bg-indigo-50/80 dark:bg-indigo-950/25",
  VIOLET: "bg-violet-50/80 dark:bg-violet-950/25",
  PURPLE: "bg-purple-50/80 dark:bg-purple-950/25",
  PINK: "bg-pink-50/80 dark:bg-pink-950/25",
  ROSE: "bg-rose-50/80 dark:bg-rose-950/25",
}

const FALLBACK_COLORS: ClassColor[] = ["INDIGO", "BLUE", "TEAL", "EMERALD", "VIOLET", "PURPLE", "ROSE", "ORANGE"]

function hash(value: string) {
  let result = 0
  for (let index = 0; index < value.length; index += 1) result = ((result << 5) - result + value.charCodeAt(index)) | 0
  return Math.abs(result)
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase()
  return (words[0] || "CO").slice(0, 2).toUpperCase()
}

export function resolveCourseIdentity(course: NavigationCourse) {
  const color = course.class?.color ?? FALLBACK_COLORS[hash(course.id) % FALLBACK_COLORS.length]
  const style = CLASS_COLOR_STYLES[color]
  const subjectCode = course.subject?.code?.toUpperCase().slice(0, 3)
  return {
    imageUrl: course.iconImageUrl || null,
    label: subjectCode || initials(course.reportName || course.name),
    color,
    ...style,
    accessibleName: [course.reportName || course.name, course.subject?.name, course.class?.name, course.roleContext === "teacher" ? "Teaching" : "Enrolled"]
      .filter(Boolean)
      .join(" · "),
  }
}
