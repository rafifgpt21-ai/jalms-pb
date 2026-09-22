# Vercel usage optimization guide for JALMS / Arsync

This guide adapts the supplied **Vercel Application Optimization Guide** to this repository as inspected on 2026-07-16. It is intentionally implementation-oriented: it separates recommendations that fit this authenticated MongoDB/Prisma school application from advice that is useful only for public content, monorepos, AI workloads, or other runtimes.

No application changes are made by this document.

## Executive summary

The largest likely Vercel usage reduction is not a rendering flag. It is removing or radically reducing the chat polling that runs from the shared dashboard shell.

| Priority | Finding in this app | Why it consumes Vercel usage | Recommended outcome |
| --- | --- | --- | --- |
| P0 | Global unread polling every 15 seconds in `components/chat/chat-notification-provider.tsx` | About 4 server-action invocations per minute for every open dashboard, even when the user is not using chat. Each poll authenticates and runs MongoDB queries. | Do not poll from every dashboard. Push updates through a managed realtime service, or poll only while chat is visible with backoff and visibility/offline checks. |
| P0 | Active chat polling every 3 seconds in `components/chat/chat-window.tsx` | About 20 invocations per minute per open chat, in addition to global unread polling. Each request performs authorization and database reads. | Replace with managed realtime delivery. As an interim measure, use a much slower adaptive interval and stop when hidden, offline, or idle. |
| P0 | Authentication and user-role reads are repeated through nested layouts and actions | `auth()` may trigger the JWT callback database lookup, then the dashboard layout and admin layout query the user again. This adds latency and billed function duration to most authenticated requests. | Build one request-memoized `getCurrentUser()`/authorization path; trust versioned JWT claims between controlled refreshes; remove duplicate role lookups. |
| P0 | `app/layout.tsx` reads cookies | A dynamic API in the root layout makes even the otherwise static login shell depend on server rendering. | Move appearance-cookie work into the authenticated layout or a client bootstrap that reads cookies. Keep `/login` static except for the submitted login action. |
| P0 | Legacy local-files route and `fs` cleanup code remain | Vercel's filesystem is ephemeral. Serving files through a function adds invocation, duration, and transfer usage and is not durable. | Migrate legacy `/api/files/*` URLs, deliver UploadThing/object-storage URLs directly, then remove the file route and local `fs` branches. |
| P0 | Repository logs show failed production builds after compilation | Failed deployments still spend build time. The recorded failures include type checking and `@react-pdf/renderer` bundling. | Require a clean local/CI production build before Vercel deploys; isolate PDF tooling behind a route-specific client-only dynamic boundary. |
| P1 | Eighteen app files contain `force-dynamic` while the shared layouts are already dynamic | Explicit force-dynamic declarations prevent future static shells and granular caching. | Audit each declaration. Keep request-specific data dynamic, but remove redundant declarations as cache boundaries are introduced. |
| P1 | Dashboard navigation loads several relational arrays on every route | The shared dashboard layout requests roles, courses, assignments, materials, enrollments, preferences, and navigation state for every navigation. | Create a narrow navigation query with only displayed fields/counts; memoize it per request and refresh it only after relevant mutations. |
| P1 | Chat collections have no declared indexes in `prisma/schema.prisma` | Frequent participant, conversation, timestamp, and unread queries can scan increasingly large collections. | Add query-aligned indexes and replace negative `readByIds` scans with per-member `lastReadAt`/unread state. |
| P1 | Large server-action modules import UploadThing and Node filesystem code at module scope | High-frequency read actions may inherit larger bundles and cold-start work than needed. | Split read queries, mutations, imports, and storage cleanup into small modules; dynamically import heavy storage/PDF/Excel code only where used. |
| P2 | Shared client shell and many route features pull in heavy libraries | PDF, editor, charts, drag-and-drop, animations, avatar generation, and spreadsheets increase client/server bundles and data transfer if loaded too broadly. | Lazy-load feature libraries at the interaction or route boundary and remove unused legacy components/dependencies. |

