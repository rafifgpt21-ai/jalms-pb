"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft } from "lucide-react";
import { getMessages, sendMessage, markConversationAsRead } from "@/app/actions/chat";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useChatNotification } from "@/components/chat/chat-notification-provider"
import { useMobileHeader } from "@/components/mobile-header-context"
import Link from "next/link";
import { syncPocketBaseAuth } from "@/lib/pocketbase/client"

type Message = {
    id: string;
    content: string;
    createdAt: Date;
    readByIds: string[];
    sender: {
        id: string;
        name: string | null;
        image: string | null;
        nickname?: string | null;
    };
};

type Participant = {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
    nickname?: string | null;
};

interface ChatWindowProps {
    conversationId: string;
    initialMessages: any[]; // Using any[] temporarily if Message type mismatch occurs with Prisma return
    currentUserId: string;
    participants: Participant[];
}

export function ChatWindow({
    conversationId,
    initialMessages,
    currentUserId,
    participants,
}: ChatWindowProps) {
    const router = useRouter();
    const { refreshConversations } = useChatNotification()
    const [messages, setMessages] = useState<Message[]>(initialMessages as Message[]);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const otherParticipant = participants.find((p) => p.id !== currentUserId);

    // Scroll to bottom on load and new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Polling and Mark Read effects
    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

        // Track the latest message timestamp to fetch only deltas
        let lastMessageDate = messages.length > 0
            ? new Date(messages[messages.length - 1].createdAt)
            : undefined;

        const markRead = async () => {
            try {
                await markConversationAsRead(conversationId);
                refreshConversations();
            } catch (error) {
                console.error("Failed to mark conversation as read", error);
            }
        };

        markRead();

        const pollMessages = async () => {
            if (!isMounted) return;
            const isPageHidden = document.hidden;
            const interval = isPageHidden ? 15000 : 3000;

            try {
                const newMessages = await getMessages(conversationId, lastMessageDate);

                if (isMounted && Array.isArray(newMessages) && newMessages.length > 0) {
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const uniqueNewMessages = (newMessages as unknown as Message[]).filter(m => !existingIds.has(m.id));
                        if (uniqueNewMessages.length === 0) return prev;
                        return [...prev, ...uniqueNewMessages];
                    });

                    const lastMsg = newMessages[newMessages.length - 1] as unknown as Message;
                    lastMessageDate = new Date(lastMsg.createdAt);

                    const hasUnread = (newMessages as unknown as Message[]).some(
                        msg => msg.sender.id !== currentUserId && !msg.readByIds.includes(currentUserId)
                    );

                    if (hasUnread && !isPageHidden) {
                        markRead();
                    }
                }
            } catch (error) {
                console.error("Failed to poll messages", error);
            } finally {
                if (isMounted) {
                    timeoutId = setTimeout(pollMessages, interval);
                }
            }
        };

        timeoutId = setTimeout(pollMessages, 3000);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [conversationId, refreshConversations]);

    // PocketBase realtime is the primary update path. The existing visibility-
    // aware polling above remains as a reconnect fallback for suspended tabs.
    useEffect(() => {
        let mounted = true;
        let unsubscribe: (() => void) | undefined;
        void syncPocketBaseAuth().then(async (pb) => {
            if (!mounted || !pb.authStore.isValid) return;
            try {
                const removeSubscription = await pb.collection("messages").subscribe("*", async (event) => {
                    if (String(event.record.conversationId || "") !== conversationId) return;
                    // Fetch from just before the event timestamp so a message
                    // created at the exact same millisecond is not skipped.
                    const eventTime = new Date(String(event.record.createdAt || Date.now()));
                    eventTime.setMilliseconds(eventTime.getMilliseconds() - 1);
                    const incoming = await getMessages(conversationId, eventTime);
                    if (!mounted || !Array.isArray(incoming)) return;
                    setMessages((previous) => {
                        const byId = new Map(previous.map((message) => [message.id, message]));
                        for (const message of incoming as unknown as Message[]) byId.set(message.id, message);
                        return [...byId.values()].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
                    });
                    if (event.record.senderId !== currentUserId && !document.hidden) await markConversationAsRead(conversationId);
                });
                if (mounted) unsubscribe = removeSubscription;
                else removeSubscription();
            } catch {
                // The visibility-aware polling effect remains the fallback.
            }
        }).catch(() => {});
        return () => { mounted = false; unsubscribe?.(); };
    }, [conversationId, currentUserId]);

    // Update Mobile Header
    const { setHeader, resetHeader } = useMobileHeader()
    useEffect(() => {
        setHeader({
            title: otherParticipant?.nickname || otherParticipant?.name || "Unknown User",
            subtitle: otherParticipant?.nickname ? otherParticipant?.name : otherParticipant?.email,
            image: otherParticipant?.image,
            leftAction: (
                <Link href="/socials">
                    <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
            )
        })
        return () => resetHeader()
    }, [otherParticipant, setHeader, resetHeader])

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            const result = await sendMessage(conversationId, newMessage);
            if (result.error) {
                toast.error(result.error);
            } else if (result.message) {
                const optimisticMessage: Message = {
                    id: result.message.id,
                    content: result.message.content,
                    createdAt: new Date(result.message.createdAt),
                    readByIds: result.message.readByIds,
                    sender: {
                        id: currentUserId,
                        name: "Me",
                        image: null
                    }
                };

                setMessages((prev) => [...prev, optimisticMessage]);
                setNewMessage("");
                refreshConversations();
            }
        } catch (error) {
            toast.error("Failed to send message");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 h-full min-h-0 relative">
            {/* Glass Header */}
            <div className="hidden md:flex items-center gap-3 p-4 border-b border-white/20 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 sticky top-0 z-10 shadow-sm">
                <Avatar className="h-10 w-10 ring-2 ring-white/50 dark:ring-slate-800 shadow-md">
                    <AvatarImage src={otherParticipant?.image || undefined} />
                    <AvatarFallback className="bg-linear-to-br from-indigo-500 to-purple-500 text-white">
                        {(otherParticipant?.nickname || otherParticipant?.name)?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 font-heading">
                        {otherParticipant?.nickname || otherParticipant?.name || "Unknown User"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {otherParticipant?.nickname ? otherParticipant?.name : otherParticipant?.email}
                    </p>
                </div>
            </div>

            {/* Messages Area - Enhanced with Motion */}
            <ScrollArea className="flex-1 ">
                <div className="space-y-6 pb-24 md:pb-14 max-w-4xl mx-auto px-4">
                    {messages.map((message, index) => {
                        const isMe = message.sender.id === currentUserId;
                        const isLastFromUser = index === messages.length - 1 || messages[index + 1]?.sender.id !== message.sender.id;

                        return (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex w-full items-end gap-2",
                                    isMe ? "justify-end" : "justify-start"
                                )}
                            >
                                {!isMe && isLastFromUser && (
                                    <Avatar className="hidden md:flex h-6 w-6 mb-1 ring-1 ring-white/50 dark:ring-slate-800 shadow-sm">
                                        <AvatarImage src={message.sender.image || undefined} />
                                        <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-600">
                                            {message.sender.name?.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                {!isMe && !isLastFromUser && <div className="hidden md:block w-6" />}

                                <div
                                    className={cn(
                                        "flex flex-col gap-1 px-5 py-3 text-sm shadow-sm max-w-[85%] md:max-w-[75%] transition-all",
                                        isMe
                                            ? "bg-linear-to-r from-blue-600/80 to-indigo-600/80 text-white rounded-2xl rounded-tr-sm shadow-indigo-500/20 border border-white/10"
                                            : "bg-white/40 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm border border-white/20 dark:border-slate-700/30 shadow-sm"
                                    )}
                                >
                                    <p className="leading-relaxed">{message.content}</p>
                                    <span className={cn(
                                        "text-[10px] self-end",
                                        isMe ? "text-indigo-100/80" : "text-slate-400"
                                    )}>
                                        {format(new Date(message.createdAt), "HH:mm")}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} className="h-10" />
                </div>
            </ScrollArea>

            {/* Floating Input Area */}
            <div
                className="fixed bottom-16 left-0 right-0 z-20 p-4 md:absolute md:bottom-0 md:left-0 md:right-0 flex justify-center pointer-events-none"
            >
                <form
                    onSubmit={handleSend}
                    className="flex gap-2 items-center w-full max-w-4xl mx-auto rounded-full bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-lg p-1.5 pointer-events-auto transition-all duration-300 hover:bg-white/50 dark:hover:bg-slate-900/60"
                >
                    <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="bg-transparent border-0 focus-visible:ring-0 rounded-full focus-visible:ring-offset-0 px-4 py-3 h-auto placeholder:text-slate-500 dark:placeholder:text-slate-400 text-slate-800 dark:text-slate-100 shadow-none"
                        disabled={isSending}
                        autoComplete="off"
                    />

                    <Button
                        type="submit"
                        size="icon"
                        className={cn(
                            "rounded-full h-10 w-10 shrink-0 transition-all duration-300",
                            newMessage.trim()
                                ? "bg-indigo-600/90 text-white hover:bg-indigo-700/90 shadow-lg shadow-indigo-500/30 border border-indigo-500/20"
                                : "bg-slate-100/50 text-slate-400 hover:bg-slate-200/50 dark:bg-slate-800/50 border border-white/10"
                        )}
                        disabled={!newMessage.trim() || isSending}
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
