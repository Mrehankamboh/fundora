const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { userFromRequest, json, errorMessage } = require("../lib/auth");

const SAFE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      json(res, 405, { ok: false, error: "Method not allowed" });
      return;
    }
    const sql = getSql();
    await ensureSchema(sql);
    const user = await userFromRequest(sql, req);
    if (!user) {
      json(res, 401, { ok: false, error: "Sign in to continue." });
      return;
    }

    const url = new URL(req.url || "/", "http://localhost");
    const id = String(url.searchParams.get("id") || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      json(res, 400, { ok: false, error: "Document not found." });
      return;
    }

    const rows = await sql`
      SELECT d.mime, d.file_name, d.content_b64
      FROM kyc_documents d
      JOIN kyc_applications a ON a.id = d.application_id
      WHERE d.id = ${id} AND a.user_id = ${user.id}
      LIMIT 1
    `;
    const row = rows[0];
    const mime = row ? String(row.mime || "") : "";
    if (!row || !SAFE_MIME.has(mime)) {
      json(res, 404, { ok: false, error: "Document not found." });
      return;
    }

    const body = Buffer.from(String(row.content_b64 || ""), "base64");
    const name = String(row.file_name || "document").replace(/["\r\n]/g, "");
    res.statusCode = 200;
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Length", body.length);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `inline; filename="${name}"`);
    res.end(body);
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Document could not be opened.") });
  }
};
