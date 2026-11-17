const QRCode = require("qrcode");
const { publicOrigin } = require("../lib/public-origin");

module.exports = async function handler(req, res) {
  const origin = publicOrigin(req);
  const url = origin.replace(/\/$/, "") + "/portal/kyc.html";
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 4,
    errorCorrectionLevel: "H",
    width: 280,
    color: { dark: "#111111", light: "#ffffff" },
  });
  res.statusCode = 200;
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(svg);
};
