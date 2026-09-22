"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMessages } from "@/app/actions/chat";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Message = {
    id: string;
    content: string;
    createdAt: Date;
    sender: {
        id: string;
        name: string | null;
        image: string | null;
    };
};

type Participant = {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
};

interface AdminChatViewProps {
    conversationId: string;
    initialMessages: Message[];
    participants: Participant[];
}

export function AdminChatView({
    conversationId,
    initialMessages,
    participants,
}: AdminChatViewProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on load and new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Polling for new messages (optional for admin view, but good for real-time monitoring)
    useEffect(() => {
        const interval = setInterval(async () => {
            const latestMessages = await getMessages(conversationId);
            if (latestMessages.length > messages.length) {
                setMessages(latestMessages);
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [conversationId, messages.length]);

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }} className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 sticky top-0 z-10">
                <Button variant="ghost" size="icon" asChild className="mr-2 h-8 w-8">
                    <Link href="/admin/socials">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </Button>
                <div className="flex -space-x-3 overflow-hidden">
                    {participants.slice(0, 3).map((p) => (
                        <Avatar key={p.id} className="inline-block border-2 border-white dark:border-slate-800 w-8 h-8 ring-1 ring-slate-100 dark:ring-slate-700">
                            <AvatarImage src={p.image || undefined} />
                            <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                                {p.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    ))}
                    {participants.length > 3 && (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-800 text-[10px] font-medium text-slate-500">
                            +{participants.length - 3}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {participants.map((p) => p.name).join(", ")}
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <p className="text-xs text-slate-500 font-medium">Live Monitoring</p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="space-y-6 pb-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                                <span className="text-xl">💬</span>
                            </div>
                            <p className="text-sm font-medium">No conversation history</p>
                        </div>
                    ) : (
                        messages.map((message) => {
                            return (
                                <div
                                    key={message.id}
                                    className="flex w-full justify-start gap-3 group"
                                >
                                    <Avatar className="w-8 h-8 mt-1 ring-1 ring-slate-200 dark:ring-slate-800">
                                        <AvatarImage src={message.sender.image || undefined} />
                                        <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-xs">
                                            {message.sender.name?.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col max-w-[80%]">
                                        <div className="flex items-baseline gap-2 ml-1 mb-1">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {message.sender.name}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {format(new Date(message.createdAt), "HH:mm")}
                                            </span>
                                        </div>
                                        <div
                                            className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm shadow-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800"
                                        >
                                            <p className="leading-relaxed">{message.content}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={scrollRef} className="h-1" />
                </div>
            </ScrollArea>
        </div>
    );
}