## Expected impact of the chat fix

The current polling intervals provide a useful upper-bound model:

- An idle signed-in dashboard: `60 / 15 = 4` unread-status invocations per minute.
- An open foreground chat: `60 / 3 = 20` message invocations per minute, plus the 4 global unread polls.
- One open chat tab therefore reaches roughly `24 x 60 = 1,440` invocations per hour before sends, read receipts, refreshes, page requests, or retries.
- At eight hours per day and 22 school days, persistent global polling alone is roughly `42,240` invocations per continuously open user per month. One hundred such users would exceed four million polling invocations.

These are arithmetic projections from the source intervals, not measured production traffic. Confirm them against the Vercel Usage dashboard.

## Current architecture relevant to Vercel billing

- Next.js 16 App Router with React 19.
- MongoDB through Prisma.
- NextAuth credentials/JWT authentication.
- 71 page, route, and layout files under `app`.
- 124 client-marked TypeScript/TSX files under `app`, `components`, and `hooks`.
- Authenticated role dashboards for admins, teachers, homeroom teachers, students, and parents.
- UploadThing for uploaded media and documents, with legacy local-file code still present.
- No Vercel Web Analytics or Speed Insights package is currently installed. This already avoids those event charges.
- No Vercel AI Gateway or AI feature is present. AI key budgets are therefore not currently applicable.
- No Turborepo/monorepo structure is present. Turborepo migration is not justified solely to reduce this project's current build usage.
- `lib/db.ts` already reuses one Prisma client in development. Keep a singleton pattern; never create a new client inside each request.

## 1. Measure before and after

Capture at least seven representative school days before changing architecture. Record:

1. Function invocations by route/action.
2. Fluid compute or function execution duration and GB-hours.
3. Fast Data Transfer.
4. Image Optimization source images and transformations.
5. Build minutes, cache-hit rate, failed builds, and deployments per day.
6. MongoDB query volume, examined-versus-returned document counts, connection count, and slow queries.
7. Active dashboard sessions and active chat sessions.

Use the compute formula from the supplied guide when comparing changes:

```text
GB-hours = (memory allocation in MB / 1024)
         x (active duration in seconds / 3600)
         x invocations
```

The desired end state is:

- An idle dashboard causes no recurring Vercel function calls, or at most one low-cost, backoff-controlled call per minute when realtime notifications are explicitly required.
- A hidden/offline tab causes zero polling.
- Opening chat does not create a fixed three-second server-action loop.
- Shared dashboard navigation does not repeat the same authentication and reference-data queries in nested layouts.
- Production builds pass before being submitted to Vercel.

## 2. Stop polling from the global dashboard shell

### Current behavior

`components/chat/chat-notification-provider.tsx` mounts for the entire authenticated dashboard. It:

- immediately calls `getConversations()` after hydration;
- calls `getUnreadStatus()` every 15 seconds;
- calls `getConversations()` again whenever activity or unread state differs.

`getUnreadStatus()` in `app/actions/chat.ts` authenticates, scans unread messages, then separately reads the latest conversation activity. The dashboard therefore pays for authentication plus multiple database operations on every tick.

`components/chat/chat-window.tsx` additionally calls `getMessages()` every 3 seconds in a visible tab and every 15 seconds in a hidden tab. `getMessages()` authenticates, reads the conversation for authorization, and then reads messages.

### Target design

Preferred order:

1. Use a managed realtime/push channel for message and unread events. Keep Vercel functions for authorization and message writes, not long-lived polling loops.
2. If realtime infrastructure is not available yet, poll only on `/socials` routes. Do not poll from every dashboard page.
3. Poll an intentionally small unread-version/count endpoint, not a server action returning an RSC payload and not the full conversation list.
4. Use adaptive intervals: short only immediately after user activity, then 30, 60, and 120 seconds. Stop completely when `document.hidden`, `navigator.onLine === false`, or the user is idle.
5. Fetch conversation details only when the returned version changes.
6. Preserve optimistic updates after send/read so a broad `router.refresh()` or layout revalidation is unnecessary.

