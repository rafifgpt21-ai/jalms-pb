"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { StudentSemester } from "@/lib/student-grades"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function SemesterSelector({ semesters, initialValue }: { semesters: StudentSemester[]; initialValue?: string }) {
  const resolvedInitialValue = initialValue || semesters.find((semester) => semester.isActive)?.id || "all"
  const [value, setValue] = useState(resolvedInitialValue)
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleValueChange(nextValue: string) {
    setValue(nextValue)
    const params = new URLSearchParams(searchParams.toString())
    if (nextValue) params.set("termId", nextValue)
    else params.delete("termId")
    router.push(`?${params.toString()}`)
  }

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className="min-w-0 flex-1 sm:w-52 sm:flex-none" aria-label="Select semester"><SelectValue placeholder="Select semester" /></SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="all">All grade history</SelectItem>
        {semesters.map((semester) => <SelectItem key={semester.id} value={semester.id}>{semester.academicYear.name} · {semester.type === "ODD" ? "Odd" : "Even"}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}
