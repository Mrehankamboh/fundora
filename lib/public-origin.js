const { lanOrigin } = require("./lan");

function requestOrigin(req) {
  if (!req || !req.headers) return "";
  const proto = String(
    req.headers["x-forwarded-proto"] || (process.env.VERCEL ? "https" : "http")
  )
    .split(",")[0]
    .trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  if (!host) return "";
  return `${proto}://${host}`.replace(/\/$/, "");
}

/** Phone QR and copyable link. On Vercel this is the public site. Locally it is the LAN address. */
function publicOrigin(req) {
  if (process.env.VERCEL) {
    return (
      requestOrigin(req) ||
      String(process.env.APP_ORIGIN || "").replace(/\/$/, "") ||
      ""
    );
  }
  const port = Number(process.env.PORT || 5173);
  return lanOrigin(port) || requestOrigin(req) || `http://127.0.0.1:${port}`;
}

module.exports = { requestOrigin, publicOrigin };
