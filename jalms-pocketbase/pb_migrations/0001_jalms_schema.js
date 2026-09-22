/// <reference path="../pb_data/types.d.ts" />

// This migration is intentionally additive. The PocketBase distribution already
// contains the built-in `users` auth collection, so we extend it instead of
// replacing it. Every application collection keeps the Mongo ObjectId in
// `legacyId` to make imports repeatable and auditable.

const enumValues = {
  roles: ["ADMIN", "SUBJECT_TEACHER", "HOMEROOM_TEACHER", "STUDENT", "PARENT"],
  attendanceStatus: ["PRESENT", "ABSENT", "EXCUSED", "SKIPPED", "PENDING"],
  classColor: ["RED", "ORANGE", "AMBER", "EMERALD", "TEAL", "CYAN", "BLUE", "INDIGO", "VIOLET", "PURPLE", "PINK", "ROSE"],
  uiDensity: ["COMPACT", "COMFORTABLE"],
  theme: ["SYSTEM", "LIGHT", "DARK"],
  courseRoleContext: ["TEACHER", "STUDENT"],
  courseEnrollmentMode: ["MANUAL", "CLASS_SEEDED", "CLASS_SYNC"],
  courseEnrollmentSource: ["LEGACY", "MANUAL", "CLASS_SEED", "CLASS_SYNC", "IMPORT", "ROLLOVER"],
  classEnrollmentSource: ["LEGACY", "MANUAL", "IMPORT", "COPY", "ROLLOVER"],
  contentStatus: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  rolloverStatus: ["DRAFT", "VALIDATING", "READY", "RUNNING", "COMPLETED", "PARTIAL", "FAILED"],
  semesterType: ["ODD", "EVEN"],
  gradeLevel: ["GRADE_7", "GRADE_8", "GRADE_9", "GRADE_10", "GRADE_11", "GRADE_12"],
  academicDomain: ["SCIENCE_TECHNOLOGY", "SOCIAL_HUMANITIES", "LANGUAGE_COMMUNICATION", "ARTS_CREATIVITY", "PHYSICAL_EDUCATION", "SPIRITUALITY_ETHICS"],
  assignmentType: ["SUBMISSION", "NON_SUBMISSION", "QUIZ"],
  quizGradingType: ["ALL_OR_NOTHING", "RIGHT_MINUS_WRONG"],
};

const text = (name, options = {}) => ({ type: "text", name, ...options });
const editor = (name, options = {}) => ({ type: "editor", name, ...options });
const json = (name, options = {}) => ({ type: "json", name, ...options });
const bool = (name, options = {}) => ({ type: "bool", name, ...options });
const number = (name, options = {}) => ({ type: "number", name, ...options });
const date = (name, options = {}) => ({ type: "date", name, ...options });
const url = (name, options = {}) => ({ type: "url", name, ...options });
const select = (name, values, options = {}) => ({ type: "select", name, values, maxSelect: 1, ...options });
const multiSelect = (name, values, options = {}) => ({ type: "select", name, values, maxSelect: values.length, ...options });
const file = (name, options = {}) => ({ type: "file", name, maxSelect: 1, maxSize: 16777216, ...options });

const baseFields = () => [
  text("legacyId", { required: true, max: 64 }),
  json("legacyData", { hidden: true }),
];

const commonRules = {
  listRule: "@request.auth.id != ''",
  viewRule: "@request.auth.id != ''",
  createRule: "@request.auth.id != ''",
  updateRule: "@request.auth.id != ''",
  deleteRule: "@request.auth.id != ''",
};

