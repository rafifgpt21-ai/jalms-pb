"use client"

import { Class, User, Term, AcademicYear, GradeLevel } from "@prisma/client"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, MoreHorizontal, Search } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { deleteClass } from "@/lib/actions/class.actions"
import { toast } from "sonner"
import { ClassModal } from "./class-modal"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CLASS_COLOR_STYLES } from "@/lib/course-identity"
import { cn } from "@/lib/utils"
import { educationStage, GRADE_LEVELS, gradeLevelNumber } from "@/lib/grade-level"
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

interface ClassListProps {
    classes: (Class & {
        term: Term & { academicYear: AcademicYear };
        homeroomTeacher: User | null;
        _count: { students: number; courses: number };
    })[]
    teachers: { id: string; name: string }[]
    terms: (Term & { academicYear: AcademicYear })[]
}

export function ClassList({ classes, teachers, terms }: ClassListProps) {
    const [editingClass, setEditingClass] = useState<Class | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showActiveOnly, setShowActiveOnly] = useState(true)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [gradeFilter, setGradeFilter] = useState<"all" | GradeLevel>("all")

    const filteredClasses = classes.filter(cls => {
        const matchesActive = showActiveOnly ? cls.term.isActive : true
        const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesGrade = gradeFilter === "all" || cls.gradeLevel === gradeFilter
        return matchesActive && matchesSearch && matchesGrade
    })

    async function handleDelete(id: string) {
        setDeleteId(id)
    }

    async function confirmDelete() {
        if (!deleteId) return

        const result = await deleteClass(deleteId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Class deleted")
        }
        setDeleteId(null)
    }



    return (
        <>
            <div className="admin-toolbar">
                <div className="w-full shrink-0 sm:w-auto [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
                    <ClassModal teachers={teachers} terms={terms} />
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="flex items-center space-x-2 whitespace-nowrap">
                        <Switch
                            id="active-filter"
                            checked={showActiveOnly}
                            onCheckedChange={setShowActiveOnly}
                        />
                        <Label htmlFor="active-filter">Active Classes</Label>
                    </div>
                    <Select value={gradeFilter} onValueChange={(value) => setGradeFilter(value as typeof gradeFilter)}>
                        <SelectTrigger className="w-full sm:w-[155px]">
                            <SelectValue placeholder="All grades" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All grades</SelectItem>
                            {GRADE_LEVELS.map((gradeLevel) => (
                                <SelectItem key={gradeLevel} value={gradeLevel}>
                                    Grade {gradeLevelNumber(gradeLevel)} · {educationStage(gradeLevel)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <Input
                                placeholder="Search classes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 sm:w-[300px]"
                            />
                        </div>
                        <Button variant="secondary">Search</Button>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead>Class Name</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead className="max-lg:hidden">Semester</TableHead>
                            <TableHead className="max-md:hidden">Homeroom Teacher</TableHead>
                            <TableHead className="max-sm:hidden">Students</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClasses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-32 text-slate-500 dark:text-slate-400">
                                    No classes found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredClasses.map((cls) => (
                                <TableRow key={cls.id}>
                                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                                        <div className="flex items-center gap-2"><span className={cn("size-3 rounded-full", cls.color ? CLASS_COLOR_STYLES[cls.color].swatch : "bg-slate-400")} />{cls.name}</div>
                                        <div className="mt-1 text-xs text-muted-foreground">{cls._count.courses} linked courses</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {gradeLevelNumber(cls.gradeLevel)} · {educationStage(cls.gradeLevel)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-lg:hidden text-slate-600 dark:text-slate-300">
                                        {cls.term.academicYear.name} - {cls.term.type === "ODD" ? "Odd" : "Even"}
                                    </TableCell>
                                    <TableCell className="max-md:hidden text-slate-600 dark:text-slate-300">
                                        {cls.homeroomTeacher ? (
                                            cls.homeroomTeacher.name
                                        ) : (
                                            <span className="text-slate-400 italic">Unassigned</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-sm:hidden">
                                        <Badge variant="secondary" className="bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-800/50">
                                            {cls._count.students} Students
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" asChild className="max-sm:px-2.5">
                                                <a href={`/admin/classes/${cls.id}`}>Manage</a>
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <span className="sr-only">Open actions for {cls.name}</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => {
                                                        setEditingClass(cls)
                                                        setIsModalOpen(true)
                                                    }}>
                                                        <Edit className="h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(cls.id)} variant="destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )))}
                    </TableBody>
                </Table>
            </div>

            <ClassModal
                teachers={teachers}
                terms={terms}
                initialData={editingClass}
                open={isModalOpen}
                onOpenChange={(open) => {
                    setIsModalOpen(open)
                    if (!open) setEditingClass(null)
                }}
                showTrigger={false}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the class and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
