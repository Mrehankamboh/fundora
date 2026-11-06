const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { userFromRequest, readJson, json, errorMessage } = require("../lib/auth");
const {
  appOrigin,
  stripeConfigured,
  cryptoConfig,
  resolveFee,
  normalizeAccountSize,
  mapOrder,
  createStripeCheckoutSession,
} = require("../lib/checkout");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
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

    const body = await readJson(req);
    const evaluationType = String(body.evaluationType || body.type || "1-step").trim();
    const platform = String(body.platform || "MetaTrader 5").trim() || "MetaTrader 5";
    const paymentMethod = String(body.paymentMethod || body.method || "card")
      .trim()
      .toLowerCase();
    const accountSize = normalizeAccountSize(
      body.accountSize != null ? body.accountSize : body.size
    );

    if (!accountSize) {
      json(res, 400, { ok: false, error: "Select an account size" });
      return;
    }
    if (!["card", "crypto", "demo"].includes(paymentMethod)) {
      json(res, 400, { ok: false, error: "Choose a payment method" });
      return;
    }

    const { challengeName, fee } = await resolveFee(
      sql,
      evaluationType,
      accountSize,
      body.fee
    );
    if (!fee || fee <= 0) {
      json(res, 400, { ok: false, error: "Price not available for this size" });
      return;
    }

    const inserted = await sql`
      INSERT INTO challenge_orders (
        user_id, evaluation_type, account_size, platform, fee, payment_method, status
      )
      VALUES (
        ${user.id}, ${challengeName}, ${accountSize}, ${platform}, ${fee}, ${paymentMethod}, 'pending'
      )
      RETURNING *
    `;
    const order = inserted[0];
    const origin = appOrigin(req);
    const crypto = cryptoConfig();
    const stripeReady = stripeConfigured();

    if (paymentMethod === "card" && stripeReady) {
      try {
        const session = await createStripeCheckoutSession({ order, user, origin });
        await sql`
          UPDATE challenge_orders
          SET stripe_session_id = ${session.id}
          WHERE id = ${order.id}
        `;
        json(res, 201, {
          ok: true,
          mode: "stripe",
          checkoutUrl: session.url,
          order: mapOrder({ ...order, stripe_session_id: session.id }),
          stripeConfigured: true,
        });
        return;
      } catch (stripeErr) {
        console.warn("stripe checkout failed", stripeErr.message || stripeErr);
        json(res, 502, {
          ok: false,
          error: stripeErr.message || "Card checkout unavailable",
          order: mapOrder(order),
          stripeConfigured: true,
        });
        return;
      }
    }

    json(res, 201, {
      ok: true,
      mode: paymentMethod === "crypto" ? "crypto" : stripeReady ? "card" : "demo",
      order: mapOrder(order),
      stripeConfigured: stripeReady,
      crypto:
        paymentMethod === "crypto"
          ? {
              network: crypto.network,
              usdtAddress: crypto.usdtAddress || null,
              amountUsd: fee,
              note: crypto.usdtAddress
                ? `Send exactly $${fee.toFixed(2)} USDT (${crypto.network}) then confirm below.`
                : "Crypto address not configured yet — use Demo pay for local testing.",
            }
          : null,
      checkoutPath: `/portal/checkout.html?order=${order.id}`,
    });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Checkout create failed") });
  }
};
