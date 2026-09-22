"use client"

import { useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import {
    ChevronDown,
    HelpCircle,
    Loader2,
    Trash2,
} from "lucide-react"
import { AssignmentType, AcademicDomain } from "@prisma/client"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Editor } from "@/components/ui/editor"
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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    QuizLibraryPicker,
    type QuizPickerFolder,
    type QuizPickerItem,
} from "@/components/teacher/quiz/quiz-library-picker"
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

const DOMAIN_LABELS: Record<AcademicDomain, string> = {
    SCIENCE_TECHNOLOGY: "Science and Technology",
    SOCIAL_HUMANITIES: "Social Sciences and Humanities",
    LANGUAGE_COMMUNICATION: "Language and Communication",
    ARTS_CREATIVITY: "Arts and Creativity",
    PHYSICAL_EDUCATION: "Physical Education",
    SPIRITUALITY_ETHICS: "Spirituality & Ethics",
}

const TASK_TYPE_OPTIONS = [
    {
        value: "SUBMISSION",
        label: "Submission",
    },
    {
        value: "NON_SUBMISSION",
        label: "In-class",
    },
    {
        value: "QUIZ",
        label: "Quiz",
    },
] as const

const formSchema = z.object({
    title: z.string().trim().min(1, "Task name is required"),
    description: z.string().optional(),
    type: z.enum(["SUBMISSION", "NON_SUBMISSION", "QUIZ"]),
    dueDate: z.string().optional(),
    maxPoints: z.coerce.number().min(0),
    isExtraCredit: z.boolean().default(false),
    latePenalty: z.coerce.number().min(0).max(100).default(0),
    academicDomains: z.array(z.nativeEnum(AcademicDomain)).optional(),
    quizId: z.string().optional(),
    showGradeAfterSubmission: z.boolean().default(true),
}).superRefine((values, ctx) => {
    if (values.type === "QUIZ" && !values.quizId) {
        ctx.addIssue({
            code: "custom",
            message: "Choose a quiz to continue",
            path: ["quizId"],
        })
    }
})

type TaskFormInput = z.input<typeof formSchema>
type TaskFormValues = z.output<typeof formSchema>

interface TaskFormProps {
    courseId?: string
    initialData?: TaskFormAssignment
    course?: TaskFormCourse
    assignment?: TaskFormAssignment // Legacy alias for initialData
    quizzes?: QuizPickerItem[]
    quizFolders?: QuizPickerFolder[]
}

interface TaskFormCourse {
    id?: string
    name?: string
    subject?: {
        academicDomains?: AcademicDomain[]
    } | null
}

interface TaskFormAssignment {
    id: string
    courseId: string
    title: string
    description?: string | null
    type: AssignmentType
    dueDate?: Date | string | null
    maxPoints: number
    isExtraCredit: boolean
    latePenalty?: number | null
    academicDomains?: AcademicDomain[]
    quizId?: string | null
    showGradeAfterSubmission?: boolean
}

