"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Toggle } from "@/components/ui/toggle"
import {
    Bold,
    Italic,
    Link2,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Unlink,
} from "lucide-react"
import React, { useEffect } from 'react'

import { cn } from "@/lib/utils"

interface EditorProps {
    value: string
    onChange: (value: string) => void
    editable?: boolean
    className?: string
    id?: string
    ariaLabel?: string
    placeholder?: string
}

export function Editor({ value, onChange, editable = true, className, id, ariaLabel, placeholder }: EditorProps) {
    // Force re-render on editor state changes to update toolbar active states
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                link: {
                    openOnClick: !editable,
                    autolink: true,
                    defaultProtocol: "https",
                    HTMLAttributes: {
                        rel: "noopener noreferrer",
                        target: "_blank",
                    },
                },
            }),
        ],
        content: value,
        editable: editable,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        onSelectionUpdate: () => {
            forceUpdate()
        },
        onTransaction: () => {
            forceUpdate()
        },
        editorProps: {
            attributes: {
                ...(id ? { id } : {}),
                ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
                class: cn(
                    "rich-text-content max-w-none focus:outline-none",
                    editable && "min-h-[400px] p-4",
                    className,
                ),
            },
        },
    })

    useEffect(() => {
        if (!editor || editor.getHTML() === value) return
        editor.commands.setContent(value, { emitUpdate: false })
    }, [editor, value])

    if (!editor) {
        return null
    }

    if (!editable) return <EditorContent editor={editor} />

    function updateLink() {
        if (!editor) return
        const previousUrl = editor.getAttributes("link").href as string | undefined
        const url = window.prompt("Enter a URL", previousUrl || "https://")
        if (url === null) return
        if (!url.trim()) {
            editor.chain().focus().extendMarkRange("link").unsetLink().run()
            return
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run()
    }

    return (
        <div className="overflow-hidden rounded-md border bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
            <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1.5" aria-label="Text formatting">
                <Toggle
                    size="sm"
                    pressed={editor.isActive('bold')}
                    onPressedChange={() => editor.chain().focus().toggleBold().run()}
                    aria-label="Bold"
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive('italic')}
                    onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                    aria-label="Italic"
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive('underline')}
                    onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                    aria-label="Underline"
                    title="Underline"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Toggle>
                <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
                <Toggle
                    size="sm"
                    pressed={editor.isActive('bulletList')}
                    onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                    aria-label="Bulleted list"
                    title="Bulleted list"
                >
                    <List className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive('orderedList')}
                    onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                    aria-label="Numbered list"
                    title="Numbered list"
                >
                    <ListOrdered className="h-4 w-4" />
                </Toggle>
                <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
                <Toggle
                    size="sm"
                    pressed={editor.isActive('link')}
                    onPressedChange={updateLink}
                    aria-label="Add or edit link"
                    title="Add or edit link"
                >
                    <Link2 className="h-4 w-4" />
                </Toggle>
                {editor.isActive('link') && (
                    <Toggle
                        size="sm"
                        pressed={false}
                        onPressedChange={() => editor.chain().focus().unsetLink().run()}
                        aria-label="Remove link"
                        title="Remove link"
                    >
                        <Unlink className="h-4 w-4" />
                    </Toggle>
                )}
            </div>
            <div className="relative">
                {editor.isEmpty && placeholder && (
                    <span className="pointer-events-none absolute left-4 top-3.5 text-sm text-muted-foreground/70">
                        {placeholder}
                    </span>
                )}
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}

export function RichTextContent({ value, className, ariaLabel }: Pick<EditorProps, "value" | "className" | "ariaLabel">) {
    return <Editor value={value} onChange={() => undefined} editable={false} className={className} ariaLabel={ariaLabel} />
}
