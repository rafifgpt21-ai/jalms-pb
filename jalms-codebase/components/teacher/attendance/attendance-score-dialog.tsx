"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateAttendancePoolScore } from "@/lib/actions/attendance.actions"
import { Settings } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface AttendanceScoreDialogProps {
    courseId: string
    currentScore: number
}

export function AttendanceScoreDialog({ courseId, currentScore }: AttendanceScoreDialogProps) {
    const [open, setOpen] = useState(false)
    const [score, setScore] = useState(currentScore.toString())
    const [loading, setLoading] = useState(false)

    const handleSave = async () => {
        const scoreNum = parseInt(score)
        if (isNaN(scoreNum) || scoreNum < 0) {
            toast.error("Please enter a valid positive number")
            return
        }

        setLoading(true)
        try {
            const result = await updateAttendancePoolScore(courseId, scoreNum)
            if (result.success) {
                toast.success("Attendance pool score updated")
                setOpen(false)
            } else {
                toast.error(result.error || "Failed to update score")
            }
        } catch (error) {
            console.error(error)
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-11 w-full gap-2 sm:h-7 sm:w-auto">
                    <Settings className="h-4 w-4" />
                    Edit Attendance Score
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Attendance Score</DialogTitle>
                    <DialogDescription>
                        Set the total score added to the final grade when a student has 100% attendance.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="score" className="text-right">
                            Score
                        </Label>
                        <Input
                            id="score"
                            type="number"
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
