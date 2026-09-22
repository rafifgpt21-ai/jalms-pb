"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import {
  getCourseChatAccess,
} from "@/lib/course-chat"
import {
  COURSE_CHAT_MAX_LENGTH,
  COURSE_CHAT_PAGE_SIZE,
  type CourseChatRoleContext,
} from "@/lib/course-chat.shared"

export type CourseChatCursor = { createdAt: string; id: string }

export type CourseChatMessageDto = {
  id: string
  courseId: string
  content: string
  createdAt: string
  sender: {
    id: string
    name: string
    nickname: string | null
    image: string | null
  }
}

export type CourseChatPage = {
  messages: CourseChatMessageDto[]
  hasMore: boolean
  oldestCursor: CourseChatCursor | null
  latestCursor: CourseChatCursor | null
}

const senderSelect = { id: true, name: true, nickname: true, image: true } as const

function serializeMessage(message: {
  id: string
  courseId: string
  content: string
  createdAt: Date
  sender: { id: string; name: string; nickname: string | null; image: string | null }
}): CourseChatMessageDto {
  return { ...message, createdAt: message.createdAt.toISOString() }
}

function cursorFor(message: CourseChatMessageDto): CourseChatCursor {
  return { id: message.id, createdAt: message.createdAt }
}

function parseCursor(cursor: CourseChatCursor | undefined) {
  if (!cursor || !/^[a-z0-9]{15}$/i.test(cursor.id)) return null
  const createdAt = new Date(cursor.createdAt)
  if (Number.isNaN(createdAt.getTime())) return null
  return { id: cursor.id, createdAt }
}

async function requireAccess(courseId: string) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false as const, error: "Unauthorized" as const }
  const course = await getCourseChatAccess(courseId, userId)
  if (!course) return { ok: false as const, error: "Course not found or access denied" as const }
  return { ok: true as const, userId, course }
}

async function persistCourseChatRead(
  access: Extract<Awaited<ReturnType<typeof requireAccess>>, { ok: true }>,
  roleContext: CourseChatRoleContext,
  lastSeenChatAt: Date,
) {
  const storedRoleContext = roleContext === "teacher" ? "TEACHER" : "STUDENT"
  await db.courseNavigationState.upsert({
    where: {
      userId_courseId_roleContext: {
        userId: access.userId,
        courseId: access.course.id,
        roleContext: storedRoleContext,
      },
    },
    create: {
      userId: access.userId,
      courseId: access.course.id,
      roleContext: storedRoleContext,
      lastSectionKey: "chat",
      lastSeenChatAt,
    },
    update: { lastSeenChatAt },
  })
}

export async function getCourseChatMessages(
  courseId: string,
  before?: CourseChatCursor,
  roleContext?: CourseChatRoleContext,
) {
  const access = await requireAccess(courseId)
  if (!access.ok) return { error: access.error }

  // Persist the read receipt as part of the initial page load. Relying only on
  // the client's fire-and-forget request lets a later reload restore stale
  // unread state if the user navigates away before that request completes.
  const openedAt = before || !roleContext ? null : new Date()
  const cursor = parseCursor(before)
  const records = await db.courseChatMessage.findMany({
    where: {
      courseId,
      ...(cursor ? {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      } : {}),
    },
    include: { sender: { select: senderSelect } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: COURSE_CHAT_PAGE_SIZE + 1,
  })

  const hasMore = records.length > COURSE_CHAT_PAGE_SIZE
  const messages = records.slice(0, COURSE_CHAT_PAGE_SIZE).reverse().map(serializeMessage)
  if (openedAt && roleContext) await persistCourseChatRead(access, roleContext, openedAt)
  return {
    messages,
    hasMore,
    oldestCursor: messages[0] ? cursorFor(messages[0]) : null,
    latestCursor: messages.at(-1) ? cursorFor(messages.at(-1)!) : null,
  } satisfies CourseChatPage
}

export async function getCourseChatUpdates(courseId: string, after: CourseChatCursor | null) {
  const access = await requireAccess(courseId)
  if (!access.ok) return { error: access.error }

  const cursor = parseCursor(after ?? undefined)
  const records = await db.courseChatMessage.findMany({
    where: {
      courseId,
      ...(cursor ? {
        OR: [
          { createdAt: { gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { gt: cursor.id } },
        ],
      } : {}),
    },
    include: { sender: { select: senderSelect } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: COURSE_CHAT_PAGE_SIZE + 1,
  })

  const hasMore = records.length > COURSE_CHAT_PAGE_SIZE
  const messages = records.slice(0, COURSE_CHAT_PAGE_SIZE).map(serializeMessage)
  return {
    messages,
    hasMore,
    latestCursor: messages.at(-1) ? cursorFor(messages.at(-1)!) : after,
  }
}

export async function sendCourseChatMessage(courseId: string, rawContent: string) {
  const access = await requireAccess(courseId)
  if (!access.ok) return { error: access.error }

  const content = rawContent.trim()
  if (!content) return { error: "Message cannot be empty" as const }
  if (content.length > COURSE_CHAT_MAX_LENGTH) {
    return { error: `Message cannot exceed ${COURSE_CHAT_MAX_LENGTH} characters` as const }
  }

  const message = await db.courseChatMessage.create({
    data: { courseId, senderId: access.userId, content },
    include: { sender: { select: senderSelect } },
  })
  const serialized = serializeMessage(message)

  return { success: true as const, message: serialized }
}

export async function markCourseChatRead(courseId: string, roleContext: CourseChatRoleContext) {
  const access = await requireAccess(courseId)
  if (!access.ok) return { error: access.error }

  await persistCourseChatRead(access, roleContext, new Date())
  return { success: true as const }
}
