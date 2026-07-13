#!/usr/bin/env node
/**
 * Static server for dist/web so the wallet can run over HTTP
 * (required for crypto.subtle + fetch CORS on some browsers).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || process.argv[2] || 8787);

execSync("node scripts/build-web.mjs", { cwd: root, stdio: "inherit" });
const webRoot = path.join(root, "dist", "web");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const file = path.normalize(path.join(webRoot, urlPath.replace(/^\/+/, "")));
    if (!file.startsWith(webRoot)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    res.writeHead(500);
    res.end(String(err.message || err));
  }
});

server.listen(port, () => {
  console.log(`MRGWallet web: http://127.0.0.1:${port}/`);
  console.log("Press Ctrl+C to stop");
});
