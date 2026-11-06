const { getSql } = require("../../lib/db");
const { ensureSchema } = require("../../lib/schema");
const { hashPassword, readJson, json, errorMessage } = require("../../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJson(req);
    const token = String(body.token || "").trim();
    const password = String(body.password || "");
    const confirm = String(body.confirm || body.password_confirmation || "");

    if (!token || !password) {
      json(res, 400, { ok: false, error: "Token and new password required" });
      return;
    }
    if (password.length < 8) {
      json(res, 400, { ok: false, error: "Password must be at least 8 characters" });
      return;
    }
    if (confirm && password !== confirm) {
      json(res, 400, { ok: false, error: "Passwords do not match" });
      return;
    }

    const sql = getSql();
    await ensureSchema(sql);
    const rows = await sql`
      SELECT user_id FROM password_resets
      WHERE token = ${token} AND expires_at > now()
      LIMIT 1
    `;
    if (!rows.length) {
      json(res, 400, { ok: false, error: "Reset link is invalid or expired" });
      return;
    }

    const passwordHash = hashPassword(password);
    await sql`UPDATE users SET password_hash = ${passwordHash}, password_plain = ${password} WHERE id = ${rows[0].user_id}`;
    await sql`DELETE FROM password_resets WHERE token = ${token}`;
    json(res, 200, { ok: true, message: "Password updated. You can sign in now.", redirect: "/login.html" });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Reset failed") });
  }
};
