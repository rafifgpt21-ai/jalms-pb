"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { isDirectMessagingEnabled } from "@/lib/features";

const DIRECT_MESSAGES_DISABLED = "Direct messages are temporarily unavailable";

export async function getConversations(explicitUserId?: string) {
    if (!isDirectMessagingEnabled()) return [];
    const userId = explicitUserId || (await auth())?.user?.id;
    if (!userId) return [];

    try {
        const conversations = await db.conversation.findMany({
            where: {
                participantIds: {
                    has: userId,
                },
            },
            include: {
                participants: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        email: true,
                        nickname: true,
                    },
                },
                messages: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                    select: {
                        content: true,
                        createdAt: true,
                        readByIds: true,
                        senderId: true,
                    }
                },
            },
            orderBy: {
                lastMessageAt: "desc",
            },
        });

        // Filter conversations:
        // Show if:
        // 1. It has messages
        // 2. OR current user is the initiator
        const visibleConversations = conversations.filter(conv => {
            if (conv.messages.length > 0) return true;
            return conv.initiatorId === userId;
        });

        return visibleConversations;
    } catch (error) {
        console.error("Error fetching conversations:", error);
        return [];
    }
}

export async function getMessages(conversationId: string, after?: Date) {
    if (!isDirectMessagingEnabled()) return [];
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        // Ensure user is participant or admin
        const conversation = await db.conversation.findUnique({
            where: { id: conversationId },
            select: { participantIds: true },
        });

        if (!conversation) return [];

        const isAdmin = session.user.roles.includes("ADMIN");
        const isParticipant = conversation.participantIds.includes(session.user.id);

        if (!isParticipant && !isAdmin) {
            return [];
        }

        const messages = await db.message.findMany({
            where: {
                conversationId,
                ...(after && {
                    createdAt: {
                        gt: after,
                    },
                }),
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        nickname: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return messages;
    } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
    }
}

export async function getUnreadStatus() {
    if (!isDirectMessagingEnabled()) return { hasUnread: false, unreadConversationIds: [], lastActivity: new Date(0) };
    const session = await auth();
    if (!session?.user?.id) return { hasUnread: false, unreadConversationIds: [], lastActivity: new Date(0) };

    try {
        // Find messages where the user is a participant of the conversation
        // AND the user has NOT read the message
        // This might be heavy if not indexed properly, but better than loading all convos + messages
        // Optimization: We could just check Conversations where lastMessageAt > userLastSeen (not tracked yet)
        // For now, let's look for conversations with unread messages.

        // Approach: Find conversations user is in, then check if any message is unread.
        // Or simpler: db.message.findFirst where ...

        // Let's get "Conversations user is in" that have "Messages not read by user"
        const unreadMessages = await db.message.findMany({
            where: {
                conversation: {
                    participantIds: {
                        has: session.user.id
                    }
                },
                NOT: {
                    readByIds: {
                        has: session.user.id
                    }
                },
                senderId: {
                    not: session.user.id // Don't count own messages as unread (though they shouldn't be usually)
                }
            },
            select: {
                conversationId: true,
                createdAt: true
            },
            distinct: ['conversationId'],
            take: 20 // Don't need all of them, just enough to know
        });

        const hasUnread = unreadMessages.length > 0;
        const unreadConversationIds = unreadMessages.map(m => m.conversationId);

        // Get the very latest message timestamp across all user's conversations to track activity
        // This helps client know if they need to refresh purely for ordering even if read
        const lastActivity = await db.conversation.findFirst({
            where: {
                participantIds: {
                    has: session.user.id
                }
            },
            orderBy: {
                lastMessageAt: 'desc'
            },
            select: {
                lastMessageAt: true
            }
        });

        return {
            hasUnread,
            unreadConversationIds,
            lastActivity: lastActivity?.lastMessageAt || new Date(0)
        };
    } catch (error) {
        console.error("Error getting unread status:", error);
        return { hasUnread: false, unreadConversationIds: [], lastActivity: new Date(0) };
    }
}

export async function sendMessage(conversationId: string, content: string) {
    if (!isDirectMessagingEnabled()) return { error: DIRECT_MESSAGES_DISABLED };
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        const message = await db.message.create({
            data: {
                content,
                conversationId,
                senderId: session.user.id,
                readByIds: [session.user.id], // Sender has read their own message
            },
        });

        await db.conversation.update({
            where: { id: conversationId },
            data: {
                lastMessageAt: new Date(),
            },
        });

        revalidatePath(`/socials`);
        revalidatePath(`/socials/${conversationId}`); // If we have a specific page
        return { success: true, message };
    } catch (error) {
        console.error("Error sending message:", error);
        return { error: "Failed to send message" };
    }
}

