const { getSql } = require("../../lib/db");
const { ensureSchema } = require("../../lib/schema");
const {
  hashPassword,
  createSession,
  sessionCookie,
  readJson,
  json,
  errorMessage,
} = require("../../lib/auth");
const { sendWelcomeEmail } = require("../../lib/mail");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const confirm = String(body.confirm || body.password_confirmation || "");
    const name = String(body.name || "").trim();
    const country = String(body.country || "").trim();
    const phone = String(body.phone || "").trim();
    const city = String(body.city || "").trim();
    const experience = String(body.experience || "").trim();
    const platform = String(body.platform || "").trim();
    const referral = String(body.referral || "").trim();

    if (!email || !password || !name) {
      json(res, 400, { ok: false, error: "Name, email, and password are required" });
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

    const existing = await sql`SELECT id FROM users WHERE lower(email) = ${email} LIMIT 1`;
    if (existing.length) {
      json(res, 409, { ok: false, error: "Email already registered" });
      return;
    }

    const passwordHash = hashPassword(password);
    const rows = await sql`
      INSERT INTO users (email, password_hash, password_plain, name, country, phone, city, experience, platform, referral)
      VALUES (${email}, ${passwordHash}, ${password}, ${name}, ${country || null}, ${phone || null}, ${city || null}, ${experience || null}, ${platform || null}, ${referral || null})
      RETURNING id, email, name, country, phone, city, experience, platform, referral, role
    `;

    const user = rows[0];
    const token = await createSession(sql, user.id);
    res.setHeader("Set-Cookie", sessionCookie(token));

    let welcomeEmail = { sent: false, skipped: true };
    try {
      welcomeEmail = await sendWelcomeEmail({
        name: user.name,
        email: user.email,
        req,
      });
    } catch (mailErr) {
      console.warn("welcome email failed", mailErr.message || mailErr);
      welcomeEmail = { sent: false, skipped: false, error: mailErr.message || "send failed" };
    }

    json(res, 201, {
      ok: true,
      redirect: "/portal/index.html",
      welcomeEmail,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name,
        country: user.country || "",
        phone: user.phone || "",
        city: user.city || "",
        experience: user.experience || "",
        platform: user.platform || "",
        referral: user.referral || "",
        role: user.role || "user",
      },
    });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Registration failed") });
  }
};
