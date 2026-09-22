import assert from "node:assert/strict"
import test from "node:test"
import { getDefaultDashboardHref } from "./role-dashboard"

test("routes single-role users to their dashboard", () => {
  assert.equal(getDefaultDashboardHref(["ADMIN"]), "/admin")
  assert.equal(getDefaultDashboardHref(["SUBJECT_TEACHER"]), "/teacher")
  assert.equal(getDefaultDashboardHref(["HOMEROOM_TEACHER"]), "/homeroom")
  assert.equal(getDefaultDashboardHref(["STUDENT"]), "/student")
  assert.equal(getDefaultDashboardHref(["PARENT"]), "/parent")
})

test("prioritizes daily academic work for multi-role users", () => {
  assert.equal(getDefaultDashboardHref(["ADMIN", "HOMEROOM_TEACHER", "SUBJECT_TEACHER"]), "/teacher")
  assert.equal(getDefaultDashboardHref(["ADMIN", "STUDENT"]), "/student")
  assert.equal(getDefaultDashboardHref(["ADMIN", "HOMEROOM_TEACHER"]), "/homeroom")
})

test("falls back safely when an account has no role", () => {
  assert.equal(getDefaultDashboardHref([]), "/socials")
})

