const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { userFromRequest, json, errorMessage } = require("../lib/auth");
const { readBody, parseMultipart } = require("../lib/multipart");
const { validatePersonal, validateFiles, mapApplication } = require("../lib/kyc");

async function latestApplication(sql, userId) {
  const rows = await sql`
    SELECT id, status, full_name, date_of_birth, country, address, city, postal_code,
           document_type, rejection_reason, submitted_at, reviewed_at
    FROM kyc_applications
    WHERE user_id = ${userId}
    ORDER BY submitted_at DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { status: "not_started", application: null };
  const docs = await sql`
    SELECT id, slot, file_name, mime, size_bytes
    FROM kyc_documents
    WHERE application_id = ${row.id}
    ORDER BY created_at ASC
  `;
  return { status: String(row.status), application: mapApplication(row, docs) };
}

module.exports = async function handler(req, res) {
  try {
    const sql = getSql();
    await ensureSchema(sql);
    const user = await userFromRequest(sql, req);
    if (!user) {
      json(res, 401, { ok: false, error: "Sign in to continue." });
      return;
    }

    if (req.method === "GET") {
      const current = await latestApplication(sql, user.id);
      json(res, 200, { ok: true, ...current });
      return;
    }

    if (req.method !== "POST") {
      json(res, 405, { ok: false, error: "Method not allowed" });
      return;
    }

    const current = await latestApplication(sql, user.id);
    if (current.status === "pending") {
      json(res, 409, {
        ok: false,
        error: "Your verification is already under review.",
      });
      return;
    }
    if (current.status === "approved") {
      json(res, 409, {
        ok: false,
        error: "Your identity is already verified.",
      });
      return;
    }

    const raw = await readBody(req);
    const { fields, files } = parseMultipart(raw, req.headers["content-type"]);
    const personal = validatePersonal(fields);
    const uploaded = validateFiles(files, personal.value.documentType);
    const errors = { ...personal.errors, ...uploaded.errors };
    if (Object.keys(errors).length) {
      json(res, 400, { ok: false, error: "Check the highlighted fields.", errors });
      return;
    }

    const value = personal.value;
    const inserted = await sql`
      INSERT INTO kyc_applications (
        user_id, status, full_name, date_of_birth, country, address, city, postal_code, document_type
      ) VALUES (
        ${user.id}, 'pending', ${value.fullName}, ${value.dateOfBirth}, ${value.country},
        ${value.address}, ${value.city}, ${value.postalCode}, ${value.documentType}
      )
      RETURNING id
    `;
    const applicationId = inserted[0].id;

    try {
      for (const file of uploaded.files) {
        await sql`
          INSERT INTO kyc_documents (application_id, slot, file_name, mime, size_bytes, content_b64)
          VALUES (
            ${applicationId}, ${file.slot}, ${file.name}, ${file.mime}, ${file.size},
            ${file.buffer.toString("base64")}
          )
        `;
      }
      await sql`
        INSERT INTO kyc_audit (application_id, actor_id, action, note)
        VALUES (
          ${applicationId}, ${user.id}, 'submitted',
          'Application submitted for manual review. Upload does not approve the account.'
        )
      `;
    } catch (err) {
      await sql`DELETE FROM kyc_applications WHERE id = ${applicationId}`;
      throw err;
    }

    const saved = await latestApplication(sql, user.id);
    json(res, 201, { ok: true, ...saved });
  } catch (err) {
    const message = errorMessage(err, "Verification could not be saved.");
    if (/duplicate key|kyc_one_pending/i.test(message)) {
      json(res, 409, { ok: false, error: "Your verification is already under review." });
      return;
    }
    const status = /too large/i.test(message) ? 413 : 500;
    json(res, status, { ok: false, error: message });
  }
};
