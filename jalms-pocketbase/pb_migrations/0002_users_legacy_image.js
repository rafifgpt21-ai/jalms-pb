/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  if (!users.fields.getByName("imageUrl")) {
    users.fields.addMarshaledJSON(JSON.stringify({ type: "text", name: "imageUrl" }));
    app.save(users);
  }
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  if (users.fields.getByName("imageUrl")) {
    users.fields.removeByName("imageUrl");
    app.save(users);
  }
});
