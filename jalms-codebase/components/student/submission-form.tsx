"use client"

import { useId, useState } from "react"
import { useRouter } from "next/navigation"
import {
    ExternalLink,
    FileText,
    Link as LinkIcon,
    Loader2,
    Paperclip,
    RefreshCw,
    Send,
    Trash2,
} from "lucide-react"
import { toast } from "sonner"

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
import { Button } from "@/components/ui/button"
import { Editor } from "@/components/ui/editor"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocalUpload } from "@/hooks/use-local-upload"
import { deleteSubmissionFile, submitAssignment } from "@/lib/actions/student.actions"

interface SubmissionFormProps {
    assignmentId: string
    initialUrl?: string
    initialAttachmentUrl?: string
    initialLink?: string
    isLate?: boolean
}

function hasWrittenContent(value: string) {
    return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0
}

export function SubmissionForm({ assignmentId, initialUrl, initialAttachmentUrl, initialLink, isLate }: SubmissionFormProps) {
    const router = useRouter()
    const fileInputId = useId()
    const [url, setUrl] = useState(initialUrl || "")
    const [attachmentUrl, setAttachmentUrl] = useState(initialAttachmentUrl || "")
    const [link, setLink] = useState(initialLink || "")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showLateConfirmation, setShowLateConfirmation] = useState(false)
    const [validationMessage, setValidationMessage] = useState("")
    const { startUpload, isUploading } = useLocalUpload()

    const hasExistingSubmission = Boolean(initialUrl || initialAttachmentUrl || initialLink)
    const hasWork = hasWrittenContent(url) || Boolean(attachmentUrl || selectedFile || link.trim())

    const handleFormSubmit = (event: React.FormEvent) => {
        event.preventDefault()

        if (!hasWork) {
            setValidationMessage("Add a written response, link, or attachment before submitting.")
            return
        }

        setValidationMessage("")
        if (isLate) setShowLateConfirmation(true)
        else void submit()
    }

    const submit = async () => {
        const toastId = toast.loading(hasExistingSubmission ? "Updating submission..." : "Submitting assignment...")
        setIsSubmitting(true)

        try {
            let finalAttachmentUrl = attachmentUrl

            if (selectedFile) {
                toast.loading("Uploading attachment...", { id: toastId })
                const result = await startUpload([selectedFile], "tasks")
                if (!result?.[0]) throw new Error("The attachment could not be uploaded.")
                finalAttachmentUrl = result[0].url
            }

            toast.loading("Saving your work...", { id: toastId })
            const result = await submitAssignment(assignmentId, url, finalAttachmentUrl, link.trim())

            if (result.error) {
                toast.error(result.error, { id: toastId })
                return
            }

            setSelectedFile(null)
            setAttachmentUrl(finalAttachmentUrl)
            setShowLateConfirmation(false)
            toast.success(hasExistingSubmission ? "Submission updated." : "Assignment submitted.", { id: toastId })
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong.", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (file.size > 1024 * 1024) {
            toast.error("The file is larger than the 1 MB limit.")
            event.target.value = ""
            return
        }

        setSelectedFile(file)
        setValidationMessage("")
    }

    const handleRemoveFile = async () => {
        if (selectedFile) {
            setSelectedFile(null)
            const input = document.getElementById(fileInputId) as HTMLInputElement | null
            if (input) input.value = ""
            return
        }

        if (!attachmentUrl) return

        const toastId = toast.loading("Removing attachment...")
        const urlToDelete = attachmentUrl
        setAttachmentUrl("")

        try {
            const result = await deleteSubmissionFile(assignmentId, urlToDelete)
            if (result.error) {
                setAttachmentUrl(urlToDelete)
                toast.error("The attachment could not be removed.", { id: toastId })
            } else {
                toast.success("Attachment removed.", { id: toastId })
                router.refresh()
            }
        } catch {
            setAttachmentUrl(urlToDelete)
            toast.error("The attachment could not be removed.", { id: toastId })
        }
    }

    return (
        <>
            <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                        <Label>Written response</Label>
                        <span className="text-[11px] text-muted-foreground">Optional</span>
                    </div>
                    <Editor
                        value={url}
                        onChange={(value) => {
                            setUrl(value)
                            setValidationMessage("")
                        }}
                        className="min-h-56 text-sm lg:min-h-[22rem]"
                    />
                    <p className="text-xs text-muted-foreground">Write directly here, or submit a link or file below.</p>
                </div>

                <div className="grid items-start gap-4 lg:grid-cols-2">
                    <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-3">
                            <Label htmlFor={`${fileInputId}-link`}>Work link</Label>
                            <span className="text-[11px] text-muted-foreground">Optional</span>
                        </div>
                        <div className="relative">
                            <LinkIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <Input
                                id={`${fileInputId}-link`}
                                type="url"
                                inputMode="url"
                                placeholder="https://docs.google.com/..."
                                value={link}
                                onChange={(event) => {
                                    setLink(event.target.value)
                                    setValidationMessage("")
                                }}
                                disabled={isSubmitting}
                                className="pl-8"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Use a shareable link your teacher can open.</p>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-3">
                            <Label htmlFor={fileInputId}>Attachment</Label>
                            <span className="text-[11px] text-muted-foreground">PDF or DOCX · 1 MB max</span>
                        </div>

                        <input
                            id={fileInputId}
                            type="file"
                            className="sr-only"
                            accept=".pdf,.docx,.doc"
                            onChange={handleFileChange}
                            disabled={isSubmitting}
                        />

                        {!selectedFile && !attachmentUrl ? (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => document.getElementById(fileInputId)?.click()}
                                className="w-full border-dashed bg-muted/20 px-3 text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                                <Paperclip className="size-4" />
                                Choose a file
                            </Button>
                        ) : (
                            <div className="flex min-h-8 items-center justify-between gap-3 rounded-md border bg-muted/30 px-2.5 py-1">
                                <div className="flex min-w-0 items-center gap-2">
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-primary">
                                        <FileText className="size-3.5" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-medium">{selectedFile ? selectedFile.name : "Attached file"}</p>
                                        {selectedFile ? (
                                            <p className="text-[10px] text-amber-700 dark:text-amber-300">Uploads when you submit</p>
                                        ) : (
                                            <a
                                                href={attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                                            >
                                                Open file <ExternalLink className="size-3" aria-hidden="true" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => document.getElementById(fileInputId)?.click()}
                                        disabled={isSubmitting}
                                        aria-label="Replace attachment"
                                    >
                                        <RefreshCw className="size-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => void handleRemoveFile()}
                                        disabled={isSubmitting}
                                        aria-label="Remove attachment"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {validationMessage && (
                    <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
                        {validationMessage}
                    </p>
                )}

                <div className="sticky -bottom-3 z-10 -mx-3 -mb-3 border-t bg-card/95 px-3 py-3 supports-[backdrop-filter]:bg-card/90 supports-[backdrop-filter]:backdrop-blur-sm">
                    {isLate && (
                        <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">This will be recorded as a late submission.</p>
                    )}
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                {isUploading ? "Uploading attachment..." : "Saving..."}
                            </>
                        ) : (
                            <>
                                <Send className="size-4" />
                                {hasExistingSubmission ? "Update submission" : "Submit assignment"}
                            </>
                        )}
                    </Button>
                </div>
            </form>

            <AlertDialog open={showLateConfirmation} onOpenChange={setShowLateConfirmation}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submit this work late?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The due date has passed, so your teacher will see this as a late submission.
                            {hasExistingSubmission && " Updating it may also require the teacher to review your grade again."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void submit()}>
                            Submit late
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
