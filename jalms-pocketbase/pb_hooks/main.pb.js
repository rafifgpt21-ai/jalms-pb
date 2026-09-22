// Small, dependency-free PocketBase hook surface used by the Next.js adapter.
// Domain writes still go through the normal PocketBase API so collection rules,
// realtime events, and file handling remain standard PB behavior.

routerAdd("GET", "/api/jalms/health", (e) => {
  e.json(200, {
    ok: true,
    service: "jalms-pocketbase",
    realtime: "pocketbase-sse",
  });
});

// The migration report endpoint is intentionally not exposed here. Reports are
// written by the local migration CLI and must not be readable by application
// users.
