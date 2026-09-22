"use client"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { FolderInput, Loader2, MoreHorizontal } from "lucide-react"
import { DeleteQuizButton } from "./delete-quiz-button"
import { UpdateQuizDialog } from "./update-quiz-dialog"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { moveQuizToFolder } from "@/lib/actions/quiz.actions"
import type { QuizFolderItem } from "./quiz-library"

interface QuizActionsProps {
    quiz: {
        id: string
        title: string
        description?: string | null
        deletedAt?: Date | null
        randomizeChoices?: boolean
        folderId?: string | null
    }
    folders?: QuizFolderItem[]
}

export function QuizActions({ quiz, folders = [] }: QuizActionsProps) {
    const [open, setOpen] = useState(false)
    const [isMoving, startMoving] = useTransition()
    const router = useRouter()

    function moveTo(folderId: string | null) {
        startMoving(async () => {
            const result = await moveQuizToFolder(quiz.id, folderId)
            if (!result.success) {
                toast.error(result.error || "Failed to move quiz")
                return
            }
            toast.success(folderId ? "Quiz moved" : "Quiz moved to Unfiled")
            setOpen(false)
            router.refresh()
        })
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="-mr-1 -mt-1 shrink-0" aria-label={`Actions for ${quiz.title}`} disabled={isMoving}>
                    {isMoving ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                    <UpdateQuizDialog quiz={quiz} />
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger><FolderInput className="size-4" />Move to folder</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-44">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Choose a folder</DropdownMenuLabel>
                        <DropdownMenuItem disabled={!quiz.folderId} onClick={() => moveTo(null)}>Unfiled</DropdownMenuItem>
                        {folders.map((folder) => <DropdownMenuItem key={folder.id} disabled={quiz.folderId === folder.id} onClick={() => moveTo(folder.id)}>{folder.name}</DropdownMenuItem>)}
                        {folders.length === 0 && <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DeleteQuizButton quizId={quiz.id} />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
