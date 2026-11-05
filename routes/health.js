const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { json, errorMessage } = require("../lib/auth");

module.exports = async function handler(req, res) {
  try {
    const sql = getSql();
    await ensureSchema(sql);
    const rows = await sql`SELECT 1::int AS ok`;
    json(res, 200, {
      ok: true,
      db: rows[0] && rows[0].ok === 1,
      service: "fundora",
    });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Health check failed") });
  }
};
