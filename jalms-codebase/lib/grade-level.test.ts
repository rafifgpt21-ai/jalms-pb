import assert from "node:assert/strict"
import test from "node:test"
import { GradeLevel, SemesterType } from "@prisma/client"
import {
  educationStage,
  getGradeTransition,
  inferGradeLevelFromName,
  nextGradeLevel,
  suggestPromotedClassName,
  suggestRolloverCourseName,
} from "./grade-level"

test("derives Indonesian school stages", () => {
  assert.equal(educationStage(GradeLevel.GRADE_7), "SMP")
  assert.equal(educationStage(GradeLevel.GRADE_9), "SMP")
  assert.equal(educationStage(GradeLevel.GRADE_10), "SMA")
  assert.equal(educationStage(GradeLevel.GRADE_12), "SMA")
})

test("advances grades and stops after grade 12", () => {
  assert.equal(nextGradeLevel(GradeLevel.GRADE_9), GradeLevel.GRADE_10)
  assert.equal(nextGradeLevel(GradeLevel.GRADE_11), GradeLevel.GRADE_12)
  assert.equal(nextGradeLevel(GradeLevel.GRADE_12), null)
})

test("infers only unambiguous leading grade numbers", () => {
  assert.equal(inferGradeLevelFromName("10"), GradeLevel.GRADE_10)
  assert.equal(inferGradeLevelFromName("10A"), GradeLevel.GRADE_10)
  assert.equal(inferGradeLevelFromName("Kelas 9-B"), GradeLevel.GRADE_9)
  assert.equal(inferGradeLevelFromName("Science 10"), null)
})

test("suggests promoted class and course names", () => {
  assert.equal(suggestPromotedClassName("10", GradeLevel.GRADE_10, GradeLevel.GRADE_11), "11")
  assert.equal(suggestPromotedClassName("10-A", GradeLevel.GRADE_10, GradeLevel.GRADE_11), "11-A")
  assert.equal(suggestPromotedClassName("Science A", GradeLevel.GRADE_10, GradeLevel.GRADE_11), "Science A")
  assert.equal(suggestRolloverCourseName("Biology 10-A", "10-A", "11-A"), "Biology 11-A")
})

test("recognizes only supported term transitions", () => {
  assert.equal(getGradeTransition(
    { type: SemesterType.ODD, academicYearId: "a" },
    { type: SemesterType.EVEN, academicYearId: "a" },
  ), "CONTINUE")
  assert.equal(getGradeTransition(
    { type: SemesterType.EVEN, academicYearId: "a" },
    { type: SemesterType.ODD, academicYearId: "b" },
  ), "PROMOTE")
  assert.equal(getGradeTransition(
    { type: SemesterType.ODD, academicYearId: "a" },
    { type: SemesterType.ODD, academicYearId: "b" },
  ), null)
})
