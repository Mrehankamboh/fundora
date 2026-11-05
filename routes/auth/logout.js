const { getSql } = require("../../lib/db");
const {
  parseCookies,
  COOKIE,
  destroySession,
  clearSessionCookie,
  json,
  errorMessage,
} = require("../../lib/auth");

module.exports = async function handler(req, res) {
  try {
    const sql = getSql();
    const cookies = parseCookies(req);
    await destroySession(sql, cookies[COOKIE]);
    res.setHeader("Set-Cookie", clearSessionCookie());
    json(res, 200, { ok: true, redirect: "/login.html" });
  } catch (err) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    json(res, 200, { ok: true, redirect: "/login.html", warning: errorMessage(err) });
  }
};
