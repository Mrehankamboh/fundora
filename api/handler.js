const { getApiHandler } = require("../lib/api-routes");

function restored(req) {
  const url = new URL(String(req.url || "/"), "http://localhost");
  const query = req.query || {};
  for (const [key, value] of Object.entries(query)) {
    if (url.searchParams.has(key)) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item != null) url.searchParams.append(key, String(item));
    }
  }
  const fromQuery = query.__path;
  const hinted = url.searchParams.get("__path") || (Array.isArray(fromQuery) ? fromQuery.join("/") : fromQuery || "");
  if (hinted) {
    url.pathname = "/api/" + String(hinted).replace(/^\/+/, "");
    url.searchParams.delete("__path");
  }
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const search = url.searchParams.toString();
  return { pathname, url: pathname + (search ? "?" + search : "") };
}

module.exports = function handler(req, res) {
  const next = restored(req);
  req.url = next.url;
  const route = getApiHandler(next.pathname);
  if (!route) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "API route not found" }));
    return;
  }

  Promise.resolve()
    .then(() => route(req, res))
    .catch((err) => {
      if (res.headersSent) return;
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: err.message || "Server error" }));
    });
};
