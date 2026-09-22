"use client"

import { useState } from "react"
import { Subject, AcademicDomain } from "@prisma/client"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { toast } from "sonner"
import { deleteSubject } from "@/lib/actions/subject.actions"
import { SubjectForm } from "./subject-form"

interface SubjectListProps {
    subjects: (Subject & { _count: { courses: number } })[]
}

const DOMAIN_LABELS: Record<string, string> = {
    SCIENCE_TECHNOLOGY: "Science and Technology",
    SOCIAL_HUMANITIES: "Social Sciences and Humanities",
    LANGUAGE_COMMUNICATION: "Language and Communication",
    ARTS_CREATIVITY: "Arts and Creativity",
    PHYSICAL_EDUCATION: "Physical Education",
    SPIRITUALITY_ETHICS: "Spirituality & Ethics",
}

export function SubjectList({ subjects }: SubjectListProps) {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const filteredSubjects = subjects.filter(subject =>
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleEdit = (subject: Subject) => {
        setEditingSubject(subject)
        setIsFormOpen(true)
    }

    const handleCreate = () => {
        setEditingSubject(null)
        setIsFormOpen(true)
    }

    const confirmDelete = async () => {
        if (!deleteId) return
        const result = await deleteSubject(deleteId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Subject deleted")
        }
        setDeleteId(null)
    }

    return (
        <div className="space-y-4">
            <div className="admin-toolbar">
                <Button onClick={handleCreate} className="max-sm:w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Subject
                </Button>
                <div className="relative w-full flex-1 sm:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <Input
                        placeholder="Search subjects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="hidden md:table-cell">Domains</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSubjects.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-32 text-slate-500 dark:text-slate-400">
                                    No subjects found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSubjects.map((subject) => (
                                <TableRow key={subject.id}>
                                    <TableCell><span className="inline-flex size-9 items-center justify-center rounded-lg bg-indigo-600 font-mono text-[11px] font-bold text-white">{subject.code}</span></TableCell>
                                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                                        <div>{subject.name}</div>
                                        <div className="text-xs text-muted-foreground">{subject._count.courses} linked courses</div>
                                        <div className="text-xs text-slate-400 dark:text-slate-500 md:hidden mt-1">
                                            {subject.academicDomains.length} tags
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <div className="flex flex-wrap gap-1">
                                            {subject.academicDomains.map((domain) => (
                                                <Badge key={domain} variant="secondary" className="text-[10px] bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-800/50 border">
                                                    {DOMAIN_LABELS[domain] || domain}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(subject)}
                                                className="hover:bg-white/40 dark:hover:bg-white/10 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/20 rounded-lg"
                                                onClick={() => setDeleteId(subject.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <SubjectForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                initialData={editingSubject}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the subject. Courses linked to this subject will lose the association.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
