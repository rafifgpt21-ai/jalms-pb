"use client"

import { forwardRef, useMemo, useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import {
    Check,
    ChevronDown,
    FileQuestion,
    FolderOpen,
    Library,
    Search,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface QuizPickerFolder {
    id: string
    name: string
    color: string
    _count?: { quizzes: number }
}

export interface QuizPickerItem {
    id: string
    title: string
    description?: string | null
    updatedAt: Date | string
    folderId?: string | null
    folder?: { id: string; name: string; color: string } | null
    _count: {
        questions: number
        assignments: number
    }
}

interface QuizLibraryPickerProps extends Omit<React.ComponentProps<typeof Button>, "value" | "onChange"> {
    quizzes: QuizPickerItem[]
    folders: QuizPickerFolder[]
    value?: string
    onValueChange: (value: string) => void
}

const folderColor: Record<string, string> = {
    indigo: "bg-indigo-500",
    sky: "bg-sky-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    violet: "bg-violet-500",
}

export const QuizLibraryPicker = forwardRef<HTMLButtonElement, QuizLibraryPickerProps>(
    function QuizLibraryPicker({ quizzes, folders, value, onValueChange, className, ...triggerProps }, ref) {
        const [open, setOpen] = useState(false)
        const [query, setQuery] = useState("")
        const [selectedFolder, setSelectedFolder] = useState("all")
        const selectedQuiz = quizzes.find((quiz) => quiz.id === value)
        const unfiledCount = quizzes.filter((quiz) => !quiz.folderId).length

        const visibleQuizzes = useMemo(() => {
            const normalizedQuery = query.trim().toLowerCase()

            return quizzes.filter((quiz) => {
                if (selectedFolder === "unfiled" && quiz.folderId) return false
                if (selectedFolder !== "all" && selectedFolder !== "unfiled" && quiz.folderId !== selectedFolder) return false
                if (!normalizedQuery) return true

                return [quiz.title, quiz.description, quiz.folder?.name]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(normalizedQuery)
            })
        }, [query, quizzes, selectedFolder])

        function chooseQuiz(quizId: string) {
            onValueChange(quizId)
            handleOpenChange(false)
        }

        function handleOpenChange(nextOpen: boolean) {
            setOpen(nextOpen)
            if (!nextOpen) {
                setQuery("")
                setSelectedFolder("all")
            }
        }

        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button
                        ref={ref}
                        type="button"
                        variant="outline"
                        className={cn(
                            "h-auto min-h-9 w-full justify-between gap-3 px-3 py-2 text-left font-normal",
                            !selectedQuiz && "text-muted-foreground",
                            className,
                        )}
                        {...triggerProps}
                    >
                        <span className="flex min-w-0 items-center gap-2.5">
                            <FileQuestion className="size-4 shrink-0 text-primary" />
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-foreground">
                                    {selectedQuiz?.title || "Choose from quiz library"}
                                </span>
                                <span className="block truncate text-[11px] text-muted-foreground">
                                    {selectedQuiz
                                        ? `${selectedQuiz.folder?.name || "Unfiled"} · ${selectedQuiz._count.questions} questions`
                                        : `${quizzes.length} quizzes · ${folders.length} folders`}
                                </span>
                            </span>
                        </span>
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    </Button>
                </DialogTrigger>

                <DialogContent className="flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
                    <DialogHeader className="border-b p-4 pr-12">
                        <DialogTitle>Choose a quiz</DialogTitle>
                        <DialogDescription>Search the full library or browse by folder.</DialogDescription>
                    </DialogHeader>

                    <div className="border-b p-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                autoFocus
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search quiz titles, descriptions, or folders…"
                                aria-label="Search quiz library"
                                className="h-10 pl-9"
                            />
                        </div>

                        <select
                            value={selectedFolder}
                            onChange={(event) => setSelectedFolder(event.target.value)}
                            aria-label="Browse quiz folder"
                            className="mt-2 h-11 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 md:hidden"
                        >
                            <option value="all">All quizzes ({quizzes.length})</option>
                            <option value="unfiled">Unfiled ({unfiledCount})</option>
                            {folders.map((folder) => (
                                <option key={folder.id} value={folder.id}>{folder.name} ({folder._count?.quizzes || 0})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex min-h-0 flex-1 md:h-[26rem]">
                        <aside className="hidden w-48 shrink-0 border-r md:block">
                            <ScrollArea className="h-full">
                                <nav className="space-y-1 p-2" aria-label="Quiz folders">
                                    <FolderFilter
                                        active={selectedFolder === "all"}
                                        icon={Library}
                                        label="All quizzes"
                                        count={quizzes.length}
                                        onClick={() => setSelectedFolder("all")}
                                    />
                                    <FolderFilter
                                        active={selectedFolder === "unfiled"}
                                        icon={FolderOpen}
                                        label="Unfiled"
                                        count={unfiledCount}
                                        onClick={() => setSelectedFolder("unfiled")}
                                    />
                                    <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Folders</div>
                                    {folders.map((folder) => (
                                        <button
                                            key={folder.id}
                                            type="button"
                                            onClick={() => setSelectedFolder(folder.id)}
                                            className={cn(
                                                "flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs transition-colors",
                                                selectedFolder === folder.id
                                                    ? "bg-primary/10 font-medium text-primary"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                            )}
                                        >
                                            <span className={cn("size-2.5 shrink-0 rounded-full", folderColor[folder.color] || folderColor.indigo)} />
                                            <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                                            <span className="tabular-nums opacity-70">{folder._count?.quizzes || 0}</span>
                                        </button>
                                    ))}
                                    {folders.length === 0 && (
                                        <p className="px-2 py-3 text-xs text-muted-foreground">No folders yet.</p>
                                    )}
                                </nav>
                            </ScrollArea>
                        </aside>

                        <ScrollArea className="h-[min(26rem,55dvh)] min-w-0 flex-1 md:h-full">
                            <div className="divide-y">
                                {visibleQuizzes.map((quiz) => {
                                    const selected = quiz.id === value

                                    return (
                                        <button
                                            key={quiz.id}
                                            type="button"
                                            onClick={() => chooseQuiz(quiz.id)}
                                            className={cn(
                                                "flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4",
                                                selected && "bg-primary/5",
                                            )}
                                        >
                                            <div className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted/30 text-primary">
                                                <FileQuestion className="size-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate text-sm font-medium">{quiz.title}</span>
                                                    {selected && <Check className="size-4 shrink-0 text-primary" />}
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <Badge variant="outline" className="max-w-40 truncate px-1.5 py-0 text-[10px]">
                                                        {quiz.folder && <span className={cn("size-2 rounded-full", folderColor[quiz.folder.color] || folderColor.indigo)} />}
                                                        {quiz.folder?.name || "Unfiled"}
                                                    </Badge>
                                                    <span>{quiz._count.questions} questions</span>
                                                    <span>·</span>
                                                    <span>Used {quiz._count.assignments} times</span>
                                                    <span className="hidden sm:inline">· Updated {format(new Date(quiz.updatedAt), "MMM d, yyyy")}</span>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {visibleQuizzes.length === 0 && (
                                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                                    <div className="mb-3 grid size-10 place-items-center rounded-md border bg-muted/30 text-muted-foreground">
                                        <Search className="size-4" />
                                    </div>
                                    <p className="text-sm font-medium">No matching quizzes</p>
                                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                                        {query ? "Try another title, description, or folder name." : "This folder does not contain any quizzes yet."}
                                    </p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    <DialogFooter className="flex-row items-center justify-between border-t p-3 sm:justify-between">
                        <span className="text-xs text-muted-foreground">
                            {query.trim() || selectedFolder !== "all" ? `${visibleQuizzes.length} matches` : `${quizzes.length} quizzes`}
                        </span>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/teacher/quiz-manager">Manage quiz library</Link>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    },
)

function FolderFilter({
    active,
    icon: Icon,
    label,
    count,
    onClick,
}: {
    active: boolean
    icon: React.ElementType
    label: string
    count: number
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs transition-colors",
                active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
        >
            <Icon className="size-3.5" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="tabular-nums opacity-70">{count}</span>
        </button>
    )
}
