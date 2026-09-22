import { createHash } from "node:crypto"
import { MongoClient, ObjectId, type Db } from "mongodb"
import PocketBase from "pocketbase"

const mongoUrl = process.env.MONGODB_MIGRATION_URL || "mongodb://localhost:27017/jalms"
const pbUrl = process.env.POCKETBASE_URL || "http://127.0.0.1:8090"
const collections = ["users", "academic_years", "terms", "classes", "subjects", "courses", "materials", "material_folders", "material_assignments", "schedules", "enrollments", "course_enrollments", "assignments", "user_workspace_preferences", "course_navigation_states", "course_announcements", "course_chat_messages", "academic_rollovers", "academic_rollover_items", "management_audit_logs", "submissions", "attendances", "conversations", "messages", "quizzes", "quiz_folders", "quiz_questions", "quiz_choices", "report_cards", "system_configs"] as const
type CollectionName = (typeof collections)[number]
type JsonRecord = Record<string, any>

const sourceAliases: Partial<Record<CollectionName, string[]>> = {
  classes: ["Class", "class", "classes"],
  quizzes: ["Quiz", "quiz", "quizzes"],
}

const relationTargets: Record<string, Record<string, string>> = {
  users: { enrolledCourseIds: "courses", conversationIds: "conversations" },
  terms: { academicYearId: "academic_years" },
  classes: { termId: "terms", homeroomTeacherId: "users" },
  courses: { subjectId: "subjects", classId: "classes", termId: "terms", teacherId: "users", studentIds: "users" },
  materials: { teacherId: "users", courseId: "courses", folderId: "material_folders" },
  material_folders: { teacherId: "users" },
  material_assignments: { materialId: "materials", courseId: "courses" },
  schedules: { courseId: "courses" },
  enrollments: { studentId: "users", classId: "classes", createdById: "users" },
  course_enrollments: { courseId: "courses", studentId: "users", sourceClassId: "classes", createdById: "users" },
  assignments: { courseId: "courses", quizId: "quizzes" },
  user_workspace_preferences: { userId: "users" },
  course_navigation_states: { userId: "users", courseId: "courses" },
  course_announcements: { courseId: "courses", authorId: "users" },
  course_chat_messages: { courseId: "courses", senderId: "users" },
  academic_rollovers: { sourceTermId: "terms", targetTermId: "terms", actorId: "users" },
  academic_rollover_items: { rolloverId: "academic_rollovers" },
  management_audit_logs: { actorId: "users" },
  submissions: { assignmentId: "assignments", studentId: "users" },
  attendances: { courseId: "courses", studentId: "users" },
  messages: { conversationId: "conversations", senderId: "users" },
  quizzes: { teacherId: "users", folderId: "quiz_folders" },
  quiz_folders: { teacherId: "users" },
  quiz_questions: { quizId: "quizzes" },
  quiz_choices: { questionId: "quiz_questions" },
  report_cards: { studentId: "users", classId: "classes", termId: "terms" },
}

const nativeFileFields: Record<string, { source: string; target: string }[]> = {
  users: [{ source: "image", target: "avatar" }],
  courses: [{ source: "iconImageUrl", target: "icon" }],
  materials: [{ source: "fileUrl", target: "file" }],
  submissions: [{ source: "attachmentUrl", target: "attachment" }],
  quiz_questions: [{ source: "imageUrl", target: "image" }, { source: "audioUrl", target: "audio" }],
  quiz_choices: [{ source: "imageUrl", target: "image" }],
}

function legacyId(value: unknown) {
  if (value instanceof ObjectId) return value.toHexString()
  if (typeof value === "string") return value
  if (value && typeof value === "object" && typeof (value as { toHexString?: unknown }).toHexString === "function") {
    return String((value as { toHexString: () => string }).toHexString())
  }
  return String(value ?? "")
}

function serializable(value: unknown): unknown {
  if (value instanceof ObjectId) return value.toHexString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(serializable)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, item]) => [key, serializable(item)]))
  }
  return value
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value as JsonRecord).sort().map((key) => [key, canonical((value as JsonRecord)[key])]))
  }
  return value
}

function checksum(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")
}

function resolveSourceName(available: string[], collection: CollectionName) {
  const aliases = sourceAliases[collection] || []
  return aliases.find((alias) => available.includes(alias)) || available.find((name) => {
    const normalize = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s$/, "")
    return normalize(name) === normalize(collection)
  })
}

