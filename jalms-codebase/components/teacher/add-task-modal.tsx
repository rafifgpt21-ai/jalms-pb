"use client"

import { useState, useTransition, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Plus, Loader2, Edit, Trash2 } from "lucide-react"
import { AssignmentType } from "@prisma/client"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Editor } from "@/components/ui/editor"

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
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { createAssignment, updateAssignment, deleteAssignment } from "@/lib/actions/teacher.actions"

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    type: z.enum(["SUBMISSION", "NON_SUBMISSION"]),
    dueDate: z.string().optional(), // We'll parse this to Date
    maxPoints: z.coerce.number().min(0),
    isExtraCredit: z.boolean().default(false),
    latePenalty: z.coerce.number().min(0).max(100).default(0),
})

interface AddTaskModalProps {
    courseId?: string
    assignment?: any // If provided, we are in EDIT mode
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function AddTaskModal({ courseId, assignment, onSuccess, trigger }: AddTaskModalProps) {
    console.log("AddTaskModal rendered. Edit mode:", !!assignment)
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const isEditMode = !!assignment

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            title: "",
            description: "",
            type: "SUBMISSION",
            maxPoints: 100,
            isExtraCredit: false,
            latePenalty: 0,
            dueDate: "",
        },
    })

    // Reset form when opening/changing assignment
    useEffect(() => {
        if (open) {
            if (assignment) {
                form.reset({
                    title: assignment.title,
                    description: assignment.description || "",
                    type: assignment.type,
                    maxPoints: assignment.maxPoints,
                    isExtraCredit: assignment.isExtraCredit,
                    latePenalty: assignment.latePenalty || 0,
                    dueDate: assignment.dueDate ? format(new Date(assignment.dueDate), "yyyy-MM-dd'T'HH:mm") : "",
                })
            } else {
                form.reset({
                    title: "",
                    description: "",
                    type: "SUBMISSION",
                    maxPoints: 100,
                    isExtraCredit: false,
                    latePenalty: 0,
                    dueDate: "",
                })
            }
        }
    }, [open, assignment, form])

    const watchType = form.watch("type")

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log("Submitting form:", values)
        startTransition(async () => {
            try {
                let result;

                if (isEditMode) {
                    console.log("Updating assignment:", assignment.id)
                    result = await updateAssignment({
                        assignmentId: assignment.id,
                        title: values.title,
                        description: values.description,
                        type: values.type as AssignmentType,
                        dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
                        maxPoints: values.maxPoints,
                        isExtraCredit: values.isExtraCredit,
                        latePenalty: values.latePenalty,
                    })
                } else {
                    if (!courseId) {
                        console.error("Course ID is missing")
                        toast.error("Course ID is missing")
                        return
                    }
                    console.log("Creating assignment for course:", courseId)
                    result = await createAssignment({
                        courseId,
                        title: values.title,
                        description: values.description,
                        type: values.type as AssignmentType,
                        dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
                        maxPoints: values.maxPoints,
                        isExtraCredit: values.isExtraCredit,
                        latePenalty: values.latePenalty,
                    })
                }

                console.log("Server action result:", result)

                if (result?.error) {
                    toast.error(result.error)
                } else if (result?.assignment) {
                    toast.success(isEditMode ? "Task updated successfully" : "Task created successfully")
                    setOpen(false)
                    if (!isEditMode) form.reset()
                    onSuccess?.()
                } else {
                    toast.error("Unexpected response from server")
                }
            } catch (error) {
                console.error("Error in onSubmit:", error)
                toast.error("Something went wrong")
            }
        })
    }

    const handleDelete = async () => {
        startTransition(async () => {
            try {
                const result = await deleteAssignment(assignment.id)
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Task deleted successfully")
                    setOpen(false)
                    if (result.courseId) {
                        router.push(`/teacher/courses/${result.courseId}`)
                    }
                }
            } catch (error) {
                toast.error("Failed to delete task")
            }
        })
    }

    const onInvalid = (errors: any) => {
        console.error("Form validation errors:", errors)
        toast.error("Please check the form for errors")
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="ghost" size="sm" className="w-full justify-start pl-8 text-muted-foreground hover:text-primary">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Task
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Edit Task" : "Add New Task"}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? "Update the details of this assignment." : "Create a new assignment or task for this course."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Task Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Chapter 1 Quiz" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Editor
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                            className="min-h-[150px]"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="SUBMISSION">Submission</SelectItem>
                                                <SelectItem value="NON_SUBMISSION">Non-Submission</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="maxPoints"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Max Points</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {watchType === "SUBMISSION" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="dueDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Due Date & Time</FormLabel>
                                            <FormControl>
                                                <Input type="datetime-local" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="latePenalty"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Late Penalty (%)</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="0" max="100" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Percentage deducted if submitted late (0-100).
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        <FormField
                            control={form.control}
                            name="isExtraCredit"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Extra Credit
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="flex justify-between sm:justify-between">
                            {isEditMode && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" type="button" disabled={isPending}>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the assignment and all associated submissions.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditMode ? "Save Changes" : "Create Task"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
