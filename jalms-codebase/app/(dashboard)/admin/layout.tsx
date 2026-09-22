import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { AdminShell } from "@/components/admin/admin-shell"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    // Fetch fresh roles from database to handle immediate role updates
    // This bypasses the potentially stale session/cookie data
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { roles: true }
    })

    if (!user || !user.roles.includes("ADMIN")) {
        // If user is a teacher/student but tries to access admin, redirect them to their dashboard
        // Or just home
        return redirect("/")
    }

    return <AdminShell>{children}</AdminShell>
}
