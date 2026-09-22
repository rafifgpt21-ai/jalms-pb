"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export function ScheduleSearch() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [query, setQuery] = useState(searchParams.get("search") || "")

    const handleSearch = () => {
        const params = new URLSearchParams(searchParams)
        if (query) {
            params.set("search", query)
        } else {
            params.delete("search")
        }
        router.replace(`${pathname}?${params.toString()}`)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch()
        }
    }

    return (
        <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
                type="text"
                placeholder="Search teacher..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <Button type="button" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
            </Button>
        </div>
    )
}
