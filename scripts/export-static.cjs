/**
 * Copy the public site into dist/ for Vercel. Server code stays outside that folder.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dest = path.join(root, "dist");

function copyFile(rel) {
  const from = path.join(root, rel);
  const to = path.join(dest, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDir(rel) {
  const from = path.join(root, rel);
  if (!fs.existsSync(from)) return;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const child = path.posix.join(rel.split(path.sep).join("/"), entry.name);
    if (entry.isDirectory()) copyDir(child);
    else if (entry.isFile()) copyFile(child);
  }
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

for (const name of fs.readdirSync(root)) {
  if (name.endsWith(".html")) copyFile(name);
}
for (const dir of ["css", "js", "images", "portal"]) copyDir(dir);

console.log("static export ok");
