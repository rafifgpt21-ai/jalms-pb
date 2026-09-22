"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { useLocalUpload } from "@/hooks/use-local-upload"
import { createMaterial, updateMaterial, deleteMaterialFile } from "@/lib/actions/material.actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, X, FileText, Upload, Trash, RefreshCw, ExternalLink } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    fileUrl: z.string().optional(),
    linkUrl: z.string().optional(),
})

interface MaterialFormProps {
    initialData?: {
        id: string
        title: string
        description?: string | null
        fileUrl?: string | null
        linkUrl?: string | null
    }
    courseId?: string
}

export function MaterialForm({ initialData, courseId }: MaterialFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [existingFileUrl, setExistingFileUrl] = useState(initialData?.fileUrl || "")

    const { startUpload, isUploading } = useLocalUpload()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData?.title || "",
            description: initialData?.description || "",
            fileUrl: initialData?.fileUrl || "",
            linkUrl: initialData?.linkUrl || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const toastId = toast.loading(initialData ? "Updating material..." : "Creating material...")

        setIsSubmitting(true)
        try {
            let fileUrl = existingFileUrl

            // If a new file is selected, upload it first
            if (selectedFile) {
                toast.loading("Uploading file...", { id: toastId })
                const uploadRes = await startUpload([selectedFile], "materials")
                if (!uploadRes || !uploadRes[0]) {
                    throw new Error("Failed to upload file")
                }
                fileUrl = uploadRes[0].url
            }

            if (!fileUrl && !values.linkUrl) {
                toast.error("Please provide either a file or a link", { id: toastId })
                setIsSubmitting(false)
                return
            }

            toast.loading("Saving changes...", { id: toastId })

            let res;
            if (initialData) {
                res = await updateMaterial(
                    initialData.id,
                    values.title,
                    values.description || "",
                    fileUrl || null,
                    values.linkUrl || null,
                )
            } else {
                res = await createMaterial({
                    title: values.title,
                    description: values.description || "",
                    fileUrl: fileUrl || undefined,
                    linkUrl: values.linkUrl || undefined,
                })
            }

            if (!res.success) {
                toast.error(`Server Error: ${res.error}`, { id: toastId })
            }

            if (res.success || res.material) {
                toast.success(initialData ? "Material updated" : "Material created", { id: toastId })
                if (courseId) {
                    router.push(`/teacher/courses/${courseId}`)
                } else {
                    router.push(`/teacher/materials`)
                }
            } else {
                toast.error(res.error || "Operation failed", { id: toastId })
            }
        } catch (error) {
            console.error("Submission error:", error)
            toast.error(error instanceof Error ? error.message : "Something went wrong", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.type !== "application/pdf") {
                toast.error("Only PDF files are allowed")
                return
            }
            if (file.size > 2 * 1024 * 1024) {
                toast.error("File size must be less than 2MB")
                return
            }
            setSelectedFile(file)
            // Auto-fill title if empty
            if (!form.getValues("title")) {
                form.setValue("title", file.name.replace(".pdf", ""))
            }
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.log("Form Errors:", errors))} className="space-y-8">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="Introduction to Biology" {...field} />
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
                                <Textarea
                                    placeholder="Brief description of the material..."
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid gap-6 md:grid-cols-2">
                    {/* File Upload Section */}
                    <div className="space-y-4 rounded-lg border p-4 bg-card">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded text-blue-600">
                                <FileText className="h-4 w-4" />
                            </div>
                            <h3 className="font-medium text-sm">File Attachment</h3>
                        </div>

                        {!existingFileUrl && !selectedFile && (
                            <div
                                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                                className={`
                                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                                    hover:border-blue-500/50 hover:bg-muted/50
                                `}
                            >
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    disabled={isUploading || isSubmitting}
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-2 bg-muted rounded-full">
                                        <Upload className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Upload PDF</p>
                                        <p className="text-xs text-muted-foreground">Max 2MB</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedFile && (
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <FileText className="h-4 w-4 text-green-600 shrink-0" />
                                    <div className="truncate">
                                        <p className="text-sm font-medium text-green-900 dark:text-green-300 truncate">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-xs text-green-600 dark:text-green-400">
                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedFile(null)}
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {existingFileUrl && !selectedFile && (
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/50">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <div className="truncate">
                                        <p className="text-sm font-medium">Current File Attached</p>
                                        <a
                                            href={existingFileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-muted-foreground hover:underline truncate block"
                                        >
                                            {existingFileUrl.split('/').pop()}
                                        </a>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash className="h-3 w-3" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Remove file?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the file from the server. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={async () => {
                                                        if (initialData?.id) {
                                                            const toastId = toast.loading("Removing file...")
                                                            try {
                                                                const res = await deleteMaterialFile(initialData.id, existingFileUrl)
                                                                if (res.success) {
                                                                    setExistingFileUrl("")
                                                                    toast.success("File removed", { id: toastId })
                                                                    router.refresh()
                                                                } else {
                                                                    toast.error(res.error || "Failed to remove file", { id: toastId })
                                                                }
                                                            } catch (error) {
                                                                toast.error("Something went wrong", { id: toastId })
                                                            }
                                                        }
                                                    }}
                                                    className="bg-red-500 hover:bg-red-600"
                                                >
                                                    Remove
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>

                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        disabled={isUploading || isSubmitting}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Link Section */}
                    <div className="space-y-4 rounded-lg border p-4 bg-card">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded text-purple-600">
                                <ExternalLink className="h-4 w-4" />
                            </div>
                            <h3 className="font-medium text-sm">External Link</h3>
                        </div>

                        <FormField
                            control={form.control}
                            name="linkUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input {...field} placeholder="https://youtube.com/..." />
                                    </FormControl>
                                    <FormDescription>
                                        Paste a URL to a video or article.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.back()}
                        disabled={isSubmitting || isUploading}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || isUploading}>
                        {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? "Save Changes" : "Create Material"}
                    </Button>
                </div>
            </form>
        </Form >
    )
}
