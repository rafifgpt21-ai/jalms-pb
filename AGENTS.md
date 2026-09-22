# AGENTS.md

## Project layout

- `jalms-codebase/` — Next.js application, Prisma schema, seed scripts, and PocketBase client/server integration.
- `jalms-pocketbase/` — PocketBase migrations and hooks. The local `pb_data/` directory and PocketBase binary are not repository files.
- `scripts/` — Repository-level checks, including the secret scanner.

## Development workflow

Run application commands from `jalms-codebase/`:

```powershell
npm install
npm test
npx tsc --noEmit
npm run build
```

Before committing, run this from the repository root:

```powershell
node scripts/security-scan.mjs
```

The pre-commit hook and GitHub Actions workflow run the same scan automatically.

## Security rules

- Never commit `.env.local`, credentials, tokens, private keys, database files, `pb_data/`, uploads, logs, migration reports, or generated runtime data.
- Keep secrets in local environment variables. Use `jalms-codebase/.env.example` only as a list of required variable names.
- Do not use `git add -f` to bypass `.gitignore`.
- Do not print or dump user records, passwords, auth tokens, or database contents in committed utilities.
- Seed and reset scripts must receive passwords through environment variables; do not add hardcoded credentials.
- Treat all existing local data as potentially sensitive, even if it is only used for development.

## Change guidelines

- Preserve unrelated user changes and avoid destructive database commands unless explicitly requested.
- Prefer focused changes that keep the current Next.js/PocketBase architecture intact.
- Update documentation when adding required environment variables or changing setup behavior.
- Run the secret scan and relevant tests after changes.
