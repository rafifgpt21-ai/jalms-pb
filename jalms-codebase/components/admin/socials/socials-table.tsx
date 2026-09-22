"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Eye } from "lucide-react"

interface SocialsTableProps {
    conversations: any[]
}

export function SocialsTable({ conversations }: SocialsTableProps) {
    return (
        <div className="overflow-hidden rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Participants</TableHead>
                        <TableHead className="max-md:hidden">Last Message</TableHead>
                        <TableHead className="max-sm:hidden">Last Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {conversations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                No conversations found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        conversations.map((conv) => (
                            <TableRow key={conv.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="flex -space-x-2 overflow-hidden">
                                            {conv.participants.map((p: any) => (
                                                <Avatar key={p.id} className="inline-block border-2 border-background w-8 h-8">
                                                    <AvatarImage src={p.image || undefined} />
                                                    <AvatarFallback>{p.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                            ))}
                                        </div>
                                        <span className="text-sm font-medium truncate max-w-[200px]">
                                            {conv.participants.map((p: any) => p.name).join(", ")}
                                        </span>
                                    </div>
                                    <p className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground md:hidden">
                                        {conv.messages[0]?.content || "No messages"}
                                    </p>
                                </TableCell>
                                <TableCell className="max-md:hidden">
                                    <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                                        {conv.messages[0]?.content || "No messages"}
                                    </p>
                                </TableCell>
                                <TableCell className="max-sm:hidden">
                                    <span className="text-sm text-muted-foreground">
                                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" asChild className="size-11 sm:h-7 sm:w-auto sm:px-3">
                                        <Link href={`/admin/socials/${conv.id}`}>
                                            <Eye className="size-4" />
                                            <span className="max-sm:sr-only">View history</span>
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
