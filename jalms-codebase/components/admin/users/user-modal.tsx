"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { User } from "@prisma/client"
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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { createUser, updateUser } from "@/lib/actions/user.actions"
import { toast } from "sonner"
import { Plus } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().optional(),
    roles: z.array(z.enum(["ADMIN", "SUBJECT_TEACHER", "HOMEROOM_TEACHER", "STUDENT", "PARENT"])).min(1, "At least one role is required"),
    nip: z.string().optional(),
    nis: z.string().optional(),
    nisn: z.string().optional(),
})

interface UserModalProps {
    initialData?: User | null
    open?: boolean
    onOpenChange?: (open: boolean) => void
    showTrigger?: boolean
    trigger?: ReactNode
}

const ROLES = [
    { id: "ADMIN", label: "Admin" },
    { id: "SUBJECT_TEACHER", label: "Subject Teacher" },
    { id: "HOMEROOM_TEACHER", label: "Homeroom Teacher" },
    { id: "STUDENT", label: "Student" },
    { id: "PARENT", label: "Parent" },
] as const

export function UserModal({ initialData, open: controlledOpen, onOpenChange, showTrigger = true, trigger }: UserModalProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = onOpenChange || setInternalOpen

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            roles: ["STUDENT"],
            nip: "",
            nis: "",
            nisn: "",
        },
    })

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                email: initialData.email,
                password: "", // Don't populate password
                roles: initialData.roles as z.infer<typeof formSchema>["roles"],
                nip: initialData.nip || "",
                nis: initialData.nis || "",
                nisn: initialData.nisn || "",
            })
        } else {
            form.reset({
                name: "",
                email: "",
                password: "",
                roles: ["STUDENT"],
                nip: "",
                nis: "",
                nisn: "",
            })
        }
    }, [initialData, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!initialData && !values.password) {
            form.setError("password", { message: "Password is required for new users" })
            return
        }

        setIsLoading(true)
        try {
            const payload = {
                ...values,
                // roles is already an array
            }

            let result
            if (initialData) {
                result = await updateUser(initialData.id, payload)
            } else {
                result = await createUser(payload)
            }

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(initialData ? "User updated" : "User created")
                setOpen(false)
                if (!initialData) form.reset()
            }
        } catch {
            toast.error("Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            {showTrigger && !initialData && (
                <DialogTrigger asChild>
                    {trigger ?? (
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create User
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Edit User" : "Create User"}</DialogTitle>
                    <DialogDescription>
                        {initialData ? "Update user account details." : "Add a new user to the system."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="john@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password {initialData && "(Leave blank to keep current)"}</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="******" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="roles"
                            render={() => (
                                <FormItem>
                                    <div className="mb-4">
                                        <FormLabel className="text-base">Roles</FormLabel>
                                        <FormDescription>
                                            Select one or more roles for this user.
                                        </FormDescription>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ROLES.map((role) => (
                                            <FormField
                                                key={role.id}
                                                control={form.control}
                                                name="roles"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem
                                                            key={role.id}
                                                            className="flex flex-row items-start space-x-3 space-y-0"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(role.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                            ? field.onChange([...(field.value || []), role.id])
                                                                            : field.onChange(
                                                                                field.value?.filter(
                                                                                    (value) => value !== role.id
                                                                                )
                                                                            )
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">
                                                                {role.label}
                                                            </FormLabel>
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {form.watch("roles")?.some(r => ["SUBJECT_TEACHER", "HOMEROOM_TEACHER"].includes(r)) && (
                            <FormField
                                control={form.control}
                                name="nip"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>NIP (Teacher ID)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="19870101..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {form.watch("roles")?.includes("STUDENT") && (
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="nis"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>NIS</FormLabel>
                                            <FormControl>
                                                <Input placeholder="12345" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="nisn"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>NISN</FormLabel>
                                            <FormControl>
                                                <Input placeholder="0012345678" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : (initialData ? "Save Changes" : "Create User")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
