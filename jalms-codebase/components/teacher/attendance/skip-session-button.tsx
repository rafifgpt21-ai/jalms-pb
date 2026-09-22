"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { skipSession, unskipSession } from "@/lib/actions/attendance.actions"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface SkipSessionButtonProps {
    courseId: string
    courseName: string
    date: Date
    period: number
    isSkipped: boolean
    hasAttendance?: boolean
}

export function SkipSessionButton({ courseId, courseName, date, period, isSkipped, hasAttendance = false }: SkipSessionButtonProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const confirmToggle = async () => {
        setLoading(true)
        const result = isSkipped
            ? await unskipSession(courseId, new Date(date), period)
            : await skipSession(courseId, new Date(date), period)

        if (result.success) {
            toast.success(isSkipped ? "Session restored" : "Session skipped")
            setOpen(false)
            router.refresh()
        } else {
            toast.error(result.error || (isSkipped ? "Failed to restore session" : "Failed to skip session"))
        }
        setLoading(false)
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className={isSkipped ? undefined : "text-destructive hover:text-destructive"}
                disabled={loading}
                onClick={() => setOpen(true)}
            >
                {loading ? <Loader2 className="size-4 animate-spin" /> : isSkipped ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
                {isSkipped ? "Restore" : "Skip"}
            </Button>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{isSkipped ? "Restore this session?" : "Skip this session?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {isSkipped
                            ? `${courseName} will return to pending and can be recorded normally.`
                            : hasAttendance
                                ? `${courseName} already has attendance. Skipping will replace those records with a skipped session.`
                                : `${courseName} will be marked as skipped for every student in this period.`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={confirmToggle}
                        disabled={loading}
                        className={isSkipped ? undefined : buttonVariants({ variant: "destructive" })}
                    >
                        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                        {isSkipped ? "Restore session" : "Skip session"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
