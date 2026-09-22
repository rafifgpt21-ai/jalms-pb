import * as React from "react"
import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkspacePanel } from "@/components/workspace/workspace-page"
import { cn } from "@/lib/utils"
import { DashboardDisclosure } from "@/components/dashboard/dashboard-disclosure"

export function DashboardSectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4 py-2.5">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {description && <p className="dashboard-secondary-text truncate text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function DashboardPreviewList<T>({
  items,
  renderItem,
  getKey,
  visibleCount = 3,
  viewAllHref,
  viewAllLabel = "View all",
  showViewAllFooter = true,
  showAllLabel = "Show all",
  showLessLabel = "Show less",
  empty,
}: {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  getKey?: (item: T, index: number) => React.Key
  visibleCount?: number
  viewAllHref?: string
  viewAllLabel?: string
  showViewAllFooter?: boolean
  showAllLabel?: string
  showLessLabel?: string
  empty?: React.ReactNode
}) {
  if (!items.length) return empty ?? null

  const previewItems = items.slice(0, visibleCount)
  const remainingItems = items.slice(visibleCount)
  const renderItems = (list: T[]) => list.map((item, index) => (
    <React.Fragment key={getKey?.(item, index) ?? index}>
      {renderItem(item, index)}
    </React.Fragment>
  ))

  return (
    <>
      <div className="divide-y">{renderItems(previewItems)}</div>
      {remainingItems.length > 0 && viewAllHref && showViewAllFooter && (
        <div className="border-t px-3 py-2">
          <Button asChild variant="ghost" size="sm" className="min-h-9 w-full justify-between px-2 text-muted-foreground">
            <Link href={viewAllHref}>
              <span>{viewAllLabel}</span>
              <ArrowRight />
            </Link>
          </Button>
        </div>
      )}
      {remainingItems.length > 0 && !viewAllHref && (
        <DashboardDisclosure label={showAllLabel} expandedLabel={showLessLabel} expandedChildren={renderItems(remainingItems)}>
          <></>
        </DashboardDisclosure>
      )}
    </>
  )
}

export interface DashboardMetric {
  label: string
  value: React.ReactNode
  description?: React.ReactNode
  icon?: LucideIcon
  href?: string
  progress?: number
}

export function DashboardMetricStrip({
  metrics,
  className,
}: {
  metrics: DashboardMetric[]
  className?: string
}) {
  return (
    <WorkspacePanel className={cn("grid grid-cols-2 overflow-hidden", className)}>
      {metrics.map(({ label, value, description, icon: Icon, href, progress }, index) => {
        const content = (
          <>
            <div className="flex min-w-0 items-center gap-3">
              {Icon && <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></span>}
              <span className="min-w-0">
                <span className="block text-xl font-semibold tabular-nums">{value}</span>
                <span className="block truncate text-xs font-medium">{label}</span>
                {description && <span className="dashboard-secondary-text mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>}
              </span>
            </div>
            {progress !== undefined && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, progress))}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
              </div>
            )}
          </>
        )
        const className = cn(
          "min-w-0 px-4 py-3",
          index > 0 && "border-l",
          href && "transition-colors hover:bg-[var(--workspace-row-hover)]",
        )

        return href ? <Link key={label} href={href} className={className}>{content}</Link> : <div key={label} className={className}>{content}</div>
      })}
    </WorkspacePanel>
  )
}
