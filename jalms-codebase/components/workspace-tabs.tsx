"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Role } from "@prisma/client"
import { UserSettings } from "@/components/user-settings"
import { useState, useEffect } from "react"
import { useChatNotification } from "@/components/chat/chat-notification-provider"
import { motion } from "framer-motion"

interface WorkspaceTabsProps {
    roles: Role[]
    userName?: string | null
    userNickname?: string | null
    userEmail?: string | null
    userImage?: string | null
    hasUnreadMessages?: boolean
}

export function WorkspaceTabs({ roles, userName, userNickname, userEmail, userImage, hasUnreadMessages: initialHasUnread = false }: WorkspaceTabsProps) {
    const pathname = usePathname()
    const [optimisticPath, setOptimisticPath] = useState<string | null>(null)

    // Use context
    const { hasUnreadMessages: contextHasUnread } = useChatNotification()
    const hasUnreadMessages = contextHasUnread || initialHasUnread

    // Reset optimistic path when actual navigation occurs
    useEffect(() => {
        setOptimisticPath(null)
    }, [pathname])

    const tabs = [
        {
            label: "Admin",
            href: "/admin",
            role: Role.ADMIN,
            isActive: pathname.startsWith("/admin"),
        },
        {
            label: "Teaching",
            href: "/teacher",
            role: Role.SUBJECT_TEACHER,
            isActive: pathname.startsWith("/teacher"),
        },
        {
            label: "Homeroom",
            href: "/homeroom",
            role: Role.HOMEROOM_TEACHER,
            isActive: pathname.startsWith("/homeroom"),
        },
        {
            label: "Student",
            href: "/student",
            role: Role.STUDENT,
            isActive: pathname.startsWith("/student"),
        },
        {
            label: "Family",
            href: "/parent",
            role: Role.PARENT,
            isActive: pathname.startsWith("/parent"),
        },
        {
            label: "Socials",
            href: "/socials",
            role: Role.STUDENT, // Placeholder, accessible to all
            isActive: pathname.startsWith("/socials"),
            isPublic: true,
            hasBadge: hasUnreadMessages,
        },
    ]

    // Filter tabs based on user roles
    const visibleTabs = tabs.filter((tab) => (tab as any).isPublic || roles.includes(tab.role))

    return (

        <div className="relative px-6 py-4 flex items-center justify-center z-10 top-0 gap-4 pointer-events-none">
            <div
                className="flex items-center gap-2 bg-white/40   0 dark:bg-slate-900/60 border border-white/20 dark:border-white/10 rounded-full py-2 pl-4 pr-2 shadow-sm pointer-events-auto ring-1 ring-black/5 drop-shadow-black backdrop-blur-sm"
            >
                {/* Branding */}
                <div className="flex items-center gap-2 pr-4 border-r border-black/5 dark:border-white/10 mr-2">
                    <div className="flex items-center justify-center">
                        <img src="/arsync.svg" alt="Logo" className="h-8 w-auto" />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-center">
                    {visibleTabs.length > 0 && (
                        <div className="flex items-center gap-1">
                            {visibleTabs.map((tab) => {
                                const isOptimisticActive = optimisticPath ? optimisticPath.startsWith(tab.href) : tab.isActive
                                const hasBadge = (tab as any).hasBadge

                                return (
                                    <Link
                                        key={tab.href}
                                        href={tab.href}
                                        onMouseDown={() => setOptimisticPath(tab.href)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 relative z-10",
                                            isOptimisticActive
                                                ? "text-gray-900 dark:text-white"
                                                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/5"
                                        )}
                                    >
                                        {isOptimisticActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-sm ring-1 ring-black/5 z-[-1]"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <span className="relative z-10">{tab.label}</span>
                                        {hasBadge && (
                                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Separator */}
                <div className="h-6 w-px bg-black/5 dark:bg-white/10 mx-2 hidden lg:block" />

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-1">
                    <div className="text-sm font-medium text-right hidden lg:block leading-tight">
                        <div className="text-foreground">{userNickname || userName?.split(' ')[0]}</div>
                    </div>
                    <UserSettings email={userEmail} name={userName} nickname={userNickname} image={userImage} />
                </div>
            </div>
        </div>
    )
}
