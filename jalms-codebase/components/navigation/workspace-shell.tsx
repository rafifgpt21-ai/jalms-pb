"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowUpDown, Home, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, RotateCcw, School, Settings2, Users, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CLASS_COLOR_SURFACE_STYLES, resolveCourseIdentity } from "@/lib/course-identity"
import {
  contextFromPath, contextLabel, defaultCourseHref, groupsForContext, isSectionActive,
  type BrowseContext,
} from "@/lib/navigation-config"
import type { NavigationCourse, WorkspaceUser } from "@/types/navigation"
import { getDefaultDashboardHref } from "@/lib/role-dashboard"
import { rememberCourseSection, reorderCourses, updateWorkspacePreference } from "@/lib/actions/workspace-preferences.actions"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { UserSettings } from "@/components/user-settings"
import { useMobileHeader } from "@/components/mobile-header-context"
import { useCourseChatNotifications } from "@/components/course/course-chat-notification-provider"
import {
  AnnouncementRouteSkeleton,
  AttendanceRouteSkeleton,
  CourseRouteSkeleton,
  DashboardRouteSkeleton,
  GridRouteSkeleton,
  LearningProfileRouteSkeleton,
  MaterialFormRouteSkeleton,
  StudentAttendanceRouteSkeleton,
  StudentCoursesRouteSkeleton,
  StudentGradesRouteSkeleton,
  StudentScheduleRouteSkeleton,
  StudentTaskDetailRouteSkeleton,
  StudentTaskRouteSkeleton,
  TeacherScheduleRouteSkeleton,
  TaskGradingRouteSkeleton,
  TaskRouteSkeleton,
  TableRouteSkeleton,
} from "@/components/navigation/route-skeletons"

function PendingDestinationSkeleton({ pathname }: { pathname: string }) {
  if (pathname === "/teacher") return <DashboardRouteSkeleton variant="teacher" />
  if (pathname === "/student") return <DashboardRouteSkeleton variant="student" />
  if (pathname === "/admin") return <DashboardRouteSkeleton variant="admin" />
  if (pathname === "/homeroom") return <DashboardRouteSkeleton variant="homeroom" />
  if (pathname === "/parent") return <DashboardRouteSkeleton variant="parent" />
  if (pathname === "/teacher/materials/new") return <MaterialFormRouteSkeleton />
  if (/^\/student\/courses\/[^/]+\/tasks\/?$/.test(pathname)) return <StudentTaskRouteSkeleton />
  if (/^\/student\/courses\/[^/]+\/tasks\/[^/]+\/?$/.test(pathname)) return <StudentTaskDetailRouteSkeleton />
  if (/^\/teacher\/courses\/[^/]+\/tasks\/?$/.test(pathname)) return <TaskRouteSkeleton />
  if (/^\/teacher\/courses\/[^/]+\/tasks\/[^/]+\/?$/.test(pathname) && !pathname.endsWith("/new")) return <TaskGradingRouteSkeleton />
  if (/^\/teacher\/courses\/[^/]+\/announcements\/?$/.test(pathname)) return <AnnouncementRouteSkeleton canManage />
  if (/^\/student\/courses\/[^/]+\/announcements\/?$/.test(pathname)) return <AnnouncementRouteSkeleton />
  if (/^\/teacher\/attendance\/[^/]+\/?$/.test(pathname)) return <AttendanceRouteSkeleton detail />
  if (pathname === "/teacher/attendance") return <AttendanceRouteSkeleton />
  if (pathname === "/teacher/schedule") return <TeacherScheduleRouteSkeleton />
  if (pathname === "/student/learning-profile") return <LearningProfileRouteSkeleton />
  if (pathname === "/student/grades") return <StudentGradesRouteSkeleton />
  if (pathname === "/student/attendance") return <StudentAttendanceRouteSkeleton />
  if (pathname === "/student/schedule") return <StudentScheduleRouteSkeleton />
  if (/^\/(teacher|student)\/courses\/[^/]+/.test(pathname)) return <CourseRouteSkeleton />
  if (pathname === "/student/courses") return <StudentCoursesRouteSkeleton />
  if (pathname === "/homeroom") return <GridRouteSkeleton />
  if (/^\/admin\/(users|classes|courses|subjects|semesters|schedule|grading|rollover)/.test(pathname)) return <TableRouteSkeleton />
  return <DashboardRouteSkeleton />
}

