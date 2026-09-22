"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function CourseToolbar() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const showAll = searchParams.get("showAll") === "true"

    function handleToggle(checked: boolean) {
        const params = new URLSearchParams(searchParams.toString())
        if (checked) {
            params.set("showAll", "true")
        } else {
            params.delete("showAll")
        }
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="flex items-center space-x-2">
            <Switch
                id="show-all"
                checked={!showAll}
                onCheckedChange={(checked) => handleToggle(!checked)}
            />
            <Label htmlFor="show-all">Active Semester Only</Label>
        </div>
    )
}
