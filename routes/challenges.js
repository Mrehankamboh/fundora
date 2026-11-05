const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { userFromRequest, readJson, json, errorMessage } = require("../lib/auth");
const { planToChallengeName } = require("../lib/catalog");
const { sendChallengePurchaseEmail } = require("../lib/mail");

module.exports = async function handler(req, res) {
  try {
    const sql = getSql();
    await ensureSchema(sql);
    const user = await userFromRequest(sql, req);
    if (!user) {
      json(res, 401, { ok: false, error: "Sign in to continue" });
      return;
    }

    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, evaluation_type, account_size, platform, fee, status, created_at
        FROM challenges
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `;
      json(res, 200, {
        ok: true,
        challenges: rows.map((row) => ({
          id: String(row.id),
          evaluationType: String(row.evaluation_type),
          accountSize: Number(row.account_size),
          platform: String(row.platform),
          fee: Number(row.fee),
          status: String(row.status),
          createdAt: row.created_at,
        })),
      });
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const evaluationType = String(body.evaluationType || body.type || "1-step").trim();
      const platform = String(body.platform || "MetaTrader 5").trim() || "MetaTrader 5";
      let accountSize = Number(body.accountSize != null ? body.accountSize : body.size);
      if (!Number.isFinite(accountSize) || accountSize <= 0) {
        json(res, 400, { ok: false, error: "Select an account size" });
        return;
      }
      if (accountSize > 0 && accountSize < 1000) accountSize *= 1000;

      const challengeName = planToChallengeName(evaluationType);
      const priced = await sql`
        SELECT price FROM challenge_prices
        WHERE challenge_name = ${challengeName} AND account_size = ${accountSize}
        LIMIT 1
      `;
      const fee = priced[0] ? Number(priced[0].price) : Number(body.fee) || 0;

      const inserted = await sql`
        INSERT INTO challenges (user_id, evaluation_type, account_size, platform, fee, status)
        VALUES (${user.id}, ${challengeName}, ${accountSize}, ${platform}, ${fee}, 'active')
        RETURNING id, evaluation_type, account_size, platform, fee, status, created_at
      `;

      const row = inserted[0];

      let purchaseEmail = { sent: false, skipped: true };
      try {
        purchaseEmail = await sendChallengePurchaseEmail({
          name: user.name,
          email: user.email,
          evaluationType: String(row.evaluation_type),
          accountSize: Number(row.account_size),
          platform: String(row.platform),
          fee: Number(row.fee),
          req,
        });
      } catch (mailErr) {
        console.warn("challenge email failed", mailErr.message || mailErr);
        purchaseEmail = { sent: false, skipped: false, error: mailErr.message || "send failed" };
      }

      json(res, 201, {
        ok: true,
        purchaseEmail,
        challenge: {
          id: String(row.id),
          evaluationType: String(row.evaluation_type),
          accountSize: Number(row.account_size),
          platform: String(row.platform),
          fee: Number(row.fee),
          status: String(row.status),
          createdAt: row.created_at,
        },
      });
      return;
    }

    json(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Challenges request failed") });
  }
};