### Database design for chat

At minimum, add indexes aligned with actual access patterns:

```prisma
model Conversation {
  // existing fields...
  @@index([participantIds, lastMessageAt])
}

model Message {
  // existing fields...
  @@index([conversationId, createdAt])
  @@index([senderId])
}
```

The current negative array predicate, "user ID is not in `readByIds`", is difficult to make efficient. The scalable model is a conversation-member record containing `userId`, `conversationId`, and `lastReadAt` (or an unread counter). Then unread state is derived from `Conversation.lastMessageAt > member.lastReadAt` without scanning messages.

Also replace `revalidatePath("/", "layout")` in `markConversationAsRead()` with local optimistic state and a chat-specific refresh/tag. Invalidating the entire app layout for a read receipt is much broader than the changed data.

## 3. Remove repeated authentication and user lookups

### Current duplication

- `auth.ts` reads the user in the JWT callback.
- `app/(dashboard)/layout.tsx` calls `auth()`, then reads the user roles again.
- `app/(dashboard)/admin/layout.tsx` calls `auth()` and reads roles again.
- Individual pages and server actions often call `auth()` or `getUser()` again.
- A conversation page authenticates at the page level and again inside `getMessages()`.

### Recommended design

Create a single server-only request-memoized helper using React `cache()`:

```ts
import { cache } from "react";
import { auth } from "@/auth";

export const getCurrentSession = cache(async () => auth());
```

If fresh database roles are required, provide one `getCurrentUser()` helper that performs that lookup once per request and is reused by layouts, pages, and data loaders. Do not put private session/user objects in a cross-request shared cache.

Avoid a database read on every JWT callback. Keep roles and a role/version claim in the JWT, refresh them on sign-in, explicit session update, a controlled TTL, or when an administrator changes a user's access. This trades constant database work for bounded staleness; choose the refresh window according to the school's revocation requirements.

Where a page already has an authenticated user ID, pass it into internal data functions rather than authenticating again. Authorization must still occur at the trusted server boundary.

## 4. Restore a static public/login shell

`app/layout.tsx` calls `cookies()` to initialize theme and density. Because this is the root layout, every route inherits a request-time dynamic dependency.

Move the cookie-dependent appearance initialization to one of these locations:

- the authenticated dashboard layout, where rendering is already personalized; or
- the existing inline pre-hydration script, changed to read `document.cookie` directly and apply `data-theme`/`data-density` before paint.

Then keep the login page as a static/client shell. Only the credential submission server action should invoke compute. Static HTML, CSS, JS, fonts, and SVGs can be served from the CDN without a page-render function invocation.

The root `/` role redirect can remain dynamic, but the proxy already knows JWT roles. Prefer redirecting authenticated users there when possible so `/` does not perform another user-role database read.

## 5. Choose rendering and caching by data sensitivity

The supplied guide compares SSG, ISR, Partial Prerendering, SSR, and CSR. For this app:

| App area | Appropriate model | Notes |
| --- | --- | --- |
| Login and any future public help/marketing pages | Static generation | No per-request compute after deployment. |
| Public course catalog or public announcements, if introduced | ISR | Cache globally with a deliberate revalidation period. |
| Authenticated dashboard shell | Partial/static shell plus dynamic user fragments | Keep auth and private records dynamic. Reuse existing Suspense boundaries. |
| Admin, gradebook, attendance, submission, and private student data | Dynamic server rendering/data actions | Never place private responses in a public CDN cache. Optimize query count and duration instead. |
| Highly interactive editors, quiz player, imports, charts | Client interaction after a server-provided initial payload | Avoid repeated API fetching when the server already returned the data. |

