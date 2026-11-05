const crypto = require("crypto");
const { getSql } = require("../../lib/db");
const { ensureSchema } = require("../../lib/schema");
const { readJson, json, errorMessage } = require("../../lib/auth");
const { hasMailer, sendPasswordResetEmail, mailConfigError } = require("../../lib/mail");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    if (!hasMailer()) {
      json(res, 503, {
        ok: false,
        error: "Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local.",
      });
      return;
    }

    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      json(res, 400, { ok: false, error: "Please enter a valid email" });
      return;
    }

    const sql = getSql();
    await ensureSchema(sql);
    const rows = await sql`SELECT id, name, email FROM users WHERE lower(email) = ${email} LIMIT 1`;

    if (!rows.length) {
      json(res, 200, {
        ok: true,
        message: "If that email exists, a reset link has been sent.",
      });
      return;
    }

    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    await sql`DELETE FROM password_resets WHERE user_id = ${user.id}`;
    await sql`
      INSERT INTO password_resets (token, user_id, expires_at)
      VALUES (${token}, ${user.id}, now() + interval '1 hour')
    `;

    await sendPasswordResetEmail({
      name: String(user.name || ""),
      email: String(user.email || email),
      token,
      req,
    });

    json(res, 200, {
      ok: true,
      message: "Check your Gmail for the password reset link.",
    });
  } catch (err) {
    json(res, 500, {
      ok: false,
      error: mailConfigError(err) || errorMessage(err, "Could not send reset email"),
    });
  }
};
