"use client"

import { useMemo, useState, useTransition } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ArrowDownAZ,
    BookOpen,
    CalendarDays,
    FileQuestion,
    FolderOpen,
    FolderPlus,
    ListChecks,
    MoreHorizontal,
    Pencil,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from "lucide-react"
import { toast } from "sonner"

import { CreateQuizDialog } from "./create-quiz-dialog"
import { QuizActions } from "./quiz-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createQuizFolder, deleteQuizFolder, renameQuizFolder } from "@/lib/actions/quiz.actions"
import { cn } from "@/lib/utils"

export interface QuizFolderItem {
    id: string
    name: string
    color: string
    _count?: { quizzes: number }
}

export interface QuizLibraryItem {
    id: string
    title: string
    description?: string | null
    randomizeChoices: boolean
    updatedAt: Date | string
    folderId?: string | null
    folder?: { id: string; name: string; color: string } | null
    _count: {
        questions: number
        assignments: number
    }
}

interface QuizLibraryProps {
    quizzes: QuizLibraryItem[]
    folders: QuizFolderItem[]
}

const folderColor: Record<string, string> = {
    indigo: "bg-indigo-500",
    sky: "bg-sky-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    violet: "bg-violet-500",
}

const colorOptions = ["indigo", "sky", "emerald", "amber", "rose", "violet"]

