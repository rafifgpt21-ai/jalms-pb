import { MongoClient, ObjectId, type Db } from "mongodb"
import PocketBase from "pocketbase"
import { mkdir, writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const DEFAULT_MONGO_URL = "mongodb://localhost:27017/jalms"
const DEFAULT_POCKETBASE_URL = "http://127.0.0.1:8090"
const REPORT_FILE = process.env.PB_MIGRATION_REPORT || path.resolve(process.cwd(), "migration-report.json")
const migrationOrder = [
  "users", "academic_years", "terms", "subjects", "classes", "courses", "enrollments", "course_enrollments",
  "material_folders", "materials", "material_assignments", "schedules", "quiz_folders", "quizzes", "quiz_questions",
  "quiz_choices", "assignments", "submissions", "attendances", "course_announcements", "course_chat_messages",
  "conversations", "messages", "user_workspace_preferences", "course_navigation_states", "report_cards",
  "academic_rollovers", "academic_rollover_items", "management_audit_logs", "system_configs",
] as const
type TargetCollection = (typeof migrationOrder)[number]
type JsonRecord = Record<string, unknown>
type MigrationMode = "full" | "dry"

const relationTargets: Record<string, Record<string, TargetCollection>> = {
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
const fileSources: Record<string, { source: string; field: string }[]> = {
  users: [{ source: "image", field: "avatar" }],
  courses: [{ source: "iconImageUrl", field: "icon" }],
  materials: [{ source: "fileUrl", field: "file" }],
  submissions: [{ source: "attachmentUrl", field: "attachment" }],
  quiz_questions: [{ source: "imageUrl", field: "image" }, { source: "audioUrl", field: "audio" }],
  quiz_choices: [{ source: "imageUrl", field: "image" }],
}

type ReportBatch = { source: number; imported: number; updated: number; skipped: number; failed: number; missingSource: boolean; errors: string[] }
type MigrationReport = {
  startedAt: string; finishedAt?: string; mode: MigrationMode; source: string; target: string
  batches: Record<string, ReportBatch>; mappings: Record<string, Record<string, string>>; fileErrors: string[]; warnings: string[]
}

function asObjectIdString(value: unknown) {
  if (value instanceof ObjectId) return value.toHexString()
  if (typeof value === "string") return value
  if (value && typeof value === "object" && "toHexString" in value && typeof (value as { toHexString?: unknown }).toHexString === "function") return String((value as { toHexString: () => string }).toHexString())
  return String(value ?? "")
}
function toSerializable(value: unknown): unknown {
  if (value instanceof ObjectId) return value.toHexString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(toSerializable)
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, item]) => [key, toSerializable(item)]))
  return value
}
function normalizeCollectionName(name: string) { return name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s$/, "") }
const sourceAliases: Partial<Record<TargetCollection, string[]>> = {
  classes: ["Class", "class", "classes"],
  quizzes: ["Quiz", "quiz", "quizzes"],
}
async function resolveSourceCollection(db: Db, target: TargetCollection, available: string[]) {
  const aliases = sourceAliases[target] || []
  const alias = aliases.find((candidate) => available.some((name) => name === candidate))
  if (alias) return db.collection(alias)
  const normalizedTarget = normalizeCollectionName(target)
  const exact = available.find((name) => normalizeCollectionName(name) === normalizedTarget)
  if (exact) return db.collection(exact)
  const modelName = target.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/s$/, "")).join("")
  const modelMatch = available.find((name) => normalizeCollectionName(name) === normalizeCollectionName(modelName))
  return modelMatch ? db.collection(modelMatch) : null
}
function escapeFilter(value: string) { return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"') }
function getIdMapping(mappings: MigrationReport["mappings"], collection: string, legacyId: string) { return mappings[collection]?.[legacyId] }
function convertRelationValue(collection: TargetCollection, field: string, value: unknown, mappings: MigrationReport["mappings"]) {
  const target = relationTargets[collection]?.[field]
  if (!target) return toSerializable(value)
  if (Array.isArray(value)) return value.map((item) => getIdMapping(mappings, target, asObjectIdString(item))).filter(Boolean)
  if (value === null || value === undefined || value === "") return ""
  return getIdMapping(mappings, target, asObjectIdString(value)) || ""
}
function migrationPassword(email: string) {
  const password = process.env.PB_MIGRATION_PASSWORD
  if (!password) throw new Error("PB_MIGRATION_PASSWORD wajib diisi untuk migrasi penuh.")
  return password
}
function errorMessage(error: unknown) {
  const candidate = error as { response?: unknown; message?: string }
  if (candidate.response) return `${candidate.message || "PocketBase error"} ${JSON.stringify(candidate.response)}`
  return error instanceof Error ? error.message : String(error)
}
async function loadPocketBaseSchema(pb: PocketBase) {
  const schema: Record<string, Set<string>> = {}
  for (const collection of migrationOrder) {
    const model = await pb.collections.getOne(collection) as unknown as { fields?: Array<{ name: string }> }
    schema[collection] = new Set((model.fields || []).map((field) => field.name))
  }
  return schema
}
function buildPocketBaseData(collection: TargetCollection, source: JsonRecord, fields: Set<string>, mappings: MigrationReport["mappings"]) {
  const data: JsonRecord = { legacyId: asObjectIdString(source._id ?? source.id), legacyData: toSerializable(source) }
  for (const [key, rawValue] of Object.entries(source)) {
    if (["_id", "id", "password", "image"].includes(key) || !fields.has(key) || ["legacyId", "legacyData"].includes(key)) continue
    data[key] = relationTargets[collection]?.[key] ? convertRelationValue(collection, key, rawValue, mappings) : toSerializable(rawValue)
  }
  if (collection === "users" && typeof source.image === "string" && fields.has("imageUrl")) data.imageUrl = source.image
  if (collection === "system_configs") data.key = asObjectIdString(source._id ?? source.id)
  return data
}
async function getExistingRecord(pb: PocketBase, collection: string, legacyId: string) {
  try { return await pb.collection(collection).getFirstListItem(`legacyId = "${escapeFilter(legacyId)}"`) } catch (_) { return null }
}
async function importUser(pb: PocketBase, source: JsonRecord, fields: Set<string>, report: MigrationReport) {
  const legacyId = asObjectIdString(source._id ?? source.id)
  const email = String(source.email || `${legacyId}@migration.invalid`).toLowerCase()
  const existing = await getExistingRecord(pb, "users", legacyId)
  const data = buildPocketBaseData("users", source, fields, report.mappings)
  data.email = email; data.name = String(source.name || email); data.emailVisibility = true
  if (!existing) { data.password = migrationPassword(email); data.passwordConfirm = data.password }
  if (source.verified !== undefined) data.verified = Boolean(source.verified)
  if (typeof source.password === "string" && fields.has("legacyPasswordHash")) data.legacyPasswordHash = source.password
  try {
    const record = existing ? await pb.collection("users").update(existing.id, data) : await pb.collection("users").create(data)
    report.mappings.users[legacyId] = record.id
    return existing ? "updated" : "imported"
  } catch (error) {
    report.batches.users.errors.push(`${legacyId}: ${errorMessage(error)}`); return "failed"
  }
}
async function importRecord(pb: PocketBase, collection: TargetCollection, source: JsonRecord, fields: Set<string>, report: MigrationReport) {
  const legacyId = asObjectIdString(source._id ?? source.id)
  const existing = await getExistingRecord(pb, collection, legacyId)
  try {
    const record = existing ? await pb.collection(collection).update(existing.id, buildPocketBaseData(collection, source, fields, report.mappings)) : await pb.collection(collection).create(buildPocketBaseData(collection, source, fields, report.mappings))
    report.mappings[collection][legacyId] = record.id
    return existing ? "updated" : "imported"
  } catch (error) {
    report.batches[collection].errors.push(`${legacyId}: ${errorMessage(error)}`); return "failed"
  }
}
async function downloadAsFile(value: unknown, sourceRoot: string) {
  if (typeof value !== "string" || !value) return null
  if (value.startsWith("/api/files/") || value.startsWith("/uploads/")) {
    const localPath = path.resolve(sourceRoot, value.replace(/^\/api\/files\//, "").replace(/^\/uploads\//, ""))
    try { return new File([await readFile(localPath)], path.basename(localPath)) } catch (_) { return null }
  }
  try {
    const response = await fetch(value); if (!response.ok) return null
    const bytes = await response.arrayBuffer(); const filename = path.basename(new URL(value).pathname) || "migrated-file"
    return new File([bytes], filename, { type: response.headers.get("content-type") || "application/octet-stream" })
  } catch (_) { return null }
}
async function migrateFiles(pb: PocketBase, collection: TargetCollection, source: JsonRecord, pbId: string, report: MigrationReport) {
  for (const { source: sourceField, field } of fileSources[collection] || []) {
    const value = source[sourceField]; if (!value || typeof value !== "string") continue
    const file = await downloadAsFile(value, path.resolve(process.cwd(), "..", "jalms-codebase"))
    if (!file) { report.fileErrors.push(`${collection}/${asObjectIdString(source._id ?? source.id)} ${sourceField}: ${value}`); continue }
    try { await pb.collection(collection).update(pbId, { [field]: file }) } catch (error) { report.fileErrors.push(`${collection}/${pbId}/${field}: ${errorMessage(error)}`) }
  }
}
async function reconcileRelations(
  pb: PocketBase,
  sourceRecords: Partial<Record<TargetCollection, JsonRecord[]>>,
  schema: Record<string, Set<string>>,
  report: MigrationReport,
) {
  for (const [collectionName, fields] of Object.entries(relationTargets)) {
    const collection = collectionName as TargetCollection
    for (const source of sourceRecords[collection] || []) {
      const legacyId = asObjectIdString(source._id ?? source.id)
      const pbId = report.mappings[collection][legacyId]
      if (!pbId) continue
      const relationData: JsonRecord = {}
      for (const field of Object.keys(fields)) {
        if (!schema[collection]?.has(field) || source[field] === undefined) continue
        relationData[field] = convertRelationValue(collection, field, source[field], report.mappings)
      }
      if (!Object.keys(relationData).length) continue
      try {
        await pb.collection(collection).update(pbId, relationData)
      } catch (error) {
        report.batches[collection].failed++
        report.batches[collection].errors.push(`${legacyId} relation repair: ${errorMessage(error)}`)
      }
    }
  }
}
async function createPocketBaseClient(mode: MigrationMode) {
  const pb = new PocketBase(process.env.POCKETBASE_URL || DEFAULT_POCKETBASE_URL)
  if (mode === "dry") return pb
  if (!process.env.PB_SUPERUSER_EMAIL || !process.env.PB_SUPERUSER_PASSWORD) throw new Error("PB_SUPERUSER_EMAIL dan PB_SUPERUSER_PASSWORD wajib diisi untuk migrasi penuh.")
  await pb.collection("_superusers").authWithPassword(process.env.PB_SUPERUSER_EMAIL, process.env.PB_SUPERUSER_PASSWORD)
  return pb
}
async function runMigration(mode: MigrationMode) {
  const mongoUrl = process.env.MONGODB_MIGRATION_URL || DEFAULT_MONGO_URL
  const pocketBaseUrl = process.env.POCKETBASE_URL || DEFAULT_POCKETBASE_URL
  const report: MigrationReport = { startedAt: new Date().toISOString(), mode, source: mongoUrl, target: pocketBaseUrl, batches: {}, mappings: Object.fromEntries(migrationOrder.map((name) => [name, {}])), fileErrors: [], warnings: [] }
  for (const collection of migrationOrder) report.batches[collection] = { source: 0, imported: 0, updated: 0, skipped: 0, failed: 0, missingSource: false, errors: [] }
  const mongo = new MongoClient(mongoUrl); await mongo.connect(); const db = mongo.db()
  try {
    const available = (await db.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name)
    const pb = await createPocketBaseClient(mode); const schema = mode === "full" ? await loadPocketBaseSchema(pb) : {}
    const sourceRecords: Partial<Record<TargetCollection, JsonRecord[]>> = {}
    for (const collection of migrationOrder) {
      const sourceCollection = await resolveSourceCollection(db, collection, available)
      if (!sourceCollection) { report.batches[collection].missingSource = true; report.warnings.push(`Collection MongoDB tidak ditemukan untuk ${collection}.`); continue }
      const records = await sourceCollection.find({}).toArray() as unknown as JsonRecord[]
      sourceRecords[collection] = records; report.batches[collection].source = records.length
      if (mode === "dry") continue
      const fields = schema[collection]; if (!fields) throw new Error(`Schema PocketBase tidak memiliki collection ${collection}.`)
      for (const source of records) {
        const result = collection === "users" ? await importUser(pb, source, fields, report) : await importRecord(pb, collection, source, fields, report)
        if (result === "imported") report.batches[collection].imported++
        if (result === "updated") report.batches[collection].updated++
        if (result === "failed") report.batches[collection].failed++
        const pbId = report.mappings[collection][asObjectIdString(source._id ?? source.id)]
        if (pbId) await migrateFiles(pb, collection, source, pbId, report)
      }
    }
    if (mode === "full") await reconcileRelations(pb, sourceRecords, schema, report)
    report.finishedAt = new Date().toISOString()
  } finally { await mongo.close() }
  await mkdir(path.dirname(REPORT_FILE), { recursive: true }); await writeFile(REPORT_FILE, JSON.stringify(report, null, 2), "utf8")
  console.log(JSON.stringify({ report: REPORT_FILE, source: report.source, target: report.target, fileErrors: report.fileErrors.length, batches: report.batches }, null, 2))
  if (report.fileErrors.length || Object.values(report.batches).some((batch) => batch.failed > 0)) process.exitCode = 2
}
const args = new Set(process.argv.slice(2)); runMigration(args.has("--dry-run") ? "dry" : "full").catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