async function recordsByCollection(db: Db, pb: PocketBase) {
  const available = (await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name)
  const source: Record<string, JsonRecord[]> = {}
  const target: Record<string, JsonRecord[]> = {}
  for (const collection of collections) {
    const sourceName = resolveSourceName(available, collection)
    source[collection] = sourceName ? await db.collection(sourceName).find({}).toArray() as unknown as JsonRecord[] : []
    target[collection] = await pb.collection(collection).getFullList({ sort: "legacyId" }) as unknown as JsonRecord[]
  }
  return { source, target }
}

function checksumData(collection: string, value: unknown) {
  if (collection !== "users") return value
  // Password hashes are intentionally not compared: PocketBase Auth may
  // rehash credentials while profile/role data must remain identical.
  const record = value as JsonRecord
  return Object.fromEntries([
    "email", "name", "roles", "nickname",
  ].map((field) => [field, record[field] === undefined || record[field] === "" ? null : record[field]]))
}

function checksumForSource(collection: string, records: JsonRecord[]) {
  return checksum(records
    .map((record) => ({ legacyId: legacyId(record._id ?? record.id), data: checksumData(collection, serializable(record)) }))
    .sort((left, right) => left.legacyId.localeCompare(right.legacyId)))
}

function checksumForTarget(collection: string, records: JsonRecord[]) {
  return checksum(records
    .map((record) => ({
      legacyId: String(record.legacyId || ""),
      data: checksumData(collection, collection === "users" ? record : record.legacyData),
    }))
    .sort((left, right) => left.legacyId.localeCompare(right.legacyId)))
}

function relationIds(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  return value ? [String(value)] : []
}

