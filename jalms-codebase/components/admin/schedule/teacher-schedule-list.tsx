"use client"

import { User, Course, Term, AcademicYear, Class, Subject } from "@prisma/client"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

interface TeacherWithCourses extends User {
    taughtCourses: (Course & {
        term: Term & { academicYear: AcademicYear };
        class: Class | null;
        subject: Subject | null;
        _count: { students: number };
    })[]
}

interface TeacherScheduleListProps {
    teachers: TeacherWithCourses[]
}

export function TeacherScheduleList({ teachers }: TeacherScheduleListProps) {
    if (teachers.length === 0) {
        return (
            <div className="rounded-lg border bg-muted/40 p-8 text-center">
                <p className="text-gray-500">No teachers with assigned courses found.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {teachers.map((teacher) => (
                <Card key={teacher.id}>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-bold">{teacher.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{teacher.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href={`/admin/schedule/${teacher.id}`}>
                                    <Button variant="outline" size="sm">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Manage
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course Name</TableHead>
                                    <TableHead>Semester</TableHead>
                                    <TableHead>Students</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teacher.taughtCourses.map((course) => (
                                    <TableRow key={course.id}>
                                        <TableCell className="font-medium">{course.name}</TableCell>
                                        <TableCell>
                                            {course.term.academicYear.name} - {course.term.type}
                                            {course.term.isActive && <StatusBadge status="ACTIVE" label="Active" className="ml-2 text-xs" />}
                                        </TableCell>
                                        <TableCell>{course._count.students}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
