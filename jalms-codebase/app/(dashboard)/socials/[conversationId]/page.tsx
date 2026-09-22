import { ChatWindow } from "@/components/chat/chat-window";
import { getMessages } from "@/app/actions/chat";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
    const { conversationId } = await params;
    const session = await auth();
    if (!session?.user?.id) redirect("/auth/login");


    const [conversation, messages] = await Promise.all([
        db.conversation.findUnique({
            where: { id: conversationId },
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
            },
        }),
        getMessages(conversationId)
    ]);

    if (!conversation) {
        return <div>Conversation not found</div>;
    }

    // Verify participation
    const isParticipant = conversation.participantIds.includes(session.user.id);
    if (!isParticipant) {
        // Check if admin, otherwise redirect
        if (!session.user.roles.includes("ADMIN")) {
            redirect("/socials");
        }
    }

    return (
        <ChatWindow
            conversationId={conversationId}
            initialMessages={messages}
            currentUserId={session.user.id}
            participants={conversation.participants}
        />
    );
}
