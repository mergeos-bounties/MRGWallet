#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
execSync("node scripts/build-web.mjs", { cwd: root, stdio: "inherit" });

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, ent.name);
    const b = path.join(to, ent.name);
    if (ent.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

const web = path.join(root, "dist", "web");
for (const browser of ["chrome", "firefox"]) {
  const out = path.join(root, "dist", "extensions", browser);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  copyDir(web, path.join(out, "web"));
  const extSrc = path.join(root, "packages", "extension");
  for (const f of fs.readdirSync(extSrc, { withFileTypes: true })) {
    if (f.name.startsWith("manifest.")) continue;
    const from = path.join(extSrc, f.name);
    const to = path.join(out, f.name);
    if (f.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
  const man = browser === "chrome" ? "manifest.chrome.json" : "manifest.firefox.json";
  fs.copyFileSync(path.join(extSrc, man), path.join(out, "manifest.json"));
  console.log("built", out);
}
