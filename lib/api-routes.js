const routes = {
  "/api/health": () => require("../routes/health.js"),
  "/api/auth/register": () => require("../routes/auth/register.js"),
  "/api/auth/login": () => require("../routes/auth/login.js"),
  "/api/auth/logout": () => require("../routes/auth/logout.js"),
  "/api/auth/me": () => require("../routes/auth/me.js"),
  "/api/auth/forgot": () => require("../routes/auth/forgot.js"),
  "/api/auth/reset": () => require("../routes/auth/reset.js"),
  "/api/auth/profile": () => require("../routes/auth/profile.js"),
  "/api/auth/google": () => require("../routes/auth/google.js"),
  "/api/auth/google/callback": () => require("../routes/auth/google-callback.js"),
  "/api/prices": () => require("../routes/prices.js"),
  "/api/challenges": () => require("../routes/challenges.js"),
  "/api/rewards": () => require("../routes/rewards.js"),
  "/api/tickets": () => require("../routes/tickets.js"),
};

function normalizeApiPath(pathname) {
  const cleaned = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  return cleaned.startsWith("/api") ? cleaned : `/api${cleaned.startsWith("/") ? "" : "/"}${cleaned}`;
}

function getApiHandler(pathname) {
  const key = normalizeApiPath(pathname);
  const factory = routes[key];
  return factory ? factory() : null;
}

module.exports = { routes, getApiHandler, normalizeApiPath };
