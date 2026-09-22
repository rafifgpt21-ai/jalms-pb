import assert from "node:assert/strict"
import test from "node:test"
import {
  COURSE_CHAT_EVENT,
  courseChatChannel,
  courseIdFromChatChannel,
  latestSeenChatByCourse,
} from "./course-chat.shared"

const COURSE_ID = "507f1f77bcf86cd799439011"

test("course chat channels use the private course namespace", () => {
  assert.equal(courseChatChannel(COURSE_ID), `private-course-chat-${COURSE_ID}`)
  assert.equal(COURSE_CHAT_EVENT, "course-message-created")
})

test("course channel parsing accepts only an exact MongoDB ObjectId channel", () => {
  assert.equal(courseIdFromChatChannel(`private-course-chat-${COURSE_ID}`), COURSE_ID)
  assert.equal(courseIdFromChatChannel(`public-course-chat-${COURSE_ID}`), null)
  assert.equal(courseIdFromChatChannel(`private-course-chat-${COURSE_ID}-extra`), null)
  assert.equal(courseIdFromChatChannel("private-course-chat-not-an-object-id"), null)
})

test("course chat read state uses the latest timestamp across role contexts", () => {
  const earlier = new Date("2026-07-18T10:00:00.000Z")
  const later = new Date("2026-07-18T11:00:00.000Z")
  const seenByCourse = latestSeenChatByCourse([
    { courseId: COURSE_ID, lastSeenChatAt: later },
    { courseId: COURSE_ID, lastSeenChatAt: null },
    { courseId: "69cd5ece8b0d545806448b9b", lastSeenChatAt: earlier },
  ])

  assert.equal(seenByCourse.get(COURSE_ID), later)
})
