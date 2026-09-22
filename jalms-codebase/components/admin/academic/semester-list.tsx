"use client"

import { AcademicYear, Term } from "@prisma/client"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, CheckCircle2, Trash2 } from "lucide-react"
import { toggleSemesterStatus, deleteSemester } from "@/lib/actions/academic-year.actions"
import { toast } from "sonner"
import { useState } from "react"
import { SemesterModal } from "./semester-modal"
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

interface SemesterListProps {
    terms: (Term & {
        academicYear: AcademicYear
        _count: {
            courses: number
        }
    })[]
}

export function SemesterList({ terms }: SemesterListProps) {
    const [isPending, setIsPending] = useState(false)
    const [semesterToDelete, setSemesterToDelete] = useState<string | null>(null)

    const handleSetActive = async (id: string) => {
        setIsPending(true)
        try {
            const result = await toggleSemesterStatus(id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Active semester updated")
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setIsPending(false)
        }
    }

    const handleDelete = async (id: string) => {
        setIsPending(true)
        try {
            const result = await deleteSemester(id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Semester archived successfully")
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setIsPending(false)
            setSemesterToDelete(null)
        }
    }

    return (
        <div className="overflow-hidden rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Academic Year</TableHead>
                        <TableHead className="max-sm:hidden">Semester</TableHead>
                        <TableHead className="max-md:hidden">Start Date</TableHead>
                        <TableHead className="max-lg:hidden">End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {terms.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No semesters found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        terms.map((term) => (
                            <TableRow key={term.id}>
                                <TableCell className="font-medium">
                                    {term.academicYear.name}
                                    <div className="mt-1 text-xs font-normal text-muted-foreground sm:hidden">
                                        {(term as any).type === "ODD" ? "Odd semester" : "Even semester"}
                                    </div>
                                </TableCell>
                                <TableCell className="max-sm:hidden">
                                    <Badge variant="outline">
                                        {(term as any).type === "ODD" ? "Odd Semester" : "Even Semester"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="max-md:hidden">{format(new Date((term as any).startDate), "PPP")}</TableCell>
                                <TableCell className="max-lg:hidden">{format(new Date((term as any).endDate), "PPP")}</TableCell>
                                <TableCell>
                                    {(term as any).isActive ? (
                                        <StatusBadge status="ACTIVE" label="Active" />
                                    ) : (
                                        <StatusBadge status="INACTIVE" label="Inactive" />
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            {!(term as any).isActive && (
                                                <DropdownMenuItem onClick={() => handleSetActive(term.id)} disabled={isPending}>
                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    Set as Active
                                                </DropdownMenuItem>
                                            )}
                                            <SemesterModal semester={term as any} />
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setSemesterToDelete(term.id)} variant="destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Archive
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <AlertDialog open={!!semesterToDelete} onOpenChange={(open) => !open && setSemesterToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will archive the semester. You can restore it later if needed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                if (semesterToDelete) handleDelete(semesterToDelete)
                            }}
                            disabled={isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isPending ? "Archiving..." : "Archive"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
