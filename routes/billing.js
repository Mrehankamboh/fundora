const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { userFromRequest, json, errorMessage } = require("../lib/auth");
const { mapOrder } = require("../lib/checkout");

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

    const rows = await sql`
      SELECT * FROM challenge_orders
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const orders = rows.map(mapOrder);
    const paid = orders.filter((o) => o.status === "paid");
    const totalSpend = paid.reduce((sum, o) => sum + Number(o.fee || 0), 0);
    const last = paid[0] || null;

    json(res, 200, {
      ok: true,
      summary: {
        orders: orders.length,
        paid: paid.length,
        totalSpend,
        lastPayment: last
          ? { amount: last.fee, at: last.paidAt || last.createdAt, method: last.paymentMethod }
          : null,
        openBalance: 0,
      },
      orders,
      methods: [
        { id: "card", label: "Card (Visa / Mastercard)", available: true },
        { id: "crypto", label: "USDT crypto", available: true },
      ],
    });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Billing request failed") });
  }
};
