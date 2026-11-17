const MAX_UPLOAD = 14 * 1024 * 1024;

function readBody(req, limit = MAX_UPLOAD) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Upload is too large. Each file must be 4 MB or smaller."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(String(contentType || ""));
  if (!match) throw new Error("Upload must include the identity files.");
  const boundary = (match[1] || match[2] || "").trim();
  if (!boundary) throw new Error("Upload must include the identity files.");

  const dash = Buffer.from("--" + boundary);
  const sep = Buffer.from("\r\n--" + boundary);
  let pos = buffer.indexOf(dash);
  if (pos === -1) throw new Error("Upload could not be read.");
  pos += dash.length;

  const fields = {};
  const files = {};

  while (pos < buffer.length) {
    if (buffer[pos] === 45 && buffer[pos + 1] === 45) break;
    if (buffer[pos] === 13 && buffer[pos + 1] === 10) pos += 2;
    const headerEnd = buffer.indexOf("\r\n\r\n", pos);
    if (headerEnd === -1) break;
    const header = buffer.slice(pos, headerEnd).toString("utf8");
    const bodyStart = headerEnd + 4;
    let bodyEnd = buffer.indexOf(sep, bodyStart);
    if (bodyEnd === -1) {
      const endMark = Buffer.from("\r\n--" + boundary + "--");
      bodyEnd = buffer.indexOf(endMark, bodyStart);
      if (bodyEnd === -1) break;
    }
    const body = buffer.slice(bodyStart, bodyEnd);
    const nameMatch = /name="([^"]+)"/.exec(header);
    const fileMatch = /filename="([^"]*)"/.exec(header);
    const name = nameMatch ? nameMatch[1] : "";
    if (name && fileMatch && fileMatch[1]) {
      files[name] = {
        filename: fileMatch[1],
        buffer: body,
      };
    } else if (name) {
      fields[name] = body.toString("utf8").trim();
    }
    pos = bodyEnd + sep.length;
  }

  return { fields, files };
}

module.exports = { readBody, parseMultipart, MAX_UPLOAD };
