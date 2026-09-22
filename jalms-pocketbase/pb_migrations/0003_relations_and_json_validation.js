/// <reference path="../pb_data/types.d.ts" />

const relationTargets = {
  users: { enrolledCourseIds: ["courses", true], conversationIds: ["conversations", true] },
  academic_years: { terms: ["terms", true] },
  terms: { academicYearId: ["academic_years", false], courses: ["courses", true], classes: ["classes", true], reportCards: ["report_cards", true] },
  classes: { termId: ["terms", false], homeroomTeacherId: ["users", false], students: ["enrollments", true], courses: ["courses", true], reportCards: ["report_cards", true] },
  courses: { subjectId: ["subjects", false], classId: ["classes", false], termId: ["terms", false], teacherId: ["users", false], studentIds: ["users", true], courseEnrollments: ["course_enrollments", true], assignments: ["assignments", true], schedules: ["schedules", true], materials: ["materials", true], materialAssignments: ["material_assignments", true], navigationStates: ["course_navigation_states", true], announcements: ["course_announcements", true], chatMessages: ["course_chat_messages", true] },
  subjects: { courses: ["courses", true] },
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

migrate((app) => {
  Object.keys(relationTargets).forEach((sourceName) => {
    const source = safeFind(app, sourceName);
    if (!source) return;
    Object.keys(relationTargets[sourceName]).forEach((fieldName) => {
      const [targetName, multiple] = relationTargets[sourceName][fieldName];
      const target = safeFind(app, targetName);
      if (!target) return;
      const current = source.fields.getByName(fieldName);
      if (current && current.type === "relation" && current.collectionId === target.id) return;
      if (current) source.fields.removeByName(fieldName);
      source.fields.add(new RelationField({ name: fieldName, collectionId: target.id, maxSelect: multiple ? 99 : 1, cascadeDelete: false }));
    });
    app.save(source);
  });

  const reportCards = safeFind(app, "report_cards");
  if (reportCards) {
    ["courseGrades", "extracurriculars", "achievements", "development", "attendance"].forEach((name) => {
      const field = reportCards.fields.getByName(name);
      if (field) field.required = false;
    });
    app.save(reportCards);
  }
}, (app) => {
  // Relations are part of the application schema and are intentionally left
  // in place on rollback; the previous migration remains a valid fallback.
});