### Audit `force-dynamic`

Eighteen app files contain `force-dynamic`. Many are genuinely request-specific, but explicit route-wide dynamic mode blocks more granular optimization. Audit each declaration after the root layout and caching changes:

- Keep private request-time data dynamic.
- Remove declarations that are redundant because only a nested component is dynamic.
- Isolate cookie/header/session reads inside the smallest possible dynamic component.
- Keep static quick-action panels and layout chrome outside the dynamic data boundary.

### Next.js 16 Cache Components

This project already uses Next.js 16, so the guide's Cache Components model is relevant. Adopt it incrementally, not as a single flag flip across the whole application.

Example configuration:

```ts
const nextConfig = {
  cacheComponents: true,
  cacheLife: {
    schoolReference: {
      stale: 300,
      revalidate: 900,
      expire: 3600,
    },
  },
};
```

Example for non-user-specific reference data:

```ts
import { cacheLife, cacheTag } from "next/cache";

export async function getActiveTerms() {
  "use cache";
  cacheLife("schoolReference");
  cacheTag("active-terms");
  return db.term.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
}
```

Good cache candidates include active term metadata, subject definitions, grading-scale configuration, and other school-wide reference data. Poor candidates include sessions, unread messages, personal preferences, grades, submissions, and authorization decisions.

When data changes, invalidate the narrow tag. Do not clear the whole site. Prefer asynchronous invalidation over hard deletion so the next user can receive stale data while background revalidation runs instead of causing a cache stampede.

## 6. Make dashboard navigation data smaller

Every dashboard route executes the shared layout. Its current parallel work includes:

- a fresh user-role lookup;
- teacher or student courses;
- workspace preferences;
- course navigation state.

The course loaders include relational arrays such as assignments, material assignments, enrollments, teacher/term records, and legacy student IDs so the layout can derive a few counts and labels.

Create a dedicated navigation projection that returns only:

- course ID and display/report name;
- subject/class label and color;
- icon URL;
- teacher display name when needed;
- server-computed counts needed by the navigation;
- last section key.

Avoid returning whole related records or arrays solely to count them. Continue using `Promise.all` for independent reads, and keep the existing React request memoization in the student dashboard components.

For school-wide admin dashboard values that can tolerate short staleness, use a 30-300 second tagged cache instead of counting the same collections on every page view.

## 7. Align functions with MongoDB and keep database work on Node.js

The guide recommends aligning compute with the upstream datastore. Determine the primary MongoDB Atlas region, then configure the Vercel function region as close as possible. Do not guess the region from the users' location: database round-trips dominate these server-rendered requests.

This app uses Prisma's MongoDB connector and Node-only libraries. Keep database handlers on the Node.js/serverless runtime. Edge functions are appropriate only for lightweight routing, inexpensive request checks, or geolocation logic that does not import Prisma, `fs`, `path`, PDF tooling, or other Node dependencies.

Database practices:

- Keep one reusable Prisma client per warm instance.
- Do not call `$disconnect()` at the end of every request.
- Monitor Atlas connections and configure a sensible connection limit/pool in the MongoDB connection settings for the selected Vercel concurrency.
- Use narrow `select` projections.
- Add indexes for actual filters and sort keys.
- Bound historical queries with date windows, pagination, and `take` values.
- Avoid large nested `include` trees for navigation and polling.
- Do not copy PostgreSQL-specific proxy or connection teardown examples from the source guide into this MongoDB app without validating compatibility.

## 8. Remove ephemeral local file delivery

`app/api/files/[...path]/route.ts` reads files from `process.cwd()/uploads` into a buffer and sends them through a function. Vercel instances do not provide durable shared storage, and this path makes the application pay function execution plus transfer for bytes that object storage/CDN should serve directly.

The app already uploads through UploadThing. Complete that migration:

