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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { getAvailableClassesForDropdown } from "@/lib/actions/class.actions"
import { enrollClassToCourse } from "@/lib/actions/enrollment.actions"
import { toast } from "sonner"
import { GradeLevel } from "@prisma/client"
import { educationStage, gradeLevelNumber } from "@/lib/grade-level"

// Simple debounce hook implementation
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debouncedValue
}

interface AddClassToCourseModalProps {
    courseId: string
}

export function AddClassToCourseModal({ courseId }: AddClassToCourseModalProps) {
    const [open, setOpen] = useState(false)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [selectedClassId, setSelectedClassId] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [classes, setClasses] = useState<{ id: string; name: string; gradeLevel: GradeLevel; term: { type: string; academicYear: { name: string } } }[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isEnrolling, setIsEnrolling] = useState(false)
    const [activeSemesterOnly, setActiveSemesterOnly] = useState(true)

    const debouncedSearch = useDebounceValue(searchQuery, 300)

    useEffect(() => {
        async function fetchClasses() {
            setIsLoading(true)
            const result = await getAvailableClassesForDropdown(debouncedSearch, activeSemesterOnly)
            if (result.classes) {
                setClasses(result.classes)
            }
            setIsLoading(false)
        }

        if (open) {
            fetchClasses()
        }
    }, [debouncedSearch, activeSemesterOnly, open])

    async function handleEnroll() {
        if (!selectedClassId) return

        setIsEnrolling(true)
        const result = await enrollClassToCourse(courseId, selectedClassId)

        if (result.error) {
            toast.error(result.error)
        } else if (result.message) {
            toast.info(result.message)
            setOpen(false)
            setSelectedClassId("")
        } else {
            toast.success(`Successfully enrolled ${result.count} students from class`)
            setOpen(false)
            setSelectedClassId("")
            setSearchQuery("")
        }
        setIsEnrolling(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Plus className="h-4 w-4" />
                    Add by Class
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Students by Class</DialogTitle>
                    <DialogDescription>
                        Select a class to bulk enroll all its students into this course.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="active-semester"
                            checked={activeSemesterOnly}
                            onCheckedChange={setActiveSemesterOnly}
                        />
                        <Label htmlFor="active-semester">Show only active semester classes</Label>
                    </div>

                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={popoverOpen}
                                className="w-full justify-between"
                            >
                                {selectedClassId
                                    ? classes.find((c) => c.id === selectedClassId)?.name || "Select class..."
                                    : "Select class..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Search class..."
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                />
                                <CommandList>
                                    {isLoading && <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>}
                                    {!isLoading && classes.length === 0 && (
                                        <CommandEmpty>No class found.</CommandEmpty>
                                    )}
                                    {!isLoading && classes.map((c) => (
                                        <CommandItem
                                            key={c.id}
                                            value={c.id}
                                            onSelect={(currentValue) => {
                                                setSelectedClassId(currentValue === selectedClassId ? "" : currentValue)
                                                setPopoverOpen(false)
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedClassId === c.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span>{c.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    Grade {gradeLevelNumber(c.gradeLevel)} · {educationStage(c.gradeLevel)} · {c.term.academicYear.name} - {c.term.type}
                                                </span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <DialogFooter>
                    <Button onClick={handleEnroll} disabled={!selectedClassId || isEnrolling}>
                        {isEnrolling ? "Enrolling..." : "Enroll Class"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
