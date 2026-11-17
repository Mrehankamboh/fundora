const { json } = require("../lib/auth");
const { publicOrigin } = require("../lib/public-origin");

module.exports = function handler(req, res) {
  const origin = publicOrigin(req);
  json(res, 200, { ok: Boolean(origin), origin });
};
