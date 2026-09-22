import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMessages } from "@/app/actions/chat";
import { db } from "@/lib/db";
import { AdminChatView } from "@/components/admin/socials/admin-chat-view";
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"
import { isDirectMessagingEnabled } from "@/lib/features";

interface AdminChatPageProps {
    params: {
        conversationId: string;
    };
}

export default async function AdminChatPage({ params }: AdminChatPageProps) {
    if (!isDirectMessagingEnabled()) redirect("/admin");
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("ADMIN")) {
        redirect("/");
    }

    const { conversationId } = await params;

    const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: {
            participants: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                    email: true,
                },
            },
        },
    });

    if (!conversation) {
        return <div>Conversation not found</div>;
    }

    const messages = await getMessages(conversationId);

    return (
        <WorkspacePage className="h-full">
            <MobileHeaderSetter title="Conversation Details" backLink="/admin/socials" />
            <AdminChatView
                conversationId={conversationId}
                initialMessages={messages}
                participants={conversation.participants}
            />
        </WorkspacePage>
    );
}
