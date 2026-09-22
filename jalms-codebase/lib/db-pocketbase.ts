import type PocketBase from "pocketbase"
import { getPocketBaseService } from "@/lib/pocketbase/service"

type AnyRecord = Record<string, any>
type Query = AnyRecord | undefined

const modelCollections: Record<string, string> = {
  user: "users", academicYear: "academic_years", term: "terms", class: "classes", subject: "subjects", course: "courses",
  material: "materials", materialFolder: "material_folders", materialAssignment: "material_assignments", schedule: "schedules",
  enrollment: "enrollments", courseEnrollment: "course_enrollments", assignment: "assignments", userWorkspacePreference: "user_workspace_preferences",
  courseNavigationState: "course_navigation_states", courseAnnouncement: "course_announcements", courseChatMessage: "course_chat_messages",
  academicRollover: "academic_rollovers", academicRolloverItem: "academic_rollover_items", managementAuditLog: "management_audit_logs",
  submission: "submissions", attendance: "attendances", conversation: "conversations", message: "messages", quiz: "quizzes",
  quizFolder: "quiz_folders", quizQuestion: "quiz_questions", quizChoice: "quiz_choices", reportCard: "report_cards", systemConfig: "system_configs",
}

const relationMeta: Record<string, Record<string, { collection: string; foreignKey?: string; many?: boolean; field?: string }>> = {
  user: {
    taughtCourses: { collection: "courses", foreignKey: "teacherId", many: true }, enrolledCourses: { collection: "courses", foreignKey: "studentIds", many: true },
    homeroomClasses: { collection: "classes", foreignKey: "homeroomTeacherId", many: true }, enrollments: { collection: "enrollments", foreignKey: "studentId", many: true },
    submissions: { collection: "submissions", foreignKey: "studentId", many: true }, attendances: { collection: "attendances", foreignKey: "studentId", many: true },
    materials: { collection: "materials", foreignKey: "teacherId", many: true }, materialFolders: { collection: "material_folders", foreignKey: "teacherId", many: true },
    quizzes: { collection: "quizzes", foreignKey: "teacherId", many: true }, quizFolders: { collection: "quiz_folders", foreignKey: "teacherId", many: true },
    conversations: { collection: "conversations", foreignKey: "participantIds", many: true }, messages: { collection: "messages", foreignKey: "senderId", many: true },
    reportCards: { collection: "report_cards", foreignKey: "studentId", many: true }, courseEnrollments: { collection: "course_enrollments", foreignKey: "studentId", many: true },
    courseNavigationState: { collection: "course_navigation_states", foreignKey: "userId", many: true }, courseAnnouncements: { collection: "course_announcements", foreignKey: "authorId", many: true },
    courseChatMessages: { collection: "course_chat_messages", foreignKey: "senderId", many: true }, workspacePreference: { collection: "user_workspace_preferences", foreignKey: "userId", many: false },
  },
  academicYear: { terms: { collection: "terms", foreignKey: "academicYearId", many: true } },
  term: { academicYear: { collection: "academic_years", field: "academicYearId" }, courses: { collection: "courses", foreignKey: "termId", many: true }, classes: { collection: "classes", foreignKey: "termId", many: true }, reportCards: { collection: "report_cards", foreignKey: "termId", many: true } },
  class: { term: { collection: "terms", field: "termId" }, homeroomTeacher: { collection: "users", field: "homeroomTeacherId" }, students: { collection: "enrollments", foreignKey: "classId", many: true }, courses: { collection: "courses", foreignKey: "classId", many: true }, reportCards: { collection: "report_cards", foreignKey: "classId", many: true } },
  subject: { courses: { collection: "courses", foreignKey: "subjectId", many: true } },
  course: { subject: { collection: "subjects", field: "subjectId" }, class: { collection: "classes", field: "classId" }, term: { collection: "terms", field: "termId" }, teacher: { collection: "users", field: "teacherId" }, students: { collection: "users", field: "studentIds", many: true }, courseEnrollments: { collection: "course_enrollments", foreignKey: "courseId", many: true }, assignments: { collection: "assignments", foreignKey: "courseId", many: true }, attendances: { collection: "attendances", foreignKey: "courseId", many: true }, schedules: { collection: "schedules", foreignKey: "courseId", many: true }, materials: { collection: "materials", foreignKey: "courseId", many: true }, materialAssignments: { collection: "material_assignments", foreignKey: "courseId", many: true }, navigationStates: { collection: "course_navigation_states", foreignKey: "courseId", many: true }, announcements: { collection: "course_announcements", foreignKey: "courseId", many: true }, chatMessages: { collection: "course_chat_messages", foreignKey: "courseId", many: true } },
  material: { teacher: { collection: "users", field: "teacherId" }, course: { collection: "courses", field: "courseId" }, folder: { collection: "material_folders", field: "folderId" }, assignments: { collection: "material_assignments", foreignKey: "materialId", many: true } },
  materialFolder: { teacher: { collection: "users", field: "teacherId" }, materials: { collection: "materials", foreignKey: "folderId", many: true } },
  materialAssignment: { material: { collection: "materials", field: "materialId" }, course: { collection: "courses", field: "courseId" } },
  schedule: { course: { collection: "courses", field: "courseId" } }, enrollment: { student: { collection: "users", field: "studentId" }, class: { collection: "classes", field: "classId" }, createdBy: { collection: "users", field: "createdById" } },
  courseEnrollment: { course: { collection: "courses", field: "courseId" }, student: { collection: "users", field: "studentId" }, sourceClass: { collection: "classes", field: "sourceClassId" }, createdBy: { collection: "users", field: "createdById" } },
  assignment: { course: { collection: "courses", field: "courseId" }, quiz: { collection: "quizzes", field: "quizId" }, submissions: { collection: "submissions", foreignKey: "assignmentId", many: true } },
  userWorkspacePreference: { user: { collection: "users", field: "userId" } }, courseNavigationState: { user: { collection: "users", field: "userId" }, course: { collection: "courses", field: "courseId" } },
  courseAnnouncement: { course: { collection: "courses", field: "courseId" }, author: { collection: "users", field: "authorId" } }, courseChatMessage: { course: { collection: "courses", field: "courseId" }, sender: { collection: "users", field: "senderId" } },
  academicRollover: { sourceTerm: { collection: "terms", field: "sourceTermId" }, targetTerm: { collection: "terms", field: "targetTermId" }, actor: { collection: "users", field: "actorId" }, items: { collection: "academic_rollover_items", foreignKey: "rolloverId", many: true } }, academicRolloverItem: { rollover: { collection: "academic_rollovers", field: "rolloverId" } },
  managementAuditLog: { actor: { collection: "users", field: "actorId" } }, submission: { assignment: { collection: "assignments", field: "assignmentId" }, student: { collection: "users", field: "studentId" } }, attendance: { course: { collection: "courses", field: "courseId" }, student: { collection: "users", field: "studentId" } },
  conversation: { participants: { collection: "users", field: "participantIds", many: true }, messages: { collection: "messages", foreignKey: "conversationId", many: true } }, message: { conversation: { collection: "conversations", field: "conversationId" }, sender: { collection: "users", field: "senderId" } },
  quiz: { teacher: { collection: "users", field: "teacherId" }, folder: { collection: "quiz_folders", field: "folderId" }, questions: { collection: "quiz_questions", foreignKey: "quizId", many: true }, assignments: { collection: "assignments", foreignKey: "quizId", many: true } }, quizFolder: { teacher: { collection: "users", field: "teacherId" }, quizzes: { collection: "quizzes", foreignKey: "folderId", many: true } }, quizQuestion: { quiz: { collection: "quizzes", field: "quizId" }, choices: { collection: "quiz_choices", foreignKey: "questionId", many: true } }, quizChoice: { question: { collection: "quiz_questions", field: "questionId" } }, reportCard: { student: { collection: "users", field: "studentId" }, class: { collection: "classes", field: "classId" }, term: { collection: "terms", field: "termId" } },
}
const modelByCollection = Object.fromEntries(Object.entries(modelCollections).map(([model, collection]) => [collection, model])) as Record<string, string>
const dateFields = new Set(["createdAt", "updatedAt", "deletedAt", "startDate", "endDate", "lastLoginAt", "uploadedAt", "dueDate", "assignedAt", "publishedAt", "lastEnrollmentSyncAt", "lastSeenAnnouncementAt", "lastSeenChatAt", "submittedAt", "date", "lastMessageAt"])

