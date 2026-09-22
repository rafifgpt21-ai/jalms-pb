import { getAllConversations } from "@/app/actions/chat";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SocialsTable } from "@/components/admin/socials/socials-table";
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"
import { isDirectMessagingEnabled } from "@/lib/features";

export default async function AdminSocialsPage() {
    if (!isDirectMessagingEnabled()) redirect("/admin");
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("ADMIN")) {
        redirect("/");
    }

    const conversations = await getAllConversations();

    return (
        <WorkspacePage>
            <MobileHeaderSetter title="Socials Monitoring" subtitle="Monitor all conversations within the platform." />

            <SocialsTable conversations={conversations} />
        </WorkspacePage>
    );
}
