import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const statTones = {
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
} as const

export function RecordStats({ children }: { children: ReactNode }) {
  return <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">{children}</section>
}

export function RecordStat({
  label,
  value,
  detail,
  icon: Icon,
  tone = "indigo",
}: {
  label: string
  value: string | number
  detail?: string
  icon: LucideIcon
  tone?: keyof typeof statTones
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 shadow-xs sm:p-4">
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", statTones[tone])}>
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:text-[11px]">{label}</p>
        <div className="flex min-w-0 items-baseline gap-1.5">
          <p className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">{value}</p>
          {detail && <span className="hidden truncate text-xs text-muted-foreground sm:inline">{detail}</span>}
        </div>
      </div>
    </div>
  )
}

export function RecordPanelHeader({
  title,
  description,
  trailing,
}: {
  title: string
  description: string
  trailing?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-bold text-foreground sm:text-base">{title}</h2>
        <p className="mt-0.5 text-xs leading-4 text-muted-foreground sm:text-sm">{description}</p>
      </div>
      {trailing}
    </div>
  )
}
