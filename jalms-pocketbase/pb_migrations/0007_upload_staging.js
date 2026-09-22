/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  try { app.findCollectionByNameOrId("upload_staging"); return; } catch (_) {}
  const collection = new Collection({
    type: "base",
    name: "upload_staging",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      { type: "text", name: "legacyId", required: true, max: 64 },
      { type: "file", name: "file", required: true, maxSelect: 1, maxSize: 33554432 },
      { type: "text", name: "folder" },
      { type: "text", name: "ownerId" },
      { type: "text", name: "originalName" },
      { type: "date", name: "createdAt" },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_upload_staging_legacy ON upload_staging (legacyId)"],
  });
  app.save(collection);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("upload_staging")); } catch (_) {}
});
