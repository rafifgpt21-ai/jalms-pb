"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createSemester, updateSemester } from "@/lib/actions/academic-year.actions"
import { toast } from "sonner"
import { Plus } from "lucide-react"

const formSchema = z.object({
    academicYearName: z.string().min(1, "Academic Year is required"),
    type: z.enum(["ODD", "EVEN"]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
})

interface SemesterModalProps {
    semester?: {
        id: string
        academicYear: { name: string }
        type: "ODD" | "EVEN" | string
        startDate: Date
        endDate: Date
    }
}

export function SemesterModal({ semester }: SemesterModalProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            academicYearName: semester?.academicYear.name || "",
            type: (semester?.type as "ODD" | "EVEN") || "ODD",
            startDate: semester?.startDate ? new Date(semester.startDate).toISOString().split("T")[0] : "",
            endDate: semester?.endDate ? new Date(semester.endDate).toISOString().split("T")[0] : "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            let result
            if (semester) {
                result = await updateSemester(semester.id, {
                    academicYearName: values.academicYearName,
                    type: values.type,
                    startDate: new Date(values.startDate),
                    endDate: new Date(values.endDate),
                })
            } else {
                // @ts-ignore - type mismatch with Prisma enum but strings match
                result = await createSemester({
                    academicYearName: values.academicYearName,
                    type: values.type,
                    startDate: new Date(values.startDate),
                    endDate: new Date(values.endDate),
                })
            }

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(semester ? "Semester updated successfully" : "Semester created successfully")
                setOpen(false)
                form.reset()
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {semester ? (
                    <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                        Edit
                    </div>
                ) : (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Semester
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{semester ? "Edit Semester" : "Add Semester"}</DialogTitle>
                    <DialogDescription>
                        {semester ? "Update semester details." : "Create a new semester. This will automatically create or update the associated Academic Year."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="academicYearName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Academic Year</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. 2024/2025" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Semester</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select semester" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ODD">Odd Semester</SelectItem>
                                            <SelectItem value="EVEN">Even Semester</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Start Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="endDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>End Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (semester ? "Updating..." : "Creating...") : (semester ? "Update" : "Create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
