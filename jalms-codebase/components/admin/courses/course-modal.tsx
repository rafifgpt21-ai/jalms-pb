"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getAvailableClassesForDropdown } from "@/lib/actions/class.actions";
import { enrollClassToCourse } from "@/lib/actions/enrollment.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  createCourse,
  updateCourse,
  createBulkCourses,
} from "@/lib/actions/course.actions";
import { toast } from "sonner";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { CourseEnrollmentMode, Subject } from "@prisma/client";
import { Checkbox } from "@/components/ui/checkbox";

// Simple debounce hook
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const formSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  teacherId: z.string().min(1, "Teacher is required"),
  termId: z.string().min(1, "Semester is required"),
  subjectId: z.string().optional(),
  enrollmentMode: z.nativeEnum(CourseEnrollmentMode),
});

interface CourseModalProps {
  teachers: { id: string; name: string }[];
  terms: {
    id: string;
    academicYear: { name: string };
    type: string;
    isActive: boolean;
  }[];
  subjects: Subject[];
  initialData?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function CourseModal({
  teachers,
  terms,
  subjects,
  initialData,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: CourseModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Add Class specific states
  const [activeSemesterOnly, setActiveSemesterOnly] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [classes, setClasses] = useState<
    {
      id: string;
      name: string;
      term: { name: string; type: string; academicYear: { name: string } };
    }[]
  >([]);
  const [isClassLoading, setIsClassLoading] = useState(false);
  const [classOpen, setClassOpen] = useState(false);

  // Advance Mode States
  const [isAdvanceMode, setIsAdvanceMode] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [autoEnroll, setAutoEnroll] = useState(true);

  const debouncedClassSearch = useDebounceValue(classSearchQuery, 300);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchClasses() {
      setIsClassLoading(true);
      // If in advance mode, fetch ALL classes (limit: -1) but still respect activeSemester filter
      // Ideally we might want filter by termId selected in form too?
      // For now let's stick to global active semester filter or fetch larger list
      const limit = isAdvanceMode ? 100 : 10; // Fetch more for checklist
      const result = await getAvailableClassesForDropdown(
        debouncedClassSearch,
        activeSemesterOnly,
        limit,
      );
      if (result.classes) {
        setClasses(result.classes as any);
      }
      setIsClassLoading(false);
    }

    fetchClasses();
  }, [debouncedClassSearch, activeSemesterOnly, isOpen, isAdvanceMode]);

