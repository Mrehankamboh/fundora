const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { json, errorMessage } = require("../lib/auth");

module.exports = async function handler(req, res) {
  try {
    const sql = getSql();
    await ensureSchema(sql);
    const rows = await sql`
      SELECT challenge_name, account_size, price, leverage
      FROM challenge_prices
      ORDER BY challenge_name, account_size
    `;
    json(res, 200, {
      ok: true,
      prices: rows.map((r) => ({
        challengeName: String(r.challenge_name),
        accountSize: Number(r.account_size),
        price: Number(r.price),
        leverage: String(r.leverage || "1:100"),
      })),
    });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Could not load prices") });
  }
};
