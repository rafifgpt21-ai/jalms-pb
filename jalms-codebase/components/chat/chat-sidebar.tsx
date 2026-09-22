"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { NewChatDialog } from "./new-chat-dialog";
import { MobileHeaderSetter } from "@/components/mobile-header-setter";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

type Conversation = {
    id: string;
    lastMessageAt: Date;
    participants: {
        id: string;
        name: string | null;
        image: string | null;
        email: string | null;
        nickname?: string | null;
    }[];
    messages: {
        sender?: any;
        senderId: string;
        content: string;
        createdAt: Date;
        readByIds?: string[];
    }[];
};

interface ChatSidebarProps {
    initialConversations: Conversation[];
    userId: string;
    variant?: "default" | "sidebar";
    isCollapsed?: boolean;
    disableMobileHeader?: boolean;
    headerMode?: "auto" | "show" | "hide";
}

export function ChatSidebar({ initialConversations, userId, variant = "default", isCollapsed = false, disableMobileHeader = false, headerMode = "auto" }: ChatSidebarProps) {
    const pathname = usePathname();
    const [conversations, setConversations] = useState(initialConversations);
    const [searchQuery, setSearchQuery] = useState("");
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);

    useEffect(() => {
        setConversations(initialConversations);
    }, [initialConversations]);

    const isSidebar = variant === "sidebar";

    const filteredConversations = conversations.filter((conv) => {
        const otherParticipant = conv.participants.find((p) => p.id !== userId);
        const displayName = otherParticipant?.nickname || otherParticipant?.name || "";
        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const headerButtons = (
        <>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Search conversations">
                        <Search className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-[calc(100vw-32px)] p-0">
                    <div className="space-y-3 p-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search chats..."
                                className="pl-9 bg-slate-100/50 dark:bg-slate-800/50 border-0 focus-visible:ring-1 focus-visible:ring-indigo-500/30"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {/* Mobile Popover List Logic (Same as before but styled) */}
                            {filteredConversations.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-sm">No conversations found.</div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {filteredConversations.map((conv) => {
                                        const otherParticipant = conv.participants.find((p) => p.id !== userId);
                                        const lastMessage = conv.messages[0];
                                        return (
                                            <Link
                                                key={conv.id}
                                                href={`/socials/${conv.id}`}
                                                className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <Avatar>
                                                    <AvatarImage src={otherParticipant?.image || undefined} />
                                                    <AvatarFallback>{(otherParticipant?.nickname || otherParticipant?.name)?.slice(0, 2).toUpperCase() || "??"}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                                        {otherParticipant?.nickname || otherParticipant?.name || "Unknown User"}
                                                    </div>
                                                    <p className="text-sm text-slate-500 truncate">{lastMessage ? lastMessage.content : "No messages yet"}</p>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setIsNewChatOpen(true)} aria-label="Start a new conversation">
                <Plus className="h-5 w-5" />
            </Button>
        </>
    );

    const shouldShowHeader = headerMode === "show" ? true : headerMode === "hide" ? false : !isSidebar;

    return (
        <div className={cn("flex flex-col h-full", isSidebar && "text-slate-600 dark:text-slate-400 bg-transparent")}>
            {isSidebar && pathname === "/socials" && !disableMobileHeader && (
                <MobileHeaderSetter title="Socials" rightAction={headerButtons} />
            )}

            {shouldShowHeader && (
                <div className={cn("p-4 flex items-center bg-transparent sticky top-0 z-10", isCollapsed ? "flex-col space-y-4 px-2 justify-center" : "justify-between gap-2", !isSidebar && "border-b border-slate-100 dark:border-slate-800")}>
                    {isCollapsed ? (
                        <>
                            {/* Collapsed View Header Icons */}
                            <TooltipProvider>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400" onClick={() => setIsNewChatOpen(true)} aria-label="Start a new conversation">
                                            <Plus className="w-5 h-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">New Chat</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400" aria-label="Search conversations">
                                        <Search className="w-5 h-5" />
                                    </Button>
                                </PopoverTrigger>
                                {/* Search Popover Content */}
                                <PopoverContent side="right" className="w-80 p-0">
                                    <div className="space-y-3 p-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder="Search chats..."
                                                className="pl-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {filteredConversations.map(conv => {
                                                const otherParticipant = conv.participants.find(p => p.id !== userId);
                                                return (
                                                    <Link key={conv.id} href={`/socials/${conv.id}`} className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent hover:text-accent-foreground">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={otherParticipant?.image || undefined} />
                                                            <AvatarFallback>{(otherParticipant?.nickname || otherParticipant?.name)?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm font-medium">{otherParticipant?.nickname || otherParticipant?.name}</span>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-heading font-bold tracking-tight px-2 text-slate-800 dark:text-slate-200">Socials</h2>
                            <div className="flex items-center gap-1">
                                {/* Search Trigger (Standard View) */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Search conversations">
                                            <Search className="w-4 h-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent side="bottom" align="end" className="w-80 p-0">
                                        <div className="space-y-3 p-3">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                <Input
                                                    placeholder="Search chats..."
                                                    className="border-input bg-background pl-9"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                            {/* Results List for standard view search */}
                                            <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1">
                                                {filteredConversations.map(conv => {
                                                    const otherParticipant = conv.participants.find(p => p.id !== userId);
                                                    return (
                                                        <Link key={conv.id} href={`/socials/${conv.id}`} className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent hover:text-accent-foreground">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={otherParticipant?.image || undefined} />
                                                                <AvatarFallback>{(otherParticipant?.nickname || otherParticipant?.name)?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm font-medium">{otherParticipant?.nickname || otherParticipant?.name}</span>
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" onClick={() => setIsNewChatOpen(true)}>
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>New Chat</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </>
                    )}
                </div>
            )}

            <ScrollArea className="flex-1">
                <div className={cn("flex flex-col gap-1 p-2", isCollapsed ? "items-center" : "")}>
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            <p>No conversations found</p>
                            <Button variant="link" onClick={() => setIsNewChatOpen(true)} className="mt-2 text-indigo-500">Start a new chat</Button>
                        </div>
                    ) : (
                        filteredConversations.map((conv) => {
                            const otherParticipant = conv.participants.find((p) => p.id !== userId);
                            const lastMessage = conv.messages[0];
                            const isActive = pathname === `/socials/${conv.id}`;
                            const isUnread = lastMessage && !lastMessage.readByIds?.includes(userId);

                            if (isCollapsed) {
                                return (
                                    <TooltipProvider key={conv.id}>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    href={`/socials/${conv.id}`}
                                                    className={cn(
                                                        "relative flex items-center justify-center p-2 rounded-xl transition-all duration-200 group",
                                                        isActive
                                                            ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 shadow-sm ring-1 ring-indigo-500/20"
                                                            : "hover:bg-white/40 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                                                    )}
                                                >
                                                    <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-slate-900 transition-all group-hover:scale-105">
                                                        <AvatarImage src={otherParticipant?.image || undefined} />
                                                        <AvatarFallback className={cn("bg-slate-200 dark:bg-slate-700", isActive && "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300")}>
                                                            {(otherParticipant?.nickname || otherParticipant?.name)?.slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {isUnread && (
                                                        <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-900" />
                                                    )}
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                <p className="font-medium">{otherParticipant?.nickname || otherParticipant?.name}</p>
                                                {isUnread && <p className="text-xs text-red-400 font-bold">Unread</p>}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )
                            }

                            return (
                                <Link
                                    key={conv.id}
                                    href={`/socials/${conv.id}`}
                                    className={cn(
                                        "group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border",
                                        isActive
                                            ? "bg-indigo-500/10 dark:bg-indigo-500/20 shadow-sm border-indigo-500/20"
                                            : "bg-white/40 dark:bg-slate-800/30 border-white/40 dark:border-white/5 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:shadow-sm hover:-translate-y-0.5"
                                    )}
                                >
                                    <div className="relative">
                                        <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-slate-900 group-hover:scale-105 transition-transform">
                                            <AvatarImage src={otherParticipant?.image || undefined} />
                                            <AvatarFallback className={cn("bg-slate-100 dark:bg-slate-800 text-slate-500", isActive && "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300")}>
                                                {(otherParticipant?.nickname || otherParticipant?.name)?.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {isUnread && (
                                            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={cn(
                                                "font-medium truncate text-sm transition-colors",
                                                isActive ? "text-indigo-900 dark:text-indigo-100 font-bold" : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white",
                                                isUnread && "font-bold text-slate-900 dark:text-white"
                                            )}>
                                                {otherParticipant?.nickname || otherParticipant?.name || "Unknown User"}
                                            </span>
                                            {lastMessage && (
                                                <span className={cn(
                                                    "text-[10px] whitespace-nowrap ml-2",
                                                    isUnread ? "text-indigo-600 font-bold" : "text-slate-400 group-hover:text-slate-500"
                                                )}>
                                                    {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
                                                </span>
                                            )}
                                        </div>
                                        <p className={cn(
                                            "text-xs truncate transition-colors",
                                            isActive ? "text-indigo-600/80 dark:text-indigo-300/80" : "text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400",
                                            isUnread && "font-medium text-slate-800 dark:text-slate-200"
                                        )}>
                                            {lastMessage ? (
                                                lastMessage.senderId === userId ? `You: ${lastMessage.content}` : lastMessage.content
                                            ) : (
                                                <span className="italic opacity-70">No messages yet</span>
                                            )}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </ScrollArea>

            <NewChatDialog
                open={isNewChatOpen}
                onOpenChange={setIsNewChatOpen}
                userId={userId}
            />
        </div>
    );
}