1. Find database URLs beginning with `/api/files/`.
2. Migrate or archive those objects into durable storage.
3. Replace stored URLs with direct durable URLs.
4. Remove the local files route after migration.
5. Remove legacy `unlink()`/`path.join(process.cwd(), "uploads", ...)` branches from student, material, quiz, and user action modules.
6. Delete stored UploadThing objects only after the database mutation succeeds, preferably through a retryable cleanup job rather than unobserved fire-and-forget work.

Upload limits should reflect classroom needs. Current endpoints permit blobs up to 16 MB and multiple attachments. Add per-role, per-file-type, and per-user quotas to prevent accidental or abusive transfer/storage usage.

## 9. Use CDN caching only for public responses

For genuinely public, identical API responses, the guide recommends Vercel CDN cache control with stale-while-revalidate:

```http
Vercel-CDN-Cache-Control: s-maxage=300, stale-while-revalidate=900, stale-if-error=86400
```

This permits fast stale delivery while a background refresh runs and allows stale content during an origin failure. Use granular cache tags for selective invalidation.

Do **not** apply public `s-maxage` caching to authenticated grade, attendance, submission, chat, role, preference, or user responses. Those should be private/no-store unless a correctly scoped per-user cache exists outside the shared CDN.

Prefer marking tagged content stale over deleting it. Hard deletion forces the next request to block on origin regeneration and can create a cache stampede under concurrency.

## 10. Reduce function bundles and cold starts

### Split server-action modules

Several action files are 17-35 KB and mix frequent reads with writes, UploadThing deletion, filesystem imports, and complex workflows. Split them by execution profile, for example:

```text
lib/actions/student.read.ts
lib/actions/student.mutations.ts
lib/actions/student.storage.ts
lib/actions/student.reports.ts
```

Import heavy dependencies only inside the action that needs them. This is particularly important for `uploadthing/server`, `exceljs`, `@react-pdf/renderer`, image compression, and filesystem code.

### Feature-load heavy client packages

- Keep `exceljs` dynamically imported; the import pages already do this correctly.
- Load PDF preview/download code only when the report preview is opened. The recorded `@react-pdf/renderer` build failure is also a signal that its client/server boundary needs to be explicit.
- Lazy-load charts only on grade/intelligence routes.
- Lazy-load Tiptap only when an editor opens.
- Lazy-load avatar generation and image compression only in the avatar editor.
- Keep drag-and-drop code out of the initial shell until course reordering is enabled.
- Prefer CSS transitions for simple shared-shell animation instead of loading a general animation library everywhere.

`next.config.ts` already uses `optimizePackageImports` for Lucide, Recharts, and date-fns. Keep that optimization, remove the `lodash` entry if lodash remains absent, and verify actual bundles rather than assuming the flag solves route-level loading.

### Standalone output

The source guide recommends `output: "standalone"` for compact self-hosted Next.js containers. Vercel already traces Next.js function dependencies. Do not enable standalone output solely to reduce Vercel usage; first inspect Vercel function bundle reports. It is valuable mainly for a future self-hosted container deployment.

### Large Functions

Do not enable Large Functions preemptively. If a function approaches the normal uncompressed limit, first split the route, remove unused dependencies, and isolate PDF/import tooling. Larger bundles increase cold-start and deployment costs even when the platform permits them.

## 11. Set memory and duration deliberately

Do not raise memory globally. Vercel compute cost is a product of allocation, duration, and invocations.

- Database-bound reads usually benefit more from region alignment and fewer round-trips than extra memory.
- CPU-heavy Excel parsing, PDF generation, bcrypt, or image work may complete faster with more CPU/memory, so benchmark total GB-hours rather than looking only at duration.
- Add a conservative `maxDuration` to interactive routes/actions so stalled upstream calls cannot run indefinitely.
- Allow a longer duration only for bounded import/report workflows that genuinely require it.
- Move very long rollover/import work to a durable background-job system with idempotency and progress tracking instead of holding an interactive request open.
- Close custom streams/sockets and abort upstream requests on timeout. Do not disconnect the shared Prisma client after each request.

