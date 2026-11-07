const crypto = require("crypto");

const STATE_COOKIE = "fundora_google_oauth";

function googleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || "").trim();
}

function googleClientSecret() {
  return String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
}

function hasGoogleAuth() {
  return Boolean(googleClientId() && googleClientSecret());
}

function requestOrigin(req) {
  if (req && req.headers) {
    const proto = String(req.headers["x-forwarded-proto"] || "http")
      .split(",")[0]
      .trim();
    const host = String(
      req.headers["x-forwarded-host"] || req.headers.host || ""
    )
      .split(",")[0]
      .trim();
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  }
  return "";
}

/** Must match the Authorized redirect URI in Google Cloud (APP_ORIGIN). */
function oauthOrigin() {
  return String(process.env.APP_ORIGIN || "http://localhost:5173").replace(
    /\/$/,
    ""
  );
}

function callbackUrl() {
  return `${oauthOrigin()}/api/auth/google/callback`;
}

function stateCookie(value, maxAgeSec = 600) {
  const secure =
    process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${STATE_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

function clearStateCookie() {
  const secure =
    process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function createState() {
  return crypto.randomBytes(24).toString("hex");
}

function buildGoogleAuthUrl(_req, state) {
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCode(_req, code) {
  const body = new URLSearchParams({
    code,
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    redirect_uri: callbackUrl(),
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Google token exchange failed"
    );
  }
  return data;
}

async function fetchGoogleProfile(accessToken) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok || !data.email) {
    throw new Error(
      data.error_description || data.error || "Could not load Google profile"
    );
  }
  const given = String(data.given_name || "").trim();
  const family = String(data.family_name || "").trim();
  const full = String(data.name || "").trim();
  const name =
    [given, family].filter(Boolean).join(" ") || full || "Trader";
  return {
    googleId: String(data.sub || ""),
    email: String(data.email || "")
      .trim()
      .toLowerCase(),
    emailVerified: !!data.email_verified,
    name,
    picture: data.picture ? String(data.picture) : null,
  };
}

function redirect(res, location, extraCookies) {
  const cookies = Array.isArray(extraCookies)
    ? extraCookies
    : extraCookies
      ? [extraCookies]
      : [];
  res.statusCode = 302;
  res.setHeader("Location", location);
  if (cookies.length === 1) res.setHeader("Set-Cookie", cookies[0]);
  else if (cookies.length > 1) res.setHeader("Set-Cookie", cookies);
  res.end();
}

function parseQuery(req) {
  try {
    const host = req.headers.host || "localhost";
    const url = new URL(req.url || "/", `http://${host}`);
    const out = {};
    url.searchParams.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  } catch (_) {
    return {};
  }
}

module.exports = {
  STATE_COOKIE,
  hasGoogleAuth,
  createState,
  stateCookie,
  clearStateCookie,
  buildGoogleAuthUrl,
  exchangeCode,
  fetchGoogleProfile,
  redirect,
  parseQuery,
  callbackUrl,
  requestOrigin,
  oauthOrigin,
};
