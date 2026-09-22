"use client"

import Link from "next/link"
import { Activity, BookOpen, Calendar, CalendarRange, ClipboardCheck, FileQuestion, FileText, GraduationCap, MoreHorizontal, School, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const actionIcons = {
  activity: Activity,
  bookOpen: BookOpen,
  calendar: Calendar,
  calendarRange: CalendarRange,
  checklist: ClipboardCheck,
  fileQuestion: FileQuestion,
  fileText: FileText,
  graduationCap: GraduationCap,
  school: School,
  user: User,
  users: Users,
} as const

export type DashboardActionIcon = keyof typeof actionIcons

export interface DashboardAction {
  href: string
  label: string
  icon: DashboardActionIcon
  primary?: boolean
}

function ActionLink({ action, className }: { action: DashboardAction; className?: string }) {
  const Icon = actionIcons[action.icon]
  return (
    <Link href={action.href} className={cn("group flex min-h-11 min-w-0 items-center gap-2.5 rounded-md border px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", action.primary ? "border-primary/35 bg-primary/10 text-primary hover:bg-primary/15" : "bg-card hover:border-primary/35 hover:bg-accent/40", className)}>
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", action.primary ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground")}><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1 truncate">{action.label}</span>
    </Link>
  )
}

export function DashboardActionGroup({ actions, moreLabel = "More actions" }: { actions: DashboardAction[]; moreLabel?: string }) {
  const primaryActions = actions.filter((action) => action.primary)
  const mobileActions = primaryActions.length ? primaryActions : actions.slice(0, 1)
  const secondaryActions = actions.filter((action) => !mobileActions.includes(action))

  return (
    <div className="dashboard-action-group">
      <div className="flex gap-2 sm:hidden">
        {mobileActions.map((action) => <ActionLink key={action.href} action={action} className="flex-1" />)}
        {secondaryActions.length > 0 && (
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="size-11 shrink-0" aria-label={moreLabel}>
                <MoreHorizontal />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <SheetHeader className="pr-10">
                <SheetTitle>{moreLabel}</SheetTitle>
                <SheetDescription>Choose an action to continue.</SheetDescription>
              </SheetHeader>
              <div className="grid gap-2 px-4 pb-2">
                {secondaryActions.map((action) => <ActionLink key={action.href} action={action} />)}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
      <div className="hidden gap-2 sm:flex sm:flex-wrap">
        {actions.map((action) => <ActionLink key={action.href} action={action} className="min-w-40 flex-1" />)}
      </div>
    </div>
  )
}
