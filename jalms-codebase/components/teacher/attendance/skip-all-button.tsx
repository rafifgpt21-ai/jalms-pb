"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { skipAllSessions } from "@/lib/actions/attendance.actions"
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

interface SkipAllButtonProps {
    teacherId: string
    date: Date
    pendingCount: number
}

export function SkipAllButton({ teacherId, date, pendingCount }: SkipAllButtonProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const confirmSkip = async () => {
        setLoading(true)
        const result = await skipAllSessions(teacherId, new Date(date))

        if (result.success) {
            toast.success(result.message || "Pending sessions skipped")
            setOpen(false)
            router.refresh()
        } else {
            toast.error(result.message || result.error || "Failed to skip pending sessions")
        }
        setLoading(false)
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={loading || pendingCount === 0}
                onClick={() => setOpen(true)}
            >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
                Skip pending ({pendingCount})
            </Button>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Skip all pending sessions?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This marks {pendingCount} {pendingCount === 1 ? "session" : "sessions"} as skipped. Sessions with recorded attendance will not be changed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmSkip} disabled={loading} className={buttonVariants({ variant: "destructive" })}>
                        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                        Skip pending sessions
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
