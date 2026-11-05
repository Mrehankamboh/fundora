const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { ensureSchema } = require("./schema");

const COOKIE = process.env.SESSION_COOKIE || "fundora_session";

function hashPassword(password) {
  return bcrypt.hashSync(String(password), 10);
}

function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compareSync(String(password), hash);
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i === -1) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function sessionCookie(token, maxAgeSec = 60 * 60 * 24 * 30) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

async function createSession(sql, userId) {
  await ensureSchema(sql);
  const token = crypto.randomBytes(32).toString("hex");
  await sql`INSERT INTO sessions (token, user_id) VALUES (${token}, ${userId})`;
  return token;
}

async function destroySession(sql, token) {
  if (!token) return;
  await ensureSchema(sql);
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}

async function userFromRequest(sql, req) {
  await ensureSchema(sql);
  const cookies = parseCookies(req);
  const token = cookies[COOKIE];
  if (!token) return null;
  const rows = await sql`
    SELECT u.id, u.email, u.name, u.country, u.phone, u.city, u.experience, u.platform, u.referral, u.role, u.blocked, u.created_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.blocked) return null;
  return {
    id: String(row.id),
    email: String(row.email || ""),
    name: String(row.name || ""),
    country: row.country ? String(row.country) : "",
    phone: row.phone ? String(row.phone) : "",
    city: row.city ? String(row.city) : "",
    experience: row.experience ? String(row.experience) : "",
    platform: row.platform ? String(row.platform) : "",
    referral: row.referral ? String(row.referral) : "",
    role: String(row.role || "user") === "admin" ? "admin" : "user",
    created_at: row.created_at,
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function errorMessage(err, fallback) {
  const msg = err && err.message ? String(err.message) : "";
  if (/DATABASE_URL/i.test(msg)) return "Database is not configured";
  return msg || fallback || "Request failed";
}

module.exports = {
  COOKIE,
  hashPassword,
  verifyPassword,
  parseCookies,
  sessionCookie,
  clearSessionCookie,
  createSession,
  destroySession,
  userFromRequest,
  readJson,
  json,
  errorMessage,
};
