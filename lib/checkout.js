const { planToChallengeName } = require("./catalog");
const { sendChallengePurchaseEmail } = require("./mail");

function appOrigin(req) {
  const fromEnv = String(process.env.APP_ORIGIN || "").replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const host = req.headers["x-forwarded-host"] || req.headers.host || "127.0.0.1:5173";
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${host}`;
}

function stripeConfigured() {
  return Boolean(String(process.env.STRIPE_SECRET_KEY || "").trim());
}

function cryptoConfig() {
  return {
    usdtAddress: String(process.env.CRYPTO_USDT_ADDRESS || "").trim(),
    network: String(process.env.CRYPTO_USDT_NETWORK || "TRC20").trim() || "TRC20",
  };
}

async function resolveFee(sql, evaluationType, accountSize, fallbackFee) {
  const challengeName = planToChallengeName(evaluationType);
  const priced = await sql`
    SELECT price FROM challenge_prices
    WHERE challenge_name = ${challengeName} AND account_size = ${accountSize}
    LIMIT 1
  `;
  if (priced[0]) return { challengeName, fee: Number(priced[0].price) };
  return { challengeName, fee: Number(fallbackFee) || 0 };
}

function normalizeAccountSize(raw) {
  let accountSize = Number(raw);
  if (!Number.isFinite(accountSize) || accountSize <= 0) return null;
  if (accountSize > 0 && accountSize < 1000) accountSize *= 1000;
  return accountSize;
}

function mapOrder(row) {
  return {
    id: String(row.id),
    evaluationType: String(row.evaluation_type),
    accountSize: Number(row.account_size),
    platform: String(row.platform),
    fee: Number(row.fee),
    paymentMethod: String(row.payment_method),
    status: String(row.status),
    stripeSessionId: row.stripe_session_id ? String(row.stripe_session_id) : null,
    challengeId: row.challenge_id ? String(row.challenge_id) : null,
    createdAt: row.created_at,
    paidAt: row.paid_at || null,
  };
}

async function fulfillPaidOrder(sql, order, user, req) {
  if (order.challenge_id) {
    const existing = await sql`
      SELECT id, evaluation_type, account_size, platform, fee, status, created_at
      FROM challenges WHERE id = ${order.challenge_id} LIMIT 1
    `;
    return { challenge: existing[0], already: true, purchaseEmail: { sent: false, skipped: true } };
  }

  const inserted = await sql`
    INSERT INTO challenges (user_id, evaluation_type, account_size, platform, fee, status)
    VALUES (
      ${order.user_id},
      ${order.evaluation_type},
      ${order.account_size},
      ${order.platform},
      ${order.fee},
      'active'
    )
    RETURNING id, evaluation_type, account_size, platform, fee, status, created_at
  `;
  const challenge = inserted[0];

  await sql`
    UPDATE challenge_orders
    SET status = 'paid',
        challenge_id = ${challenge.id},
        paid_at = COALESCE(paid_at, now())
    WHERE id = ${order.id}
  `;

  let purchaseEmail = { sent: false, skipped: true };
  try {
    purchaseEmail = await sendChallengePurchaseEmail({
      name: user.name,
      email: user.email,
      evaluationType: String(challenge.evaluation_type),
      accountSize: Number(challenge.account_size),
      platform: String(challenge.platform),
      fee: Number(challenge.fee),
      req,
    });
  } catch (mailErr) {
    console.warn("challenge email failed", mailErr.message || mailErr);
    purchaseEmail = { sent: false, skipped: false, error: mailErr.message || "send failed" };
  }

  return { challenge, already: false, purchaseEmail };
}

async function createStripeCheckoutSession({ order, user, origin }) {
  const secret = String(process.env.STRIPE_SECRET_KEY || "").trim();
  const amountCents = Math.round(Number(order.fee) * 100);
  if (!secret) throw new Error("Stripe is not configured");
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    throw new Error("Fee too low for card checkout");
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${origin}/portal/checkout.html?success=1&order=${order.id}&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${origin}/portal/checkout.html?canceled=1&order=${order.id}`);
  params.set("client_reference_id", String(order.id));
  params.set("customer_email", String(user.email || ""));
  params.set("metadata[order_id]", String(order.id));
  params.set("metadata[user_id]", String(order.user_id));
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(amountCents));
  params.set(
    "line_items[0][price_data][product_data][name]",
    `Fundora ${order.evaluation_type} · $${Number(order.account_size).toLocaleString()} Challenge`
  );
  params.set(
    "line_items[0][price_data][product_data][description]",
    `${order.platform} evaluation account`
  );

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Stripe session failed");
  }
  return data;
}

async function retrieveStripeSession(sessionId) {
  const secret = String(process.env.STRIPE_SECRET_KEY || "").trim();
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Could not verify Stripe session");
  return data;
}

module.exports = {
  appOrigin,
  stripeConfigured,
  cryptoConfig,
  resolveFee,
  normalizeAccountSize,
  mapOrder,
  fulfillPaidOrder,
  createStripeCheckoutSession,
  retrieveStripeSession,
};
