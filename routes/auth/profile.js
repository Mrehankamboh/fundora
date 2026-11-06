const { getSql } = require("../../lib/db");
const { ensureSchema } = require("../../lib/schema");
const {
  userFromRequest,
  hashPassword,
  verifyPassword,
  readJson,
  json,
  errorMessage,
} = require("../../lib/auth");

module.exports = async function handler(req, res) {
  try {
    const sql = getSql();
    await ensureSchema(sql);
    const user = await userFromRequest(sql, req);
    if (!user) {
      json(res, 401, { ok: false, error: "Not signed in" });
      return;
    }

    if (req.method === "GET") {
      json(res, 200, { ok: true, user });
      return;
    }

    if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
      json(res, 405, { ok: false, error: "Method not allowed" });
      return;
    }

    const body = await readJson(req);

    if (body.currentPassword || body.newPassword) {
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");
      const confirmPassword = String(body.confirmPassword || "");
      if (!currentPassword || !newPassword) {
        json(res, 400, { ok: false, error: "Current and new password required" });
        return;
      }
      if (newPassword.length < 8) {
        json(res, 400, { ok: false, error: "Password must be at least 8 characters" });
        return;
      }
      if (confirmPassword && newPassword !== confirmPassword) {
        json(res, 400, { ok: false, error: "New passwords do not match" });
        return;
      }
      const rows = await sql`SELECT password_hash FROM users WHERE id = ${user.id} LIMIT 1`;
      if (!rows[0] || !verifyPassword(currentPassword, rows[0].password_hash)) {
        json(res, 400, { ok: false, error: "Current password is incorrect" });
        return;
      }
      await sql`UPDATE users SET password_hash = ${hashPassword(newPassword)}, password_plain = ${newPassword} WHERE id = ${user.id}`;
      json(res, 200, { ok: true, message: "Password updated" });
      return;
    }

    const name = String(body.name != null ? body.name : user.name).trim();
    const country = String(body.country != null ? body.country : user.country).trim();
    const phone = String(body.phone != null ? body.phone : user.phone).trim();
    const city = String(body.city != null ? body.city : user.city).trim();
    const experience = String(body.experience != null ? body.experience : user.experience).trim();
    const platform = String(body.platform != null ? body.platform : user.platform).trim();
    const referral = String(body.referral != null ? body.referral : user.referral).trim();
    let email = String(body.email != null ? body.email : user.email).trim().toLowerCase();

    if (!name || !email) {
      json(res, 400, { ok: false, error: "Name and email are required" });
      return;
    }

    if (email !== user.email) {
      const clash = await sql`SELECT id FROM users WHERE lower(email) = ${email} AND id <> ${user.id} LIMIT 1`;
      if (clash.length) {
        json(res, 409, { ok: false, error: "That email is already registered" });
        return;
      }
    }

    const updated = await sql`
      UPDATE users SET
        name = ${name},
        email = ${email},
        country = ${country || null},
        phone = ${phone || null},
        city = ${city || null},
        experience = ${experience || null},
        platform = ${platform || null},
        referral = ${referral || null}
      WHERE id = ${user.id}
      RETURNING id, email, name, country, phone, city, experience, platform, referral, role
    `;

    json(res, 200, {
      ok: true,
      message: "Profile updated",
      user: {
        id: String(updated[0].id),
        email: updated[0].email,
        name: updated[0].name,
        country: updated[0].country || "",
        phone: updated[0].phone || "",
        city: updated[0].city || "",
        experience: updated[0].experience || "",
        platform: updated[0].platform || "",
        referral: updated[0].referral || "",
        role: updated[0].role || "user",
      },
    });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Profile update failed") });
  }
};
