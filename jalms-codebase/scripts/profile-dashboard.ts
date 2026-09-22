import { db } from "../lib/db"
import { getAssignmentsOverview, getClassesToday } from "../lib/actions/teacher.actions"

async function main() {
  const teacher = await db.user.findFirst({
    where: { roles: { has: "SUBJECT_TEACHER" } },
    select: { id: true },
  })
  if (!teacher) throw new Error("No teacher account is available for profiling")

  const start = performance.now()
  const [classes, assignments] = await Promise.all([
    getClassesToday(teacher.id),
    getAssignmentsOverview(teacher.id),
  ])

  if (classes.error || assignments.error) throw new Error("Dashboard query failed")
  console.log(`Teacher dashboard data: ${(performance.now() - start).toFixed(2)}ms`)
}

void main().finally(() => db.$disconnect())
