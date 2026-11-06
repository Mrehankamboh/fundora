const { getSql } = require("../../lib/db");
const { ensureSchema } = require("../../lib/schema");
const {
  createSession,
  sessionCookie,
  parseCookies,
  json,
  errorMessage,
} = require("../../lib/auth");
const { sendWelcomeEmail } = require("../../lib/mail");
const {
  STATE_COOKIE,
  hasGoogleAuth,
  clearStateCookie,
  exchangeCode,
  fetchGoogleProfile,
  redirect,
  parseQuery,
} = require("../../lib/google");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    json(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    if (!hasGoogleAuth()) {
      redirect(res, "/login.html?google=error");
      return;
    }

    const query = parseQuery(req);
    if (query.error) {
      redirect(res, "/login.html?google=denied");
      return;
    }

    const code = String(query.code || "");
    const state = String(query.state || "");
    const cookies = parseCookies(req);
    const expected = cookies[STATE_COOKIE] || "";

    if (!code || !state || !expected || state !== expected) {
      redirect(res, "/login.html?google=invalid", clearStateCookie());
      return;
    }

    const tokens = await exchangeCode(req, code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    if (!profile.googleId || !profile.email) {
      redirect(res, "/login.html?google=profile", clearStateCookie());
      return;
    }

    const sql = getSql();
    await ensureSchema(sql);

    let rows = await sql`
      SELECT id, email, name, google_id, blocked
      FROM users
      WHERE google_id = ${profile.googleId}
         OR lower(email) = ${profile.email}
      LIMIT 1
    `;

    let user = rows[0];
    let isNew = false;

    if (user && user.blocked) {
      redirect(res, "/login.html?google=blocked", clearStateCookie());
      return;
    }

    if (!user) {
      isNew = true;
      rows = await sql`
        INSERT INTO users (email, password_hash, name, google_id)
        VALUES (${profile.email}, NULL, ${profile.name}, ${profile.googleId})
        RETURNING id, email, name, google_id
      `;
      user = rows[0];
    } else if (!user.google_id) {
      await sql`
        UPDATE users
        SET google_id = ${profile.googleId}
        WHERE id = ${user.id}
      `;
      if (!user.name && profile.name) {
        await sql`UPDATE users SET name = ${profile.name} WHERE id = ${user.id}`;
      }
    }

    if (isNew) {
      try {
        await sendWelcomeEmail({
          name: user.name || profile.name,
          email: user.email || profile.email,
          viaGoogle: true,
          req,
        });
      } catch (mailErr) {
        console.warn("welcome email failed", mailErr.message || mailErr);
      }
    }

    const token = await createSession(sql, user.id);
    redirect(res, "/portal/index.html", [
      sessionCookie(token),
      clearStateCookie(),
    ]);
  } catch (err) {
    const msg = errorMessage(err, "Google login failed");
    console.error("google callback", msg);
    const lower = msg.toLowerCase();
    let code = "error";
    if (lower.includes("client secret") || lower.includes("invalid_client")) {
      code = "secret";
    } else if (lower.includes("redirect_uri")) {
      code = "redirect";
    }
    redirect(res, `/login.html?google=${code}`, clearStateCookie());
  }
};
