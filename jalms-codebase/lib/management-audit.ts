import { auth } from "@/auth"
import { db } from "@/lib/db"

function json(value: unknown) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

export async function recordManagementChange(input: {
  entityType: "SUBJECT" | "CLASS" | "COURSE" | "ROLLOVER"
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  metadata?: unknown
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) return
    await db.managementAuditLog.create({
      data: {
        actorId: session.user.id,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        before: json(input.before),
        after: json(input.after),
        metadata: json(input.metadata),
      },
    })
  } catch (error) {
    console.error("Unable to write management audit log", error)
  }
}
