"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Download, FileText, Loader2, Link as LinkIcon, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/ui/status-badge"
import { updateSubmissionScore } from "@/lib/actions/teacher.actions"
import { cn } from "@/lib/utils"

interface SubmissionGradeDialogProps {
    student: { id: string; name: string }
    submission: {
        submittedAt: Date | string
        submissionUrl?: string | null
        attachmentUrl?: string | null
        link?: string | null
    }
    assignment: {
        id: string
        dueDate: Date | string
        maxPoints: number
        isExtraCredit: boolean
        latePenalty: number
    }
    currentScore?: number
    onScoreUpdate: (studentId: string, score: number) => void
    trigger?: React.ReactNode | null
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function SubmissionGradeDialog({
    student,
    submission,
    assignment,
    currentScore,
    onScoreUpdate,
    trigger,
    open: controlledOpen,
    onOpenChange,
}: SubmissionGradeDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [score, setScore] = useState<string>(currentScore?.toString() || "")
    const [isSaving, setIsSaving] = useState(false)
    const open = controlledOpen ?? internalOpen

    const setOpen = (nextOpen: boolean) => {
        if (controlledOpen === undefined) setInternalOpen(nextOpen)
        onOpenChange?.(nextOpen)
    }

    const submittedAt = submission?.submittedAt ? new Date(submission.submittedAt) : null
    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null
    const isLate = submittedAt && dueDate && submittedAt > dueDate

    const handleSaveScore = async () => {
        const numScore = parseFloat(score)
        if (isNaN(numScore) || numScore < 0 || numScore > 100) {
            toast.error("Please enter a valid score between 0 and 100")
            return
        }

        setIsSaving(true)
        try {
            const res = await updateSubmissionScore(assignment.id, student.id, numScore)
            if (res.submission) {
                toast.success("Score updated successfully")
                onScoreUpdate(student.id, numScore)
                setOpen(false)
            } else {
                toast.error(res.error || "Failed to update score")
            }
        } catch {
            toast.error("An error occurred while saving")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger !== null && (
                <DialogTrigger asChild>
                    {trigger || <Button variant="ghost" size="sm">View</Button>}
                </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between mr-8">
                        <DialogTitle className="text-xl">{student.name}&apos;s Submission</DialogTitle>
                        {isLate && <StatusBadge status="LATE" label="Late" />}
                    </div>
                    <DialogDescription>
                        Submitted on {submittedAt ? format(submittedAt, "PPP p") : "Unknown date"}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-6">
                    {/* Submission Content */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Content</Label>
                        <div className="border rounded-md p-4 bg-muted/30 min-h-[100px]">
                            {submission?.submissionUrl ? (
                                <div
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: submission.submissionUrl }}
                                />
                            ) : (
                                <p className="text-muted-foreground italic">No text content submitted.</p>
                            )}
                        </div>
                    </div>

                    {/* Attachment */}
                    {submission?.attachmentUrl && (
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Attachment</Label>
                            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-medium truncate">Attached File</span>
                                        <span className="text-xs text-muted-foreground">Click download to view</span>
                                    </div>
                                </div>
                                <Button asChild variant="outline" size="sm">
                                    <a href={submission.attachmentUrl} target="_blank" rel="noopener noreferrer" download>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                    </a>
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Link */}
                    {submission?.link && (
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Link</Label>
                            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="h-10 w-10 rounded bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <LinkIcon className="h-6 w-6" />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-medium truncate">Submitted Link</span>
                                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">{submission.link}</span>
                                    </div>
                                </div>
                                <Button asChild variant="outline" size="sm">
                                    <a href={submission.link} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Open Link
                                    </a>
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Grading Section */}
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Grade</Label>
                            <div className="text-sm text-muted-foreground">
                                Max Points: {assignment.maxPoints}
                            </div>
                        </div>

                        <div className="flex items-end gap-4">
                            <div className="space-y-1.5 flex-1">
                                <Label htmlFor="score">Score (0-100)</Label>
                                <Input
                                    id="score"
                                    type="number"
                                    value={score}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        if (value === "") {
                                            setScore("")
                                            return
                                        }
                                        const num = parseFloat(value)
                                        if (!isNaN(num) && num >= 0 && num <= 100) {
                                            setScore(value)
                                        }
                                    }}
                                    placeholder="Enter score..."
                                    className={cn(
                                        "text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                        assignment.isExtraCredit ? "border-green-500 focus-visible:ring-green-500" : ""
                                    )}
                                />
                            </div>
                            <div className="pb-1">
                                <div className="text-sm text-muted-foreground mb-1">
                                    Final Points: {score ? Math.round((parseFloat(score) / 100) * assignment.maxPoints) : 0}
                                </div>
                            </div>
                        </div>

                        {isLate && assignment.latePenalty > 0 && (
                            <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100">
                                Note: A {assignment.latePenalty}% late penalty will be applied to the final calculation.
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveScore} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Grade
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
