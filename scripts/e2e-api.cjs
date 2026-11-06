const fs = require("fs");
const path = require("path");
const http = require("http");

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
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (_) {}
}
loadEnvFile(".env.local");

function request(method, urlPath, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: Number(process.env.PORT || 5173),
        path: urlPath,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          let json = {};
          try {
            json = JSON.parse(raw || "{}");
          } catch (_) {}
          resolve({
            status: res.statusCode,
            json,
            cookie: (res.headers["set-cookie"] || [])[0] || cookie || "",
          });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const email = `e2e_${Date.now()}@fundora.test`;
  const password = "TestPass123";

  const health = await request("GET", "/api/health");
  console.log("health", health.status, health.json);

  const reg = await request("POST", "/api/auth/register", {
    name: "E2E Trader",
    email,
    password,
    confirm: password,
    country: "Pakistan",
  });
  console.log("register", reg.status, reg.json.ok);
  const cookie = (reg.cookie || "").split(";")[0];

  const me = await request("GET", "/api/auth/me", null, cookie);
  console.log("me", me.status, me.json.ok, me.json.user && me.json.user.email);

  const order = await request(
    "POST",
    "/api/checkout/create",
    { evaluationType: "1-step", accountSize: 25000, paymentMethod: "demo" },
    cookie
  );
  console.log("checkout create", order.status, order.json.ok, order.json.order && order.json.order.fee);

  const paid = await request(
    "POST",
    "/api/checkout/confirm",
    { orderId: order.json.order && order.json.order.id, mode: "demo" },
    cookie
  );
  console.log(
    "checkout confirm",
    paid.status,
    paid.json.ok,
    paid.json.challenge && paid.json.challenge.fee
  );

  const forgot = await request("POST", "/api/auth/forgot", { email });
  console.log("forgot", forgot.status, forgot.json.ok, !!forgot.json.devToken);

  if (
    !health.json.ok ||
    !reg.json.ok ||
    !me.json.ok ||
    !order.json.ok ||
    !paid.json.ok ||
    !forgot.json.ok
  ) {
    process.exit(1);
  }
  console.log("e2e ok");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