The source guide suggests cron requests to keep archived functions warm. For this cost-reduction project, do not add warm-up cron invocations unless a measured cold-start latency violates a defined SLA. Paying continuously to avoid an occasional cold start is usually the wrong tradeoff here.

## 12. Optimize images without creating transformation abuse

Current positives:

- Quiz imagery and some workspace imagery use `next/image`.
- The config restricts remote images to Google and UploadThing-related hosts.

Recommended changes:

1. Add AVIF and WebP output formats:

   ```ts
   images: {
     formats: ["image/avif", "image/webp"],
     // remotePatterns...
   }
   ```

2. Narrow `remotePatterns` to the exact UploadThing host/path patterns actually stored in the database. The current `**.ufs.sh` wildcard is broader than necessary.
3. Supply accurate `sizes` for every `fill` image; missing `sizes` can make browsers download desktop-sized variants on small screens.
4. Use explicit width/height or aspect-ratio containers to prevent layout shift.
5. Use responsive art direction for large hero/content images so mobile devices never fetch the desktop source.
6. Keep SVGs and tiny already-optimized CDN avatars unoptimized when another transformation would add cost without reducing meaningful bytes. Measure both transfer and transformation counts before deciding.
7. Store images under stable URLs so transformed variants are reused instead of creating new source-image identities.
8. Enforce upload dimensions and compress oversized images in the browser before upload, as the quiz/avatar flows already begin to do.

Do not use `next/image` as an unrestricted proxy for arbitrary remote URLs. Exact host and path patterns prevent third parties from consuming the project's Image Optimization allowance.

## 13. Build pipeline recommendations

### Fix failures before Vercel receives a deployment

Repository logs show a production compile completing in about 19.4 seconds before a type-check failure, and another failure involving `@react-pdf/renderer`. Failed Vercel attempts still consume build resources.

Run the exact production build in CI first. Only a passing commit should trigger Vercel production deployment. Do not disable type checking to make deployments pass.

### Keep the default/Elastic machine

The recorded compile time is short and there is no evidence that this single-package project needs an Enhanced or Turbo build machine. On a paid Vercel team, keep Elastic/default allocation so lightweight builds stay on the smallest adequate machine and bursts can scale only when needed.

### Ignore non-production changes

Configure Vercel's Ignored Build Step so documentation/log-only changes do not deploy. A suitable command should compare the previous and current commit only across production inputs, for example:

```bash
git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" "$VERCEL_GIT_COMMIT_SHA" -- \
  app components hooks lib prisma public types \
  auth.ts auth.config.ts proxy.ts next.config.ts package.json package-lock.json tsconfig.json
```

In Vercel's ignored-build contract, exit code 0 means no relevant change and the build is skipped; a detected difference exits nonzero and continues the build. Validate this in a preview project before relying on it.

### Keep expensive quality work outside the Vercel build

The current `build` script only invokes `next build`, while Prisma generation runs at install time. Keep large test suites, security scans, and integration tests in CI. Vercel should generate production assets after those checks pass.

### Turborepo and remote cache

Do not introduce Turborepo just for this single app. If the repository later becomes a real multi-package monorepo, use a task graph and Vercel Remote Cache so unchanged tasks reuse artifacts. Until then, the added orchestration is unlikely to repay its complexity.

## 14. Spend management and overage safeguards

Enable Spend Management for the Vercel team:

1. Open the target team in the Vercel dashboard.
2. Go to **Settings -> Billing -> Spend Management**.
3. Set warning thresholds well below the hard ceiling.
4. Enable email/web notifications and a signed webhook.
5. Decide whether the school accepts automatic production pausing.
6. Document who can manually unpause service and how they will be contacted.

