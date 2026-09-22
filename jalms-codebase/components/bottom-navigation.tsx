"use client"

import { useState } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Role } from "@prisma/client"
import {
    LayoutDashboard,
    BookOpen,
    Home,
    GraduationCap,
    Users,
    MessageSquare,
    Menu,
    X,
    ChevronUp
} from "lucide-react"

import { useChatNotification } from "@/components/chat/chat-notification-provider"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SidebarNav } from "@/components/dashboard-sidebar"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { UserSettings } from "@/components/user-settings"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


interface BottomNavigationProps {
    roles: Role[]
    hasUnreadMessages?: boolean
    teacherCourses?: any[]
    studentCourses?: any[]
    userEmail?: string | null
    userName?: string | null
    userNickname?: string | null
    userImage?: string | null
    conversations?: any[]
    userId?: string
}

export function BottomNavigation({
    roles,
    hasUnreadMessages: initialHasUnread = false,
    teacherCourses,
    studentCourses,
    userEmail,
    userName,
    userNickname,
    userImage,
    conversations: initialConversations = [],
    userId
}: BottomNavigationProps) {
    const pathname = usePathname()
    const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
    const [open, setOpen] = useState(false)
    const isSocials = pathname.startsWith("/socials")

    // Reset navigating state when pathname changes
    if (navigatingTo === pathname) {
        setNavigatingTo(null)
    }

    // Use context
    const { conversations, hasUnreadMessages: contextHasUnread } = useChatNotification()
    const hasUnreadMessages = contextHasUnread || initialHasUnread
    const activeConversations = conversations.length > 0 ? conversations : initialConversations


    const tabs = [
        {
            label: "Admin",
            href: "/admin",
            role: Role.ADMIN,
            icon: LayoutDashboard,
            isActive: (navigatingTo === "/admin" || (pathname.startsWith("/admin") && navigatingTo === null)),
        },
        {
            label: "Teaching",
            href: "/teacher",
            role: Role.SUBJECT_TEACHER,
            icon: BookOpen,
            isActive: (navigatingTo === "/teacher" || (pathname.startsWith("/teacher") && navigatingTo === null)),
        },
        {
            label: "Homeroom",
            href: "/homeroom",
            role: Role.HOMEROOM_TEACHER,
            icon: Home,
            isActive: (navigatingTo === "/homeroom" || (pathname.startsWith("/homeroom") && navigatingTo === null)),
        },
        {
            label: "Student",
            href: "/student",
            role: Role.STUDENT,
            icon: GraduationCap,
            isActive: (navigatingTo === "/student" || (pathname.startsWith("/student") && navigatingTo === null)),
        },
        {
            label: "Family",
            href: "/parent",
            role: Role.PARENT,
            icon: Users,
            isActive: (navigatingTo === "/parent" || (pathname.startsWith("/parent") && navigatingTo === null)),
        },
        {
            label: "Socials",
            href: "/socials",
            role: Role.STUDENT, // Placeholder, accessible to all
            icon: MessageSquare,
            isActive: (navigatingTo === "/socials" || (pathname.startsWith("/socials") && navigatingTo === null)),
            isPublic: true,
            hasBadge: hasUnreadMessages,
        },
    ]

    // Filter tabs based on user roles
    const visibleTabs = tabs.filter((tab) => (tab as any).isPublic || roles.includes(tab.role))

    if (visibleTabs.length === 0) return null

    // Determine current active tab for the dropdown label
    const activeTab = visibleTabs.find(tab => tab.isActive) || visibleTabs[0]
    const ActiveIcon = activeTab?.icon || Home

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 z-100 pb-safe shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
            <div className="flex items-center h-16">
                {/* Left Button: Sidebar Menu (50% width) */}
                <div className="flex-1 border-r border-gray-200 dark:border-slate-800 h-full">
                    <Sheet open={open} onOpenChange={setOpen} modal={false}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full h-full rounded-none flex items-center justify-center gap-2 transition-all duration-200 active:bg-slate-200 dark:active:bg-slate-800",
                                    open
                                        ? "bg-primary/20 text-primary dark:bg-primary/20 dark:text-primary"
                                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                )
                                }
                                suppressHydrationWarning
                            >
                                <div className={cn(
                                    "transition-transform duration-300 ease-in-out transform",
                                    open ? "rotate-90 scale-110" : "rotate-0 scale-100"
                                )}>
                                    {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                                </div>
                                <span className="font-medium">Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[85vw] sm:w-80 bg-sidebar text-sidebar-foreground border-r border-sidebar-border/20 p-0 flex flex-col h-full inset-y-0 left-0 shadow-2xl">
                            {/* User Profile Header */}
                            <div className="p-4 border-b border-sidebar-border bg-sidebar-accent/10">
                                <SheetTitle className="sr-only">User Menu</SheetTitle>
                                <SheetDescription className="sr-only">User navigation and settings</SheetDescription>
                                <UserSettings
                                    email={userEmail}
                                    name={userName}
                                    nickname={userNickname}
                                    image={userImage}
                                    triggerVariant="card"
                                    side="bottom"
                                    align="start"
                                />
                            </div>

                            {/* Sidebar Content */}
                            <div className="flex-1 overflow-y-auto min-h-0">
                                {isSocials && userId ? (
                                    <ChatSidebar
                                        initialConversations={activeConversations}
                                        userId={userId!}
                                        variant="sidebar"
                                        disableMobileHeader={true}
                                        headerMode="show"
                                    />
                                ) : (
                                    <div className="px-4 py-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block px-2">
                                            Menu
                                        </label>
                                        <SidebarNav
                                            userRoles={roles}
                                            onNavigate={() => setOpen(false)}
                                            teacherCourses={teacherCourses}
                                            studentCourses={studentCourses}
                                            isMobile={true}
                                            hasUnreadMessages={hasUnreadMessages}
                                        />
                                    </div>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Right Button: Workspace Selector (50% width) */}
                <div className="flex-1 h-full">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="w-full h-full rounded-none flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-800 text-slate-600 dark:text-slate-400"
                            >
                                <ActiveIcon className="h-5 w-5" />
                                <span className="font-medium truncate max-w-[120px]">{activeTab?.label || "Workspace"}</span>
                                <ChevronUp className="h-4 w-4 ml-1 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="top" className="w-64 mb-2">
                            {visibleTabs.map((tab) => {
                                const Icon = tab.icon
                                const hasBadge = (tab as any).hasBadge
                                return (
                                    <DropdownMenuItem key={tab.href} asChild>
                                        <Link
                                            href={tab.href}
                                            onClick={() => {
                                                if (pathname !== tab.href) {
                                                    setNavigatingTo(tab.href)
                                                }
                                            }}
                                            className={cn(
                                                "flex items-center gap-3 w-full cursor-pointer py-3 px-3",
                                                tab.isActive ? "bg-slate-100 dark:bg-slate-800 font-medium" : ""
                                            )}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="text-base">{tab.label}</span>
                                            {hasBadge && (
                                                <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                                            )}
                                        </Link>
                                    </DropdownMenuItem>
                                )
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}
