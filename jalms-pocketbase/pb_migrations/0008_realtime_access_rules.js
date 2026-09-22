/// <reference path="../pb_data/types.d.ts" />

function safeFind(app, name) {
  try { return app.findCollectionByNameOrId(name); } catch (_) { return null; }
}

migrate((app) => {
  const courseChat = safeFind(app, "course_chat_messages");
  if (courseChat) {
    const courseMember = '@request.auth.id != "" && (courseId.teacherId = @request.auth.id || courseId.studentIds.id ?= @request.auth.id)';
    courseChat.listRule = courseMember;
    courseChat.viewRule = courseMember;
    courseChat.createRule = `${courseMember} && senderId = @request.auth.id`;
    courseChat.updateRule = '@request.auth.id != "" && senderId = @request.auth.id';
    courseChat.deleteRule = '@request.auth.id != "" && senderId = @request.auth.id';
    app.save(courseChat);
  }

  const messages = safeFind(app, "messages");
  if (messages) {
    const participant = '@request.auth.id != "" && conversationId.participantIds.id ?= @request.auth.id';
    messages.listRule = participant;
    messages.viewRule = participant;
    messages.createRule = `${participant} && senderId = @request.auth.id`;
    messages.updateRule = participant;
    messages.deleteRule = '@request.auth.id != "" && senderId = @request.auth.id';
    app.save(messages);
  }

  const staging = safeFind(app, "upload_staging");
  if (staging) {
    staging.listRule = '@request.auth.id != "" && ownerId = @request.auth.id';
    staging.viewRule = '@request.auth.id != "" && ownerId = @request.auth.id';
    staging.createRule = '@request.auth.id != "" && ownerId = @request.auth.id';
    staging.updateRule = '@request.auth.id != "" && ownerId = @request.auth.id';
    staging.deleteRule = '@request.auth.id != "" && ownerId = @request.auth.id';
    app.save(staging);
  }
}, (app) => {});
