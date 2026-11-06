const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { userFromRequest, json, errorMessage } = require("../lib/auth");
const { stripeConfigured, cryptoConfig, mapOrder } = require("../lib/checkout");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    json(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const sql = getSql();
    await ensureSchema(sql);
    const user = await userFromRequest(sql, req);
    if (!user) {
      json(res, 401, { ok: false, error: "Sign in to continue" });
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const orderId = String(url.searchParams.get("id") || url.searchParams.get("order") || "").trim();
    if (!orderId) {
      json(res, 400, { ok: false, error: "Missing order id" });
      return;
    }

    const rows = await sql`
      SELECT * FROM challenge_orders
      WHERE id = ${orderId} AND user_id = ${user.id}
      LIMIT 1
    `;
    if (!rows[0]) {
      json(res, 404, { ok: false, error: "Order not found" });
      return;
    }

    const crypto = cryptoConfig();
    json(res, 200, {
      ok: true,
      order: mapOrder(rows[0]),
      stripeConfigured: stripeConfigured(),
      crypto: {
        network: crypto.network,
        usdtAddress: crypto.usdtAddress || null,
      },
    });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Order lookup failed") });
  }
};
