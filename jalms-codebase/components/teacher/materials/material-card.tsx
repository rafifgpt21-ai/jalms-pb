"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Download, ExternalLink, Eye, FileText, FolderInput, Link2, Loader2, MoreHorizontal, Pencil, Settings2, Trash2 } from "lucide-react"
import Link from "next/link"
import { deleteMaterial, moveMaterialToFolder } from "@/lib/actions/material.actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ManageMaterialDialog } from "./manage-material-dialog"
import type { MaterialFolderItem, MaterialItem } from "./material-list"
import { cn } from "@/lib/utils"

interface MaterialCardProps {
    material: MaterialItem
    folders?: MaterialFolderItem[]
    isTeacher?: boolean
    courseId?: string
    variant?: "library" | "course"
}

export function MaterialCard({ material, folders = [], isTeacher = false, courseId, variant = "course" }: MaterialCardProps) {
    const router = useRouter()
    const isLibrary = variant === "library"
    const [isDeleting, setIsDeleting] = useState(false)
    const [isMoving, startMoving] = useTransition()
    const hasFile = !!material.fileUrl
    const hasLink = !!material.linkUrl
    const assignmentCount = material.assignments?.length || 0
    const fileViewUrl = isTeacher
        ? `/teacher/materials/${material.id}`
        : `/student/courses/${courseId || material.courseId}/materials/${material.id}`
    const downloadUrl = material.fileUrl ? `${material.fileUrl}?download=true` : undefined

    async function handleDelete() {
        const toastId = toast.loading("Deleting material…")
        setIsDeleting(true)
        try {
            const result = await deleteMaterial(material.id)
            if (!result.success) return toast.error(result.error || "Failed to delete material", { id: toastId })
            toast.success("Material deleted", { id: toastId })
            router.refresh()
        } catch {
            toast.error("Something went wrong", { id: toastId })
        } finally {
            setIsDeleting(false)
        }
    }

    function moveTo(folderId: string | null) {
        startMoving(async () => {
            const result = await moveMaterialToFolder(material.id, folderId)
            if (!result.success) {
                toast.error(result.error || "Failed to move material")
                return
            }
            toast.success(folderId ? "Material moved" : "Material moved to Unfiled")
            router.refresh()
        })
    }

    const primaryHref = hasFile ? fileViewUrl : material.linkUrl || undefined
    const isExternalPrimary = !hasFile && hasLink

    return (
        <article className={cn(
            "group flex min-h-48 flex-col overflow-hidden rounded-2xl border bg-card",
            isLibrary
                ? "border-border/60 shadow-none transition-colors hover:border-border hover:bg-card/80"
                : "border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md",
        )}>
            <div className={cn("flex items-start gap-3 p-4", isLibrary ? "pb-2" : "pb-3")}>
                <div className={cn(
                    "flex shrink-0 items-center justify-center",
                    isLibrary ? "size-9 rounded-lg" : "size-11 rounded-xl",
                    hasFile ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                )}>
                    {hasFile ? <FileText className="size-5" /> : <Link2 className="size-5" />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        <h3 className="min-w-0 flex-1 text-sm font-semibold leading-5">
                            {primaryHref ? (
                                isExternalPrimary
                                    ? <a href={primaryHref} target="_blank" rel="noopener noreferrer" className="line-clamp-2 hover:text-primary">{material.title}</a>
                                    : <Link href={primaryHref} className="line-clamp-2 hover:text-primary">{material.title}</Link>
                            ) : <span className="line-clamp-2">{material.title}</span>}
                        </h3>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="-mr-1 -mt-1 shrink-0" aria-label={`Actions for ${material.title}`} disabled={isMoving}>
                                    {isMoving ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {hasFile && <DropdownMenuItem asChild><Link href={fileViewUrl}><Eye className="size-4" />Preview</Link></DropdownMenuItem>}
                                {hasLink && <DropdownMenuItem asChild><a href={material.linkUrl!} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" />Open link</a></DropdownMenuItem>}
                                {hasFile && <DropdownMenuItem asChild><a href={downloadUrl} target="_blank" rel="noopener noreferrer"><Download className="size-4" />Download</a></DropdownMenuItem>}
                                {isTeacher && <DropdownMenuSeparator />}
                                {isTeacher && variant === "library" && (
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger><FolderInput className="size-4" />Move to folder</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="w-44">
                                            <DropdownMenuLabel className="text-xs text-muted-foreground">Choose a folder</DropdownMenuLabel>
                                            <DropdownMenuItem disabled={!material.folderId} onClick={() => moveTo(null)}>Unfiled</DropdownMenuItem>
                                            {folders.map((folder) => <DropdownMenuItem key={folder.id} disabled={material.folderId === folder.id} onClick={() => moveTo(folder.id)}>{folder.name}</DropdownMenuItem>)}
                                            {folders.length === 0 && <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                )}
                                {isTeacher && <DropdownMenuItem asChild><Link href={`/teacher/materials/${material.id}/edit`}><Pencil className="size-4" />Edit details</Link></DropdownMenuItem>}
                                {isTeacher && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(event) => event.preventDefault()} variant="destructive"><Trash2 className="size-4" />Delete</DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete “{material.title}”?</AlertDialogTitle>
                                                <AlertDialogDescription>This removes the material from your library and every course it is assigned to. This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">{isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}Delete material</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <p className={cn("mt-1 text-xs text-muted-foreground", isLibrary && "text-muted-foreground/80")}>Added {format(new Date(material.uploadedAt), "MMM d, yyyy")}</p>
                </div>
            </div>

            <div className="flex-1 px-4">
                <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{material.description || "No description provided."}</p>
                <div className={cn("flex flex-wrap gap-1.5", isLibrary ? "mt-2" : "mt-3")}>
                    {hasFile && <Badge variant="secondary" className={isLibrary ? "bg-muted/50 text-muted-foreground" : undefined}><FileText className="size-3" />PDF</Badge>}
                    {hasLink && <Badge variant="secondary" className={isLibrary ? "bg-muted/50 text-muted-foreground" : undefined}><Link2 className="size-3" />Link</Badge>}
                    {isLibrary && material.folder && <Badge variant="outline" className="border-border/60 bg-transparent text-muted-foreground">{material.folder.name}</Badge>}
                    {isLibrary && assignmentCount > 0 && <Badge variant="outline" className="border-border/60 bg-transparent text-muted-foreground">{assignmentCount} {assignmentCount === 1 ? "course" : "courses"}</Badge>}
                </div>
            </div>

            <div className={cn(
                "mt-4 flex items-center justify-between gap-2 border-t px-4",
                isLibrary ? "mt-3 border-border/60 bg-transparent py-2.5" : "bg-muted/20 py-3",
            )}>
                {isTeacher && variant === "library" ? (
                    <ManageMaterialDialog materialId={material.id} materialTitle={material.title} assignments={material.assignments || []} />
                ) : <span className="text-xs text-muted-foreground">{hasFile && hasLink ? "File + link" : hasFile ? "File resource" : "Web resource"}</span>}
                <div className="ml-auto flex gap-2">
                    {hasLink && <Button variant="outline" size="sm" asChild className="h-11 w-11 p-0 sm:h-7 sm:w-auto sm:px-3" aria-label={`Open ${material.title}`}><a href={material.linkUrl!} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /><span className="hidden sm:inline">Open</span></a></Button>}
                    {hasFile && <Button size="sm" asChild><Link href={fileViewUrl}><Eye className="size-4" />View</Link></Button>}
                </div>
            </div>
        </article>
    )
}
