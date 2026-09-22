"use client"

import { useTransition } from "react"
import { addDays, format, isToday, parseISO, subDays } from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function DateNavigator() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const dateParam = searchParams.get("date")
    const date = dateParam ? parseISO(dateParam) : new Date()

    const navigate = (nextDate: Date) => {
        startTransition(() => {
            router.push(`/teacher/attendance?date=${format(nextDate, "yyyy-MM-dd")}`)
        })
    }

    return (
        <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto">
            <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous day"
                disabled={isPending}
                onClick={() => navigate(subDays(date, 1))}
            >
                <ChevronLeft className="size-4" />
            </Button>

            <div className="relative min-w-0 flex-1 sm:w-44 sm:flex-none">
                <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="date"
                    aria-label="Attendance date"
                    value={format(date, "yyyy-MM-dd")}
                    disabled={isPending}
                    onChange={(event) => event.target.value && navigate(parseISO(event.target.value))}
                    className="w-full pl-8"
                />
            </div>

            <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next day"
                disabled={isPending}
                onClick={() => navigate(addDays(date, 1))}
            >
                <ChevronRight className="size-4" />
            </Button>

            <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isPending || isToday(date)}
                onClick={() => navigate(new Date())}
            >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Today
            </Button>
        </div>
    )
}
