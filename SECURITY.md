# Security notes

Do not commit credentials, tokens, private keys, local databases, uploads, or
logs. Keep local values in `jalms-codebase/.env.local`; the committed
`.env.example` contains names and safe defaults only.

The repository includes a secret scan at `scripts/security-scan.mjs`. It checks
the files Git would include, including files force-added with `git add -f`.
The configured Git hook and GitHub Actions workflow run this scan before code is
accepted.

If a real credential has ever been committed or exposed, revoke and rotate it
at its provider before pushing the repository.
