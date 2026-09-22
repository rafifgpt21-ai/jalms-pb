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
import { updateQuiz } from "@/lib/actions/quiz.actions"
import { toast } from "sonner"
import { Loader2, Edit2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface UpdateQuizDialogProps {
    quiz: {
        id: string
        title: string
        description?: string | null
        randomizeChoices?: boolean
    }
    trigger?: "menu" | "button"
}

export function UpdateQuizDialog({ quiz, trigger = "menu" }: UpdateQuizDialogProps) {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState(quiz.title)
    const [description, setDescription] = useState(quiz.description || "")
    const [randomizeChoices, setRandomizeChoices] = useState(Boolean(quiz.randomizeChoices))
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        startTransition(async () => {
            const result = await updateQuiz(quiz.id, { title, description, randomizeChoices })
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Quiz updated successfully")
                setOpen(false)
                router.refresh()
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger === "button" ? (
                    <Button variant="outline" size="sm"><Edit2 className="size-4" />Quiz settings</Button>
                ) : (
                    <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50">
                        <Edit2 className="mr-2 h-4 w-4" />Edit details
                    </div>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Quiz Details</DialogTitle>
                        <DialogDescription>
                            Update the title and description of your quiz.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-title" className="text-right">
                                Title
                            </Label>
                            <Input
                                id="edit-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="col-span-3"
                                placeholder="Quiz Title"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="edit-randomize" className="pt-2 text-right">Choice order</Label>
                            <div className="col-span-3 flex items-start gap-3 rounded-md border bg-muted/20 p-3">
                                <Switch id="edit-randomize" checked={randomizeChoices} onCheckedChange={setRandomizeChoices} />
                                <div>
                                    <Label htmlFor="edit-randomize">Shuffle choices for students</Label>
                                    <p className="mt-1 text-xs text-muted-foreground">Each attempt can show choices in a different order.</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-description" className="text-right">
                                Description
                            </Label>
                            <Textarea
                                id="edit-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="col-span-3"
                                placeholder="Optional description..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending || !title.trim()}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
