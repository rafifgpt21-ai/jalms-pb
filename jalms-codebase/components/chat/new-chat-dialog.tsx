"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { searchUsers, createConversation } from "@/app/actions/chat";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface NewChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
}

type UserResult = {
    id: string;
    name: string;
    image: string | null;
    email: string;
    nickname?: string | null;
    roles: string[];
};

export function NewChatDialog({ open, onOpenChange, userId }: NewChatDialogProps) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UserResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const handleSearch = async (value: string) => {
        setQuery(value);
        if (value.length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const users = await searchUsers(value);
            setResults(users as UserResult[]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const startChat = async (participantId: string) => {
        setIsCreating(true);
        try {
            const result = await createConversation([participantId]);
            if (result.error) {
                toast.error(result.error);
                return;
            }

            if (result.success && result.conversationId) {
                onOpenChange(false);
                router.push(`/socials/${result.conversationId}`);
                router.refresh(); // Refresh to show new chat in sidebar
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }} className="sm:max-w-[425px] bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl">New Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <div className="flex gap-2 relative">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search people..."
                                className="pl-9 h-10 bg-slate-100/50 dark:bg-slate-800/50 border-0 focus-visible:ring-1 focus-visible:ring-indigo-500/30"
                                value={query}
                                onChange={(e) => handleSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            </div>
                        ) : results.length > 0 ? (
                            results.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors"
                                    onClick={() => startChat(user.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-slate-900">
                                            <AvatarImage src={user.image || undefined} />
                                            <AvatarFallback className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                {(user.nickname || user.name).slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{user.nickname || user.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.nickname ? user.name : user.email}</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 shadow-sm"
                                        disabled={isCreating}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startChat(user.id);
                                        }}
                                    >
                                        {isCreating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <UserPlus className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            ))
                        ) : query.length >= 2 ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-slate-500 mb-1">No users found</p>
                                <p className="text-xs text-slate-400">Try searching for a different name</p>
                            </div>
                        ) : (
                            <div className="text-center py-8 opacity-60">
                                <UserPlus className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500">
                                    Type to search for students or teachers
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
