# JALMS

JALMS is a learning management system built with Next.js and PocketBase.

## Repository layout

- [`jalms-codebase`](./jalms-codebase) — web application, migrations and seed utilities.
- [`jalms-pocketbase`](./jalms-pocketbase) — PocketBase hooks and schema migrations.

The local PocketBase database (`pb_data`) and executable are intentionally not
part of the repository. Download a matching PocketBase release separately and
start it with the migrations and hooks in `jalms-pocketbase`.

## Local setup

1. Copy [`jalms-codebase/.env.example`](./jalms-codebase/.env.example) to `jalms-codebase/.env.local` and fill in local values.
2. Install dependencies with `npm install` from `jalms-codebase`.
3. Start PocketBase locally, then run `npm run dev` from `jalms-codebase`.

Never commit `.env.local`, `pb_data`, database files, uploads, logs, or migration
reports. Run `node scripts/security-scan.mjs` from the repository root before
creating a commit.
