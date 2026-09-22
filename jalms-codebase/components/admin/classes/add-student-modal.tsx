"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getAvailableStudents, enrollStudent } from "@/lib/actions/enrollment.actions"
import { toast } from "sonner"


// Simple debounce hook implementation if not exists
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debouncedValue
}

interface AddStudentModalProps {
    classId: string
}

export function AddStudentModal({ classId }: AddStudentModalProps) {
    const [open, setOpen] = useState(false)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [selectedStudentId, setSelectedStudentId] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [students, setStudents] = useState<{ id: string; name: string; email: string; officialId: string | null }[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isEnrolling, setIsEnrolling] = useState(false)

    const debouncedSearch = useDebounceValue(searchQuery, 300)

    useEffect(() => {
        async function fetchStudents() {
            setIsLoading(true)
            const result = await getAvailableStudents(classId, debouncedSearch)
            if (result.students) {
                setStudents(result.students)
            }
            setIsLoading(false)
        }

        if (open) {
            fetchStudents()
        }
    }, [debouncedSearch, classId, open])

    async function handleEnroll() {
        if (!selectedStudentId) return

        setIsEnrolling(true)
        const result = await enrollStudent(classId, selectedStudentId)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Student enrolled successfully")
            setOpen(false)
            setSelectedStudentId("")
            setSearchQuery("")
        }
        setIsEnrolling(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4" />
                    Add Student
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Student to Class</DialogTitle>
                    <DialogDescription>
                        Search and select a student to enroll in this class.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={popoverOpen}
                                className="w-full justify-between"
                            >
                                {selectedStudentId
                                    ? students.find((student) => student.id === selectedStudentId)?.name || "Select student..."
                                    : "Select student..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Search student by name or email..."
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                />
                                <CommandList>
                                    {isLoading && <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>}
                                    {!isLoading && students.length === 0 && (
                                        <CommandEmpty>No student found.</CommandEmpty>
                                    )}
                                    {!isLoading && students.map((student) => (
                                        <CommandItem
                                            key={student.id}
                                            value={student.id} // Use ID as value for selection
                                            onSelect={(currentValue) => {
                                                setSelectedStudentId(currentValue === selectedStudentId ? "" : currentValue)
                                                setPopoverOpen(false)
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedStudentId === student.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span>{student.name}</span>
                                                <span className="text-xs text-muted-foreground">{student.email}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <DialogFooter>
                    <Button onClick={handleEnroll} disabled={!selectedStudentId || isEnrolling}>
                        {isEnrolling ? "Enrolling..." : "Enroll Student"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
