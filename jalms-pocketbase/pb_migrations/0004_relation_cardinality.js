/// <reference path="../pb_data/types.d.ts" />

const multiRelations = {
  users: ["enrolledCourseIds", "conversationIds", "homeroomClasses", "enrollments", "submissions", "attendances", "materials", "materialFolders", "quizzes", "quizFolders", "messages", "reportCards", "courseEnrollments", "courseNavigationState", "courseAnnouncements", "courseChatMessages"],
  academic_years: ["terms"],
  terms: ["courses", "classes", "reportCards"],
  classes: ["students", "courses", "reportCards"],
  courses: ["studentIds", "courseEnrollments", "assignments", "schedules", "materials", "materialAssignments", "navigationStates", "announcements", "chatMessages"],
  subjects: ["courses"],
  materials: ["assignments"],
  material_folders: ["materials"],
  material_assignments: [],
  schedules: [],
  enrollments: [],
  course_enrollments: [],
  assignments: ["submissions"],
  user_workspace_preferences: [],
  course_navigation_states: [],
  course_announcements: [],
  course_chat_messages: [],
  academic_rollovers: ["items"],
  academic_rollover_items: [],
  management_audit_logs: [],
  submissions: [],
  attendances: [],
  conversations: ["participantIds", "messages"],
  messages: [],
  quizzes: ["questions", "assignments"],
  quiz_folders: ["quizzes"],
  quiz_questions: ["choices"],
  quiz_choices: [],
  report_cards: [],
};

migrate((app) => {
  Object.keys(multiRelations).forEach((collectionName) => {
    const collection = app.findCollectionByNameOrId(collectionName);
    for (const fieldName of multiRelations[collectionName]) {
      const field = collection.fields.getByName(fieldName);
      if (field && field.type === "relation" && field.maxSelect !== 99) {
        collection.fields.removeByName(fieldName);
        collection.fields.add(new RelationField({
          id: field.id,
          name: field.name,
          collectionId: field.collectionId,
          maxSelect: 99,
          cascadeDelete: field.cascadeDelete,
        }));
      }
    }
    app.save(collection);
  });
}, (app) => {});
