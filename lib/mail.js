const nodemailer = require("nodemailer");

const SITE_NAME = "Fundora";
const BRAND = "#3b82f6";

function gmailUser() {
  return String(process.env.GMAIL_USER || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function gmailPass() {
  return String(process.env.GMAIL_APP_PASSWORD || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s/g, "");
}

function hasMailer() {
  return Boolean(gmailUser() && gmailPass());
}

function mailConfigError(err) {
  const raw = String((err && err.message) || err || "");
  if (/Invalid login|BadCredentials|5\.7\.8|Username and Password not accepted/i.test(raw)) {
    return "Gmail login failed. Create a Google App Password, then set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local.";
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(raw)) {
    return "Could not reach the mail server. Try again in a moment.";
  }
  return raw || "Could not send email";
}

function siteOrigin(req) {
  if (req && req.headers) {
    const proto = String(req.headers["x-forwarded-proto"] || "http")
      .split(",")[0]
      .trim();
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
      .split(",")[0]
      .trim();
    if (host && !/^localhost\b/i.test(host) && !/^127\.0\.0\.1\b/.test(host)) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }
  return String(process.env.APP_ORIGIN || "http://127.0.0.1:5173").replace(/\/$/, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function transporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmailUser(),
      pass: gmailPass(),
    },
  });
}

function shellHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#050b18;font-family:DM Sans,Arial,Helvetica,sans-serif;color:#f5f8ff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050b18;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0a1428;border:1px solid rgba(126,182,255,0.22);border-radius:14px;">
            <tr>
              <td style="padding:32px 28px;">
                <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND};font-weight:700;">${SITE_NAME}</p>
                <h1 style="margin:14px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#f5f8ff;font-family:Georgia,serif;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function cta(href, label) {
  return `<p style="margin:24px 0 0;"><a href="${href}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 22px;border-radius:10px;">${label}</a></p>`;
}

async function sendWelcomeEmail(input) {
  if (!hasMailer()) {
    console.warn("Gmail is not configured; skipped welcome email.");
    return { sent: false, skipped: true };
  }

  const firstName =
    String(input.firstName || input.name || "")
      .trim()
      .split(/\s+/)[0] || "trader";
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  if (!email) return { sent: false, skipped: true, error: "Missing email" };

  const origin = input.origin || siteOrigin(input.req);
  const portal = `${origin}/portal/index.html`;
  const login = `${origin}/login.html`;
  const safeName = escapeHtml(firstName);

  const info = await transporter().sendMail({
    from: `"${SITE_NAME}" <${gmailUser()}>`,
    replyTo: gmailUser(),
    to: email,
    subject: `Welcome to ${SITE_NAME}`,
    text: [
      `Hi ${firstName},`,
      "",
      `Welcome to ${SITE_NAME}. Your account is ready.`,
      `Open your portal: ${portal}`,
      `Or sign in: ${login}`,
      "",
      "Pick a challenge when you are ready to start.",
    ].join("\n"),
    html: shellHtml(
      `Welcome, ${safeName}.`,
      `<p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:#93a4c7;">Your Fundora account is ready. Track challenges, rewards, and account details from your portal.</p>
       ${cta(portal, "Open portal")}`
    ),
  });

  console.log("welcome email sent", { to: email, id: info && info.messageId });
  return { sent: true, skipped: false, id: info && info.messageId };
}

async function sendPasswordResetEmail(input) {
  if (!hasMailer()) {
    return { sent: false, skipped: true };
  }

  const firstName =
    String(input.firstName || input.name || "")
      .trim()
      .split(/\s+/)[0] || "trader";
  const email = String(input.email || "").trim().toLowerCase();
  const origin = input.origin || siteOrigin(input.req);
  const reset = `${origin}/forgot.html?token=${encodeURIComponent(input.token)}`;
  const safeName = escapeHtml(firstName);

  const info = await transporter().sendMail({
    from: `"${SITE_NAME}" <${gmailUser()}>`,
    replyTo: gmailUser(),
    to: email,
    subject: `Reset your ${SITE_NAME} password`,
    text: [
      `Hi ${firstName},`,
      "",
      "We received a request to reset your Fundora password.",
      `Choose a new one here: ${reset}`,
      "",
      "This link expires in one hour. If you did not ask for this, ignore the email.",
    ].join("\n"),
    html: shellHtml(
      `Reset your password, ${safeName}.`,
      `<p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:#93a4c7;">Choose a new password with the button below. This link expires in one hour.</p>
       ${cta(reset, "Choose a new password")}`
    ),
  });

  console.log("reset email sent", { to: email, id: info && info.messageId });
  return { sent: true, skipped: false, id: info && info.messageId };
}

async function sendChallengePurchaseEmail(input) {
  if (!hasMailer()) {
    console.warn("Gmail is not configured; skipped challenge email.");
    return { sent: false, skipped: true };
  }

  const firstName =
    String(input.firstName || input.name || "")
      .trim()
      .split(/\s+/)[0] || "trader";
  const email = String(input.email || "").trim().toLowerCase();
  const origin = input.origin || siteOrigin(input.req);
  const challenges = `${origin}/portal/challenges.html`;
  const safeName = escapeHtml(firstName);
  const summary = `${input.evaluationType} · $${Number(input.accountSize).toLocaleString()} · ${input.platform} · $${Number(input.fee).toFixed(2)}`;

  const info = await transporter().sendMail({
    from: `"${SITE_NAME}" <${gmailUser()}>`,
    replyTo: gmailUser(),
    to: email,
    subject: `Challenge purchased — ${SITE_NAME}`,
    text: [
      `Hi ${firstName},`,
      "",
      "Your Fundora challenge purchase is saved.",
      summary,
      "",
      `View challenges: ${challenges}`,
    ].join("\n"),
    html: shellHtml(
      `Thanks, ${safeName}.`,
      `<p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:#93a4c7;">Your challenge is saved:</p>
       <p style="margin:12px 0 0;font-size:15px;color:#f5f8ff;"><strong>${escapeHtml(summary)}</strong></p>
       ${cta(challenges, "View challenges")}`
    ),
  });

  console.log("challenge email sent", { to: email, id: info && info.messageId });
  return { sent: true, skipped: false, id: info && info.messageId };
}

module.exports = {
  hasMailer,
  mailConfigError,
  siteOrigin,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendChallengePurchaseEmail,
};
