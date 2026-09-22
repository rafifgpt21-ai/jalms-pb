"use client";

import { useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Subject, AcademicDomain } from "@prisma/client";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSubject, updateSubject } from "@/lib/actions/subject.actions";

const DOMAIN_LABELS: Record<AcademicDomain, string> = {
  SCIENCE_TECHNOLOGY: "Science and Technology",
  SOCIAL_HUMANITIES: "Social Sciences and Humanities",
  LANGUAGE_COMMUNICATION: "Language and Communication",
  ARTS_CREATIVITY: "Arts and Creativity",
  PHYSICAL_EDUCATION: "Physical Education",
  SPIRITUALITY_ETHICS: "Spirituality & Ethics",
};

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => /^[A-Z]{3}$/.test(value), "Use exactly three letters"),
  description: z.string().optional(),
  reportName: z.string().optional(),
  academicDomains: z.array(z.nativeEnum(AcademicDomain)).default([]),
});

interface SubjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Subject | null; // If null, create mode
}

export function SubjectForm({
  open,
  onOpenChange,
  initialData,
}: SubjectFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!initialData;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      description: initialData?.description || "",
      reportName: initialData?.reportName || "",
      academicDomains: initialData?.academicDomains || [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: initialData?.name || "",
        code: initialData?.code || "",
        description: initialData?.description || "",
        reportName: initialData?.reportName || "",
        academicDomains: initialData?.academicDomains || [],
      });
    }
  }, [initialData, open, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      try {
        if (isEditMode && initialData) {
          const result = await updateSubject(initialData.id, {
            ...values,
            description: values.description || undefined,
            reportName: values.reportName || undefined,
          });
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success("Subject updated successfully");
            onOpenChange(false);
            form.reset();
          }
        } else {
          const result = await createSubject({
            ...values,
            description: values.description || undefined,
            reportName: values.reportName || undefined,
          });
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success("Subject created successfully");
            onOpenChange(false);
            form.reset();
          }
        }
      } catch (error) {
        toast.error("Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900 border-white/20 dark:border-white/10">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Subject" : "Create Subject"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update subject details."
              : "Add a new subject to the system."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="BIO"
                        maxLength={3}
                        className="uppercase"
                        {...field}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value
                              .replace(/[^a-z]/gi, "")
                              .toUpperCase(),
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      This three-letter code becomes the default course badge.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Biology" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reportName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Name (Optional)</FormLabel>
                  <FormDescription className="text-xs">
                    This name will be used on student reports and dashboards.
                  </FormDescription>
                  <FormControl>
                    <Input placeholder="e.g. Mathematics" {...field} />
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
                    <Textarea placeholder="Course description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="academicDomains"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">
                      Academic Domains
                    </FormLabel>
                    <FormDescription>
                      Select the primary academic domains for this subject.
                    </FormDescription>
                  </div>
                  <ScrollArea className="h-[200px] border rounded-md p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
                        <FormField
                          key={key}
                          control={form.control}
                          name="academicDomains"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={key}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(
                                      key as AcademicDomain,
                                    )}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      return checked
                                        ? field.onChange([...current, key])
                                        : field.onChange(
                                            current.filter(
                                              (value) => value !== key,
                                            ),
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Save Changes" : "Create Subject"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
