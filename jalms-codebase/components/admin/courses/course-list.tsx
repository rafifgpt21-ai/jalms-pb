"use client"

import { useRouter, useSearchParams } from "next/navigation"

import { Course, User, Term, AcademicYear, Subject, Class } from "@prisma/client"
import { CourseIdentityBadge } from "@/components/course/course-identity-badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, MoreHorizontal, Search, SlidersHorizontal } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { deleteCourse } from "@/lib/actions/course.actions"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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

import { CourseModal } from "./course-modal"

type CourseListItem = Course & {
    teacher: User;
    term: Term & { academicYear: AcademicYear };
    subject: Subject | null;
    class: Class | null;
    _count: { students: number };
}

interface CourseListProps {
    courses: CourseListItem[]
    teachers: { id: string; name: string }[]
    terms: { id: string; academicYear: { name: string }; type: string; isActive: boolean }[]
    subjects: Subject[]
}

export function CourseList({ courses, teachers, terms, subjects }: CourseListProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCourse, setEditingCourse] = useState<CourseListItem | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterValue, setFilterValue] = useState("")
    const [subjectFilter, setSubjectFilter] = useState("all")
    const [classFilter, setClassFilter] = useState("all")
    const [teacherFilter, setTeacherFilter] = useState("all")

    const router = useRouter()
    const searchParams = useSearchParams()
    const showAll = searchParams.get("showAll") === "true"

    function handleToggle(checked: boolean) {
        const params = new URLSearchParams(searchParams.toString())
        if (checked) {
            params.set("showAll", "true")
        } else {
            params.delete("showAll")
        }
        router.push(`?${params.toString()}`)
    }

    const filteredCourses = courses.filter(course => {
        const query = filterValue.toLowerCase()
        const matchesSearch = !query || [course.name, course.subject?.name, course.subject?.code, course.class?.name, course.teacher.name].some(value => value?.toLowerCase().includes(query))
        return matchesSearch &&
            (subjectFilter === "all" || (subjectFilter === "unlinked" ? !course.subjectId : course.subjectId === subjectFilter)) &&
            (classFilter === "all" || (classFilter === "unlinked" ? !course.classId : course.classId === classFilter)) &&
            (teacherFilter === "all" || course.teacherId === teacherFilter)
    })
    const classes = Array.from(new Map(courses.flatMap(course => course.class ? [[course.class.id, course.class] as const] : [])).values())

    const activeFilterCount = Number(subjectFilter !== "all") + Number(classFilter !== "all") + Number(teacherFilter !== "all")

    async function handleDelete(id: string) {
        setDeleteId(id)
    }

    async function confirmDelete() {
        if (!deleteId) return

        const result = await deleteCourse(deleteId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Course deleted")
        }
        setDeleteId(null)
    }

    return (
        <div className="space-y-2">
            <div className="rounded-md border bg-card p-2 shadow-xs xl:flex xl:items-center xl:gap-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-0 bg-transparent p-0 shadow-none md:flex md:flex-wrap md:items-center xl:contents">
                <div className="min-w-0 justify-self-start xl:mr-auto [&_[data-slot=button]]:w-auto">
                    <CourseModal teachers={teachers} terms={terms} subjects={subjects} />
                </div>

                <div className="flex min-h-8 items-center gap-2 whitespace-nowrap md:order-2">
                    <Switch
                        id="show-all"
                        checked={!showAll}
                        onCheckedChange={(checked) => handleToggle(!checked)}
                    />
                    <Label htmlFor="show-all">Active courses</Label>
                </div>

                <div className="relative min-w-0 md:order-3 md:ml-auto md:flex-1 xl:ml-0 xl:min-w-36 xl:max-w-[18rem]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setFilterValue(e.target.value) }}
                        className="w-full pl-9"
                    />
                </div>

                <div className="md:hidden">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full px-3" aria-label={`Course filters${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}>
                                <SlidersHorizontal /> Filters{activeFilterCount > 0 && <span className="text-xs text-primary">{activeFilterCount}</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72 space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Filter courses</p>
                            <Select value={subjectFilter} onValueChange={setSubjectFilter}><SelectTrigger className="w-full" aria-label="Filter by subject"><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent><SelectItem value="all">All subjects</SelectItem><SelectItem value="unlinked">No subject</SelectItem>{subjects.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.code} · {subject.name}</SelectItem>)}</SelectContent></Select>
                            <Select value={classFilter} onValueChange={setClassFilter}><SelectTrigger className="w-full" aria-label="Filter by class"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent><SelectItem value="all">All classes</SelectItem><SelectItem value="unlinked">No linked class</SelectItem>{classes.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}</SelectContent></Select>
                            <Select value={teacherFilter} onValueChange={setTeacherFilter}><SelectTrigger className="w-full" aria-label="Filter by teacher"><SelectValue placeholder="Teacher" /></SelectTrigger><SelectContent><SelectItem value="all">All teachers</SelectItem>{teachers.map(teacher => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}</SelectContent></Select>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="mt-2 hidden border-0 bg-transparent p-0 shadow-none md:grid md:grid-cols-3 md:gap-2 xl:mt-0 xl:contents">
                <Select value={subjectFilter} onValueChange={setSubjectFilter}><SelectTrigger className="w-full xl:order-4 xl:w-32 2xl:w-40" aria-label="Filter by subject"><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent><SelectItem value="all">All subjects</SelectItem><SelectItem value="unlinked">No subject</SelectItem>{subjects.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.code} · {subject.name}</SelectItem>)}</SelectContent></Select>
                <Select value={classFilter} onValueChange={setClassFilter}><SelectTrigger className="w-full xl:order-4 xl:w-32 2xl:w-40" aria-label="Filter by class"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent><SelectItem value="all">All classes</SelectItem><SelectItem value="unlinked">No linked class</SelectItem>{classes.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}</SelectContent></Select>
                <Select value={teacherFilter} onValueChange={setTeacherFilter}><SelectTrigger className="w-full xl:order-4 xl:w-32 2xl:w-40" aria-label="Filter by teacher"><SelectValue placeholder="Teacher" /></SelectTrigger><SelectContent><SelectItem value="all">All teachers</SelectItem>{teachers.map(teacher => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}</SelectContent></Select>
                <span className="hidden shrink-0 text-xs text-muted-foreground xl:order-5 xl:block" aria-label={`Showing ${filteredCourses.length} of ${courses.length} courses`}>{filteredCourses.length} of {courses.length}</span>
            </div>
            </div>

            <div className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead>Course Name</TableHead>
                            <TableHead className="max-md:hidden">Subject / Class</TableHead>
                            <TableHead className="max-md:hidden">Teacher</TableHead>
                            <TableHead className="max-lg:hidden">Semester</TableHead>
                            <TableHead className="max-sm:hidden">Students</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCourses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-32 text-slate-500 dark:text-slate-400">
                                    No courses found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCourses.map((course) => (
                                <TableRow key={course.id}>
                                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                                        <div className="flex items-center gap-3">
                                            <CourseIdentityBadge course={{ ...course, roleContext: "teacher" }} className="size-9 rounded-lg" />
                                            <div className="min-w-0">
                                                <div className="truncate">{course.name}</div>
                                                <div className="text-xs font-normal text-muted-foreground">{course.enrollmentMode?.replace("_", " ").toLowerCase() || "manual"}</div>
                                                <div className="mt-0.5 truncate text-xs font-normal text-muted-foreground md:hidden">
                                                    {course.subject?.code || "No subject"} · {course.class?.name || "No linked class"}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-md:hidden text-slate-500 dark:text-slate-400 text-sm">
                                        <div>{course.subject ? `${course.subject.code} · ${course.subject.name}` : "No subject"}</div>
                                        <div className="text-xs text-muted-foreground">{course.class?.name || "No linked class"}</div>
                                    </TableCell>
                                    <TableCell className="max-md:hidden text-slate-600 dark:text-slate-300">{course.teacher.name}</TableCell>
                                    <TableCell className="max-lg:hidden text-slate-600 dark:text-slate-300">
                                        {course.term.academicYear.name} - {course.term.type === "ODD" ? "Odd" : "Even"}
                                    </TableCell>
                                    <TableCell className="max-sm:hidden text-slate-600 dark:text-slate-300">
                                        {course._count.students}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" asChild className="max-sm:px-2.5">
                                                <a href={`/admin/courses/${course.id}`}>Manage</a>
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <span className="sr-only">Open actions for {course.name}</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => {
                                                        setEditingCourse(course)
                                                        setIsModalOpen(true)
                                                    }}>
                                                        <Edit className="h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(course.id)} variant="destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <CourseModal
                teachers={teachers}
                terms={terms}
                subjects={subjects}
                initialData={editingCourse}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                showTrigger={false}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the course and remove all associated data.
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
        </div>
    )
}
