const {
  hasGoogleAuth,
  createState,
  stateCookie,
  buildGoogleAuthUrl,
  redirect,
} = require("../../lib/google");
const { json } = require("../../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    json(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  if (!hasGoogleAuth()) {
    const accept = String(req.headers.accept || "");
    if (accept.includes("text/html") || !accept.includes("application/json")) {
      redirect(res, "/login.html?google=config");
      return;
    }
    json(res, 503, {
      ok: false,
      error:
        "Google login is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    });
    return;
  }

  const state = createState();
  redirect(res, buildGoogleAuthUrl(req, state), stateCookie(state));
};
