"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { RefreshCcw } from "lucide-react"
import { restoreQuiz } from "@/lib/actions/quiz.actions"
import { toast } from "sonner"
import { useTransition } from "react"
import { useRouter } from "next/navigation"

export function RestoreQuizButton({ quizId }: { quizId: string }) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleRestore = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        startTransition(async () => {
            const result = await restoreQuiz(quizId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Quiz restored")
                router.refresh();
            }
        })
    }

    return (
        <DropdownMenuItem onClick={handleRestore} disabled={isPending}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Restore
        </DropdownMenuItem>
    )
}
