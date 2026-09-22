"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Role } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toggleUserStatus } from "@/lib/actions/user.actions"

import { UserEditModal } from "@/components/admin/user-edit-modal"
import { useState } from "react"

export type UserColumn = {
    id: string
    name: string
    email: string
    roles: Role[]
    isActive: boolean
    image: string | null
    createdAt: Date
    officialId?: string | null
}

export const columns: ColumnDef<UserColumn>[] = [

    {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => {
            const user = row.original
            return (
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user.image || undefined} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="max-w-[38vw] truncate font-medium sm:max-w-72">{user.name}</div>
                        <div className="max-w-[38vw] truncate text-xs text-muted-foreground sm:max-w-72">{user.email}</div>
                        <StatusBadge
                            status={user.isActive ? "ACTIVE" : "ARCHIVED"}
                            label={user.isActive ? "Active" : "Archived"}
                            className="mt-1 sm:hidden"
                        />
                    </div>
                </div>
            )
        },
    },

    {
        accessorKey: "roles",
        header: "Roles",
        meta: {
            className: "max-lg:hidden",
        },
        cell: ({ row }) => {
            const roles = Array.from(new Set(row.getValue("roles") as Role[]))
            return (
                <div className="flex flex-wrap gap-1">
                    {roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                            {role.replace("_", " ")}
                        </Badge>
                    ))}
                </div>
            )
        },
    },
    {
        accessorKey: "isActive",
        header: "Status",
        meta: {
            className: "max-sm:hidden",
        },
        cell: ({ row }) => {
            const isActive = row.getValue("isActive") as boolean
            return (
                <StatusBadge status={isActive ? "ACTIVE" : "ARCHIVED"} label={isActive ? "Active" : "Archived"} />
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const user = row.original
            const [showEditModal, setShowEditModal] = useState(false)

            return (
                <>
                    <UserEditModal
                        user={user}
                        open={showEditModal}
                        onOpenChange={setShowEditModal}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(user.id)}
                            >
                                Copy User ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                                Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                                await toggleUserStatus(user.id, !user.isActive)
                            }}>
                                {user.isActive ? "Archive User" : "Activate User"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            )
        },
    },
]
