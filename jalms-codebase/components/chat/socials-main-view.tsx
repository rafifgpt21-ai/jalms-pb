"use client";

import { useChatNotification } from "@/components/chat/chat-notification-provider";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { MessageSquare } from "lucide-react";

interface SocialsMainViewProps {
    initialConversations: any[];
    userId: string;
}

export function SocialsMainView({ initialConversations, userId }: SocialsMainViewProps) {
    const { conversations } = useChatNotification();
    const activeConversations = conversations.length > 0 ? conversations : initialConversations;

    return (
        <div className="h-full w-full">
            {/* Mobile View: Chat List */}
            <div className="md:hidden h-full border-r bg-linear-to-br from-indigo-50/40 via-white to-cyan-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
                <ChatSidebar
                    initialConversations={activeConversations}
                    userId={userId}
                    variant="sidebar"
                    headerMode="hide"
                />
            </div>

            {/* Desktop View: Empty State */}
            <div className="hidden md:flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 p-4 text-center bg-white/30 dark:bg-slate-950/30 backdrop-blur-sm">
                <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-full mb-6 shadow-sm ring-1 ring-white/50 dark:ring-white/10">
                    <MessageSquare className="w-12 h-12" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Select a chat to start messaging</h2>
                <p className="max-w-sm">
                    Choose a conversation from the sidebar or start a new one to connect with teachers and students.
                </p>
            </div>
        </div>
    );
}
