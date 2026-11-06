const crypto = require("crypto");
const { getSql } = require("../lib/db");
const { ensureSchema } = require("../lib/schema");
const { userFromRequest, readJson, json, errorMessage } = require("../lib/auth");

function visitorKeyFrom(body) {
  const fromBody = String(body.visitorKey || "").trim();
  if (fromBody && fromBody.length >= 8 && fromBody.length <= 80) return fromBody;
  return crypto.randomBytes(16).toString("hex");
}

function mapTicket(row) {
  return {
    id: String(row.id),
    subject: String(row.subject || "Support"),
    status: String(row.status || "open"),
    name: String(row.visitor_name || "").trim(),
    email: String(row.visitor_email || "").trim(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessage: row.last_message ? String(row.last_message) : "",
  };
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

      if (/^[0-9a-f-]{36}$/i.test(id)) {
        const tickets = await sql`
          SELECT id, user_id, visitor_key, visitor_name, visitor_email, subject, status, created_at, updated_at
          FROM tickets WHERE id = ${id} LIMIT 1
        `;
        const ticket = tickets[0];
        if (!ticket) {
          json(res, 404, { ok: false, error: "Conversation not found" });
          return;
        }
        const owns =
          (user && ticket.user_id && String(ticket.user_id) === user.id) ||
          (visitorKey &&
            ticket.visitor_key &&
            visitorKey === String(ticket.visitor_key));
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
          ticket: mapTicket(ticket),
          messages: messages.map((row) => ({
            id: String(row.id),
            author: String(row.author),
            body: String(row.body),
            createdAt: row.created_at,
          })),
        });
        return;
      }

      // List conversations for logged-in user or visitor key
      let rows;
      if (user) {
        rows = await sql`
          SELECT t.id, t.visitor_name, t.visitor_email, t.subject, t.status, t.created_at, t.updated_at,
            (SELECT body FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
          FROM tickets t
          WHERE t.user_id = ${user.id}
          ORDER BY t.updated_at DESC
          LIMIT 50
        `;
      } else if (visitorKey) {
        rows = await sql`
          SELECT t.id, t.visitor_name, t.visitor_email, t.subject, t.status, t.created_at, t.updated_at,
            (SELECT body FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
          FROM tickets t
          WHERE t.visitor_key = ${visitorKey}
          ORDER BY t.updated_at DESC
          LIMIT 50
        `;
      } else {
        json(res, 401, { ok: false, error: "Sign in or provide visitorKey" });
        return;
      }

      json(res, 200, {
        ok: true,
        tickets: rows.map(mapTicket),
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
      const incomingKey = String(body.visitorKey || "").trim();
      const visitorKey = visitorKeyFrom(body);
      const visitorName = String(body.name || (user && user.name) || "Visitor")
        .trim()
        .slice(0, 80);
      const visitorEmail = String(body.email || (user && user.email) || "")
        .trim()
        .toLowerCase()
        .slice(0, 160);
      const subject =
        String(body.subject || "Website support").trim().slice(0, 160) ||
        "Website support";

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
      const keyToCheck = incomingKey || visitorKey;
      const owns =
        (user && ticket.user_id && String(ticket.user_id) === user.id) ||
        (keyToCheck &&
          ticket.visitor_key &&
          keyToCheck === String(ticket.visitor_key));
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
            status = CASE WHEN status IN ('closed', 'resolved') THEN 'open' ELSE status END
        WHERE id = ${ticketId}
      `;
      json(res, 200, {
        ok: true,
        ticketId,
        visitorKey: user ? null : String(ticket.visitor_key || keyToCheck),
      });
      return;
    }

    json(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    json(res, 500, { ok: false, error: errorMessage(err, "Support chat failed") });
  }
};
