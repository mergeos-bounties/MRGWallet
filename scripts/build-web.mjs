#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "packages", "web");
const out = path.join(root, "dist", "web");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    if (ent.name === "mrgwallet-core.browser.js") continue;
    const a = path.join(from, ent.name);
    const b = path.join(to, ent.name);
    if (ent.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

copyDir(src, out);
// Ship dedicated browser core (no fragile Node→browser transforms)
fs.copyFileSync(
  path.join(src, "mrgwallet-core.browser.js"),
  path.join(out, "mrgwallet-core.js"),
);
console.log("built", out);