function CourseMark({ course, className }: { course: NavigationCourse; className?: string }) {
  const identity = resolveCourseIdentity(course)
  const [failed, setFailed] = React.useState(false)
  return (
    <span aria-hidden className={cn(
      "course-code-mark relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-extrabold transition-[border-radius,transform] group-hover:rounded-lg md:size-10",
      identity.background, identity.foreground,
      identity.imageUrl && !failed && `ring-2 ${identity.ring}`,
      className,
    )}>
      {identity.imageUrl && !failed
        ? <Image src={identity.imageUrl} alt="" fill sizes="(min-width: 768px) 40px, 44px" className="object-cover" onError={() => setFailed(true)} />
        : identity.label}
    </span>
  )
}

function SortableCourse({ course, active, reorderEnabled, onSelect }: {
  course: NavigationCourse
  active: boolean
  reorderEnabled: boolean
  onSelect?: (context: BrowseContext) => void
}) {
  const sortableId = `${course.roleContext}:${course.id}`
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId, disabled: !reorderEnabled })
  const content = (
    <span className="group relative flex h-14 w-full items-center justify-center md:h-12">
      <CourseMark course={course} className={cn(active && "rounded-lg ring-2 ring-[var(--workspace-rail-active)]", isDragging && "opacity-60")} />
    </span>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
          {onSelect ? (
            <button type="button" className="w-full" onClick={() => !isDragging && onSelect({ kind: "course", course })} aria-label={resolveCourseIdentity(course).accessibleName}>{content}</button>
          ) : (
            <Link href={defaultCourseHref(course)} prefetch={false} aria-label={resolveCourseIdentity(course).accessibleName}>{content}</Link>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">{resolveCourseIdentity(course).accessibleName}</TooltipContent>
    </Tooltip>
  )
}

function RailDestination({ label, href, active, icon: Icon, onSelect }: {
  label: string
  href: string
  active: boolean
  icon: React.ElementType
  onSelect?: () => void
}) {
  const mark = <span className={cn(
    "flex size-11 items-center justify-center rounded-xl transition-all group-hover:rounded-lg md:size-10",
    active ? "rounded-lg bg-indigo-500 text-white" : "bg-[var(--workspace-rail-icon)] text-[var(--workspace-rail-foreground)] group-hover:bg-indigo-500 group-hover:text-white",
  )}><Icon className="size-5 md:size-[18px]" /></span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {onSelect
          ? <button type="button" onClick={onSelect} aria-label={label} className="group flex h-14 w-full items-center justify-center md:h-11">{mark}</button>
          : <Link href={href} prefetch aria-label={label} className="group flex h-14 w-full items-center justify-center md:h-11">{mark}</Link>}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function CourseRail({ user, courses, activeContext, onSelect, onNavigate, reorderEnabled = true, directMessagesEnabled = true }: {
  user: WorkspaceUser
  courses: NavigationCourse[]
  activeContext: BrowseContext
  onSelect?: (context: BrowseContext) => void
  onNavigate?: (href: string) => void
  reorderEnabled?: boolean
  directMessagesEnabled?: boolean
}) {
  const [ordered, setOrdered] = React.useState(courses)
  React.useEffect(() => setOrdered(courses), [courses])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const teaching = ordered.filter((course) => course.roleContext === "teacher")
  const enrolled = ordered.filter((course) => course.roleContext === "student")
  const hasCourseContexts = teaching.length > 0 || enrolled.length > 0
  const homeHref = getDefaultDashboardHref(user.roles)

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId || activeId === overId) return
    const [role] = activeId.split(":") as ["teacher" | "student"]
    if (!overId.startsWith(`${role}:`)) return
    const group = ordered.filter((course) => course.roleContext === role)
    const oldIndex = group.findIndex((course) => `${role}:${course.id}` === activeId)
    const newIndex = group.findIndex((course) => `${role}:${course.id}` === overId)
    const nextGroup = arrayMove(group, oldIndex, newIndex)
    const previous = ordered
    setOrdered(ordered.map((course) => course.roleContext === role ? nextGroup.shift()! : course))
    void reorderCourses(role, group.length ? arrayMove(group, oldIndex, newIndex).map((course) => course.id) : []).then((result) => {
      if (result.error) {
        setOrdered(previous)
        toast.error(result.error)
      }
    })
  }

  const select = (context: BrowseContext) => onSelect?.(context)
  return (
    <TooltipProvider delayDuration={100}>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <aside className="flex h-full w-16 shrink-0 flex-col border-r border-[var(--workspace-rail-divider)] bg-[var(--workspace-rail)] text-[var(--workspace-rail-foreground)]">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
            <RailDestination label="Home" href={homeHref} icon={Home} active={activeContext.kind === "home"} onSelect={onNavigate ? () => onNavigate(homeHref) : undefined} />
            {directMessagesEnabled && <RailDestination label="Messages" href="/socials" icon={MessageSquare} active={activeContext.kind === "messages"} onSelect={onSelect ? () => select({ kind: "messages" }) : undefined} />}
            {user.roles.includes("HOMEROOM_TEACHER") && <RailDestination label="Homeroom" href="/homeroom" icon={School} active={activeContext.kind === "homeroom"} onSelect={onSelect ? () => select({ kind: "homeroom" }) : undefined} />}
            {user.roles.includes("ADMIN") && <RailDestination label="Administration" href="/admin" icon={Settings2} active={activeContext.kind === "admin"} onSelect={onSelect ? () => select({ kind: "admin" }) : undefined} />}
            {hasCourseContexts && <div className="mx-auto my-2 h-px w-8 bg-[var(--workspace-rail-divider)]" />}
            {teaching.length > 0 && <>
              <div className="px-1 pb-1 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">Teach</div>
              <SortableContext items={teaching.map((course) => `teacher:${course.id}`)} strategy={verticalListSortingStrategy}>
                {teaching.map((course) => <SortableCourse key={`teacher:${course.id}`} course={course} active={activeContext.kind === "course" && activeContext.course.id === course.id && activeContext.course.roleContext === "teacher"} reorderEnabled={reorderEnabled} onSelect={onSelect} />)}
              </SortableContext>
            </>}
            {enrolled.length > 0 && <>
              <div className="mx-auto my-2 h-px w-8 bg-[var(--workspace-rail-divider)]" />
              <div className="px-1 pb-1 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">Learn</div>
              <SortableContext items={enrolled.map((course) => `student:${course.id}`)} strategy={verticalListSortingStrategy}>
                {enrolled.map((course) => <SortableCourse key={`student:${course.id}`} course={course} active={activeContext.kind === "course" && activeContext.course.id === course.id && activeContext.course.roleContext === "student"} reorderEnabled={reorderEnabled} onSelect={onSelect} />)}
              </SortableContext>
            </>}
            {user.roles.includes("PARENT") && <>
              <div className="mx-auto my-2 h-px w-8 bg-[var(--workspace-rail-divider)]" />
              <RailDestination label="Family" href="/parent" icon={Users} active={activeContext.kind === "family"} onSelect={onSelect ? () => select({ kind: "family" }) : undefined} />
            </>}
          </div>
          <div className="flex justify-center border-t border-[var(--workspace-rail-divider)] p-2">
            <UserSettings email={user.email} name={user.name} nickname={user.nickname} image={user.image} side="right" align="end" />
          </div>
        </aside>
      </DndContext>
    </TooltipProvider>
  )
}