const specs = {
  academic_years: [text("name", { required: true }), date("startDate", { required: true }), date("endDate", { required: true }), bool("isActive"), date("deletedAt")],
  terms: [select("type", enumValues.semesterType, { required: true }), date("startDate", { required: true }), date("endDate", { required: true }), bool("isActive"), text("academicYearId", { required: true }), date("deletedAt")],
  classes: [text("name", { required: true }), text("termId", { required: true }), text("homeroomTeacherId"), select("color", enumValues.classColor), select("gradeLevel", enumValues.gradeLevel, { required: true }), date("createdAt"), date("updatedAt"), date("deletedAt")],
  subjects: [text("name", { required: true }), text("code", { required: true }), text("description"), text("reportName"), multiSelect("academicDomains", enumValues.academicDomain), date("createdAt"), date("updatedAt"), date("deletedAt")],
  courses: [text("name", { required: true }), text("reportName"), text("subjectId"), text("classId"), text("termId", { required: true }), text("teacherId", { required: true }), number("attendancePoolScore"), json("studentIds"), json("competencyRules"), text("iconImageUrl"), text("iconImageKey"), select("enrollmentMode", enumValues.courseEnrollmentMode), date("lastEnrollmentSyncAt"), text("lastEnrollmentSyncError"), date("createdAt"), date("updatedAt"), date("deletedAt"), file("icon", { maxSize: 4194304, mimeTypes: ["image/*"] })],
  materials: [text("title", { required: true }), editor("description"), text("fileUrl"), url("linkUrl"), date("uploadedAt"), text("teacherId", { required: true }), text("courseId"), select("materialType", ["FILE", "LINK", "HYBRID"], { maxSelect: 1 }), text("folderId"), date("deletedAt"), file("file", { maxSize: 33554432 })],
  material_folders: [text("name", { required: true }), text("color", { required: true }), text("teacherId", { required: true }), date("createdAt"), date("updatedAt")],
  material_assignments: [text("materialId", { required: true }), text("courseId", { required: true }), date("assignedAt")],
  schedules: [number("dayOfWeek", { required: true }), number("period", { required: true }), text("courseId", { required: true }), date("deletedAt")],
  enrollments: [text("studentId", { required: true }), text("classId", { required: true }), date("deletedAt"), select("source", enumValues.classEnrollmentSource), text("createdById"), date("createdAt"), date("updatedAt")],
  course_enrollments: [text("courseId", { required: true }), text("studentId", { required: true }), select("source", enumValues.courseEnrollmentSource, { required: true }), text("sourceClassId"), text("createdById"), date("createdAt"), date("updatedAt"), date("deletedAt")],
  assignments: [text("title", { required: true }), editor("description"), date("dueDate", { required: true }), select("type", enumValues.assignmentType, { required: true }), number("maxPoints"), bool("isExtraCredit"), number("latePenalty"), multiSelect("academicDomains", enumValues.academicDomain), text("courseId", { required: true }), text("quizId"), bool("showGradeAfterSubmission"), select("status", enumValues.contentStatus), date("deletedAt")],
  user_workspace_preferences: [text("userId", { required: true }), select("density", enumValues.uiDensity), select("theme", enumValues.theme), bool("channelSidebarCollapsed"), json("teachingCourseOrder"), json("enrolledCourseOrder"), date("createdAt"), date("updatedAt")],
  course_navigation_states: [text("userId", { required: true }), text("courseId", { required: true }), select("roleContext", enumValues.courseRoleContext, { required: true }), text("lastSectionKey"), date("lastSeenAnnouncementAt"), date("lastSeenChatAt"), date("createdAt"), date("updatedAt")],
  course_announcements: [text("courseId", { required: true }), text("authorId", { required: true }), text("title", { required: true }), editor("body", { required: true }), bool("isPinned"), select("status", enumValues.contentStatus, { required: true }), date("publishedAt"), date("createdAt"), date("updatedAt"), date("deletedAt")],
  course_chat_messages: [text("courseId", { required: true }), text("senderId", { required: true }), text("content", { required: true }), date("createdAt", { required: true })],
  academic_rollovers: [text("sourceTermId", { required: true }), text("targetTermId", { required: true }), text("actorId", { required: true }), select("status", enumValues.rolloverStatus, { required: true }), json("options", { required: true }), json("mappings", { required: true }), json("summary"), date("createdAt"), date("updatedAt")],
  academic_rollover_items: [text("rolloverId", { required: true }), text("entityType", { required: true }), text("sourceId"), text("targetId"), text("status", { required: true }), text("error"), json("result"), date("updatedAt")],
  management_audit_logs: [text("actorId", { required: true }), text("entityType", { required: true }), text("entityId", { required: true }), text("action", { required: true }), json("before"), json("after"), json("metadata"), date("createdAt")],
  submissions: [text("assignmentId", { required: true }), text("studentId", { required: true }), number("grade"), text("feedback"), text("submissionUrl"), text("attachmentUrl"), text("link"), date("submittedAt"), date("deletedAt"), file("attachment", { maxSize: 33554432 })],
  attendances: [date("date", { required: true }), select("status", enumValues.attendanceStatus, { required: true }), text("topic"), text("excuseReason"), number("period"), text("courseId", { required: true }), text("studentId", { required: true }), date("deletedAt")],
  conversations: [date("createdAt"), date("updatedAt"), json("participantIds", { required: true }), date("lastMessageAt"), text("initiatorId")],
  messages: [text("content", { required: true }), date("createdAt", { required: true }), text("conversationId", { required: true }), text("senderId", { required: true }), json("readByIds")],
  quizzes: [text("title", { required: true }), editor("description"), text("teacherId", { required: true }), date("createdAt"), date("updatedAt"), bool("randomizeChoices"), text("folderId"), date("deletedAt")],
  quiz_folders: [text("name", { required: true }), text("color", { required: true }), text("teacherId", { required: true }), date("createdAt"), date("updatedAt")],
  quiz_questions: [text("text", { required: true }), text("imageUrl"), text("audioUrl"), number("audioLimit"), number("order"), number("points"), select("gradingType", enumValues.quizGradingType, { required: true }), text("explanation"), text("quizId", { required: true }), date("createdAt"), file("image", { maxSize: 8388608, mimeTypes: ["image/*"] }), file("audio", { maxSize: 33554432, mimeTypes: ["audio/*"] })],
  quiz_choices: [text("text", { required: true }), text("imageUrl"), bool("isCorrect"), number("order"), text("questionId", { required: true }), file("image", { maxSize: 8388608, mimeTypes: ["image/*"] })],
  report_cards: [text("studentId", { required: true }), text("classId", { required: true }), text("termId", { required: true }), json("courseGrades", { required: true }), json("extracurriculars", { required: true }), json("achievements", { required: true }), json("development", { required: true }), json("attendance", { required: true }), text("homeroomTeacherNote"), text("principalName"), date("date"), bool("published"), date("createdAt"), date("updatedAt")],
  system_configs: [text("key", { required: true }), json("value", { required: true })],
};

