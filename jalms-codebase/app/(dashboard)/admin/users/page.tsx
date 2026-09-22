import { Suspense } from "react"
import { getUsers, type UserFilter } from "@/lib/actions/user.actions"
import { DataTable } from "./data-table"
import { columns } from "./columns"
import type { UserColumn } from "./columns"
import { UserToolbar } from "@/components/admin/users/user-toolbar"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"
import { Skeleton } from "@/components/ui/skeleton"

type UsersSearchParams = Promise<{
    query?: string
    page?: string
    role?: string
    status?: string
    sort?: string
    showAll?: string
}>

async function UsersTable({ searchParams }: { searchParams: UsersSearchParams }) {
    const params = await searchParams
    const query = params.query || ""
    const currentPage = Number(params.page) || 1
    const role = (params.role || "ALL") as NonNullable<UserFilter["role"]>
    const status = (params.status || "ALL") as NonNullable<UserFilter["status"]>
    const sort = (params.sort || "newest") as NonNullable<UserFilter["sort"]>
    const showAll = params.showAll === "true"

    const isFiltered = query !== "" || role !== "ALL" || status !== "ALL" || showAll

    let users: UserColumn[] = []

    if (isFiltered) {
        const result = await getUsers({
            page: currentPage,
            limit: 1000,
            search: query,
            role,
            status,
            sort,
        })
        users = result.users
    }

    const emptyMessage = isFiltered
        ? "No users match your search or filters."
        : "Users are hidden by default. Search or click “Show all users” to view them."

    return <DataTable columns={columns} data={users} emptyMessage={emptyMessage} />
}

function UsersTableSkeleton() {
    return (
        <div className="divide-y" aria-label="Loading users" aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="flex h-14 items-center gap-4 px-4">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="hidden h-4 w-28 sm:block" />
                    <Skeleton className="h-6 w-20" />
                </div>
            ))}
        </div>
    )
}

export default function UsersPage({ searchParams }: { searchParams: UsersSearchParams }) {
    return (
        <WorkspacePage>
            <MobileHeaderSetter title="User Management" subtitle="Manage accounts for students, teachers, and admins." />

            <div className="flex min-h-[34rem] flex-col overflow-hidden rounded-lg border bg-card shadow-xs">
                <div className="border-b bg-muted/40 p-2">
                    <UserToolbar />
                </div>
                <div className="flex-1">
                    <Suspense fallback={<UsersTableSkeleton />}>
                        <UsersTable searchParams={searchParams} />
                    </Suspense>
                </div>
            </div>
        </WorkspacePage>
    )
}
