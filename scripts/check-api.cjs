/**
 * Build/check: load env, ensure schema, ping DB.
 */
const fs = require("fs");
const path = require("path");

function loadEnvFile(file) {
  try {
    const text = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (_) {}
}

loadEnvFile(".env.local");
loadEnvFile(".env");

(async () => {
  const { getSql } = require("../lib/db");
  const { ensureSchema } = require("../lib/schema");
  const sql = getSql();
  await ensureSchema(sql);
  const rows = await sql`SELECT count(*)::int AS n FROM challenge_prices`;
  console.log("build ok: schema ready, challenge_prices=", rows[0].n);
})().catch((err) => {
  console.error("build failed:", err.message || err);
  process.exit(1);
});
