/**
 * Push local env keys to a Vercel project. Prints key names only.
 * Usage: node scripts/push-vercel-env.cjs <project> <scope> <env-file> [KEY=value ...]
 */
const { spawnSync } = require("child_process");
const fs = require("fs");

const project = process.argv[2];
const scope = process.argv[3];
const envFile = process.argv[4];
const extras = {};

for (const arg of process.argv.slice(5)) {
  const i = arg.indexOf("=");
  if (i > 0) extras[arg.slice(0, i)] = arg.slice(i + 1);
}

function parse(file) {
  const out = {};
  if (!file || !fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i < 1) continue;
    let value = s.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[s.slice(0, i).trim()] = value;
  }
  return out;
}

const fromFile = parse(envFile);
for (const key of Object.keys(fromFile)) {
  if (
    key === "PORT" ||
    key === "APP_ORIGIN" ||
    key === "NEON_BRANCH" ||
    key === "DATABASE_URL_UNPOOLED" ||
    key.startsWith("VERCEL_")
  ) {
    delete fromFile[key];
  }
}
const env = Object.assign(fromFile, extras);
const keys = Object.keys(env).filter((key) => String(env[key] || "").trim());

if (!project || !scope || !keys.length) {
  console.error("no env keys to push");
  process.exit(1);
}

for (const key of keys) {
  const value = String(env[key]);
  const command = [
    "npx",
    "--yes",
    "vercel@latest",
    "env",
    "add",
    key,
    "--environment",
    "production",
    "--yes",
    "--force",
    "--sensitive",
    "--scope",
    scope,
    "--project",
    project,
  ].join(" ");
  const result = spawnSync(command, {
    encoding: "utf8",
    shell: true,
    input: value.endsWith("\n") ? value : value + "\n",
    windowsHide: true,
  });
  const raw = `${result.stdout || ""}\n${result.stderr || ""}`;
  const safe = raw.split(value).join("[redacted]").replace(/\s+/g, " ").trim().slice(0, 500);
  const err = result.error ? result.error.code || result.error.message : "";
  console.log(`${key} exit=${result.status} signal=${result.signal || ""} err=${err} ${safe}`);
  if (result.status !== 0) process.exit(result.status || 1);
}
