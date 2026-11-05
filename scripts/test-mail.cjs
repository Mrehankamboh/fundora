const fs = require("fs");
const path = require("path");

function loadEnvFile(file) {
  try {
    const text = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (_) {}
}

loadEnvFile(".env.local");

const mail = require("../lib/mail");

(async () => {
  const to = process.env.GMAIL_USER;
  const mask = to ? to.replace(/(.{2}).+(@.+)/, "$1***$2") : "missing";
  console.log("mailer", mail.hasMailer(), "to", mask);
  if (!mail.hasMailer()) {
    console.error("GMAIL_USER / GMAIL_APP_PASSWORD missing");
    process.exit(1);
  }
  const welcome = await mail.sendWelcomeEmail({ name: "Rehan", email: to });
  console.log("welcome", welcome);
  const reset = await mail.sendPasswordResetEmail({
    name: "Rehan",
    email: to,
    token: "test-token-demo",
  });
  console.log("reset", reset);
  const challenge = await mail.sendChallengePurchaseEmail({
    name: "Rehan",
    email: to,
    evaluationType: "1-Step",
    accountSize: 25000,
    platform: "MetaTrader 5",
    fee: 249,
  });
  console.log("challenge", challenge);
})().catch((err) => {
  console.error("FAIL", err.message || err);
  process.exit(1);
});
