"use client"

import { useId, useRef, useState, type DragEvent, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, FileUp, Link2, LoaderCircle, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { WorkspacePanel } from "@/components/workspace/workspace-page"
import { useLocalUpload } from "@/hooks/use-local-upload"
import { createMaterial } from "@/lib/actions/material-create.actions"
import { cn } from "@/lib/utils"

const MAX_FILE_SIZE = 2 * 1024 * 1024

type FormErrors = {
    title?: string
    resource?: string
    linkUrl?: string
}

function isValidWebUrl(value: string) {
    try {
        const url = new URL(value)
        return url.protocol === "http:" || url.protocol === "https:"
    } catch {
        return false
    }
}

export function NewMaterialForm() {
    const router = useRouter()
    const inputId = useId()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [linkUrl, setLinkUrl] = useState("")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<FormErrors>({})
    const { startUpload, isUploading } = useLocalUpload()
    const busy = isSubmitting || isUploading

    function selectFile(file?: File) {
        if (!file) return
        if (file.type !== "application/pdf") {
            setErrors((current) => ({ ...current, resource: "Choose a PDF file." }))
            return
        }
        if (file.size > MAX_FILE_SIZE) {
            setErrors((current) => ({ ...current, resource: "The PDF must be 2 MB or smaller." }))
            return
        }

        setSelectedFile(file)
        setErrors((current) => ({ ...current, resource: undefined }))
        if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ""))
    }

    function handleDrop(event: DragEvent<HTMLLabelElement>) {
        event.preventDefault()
        setIsDragging(false)
        selectFile(event.dataTransfer.files?.[0])
    }

    function validate() {
        const nextErrors: FormErrors = {}
        const cleanLink = linkUrl.trim()
        if (!title.trim()) nextErrors.title = "Enter a title for this material."
        if (!selectedFile && !cleanLink) nextErrors.resource = "Add a PDF, an external link, or both."
        if (cleanLink && !isValidWebUrl(cleanLink)) nextErrors.linkUrl = "Enter a complete http:// or https:// link."
        setErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!validate()) return

        setIsSubmitting(true)
        const toastId = toast.loading(selectedFile ? "Uploading material…" : "Creating material…")

        try {
            let fileUrl: string | undefined
            if (selectedFile) {
                const uploaded = await startUpload([selectedFile], "materials")
                if (!uploaded?.[0]) throw new Error("The PDF could not be uploaded.")
                fileUrl = uploaded[0].url
                toast.loading("Saving material…", { id: toastId })
            }

            const result = await createMaterial({
                title: title.trim(),
                description: description.trim(),
                fileUrl,
                linkUrl: linkUrl.trim() || undefined,
            })

            if (!result.success) throw new Error(result.error || "The material could not be created.")

            toast.success("Material created", { id: toastId })
            router.push("/teacher/materials")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong.", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <WorkspacePanel className="overflow-hidden">
                <div className="border-b px-4 py-3 sm:px-5">
                    <h2 className="text-base font-semibold">Create a reusable resource</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Add it to your library now and assign it to courses whenever you need it.</p>
                </div>

                <section className="grid gap-4 border-b px-4 py-4 sm:px-5 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-6">
                    <div>
                        <h3 className="text-sm font-semibold">Details</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Make the resource easy to find later.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor={`${inputId}-title`} className="text-sm font-medium">Title</label>
                            <Input
                                id={`${inputId}-title`}
                                value={title}
                                onChange={(event) => {
                                    setTitle(event.target.value)
                                    if (errors.title) setErrors((current) => ({ ...current, title: undefined }))
                                }}
                                placeholder="Introduction to Biology"
                                maxLength={120}
                                autoFocus
                                aria-invalid={!!errors.title}
                                aria-describedby={errors.title ? `${inputId}-title-error` : undefined}
                            />
                            {errors.title && <p id={`${inputId}-title-error`} className="text-xs text-destructive">{errors.title}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-baseline justify-between gap-3">
                                <label htmlFor={`${inputId}-description`} className="text-sm font-medium">Description</label>
                                <span className="text-xs text-muted-foreground">Optional</span>
                            </div>
                            <Textarea
                                id={`${inputId}-description`}
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder="What will students use this resource for?"
                                className="min-h-24 resize-y"
                                maxLength={600}
                            />
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 px-4 py-4 sm:px-5 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-6">
                    <div>
                        <h3 className="text-sm font-semibold">Resource</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Add a PDF, a link, or both.</p>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="min-w-0 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <FileText className="size-4 text-primary" />
                                PDF attachment
                            </div>
                            {selectedFile ? (
                                <div className="flex min-h-28 items-center gap-3 rounded-md border bg-muted/30 p-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                        <FileText className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB · ready to upload</p>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => {
                                        setSelectedFile(null)
                                        if (fileInputRef.current) fileInputRef.current.value = ""
                                    }} disabled={busy} aria-label="Remove selected PDF">
                                        <X className="size-4" />
                                    </Button>
                                </div>
                            ) : (
                                <label
                                    htmlFor={`${inputId}-file`}
                                    onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    className={cn(
                                        "flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 text-center outline-none transition-colors hover:border-primary/50 hover:bg-primary/[0.03] focus-within:ring-2 focus-within:ring-ring/50",
                                        isDragging && "border-primary bg-primary/[0.05]",
                                        errors.resource && "border-destructive/70",
                                    )}
                                >
                                    <FileUp className="mb-2 size-5 text-muted-foreground" />
                                    <span className="text-sm font-medium">Choose or drop a PDF</span>
                                    <span className="mt-0.5 text-xs text-muted-foreground">Maximum 2 MB</span>
                                    <input
                                        ref={fileInputRef}
                                        id={`${inputId}-file`}
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        className="sr-only"
                                        onChange={(event) => selectFile(event.target.files?.[0])}
                                        disabled={busy}
                                    />
                                </label>
                            )}
                        </div>

                        <div className="min-w-0 space-y-2">
                            <label htmlFor={`${inputId}-link`} className="flex items-center gap-2 text-sm font-medium">
                                <Link2 className="size-4 text-primary" />
                                External link
                                <span className="ml-auto text-xs font-normal text-muted-foreground">Optional</span>
                            </label>
                            <div className="flex min-h-28 flex-col justify-center rounded-md border bg-muted/20 p-3">
                                <Input
                                    id={`${inputId}-link`}
                                    type="url"
                                    inputMode="url"
                                    value={linkUrl}
                                    onChange={(event) => {
                                        setLinkUrl(event.target.value)
                                        if (errors.linkUrl || errors.resource) setErrors((current) => ({ ...current, linkUrl: undefined, resource: undefined }))
                                    }}
                                    placeholder="https://example.com/resource"
                                    aria-invalid={!!errors.linkUrl}
                                    aria-describedby={errors.linkUrl ? `${inputId}-link-error` : undefined}
                                />
                                <p className="mt-2 text-xs text-muted-foreground">Use a video, article, document, or other web resource.</p>
                            </div>
                            {errors.linkUrl && <p id={`${inputId}-link-error`} className="text-xs text-destructive">{errors.linkUrl}</p>}
                        </div>

                        {errors.resource && <p className="text-xs text-destructive lg:col-span-2" aria-live="polite">{errors.resource}</p>}
                    </div>
                </section>

                <div className="flex items-center justify-end gap-2 border-t bg-muted/20 px-4 py-3 sm:px-5">
                    <Button asChild variant="outline">
                        <Link href="/teacher/materials" prefetch>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={busy}>
                        {busy && <LoaderCircle className="size-4 animate-spin" />}
                        {isUploading ? "Uploading…" : isSubmitting ? "Creating…" : "Create material"}
                    </Button>
                </div>
            </WorkspacePanel>
        </form>
    )
}
