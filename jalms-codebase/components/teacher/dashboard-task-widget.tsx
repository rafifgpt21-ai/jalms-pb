"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { Clock, FileText, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface DashboardTaskWidgetProps {
    className?: string
    tasks: any[]
    courses: any[]
}

export function DashboardTaskWidget({ className, tasks, courses }: DashboardTaskWidgetProps) {
    const [selectedCourse, setSelectedCourse] = useState<string>("all")

    const filteredTasks = selectedCourse === "all"
        ? tasks
        : tasks.filter(task => task.course.id === selectedCourse)

    return (
        <Card className={cn("col-span-1 h-[400px] flex flex-col", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base font-semibold">All Tasks</CardTitle>
                <div className="w-[180px]">
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="All Courses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Courses</SelectItem>
                            {courses.map(course => (
                                <SelectItem key={course.id} value={course.id}>
                                    {course.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pr-2">
                <div className="space-y-4">
                    {filteredTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No tasks found</p>
                        </div>
                    )}
                    {filteredTasks.map((assignment: any) => {
                        const gradedCount = assignment.submissions.length
                        const totalStudents = assignment.course._count.students
                        const progress = `${gradedCount}/${totalStudents}`
                        const progressPercentage = totalStudents > 0 ? (gradedCount / totalStudents) * 100 : 0

                        return (
                            <div key={assignment.id} className="flex flex-col gap-3 border-b last:border-0 pb-4 last:pb-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium leading-none truncate">{assignment.title}</p>
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-wider opacity-70">
                                                {assignment.type}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {assignment.course.name}
                                        </p>
                                    </div>
                                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs shrink-0 bg-secondary/50 hover:bg-secondary">
                                        <Link href={`/teacher/courses/${assignment.course.id}/tasks/${assignment.id}`}>
                                            View
                                        </Link>
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>
                                                {format(new Date(assignment.dueDate), "MMM d, h:mm a")}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground/80">
                                            {progress} Graded
                                        </span>
                                        {/* Optional mini progress bar */}
                                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary/70 rounded-full"
                                                style={{ width: `${progressPercentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