function groupedCount(records: JsonRecord[], field: string, keyMap?: Map<string, string>) {
  const counts = new Map<string, number>()
  for (const record of records) {
    const raw = Array.isArray(record[field]) ? record[field][0] : record[field]
    if (!raw) continue
    const key = keyMap?.get(legacyId(raw)) || legacyId(raw)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return counts
}

async function main() {
  const email = process.env.PB_SUPERUSER_EMAIL
  const password = process.env.PB_SUPERUSER_PASSWORD
  if (!email || !password) throw new Error("PB_SUPERUSER_EMAIL dan PB_SUPERUSER_PASSWORD wajib diisi.")

  const mongo = new MongoClient(mongoUrl)
  await mongo.connect()
  const db = mongo.db()
  const pb = new PocketBase(pbUrl)
  pb.autoCancellation(false)
  await pb.collection("_superusers").authWithPassword(email, password)

  const failures: string[] = []
  const { source, target } = await recordsByCollection(db, pb)
  const targetIdSets = Object.fromEntries(collections.map((name) => [name, new Set(target[name].map((record) => String(record.id))) ])) as Record<string, Set<string>>
  const legacyMaps = Object.fromEntries(collections.map((name) => [name, new Map(target[name].map((record) => [String(record.legacyId), String(record.id)]))])) as Record<string, Map<string, string>>
  const collectionResults: Record<string, JsonRecord> = {}

  for (const collection of collections) {
    const sourceChecksum = checksumForSource(collection, source[collection])
    const targetChecksum = checksumForTarget(collection, target[collection])
    collectionResults[collection] = {
      source: source[collection].length,
      target: target[collection].length,
      delta: target[collection].length - source[collection].length,
      checksum: sourceChecksum === targetChecksum ? "ok" : "mismatch",
    }
    if (collectionResults[collection].delta !== 0) failures.push(`${collection}: record count mismatch`)
    if (sourceChecksum !== targetChecksum) failures.push(`${collection}: legacyData checksum mismatch`)
  }

  for (const [collection, fields] of Object.entries(relationTargets)) {
    for (const record of target[collection] || []) {
      for (const [field, targetCollection] of Object.entries(fields)) {
        for (const id of relationIds(record[field])) {
          if (!targetIdSets[targetCollection]?.has(id)) failures.push(`${collection}/${record.legacyId}.${field} points to missing ${targetCollection}/${id}`)
        }
      }
    }
  }

  const sourceClassKeys = new Map(source.classes.map((record) => [legacyId(record._id ?? record.id), String(target.classes.find((item) => item.legacyId === legacyId(record._id ?? record.id))?.id || "")]))
  const sourceCourseKeys = new Map(source.courses.map((record) => [legacyId(record._id ?? record.id), String(target.courses.find((item) => item.legacyId === legacyId(record._id ?? record.id))?.id || "")]))
  const classCountsSource = groupedCount(source.enrollments, "classId")
  const classCountsTarget = groupedCount(target.enrollments, "classId")
  for (const [sourceClassId, count] of classCountsSource) {
    const targetClassId = sourceClassKeys.get(sourceClassId)
    if ((classCountsTarget.get(targetClassId || "") || 0) !== count) failures.push(`class ${sourceClassId}: student count mismatch`)
  }
  const courseCountsSource = groupedCount(source.course_enrollments, "courseId")
  const courseCountsTarget = groupedCount(target.course_enrollments, "courseId")
  for (const [sourceCourseId, count] of courseCountsSource) {
    const targetCourseId = sourceCourseKeys.get(sourceCourseId)
    if ((courseCountsTarget.get(targetCourseId || "") || 0) !== count) failures.push(`course ${sourceCourseId}: student count mismatch`)
  }

  const chatOrderChecks: Record<string, number> = {}
  for (const [collection, groupField] of [["course_chat_messages", "courseId"], ["messages", "conversationId"]] as const) {
    const sourceGroups = new Map<string, string[]>()
    for (const record of source[collection]) {
      const group = legacyId(record[groupField])
      const list = sourceGroups.get(group) || []
      list.push(legacyId(record._id ?? record.id))
      sourceGroups.set(group, list)
    }
    for (const [group, ids] of sourceGroups) {
      const targetGroup = legacyMaps[groupField === "courseId" ? "courses" : "conversations"]?.get(group) || ""
      const targetIds = target[collection]
        .filter((record) => String(record[groupField]) === targetGroup)
        .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)))
        .map((record) => String(record.legacyId))
      chatOrderChecks[collection] = (chatOrderChecks[collection] || 0) + 1
      if (JSON.stringify(ids) !== JSON.stringify(targetIds)) failures.push(`${collection}/${group}: message order mismatch`)
    }
  }

  const fileChecks: string[] = []
  for (const [collection, fields] of Object.entries(nativeFileFields)) {
    for (const sourceRecord of source[collection] || []) {
      const targetRecord = target[collection].find((record) => String(record.legacyId) === legacyId(sourceRecord._id ?? sourceRecord.id))
      for (const field of fields) {
        if (sourceRecord[field.source] && !targetRecord?.[field.target]) {
          fileChecks.push(`${collection}/${sourceRecord._id}.${field.source}`)
          failures.push(`${collection}/${sourceRecord._id}: native file ${field.target} is missing`)
        }
      }
    }
  }

  const demoAccounts = [
    ["guru@demo.jalms.id", ["SUBJECT_TEACHER", "HOMEROOM_TEACHER"]],
    ["siswa@demo.jalms.id", ["STUDENT"]],
    ["admin@demo.jalms.id", ["ADMIN"]],
  ] as const
  const demoPassword = process.env.PB_MIGRATION_PASSWORD
  if (!demoPassword) throw new Error("PB_MIGRATION_PASSWORD wajib diisi untuk verifikasi akun demo.")
  const loginChecks: JsonRecord[] = []
  for (const [demoEmail, expectedRoles] of demoAccounts) {
    const client = new PocketBase(pbUrl)
    try {
      const auth = await client.collection("users").authWithPassword(demoEmail, demoPassword)
      const roles = Array.isArray(auth.record.roles) ? auth.record.roles.map(String) : []
      const rolesOk = expectedRoles.every((role) => roles.includes(role))
      loginChecks.push({ email: demoEmail, ok: rolesOk, roles })
      if (!rolesOk) failures.push(`${demoEmail}: role mismatch`)
    } catch (error) {
      loginChecks.push({ email: demoEmail, ok: false })
      failures.push(`${demoEmail}: login failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const unauthenticated = new PocketBase(pbUrl)
  let unauthenticatedDenied = false
  try {
    // PocketBase returns an empty list (rather than HTTP 403) when a list rule
    // filters every record, so both an error and zero visible records mean the
    // anonymous request was denied.
    const page = await unauthenticated.collection("courses").getList(1, 1)
    unauthenticatedDenied = page.totalItems === 0
  } catch (_) { unauthenticatedDenied = true }
  if (!unauthenticatedDenied) failures.push("courses: unauthenticated list access was not denied")

  console.log(JSON.stringify({
    ok: failures.length === 0,
    source: mongoUrl,
    target: pbUrl,
    collections: collectionResults,
    foreignKeys: failures.filter((failure) => failure.includes("points to missing")),
    studentCounts: { classes: classCountsSource.size, courses: courseCountsSource.size },
    chatOrderChecks,
    fileChecks,
    loginChecks,
    access: { unauthenticatedDenied },
    failures,
  }, null, 2))
  await mongo.close()
  if (failures.length) process.exitCode = 2
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
