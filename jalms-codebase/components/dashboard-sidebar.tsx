"use client"

import { usePathname, useRouter } from "next/navigation"
import { Role } from "@prisma/client"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import {
    LayoutDashboard,
    Users,
    School,
    BookOpen,
    CalendarRange,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Home,
    ListTodo,
    Loader2,
    ChevronDown,
    FileText,
    GraduationCap,
    Clock,
    MessageSquare,
    Plus,
    PieChart,
    Library,
    Table,
    FileQuestion,
    ChevronsUpDown,
    Check,
    Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import { getCourseAssignments } from "@/lib/actions/teacher.actions"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { useChatNotification } from "@/components/chat/chat-notification-provider"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SidebarNavItemProps {
    href: string
    icon: any
    label: string
    active: boolean
    onClick?: () => void
    hasBadge?: boolean
    isCollapsed: boolean
    navigatingTo: string | null
    setNavigatingTo: (path: string | null) => void
    onNavigate?: () => void
}

function SidebarNavItem({ href, icon: Icon, label, active, onClick, hasBadge, isCollapsed, navigatingTo, setNavigatingTo, onNavigate }: SidebarNavItemProps) {
    const pathname = usePathname()
    const isNavigating = navigatingTo === href
    const isActive = active || isNavigating

    const handleClick = (e: React.MouseEvent) => {
        if (onClick) {
            e.preventDefault()
            onClick()
            return
        }
        if (pathname !== href) {
            setNavigatingTo(href)
        }
        onNavigate?.()
    }

    if (isCollapsed) {
        return (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Link
                            href={href}
                            onClick={handleClick}
                            className={cn(
                                "flex items-center justify-center p-3 rounded-xl transition-all duration-200 relative group z-10",
                                isActive
                                    ? "text-indigo-600 dark:text-indigo-300"
                                    : "hover:bg-white/20 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white text-slate-500 dark:text-slate-400"
                            )}
                        >
                            {isNavigating ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <div className="relative">
                                    <Icon className={cn("h-5 w-5", isActive && "text-indigo-600 dark:text-indigo-400")} />
                                    {hasBadge && (
                                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
                                    )}
                                </div>
                            )}
                            <span className="sr-only">{label}</span>
                            {isActive && (
                                <motion.div
                                    className="absolute inset-0 bg-white/40 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-xl shadow-sm z-[-1]"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        {label}
                        {hasBadge && " (Unread)"}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <Link
            href={href}
            onClick={handleClick}
            className={cn(
                "flex items-center gap-3 rounded-xl transition-all duration-200 relative overflow-hidden px-4 py-3 text-base z-10",
                isActive
                    ? "text-indigo-700 dark:text-indigo-300 font-medium"
                    : "hover:bg-white/20 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white text-slate-500 dark:text-slate-400"
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="activeSidebarItem"
                    className="absolute inset-0 bg-white/40 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-xl shadow-sm z-[-1]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}
            {isNavigating ? (
                <Loader2 className="animate-spin h-5 w-5" />
            ) : (
                <div className="relative">
                    <Icon className={cn("h-5 w-5", isActive && "text-blue-600 dark:text-blue-400")} />
                    {hasBadge && (
                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
                    )}
                </div>
            )}
            <span>{label}</span>
        </Link>
    )
}

interface SidebarNavProps {
    userRoles: Role[]
    isCollapsed?: boolean
    onNavigate?: () => void
    teacherCourses?: any[]
    studentCourses?: any[]
    isMobile?: boolean
    hasUnreadMessages?: boolean
}

export function SidebarNav({ userRoles, isCollapsed = false, onNavigate, teacherCourses = [], studentCourses = [], isMobile = false, hasUnreadMessages = false }: SidebarNavProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

    // Teacher specific state
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
    const [assignments, setAssignments] = useState<any[]>([])
    const [tasksExpanded, setTasksExpanded] = useState(false)


    // Reset navigating state when pathname changes
    if (navigatingTo === pathname) {
        setNavigatingTo(null)
    }

    // Auto-select course based on URL
    useEffect(() => {
        if (pathname.startsWith("/teacher/courses/")) {
            const courseId = pathname.split("/")[3]
            if (courseId && teacherCourses.some(c => c.id === courseId)) {
                if (selectedCourseId !== courseId) {
                    setSelectedCourseId(courseId)
                    setTasksExpanded(true)
                }
            }
        } else if (pathname.startsWith("/student/courses/")) {
            const courseId = pathname.split("/")[3]
            if (courseId && studentCourses.some(c => c.id === courseId)) {
                setSelectedCourseId(courseId)
            }
        }
    }, [pathname, teacherCourses, studentCourses])

    // Fetch assignments when course changes or path changes (to catch updates after navigation)
    useEffect(() => {
        if (selectedCourseId) {
            getCourseAssignments(selectedCourseId).then(res => {
                if (res.assignments) setAssignments(res.assignments)
            })
        } else {
            setAssignments([])
        }
    }, [selectedCourseId, pathname])

    // Helper to check active context
    const isAdmin = pathname.startsWith("/admin")
    const isTeacher = pathname.startsWith("/teacher")
    const isHomeroom = pathname.startsWith("/homeroom")
    const isStudent = pathname.startsWith("/student")

    // NavItem moved outside


    return (
        <nav className="space-y-2">
            {/* Admin Section */}
            {userRoles.includes("ADMIN") && isAdmin && (
                <div className="space-y-1">
                    <SidebarNavItem href="/admin" icon={LayoutDashboard} label="Dashboard" active={pathname === "/admin"} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                    <SidebarNavItem href="/admin/users" icon={Users} label="User Management" active={pathname.startsWith("/admin/users")} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                    <SidebarNavItem href="/admin/classes" icon={School} label="Classrooms" active={pathname.startsWith("/admin/classes")} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                    <SidebarNavItem href="/admin/subjects" icon={Library} label="Subjects" active={pathname.startsWith("/admin/subjects")} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                    <SidebarNavItem href="/admin/courses" icon={BookOpen} label="Courses" active={pathname.startsWith("/admin/courses")} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                    <SidebarNavItem href="/admin/semesters" icon={CalendarRange} label="Semesters" active={pathname.startsWith("/admin/semesters")} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                    <SidebarNavItem href="/admin/schedule" icon={Calendar} label="Schedule Manager" active={pathname === "/admin/schedule" || pathname.startsWith("/admin/schedule/") && !pathname.includes("overview")} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                    <SidebarNavItem href="/admin/grading" icon={PieChart} label="Grading Scale" active={pathname.startsWith("/admin/grading")} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />

                    <SidebarNavItem href="/admin/socials" icon={MessageSquare} label="Socials Monitoring" active={pathname.startsWith("/admin/socials")} hasBadge={hasUnreadMessages} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                </div>
            )}

            {/* Subject Teacher Section */}
            {userRoles.includes("SUBJECT_TEACHER") && isTeacher && (
                <div className="space-y-4">
                    <div className="space-y-1">
                        <SidebarNavItem href="/teacher" icon={LayoutDashboard} label="Dashboard" active={pathname === "/teacher"} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                        <SidebarNavItem href="/teacher/attendance" icon={Clock} label="Daily Attendance" active={pathname === "/teacher/attendance"} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                        <SidebarNavItem href="/teacher/quiz-manager" icon={FileQuestion} label="Quiz Manager" active={pathname.startsWith("/teacher/quiz-manager")} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                        <SidebarNavItem href="/teacher/materials" icon={FileText} label="Study Materials" active={pathname === "/teacher/materials"} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                    </div>

                    {isCollapsed ? (
                        <div className="px-2 flex justify-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-slate-200/40 dark:hover:bg-slate-800/40">
                                        <BookOpen className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="right" className="w-56">
                                    <DropdownMenuLabel>Select Course</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {teacherCourses.map(course => (
                                        <DropdownMenuItem
                                            key={course.id}
                                            onClick={() => setSelectedCourseId(course.id)}
                                            className="hover:bg-slate-200/40 dark:hover:bg-slate-800/40 cursor-pointer focus:bg-slate-200/40 dark:focus:bg-slate-800/40 focus:text-sidebar-accent-foreground"
                                        >
                                            {course.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <div className="px-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-full flex items-center justify-between p-2 rounded-xl bg-white/10 dark:bg-slate-900/10 border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-slate-900/20 transition-all duration-200 outline-none group backdrop-blur-md">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/10 shrink-0">
                                                {teacherCourses.find(c => c.id === selectedCourseId)?.name.charAt(0) || "C"}
                                            </div>
                                            <span className="truncate text-sm font-medium text-sidebar-foreground">
                                                {teacherCourses.find(c => c.id === selectedCourseId)?.name || "Select Course"}
                                            </span>
                                        </div>
                                        <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-(--radix-dropdown-menu-trigger-width)"
                                    align="start"
                                >
                                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1.5">Switch Course</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {teacherCourses.map(course => (
                                        <DropdownMenuItem
                                            key={course.id}
                                            onClick={() => setSelectedCourseId(course.id)}
                                            className="flex items-center justify-between p-2"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className={cn(
                                                    "h-6 w-6 rounded-md flex items-center justify-center text-xs font-medium border shrink-0",
                                                    selectedCourseId === course.id
                                                        ? "bg-indigo-500 text-white border-indigo-600"
                                                        : "bg-slate-100 dark:bg-slate-800 border-transparent"
                                                )}>
                                                    {course.name.charAt(0)}
                                                </div>
                                                <span className="truncate">{course.name}</span>
                                            </div>
                                            {selectedCourseId === course.id && (
                                                <Check className="h-4 w-4 text-indigo-500" />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    {selectedCourseId && (
                        <div className="space-y-1">
                            {/* Tasks Menu */}
                            <div className="space-y-1">
                                {isCollapsed ? (
                                    <div className="flex justify-center">
                                        <TooltipProvider>
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <Link
                                                        href={`/teacher/courses/${selectedCourseId}/tasks`}
                                                        onClick={(e) => {
                                                            if (pathname !== `/teacher/courses/${selectedCourseId}/tasks`) {
                                                                setNavigatingTo(`/teacher/courses/${selectedCourseId}/tasks`)
                                                            }
                                                        }}
                                                        className={cn(
                                                            "flex items-center justify-center p-3 rounded-xl transition-all duration-200 relative group cursor-pointer z-10",
                                                            (pathname.includes("/tasks") && !pathname.includes("/tasks-summary")) || navigatingTo === `/teacher/courses/${selectedCourseId}/tasks`
                                                                ? "text-indigo-600 dark:text-indigo-300"
                                                                : "hover:bg-white/20 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white text-slate-500 dark:text-slate-400"
                                                        )}
                                                    >
                                                        {((pathname.includes("/tasks") && !pathname.includes("/tasks-summary")) || navigatingTo === `/teacher/courses/${selectedCourseId}/tasks`) && (
                                                            <motion.div
                                                                layoutId="activeSidebarItemCollapsed"
                                                                className="absolute inset-0 bg-white/40 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-xl shadow-sm z-[-1]"
                                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                            />
                                                        )}
                                                        {navigatingTo === `/teacher/courses/${selectedCourseId}/tasks` ? (
                                                            <Loader2 className="h-5 w-5 animate-spin" />
                                                        ) : (
                                                            <ListTodo className={cn("h-5 w-5", ((pathname.includes("/tasks") && !pathname.includes("/tasks-summary")) || navigatingTo === `/teacher/courses/${selectedCourseId}/tasks`) && "text-indigo-600 dark:text-indigo-400")} />
                                                        )}
                                                        <span className="sr-only">Tasks</span>
                                                    </Link>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                    Tasks
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            className={cn(
                                                "w-full flex items-center justify-between rounded-xl transition-all duration-200 relative overflow-hidden text-base group",
                                                (pathname.includes("/tasks") && !pathname.includes("/tasks-summary")) || navigatingTo === `/teacher/courses/${selectedCourseId}/tasks`
                                                    ? "text-indigo-700 dark:text-indigo-300 font-medium bg-white/40 dark:bg-white/10 border border-white/20 dark:border-white/10 shadow-sm backdrop-blur-md"
                                                    : "hover:bg-white/20 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white text-slate-500 dark:text-slate-400"
                                            )}
                                        >


                                            <Link
                                                href={`/teacher/courses/${selectedCourseId}/tasks`}
                                                onClick={(e) => {
                                                    if (pathname !== `/teacher/courses/${selectedCourseId}/tasks`) {
                                                        setNavigatingTo(`/teacher/courses/${selectedCourseId}/tasks`)
                                                    }
                                                }}
                                                className="flex-1 flex items-center gap-3 px-4 py-3"
                                            >
                                                {navigatingTo === `/teacher/courses/${selectedCourseId}/tasks` ? (
                                                    <Loader2 className="animate-spin h-5 w-5" />
                                                ) : (
                                                    <ListTodo className={cn("h-5 w-5", ((pathname.includes("/tasks") && !pathname.includes("/tasks-summary")) || navigatingTo === `/teacher/courses/${selectedCourseId}/tasks`) && "text-blue-600 dark:text-blue-400")} />
                                                )}
                                                <span>Tasks</span>
                                            </Link>

                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    setTasksExpanded(!tasksExpanded)
                                                }}
                                                className="px-4 py-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                            >
                                                <ChevronDown className={cn("h-4 w-4 transition-transform", !tasksExpanded && "-rotate-90")} />
                                            </button>
                                        </div>

                                        {tasksExpanded && (
                                            <div className="pl-9 space-y-1">
                                                {assignments.map(assignment => (
                                                    <Link
                                                        key={assignment.id}
                                                        href={`/teacher/courses/${selectedCourseId}/tasks/${assignment.id}`}
                                                        className={cn(
                                                            "block px-2 py-1.5 text-sm rounded-md hover:bg-slate-200/40 dark:hover:bg-slate-800/40 hover:text-sidebar-accent-foreground transition-colors truncate",
                                                            pathname.includes(`/tasks/${assignment.id}`) ? "text-sidebar-primary font-medium" : "text-muted-foreground"
                                                        )}
                                                    >
                                                        {assignment.title}
                                                    </Link>
                                                ))}
                                                <div className="pt-1">
                                                    <Link
                                                        href={`/teacher/courses/${selectedCourseId}/tasks/new`}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-slate-200/40 dark:hover:bg-slate-800/40 hover:text-sidebar-accent-foreground text-muted-foreground"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Add Task
                                                    </Link>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <SidebarNavItem href={`/teacher/courses/${selectedCourseId}/tasks-summary`} icon={Table} label="Tasks Summary" active={pathname.startsWith(`/teacher/courses/${selectedCourseId}/tasks-summary`)} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                            <SidebarNavItem href={`/teacher/courses/${selectedCourseId}/attendance`} icon={Clock} label="Attendance" active={pathname.startsWith(`/teacher/courses/${selectedCourseId}/attendance`)} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                            <SidebarNavItem href={`/teacher/courses/${selectedCourseId}/gradebook`} icon={GraduationCap} label="Gradebook" active={pathname.startsWith(`/teacher/courses/${selectedCourseId}/gradebook`)} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                            <SidebarNavItem href={`/teacher/courses/${selectedCourseId}/settings`} icon={Settings} label="Settings" active={pathname.startsWith(`/teacher/courses/${selectedCourseId}/settings`)} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                        </div>
                    )}
                </div>
            )}

            {/* Homeroom Teacher Section */}
            {userRoles.includes("HOMEROOM_TEACHER") && isHomeroom && (
                <div className="space-y-1">
                    <SidebarNavItem href="/homeroom" icon={Home} label="My Class" active={pathname === "/homeroom"} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                </div>
            )}

            {/* Student Section */}
            {userRoles.includes("STUDENT") && isStudent && (
                <div className="space-y-4">
                    <div className="space-y-1">
                        <SidebarNavItem href="/student" icon={LayoutDashboard} label="Dashboard" active={pathname === "/student"} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                        <SidebarNavItem href="/student/learning-profile" icon={PieChart} label="Learning Profile" active={pathname === "/student/learning-profile"} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                        <SidebarNavItem href="/student/attendance" icon={Clock} label="Attendance" active={pathname === "/student/attendance"} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                        <SidebarNavItem href="/student/grades" icon={GraduationCap} label="Grades" active={pathname === "/student/grades"} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                        <SidebarNavItem href="/student/schedule" icon={Calendar} label="Schedule" active={pathname === "/student/schedule"} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                    </div>

                    {isCollapsed ? (
                        <div className="px-2 flex justify-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent">
                                        <BookOpen className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="right" className="w-56">
                                    <DropdownMenuLabel>Select Course</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {studentCourses.map(course => (
                                        <DropdownMenuItem
                                            key={course.id}
                                            onClick={() => setSelectedCourseId(course.id)}
                                            className="hover:bg-slate-200/40 dark:hover:bg-slate-800/40 cursor-pointer focus:bg-slate-200/40 dark:focus:bg-slate-800/40 focus:text-sidebar-accent-foreground"
                                        >
                                            {course.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <div className="px-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-full flex items-center justify-between p-2 rounded-xl bg-white/10 dark:bg-slate-900/10 border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-slate-900/20 transition-all duration-200 outline-none group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/10 shrink-0">
                                                {studentCourses.find(c => c.id === selectedCourseId)?.name.charAt(0) || "C"}
                                            </div>
                                            <span className="truncate text-sm font-medium text-sidebar-foreground">
                                                {studentCourses.find(c => c.id === selectedCourseId)?.name || "Select Course"}
                                            </span>
                                        </div>
                                        <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-(--radix-dropdown-menu-trigger-width)"
                                    align="start"
                                >
                                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1.5">Switch Course</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {studentCourses.map(course => (
                                        <DropdownMenuItem
                                            key={course.id}
                                            onClick={() => setSelectedCourseId(course.id)}
                                            className="flex items-center justify-between p-2"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className={cn(
                                                    "h-6 w-6 rounded-md flex items-center justify-center text-xs font-medium border shrink-0",
                                                    selectedCourseId === course.id
                                                        ? "bg-indigo-500 text-white border-indigo-600"
                                                        : "bg-slate-100 dark:bg-slate-800 border-transparent"
                                                )}>
                                                    {course.name.charAt(0)}
                                                </div>
                                                <span className="truncate">{course.name}</span>
                                            </div>
                                            {selectedCourseId === course.id && (
                                                <Check className="h-4 w-4 text-indigo-500" />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    {selectedCourseId && (
                        <div className="space-y-1">
                            {/* Tasks Menu */}
                            <div className="space-y-1">
                                {isCollapsed ? (
                                    <div className="flex justify-center">
                                        <TooltipProvider>
                                            <Tooltip delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <Link
                                                        href={`/student/courses/${selectedCourseId}/tasks`}
                                                        onClick={(e) => {
                                                            if (pathname !== `/student/courses/${selectedCourseId}/tasks`) {
                                                                setNavigatingTo(`/student/courses/${selectedCourseId}/tasks`)
                                                            }
                                                        }}
                                                        className={cn(
                                                            "flex items-center justify-center p-3 rounded-xl transition-all duration-200 relative group cursor-pointer z-10",
                                                            pathname.includes("/tasks") || navigatingTo === `/student/courses/${selectedCourseId}/tasks`
                                                                ? "text-indigo-600 dark:text-indigo-300"
                                                                : "hover:bg-white/20 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white text-slate-500 dark:text-slate-400"
                                                        )}
                                                    >
                                                        {(pathname.includes("/tasks") || navigatingTo === `/student/courses/${selectedCourseId}/tasks`) && (
                                                            <motion.div
                                                                layoutId="activeSidebarItemCollapsed"
                                                                className="absolute inset-0 bg-white/40 dark:bg-white/10 border border-white/20 dark:border-white/10 rounded-xl shadow-sm z-[-1]"
                                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                            />
                                                        )}
                                                        {navigatingTo === `/student/courses/${selectedCourseId}/tasks` ? (
                                                            <Loader2 className="h-5 w-5 animate-spin" />
                                                        ) : (
                                                            <ListTodo className={cn("h-5 w-5", (pathname.includes("/tasks") || navigatingTo === `/student/courses/${selectedCourseId}/tasks`) && "text-indigo-600 dark:text-indigo-400")} />
                                                        )}
                                                        <span className="sr-only">Tasks</span>
                                                    </Link>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                    Tasks
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            className={cn(
                                                "w-full flex items-center justify-between rounded-xl transition-all duration-200 relative overflow-hidden text-base group",
                                                pathname.includes("/tasks") || navigatingTo === `/student/courses/${selectedCourseId}/tasks`
                                                    ? "text-indigo-700 dark:text-indigo-300 font-medium bg-white/40 dark:bg-white/10 border border-white/20 dark:border-white/10 shadow-sm backdrop-blur-md"
                                                    : "hover:bg-white/20 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white text-slate-500 dark:text-slate-400"
                                            )}
                                        >
                                            <Link
                                                href={`/student/courses/${selectedCourseId}/tasks`}
                                                onClick={(e) => {
                                                    if (pathname !== `/student/courses/${selectedCourseId}/tasks`) {
                                                        setNavigatingTo(`/student/courses/${selectedCourseId}/tasks`)
                                                    }
                                                }}
                                                className="flex-1 flex items-center gap-3 px-4 py-3"
                                            >
                                                {navigatingTo === `/student/courses/${selectedCourseId}/tasks` ? (
                                                    <Loader2 className="animate-spin h-5 w-5" />
                                                ) : (
                                                    <ListTodo className={cn("h-5 w-5", (pathname.includes("/tasks") || navigatingTo === `/student/courses/${selectedCourseId}/tasks`) && "text-blue-600 dark:text-blue-400")} />
                                                )}
                                                <span>Tasks</span>
                                            </Link>

                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    setTasksExpanded(!tasksExpanded)
                                                }}
                                                className="px-4 py-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                            >
                                                <ChevronDown className={cn("h-4 w-4 transition-transform", !tasksExpanded && "-rotate-90")} />
                                            </button>
                                        </div>

                                        {tasksExpanded && (
                                            <div className="pl-9 space-y-1">
                                                {assignments.map(assignment => (
                                                    <Link
                                                        key={assignment.id}
                                                        href={`/student/courses/${selectedCourseId}/tasks/${assignment.id}`}
                                                        className={cn(
                                                            "block px-2 py-1.5 text-sm rounded-md hover:bg-slate-200/40 dark:hover:bg-slate-800/40 hover:text-sidebar-accent-foreground transition-colors truncate",
                                                            pathname.includes(`/tasks/${assignment.id}`) ? "text-sidebar-primary font-medium" : "text-muted-foreground"
                                                        )}
                                                    >
                                                        {assignment.title}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <SidebarNavItem href={`/student/courses/${selectedCourseId}/materials`} icon={FileText} label="Study Materials" active={pathname.includes("/materials")} isCollapsed={isCollapsed} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onNavigate={onNavigate} />
                        </div>
                    )}
                </div>
            )}
        </nav>
    )
}

interface DashboardSidebarProps {
    userRoles: Role[]
    teacherCourses?: any[]
    studentCourses?: any[]
    conversations?: any[]
    userId?: string
}

export function DashboardSidebar({ userRoles, teacherCourses, studentCourses, conversations: initialConversations = [], userId }: DashboardSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const pathname = usePathname()
    const isSocials = pathname.startsWith("/socials")

    // Use context for real-time updates
    const { conversations, hasUnreadMessages } = useChatNotification()

    // Fallback to initial props if context is empty (shouldn't happen if provider is working)
    const activeConversations = conversations.length > 0 ? conversations : initialConversations;

    return (
        <aside
            className={cn(
                "group/sidebar bg-white/40 dark:bg-slate-900/50 text-sidebar-foreground flex flex-col transition-all duration-300 relative border border-white/20 dark:border-white/10 shadow-lg rounded-3xl m-4 h-[calc(100%-2rem)] z-20 overflow-hidden backdrop-blur-xl",
                isCollapsed ? "w-20" : "w-80" // Slightly wider collapsed state for better floating look
            )}
        >
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {isSocials && userId ? (
                    <ChatSidebar
                        initialConversations={activeConversations}
                        userId={userId}
                        variant="sidebar"
                        isCollapsed={isCollapsed}
                        headerMode="show"
                    />
                ) : (
                    <div className={cn("p-4", isCollapsed && "p-2")}>
                        <SidebarNav userRoles={userRoles} isCollapsed={isCollapsed} teacherCourses={teacherCourses} studentCourses={studentCourses} hasUnreadMessages={hasUnreadMessages} />
                    </div>
                )}
            </div>

            <div className="p-4 bg-white/10 dark:bg-slate-900/10 backdrop-blur-sm border-t border-white/10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center hover:bg-slate-200/40 dark:hover:bg-slate-800/40 text-muted-foreground hover:text-sidebar-accent-foreground"
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>
        </aside>
    )
}
