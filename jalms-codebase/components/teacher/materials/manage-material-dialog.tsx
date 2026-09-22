"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Settings, Trash2, Plus, Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { searchTeacherCourses, assignMaterialToCourse, removeMaterialFromCourse } from "@/lib/actions/material.actions"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface ManageMaterialDialogProps {
    materialId: string
    materialTitle: string
    assignments: {
        id: string
        courseId: string
        course: {
            id: string
            name: string
            term: {
                type: "ODD" | "EVEN"
                academicYear: {
                    name: string
                }
            }
        }
    }[]
}

export function ManageMaterialDialog({ materialId, materialTitle, assignments: initialAssignments }: ManageMaterialDialogProps) {
    const [open, setOpen] = useState(false)
    const [assignments, setAssignments] = useState(initialAssignments)
    const [openCombobox, setOpenCombobox] = useState(false)
    const [query, setQuery] = useState("")
    const [courses, setCourses] = useState<{ id: string; name: string; term: { type: "ODD" | "EVEN"; academicYear: { name: string } } }[]>([])
    const [loading, setLoading] = useState(false)
    const [assigning, setAssigning] = useState(false)

    useEffect(() => {
        if (!openCombobox) return

        const delayDebounceFn = setTimeout(async () => {
            setLoading(true)
            const res = await searchTeacherCourses(query)
            if (res.courses) {
                setCourses(res.courses as any)
            }
            setLoading(false)
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [query, openCombobox])

    const handleAdd = async (courseId: string) => {
        setAssigning(true)
        try {
            const res = await assignMaterialToCourse(materialId, courseId)
            if (res.assignment) {
                toast.success("Material assigned to course")
                // Optimistically update or refresh? 
                // Since we don't have full course data in response (only assignment), we might need to fetch or just use the selected course data.
                const selectedCourse = courses.find(c => c.id === courseId)
                if (selectedCourse) {
                    setAssignments([...assignments, {
                        id: res.assignment.id,
                        courseId: courseId,
                        course: selectedCourse
                    }])
                }
                setOpenCombobox(false)
            } else {
                toast.error(res.error || "Failed to assign")
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setAssigning(false)
        }
    }

    const handleRemove = async (courseId: string) => {
        try {
            const res = await removeMaterialFromCourse(materialId, courseId)
            if (res.success) {
                toast.success("Material removed from course")
                setAssignments(assignments.filter(a => a.courseId !== courseId))
            } else {
                toast.error(res.error || "Failed to remove")
            }
        } catch (error) {
            toast.error("Something went wrong")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Assignments: {materialTitle}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="w-[400px] justify-between"
                                >
                                    {query ? query : "Search course to add..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                                <Command shouldFilter={false}>
                                    <CommandInput placeholder="Search course..." value={query} onValueChange={setQuery} />
                                    <CommandList>
                                        {loading && <CommandItem>Loading...</CommandItem>}
                                        {!loading && courses.length === 0 && <CommandEmpty>No course found.</CommandEmpty>}
                                        {!loading && courses.map((course) => {
                                            const isAssigned = assignments.some(a => a.courseId === course.id)
                                            return (
                                                <CommandItem
                                                    key={course.id}
                                                    value={course.name}
                                                    onSelect={() => {
                                                        if (!isAssigned) handleAdd(course.id)
                                                    }}
                                                    disabled={isAssigned || assigning}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            isAssigned ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span>{course.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {course.term.academicYear.name} - {course.term.type}
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            )
                                        })}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course Name</TableHead>
                                    <TableHead className="w-[100px] text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                            Not assigned to any course yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    assignments.map((assignment) => (
                                        <TableRow key={assignment.courseId}>
                                            <TableCell>
                                                <div className="font-medium">{assignment.course.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {assignment.course.term.academicYear.name} - {assignment.course.term.type}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => handleRemove(assignment.courseId)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