export function QuizLibrary({ quizzes, folders }: QuizLibraryProps) {
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [selectedFolder, setSelectedFolder] = useState("all")
    const [status, setStatus] = useState("all")
    const [sort, setSort] = useState("newest")
    const [folderDialog, setFolderDialog] = useState<{ mode: "create" | "rename"; folder?: QuizFolderItem } | null>(null)
    const [folderName, setFolderName] = useState("")
    const [folderColorValue, setFolderColorValue] = useState("indigo")
    const [isPending, startTransition] = useTransition()

    const filteredQuizzes = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase()

        return quizzes
            .filter((quiz) => {
                if (selectedFolder === "unfiled" && quiz.folderId) return false
                if (selectedFolder !== "all" && selectedFolder !== "unfiled" && quiz.folderId !== selectedFolder) return false
                if (status === "ready" && quiz._count.questions === 0) return false
                if (status === "draft" && quiz._count.questions > 0) return false
                if (normalizedQuery && !`${quiz.title} ${quiz.description || ""} ${quiz.folder?.name || ""}`.toLowerCase().includes(normalizedQuery)) return false
                return true
            })
            .sort((a, b) => {
                if (sort === "title") return a.title.localeCompare(b.title)
                if (sort === "questions") return b._count.questions - a._count.questions
                const dateA = new Date(a.updatedAt).getTime()
                const dateB = new Date(b.updatedAt).getTime()
                return sort === "oldest" ? dateA - dateB : dateB - dateA
            })
    }, [query, quizzes, selectedFolder, sort, status])

    const unfiledCount = quizzes.filter((quiz) => !quiz.folderId).length
    const hasFilters = Boolean(query) || status !== "all"
    const activeFolder = folders.find((folder) => folder.id === selectedFolder)
    const activeFolderName = selectedFolder === "all" ? "All quizzes" : selectedFolder === "unfiled" ? "Unfiled" : activeFolder?.name || "Quizzes"

    function clearFilters() {
        setQuery("")
        setStatus("all")
    }

    function openCreateFolder() {
        setFolderName("")
        setFolderColorValue("indigo")
        setFolderDialog({ mode: "create" })
    }

    function openRenameFolder(folder: QuizFolderItem) {
        setFolderName(folder.name)
        setFolderColorValue(folder.color)
        setFolderDialog({ mode: "rename", folder })
    }

    function saveFolder() {
        if (!folderDialog || !folderName.trim()) return
        startTransition(async () => {
            const result = folderDialog.mode === "create"
                ? await createQuizFolder(folderName, folderColorValue)
                : await renameQuizFolder(folderDialog.folder!.id, folderName)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success(folderDialog.mode === "create" ? "Folder created" : "Folder renamed")
            setFolderDialog(null)
            router.refresh()
        })
    }

    function removeFolder(folder: QuizFolderItem) {
        if (!window.confirm(`Delete “${folder.name}”? Its quizzes will move to Unfiled.`)) return
        startTransition(async () => {
            const result = await deleteQuizFolder(folder.id)
            if (!result.success) {
                toast.error(result.error || "Failed to delete folder")
                return
            }
            if (selectedFolder === folder.id) setSelectedFolder("all")
            toast.success("Folder deleted; quizzes moved to Unfiled")
            router.refresh()
        })
    }

    return (
        <div className="space-y-4">
            <div className="grid min-h-[30rem] gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
                <aside className="order-2 hidden h-fit rounded-2xl border border-border/70 bg-card p-3 shadow-sm lg:sticky lg:top-0 lg:block">
                    <div className="mb-2 flex items-center justify-between px-2 py-1">
                        <div><p className="text-sm font-semibold">Folders</p><p className="text-xs text-muted-foreground">Your private organization</p></div>
                        <Button variant="ghost" size="icon-sm" onClick={openCreateFolder} aria-label="Create folder"><FolderPlus className="size-4" /></Button>
                    </div>
                    <nav className="space-y-1" aria-label="Quiz folders">
                        <FolderButton active={selectedFolder === "all"} icon={BookOpen} label="All quizzes" count={quizzes.length} onClick={() => setSelectedFolder("all")} />
                        <FolderButton active={selectedFolder === "unfiled"} icon={FolderOpen} label="Unfiled" count={unfiledCount} onClick={() => setSelectedFolder("unfiled")} />
                        <div className="my-2 border-t" />
                        {folders.map((folder) => (
                            <div key={folder.id} className="group flex items-center gap-1">
                                <button type="button" onClick={() => setSelectedFolder(folder.id)} className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors", selectedFolder === folder.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                                    <span className={cn("size-2.5 shrink-0 rounded-full", folderColor[folder.color] || folderColor.indigo)} />
                                    <span className="truncate">{folder.name}</span>
                                    <span className="ml-auto text-xs tabular-nums opacity-70">{folder._count?.quizzes || 0}</span>
                                </button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Manage ${folder.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuItem onClick={() => openRenameFolder(folder)}><Pencil className="size-4" />Rename</DropdownMenuItem>
                                        <DropdownMenuItem variant="destructive" onClick={() => removeFolder(folder)}><Trash2 className="size-4" />Delete folder</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                        {folders.length === 0 && (
                            <button type="button" onClick={openCreateFolder} className="mt-2 w-full rounded-xl border border-dashed p-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground">
                                <FolderPlus className="mb-2 size-4" />Create a folder to group quizzes by unit, topic, or term.
                            </button>
                        )}
                    </nav>
                </aside>

                <section className="order-1 min-w-0 space-y-4">
                    <div className="rounded-xl border border-border/70 bg-card p-2 shadow-sm sm:rounded-2xl sm:p-3" aria-label="Quiz library tools">
                        <div className="mb-2 flex gap-1.5 sm:mb-3 sm:gap-2 lg:hidden">
                            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                                <SelectTrigger className="h-9 min-w-0 flex-1 sm:h-10"><FolderOpen className="size-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All quizzes ({quizzes.length})</SelectItem>
                                    <SelectItem value="unfiled">Unfiled ({unfiledCount})</SelectItem>
                                    {folders.map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.name} ({folder._count?.quizzes || 0})</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={openCreateFolder} aria-label="Create folder"><FolderPlus className="size-4" /></Button>
                            {activeFolder && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="Manage selected folder"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openRenameFolder(activeFolder)}><Pencil className="size-4" />Rename</DropdownMenuItem>
                                        <DropdownMenuItem variant="destructive" onClick={() => removeFolder(activeFolder)}><Trash2 className="size-4" />Delete folder</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2 sm:grid-cols-2 sm:gap-3 2xl:flex 2xl:items-center">
                            <div className="relative order-1 col-span-2 min-w-0 flex-1 sm:order-none">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, descriptions, or folders…" className="h-9 pl-9 pr-9 sm:h-10" aria-label="Search quizzes" />
                                {query && <Button variant="ghost" size="icon-sm" className="absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setQuery("")} aria-label="Clear search"><X className="size-4" /></Button>}
                            </div>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="order-3 h-9 w-full sm:order-none sm:h-10 2xl:w-36"><SlidersHorizontal className="size-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="all">All quizzes</SelectItem><SelectItem value="ready">With questions</SelectItem><SelectItem value="draft">Empty drafts</SelectItem></SelectContent>
                            </Select>
                            <Select value={sort} onValueChange={setSort}>
                                <SelectTrigger className="order-4 col-span-2 h-9 w-full sm:order-none sm:col-span-1 sm:h-10 2xl:w-48 2xl:min-w-48 2xl:shrink-0"><ArrowDownAZ className="size-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="newest">Recently updated</SelectItem><SelectItem value="oldest">Oldest updated</SelectItem><SelectItem value="title">Title A–Z</SelectItem><SelectItem value="questions">Most questions</SelectItem></SelectContent>
                            </Select>
                            <CreateQuizDialog />
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground sm:mt-3 sm:pt-3">
                            <span><span className="font-medium text-foreground">{activeFolderName}</span> · {filteredQuizzes.length} {filteredQuizzes.length === 1 ? "quiz" : "quizzes"}</span>
                            {hasFilters && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearFilters}>Clear filters</Button>}
                        </div>
                    </div>

                    {filteredQuizzes.length === 0 ? (
                        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 text-center">
                            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">{hasFilters ? <Search className="size-5" /> : <FolderOpen className="size-5" />}</div>
                            <h2 className="text-sm font-semibold">{hasFilters ? "No matching quizzes" : "This folder is empty"}</h2>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hasFilters ? "Try a different search or clear the current filters." : "Move a quiz here from its actions menu, or create a new quiz."}</p>
                            {hasFilters && <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button>}
                        </div>
                    ) : (
                        <div className="grid gap-3 xl:grid-cols-2" aria-label="Quizzes">
                            {filteredQuizzes.map((quiz) => <QuizLibraryCard key={quiz.id} quiz={quiz} folders={folders} />)}
                        </div>
                    )}
                </section>
            </div>

            <Dialog open={Boolean(folderDialog)} onOpenChange={(open) => !open && setFolderDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{folderDialog?.mode === "create" ? "Create a folder" : "Rename folder"}</DialogTitle>
                        <DialogDescription>Use a short name such as “Unit 1”, “Exam review”, or “Vocabulary”.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} maxLength={60} placeholder="Folder name" aria-label="Folder name" />
                        {folderDialog?.mode === "create" && (
                            <div><p className="mb-2 text-xs font-medium text-muted-foreground">Color</p><div className="flex flex-wrap gap-2">{colorOptions.map((color) => <button type="button" key={color} onClick={() => setFolderColorValue(color)} className={cn("flex size-9 items-center justify-center rounded-md border transition-all", folderColorValue === color ? "border-primary ring-2 ring-primary/20" : "border-border hover:bg-muted")} aria-label={`Use ${color} folder color`}><span className={cn("size-3.5 rounded-full", folderColor[color])} /></button>)}</div></div>
                        )}
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setFolderDialog(null)}>Cancel</Button><Button onClick={saveFolder} disabled={isPending || !folderName.trim()}>{isPending ? "Saving…" : folderDialog?.mode === "create" ? "Create folder" : "Save name"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function QuizLibraryCard({ quiz, folders }: { quiz: QuizLibraryItem; folders: QuizFolderItem[] }) {
    const questionCount = quiz._count.questions
    const assignmentCount = quiz._count.assignments

    return (
        <article className="group flex min-h-48 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <div className="flex items-start gap-3 p-4 pb-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><FileQuestion className="size-5" /></div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        <h2 className="min-w-0 flex-1 text-sm font-semibold leading-5"><Link href={`/teacher/quiz-manager/${quiz.id}`} className="line-clamp-2 hover:text-primary">{quiz.title}</Link></h2>
                        <QuizActions quiz={quiz} folders={folders} />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3" />Updated {format(new Date(quiz.updatedAt), "MMM d, yyyy")}</p>
                </div>
            </div>
            <div className="flex-1 px-4">
                <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{quiz.description || "No description provided."}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant={questionCount > 0 ? "secondary" : "outline"}><ListChecks className="size-3" />{questionCount} {questionCount === 1 ? "question" : "questions"}</Badge>
                    {quiz.folder && <Badge variant="outline"><span className={cn("size-2 rounded-full", folderColor[quiz.folder.color] || folderColor.indigo)} />{quiz.folder.name}</Badge>}
                    {assignmentCount > 0 && <Badge variant="outline">Used in {assignmentCount} {assignmentCount === 1 ? "task" : "tasks"}</Badge>}
                    {quiz.randomizeChoices && <Badge variant="outline">Choices shuffled</Badge>}
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t bg-muted/20 px-4 py-3">
                <span className="text-xs text-muted-foreground">{questionCount > 0 ? "Ready to assign" : "Add questions to finish"}</span>
                <Button size="sm" asChild><Link href={`/teacher/quiz-manager/${quiz.id}`}><ListChecks className="size-4" />{questionCount > 0 ? "Edit questions" : "Add questions"}</Link></Button>
            </div>
        </article>
    )
}

function FolderButton({ active, icon: Icon, label, count, onClick }: { active: boolean; icon: React.ElementType; label: string; count: number; onClick: () => void }) {
    return <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors", active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="size-4 shrink-0" /><span className="truncate">{label}</span><span className="ml-auto text-xs tabular-nums opacity-70">{count}</span></button>
}