const quote = (value: unknown) => typeof value === "boolean" || typeof value === "number" ? String(value) : `"${String(value ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
function scalarFilter(field: string, value: any, negate = false, relationField = false): string {
  // PocketBase relation fields are filtered through their related record id.
  // Multi-select fields (for example users.roles) keep the plain field form.
  const filterField = relationField ? `${field}.id` : field
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (value.isSet !== undefined) return value.isSet !== negate ? `${field} != ""` : `${field} = ""`
    if (value.has !== undefined) return `${filterField} ?${negate ? "!=" : "="} ${quote(value.has)}`
    if (value.in) return `(${value.in.map((item: any) => `${filterField} = ${quote(item)}`).join(" || ") || "false"})`
    if (value.notIn) return `(${value.notIn.map((item: any) => `${filterField} != ${quote(item)}`).join(" && ") || "true"})`
    if (value.contains !== undefined) return `${field} ~ ${quote(value.contains)}`
    if (value.startsWith !== undefined) return `${field} ^= ${quote(value.startsWith)}`
    if (value.endsWith !== undefined) return `${field} $= ${quote(value.endsWith)}`
    if (value.gte !== undefined) return `${field} >= ${quote(value.gte)}`
    if (value.gt !== undefined) return `${field} > ${quote(value.gt)}`
    if (value.lte !== undefined) return `${field} <= ${quote(value.lte)}`
    if (value.lt !== undefined) return `${field} < ${quote(value.lt)}`
    if (value.not !== undefined) return `(${filterField} != ${quote(value.not)})`
  }
  return `${field} ${negate ? "!=" : "="} ${quote(value)}`
}

const scalarOperators = new Set(["isSet", "has", "in", "notIn", "contains", "startsWith", "endsWith", "gte", "gt", "lte", "lt", "not"])

function whereToFilter(where: AnyRecord | undefined, prefix = "", model?: string): string {
  if (!where) return ""
  const parts: string[] = []
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue
    if (key === "AND") { const values = Array.isArray(value) ? value : [value]; parts.push(`(${values.map((item) => whereToFilter(item, prefix, model)).filter(Boolean).join(" && ")})`); continue }
    if (key === "OR") { const values = Array.isArray(value) ? value : [value]; parts.push(`(${values.map((item) => whereToFilter(item, prefix, model)).filter(Boolean).join(" || ") || "false"})`); continue }
    if (key === "NOT") {
      const nested = whereToFilter(value as AnyRecord, prefix, model)
      if (nested) parts.push(`!(${nested})`)
      continue
    }
    const relation = model ? relationMeta[model]?.[key] : undefined
    const fieldSegment = relation?.field || key
    const nestedModel = relation ? modelByCollection[relation.collection] : model
    const field = prefix ? `${prefix}.${fieldSegment}` : fieldSegment
    const relationField = model
      ? Object.values(relationMeta[model] || {}).some((meta) => meta.field === fieldSegment)
      : false
    if (key.includes("_")) {
      const composite = key.split("_"); const values = value as AnyRecord
      if (composite.every((part) => values[part] !== undefined)) { parts.push(...composite.map((part) => scalarFilter(prefix ? `${prefix}.${part}` : part, values[part]))); continue }
    }
    if (value && typeof value === "object" && !Array.isArray(value) && (value.some || value.every || value.none)) {
      const condition = value.some || value.every || value.none
      const nested = whereToFilter(condition, field, nestedModel)
      if (nested) parts.push(value.none ? `!(${nested})` : `(${nested})`)
    } else if (value && typeof value === "object" && !Array.isArray(value) && !Object.keys(value).some((operator) => scalarOperators.has(operator))) {
      // Prisma relation filters are nested objects. PocketBase expresses the
      // same lookup as a dotted relation path (course.term.isActive, etc.).
      const nested = whereToFilter(value as AnyRecord, field, nestedModel)
      if (nested) parts.push(`(${nested})`)
    } else parts.push(scalarFilter(field, value, false, relationField))
  }
  return parts.filter(Boolean).join(" && ")
}
function sortToString(orderBy: any) {
  if (!orderBy) return ""
  const items = Array.isArray(orderBy) ? orderBy : [orderBy]
  return items.map((item) => { const [field, direction] = Object.entries(item)[0] as [string, any]; return direction === "desc" ? `-${field}` : field }).join(",")
}
function cleanData(data: AnyRecord = {}) {
  const result: AnyRecord = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || ["id", "created", "updated", "legacyId", "legacyData"].includes(key)) continue
    // Prisma nested writes are handled after the parent record is created.
    // Sending their instruction object to PocketBase would be rejected as a
    // malformed relation value.
    if (value && typeof value === "object" && !Array.isArray(value) &&
      ["create", "connectOrCreate", "update", "delete", "disconnect"].some((operation) => operation in value)) continue
    if (key === "passwordConfirm") { result[key] = value; continue }
    if (value && typeof value === "object" && !Array.isArray(value) && "connect" in value) { result[key] = (value as any).connect?.id ?? (value as any).connect; continue }
    if (value && typeof value === "object" && !Array.isArray(value) && "set" in value) { result[key] = (value as any).set; continue }
    if (value && typeof value === "object" && !Array.isArray(value) && "push" in value) { result[key] = { __push: (value as any).push }; continue }
    if (value instanceof Date) { result[key] = value.toISOString(); continue }
    if (Array.isArray(value)) { result[key] = value.map((item) => item instanceof Date ? item.toISOString() : item); continue }
    result[key] = value
  }
  for (const [relationName, relation] of Object.entries(data)) {
    const meta = Object.values(relationMeta).flatMap((entry) => Object.entries(entry)).find(([name]) => name === relationName)?.[1] as any
    if (!meta || !relation || typeof relation !== "object") continue
    const targetField = meta.field || relationName
    if ((relation as any).connect) result[targetField] = meta.many ? (relation as any).connect.map((item: any) => item.id) : (relation as any).connect.id
  }
  return result
}

class PocketBaseModel {
  constructor(private readonly model: string) {}
  private collection() { return modelCollections[this.model] }
  private async pb() { return getPocketBaseService() }
  private async createNestedRelations(parent: AnyRecord, source: AnyRecord, pb: PocketBase) {
    const relations = relationMeta[this.model] || {}
    for (const [relationName, instruction] of Object.entries(source)) {
      const meta = relations[relationName]
      if (!meta || !instruction || typeof instruction !== "object" || !("create" in instruction)) continue
      const createItems = Array.isArray((instruction as AnyRecord).create)
        ? (instruction as AnyRecord).create as AnyRecord[]
        : [(instruction as AnyRecord).create as AnyRecord]
      const childIds: string[] = []
      for (const childData of createItems) {
        const payload = cleanData(childData)
        if (meta.foreignKey) payload[meta.foreignKey] = parent.id
        const child = await pb.collection(meta.collection).create(payload)
        childIds.push(child.id)
      }
      if (meta.field && childIds.length) {
        await pb.collection(this.collection()).update(parent.id, {
          [meta.field]: meta.many ? childIds : childIds[0],
        })
      }
    }
  }
  private async findRaw(args: Query = {}) {
    const pb = await this.pb()
    return pb.collection(this.collection()).getFullList({ filter: whereToFilter(args?.where, "", this.model), sort: sortToString(args?.orderBy), expand: this.expandFields(args) })
  }
  private expandFields(args: Query) {
    const shapes = { ...(args?.include || {}), ...(args?.select || {}) }
    const fields = Object.keys(shapes)
      .filter((key) => key !== "_count")
      .map((key) => {
        const meta = relationMeta[this.model]?.[key]
        return meta?.field || (meta?.foreignKey ? key : undefined)
      })
      .filter(Boolean)
    return fields.length ? fields.join(",") : undefined
  }
  private async mapRecord(record: AnyRecord, args: Query = {}): Promise<any> {
    if (!record) return record
    const result: AnyRecord = { ...record }
    delete result.expand
    for (const key of dateFields) if (typeof result[key] === "string" && result[key]) result[key] = new Date(result[key])
    const relationQueries: AnyRecord = { ...(args?.include || {}) }
    for (const [key, value] of Object.entries(args?.select || {})) {
      if (key !== "id" && value && typeof value === "object") relationQueries[key] = value
    }
    for (const [key, value] of Object.entries(relationQueries)) {
      if (key === "_count") {
        const count: AnyRecord = {}
        const selections = (value as AnyRecord)?.select || {}
        for (const [relationName, selected] of Object.entries(selections)) {
          if (!selected) continue
          const meta = relationMeta[this.model]?.[relationName]
          if (!meta) { count[relationName] = 0; continue }
          if (meta.field) {
            count[relationName] = Array.isArray(record[meta.field]) ? record[meta.field].filter(Boolean).length : record[meta.field] ? 1 : 0
            continue
          }
          const pb = await this.pb()
          const nestedWhere = (selected as AnyRecord)?.where
          const baseFilter = meta.foreignKey === "studentIds"
            ? `${meta.foreignKey} ?= ${quote(record.id)}`
            : `${meta.foreignKey} = ${quote(record.id)}`
          const filter = [baseFilter, whereToFilter(nestedWhere, "", modelByCollection[meta.collection])].filter(Boolean).join(" && ")
          const page = await pb.collection(meta.collection).getList(1, 1, { filter, skipTotal: false })
          count[relationName] = page.totalItems
        }
        result._count = count
        continue
      }
      const meta = relationMeta[this.model]?.[key]
      if (!meta) continue
      const relatedModel = new PocketBaseModel(modelByCollection[meta.collection] || this.model)
      const expanded = record.expand?.[meta.field || key]
      const nestedArgs = value === true ? {} : value as Query
      const canUseExpanded = expanded !== undefined && !nestedArgs?.where && !nestedArgs?.orderBy
      if (canUseExpanded) result[key] = Array.isArray(expanded) ? await Promise.all(expanded.map((item) => relatedModel.mapRecord(item, nestedArgs))) : await relatedModel.mapRecord(expanded, nestedArgs)
      else if (meta.field) {
        const ids = Array.isArray(record[meta.field]) ? record[meta.field] : [record[meta.field]]
        const pb = await this.pb()
        const records = (await Promise.all(ids.filter(Boolean).map((id: any) => pb.collection(meta.collection).getOne(id).catch(() => null)))).filter(Boolean)
        const mapped = await Promise.all(records.map((item) => relatedModel.mapRecord(item, nestedArgs)))
        result[key] = meta.many ? mapped : mapped[0] || null
      } else if (meta.foreignKey) {
        const pb = await this.pb()
        const filter = meta.foreignKey === "studentIds" ? `${meta.foreignKey} ?= "${record.id}"` : `${meta.foreignKey} = "${record.id}"`
        const nestedWhere = value !== true ? (value as AnyRecord)?.where : undefined
        const relatedFilter = [filter, whereToFilter(nestedWhere, "", modelByCollection[meta.collection])].filter(Boolean).join(" && ")
        const related = await pb.collection(meta.collection).getFullList({ filter: relatedFilter, sort: sortToString(value !== true ? (value as any)?.orderBy : undefined) })
        result[key] = meta.many ? await Promise.all(related.map((item) => relatedModel.mapRecord(item, nestedArgs))) : await relatedModel.mapRecord(related[0], nestedArgs)
      }
    }
    if (args?.select) {
      const selected: AnyRecord = { id: result.id }
      for (const key of Object.keys(args.select)) if (args.select[key] && result[key] !== undefined) selected[key] = result[key]
      return selected
    }
    return result
  }
  async findMany(args: Query = {}): Promise<any[]> { const records = await this.findRaw(args); const skip = args?.skip || 0; const take = args?.take; const sliced = records.slice(skip, take === undefined ? undefined : skip + take); return Promise.all(sliced.map((record) => this.mapRecord(record, args))) }
  async findFirst(args: Query = {}): Promise<any | null> { const records = await this.findMany({ ...args, take: 1 }); return records[0] || null }
  async findUnique(args: Query = {}): Promise<any | null> { return this.findFirst(args) }
  async findUniqueOrThrow(args: Query = {}): Promise<any> { const record = await this.findUnique(args); if (!record) throw new Error(`${this.model} record not found`); return record }
  async count(args: Query = {}): Promise<number> { return (await this.findRaw(args)).length }
  async create(args: Query = {}): Promise<any> {
    const pb = await this.pb()
    const source = args?.data || {}
    const record = await pb.collection(this.collection()).create(cleanData(source))
    await this.createNestedRelations(record, source, pb)
    return this.mapRecord(record, args)
  }
  async update(args: Query = {}): Promise<any> { const pb = await this.pb(); const current = await this.findUnique(args); if (!current) throw new Error(`${this.model} record not found`); const data = cleanData(args?.data); for (const [key, value] of Object.entries(data)) if (value && value.__push) data[key] = [...(current[key] || []), ...(Array.isArray(value.__push) ? value.__push : [value.__push])]; const record = await pb.collection(this.collection()).update(current.id, data); return this.mapRecord(record, args) }
  async delete(args: Query = {}): Promise<any> { const pb = await this.pb(); const current = await this.findUnique(args); if (!current) throw new Error(`${this.model} record not found`); await pb.collection(this.collection()).delete(current.id); return current }
  async upsert(args: Query = {}): Promise<any> { const existing = await this.findUnique({ where: args?.where }); return existing ? this.update({ where: { id: existing.id }, data: args?.update, include: args?.include, select: args?.select }) : this.create({ data: args?.create, include: args?.include, select: args?.select }) }
  async deleteMany(args: Query = {}): Promise<{ count: number }> { const records = await this.findMany(args); const pb = await this.pb(); await Promise.all(records.map((record) => pb.collection(this.collection()).delete(record.id))); return { count: records.length } }
  async updateMany(args: Query = {}): Promise<{ count: number }> { const records = await this.findMany({ where: args?.where }); const pb = await this.pb(); const data = cleanData(args?.data); await Promise.all(records.map((record) => pb.collection(this.collection()).update(record.id, Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value && value.__push ? [...(record[key] || []), ...(Array.isArray(value.__push) ? value.__push : [value.__push])] : value]))))); return { count: records.length } }
  async createMany(args: Query = {}): Promise<{ count: number }> { const items: AnyRecord[] = Array.isArray(args?.data) ? args.data : []; const records = await Promise.all(items.map((data) => this.create({ data }))); return { count: records.length } }
}

const models = Object.fromEntries(Object.keys(modelCollections).map((model) => [model, new PocketBaseModel(model)])) as Record<string, PocketBaseModel>
export const dbPocketBase = Object.assign(models, {
  $connect: async () => undefined,
  $disconnect: async () => undefined,
  $transaction: async (transaction: any): Promise<any> => typeof transaction === "function" ? transaction(dbPocketBase) : Array.isArray(transaction) ? Promise.all(transaction) : transaction,
})
