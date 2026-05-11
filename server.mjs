import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function resolvePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const candidate = normalize(join(root, clean === "/" ? "index.html" : clean));
  if (!candidate.startsWith(root)) return null;
  if (!existsSync(candidate)) return null;
  const stats = statSync(candidate);
  return stats.isDirectory() ? join(candidate, "index.html") : candidate;
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url || "/");
  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "content-type": types[extname(filePath)] || "application/octet-stream",
    "cache-control": filePath.endsWith("phaser.min.js") ? "public, max-age=31536000, immutable" : "no-cache"
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Four Worlds Battleground running at http://localhost:${port}`);
});
