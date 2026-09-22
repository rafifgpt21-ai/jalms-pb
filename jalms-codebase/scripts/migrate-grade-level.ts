import { GradeLevel } from "@prisma/client"
import { MongoClient, ObjectId } from "mongodb"
import { inferGradeLevelFromName } from "../lib/grade-level"

process.loadEnvFile()

const apply = process.argv.includes("--apply")
const databaseUrl: string = (() => {
  const value = process.env.DATABASE_URL
  if (!value) throw new Error("DATABASE_URL is required")
  return value
})()

type RawClass = {
  _id: ObjectId
  name: string
  termId: ObjectId
  gradeLevel?: GradeLevel | null
  deletedAt?: Date | null
}

type RawTerm = {
  _id: ObjectId
  type: string
  academicYearId: ObjectId
}

type RawAcademicYear = {
  _id: ObjectId
  name: string
}

async function main() {
  const client = new MongoClient(databaseUrl)
  await client.connect()

  try {
    const database = client.db()
    const [classes, terms, academicYears] = await Promise.all([
      database.collection<RawClass>("Class").find({}).sort({ name: 1 }).toArray(),
      database.collection<RawTerm>("Term").find({}).toArray(),
      database.collection<RawAcademicYear>("AcademicYear").find({}).toArray(),
    ])
    const termById = new Map(terms.map((item) => [item._id.toHexString(), item]))
    const academicYearById = new Map(academicYears.map((item) => [item._id.toHexString(), item]))

    const inferred: Array<{ id: string; name: string; term: string; gradeLevel: GradeLevel }> = []
    const unresolved: Array<{ id: string; name: string; term: string; archived: boolean }> = []
    const assigned: Array<{ id: string; name: string; gradeLevel: GradeLevel }> = []

    for (const item of classes) {
      if (item.gradeLevel) {
        assigned.push({ id: item._id.toHexString(), name: item.name, gradeLevel: item.gradeLevel })
        continue
      }

      const term = termById.get(item.termId.toHexString())
      const academicYear = term ? academicYearById.get(term.academicYearId.toHexString()) : null
      const termLabel = term ? `${academicYear?.name ?? "Unknown year"} ${term.type}` : "Unknown semester"
      const gradeLevel = inferGradeLevelFromName(item.name)
      if (gradeLevel) inferred.push({ id: item._id.toHexString(), name: item.name, term: termLabel, gradeLevel })
      else unresolved.push({ id: item._id.toHexString(), name: item.name, term: termLabel, archived: Boolean(item.deletedAt) })
    }

    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", assigned, inferred, unresolved }, null, 2))

    if (!apply) {
      console.log("Dry run only. Resolve ambiguous names, then re-run with --apply.")
      return
    }

    if (inferred.length > 0) {
      await database.collection<RawClass>("Class").bulkWrite(inferred.map((item) => ({
        updateOne: {
          filter: { _id: new ObjectId(item.id), gradeLevel: { $exists: false } },
          update: { $set: { gradeLevel: item.gradeLevel } },
        },
      })))
    }

    if (unresolved.length > 0) {
      throw new Error(`${unresolved.length} classes still need a grade level. Rename or update them before deployment.`)
    }

    console.log(`Assigned grade levels to ${inferred.length} classes.`)
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