Important behavior from the supplied guide:

- Usage checks are not continuous; a spike may continue for several minutes after crossing a threshold. Set the configured limit below the true maximum.
- Automatic pausing suspends production and requests may return `503 DEPLOYMENT_PAUSED`.
- Raising a limit does not necessarily resume service; an administrator must manually unpause affected projects.
- Verify the spend webhook signature before acting on it.
- Keep alert handling independent of the same Vercel project where possible; a paused project cannot reliably alert about itself.

### Guide pricing snapshot

The supplied document lists this Pro-plan snapshot. Treat it only as budgeting context and verify the current Vercel plan before making financial decisions.

| Resource | Included amount in supplied guide | Overage in supplied guide | Relevance to this app |
| --- | ---: | ---: | --- |
| Fast Data Transfer | 1 TB/month | $40 per additional 100 GB | Uploads, RSC/JS payloads, images, and any function-served files. |
| Function execution | 1,000 GB-hours/month | $0.18 per additional GB-hour | Dynamic dashboards, auth, server actions, chat polling, imports, reports. |
| Function invocations | 1 million/month | $0.60 per additional million | Chat polling is the clearest avoidable source. |
| Image transformations | 5,000 source images/month | $0.05 per additional 1,000 | Relevant to uploaded quiz/course/avatar images. |
| Edge Config reads | 100,000/month | $3 per additional million | Not currently used. |

Do not rely on the supplied MAU-to-bill projection for this app. An authenticated school application's bill is driven more directly by concurrent open tabs, polling frequency, database latency, upload/download size, and administrative workflows than by MAU alone.

### AI Gateway budgets

The source guide recommends per-key AI Gateway budgets with daily, weekly, or monthly resets. This application has no AI Gateway integration today, so do not add it. If LLM features are introduced, create separate production keys with request-time budgets before launch, rather than relying only on the overall Vercel team cap.

## 15. Analytics and observability

Vercel Web Analytics and Speed Insights are not installed. Leave them disabled if the school does not need them; no events is cheaper than sampled events.

If they are enabled later:

- sample a representative fraction instead of 100% of sessions;
- exclude previews, staging, synthetic tests, admin tools, and internal staff traffic;
- avoid high-cardinality custom events;
- confirm current SDK support for sampling/filter callbacks before implementing the example from the source guide;
- set an event budget and alert;
- consider an Observability Drain only when an existing central platform and volume justify it, because drains and the destination also have costs.

Application logs should not include credentials, passwords, full upload URLs with secrets, or excessive per-request debug statements. Production console removal is already enabled in `next.config.ts`.

## 16. Recommended implementation sequence

### Phase 1: stop runaway recurring usage

- Remove global dashboard chat polling.
- Replace or back off the three-second active-chat loop.
- Add chat indexes/redesign unread state.
- Replace whole-layout chat revalidation.
- Enable spend alerts and a hard-cap policy.

### Phase 2: reduce every authenticated request

- Memoize auth/current-user work per request.
- Remove duplicate role lookups in nested layouts/pages/actions.
- Narrow dashboard navigation projections.
- Align the Vercel function region with MongoDB Atlas.
- Add timeouts and route-specific durations.

### Phase 3: introduce safe caching

- Move appearance cookies out of the root layout.
- Make login/public shells static.
- Audit the 18 `force-dynamic` declarations.
- Enable Cache Components in a test branch.
- Cache only shared reference data with cache-life profiles and tags.
- Replace broad path invalidations with specific tags/local updates.

### Phase 4: reduce build and transfer usage

- Fix all production build failures before deployment.
- Isolate PDF, editor, chart, avatar, spreadsheet, and DnD packages.
- Split large action modules and remove local filesystem code.
- Complete UploadThing/object-storage migration.
- Tighten image patterns, formats, dimensions, and responsive sizes.
- Configure ignored builds for non-production changes.

