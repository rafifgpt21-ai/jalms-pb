import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getConversations } from "@/app/actions/chat";
import { SocialsMainView } from "@/components/chat/socials-main-view";

export default async function SocialsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/auth/login");

    const conversations = await getConversations();

    return (
        <SocialsMainView
            initialConversations={conversations}
            userId={session.user.id}
        />
    );
}