// Relation fields use the same names as the Prisma foreign-key fields where
// possible. This keeps server actions simple while giving PocketBase native
// relation filtering and expansion.
const relations = {
  academic_years: { terms: ["terms", true] },
  terms: { academicYearId: ["academic_years", false], courses: ["courses", true], classes: ["classes", true], reportCards: ["report_cards", true] },
  classes: { termId: ["terms", false], homeroomTeacherId: ["users", false], students: ["enrollments", true], courses: ["courses", true], reportCards: ["report_cards", true] },
  courses: { subjectId: ["subjects", false], classId: ["classes", false], termId: ["terms", false], teacherId: ["users", false], studentIds: ["users", true], courseEnrollments: ["course_enrollments", true], assignments: ["assignments", true], schedules: ["schedules", true], materials: ["materials", true], materialAssignments: ["material_assignments", true], navigationStates: ["course_navigation_states", true], announcements: ["course_announcements", true], chatMessages: ["course_chat_messages", true] },
  subjects: { courses: ["courses", true] },
  users: { enrolledCourseIds: ["courses", true], homeroomClasses: ["classes", true], enrollments: ["enrollments", true], submissions: ["submissions", true], attendances: ["attendances", true], materials: ["materials", true], materialFolders: ["material_folders", true], quizzes: ["quizzes", true], quizFolders: ["quiz_folders", true], conversationIds: ["conversations", true], messages: ["messages", true], reportCards: ["report_cards", true], courseEnrollments: ["course_enrollments", true], courseNavigationState: ["course_navigation_states", true], courseAnnouncements: ["course_announcements", true], courseChatMessages: ["course_chat_messages", true], workspacePreference: ["user_workspace_preferences", false] },
  materials: { teacherId: ["users", false], courseId: ["courses", false], folderId: ["material_folders", false], assignments: ["material_assignments", true] },
  material_folders: { teacherId: ["users", false], materials: ["materials", true] },
  material_assignments: { materialId: ["materials", false], courseId: ["courses", false] },
  schedules: { courseId: ["courses", false] },
  enrollments: { studentId: ["users", false], classId: ["classes", false], createdById: ["users", false] },
  course_enrollments: { courseId: ["courses", false], studentId: ["users", false], sourceClassId: ["classes", false], createdById: ["users", false] },
  assignments: { courseId: ["courses", false], quizId: ["quizzes", false], submissions: ["submissions", true] },
  user_workspace_preferences: { userId: ["users", false] },
  course_navigation_states: { userId: ["users", false], courseId: ["courses", false] },
  course_announcements: { courseId: ["courses", false], authorId: ["users", false] },
  course_chat_messages: { courseId: ["courses", false], senderId: ["users", false] },
  academic_rollovers: { sourceTermId: ["terms", false], targetTermId: ["terms", false], actorId: ["users", false], items: ["academic_rollover_items", true] },
  academic_rollover_items: { rolloverId: ["academic_rollovers", false] },
  management_audit_logs: { actorId: ["users", false] },
  submissions: { assignmentId: ["assignments", false], studentId: ["users", false] },
  attendances: { courseId: ["courses", false], studentId: ["users", false] },
  conversations: { participantIds: ["users", true], messages: ["messages", true] },
  messages: { conversationId: ["conversations", false], senderId: ["users", false] },
  quizzes: { teacherId: ["users", false], folderId: ["quiz_folders", false], questions: ["quiz_questions", true], assignments: ["assignments", true] },
  quiz_folders: { teacherId: ["users", false], quizzes: ["quizzes", true] },
  quiz_questions: { quizId: ["quizzes", false], choices: ["quiz_choices", true] },
  quiz_choices: { questionId: ["quiz_questions", false] },
  report_cards: { studentId: ["users", false], classId: ["classes", false], termId: ["terms", false] },
};

