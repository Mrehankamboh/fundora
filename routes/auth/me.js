const { getSql } = require("../../lib/db");
const { ensureSchema } = require("../../lib/schema");
const { userFromRequest, json, errorMessage } = require("../../lib/auth");

module.exports = async function handler(req, res) {
  try {
    const sql = getSql();
    await ensureSchema(sql);
    const user = await userFromRequest(sql, req);
    if (!user) {
      json(res, 401, { ok: false, error: "Not signed in" });
      return;
    }
    json(res, 200, { ok: true, user });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Session check failed") });
  }
};
