# JALMS

Learning management system built with Next.js and PocketBase. The legacy
Prisma/MongoDB shape is kept behind the compatibility adapter while the local
MongoDB dataset is migrated into PocketBase.

## Development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` first. Set `DEMO_PASSWORD` before running
the demo seed; seed and reset utilities intentionally do not contain a
hardcoded password.

## Realistic demo data

Populate the configured database with a focused, late-semester demo and then
verify all important data surfaces:

```bash
npm run db:seed
npm run db:seed:verify
```

The scenario is centered on Bu Maya, a Biology and homeroom teacher, and Raka,
one of her students. Supporting classmates and subject teachers make the class,
schedule, gradebook, and student workload realistic. Dates move with the day the
seed is run, so the active semester always appears roughly 75% complete.

| Role | Email | Password |
| --- | --- | --- |
| Teacher + homeroom teacher (Bu Maya) | `guru@demo.jalms.id` | `Demo@123` |
| Student (Raka) | `siswa@demo.jalms.id` | `Demo@123` |
| Admin | `admin@demo.jalms.id` | `Demo@123` |

> [!WARNING]
> `npm run db:seed` replaces existing application data in the configured
> database. Use it only with a local demo/development database.

## PocketBase migration from local MongoDB

The migration source is read-only:
`mongodb://localhost:27017/jalms`. MongoDB is never reset or deleted. Set the
PocketBase superuser credentials and a local `PB_MIGRATION_PASSWORD` in a local
`.env` file (copy `.env.example`)
and start PocketBase from the sibling `jalms-pocketbase` directory:

```powershell
..\jalms-pocketbase\pocketbase.exe serve --http=127.0.0.1:8090 `
  --dir ..\jalms-pocketbase\pb_data `
  --hooksDir ..\jalms-pocketbase\pb_hooks `
  --migrationsDir ..\jalms-pocketbase\pb_migrations
```

Then run the migration workflow:

```bash
npm run pb:migrate:dry
npm run pb:migrate
npm run pb:migrate:verify
```

`npm run pb:seed` is an alias for the same idempotent MongoDB-backed import;
it does not create a second dummy dataset. Each PocketBase record retains its
MongoDB `_id` in `legacyId`, and the importer writes
`migration-report.json` with source/target counts, relation failures, and file
errors. Re-running the command updates records by `legacyId` without touching
the MongoDB source.

The documented demo accounts remain available after migration:

| Role | Email | Password |
| --- | --- | --- |
| Teacher + homeroom teacher | `guru@demo.jalms.id` | `Demo@123` |
| Student | `siswa@demo.jalms.id` | `Demo@123` |
| Admin | `admin@demo.jalms.id` | `Demo@123` |

The application uses PocketBase Auth, native PocketBase file uploads, and
PocketBase `subscribe` realtime streams for course/direct chat while keeping
the existing component interfaces and routes.

## Other useful commands

```bash
npm run build
npm run start
npm run db:reset
npm test
```