## 17. Acceptance checklist

- [ ] Idle dashboards generate no 15-second polling traffic.
- [ ] Hidden/offline chat tabs generate no polling traffic.
- [ ] Active chat no longer calls a Vercel action every three seconds.
- [ ] Chat participant/timestamp queries use indexes.
- [ ] Unread state does not scan messages with a negative array predicate.
- [ ] Authentication/user roles are fetched once per request path.
- [ ] `/login` is served without a page-render function invocation.
- [ ] No private response uses public CDN cache headers.
- [ ] Shared reference data uses narrow cache tags and targeted invalidation.
- [ ] `revalidatePath("/", "layout")` is absent from chat read receipts.
- [ ] Dashboard navigation queries return only displayed fields and counts.
- [ ] Vercel function region matches the MongoDB primary region.
- [ ] No durable data depends on the Vercel local filesystem.
- [ ] No stored URLs depend on `/api/files/*` before that route is removed.
- [ ] Heavy feature libraries load only on the routes/interactions that need them.
- [ ] `npm run build` passes before Vercel deploys.
- [ ] Documentation-only commits are ignored by the Vercel build step.
- [ ] Spend warnings, signed webhooks, ownership, and manual recovery are tested.
- [ ] Vercel Usage and MongoDB metrics show the expected reduction after rollout.

## 18. Recommendations from the supplied guide that should not be applied blindly

| Guide recommendation | Decision for this app |
| --- | --- |
| Cache everything with CDN/SWR | Apply only to public/shared data. Never publicly cache private school records. |
| Use ISR for large public catalogs | Useful only if public content is introduced; not a replacement for authenticated dashboard rendering. |
| Enable PPR/Cache Components | Adopt incrementally after isolating request APIs and removing redundant force-dynamic declarations. |
| Move functions to Edge | Keep Prisma/MongoDB and Node-dependent work on Node serverless; use Edge only for lightweight compatible logic. |
| Enable standalone output | Useful for self-hosted containers; not a default Vercel cost optimization. |
| Increase function size limits | First prune/split dependencies. Do not enable Large Functions without measured need. |
| Add cron warmers | Skip unless measured cold-start latency violates an explicit SLA. |
| Use Turborepo Remote Cache | Revisit only if this becomes a genuine monorepo. |
| Use a larger build machine | Current evidence favors default/Elastic, not Enhanced/Turbo. |
| Add analytics and Speed Insights | Keep disabled unless needed; sample/filter if introduced. |
| Configure AI Gateway key budgets | Not applicable until AI features exist; mandatory before such a feature launches. |
| Use cache deletion to guarantee freshness | Prefer stale marking/background invalidation; deletion can create origin stampedes. |

## Repository evidence used for this guide

- Root dynamic cookie read: `app/layout.tsx:43`.
- Image and package-import configuration: `next.config.ts:23-38`.
- Per-JWT user lookup: `auth.ts:63-65`.
- Shared dashboard database fan-out: `app/(dashboard)/layout.tsx:26-38`.
- Global 15-second unread poll: `components/chat/chat-notification-provider.tsx:82-127`.
- Active three-second message poll: `components/chat/chat-window.tsx:91-124`.
- Broad read-receipt invalidation: `app/actions/chat.ts:238`.
- Chat query implementation: `app/actions/chat.ts:12-170`.
- Missing chat indexes around the conversation/message models: `prisma/schema.prisma:585-611`.
- Ephemeral local-file delivery: `app/api/files/[...path]/route.ts:2-60`.
- Local filesystem cleanup imports: `lib/actions/student.actions.ts:7`, `lib/actions/material.actions.ts:7`, `lib/actions/quiz.actions.ts:6`, and `lib/actions/user.actions.ts:8`.
- Heavy dependency inventory: `package.json` and the route/component imports listed in this guide.
- Recorded build failures: `build-log.txt` and `build_error.log`.

