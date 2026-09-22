"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserModal } from "@/components/admin/users/user-modal"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Filter, ArrowUpDown, FileSpreadsheet, Plus, X } from "lucide-react"
import { useRef } from "react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function UserToolbar() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentQuery = searchParams.get("query") || ""
    const searchInputRef = useRef<HTMLInputElement>(null)

    const handleSearch = () => {
        const params = new URLSearchParams(searchParams)
        const search = searchInputRef.current?.value.trim() || ""
        if (search) {
            params.set("query", search)
        } else {
            params.delete("query")
        }
        params.set("page", "1")
        router.replace(`${pathname}?${params.toString()}`)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch()
        }
    }

    // Handlers for Filter and Sort
    const handleFilterChange = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams)
        if (value && value !== "ALL") {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        params.set("page", "1")
        router.replace(`${pathname}?${params.toString()}`)
    }

    const handleSortChange = (value: string) => {
        const params = new URLSearchParams(searchParams)
        params.set("sort", value)
        router.replace(`${pathname}?${params.toString()}`)
    }

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams)
        params.delete("role")
        params.delete("status")
        params.delete("query")
        params.delete("sort")
        params.delete("showAll")
        router.replace(`${pathname}?${params.toString()}`)
    }

    const currentRole = searchParams.get("role") || "ALL"
    const currentStatus = searchParams.get("status") || "ALL"
    const currentSort = searchParams.get("sort") || "newest"
    const showAll = searchParams.get("showAll") === "true"

    const handleShowAll = () => {
        const params = new URLSearchParams(searchParams)
        if (showAll) {
            params.delete("showAll")
        } else {
            params.set("showAll", "true")
        }
        router.replace(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="admin-toolbar flex-col gap-1.5 border-0 bg-transparent p-0 shadow-none md:flex-row md:flex-nowrap">
            <div className="flex w-full min-w-0 items-center gap-1.5 md:max-w-md md:flex-1">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        key={currentQuery}
                        ref={searchInputRef}
                        placeholder="Search users..."
                        defaultValue={currentQuery}
                        onKeyDown={handleKeyDown}
                        className="border-input bg-background pl-9 focus:bg-background"
                    />
                </div>
                <Button onClick={handleSearch} size="sm" className="h-11 w-11 shrink-0 p-0 sm:h-7 sm:w-auto sm:px-3" aria-label="Search users">
                    <Search className="h-4 w-4 sm:hidden" />
                    <span className="hidden sm:inline">Search</span>
                </Button>
            </div>

            <div className="flex w-full min-w-0 items-center gap-1.5 md:flex-1">
                {/* Show All Toggle */}
                {showAll ? (
                    <Button variant="outline" size="sm" onClick={handleShowAll} className="h-9 shrink-0 px-2.5" aria-label="Hide all users">
                        <span className="sm:hidden">Hide all</span>
                        <span className="hidden sm:inline">Hide all users</span>
                    </Button>
                ) : (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 shrink-0 px-2.5" aria-label="Show all users">
                                <span className="sm:hidden">All users</span>
                                <span className="hidden sm:inline">Show all users</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Show all users?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will load all users in the database. This might take a while depending on the number of users.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleShowAll}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {/* Filter Button */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 md:w-auto md:px-2.5" aria-label="Filter users">
                            <Filter className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline-block">Filter</span>
                            {(currentRole !== "ALL" || currentStatus !== "ALL") && (
                                <span className="ml-1 rounded-full bg-blue-600 w-2 h-2" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={currentRole} onValueChange={(value) => handleFilterChange("role", value)}>
                            <DropdownMenuRadioItem value="ALL">All roles</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="ADMIN">Admin</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="SUBJECT_TEACHER">Subject Teacher</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="HOMEROOM_TEACHER">Homeroom Teacher</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="STUDENT">Student</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="PARENT">Parent</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={currentStatus} onValueChange={(value) => handleFilterChange("status", value)}>
                            <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="ACTIVE">Active</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="INACTIVE">Inactive</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort Button */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 md:w-auto md:px-2.5" aria-label="Sort users">
                            <ArrowUpDown className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline-block">Sort</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={currentSort} onValueChange={handleSortChange}>
                            <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="name_asc">Name (A–Z)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="name_desc">Name (Z–A)</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear Filters */}
                {(currentRole !== "ALL" || currentStatus !== "ALL" || currentQuery || currentSort !== "newest" || showAll) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-11 w-11 p-0 text-muted-foreground hover:text-foreground sm:h-11 sm:w-11 md:h-9 md:w-9"
                        aria-label="Clear user filters"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}

                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                    <Button asChild variant="outline" size="sm" className="h-11 w-11 p-0 md:h-9 md:w-9 lg:w-auto lg:px-2.5" aria-label="Import users via Excel">
                        <Link href="/admin/users/import" prefetch>
                            <FileSpreadsheet className="h-4 w-4" />
                            <span className="hidden lg:inline">Import via Excel</span>
                        </Link>
                    </Button>
                    <UserModal
                        trigger={(
                            <Button size="sm" className="h-11 w-11 p-0 min-[400px]:h-9 min-[400px]:w-auto min-[400px]:px-2.5" aria-label="Create user">
                                <Plus className="h-4 w-4" />
                                <span className="hidden min-[400px]:inline">Create user</span>
                            </Button>
                        )}
                    />
                </div>
            </div>
        </div>
    )
}
