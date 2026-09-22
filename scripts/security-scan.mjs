import { execFileSync } from "node:child_process"
import { readFileSync, statSync } from "node:fs"
import path from "node:path"

const root = process.cwd()

function gitFiles() {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: root,
    encoding: "utf8",
  })
  return output.split("\0").filter(Boolean)
}

const rules = [
  { name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/i },
  { name: "AWS access key", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { name: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "Stripe live/test key", pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { name: "credentialed database URL", pattern: /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql):\/\/[^\s"'`]+:[^\s"'`]+@/i },
  {
    name: "hardcoded secret assignment",
    pattern: /\b[A-Z0-9]*(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY)[A-Z0-9]*\b\s*[:=]\s*["'`]([^"'`\r\n]{8,})["'`]/i,
  },
]

const placeholder = /^(?:$|change[-_ ]?me|replace[-_ ]?me|your[-_ ]|example|dummy|placeholder|<[^>]+>)$/i
const ignoredExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".xlsx", ".xls", ".zip", ".gz", ".exe", ".dll", ".node"])
const findings = []

for (const relative of gitFiles()) {
  const absolute = path.join(root, relative)
  let stat
  try { stat = statSync(absolute) } catch { continue }
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024 || ignoredExtensions.has(path.extname(relative).toLowerCase())) continue

  let content
  try { content = readFileSync(absolute, "utf8") } catch { continue }
  if (content.includes("\0")) continue

  const lines = content.split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const rule of rules) {
      const match = rule.pattern.exec(line)
      if (!match) continue
      if (rule.name === "hardcoded secret assignment" && placeholder.test(match[1].trim())) continue
      findings.push(`${relative}:${index + 1} — ${rule.name}`)
      break
    }
  })
}

if (findings.length) {
  console.error("Secret scan failed. Review these files before committing:")
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`Secret scan passed (${gitFiles().length} Git-visible files checked).`)
