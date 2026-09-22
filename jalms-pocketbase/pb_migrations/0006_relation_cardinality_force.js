/// <reference path="../pb_data/types.d.ts" />

const fieldsByCollection = {
  users: ["enrolledCourseIds", "conversationIds", "homeroomClasses", "enrollments", "submissions", "attendances", "materials", "materialFolders", "quizzes", "quizFolders", "messages", "reportCards", "courseEnrollments", "courseNavigationState", "courseAnnouncements", "courseChatMessages"],
  academic_years: ["terms"], terms: ["courses", "classes", "reportCards"], classes: ["students", "courses", "reportCards"],
  courses: ["studentIds", "courseEnrollments", "assignments", "schedules", "materials", "materialAssignments", "navigationStates", "announcements", "chatMessages"],
  subjects: ["courses"], materials: ["assignments"], material_folders: ["materials"], assignments: ["submissions"],
  academic_rollovers: ["items"], conversations: ["participantIds", "messages"], quizzes: ["questions", "assignments"],
  quiz_folders: ["quizzes"], quiz_questions: ["choices"],
};

migrate((app) => {
  Object.keys(fieldsByCollection).forEach((collectionName) => {
    const collection = app.findCollectionByNameOrId(collectionName);
    fieldsByCollection[collectionName].forEach((fieldName) => {
      const field = collection.fields.getByName(fieldName);
      if (!field) return;
      collection.fields.removeByName(fieldName);
      collection.fields.add(new RelationField({ id: field.id, name: field.name, collectionId: field.collectionId, maxSelect: 99, cascadeDelete: false }));
    });
    app.save(collection);
  });
}, (app) => {});
