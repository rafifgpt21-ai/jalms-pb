import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { getDefaultDashboardHref } from "@/lib/role-dashboard"

export default async function LegacyHomeRedirect() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  })

  redirect(getDefaultDashboardHref(user?.roles ?? session.user.roles ?? []))
}
