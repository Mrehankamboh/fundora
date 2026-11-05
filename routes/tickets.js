const crypto = require("crypto");
const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { userFromRequest, readJson, json, errorMessage } = require("../lib/auth");

function visitorKeyFrom(req, body) {
  const fromBody = String(body.visitorKey || "").trim();
  if (fromBody && fromBody.length >= 8 && fromBody.length <= 80) return fromBody;
  return crypto.randomBytes(16).toString("hex");
}

module.exports = async function handler(req, res) {
  try {
    const sql = getSql();
    await ensureSchema(sql);
    const user = await userFromRequest(sql, req);

    if (req.method === "GET") {
      const url = new URL(req.url, "http://localhost");
      const id = String(url.searchParams.get("id") || "");
      const visitorKey = String(url.searchParams.get("visitorKey") || "").trim();
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        json(res, 400, { ok: false, error: "Choose a conversation" });
        return;
      }

      const tickets = await sql`
        SELECT id, user_id, visitor_key, subject, status
        FROM tickets WHERE id = ${id} LIMIT 1
      `;
      const ticket = tickets[0];
      if (!ticket) {
        json(res, 404, { ok: false, error: "Conversation not found" });
        return;
      }
      const owns =
        (user && ticket.user_id && String(ticket.user_id) === user.id) ||
        (visitorKey && ticket.visitor_key && visitorKey === String(ticket.visitor_key));
      if (!owns) {
        json(res, 403, { ok: false, error: "Not allowed" });
        return;
      }

      const messages = await sql`
        SELECT id, author, body, created_at
        FROM ticket_messages
        WHERE ticket_id = ${id}
        ORDER BY created_at ASC
      `;
      json(res, 200, {
        ok: true,
        ticket: {
          id: String(ticket.id),
          subject: String(ticket.subject),
          status: String(ticket.status),
        },
        messages: messages.map((row) => ({
          id: String(row.id),
          author: String(row.author),
          body: String(row.body),
          createdAt: row.created_at,
        })),
      });
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const message = String(body.message || body.body || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);
      if (!message) {
        json(res, 400, { ok: false, error: "Write a message" });
        return;
      }

      let ticketId = String(body.ticketId || body.id || "");
      const visitorKey = visitorKeyFrom(req, body);
      const visitorName = String(body.name || (user && user.name) || "Visitor").trim().slice(0, 80);
      const visitorEmail = String(body.email || (user && user.email) || "").trim().toLowerCase().slice(0, 160);
      const subject = String(body.subject || "Website support").trim().slice(0, 160) || "Website support";

      if (!/^[0-9a-f-]{36}$/i.test(ticketId)) {
        const inserted = await sql`
          INSERT INTO tickets (user_id, visitor_key, visitor_name, visitor_email, subject, status)
          VALUES (
            ${user ? user.id : null},
            ${user ? null : visitorKey},
            ${visitorName},
            ${visitorEmail || null},
            ${subject},
            'open'
          )
          RETURNING id, visitor_key
        `;
        ticketId = String(inserted[0].id);
        await sql`
          INSERT INTO ticket_messages (ticket_id, author, body)
          VALUES (${ticketId}, 'user', ${message})
        `;
        json(res, 200, {
          ok: true,
          ticketId,
          visitorKey: user ? null : String(inserted[0].visitor_key || visitorKey),
        });
        return;
      }

      const existing = await sql`
        SELECT id, user_id, visitor_key, status
        FROM tickets WHERE id = ${ticketId} LIMIT 1
      `;
      const ticket = existing[0];
      if (!ticket) {
        json(res, 404, { ok: false, error: "Conversation not found" });
        return;
      }
      const owns =
        (user && ticket.user_id && String(ticket.user_id) === user.id) ||
        (visitorKey && ticket.visitor_key && visitorKey === String(ticket.visitor_key));
      if (!owns) {
        json(res, 403, { ok: false, error: "Not allowed" });
        return;
      }

      await sql`
        INSERT INTO ticket_messages (ticket_id, author, body)
        VALUES (${ticketId}, 'user', ${message})
      `;
      await sql`
        UPDATE tickets
        SET updated_at = now(),
            status = CASE WHEN status = 'closed' THEN 'open' ELSE status END
        WHERE id = ${ticketId}
      `;
      json(res, 200, { ok: true, ticketId, visitorKey: user ? null : visitorKey });
      return;
    }

    json(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Support chat failed") });
  }
};
