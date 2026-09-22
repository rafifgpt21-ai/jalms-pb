"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { createQuiz } from "@/lib/actions/quiz.actions"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { Switch } from "@/components/ui/switch"

export function CreateQuizDialog() {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [randomizeChoices, setRandomizeChoices] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        startTransition(async () => {
            const result = await createQuiz(title, description, randomizeChoices)
            if (result.error) {
                toast.error(result.error)
            } else if (result.quiz) {
                toast.success("Quiz created successfully")
                setOpen(false)
                setTitle("")
                setDescription("")
                router.push(`/teacher/quiz-manager/${result.quiz.id}`)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="order-2 size-9 px-0 sm:order-none sm:col-span-2 sm:h-10 sm:w-full sm:px-4 2xl:w-auto" title="Create quiz">
                    <Plus className="size-4" />
                    <span className="sr-only sm:not-sr-only">Create quiz</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create a quiz</DialogTitle>
                        <DialogDescription>
                            Give your quiz a title and optional description to get started.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Chapter 1 Review"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What does this quiz cover?"
                            />
                        </div>
                        <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-3">
                                <Switch id="randomize" checked={randomizeChoices} onCheckedChange={setRandomizeChoices} />
                                <div>
                                    <Label htmlFor="randomize">Shuffle choices for students</Label>
                                    <p className="mt-1 text-xs text-muted-foreground">Each attempt can show choices in a different order.</p>
                                </div>
                            </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending || !title.trim()}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create and add questions
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    )
}
