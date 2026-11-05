/** Fundora challenge price seeds (matches marketing planner). */
function fundoraPriceSeeds() {
  const oneStep = {
    5000: 59,
    10000: 99,
    25000: 249,
    50000: 399,
    100000: 699,
    200000: 1199,
  };
  const twoStep = {
    5000: 49,
    10000: 79,
    25000: 199,
    50000: 329,
    100000: 549,
    200000: 949,
  };
  const rows = [];
  for (const [size, price] of Object.entries(oneStep)) {
    rows.push({ challenge_name: "1-Step", account_size: Number(size), price, leverage: "1:100" });
  }
  for (const [size, price] of Object.entries(twoStep)) {
    rows.push({ challenge_name: "2-Step", account_size: Number(size), price, leverage: "1:100" });
  }
  return rows;
}

function planToChallengeName(evaluationType) {
  const t = String(evaluationType || "").toLowerCase();
  if (t.includes("2")) return "2-Step";
  return "1-Step";
}

module.exports = { fundoraPriceSeeds, planToChallengeName };
