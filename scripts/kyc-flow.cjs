const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");

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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (_) {}
}
loadEnvFile(".env.local");

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function multipart(fields, files) {
  const boundary = "----fundoraKycBoundary";
  const chunks = [];
  const push = (value) => chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
  Object.entries(fields).forEach(([key, value]) => {
    push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`);
  });
  Object.entries(files).forEach(([key, file]) => {
    push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${file.name}"\r\nContent-Type: application/octet-stream\r\n\r\n`
    );
    push(file.buffer);
    push("\r\n");
  });
  push(`--${boundary}--\r\n`);
  return { boundary, body: Buffer.concat(chunks) };
}

function request(port, method, urlPath, { body, headers, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(headers || {}),
          ...(body ? { "Content-Length": body.length } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks);
          const type = String(res.headers["content-type"] || "");
          let json = null;
          if (type.includes("json")) {
            try {
              json = JSON.parse(raw.toString("utf8") || "{}");
            } catch (_) {}
          }
          resolve({
            status: res.statusCode,
            json,
            type,
            length: raw.length,
            cookie: (res.headers["set-cookie"] || [])[0] || "",
          });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function jsonRequest(port, method, urlPath, payload, cookie) {
  const body = payload ? Buffer.from(JSON.stringify(payload)) : null;
  return request(port, method, urlPath, {
    body,
    cookie,
    headers: body ? { "Content-Type": "application/json" } : {},
  });
}

function cookieHeader(setCookie) {
  return String(setCookie || "").split(";")[0];
}

(async () => {
  const failures = [];
  const check = (name, ok, extra) => {
    console.log(ok ? "ok" : "FAIL", name, extra || "");
    if (!ok) failures.push(name);
  };

  const email = `kyc_${Date.now()}@fundora.test`;
  const password = "TestPass123";
  const fields = {
    fullName: "Rehan Test",
    dateOfBirth: "1994-04-12",
    country: "Pakistan",
    address: "12 Test Street Gulberg",
    city: "Lahore",
    postalCode: "54000",
    documentType: "national_id",
  };
  const files = {
    front: { name: "front.png", buffer: png },
    back: { name: "back.png", buffer: png },
    selfie: { name: "selfie.png", buffer: png },
  };

  const reg = await jsonRequest(5173, "POST", "/api/auth/register", {
    name: "KYC Tester",
    email,
    password,
    confirm: password,
    country: "Pakistan",
  });
  const cookie = cookieHeader(reg.cookie);
  check("register", reg.status === 201 && reg.json.ok, reg.status);

  const empty = await jsonRequest(5173, "GET", "/api/kyc", null, cookie);
  check("not started", empty.status === 200 && empty.json.status === "not_started");

  const bad = multipart({ ...fields, fullName: "1" }, files);
  const invalid = await request(5173, "POST", "/api/kyc", {
    cookie,
    body: bad.body,
    headers: { "Content-Type": `multipart/form-data; boundary=${bad.boundary}` },
  });
  check("rejects bad name", invalid.status === 400 && invalid.json.errors && invalid.json.errors.fullName);

  const pack = multipart(fields, files);
  const created = await request(5173, "POST", "/api/kyc", {
    cookie,
    body: pack.body,
    headers: { "Content-Type": `multipart/form-data; boundary=${pack.boundary}` },
  });
  check("submit pending", created.status === 201 && created.json.status === "pending", created.status + " " + (created.json && created.json.error));
  const docId = created.json && created.json.application && created.json.application.documents[0].id;

  const again = await request(5173, "POST", "/api/kyc", {
    cookie,
    body: pack.body,
    headers: { "Content-Type": `multipart/form-data; boundary=${pack.boundary}` },
  });
  check("blocks duplicate", again.status === 409, again.status);

  const file = await request(5173, "GET", "/api/kyc/file?id=" + docId, { cookie });
  check("owner can open file", file.status === 200 && file.type.startsWith("image/png") && file.length === png.length, file.status + " " + file.type);

  const hidden = await request(5173, "GET", "/api/kyc/file?id=" + docId);
  check("anonymous cannot open file", hidden.status === 401, hidden.status);

  const other = await jsonRequest(5173, "POST", "/api/auth/register", {
    name: "Other Tester",
    email: `kyc_other_${Date.now()}@fundora.test`,
    password,
    confirm: password,
    country: "Pakistan",
  });
  const otherFile = await request(5173, "GET", "/api/kyc/file?id=" + docId, {
    cookie: cookieHeader(other.cookie),
  });
  check("other user cannot open file", otherFile.status === 404, otherFile.status);

  const { neon } = require("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  const admins = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
  if (!admins[0]) throw new Error("No admin user");
  const token = crypto.randomBytes(32).toString("hex");
  await sql`INSERT INTO sessions (token, user_id) VALUES (${token}, ${admins[0].id})`;
  const adminCookie = `fundora_admin_session=${token}`;

  const list = await jsonRequest(3000, "GET", "/api/kyc", null, adminCookie);
  check("admin list", list.status === 200 && list.json.applications.some((row) => row.fullName === "Rehan Test"), list.status);

  const locked = await jsonRequest(3000, "GET", "/api/kyc", null);
  check("admin list requires auth", locked.status === 401 || locked.status === 403, locked.status);

  const appId = created.json.application.id;
  const shortReason = await jsonRequest(3000, "POST", `/api/kyc/${appId}/decision`, { action: "reject", reason: "no" }, adminCookie);
  check("reject needs a reason", shortReason.status === 400, shortReason.status);

  const rejected = await jsonRequest(
    3000,
    "POST",
    `/api/kyc/${appId}/decision`,
    { action: "reject", reason: "The document photo is unreadable." },
    adminCookie
  );
  check("admin reject", rejected.status === 200 && rejected.json.status === "rejected", rejected.status);

  const afterReject = await jsonRequest(5173, "GET", "/api/kyc", null, cookie);
  check(
    "user sees rejection",
    afterReject.json.status === "rejected" &&
      afterReject.json.application.rejectionReason.includes("unreadable"),
    afterReject.json.status
  );

  const resubmit = await request(5173, "POST", "/api/kyc", {
    cookie,
    body: pack.body,
    headers: { "Content-Type": `multipart/form-data; boundary=${pack.boundary}` },
  });
  check("resubmit after rejection", resubmit.status === 201 && resubmit.json.status === "pending", resubmit.status);
  const secondId = resubmit.json.application.id;

  const approved = await jsonRequest(3000, "POST", `/api/kyc/${secondId}/decision`, { action: "approve" }, adminCookie);
  check("admin approve", approved.status === 200 && approved.json.status === "approved", approved.status);

  const afterApprove = await jsonRequest(5173, "GET", "/api/kyc", null, cookie);
  check("user sees approved", afterApprove.json.status === "approved");

  const noAuto = await request(5173, "POST", "/api/kyc", {
    cookie,
    body: pack.body,
    headers: { "Content-Type": `multipart/form-data; boundary=${pack.boundary}` },
  });
  check("approved user cannot resubmit", noAuto.status === 409, noAuto.status);

  const detail = await jsonRequest(3000, "GET", `/api/kyc/${secondId}`, null, adminCookie);
  check(
    "audit keeps decisions",
    detail.status === 200 &&
      detail.json.application.audit.some((item) => item.action === "approved") &&
      !JSON.stringify(detail.json.application).includes("content_b64"),
    detail.status
  );

  await sql`DELETE FROM sessions WHERE token = ${token}`;
  await sql`DELETE FROM users WHERE email = ${email}`;

  if (failures.length) {
    console.error("failed", failures.join(", "));
    process.exit(1);
  }
  console.log("kyc flow ok");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});