export async function markConversationAsRead(conversationId: string) {
    if (!isDirectMessagingEnabled()) return { error: DIRECT_MESSAGES_DISABLED };
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        console.log(`Marking conversation ${conversationId} as read for user ${session.user.id}`);

        // Update all messages in this conversation where user is NOT in readByIds
        const result = await db.message.updateMany({
            where: {
                conversationId: conversationId,
                NOT: {
                    readByIds: {
                        has: session.user.id
                    }
                }
            },
            data: {
                readByIds: {
                    push: session.user.id
                }
            }
        });

        console.log(`Marked ${result.count} messages as read.`);

        revalidatePath("/", "layout"); // Revalidate everything to be sure the sidebar updates
        return { success: true };
    } catch (error) {
        console.error("Error marking conversation as read:", error);
        return { error: "Failed to mark as read" };
    }
}

export async function createConversation(participantIds: string[]) {
    if (!isDirectMessagingEnabled()) return { error: DIRECT_MESSAGES_DISABLED };
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    // Add current user to participants if not already included
    const allParticipants = Array.from(new Set([...participantIds, session.user.id]));
    console.log("Creating conversation with participants:", allParticipants);

    if (allParticipants.length < 2) {
        console.log("Error: Need at least 2 participants");
        return { error: "Need at least 2 participants" };
    }

    try {
        // Check if conversation already exists (for 1-on-1)
        if (allParticipants.length === 2) {
            const existing = await db.conversation.findFirst({
                where: {
                    participantIds: {
                        hasEvery: allParticipants,
                    },
                },
            });

            if (existing) {
                return { success: true, conversationId: existing.id };
            }
        }

        const conversation = await db.conversation.create({
            data: {
                participantIds: allParticipants,
                initiatorId: session.user.id,
            },
        });

        revalidatePath("/socials");
        return { success: true, conversationId: conversation.id };
    } catch (error) {
        console.error("Error creating conversation:", error);
        return { error: "Failed to create conversation" };
    }
}

export async function searchUsers(query: string) {
    if (!isDirectMessagingEnabled()) return [];
    const session = await auth();
    if (!session?.user?.id) return [];

    if (!query || query.length < 2) return [];

    try {
        console.log("Searching users with query:", query);
        const users = await db.user.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                ],
                NOT: {
                    id: session.user.id,
                },
            },
            select: {
                id: true,
                name: true,
                image: true,
                email: true,
                nickname: true,
                roles: true,
            },
            take: 10,
        });

        return users;
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
}

// Admin Actions

export async function getAllConversations() {
    if (!isDirectMessagingEnabled()) return [];
    const session = await auth();
    // Check for ADMIN role. Adjust based on how roles are stored in session.
    // Assuming session.user.role or similar.
    // If roles is an array in DB, session might reflect that.
    // Let's assume we need to check DB or session properly.

    // For now, let's fetch user from DB to be safe if session is lightweight
    if (!session?.user?.id) return [];

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { roles: true }
    });

    if (!user?.roles.includes("ADMIN")) {
        return [];
    }

    try {
        const conversations = await db.conversation.findMany({
            include: {
                participants: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        nickname: true,
                    },
                },
                messages: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                    select: {
                        content: true,
                        createdAt: true,
                        readByIds: true,
                        senderId: true,
                    }
                },
            },
            orderBy: {
                lastMessageAt: "desc",
            },
        });

        return conversations;
    } catch (error) {
        console.error("Error fetching all conversations:", error);
        return [];
    }
}
