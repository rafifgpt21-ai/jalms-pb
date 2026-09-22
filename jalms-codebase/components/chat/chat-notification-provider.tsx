"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { getConversations } from "@/app/actions/chat";

// Define types locally or import if available.
// Based on chat-sidebar usage:
type Conversation = {
  id: string;
  lastMessageAt: Date;
  participants: {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
  }[];
  messages: {
    content: string;
    createdAt: Date;
    readByIds?: string[];
    senderId?: string;
  }[];
  initiatorId?: string | null;
};

interface ChatNotificationContextType {
  conversations: Conversation[];
  hasUnreadMessages: boolean;
  refreshConversations: () => Promise<void>;
}

const ChatNotificationContext = createContext<ChatNotificationContextType>({
  conversations: [],
  hasUnreadMessages: false,
  refreshConversations: async () => {},
});

interface ChatNotificationProviderProps {
  children: React.ReactNode;
  initialConversations: Conversation[];
  userId: string;
}

export function ChatNotificationProvider({
  children,
  initialConversations,
  userId,
}: ChatNotificationProviderProps) {
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);

  const refreshConversations = useCallback(async () => {
    try {
      // Since getConversations is a server action, it uses the session on the server.
      // We don't need to pass userId explicitly to the action if it uses auth().
      const fresh = (await getConversations()) as Conversation[];
      setConversations(fresh);
    } catch (error) {
      console.error("Failed to refresh conversations", error);
    }
  }, []);

  useEffect(() => {
    // Sync with initial props if they change (e.g. on navigation that triggers server refresh)
    // Check if length or content changed to avoid unnecessary updates if possible,
    // but for now relying on referential equality check inside setState might be enough
    // if React optimizes it, but initialConversations is a new array.
    // Let's at least trust the stable refreshConversations to break the loop downstream.
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    // Notifications are useful but must not hold the workspace shell or dashboard render.
    // Hydrate them immediately after the interactive UI is available.
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    // Lightweight polling for unread status
    // Poll every 15 seconds (reduced from 5s heavy poll)
    const pollUnread = async () => {
      try {
        // Determine the latest activity time we currently know of
        const currentLatest =
          conversations.length > 0
            ? new Date(conversations[0].lastMessageAt).getTime()
            : 0;

        // Calculate current unread status based on local state (re-calc logic from below)
        const currentHasUnread =
          conversations?.some((conv) => {
            const lastMessage = conv.messages && conv.messages[0];
            return (
              lastMessage && userId && !lastMessage.readByIds?.includes(userId)
            );
          }) || false;

        const status = await import("@/app/actions/chat").then((mod) =>
          mod.getUnreadStatus(),
        );
        const serverTime = new Date(status.lastActivity).getTime();

        // If server has newer activity OR unread status mismatch (e.g. read on other device), refresh
        // Note: serverTime > currentLatest handles new messages
        // status.hasUnread !== currentHasUnread handles "marked as read" updates (where timestamp might not change if just read receipt,
        // though usually read receipt updates happen via message update which changes updated at... wait, Conversation lastMessageAt might not change on Read.
        // But if we mark as read, we usually don't update lastMessageAt.
        // So mismatch check is crucial.
        if (
          serverTime > currentLatest ||
          status.hasUnread !== currentHasUnread
        ) {
          await refreshConversations();
        }
      } catch (error) {
        console.error("Failed to poll unread status", error);
      }
    };

    const interval = setInterval(pollUnread, 15000);
    return () => clearInterval(interval);
  }, [conversations, refreshConversations, userId]); // Added dependencies needed for comparison logic

  const hasUnreadMessages =
    conversations?.some((conv) => {
      const lastMessage = conv.messages && conv.messages[0];
      // User not in readByIds of last message
      // And ensure we have a last message
      return lastMessage && userId && !lastMessage.readByIds?.includes(userId);
    }) || false;

  // Memoize the context value to prevent consumers from re-rendering just because provider flipped
  const contextValue = useMemo(
    () => ({
      conversations,
      hasUnreadMessages,
      refreshConversations,
    }),
    [conversations, hasUnreadMessages, refreshConversations],
  );

  return (
    <ChatNotificationContext.Provider value={contextValue}>
      {children}
    </ChatNotificationContext.Provider>
  );
}

export const useChatNotification = () => useContext(ChatNotificationContext);
