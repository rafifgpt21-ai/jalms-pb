import assert from "node:assert/strict"
import test from "node:test"
import { contextFromPath, defaultCourseHref, groupsForContext } from "./navigation-config"
import type { NavigationCourse } from "../types/navigation"

function course(roleContext: "teacher" | "student", lastSectionKey?: string): NavigationCourse {
  return {
    id: "course-1",
    name: "Physical Education 11-A",
    roleContext,
    lastSectionKey,
    summary: { taskCount: 5, materialCount: 2, upcomingCount: 1 },
  }
}

test("course navigation omits Overview for teachers and students", () => {
  for (const roleContext of ["teacher", "student"] as const) {
    const sections = groupsForContext({ kind: "course", course: course(roleContext) }, [])
      .flatMap((group) => group.sections)

    assert.equal(sections.some((section) => section.id === "overview"), false)
    assert.equal(sections.some((section) => section.id === "tasks"), true)
    assert.equal(sections.some((section) => section.id === "chat"), true)
  }
})

test("course links fall back to Tasks", () => {
  assert.equal(defaultCourseHref(course("teacher")), "/teacher/courses/course-1/tasks")
  assert.equal(defaultCourseHref(course("student")), "/student/courses/course-1/tasks")
})

test("legacy Overview history falls back to Tasks", () => {
  assert.equal(defaultCourseHref(course("teacher", "overview")), "/teacher/courses/course-1/tasks")
  assert.equal(defaultCourseHref(course("student", "overview")), "/student/courses/course-1/tasks")
})

test("valid remembered course sections are preserved", () => {
  assert.equal(defaultCourseHref(course("teacher", "gradebook")), "/teacher/courses/course-1/gradebook")
  assert.equal(defaultCourseHref(course("student", "grades")), "/student/courses/course-1/grades")
  assert.equal(defaultCourseHref(course("teacher", "chat")), "/teacher/courses/course-1/chat")
  assert.equal(defaultCourseHref(course("student", "chat")), "/student/courses/course-1/chat")
})

test("direct-message destinations are omitted when the feature is disabled", () => {
  const messages = groupsForContext({ kind: "messages" }, [], false)
  const admin = groupsForContext({ kind: "admin" }, ["ADMIN"], false)

  assert.deepEqual(messages, [])
  assert.equal(admin.flatMap((group) => group.sections).some((section) => section.href.includes("socials")), false)
})

test("administration exposes miscellaneous settings", () => {
  const sections = groupsForContext({ kind: "admin" }, ["ADMIN"])
    .flatMap((group) => group.sections)

  assert.equal(sections.some((section) => section.href === "/admin/miscellaneous"), true)
})

test("primary role dashboard roots use the shared home context", () => {
  for (const href of ["/teacher", "/student", "/parent"]) {
    assert.deepEqual(contextFromPath(href, []), { kind: "home" })
  }
  assert.deepEqual(contextFromPath("/admin", []), { kind: "admin" })
  assert.deepEqual(contextFromPath("/homeroom", []), { kind: "homeroom" })
  assert.deepEqual(contextFromPath("/admin/users", []), { kind: "admin" })
})

test("dedicated rail contexts stay out of multi-role home navigation", () => {
  const groups = groupsForContext(
    { kind: "home" },
    ["SUBJECT_TEACHER", "STUDENT", "HOMEROOM_TEACHER", "ADMIN", "PARENT"],
  )

  assert.deepEqual(groups.map((group) => group.id), ["teaching", "learning", "family"])
  assert.equal(groups.some((group) => group.sections.some((section) => section.href.startsWith("/admin"))), false)
  assert.equal(groups.some((group) => group.sections.some((section) => section.href.startsWith("/homeroom"))), false)
  assert.equal(groups.some((group) => group.sections.some((section) => section.href === "/home")), false)
})

test("teacher home navigation exposes distinct attendance and weekly schedule destinations", () => {
  const sections = groupsForContext({ kind: "home" }, ["SUBJECT_TEACHER"])
    .flatMap((group) => group.sections)

  assert.equal(sections.some((section) => section.href === "/teacher/attendance"), true)
  assert.equal(sections.some((section) => section.href === "/teacher/schedule"), true)
})
