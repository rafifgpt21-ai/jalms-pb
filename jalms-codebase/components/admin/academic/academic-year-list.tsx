"use client"

import { AcademicYear } from "@prisma/client"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Calendar, CheckCircle2, Trash2 } from "lucide-react"
import { setActiveAcademicYear, deleteAcademicYear } from "@/lib/actions/academic-year.actions"
import { toast } from "sonner"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface AcademicYearListProps {
    years: (AcademicYear & {
        _count: {
            classes: number
            terms: number
        }
    })[]
}

export function AcademicYearList({ years }: AcademicYearListProps) {
    const [isPending, setIsPending] = useState(false)

    const handleSetActive = async (id: string) => {
        setIsPending(true)
        try {
            const result = await setActiveAcademicYear(id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Active academic year updated")
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setIsPending(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will archive the academic year.")) return

        setIsPending(true)
        try {
            const result = await deleteAcademicYear(id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Academic year archived")
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setIsPending(false)
        }
    }

    if (years.length === 0) {
        return (
            <div className="rounded-lg border border-dashed bg-card py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">No academic years</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new academic year.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {years.map((year) => (
                <Card key={year.id} className={cn("transition-all", year.isActive ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10" : "hover:border-gray-400")}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-semibold">
                                {year.name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {format(new Date(year.startDate), "MMM yyyy")} - {format(new Date(year.endDate), "MMM yyyy")}
                            </CardDescription>
                        </div>
                        {year.isActive ? (
                            <StatusBadge status="ACTIVE" label="Active" />
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleSetActive(year.id)} disabled={isPending}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Set as Active
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDelete(year.id)} disabled={isPending} variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Archive
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground mt-2">
                            <div className="flex flex-col">
                                <span className="font-semibold text-foreground">{year._count.terms}</span>
                                <span>Terms</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-foreground">{year._count.classes}</span>
                                <span>Classes</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
