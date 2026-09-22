import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

const TONES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950/60",
  info: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-800/70 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-950/60",
  warning: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-950/60",
  danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50 dark:border-red-800/70 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-950/60",
  neutral: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800",
  accent: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50 dark:border-violet-800/70 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-950/60",
} as const

const STATUS_TONES: Record<string, keyof typeof TONES> = {
  ACTIVE: "success", GRADED: "success", PRESENT: "success", PUBLISHED: "success", COMPLETED: "success", READY: "success", TAKEN: "success", GOOD: "success",
  SUBMITTED: "info", CLASS_SYNC: "info", SEEDED: "info", CLASS_SEEDED: "info", VALIDATING: "info",
  DRAFT: "warning", PENDING: "warning", PARTIAL: "warning", EXCUSED: "warning", LATE: "warning", WARNING: "warning",
  ABSENT: "danger", MISSING: "danger", FAILED: "danger", ERROR: "danger", OVERDUE: "danger", CRITICAL: "danger",
  RUNNING: "accent", SKIPPED: "accent",
  ARCHIVED: "neutral", INACTIVE: "neutral", MANUAL: "neutral", TODO: "neutral", "TO DO": "neutral", "N/A": "neutral",
}

export function statusTone(status: string) {
  return TONES[STATUS_TONES[status.trim().toUpperCase()] || "neutral"]
}

export function StatusBadge({ status, label, className, children }: { status: string; label?: string; className?: string; children?: ReactNode }) {
  return <Badge variant="outline" className={cn("font-medium", statusTone(status), className)}>{children ?? label ?? status.replaceAll("_", " ").toLowerCase()}</Badge>
}
