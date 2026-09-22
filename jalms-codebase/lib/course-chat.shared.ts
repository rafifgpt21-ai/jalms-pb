export const COURSE_CHAT_PAGE_SIZE = 50
export const COURSE_CHAT_MAX_LENGTH = 2000
export const COURSE_CHAT_CHANNEL_PREFIX = "private-course-chat-"
export const COURSE_CHAT_EVENT = "course-message-created"

export type CourseChatRoleContext = "teacher" | "student"

export function latestSeenChatByCourse(states: ReadonlyArray<{ courseId: string; lastSeenChatAt: Date | null }>) {
  const seenByCourseId = new Map<string, Date>()
  for (const state of states) {
    if (!state.lastSeenChatAt) continue
    const current = seenByCourseId.get(state.courseId)
    if (!current || state.lastSeenChatAt > current) seenByCourseId.set(state.courseId, state.lastSeenChatAt)
  }
  return seenByCourseId
}

export function courseChatChannel(courseId: string) {
  return `${COURSE_CHAT_CHANNEL_PREFIX}${courseId}`
}

export function courseIdFromChatChannel(channelName: string) {
  const match = channelName.match(/^private-course-chat-([a-z0-9]{15})$/i)
  return match?.[1] ?? null
}
