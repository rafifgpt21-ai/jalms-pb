"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, FileText, Link2, Loader2, Plus, Search } from "lucide-react"
import { toast } from "sonner"
import { assignMaterialToCourse } from "@/lib/actions/material.actions"
import type { MaterialItem } from "./material-list"
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

export function CourseMaterialPicker({ courseId, materials }: { courseId: string; materials: MaterialItem[] }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [assignedIds, setAssignedIds] = useState(() => new Set(
        materials.filter((material) => material.courseId === courseId || material.assignments?.some((assignment: any) => assignment.courseId === courseId)).map((material) => material.id),
    ))
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const available = useMemo(() => {
        const normalized = query.trim().toLowerCase()
        return materials.filter((material) => {
            if (assignedIds.has(material.id)) return false
            if (!normalized) return true
            return [material.title, material.description, material.folder?.name].filter(Boolean).join(" ").toLowerCase().includes(normalized)
        })
    }, [assignedIds, materials, query])

    function assign(material: MaterialItem) {
        setPendingId(material.id)
        startTransition(async () => {
            const result = await assignMaterialToCourse(material.id, courseId)
            if (!result.assignment) {
                toast.error(result.error || "Failed to add material")
                setPendingId(null)
                return
            }
            setAssignedIds((current) => new Set([...current, material.id]))
            setPendingId(null)
            toast.success(`Added “${material.title}”`)
            router.refresh()
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="col-span-2 h-10 w-full shrink-0 xl:w-auto"><Plus className="size-4" />Add materials</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add from your material library</DialogTitle>
                    <DialogDescription>Reuse an existing resource in this course. Your original library item stays in place.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your library…" className="h-10 pl-9" />
                </div>
                <ScrollArea className="h-[22rem] rounded-xl border">
                    <div className="space-y-1 p-2">
                        {available.map((material) => (
                            <div key={material.id} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/70">
                                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", material.fileUrl ? "bg-indigo-500/10 text-indigo-600" : "bg-sky-500/10 text-sky-600")}>
                                    {material.fileUrl ? <FileText className="size-5" /> : <Link2 className="size-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{material.title}</p>
                                    <div className="mt-1 flex gap-1.5">
                                        {material.folder && <Badge variant="outline">{material.folder.name}</Badge>}
                                        {material.fileUrl && <Badge variant="secondary">PDF</Badge>}
                                        {material.linkUrl && <Badge variant="secondary">Link</Badge>}
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" disabled={isPending} onClick={() => assign(material)}>
                                    {pendingId === material.id ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}Add
                                </Button>
                            </div>
                        ))}
                        {available.length === 0 && (
                            <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
                                <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><Check className="size-5" /></div>
                                <p className="font-medium">{query ? "No materials match your search" : "Everything is already added"}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{query ? "Try another title or folder name." : "All resources in your library are available in this course."}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="items-center sm:justify-between">
                    <Button variant="ghost" asChild><Link href="/teacher/materials/new"><Plus className="size-4" />Create new material</Link></Button>
                    <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