  const activeTerm = terms.find((t) => t.isActive);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      teacherId: "",
      termId: "",
      subjectId: "",
      enrollmentMode: "MANUAL",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        teacherId: initialData.teacherId,
        termId: initialData.termId,
        subjectId: initialData.subjectId || "",
        enrollmentMode: initialData.enrollmentMode || "MANUAL",
      });
      setSelectedClassId(initialData.classId || "");
      setIsAdvanceMode(false);
    } else {
      form.reset({
        name: "",
        teacherId: "",
        termId: activeTerm?.id || "",
        subjectId: "",
        enrollmentMode: "MANUAL",
      });
      // Reset advance mode states
      setIsAdvanceMode(false);
      setSelectedClassIds([]);
      setAutoEnroll(true);
    }
  }, [initialData, terms, activeTerm, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      if (isAdvanceMode && !initialData) {
        if (selectedClassIds.length === 0) {
          toast.error("Please select at least one class");
          setIsLoading(false);
          return;
        }

        const result = await createBulkCourses({
          name: values.name,
          teacherId: values.teacherId,
          termId: values.termId,
          subjectId: values.subjectId,
          classIds: selectedClassIds,
          autoEnroll,
          enrollmentMode: autoEnroll ? "CLASS_SEEDED" : "MANUAL",
        });

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(
            `Created ${result.count} courses${result.enrolledCount ? ` and enrolled ${result.enrolledCount} students` : ""}`,
          );
          setOpen(false);
          form.reset();
          setSelectedClassIds([]);
          setAutoEnroll(true);
          setIsAdvanceMode(false);
        }

        setIsLoading(false);
        return;
      }

      let result;
      if (initialData) {
        result = await updateCourse(initialData.id, {
          ...values,
          classId: selectedClassId || undefined,
        });
      } else {
        result = await createCourse({
          ...values,
          classId: selectedClassId || undefined,
        });
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        // If creating course and class is selected (Simple Mode), enroll students
        if (!initialData && selectedClassId && (result as any).course) {
          toast.info("Course created. Enrolling students...");
          const enrollResult = await enrollClassToCourse(
            (result as any).course.id,
            selectedClassId,
          );

          if (enrollResult.error) {
            toast.error(
              `Course created but enrollment failed: ${enrollResult.error}`,
            );
          } else if (enrollResult.message) {
            toast.info(`Course created: ${enrollResult.message}`);
          } else {
            toast.success(
              `Course created and ${enrollResult.count} students enrolled`,
            );
          }
        } else {
          toast.success(initialData ? "Course updated" : "Course created");
        }

        setOpen(false);
        if (!initialData) {
          form.reset();
          setSelectedClassId("");
          setClassSearchQuery("");
          setActiveSemesterOnly(true);
        }
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId],
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {showTrigger && !initialData && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] overflow-visible max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Course" : "Add Course"}
          </DialogTitle>
          <DialogDescription>
            {initialData ? "Update course details." : "Create a new course."}
          </DialogDescription>
        </DialogHeader>

        {!initialData && (
          <div className="flex items-center space-x-2 pb-4 border-b">
            <Switch
              id="advance-mode"
              checked={isAdvanceMode}
              onCheckedChange={setIsAdvanceMode}
            />
            <Label htmlFor="advance-mode" className="font-semibold">
              Advanced mode (bulk creation)
            </Label>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Course Name {isAdvanceMode && "(Base Name)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        isAdvanceMode ? "e.g. Biology" : "e.g. Mathematics 101"
                      }
                      {...field}
                    />
                  </FormControl>
                  {isAdvanceMode && (
                    <span className="text-xs text-muted-foreground">
                      Will become "Biology [Class Name]"
                    </span>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subject Selection */}
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Subject (Optional)</FormLabel>
                  <Popover open={subjectOpen} onOpenChange={setSubjectOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value
                            ? subjects.find((s) => s.id === field.value)?.name
                            : "Select subject"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search subject..." />
                        <CommandList>
                          <CommandEmpty>No subject found.</CommandEmpty>
                          <CommandGroup>
                            {subjects.map((subject) => (
                              <CommandItem
                                value={subject.name}
                                key={subject.id}
                                onSelect={() => {
                                  form.setValue("subjectId", subject.id);
                                  setSubjectOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    subject.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {subject.name} ({subject.code})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isAdvanceMode && (
              <FormField
                control={form.control}
                name="enrollmentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enrollment behavior</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MANUAL">
                          Manual - manage students individually
                        </SelectItem>
                        <SelectItem value="CLASS_SEEDED">
                          Seed once - copy the linked class now
                        </SelectItem>
                        <SelectItem value="CLASS_SYNC">
                          Class sync - continuously mirror the linked class
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Class sync keeps course membership equal to the linked
                      class.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Subject Teacher</FormLabel>
                  <Popover open={teacherOpen} onOpenChange={setTeacherOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value
                            ? teachers.find(
                                (teacher) => teacher.id === field.value,
                              )?.name
                            : "Select teacher"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search teacher..." />
                        <CommandList>
                          <CommandEmpty>No teacher found.</CommandEmpty>
                          <CommandGroup>
                            {teachers.map((teacher) => (
                              <CommandItem
                                value={teacher.name}
                                key={teacher.id}
                                onSelect={() => {
                                  form.setValue("teacherId", teacher.id);
                                  setTeacherOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    teacher.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {teacher.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="termId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Semester</FormLabel>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value
                            ? (() => {
                                const term = terms.find(
                                  (term) => term.id === field.value,
                                );
                                return term
                                  ? `${term.academicYear.name} - ${term.type === "ODD" ? "Odd" : "Even"}`
                                  : "Select semester";
                              })()
                            : "Select semester"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search semester..." />
                        <CommandList>
                          <CommandEmpty>No semester found.</CommandEmpty>
                          <CommandGroup>
                            {terms.map((term) => (
                              <CommandItem
                                key={term.id}
                                value={`${term.academicYear.name} ${term.type}`}
                                onSelect={() => {
                                  form.setValue("termId", term.id);
                                  setOpenCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    term.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {term.academicYear.name} -{" "}
                                {term.type === "ODD" ? "Odd" : "Even"}{" "}
                                {term.isActive && "(Active)"}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advance Mode Class Selection */}
            {isAdvanceMode && (
              <div className="space-y-4 pt-2 border-t">
                <h4 className="font-medium text-sm">
                  Select Classes for Bulk Creation
                </h4>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-enroll"
                    checked={autoEnroll}
                    onCheckedChange={setAutoEnroll}
                  />
                  <Label htmlFor="auto-enroll">
                    Auto-enroll students from selected classes
                  </Label>
                </div>

                <div className="border rounded-md p-2 max-h-[200px] overflow-y-auto space-y-1">
                  {isClassLoading ? (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      Loading classes...
                    </div>
                  ) : classes.length === 0 ? (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      No classes found
                    </div>
                  ) : (
                    classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-center space-x-2 rounded p-2 hover:bg-muted"
                      >
                        <Checkbox
                          id={`class-${cls.id}`}
                          checked={selectedClassIds.includes(cls.id)}
                          onCheckedChange={() => toggleClassSelection(cls.id)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`class-${cls.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {cls.name}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {cls.term.academicYear.name} - {cls.term.type}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Simple Mode Class Selection */}
            {!isAdvanceMode && (
              <div className="space-y-4 pt-2 border-t">
                <h4 className="font-medium text-sm">Linked Class (Optional)</h4>
                <DialogDescription className="text-xs">
                  Supplies the course identity color and can drive seeded or
                  synchronized enrollment.
                </DialogDescription>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active-semester"
                    checked={activeSemesterOnly}
                    onCheckedChange={setActiveSemesterOnly}
                  />
                  <Label htmlFor="active-semester">
                    Show only active semester classes
                  </Label>
                </div>

                <div className="flex flex-col space-y-2">
                  <Label>Select Class</Label>
                  <Popover open={classOpen} onOpenChange={setClassOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedClassId
                          ? classes.find((c) => c.id === selectedClassId)
                              ?.name || "Select class..."
                          : "Select class..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search class..."
                          value={classSearchQuery}
                          onValueChange={setClassSearchQuery}
                        />
                        <CommandList>
                          {isClassLoading && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Loading...
                            </div>
                          )}
                          {!isClassLoading && classes.length === 0 && (
                            <CommandEmpty>No class found.</CommandEmpty>
                          )}
                          {!isClassLoading &&
                            classes.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.id}
                                onSelect={(currentValue) => {
                                  setSelectedClassId(
                                    currentValue === selectedClassId
                                      ? ""
                                      : currentValue,
                                  );
                                  if (
                                    currentValue !== selectedClassId &&
                                    form.getValues("enrollmentMode") ===
                                      "MANUAL"
                                  ) {
                                    form.setValue(
                                      "enrollmentMode",
                                      "CLASS_SEEDED",
                                    );
                                  }
                                  setClassOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedClassId === c.id
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{c.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {c.term.academicYear.name} - {c.term.type}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Saving..."
                  : initialData
                    ? "Save Changes"
                    : isAdvanceMode
                      ? `Create ${selectedClassIds.length} Courses`
                      : selectedClassId
                        ? "Create & Enroll"
                        : "Create Course"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
