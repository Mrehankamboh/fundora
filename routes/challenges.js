const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { userFromRequest, json, errorMessage } = require("../lib/auth");

module.exports = async function handler(req, res) {
  try {
    const sql = getSql();
    await ensureSchema(sql);
    const user = await userFromRequest(sql, req);
    if (!user) {
      json(res, 401, { ok: false, error: "Sign in to continue" });
      return;
    }

    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, evaluation_type, account_size, platform, fee, status, created_at
        FROM challenges
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `;
      json(res, 200, {
        ok: true,
        challenges: rows.map((row) => ({
          id: String(row.id),
          evaluationType: String(row.evaluation_type),
          accountSize: Number(row.account_size),
          platform: String(row.platform),
          fee: Number(row.fee),
          status: String(row.status),
          createdAt: row.created_at,
        })),
      });
      return;
    }

    if (req.method === "POST") {
      // Purchases go through /api/checkout/* so payment completes before activation.
      json(res, 400, {
        ok: false,
        error: "Use checkout to purchase a challenge",
        checkout: "/portal/checkout.html",
      });
      return;
    }

    json(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Challenges request failed") });
  }
};
