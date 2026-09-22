"use client"

import { useMemo, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ArrowDownAZ,
    BookOpen,
    Folder,
    FolderOpen,
    FolderPlus,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react"
import { toast } from "sonner"
import { MaterialCard } from "./material-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    createMaterialFolder,
    deleteMaterialFolder,
    renameMaterialFolder,
} from "@/lib/actions/material.actions"
import { cn } from "@/lib/utils"

export interface MaterialFolderItem {
    id: string
    name: string
    color: string
    _count?: { materials: number }
}

export interface MaterialItem {
    id: string
    title: string
    description?: string | null
    fileUrl?: string | null
    linkUrl?: string | null
    uploadedAt: Date | string
    materialType?: string | null
    courseId?: string | null
    folderId?: string | null
    folder?: { id: string; name: string; color: string } | null
    assignments?: any[]
}

interface MaterialListProps {
    materials: MaterialItem[]
    folders?: MaterialFolderItem[]
    isTeacher?: boolean
    courseId?: string
    variant?: "library" | "course"
    toolbarAction?: ReactNode
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

export function MaterialList({ materials, folders = [], isTeacher = false, courseId, variant = "course", toolbarAction }: MaterialListProps) {
    const router = useRouter()
    const isLibrary = variant === "library"
    const [query, setQuery] = useState("")
    const [selectedFolder, setSelectedFolder] = useState("all")
    const [type, setType] = useState("all")
    const [sort, setSort] = useState("newest")
    const [folderDialog, setFolderDialog] = useState<{ mode: "create" | "rename"; folder?: MaterialFolderItem } | null>(null)
    const [folderName, setFolderName] = useState("")
    const [folderColorValue, setFolderColorValue] = useState("indigo")
    const [isPending, startTransition] = useTransition()

    const filteredMaterials = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase()
        return materials
            .filter((material) => {
                if (selectedFolder === "unfiled" && material.folderId) return false
                if (selectedFolder !== "all" && selectedFolder !== "unfiled" && material.folderId !== selectedFolder) return false
                if (type === "file" && !material.fileUrl) return false
                if (type === "link" && !material.linkUrl) return false
                if (normalizedQuery) {
                    const searchable = [
                        material.title,
                        material.description,
                        material.folder?.name,
                        ...(material.assignments || []).map((assignment: any) => assignment.course?.name),
                    ].filter(Boolean).join(" ").toLowerCase()
                    if (!searchable.includes(normalizedQuery)) return false
                }
                return true
            })
            .sort((a, b) => {
                if (sort === "title") return a.title.localeCompare(b.title)
                const dateA = new Date(a.uploadedAt).getTime()
                const dateB = new Date(b.uploadedAt).getTime()
                return sort === "oldest" ? dateA - dateB : dateB - dateA
            })
    }, [materials, query, selectedFolder, sort, type])

    const unfiledCount = materials.filter((material) => !material.folderId).length

    function openCreateFolder() {
        setFolderName("")
        setFolderColorValue("indigo")
        setFolderDialog({ mode: "create" })
    }

    function openRenameFolder(folder: MaterialFolderItem) {
        setFolderName(folder.name)
        setFolderColorValue(folder.color)
        setFolderDialog({ mode: "rename", folder })
    }

    function saveFolder() {
        if (!folderDialog || !folderName.trim()) return
        startTransition(async () => {
            const result = folderDialog.mode === "create"
                ? await createMaterialFolder(folderName, folderColorValue)
                : await renameMaterialFolder(folderDialog.folder!.id, folderName)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success(folderDialog.mode === "create" ? "Folder created" : "Folder renamed")
            setFolderDialog(null)
            router.refresh()
        })
    }

    function removeFolder(folder: MaterialFolderItem) {
        if (!window.confirm(`Delete “${folder.name}”? Its materials will move to Unfiled.`)) return
        startTransition(async () => {
            const result = await deleteMaterialFolder(folder.id)
            if (!result.success) {
                toast.error(result.error || "Failed to delete folder")
                return
            }
            if (selectedFolder === folder.id) setSelectedFolder("all")
            toast.success("Folder deleted; materials moved to Unfiled")
            router.refresh()
        })
    }

    const activeFolderName = selectedFolder === "all"
        ? (isLibrary ? "All materials" : "Course materials")
        : selectedFolder === "unfiled"
            ? "Unfiled"
            : folders.find((folder) => folder.id === selectedFolder)?.name || "Materials"

    return (
        <div className="space-y-4">
            <div className={cn("grid min-h-[30rem] gap-4", isLibrary && "lg:grid-cols-[minmax(0,1fr)_15rem]")}>
                {isLibrary && (
                    <aside className="order-2 hidden h-fit rounded-xl border border-border/60 bg-card/50 p-2 shadow-none lg:sticky lg:top-0 lg:block">
                        <div className="mb-2 flex items-center justify-between px-2 py-1">
                            <div>
                                <p className="text-sm font-semibold">Folders</p>
                                <p className="text-xs text-muted-foreground">Your private organization</p>
                            </div>
                            <Button variant="ghost" size="icon-sm" onClick={openCreateFolder} aria-label="Create folder">
                                <FolderPlus className="size-4" />
                            </Button>
                        </div>
                        <nav className="space-y-1" aria-label="Material folders">
                            <FolderButton active={selectedFolder === "all"} icon={BookOpen} label="All materials" count={materials.length} onClick={() => setSelectedFolder("all")} />
                            <FolderButton active={selectedFolder === "unfiled"} icon={FolderOpen} label="Unfiled" count={unfiledCount} onClick={() => setSelectedFolder("unfiled")} />
                            <div className="my-2 border-t" />
                            {folders.map((folder) => (
                                <div key={folder.id} className="group flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFolder(folder.id)}
                                        className={cn(
                                            "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                                            selectedFolder === folder.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                        )}
                                    >
                                        <span className={cn("size-2.5 shrink-0 rounded-full", folderColor[folder.color] || folderColor.indigo)} />
                                        <span className="truncate">{folder.name}</span>
                                        <span className="ml-auto text-xs tabular-nums opacity-70">{folder._count?.materials || 0}</span>
                                    </button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Manage ${folder.name}`}>
                                                <MoreHorizontal className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuItem onClick={() => openRenameFolder(folder)}><Pencil className="size-4" />Rename</DropdownMenuItem>
                                            <DropdownMenuItem variant="destructive" onClick={() => removeFolder(folder)}><Trash2 className="size-4" />Delete folder</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                            {folders.length === 0 && (
                                <button type="button" onClick={openCreateFolder} className="mt-2 w-full rounded-xl border border-dashed p-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground">
                                    <FolderPlus className="mb-2 size-4" />
                                    Create a folder to group resources by unit, topic, or term.
                                </button>
                            )}
                        </nav>
                    </aside>
                )}

                <section className="order-1 min-w-0 space-y-4">
                    <div className={cn(
                        "rounded-2xl border border-border/70 bg-card p-3 shadow-sm",
                        isLibrary && "rounded-xl border-border/60 bg-transparent p-0 shadow-none",
                    )}>
                        {isLibrary && (
                            <div className="mb-3 flex gap-2 lg:hidden">
                                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                                    <SelectTrigger className="h-10 min-w-0 flex-1">
                                        <FolderOpen className="size-4 text-muted-foreground" />
                                        <SelectValue placeholder="Choose a folder" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All materials ({materials.length})</SelectItem>
                                        <SelectItem value="unfiled">Unfiled ({unfiledCount})</SelectItem>
                                        {folders.map((folder) => (
                                            <SelectItem key={folder.id} value={folder.id}>{folder.name} ({folder._count?.materials || 0})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" size="icon" onClick={openCreateFolder} aria-label="Create folder">
                                    <FolderPlus className="size-4" />
                                </Button>
                                {selectedFolder !== "all" && selectedFolder !== "unfiled" && folders.find((folder) => folder.id === selectedFolder) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" aria-label="Manage selected folder"><MoreHorizontal className="size-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openRenameFolder(folders.find((folder) => folder.id === selectedFolder)!)}><Pencil className="size-4" />Rename</DropdownMenuItem>
                                            <DropdownMenuItem variant="destructive" onClick={() => removeFolder(folders.find((folder) => folder.id === selectedFolder)!)}><Trash2 className="size-4" />Delete folder</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 xl:flex xl:items-center">
                            {!isLibrary && (
                                <div className="col-span-2 flex min-w-0 items-center gap-2 xl:mr-auto xl:flex-1">
                                    <h2 className="truncate font-semibold tracking-tight">{activeFolderName}</h2>
                                    <Badge variant="secondary">{filteredMaterials.length}</Badge>
                                </div>
                            )}
                            <div className={cn("relative col-span-2 min-w-0", isLibrary ? "flex-1" : "xl:w-72 xl:flex-none 2xl:w-96")}>
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search titles, descriptions, folders, or courses…"
                                    className="h-10 pl-9 pr-9"
                                />
                                {query && <Button variant="ghost" size="icon-sm" className="absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setQuery("")} aria-label="Clear search"><X className="size-4" /></Button>}
                            </div>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="h-10 w-full xl:w-28"><SelectValue placeholder="All types" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All types</SelectItem>
                                    <SelectItem value="file">Has a file</SelectItem>
                                    <SelectItem value="link">Has a link</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={sort} onValueChange={setSort}>
                                <SelectTrigger className="h-10 w-full xl:w-44 xl:min-w-44 xl:shrink-0"><ArrowDownAZ className="size-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest first</SelectItem>
                                    <SelectItem value="oldest">Oldest first</SelectItem>
                                    <SelectItem value="title">Title A–Z</SelectItem>
                                </SelectContent>
                            </Select>
                        {isLibrary && (
                            <Button asChild className="col-span-2 h-10 w-full shrink-0 xl:w-auto">
                                <Link href="/teacher/materials/new"><Plus className="size-4" />Add material</Link>
                            </Button>
                        )}
                        {!isLibrary && toolbarAction}
                    </div>
                    </div>

                    {filteredMaterials.length === 0 ? (
                        <div className={cn(
                            "flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 text-center",
                            isLibrary && "rounded-xl border-border/60 bg-transparent",
                        )}>
                            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                {query || type !== "all" ? <Search className="size-5" /> : <FolderOpen className="size-5" />}
                            </div>
                            <h3 className="font-semibold">{query || type !== "all" ? "No matching materials" : "This space is empty"}</h3>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                {query || type !== "all" ? "Try a different search or clear one of the filters." : isTeacher ? "Add a resource or move an existing material here." : "Your teacher has not shared any materials here yet."}
                            </p>
                            {(query || type !== "all") && <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQuery(""); setType("all") }}>Clear filters</Button>}
                        </div>
                    ) : (
                        <div className="grid gap-3 xl:grid-cols-2">
                            {filteredMaterials.map((material) => (
                                <MaterialCard
                                    key={material.id}
                                    material={material}
                                    folders={folders}
                                    isTeacher={isTeacher}
                                    courseId={courseId}
                                    variant={variant}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <Dialog open={!!folderDialog} onOpenChange={(open) => !open && setFolderDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{folderDialog?.mode === "create" ? "Create a folder" : "Rename folder"}</DialogTitle>
                        <DialogDescription>Use a short name such as “Unit 1”, “Exam review”, or “Worksheets”.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} maxLength={60} placeholder="Folder name" autoFocus onKeyDown={(event) => event.key === "Enter" && saveFolder()} />
                        {folderDialog?.mode === "create" && (
                            <div>
                                <p className="mb-2 text-xs font-medium text-muted-foreground">Color</p>
                                <div className="flex gap-2">
                                    {colorOptions.map((color) => (
                                        <button key={color} type="button" onClick={() => setFolderColorValue(color)} className={cn("size-7 rounded-full transition-all", folderColor[color], folderColorValue === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100")} aria-label={`${color} folder`} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFolderDialog(null)}>Cancel</Button>
                        <Button onClick={saveFolder} disabled={isPending || !folderName.trim()}>{isPending ? "Saving…" : folderDialog?.mode === "create" ? "Create folder" : "Save name"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function FolderButton({ active, icon: Icon, label, count, onClick }: { active: boolean; icon: typeof Folder; label: string; count: number; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors", active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Icon className="size-4" />
            <span className="truncate">{label}</span>
            <span className="ml-auto text-xs tabular-nums opacity-70">{count}</span>
        </button>
    )
}
