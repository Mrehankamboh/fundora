const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { userFromRequest, readJson, json, errorMessage } = require("../lib/auth");

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
        SELECT id, amount, method, notes, status, created_at
        FROM rewards WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `;
      json(res, 200, {
        ok: true,
        rewards: rows.map((r) => ({
          id: String(r.id),
          amount: Number(r.amount),
          method: String(r.method),
          notes: r.notes ? String(r.notes) : "",
          status: String(r.status),
          createdAt: r.created_at,
        })),
      });
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const amount = Number(body.amount);
      const method = String(body.method || "Rise").trim() || "Rise";
      const notes = String(body.notes || "").trim();
      if (!Number.isFinite(amount) || amount <= 0) {
        json(res, 400, { ok: false, error: "Enter a valid amount" });
        return;
      }
      const inserted = await sql`
        INSERT INTO rewards (user_id, amount, method, notes, status)
        VALUES (${user.id}, ${amount}, ${method}, ${notes || null}, 'pending')
        RETURNING id, amount, method, notes, status, created_at
      `;
      const r = inserted[0];
      json(res, 201, {
        ok: true,
        reward: {
          id: String(r.id),
          amount: Number(r.amount),
          method: String(r.method),
          notes: r.notes ? String(r.notes) : "",
          status: String(r.status),
          createdAt: r.created_at,
        },
      });
      return;
    }

    json(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Rewards request failed") });
  }
};
