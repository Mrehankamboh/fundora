/**
 * Fundora local server: static site + /api (Neon Postgres).
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 5173);

function loadEnvFile(file) {
  try {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
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
  } catch (_) {
    /* optional */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const { getApiHandler } = require("./lib/api-routes");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath.split("?")[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(root, cleaned);
  if (!full.startsWith(root)) return null;
  return full;
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.end(data);
  });
}

function runApi(handler, req, res) {
  Promise.resolve()
    .then(() => handler(req, res))
    .catch((err) => {
      if (res.headersSent) return;
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: err.message || "Server error" }));
    });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (pathname.startsWith("/api")) {
    const handler = getApiHandler(pathname);
    if (handler) {
      runApi(handler, req, res);
      return;
    }
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "API route not found" }));
    return;
  }

  let filePath = safeJoin(ROOT, pathname === "/" ? "/index.html" : pathname);
  if (!filePath) {
    res.statusCode = 400;
    res.end("Bad path");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!err || pathname.endsWith(".html")) {
      return sendFile(res, filePath);
    }
    const htmlPath = filePath + ".html";
    fs.stat(htmlPath, (err2) => {
      if (!err2) return sendFile(res, htmlPath);
      sendFile(res, filePath);
    });
  });
});

function lanAddresses() {
  const os = require("os");
  const list = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets || {})) {
    for (const net of nets[name] || []) {
      const family = String(net.family);
      if ((family === "IPv4" || family === "4") && !net.internal) {
        // Skip APIPA / link-local
        if (String(net.address).startsWith("169.254.")) continue;
        list.push(net.address);
      }
    }
  }
  // Prefer typical LAN (192.168 / 10.) before hotspot/ICS adapters
  return [...new Set(list)].sort((a, b) => {
    const rank = (ip) =>
      ip.startsWith("192.168.") || ip.startsWith("10.") ? 0 : 1;
    return rank(a) - rank(b) || a.localeCompare(b);
  });
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Fundora (static + Neon API)`);
  console.log(`  Local:   http://127.0.0.1:${PORT}`);
  const lans = lanAddresses();
  if (lans.length) {
    lans.forEach((ip) => console.log(`  Network: http://${ip}:${PORT}`));
  } else {
    console.log(`  Network: (no LAN IPv4 found)`);
  }
  if (!process.env.DATABASE_URL) {
    console.warn("WARNING: DATABASE_URL missing — copy .env.example to .env.local");
  }
});