function CourseSidebarSummary({ course, onCollapse }: {
  course: NavigationCourse
  onCollapse?: () => void
}) {
  const summary = course.summary ?? { taskCount: 0, materialCount: 0, upcomingCount: 0 }
  const stats = course.roleContext === "teacher"
    ? [
        [summary.studentCount ?? 0, "Students"],
        [summary.taskCount, "Tasks"],
        [summary.materialCount, "Materials"],
        [summary.upcomingCount, "Upcoming"],
      ]
    : [
        [summary.taskCount, "Tasks"],
        [summary.materialCount, "Materials"],
        [summary.upcomingCount, "Upcoming"],
      ]
  const className = course.class?.name
  const summarySurface = course.class?.color ? CLASS_COLOR_SURFACE_STYLES[course.class.color] : "bg-card"

  return (
    <div className={cn("shrink-0 border-b p-3", summarySurface)}>
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="line-clamp-2 text-sm font-semibold leading-5">{course.reportName || course.name}</div>
          {className && <div className="truncate text-[11px] text-muted-foreground">{className}</div>}
        </div>
        {onCollapse && (
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onCollapse} aria-label="Collapse sections">
            <PanelLeftClose className="size-4" />
          </Button>
        )}
      </div>

      <div className={cn("mt-2.5 grid overflow-hidden rounded-md border bg-background/55 dark:bg-background/30", course.roleContext === "teacher" ? "grid-cols-2" : "grid-cols-3")}>
        {stats.map(([value, label], index) => (
          <div key={label} className={cn(
            "min-w-0 px-2 py-1.5",
            course.roleContext === "teacher" && index < 2 && "border-b",
            index % (course.roleContext === "teacher" ? 2 : 3) !== 0 && "border-l",
          )}>
            <div className="truncate text-sm font-semibold tabular-nums">{value}</div>
            <div className="truncate text-[10px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

    </div>
  )
}

function SectionSidebar({ context, roles, pathname, onNavigate, onCollapse, directMessagesEnabled = true }: {
  context: BrowseContext
  roles: WorkspaceUser["roles"]
  pathname: string
  onNavigate?: (href: string) => void
  onCollapse?: () => void
  directMessagesEnabled?: boolean
}) {
  const groups = groupsForContext(context, roles, directMessagesEnabled)
  const { unreadCourseIds, clearCourseUnread } = useCourseChatNotifications()
  return (
    <aside className="flex h-full w-full min-w-0 flex-col bg-[var(--workspace-sidebar)] text-foreground">
      {context.kind === "course" ? (
        <CourseSidebarSummary course={context.course} onCollapse={onCollapse} />
      ) : (
        <div className="workspace-topbar flex h-14 min-h-14 shrink-0 items-center gap-2 border-b px-4 py-1.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{contextLabel(context)}</div>
          </div>
          {onCollapse && <Button variant="ghost" size="icon" className="size-8" onClick={onCollapse} aria-label="Collapse sections"><PanelLeftClose className="size-4" /></Button>}
        </div>
      )}
      <nav className="flex-1 space-y-3 overflow-y-auto p-2">
        {groups.map((group, index) => (
          <div key={group.id} className={cn(context.kind === "home" && index > 0 && "border-t pt-3")}>
            {group.label && <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</div>}
            <div className="space-y-0.5">
              {group.sections.map((section) => {
                const Icon = section.icon
                const active = isSectionActive(pathname, section)
                const hasUnreadChat = context.kind === "course" && section.id === "chat" && unreadCourseIds.has(context.course.id) && !active
                return <Link key={section.id} href={section.href} prefetch onClick={() => {
                  if (context.kind === "course") void rememberCourseSection(context.course.id, context.course.roleContext, section.id)
                  if (context.kind === "course" && section.id === "chat") clearCourseUnread(context.course.id, context.course.roleContext)
                  onNavigate?.(section.href)
                }} className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-base transition-colors md:min-h-8 md:gap-2 md:px-2.5 md:text-sm",
                  active ? "bg-indigo-500/12 font-medium text-indigo-700 dark:text-indigo-300" : "text-muted-foreground hover:bg-[var(--workspace-row-hover)] hover:text-foreground",
                )}>
                  <Icon className="size-[18px] shrink-0 md:size-4" />
                  <span className="truncate">{section.label}</span>
                  {hasUnreadChat && <span className="ml-auto size-2 shrink-0 rounded-full bg-red-500 ring-2 ring-red-500/15" aria-label="New chat messages" />}
                  {section.actionHref && <span className="ml-auto text-base text-muted-foreground">+</span>}
                </Link>
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}

export function WorkspaceShell({ children, user, courses, channelSidebarCollapsed = false, directMessagesEnabled = true }: {
  children: React.ReactNode
  user: WorkspaceUser
  courses: NavigationCourse[]
  channelSidebarCollapsed?: boolean
  directMessagesEnabled?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const mobileHeader = useMobileHeader()
  const routeContext = contextFromPath(pathname, courses)
  const [pendingPath, setPendingPath] = React.useState<string | null>(null)
  const [collapsed, setCollapsed] = React.useState(channelSidebarCollapsed)
  const [tabletSectionsOpen, setTabletSectionsOpen] = React.useState(false)
  const [mobileNavigatorOpen, setMobileNavigatorOpen] = React.useState(false)
  const [browseContext, setBrowseContext] = React.useState<BrowseContext>(routeContext)
  const [mobileReorder, setMobileReorder] = React.useState(false)
  const displayPath = pendingPath ?? pathname
  const displayContext = contextFromPath(displayPath, courses)
  const isSocials = displayPath.startsWith("/socials")
  const isCourseChat = /^\/(teacher|student)\/courses\/[^/]+\/chat\/?$/.test(displayPath)
  const isNavigating = pendingPath !== null && pendingPath !== pathname

  React.useEffect(() => {
    setPendingPath(null)
    setBrowseContext(routeContext)
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const highPriorityRoutes = [getDefaultDashboardHref(user.roles)]
    if (directMessagesEnabled) highPriorityRoutes.push("/socials")
    if (user.roles.includes("ADMIN")) highPriorityRoutes.push("/admin")
    if (user.roles.includes("SUBJECT_TEACHER")) highPriorityRoutes.push("/teacher")
    if (user.roles.includes("STUDENT")) highPriorityRoutes.push("/student")
    if (user.roles.includes("HOMEROOM_TEACHER")) highPriorityRoutes.push("/homeroom")
    if (user.roles.includes("PARENT")) highPriorityRoutes.push("/parent")

    const siblingRoutes = groupsForContext(routeContext, user.roles, directMessagesEnabled)
      .flatMap((group) => group.sections)
      .map((section) => section.href)

    for (const href of new Set([...highPriorityRoutes, ...siblingRoutes])) router.prefetch(href)
  }, [routeContext.kind, pathname, router, user.roles]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const handlePop = () => {
      if (mobileNavigatorOpen) setMobileNavigatorOpen(false)
    }
    window.addEventListener("popstate", handlePop)
    return () => window.removeEventListener("popstate", handlePop)
  }, [mobileNavigatorOpen])

  const openMobileNavigator = () => {
    setBrowseContext(routeContext)
    window.history.pushState({ ...window.history.state, arsyncNavigator: true }, "")
    setMobileNavigatorOpen(true)
  }
  const closeMobileNavigator = () => {
    if (window.history.state?.arsyncNavigator) window.history.back()
    else setMobileNavigatorOpen(false)
  }
  const dismissMobileNavigator = (href?: string) => {
    window.history.replaceState({ ...window.history.state, arsyncNavigator: undefined }, "")
    setMobileNavigatorOpen(false)
    if (href) setPendingPath(href)
  }
  const navigateFromMobile = (href?: string) => {
    dismissMobileNavigator(href)
    if (href) router.push(href)
  }
  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    void updateWorkspacePreference({ density: document.documentElement.dataset.density === "comfortable" ? "comfortable" : "compact", theme: (document.documentElement.dataset.theme as "system" | "light" | "dark") || "system", channelSidebarCollapsed: next })
  }

  const activeGroups = groupsForContext(displayContext, user.roles, directMessagesEnabled)
  const activeSection = activeGroups.flatMap((group) => group.sections).find((section) => isSectionActive(displayPath, section))
  const pageTitle = pendingPath ? activeSection?.label || contextLabel(displayContext) : mobileHeader.title || activeSection?.label || contextLabel(displayContext)

  const beginNavigation = React.useCallback((href: string) => {
    if (href !== pathname) setPendingPath(href)
  }, [pathname])

  return (
    <div className="workspace-shell flex h-dvh min-h-0 w-full overflow-hidden bg-[var(--workspace-canvas)]">
      <div className="hidden md:flex" onClick={(event) => {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]")
        if (link) beginNavigation(link.pathname)
      }}><CourseRail user={user} courses={courses} activeContext={displayContext} directMessagesEnabled={directMessagesEnabled} /></div>

      {!collapsed && <div className="hidden w-60 shrink-0 border-r lg:flex"><SectionSidebar context={displayContext} roles={user.roles} pathname={displayPath} onNavigate={beginNavigation} onCollapse={toggleCollapsed} directMessagesEnabled={directMessagesEnabled} /></div>}

      {tabletSectionsOpen && <div className="fixed inset-0 z-50 hidden md:flex lg:hidden">
        <button className="absolute inset-0 bg-black/40" onClick={() => setTabletSectionsOpen(false)} aria-label="Close sections" />
        <div className="relative ml-16 w-60 border-r shadow-xl"><SectionSidebar context={displayContext} roles={user.roles} pathname={displayPath} onNavigate={(href) => { beginNavigation(href); setTabletSectionsOpen(false) }} directMessagesEnabled={directMessagesEnabled} /></div>
      </div>}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="workspace-topbar flex h-14 min-h-14 shrink-0 items-center gap-2 border-b bg-[var(--workspace-header)] px-4 py-1.5">
          <Button variant="ghost" size="icon" className="hidden size-8 md:inline-flex lg:hidden" onClick={() => setTabletSectionsOpen(true)} aria-label="Open sections"><PanelLeftOpen className="size-4" /></Button>
          {collapsed && <Button variant="ghost" size="icon" className="hidden size-8 lg:inline-flex" onClick={toggleCollapsed} aria-label="Show sections"><PanelLeftOpen className="size-4" /></Button>}
          {!isNavigating && mobileHeader.leftAction && <div className="md:hidden">{mobileHeader.leftAction}</div>}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{pageTitle}</div>
            {!isNavigating && mobileHeader.subtitle && mobileHeader.showMobileSubtitle !== false && <div className="truncate text-xs text-muted-foreground">{mobileHeader.subtitle}</div>}
          </div>
          {!isNavigating && mobileHeader.rightAction && <div className="flex items-center gap-2">{mobileHeader.rightAction}</div>}
          <Button variant="default" size="icon" className="-mr-2 size-11 md:hidden" onClick={openMobileNavigator} aria-label="Open workspace navigation">
            <Menu />
          </Button>
        </header>

        <main className={cn("workspace-content min-h-0 flex-1 overflow-y-auto", isSocials && "p-0", isCourseChat && "course-chat-content")}>
          {isNavigating ? <PendingDestinationSkeleton pathname={displayPath} /> : children}
        </main>
      </div>

      {mobileNavigatorOpen && <div className="fixed inset-0 z-[100] flex bg-background md:hidden">
        <CourseRail user={user} courses={courses} activeContext={browseContext} onSelect={setBrowseContext} onNavigate={navigateFromMobile} reorderEnabled={mobileReorder} directMessagesEnabled={directMessagesEnabled} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="workspace-topbar flex h-14 min-h-14 items-center justify-between gap-2 border-b bg-[var(--workspace-header)] px-4 py-1.5">
            <Button variant={mobileReorder ? "secondary" : "ghost"} size="sm" onClick={() => setMobileReorder((value) => !value)}>
              {mobileReorder ? <RotateCcw className="size-4" /> : <ArrowUpDown className="size-4" />}{mobileReorder ? "Done" : "Reorder"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2 size-11 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive focus-visible:ring-destructive/30"
              onClick={closeMobileNavigator}
              aria-label="Close workspace navigation"
            >
              <X className="size-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <SectionSidebar
            context={browseContext}
            roles={user.roles}
            pathname={displayPath}
            directMessagesEnabled={directMessagesEnabled}
            onNavigate={dismissMobileNavigator}
          />
        </div>
      </div>}
    </div>
  )
}
