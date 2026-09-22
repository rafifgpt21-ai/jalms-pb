"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface DashboardContentProps {
    children: React.ReactNode
}

export function DashboardContent({ children }: DashboardContentProps) {
    const pathname = usePathname()
    // Check if we are in the socials (chat) section
    const isSocials = pathname.startsWith("/socials")
    // Check if we are in the schedule section (needs full height for sticky headers)
    const isSchedule = pathname.startsWith("/admin/schedule")

    return (
        <main className={cn(
            "flex-1 flex flex-col relative",
            isSocials
                ? "h-full overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 p-0 md:pt-20"
                : isSchedule
                    ? "h-full overflow-hidden px-4 pt-4 pb-20 md:px-6 md:pt-20 md:pb-8 lg:px-8"
                    : "px-4 pt-4 pb-20 md:px-6 md:pt-20 md:pb-8 lg:px-8 overflow-y-auto"
        )}>
            {children}
        </main>
    )
}