export function TaskForm({ courseId, initialData, assignment, course, quizzes = [], quizFolders = [] }: TaskFormProps) {
    // Handle alias
    const data = initialData || assignment
    const effectiveCourseId = courseId || data?.courseId

    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const isEditMode = !!data

    // State for customizing domains
    const [customizeDomains, setCustomizeDomains] = useState(
        () => (data?.academicDomains?.length || 0) > 0
    )

    // Determine default tags from course subject
    const subjectDomains: AcademicDomain[] = course?.subject?.academicDomains || []

    const form = useForm<TaskFormInput, unknown, TaskFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: data?.title || "",
            description: data?.description || "",
            type: data?.type || "SUBMISSION",
            maxPoints: data?.maxPoints || 100,
            isExtraCredit: data?.isExtraCredit || false,
            latePenalty: data?.latePenalty || 0,
            dueDate: data?.dueDate ? format(new Date(data.dueDate), "yyyy-MM-dd'T'HH:mm") : "",
            academicDomains: data?.academicDomains || [], // Initialize with saved tags
            quizId: data?.quizId || undefined,
            showGradeAfterSubmission: data?.showGradeAfterSubmission ?? true,
        },
    })

    // If editing and we have tags that differ from subject tags (or if we have tags and no subject), we might want to default "customize" to true
    // Logic: If assignment has tags, assume customized. If empty, rely on logic -> BUT empty array means "no override" usually?
    // Wait, requirement: "Assignment tags are optional overrides. If has no tags, inherits."
    // So if data.academicDomains is valid and length > 0, we turn on customize.
    // If length is 0, we can assume it's inheriting (unless user explicitly cleared them, but for now 0 means inherit).

    const watchType = useWatch({ control: form.control, name: "type" })
    const selectedDomains = useWatch({ control: form.control, name: "academicDomains" }) || []
    const acceptsStudentWork = watchType === "SUBMISSION" || watchType === "QUIZ"
    const selectedDomainSummary = selectedDomains.length === 0
        ? "Choose domains"
        : selectedDomains.length === 1
            ? DOMAIN_LABELS[selectedDomains[0]]
            : `${selectedDomains.length} domains selected`

    const handleDomainCustomization = (checked: boolean) => {
        if (checked && selectedDomains.length === 0 && subjectDomains.length > 0) {
            form.setValue("academicDomains", subjectDomains, { shouldDirty: true })
        }
        setCustomizeDomains(checked)
    }

    function onSubmit(values: TaskFormValues) {
        // If customization is OFF, send empty array (or undefined handled by backend?)
        // Backend logic: "stores tags". Profile calculation logic will check Assignment tags first.
        // If customization is turned OFF by user, we should clear the tags in the submission.
        // So if !customizeDomains, we set academicDomains = []. 
        // Wait, if I send [], does backend treat it as "no override" or "no domains"?
        // Requirement: "If an assignment has no tags, it inherits from its subject."
        // So saving [] means "Inherit". That works.

        const academicDomainsPayload = customizeDomains ? values.academicDomains : []
        const hasOnlineSubmission = values.type === "SUBMISSION" || values.type === "QUIZ"
        const dueDate = hasOnlineSubmission && values.dueDate ? new Date(values.dueDate) : undefined
        const latePenalty = hasOnlineSubmission ? values.latePenalty : 0
        const quizId = values.type === "QUIZ" ? values.quizId : undefined

        startTransition(async () => {
            try {
                let result;

                if (data) {
                    result = await updateAssignment({
                        assignmentId: data.id,
                        title: values.title,
                        description: values.description,
                        type: values.type as AssignmentType,
                        dueDate,
                        maxPoints: values.maxPoints,
                        isExtraCredit: values.isExtraCredit,
                        latePenalty,
                        academicDomains: academicDomainsPayload,
                        quizId,
                        showGradeAfterSubmission: values.showGradeAfterSubmission,
                    })
                } else {
                    if (!effectiveCourseId) {
                        toast.error("Course ID is missing")
                        return
                    }
                    result = await createAssignment({
                        courseId: effectiveCourseId,
                        title: values.title,
                        description: values.description,
                        type: values.type as AssignmentType,
                        dueDate,
                        maxPoints: values.maxPoints,
                        isExtraCredit: values.isExtraCredit,
                        latePenalty,
                        academicDomains: academicDomainsPayload,
                        quizId,
                        showGradeAfterSubmission: values.showGradeAfterSubmission,
                    })
                }

                if (result?.error) {
                    toast.error(result.error)
                } else if (result?.assignment) {
                    toast.success(isEditMode ? "Task updated successfully" : "Task created successfully")
                    router.push(`/teacher/courses/${effectiveCourseId}/tasks/${result.assignment.id}`)
                    router.refresh()
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
        if (!data) return

        startTransition(async () => {
            try {
                const result = await deleteAssignment(data.id)
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Task deleted successfully")
                    router.push(`/teacher/courses/${result.courseId}`)
                    router.refresh()
                }
            } catch {
                toast.error("Failed to delete task")
            }
        })
    }

    return (
        <div className="mx-auto w-full max-w-5xl pb-20 sm:pb-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, () => toast.error("Please review the highlighted fields"))}>
                    <div className="rounded-md border bg-card shadow-xs">
                        <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
                            <section className="space-y-4 p-4 lg:border-r">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Content</h2>
                                    <TaskFormHelp />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Task name</FormLabel>
                                            <FormControl>
                                                <Input autoFocus placeholder="e.g. Chapter 1 reflection" maxLength={160} {...field} />
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
                                            <div className="flex items-center justify-between gap-3">
                                                <FormLabel>Instructions</FormLabel>
                                                <span className="text-xs text-muted-foreground">Optional</span>
                                            </div>
                                            <FormControl>
                                                <Editor value={field.value || ""} onChange={field.onChange} className="min-h-[160px]" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-3 border-t pt-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">Learning profile</span>
                                            {!customizeDomains && <Badge variant="secondary">Subject defaults</Badge>}
                                        </div>
                                        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-medium sm:min-h-8">
                                            Customize
                                            <Switch
                                                checked={customizeDomains}
                                                onCheckedChange={handleDomainCustomization}
                                                aria-label="Customize academic domains"
                                            />
                                        </label>
                                    </div>

                                    {!customizeDomains ? (
                                        <div className="flex min-h-8 flex-wrap items-center gap-1.5">
                                            {subjectDomains.length > 0 ? subjectDomains.map((domain) => (
                                                <Badge key={domain} variant="outline">{DOMAIN_LABELS[domain]}</Badge>
                                            )) : (
                                                <span className="text-xs text-muted-foreground">No subject domains</span>
                                            )}
                                        </div>
                                    ) : (
                                        <FormField
                                            control={form.control}
                                            name="academicDomains"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                                                <span className="truncate">{selectedDomainSummary}</span>
                                                                <ChevronDown className="size-4 text-muted-foreground" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent align="start" className="w-[22rem] p-2">
                                                            <div className="border-b px-2 pb-2 text-xs font-semibold">Academic domains</div>
                                                            <div className="grid gap-1 pt-2">
                                                                {(Object.keys(DOMAIN_LABELS) as AcademicDomain[]).map((domain) => {
                                                                    const checked = field.value?.includes(domain) ?? false
                                                                    return (
                                                                        <label
                                                                            key={domain}
                                                                            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted sm:min-h-9"
                                                                        >
                                                                            <Checkbox
                                                                                checked={checked}
                                                                                onCheckedChange={(nextChecked) => {
                                                                                    const current = field.value || []
                                                                                    field.onChange(
                                                                                        nextChecked
                                                                                            ? [...current, domain]
                                                                                            : current.filter((value) => value !== domain)
                                                                                    )
                                                                                }}
                                                                            />
                                                                            <span>{DOMAIN_LABELS[domain]}</span>
                                                                        </label>
                                                                    )
                                                                })}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </section>

                            <aside className="space-y-4 border-t p-4 lg:border-t-0">
                                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Settings</h2>

                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Task type</FormLabel>
                                            <FormControl>
                                                <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                                                    {TASK_TYPE_OPTIONS.map((option) => (
                                                        <label
                                                            key={option.value}
                                                            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-sm px-2 text-xs font-medium transition-colors sm:min-h-8 ${field.value === option.value ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                                                        >
                                                            <RadioGroupItem value={option.value} className="sr-only" />
                                                            {option.label}
                                                        </label>
                                                    ))}
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {watchType === "QUIZ" && (
                                    <FormField
                                        control={form.control}
                                        name="quizId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quiz</FormLabel>
                                                <FormControl>
                                                    <QuizLibraryPicker
                                                        quizzes={quizzes}
                                                        folders={quizFolders}
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                    />
                                                </FormControl>
                                                {quizzes.length === 0 && (
                                                    <FormDescription>
                                                        Create a quiz in the <Link href="/teacher/quiz-manager" className="font-medium text-primary hover:underline">Quiz Manager</Link> first.
                                                    </FormDescription>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="maxPoints"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Points</FormLabel>
                                                <div className="relative">
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            className="pr-12"
                                                            {...field}
                                                            value={typeof field.value === "string" || typeof field.value === "number" ? field.value : ""}
                                                        />
                                                    </FormControl>
                                                    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">pts</span>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {acceptsStudentWork && (
                                        <FormField
                                            control={form.control}
                                            name="latePenalty"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Late penalty</FormLabel>
                                                    <div className="relative">
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                className="pr-9"
                                                                {...field}
                                                                value={typeof field.value === "string" || typeof field.value === "number" ? field.value : ""}
                                                            />
                                                        </FormControl>
                                                        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">%</span>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>

                                {acceptsStudentWork && (
                                    <FormField
                                        control={form.control}
                                        name="dueDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-center justify-between gap-3">
                                                    <FormLabel>Due date</FormLabel>
                                                    <span className="text-xs text-muted-foreground">Optional</span>
                                                </div>
                                                <FormControl>
                                                    <Input type="datetime-local" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <div className="divide-y border-y">
                                    <FormField
                                        control={form.control}
                                        name="isExtraCredit"
                                        render={({ field }) => (
                                            <FormItem className="flex min-h-11 grid-cols-none items-center justify-between gap-3 py-2">
                                                <FormLabel>Extra credit</FormLabel>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    {watchType === "QUIZ" && (
                                        <FormField
                                            control={form.control}
                                            name="showGradeAfterSubmission"
                                            render={({ field }) => (
                                                <FormItem className="flex min-h-11 grid-cols-none items-center justify-between gap-3 py-2">
                                                    <FormLabel>Show grade immediately</FormLabel>
                                                    <FormControl>
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </aside>
                        </div>

                        <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 rounded-b-md border-t bg-card p-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center">
                                {isEditMode && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" type="button" disabled={isPending} className="w-full sm:w-auto">
                                                <Trash2 className="size-4" />
                                                Delete task
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This permanently deletes the task and all associated submissions. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Keep task</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                    Delete task
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button type="button" variant="outline" asChild className="flex-1 sm:flex-none">
                                    <Link href={isEditMode ? `/teacher/courses/${effectiveCourseId}/tasks/${data?.id}` : `/teacher/courses/${effectiveCourseId}/tasks`}>
                                        Cancel
                                    </Link>
                                </Button>
                                <Button type="submit" disabled={isPending} className="flex-1 sm:min-w-28 sm:flex-none">
                                    {isPending && <Loader2 className="size-4 animate-spin" />}
                                    {isEditMode ? "Save changes" : "Create task"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    )
}

function TaskFormHelp() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm">
                    <HelpCircle className="size-4" />
                    Help
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[23rem] p-0">
                <div className="border-b px-3 py-2.5">
                    <p className="text-sm font-semibold">Task setup help</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">How each setting affects students and grading.</p>
                </div>
                <div className="max-h-[min(28rem,70dvh)] space-y-3 overflow-y-auto p-3 text-xs">
                    <HelpSection title="Task types">
                        <strong>Submission</strong> collects student work. <strong>In-class</strong> records an offline activity. <strong>Quiz</strong> assigns an item from the quiz library.
                    </HelpSection>
                    <HelpSection title="Instructions">
                        Add the expected outcome, useful resources, and submission requirements. This field is optional.
                    </HelpSection>
                    <HelpSection title="Grading and deadline">
                        Points set the maximum score. A late penalty deducts a percentage from late work. Leave the due date empty when there is no deadline.
                    </HelpSection>
                    <HelpSection title="Extra credit">
                        Extra-credit points can raise a student’s score but are excluded from the normal course-point total.
                    </HelpSection>
                    <HelpSection title="Quiz grade visibility">
                        “Show grade immediately” reveals the quiz score as soon as a student submits.
                    </HelpSection>
                    <HelpSection title="Learning profile">
                        By default, the task inherits academic domains from its subject. Turn on Customize to choose task-specific domains.
                    </HelpSection>
                </div>
            </PopoverContent>
        </Popover>
    )
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-1 leading-5 text-muted-foreground">{children}</p>
        </section>
    )
}
