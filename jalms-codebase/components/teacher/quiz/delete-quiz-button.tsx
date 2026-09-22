"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Trash2, Loader2 } from "lucide-react"
import { deleteQuiz } from "@/lib/actions/quiz.actions"
import { toast } from "sonner"
import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
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

export function DeleteQuizButton({ quizId }: { quizId: string }) {
    const [isPending, startTransition] = useTransition()
    const [open, setOpen] = useState(false)
    const router = useRouter()

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent default action (closing dialog if inside form, etc)
        startTransition(async () => {
            const result = await deleteQuiz(quizId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Quiz deleted")
                setOpen(false)
                router.refresh();
            }
        })
    }

    return (
        <>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the quiz and all its questions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <DropdownMenuItem
                onSelect={(e) => {
                    e.preventDefault()
                    setOpen(true)
                }}
                className="text-destructive focus:text-destructive"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </DropdownMenuItem>
        </>
    )
}
