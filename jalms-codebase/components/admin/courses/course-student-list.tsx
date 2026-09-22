"use client"

import { User } from "@prisma/client"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { removeStudentFromCourse } from "@/lib/actions/enrollment.actions"
import { toast } from "sonner"
import { useState } from "react"
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

interface CourseStudentListProps {
    students: User[]
    courseId: string
}

export function CourseStudentList({ students, courseId }: CourseStudentListProps) {
    const [studentToDelete, setStudentToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    async function confirmDelete() {
        if (!studentToDelete) return

        setIsDeleting(true)
        const result = await removeStudentFromCourse(courseId, studentToDelete)
        setIsDeleting(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Student removed from course")
            setStudentToDelete(null)
        }
    }

    if (students.length === 0) {
        return (
            <div className="rounded-lg border bg-muted/40 p-8 text-center">
                <p className="text-gray-500">No students enrolled in this course.</p>
            </div>
        )
    }

    return (
        <>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="max-md:hidden">Email</TableHead>
                            <TableHead className="max-md:hidden">Official ID</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell>
                                    <Avatar>
                                        <AvatarImage src={student.image || undefined} />
                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell className="font-medium">{student.name}</TableCell>
                                <TableCell className="max-md:hidden">{student.email}</TableCell>
                                <TableCell className="max-md:hidden">{student.officialId || "-"}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => setStudentToDelete(student.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Remove</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Student</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this student from the course? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                confirmDelete()
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isDeleting ? "Removing..." : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
