const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { userFromRequest, readJson, json, errorMessage } = require("../lib/auth");
const {
  stripeConfigured,
  mapOrder,
  fulfillPaidOrder,
  retrieveStripeSession,
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
    const orderId = String(body.orderId || body.order || "").trim();
    const sessionId = String(body.sessionId || body.session_id || "").trim();
    const mode = String(body.mode || body.method || "demo").trim().toLowerCase();

    let rows;
    if (sessionId) {
      rows = await sql`
        SELECT * FROM challenge_orders
        WHERE stripe_session_id = ${sessionId} AND user_id = ${user.id}
        LIMIT 1
      `;
      if (!rows[0] && orderId) {
        rows = await sql`
          SELECT * FROM challenge_orders
          WHERE id = ${orderId} AND user_id = ${user.id}
          LIMIT 1
        `;
      }
    } else if (orderId) {
      rows = await sql`
        SELECT * FROM challenge_orders
        WHERE id = ${orderId} AND user_id = ${user.id}
        LIMIT 1
      `;
    } else {
      json(res, 400, { ok: false, error: "Missing order" });
      return;
    }

    const order = rows && rows[0];
    if (!order) {
      json(res, 404, { ok: false, error: "Order not found" });
      return;
    }

    if (order.status === "paid" && order.challenge_id) {
      const challengeRows = await sql`
        SELECT id, evaluation_type, account_size, platform, fee, status, created_at
        FROM challenges WHERE id = ${order.challenge_id} LIMIT 1
      `;
      json(res, 200, {
        ok: true,
        alreadyPaid: true,
        order: mapOrder(order),
        challenge: challengeRows[0]
          ? {
              id: String(challengeRows[0].id),
              evaluationType: String(challengeRows[0].evaluation_type),
              accountSize: Number(challengeRows[0].account_size),
              platform: String(challengeRows[0].platform),
              fee: Number(challengeRows[0].fee),
              status: String(challengeRows[0].status),
              createdAt: challengeRows[0].created_at,
            }
          : null,
      });
      return;
    }

    if (sessionId || mode === "stripe" || mode === "card") {
      if (!stripeConfigured()) {
        json(res, 400, { ok: false, error: "Stripe is not configured" });
        return;
      }
      const sid = sessionId || order.stripe_session_id;
      if (!sid) {
        json(res, 400, { ok: false, error: "Missing Stripe session" });
        return;
      }
      const session = await retrieveStripeSession(sid);
      if (session.payment_status !== "paid" && session.status !== "complete") {
        json(res, 402, { ok: false, error: "Payment not completed yet" });
        return;
      }
      if (session.metadata?.order_id && session.metadata.order_id !== String(order.id)) {
        json(res, 400, { ok: false, error: "Session does not match this order" });
        return;
      }
      await sql`
        UPDATE challenge_orders
        SET stripe_session_id = ${sid}, payment_method = 'card'
        WHERE id = ${order.id}
      `;
    } else if (mode === "crypto") {
      await sql`
        UPDATE challenge_orders
        SET payment_method = 'crypto', status = 'awaiting_crypto'
        WHERE id = ${order.id}
      `;
      // For local / demo crypto confirmation without an on-chain listener
      if (String(process.env.CRYPTO_AUTO_CONFIRM || "").toLowerCase() === "true" || !stripeConfigured()) {
        // fall through to fulfill as paid (demo-friendly)
      } else {
        const updated = await sql`SELECT * FROM challenge_orders WHERE id = ${order.id} LIMIT 1`;
        json(res, 202, {
          ok: true,
          pendingReview: true,
          order: mapOrder(updated[0]),
          message: "Crypto payment marked — admin will activate after confirmation.",
        });
        return;
      }
    } else if (mode !== "demo") {
      json(res, 400, { ok: false, error: "Unknown confirm mode" });
      return;
    }

    const fresh = (
      await sql`SELECT * FROM challenge_orders WHERE id = ${order.id} LIMIT 1`
    )[0];
    const result = await fulfillPaidOrder(sql, fresh, user, req);
    const paidOrder = (
      await sql`SELECT * FROM challenge_orders WHERE id = ${order.id} LIMIT 1`
    )[0];

    json(res, 200, {
      ok: true,
      order: mapOrder(paidOrder),
      purchaseEmail: result.purchaseEmail,
      challenge: {
        id: String(result.challenge.id),
        evaluationType: String(result.challenge.evaluation_type),
        accountSize: Number(result.challenge.account_size),
        platform: String(result.challenge.platform),
        fee: Number(result.challenge.fee),
        status: String(result.challenge.status),
        createdAt: result.challenge.created_at,
      },
    });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Checkout confirm failed") });
  }
};