function safeFind(app, name) {
  try { return app.findCollectionByNameOrId(name); } catch (_) { return null; }
}

function ensureField(collection, field) {
  if (!collection.fields.getByName(field.name)) {
    collection.fields.addMarshaledJSON(JSON.stringify(field));
  }
}

function ensureIndex(collection, name, expression, unique = false) {
  try { collection.getIndex(name); } catch (_) { collection.addIndex(name, unique, expression, ""); }
}

migrate((app) => {
  // Extend the built-in auth collection first.
  const users = safeFind(app, "users");
  if (users) {
    [
      text("legacyId", { required: false, max: 64 }), text("nickname"), text("legacyPasswordHash", { hidden: true }),
      json("avatarConfig"), multiSelect("roles", enumValues.roles, { required: true }), date("lastLoginAt"), bool("isActive"),
      text("nip"), text("nis"), text("nisn"), text("officialId"), text("creationSource"), json("enrolledCourseIds"), json("conversationIds"),
      date("createdAt"), date("updatedAt"), date("deletedAt"), file("avatar", { maxSize: 4194304, mimeTypes: ["image/*"] }),
    ].forEach((field) => ensureField(users, field));
    ensureIndex(users, "idx_users_legacy_id", "legacyId", true);
    app.save(users);
  }

  Object.keys(specs).forEach((name) => {
    let collection = safeFind(app, name);
    if (!collection) {
      collection = new Collection({ type: "base", name, ...commonRules, fields: baseFields().concat(specs[name]) });
    } else {
      baseFields().concat(specs[name]).forEach((field) => ensureField(collection, field));
    }
    ensureIndex(collection, `idx_${name}_legacy_id`, "legacyId", true);
    app.save(collection);
  });

  // Add relations in a second pass so every referenced collection already has
  // a stable PocketBase collection id.
  Object.keys(relations).forEach((sourceName) => {
    const source = safeFind(app, sourceName);
    if (!source) return;
    Object.keys(relations[sourceName]).forEach((fieldName) => {
      const [targetName, multiple] = relations[sourceName][fieldName];
      const target = safeFind(app, targetName);
      if (!target || source.fields.getByName(fieldName)) return;
      source.fields.add(new RelationField({ name: fieldName, collectionId: target.id, maxSelect: multiple ? 99 : 1, cascadeDelete: false }));
    });
    app.save(source);
  });

  // Unique constraints reflected by the Prisma schema. They are deliberately
  // added after fields/relations so a fresh and a partially initialized PB both
  // converge to the same shape.
  ensureIndex(safeFind(app, "subjects"), "idx_subjects_code", "code", true);
  ensureIndex(safeFind(app, "material_folders"), "idx_material_folders_teacher_name", "teacherId, name", true);
  ensureIndex(safeFind(app, "quiz_folders"), "idx_quiz_folders_teacher_name", "teacherId, name", true);
  ensureIndex(safeFind(app, "material_assignments"), "idx_material_assignments_pair", "materialId, courseId", true);
  ensureIndex(safeFind(app, "enrollments"), "idx_enrollments_pair", "studentId, classId", true);
  ensureIndex(safeFind(app, "course_enrollments"), "idx_course_enrollments_pair", "courseId, studentId", true);
  ensureIndex(safeFind(app, "user_workspace_preferences"), "idx_workspace_user", "userId", true);
  ensureIndex(safeFind(app, "course_navigation_states"), "idx_navigation_unique", "userId, courseId, roleContext", true);
}, (app) => {
  // The source MongoDB remains untouched. Down only removes application
  // collections; the built-in auth collection is preserved.
  Object.keys(specs).reverse().forEach((name) => {
    const collection = safeFind(app, name);
    if (collection) app.delete(collection);
  });
});
