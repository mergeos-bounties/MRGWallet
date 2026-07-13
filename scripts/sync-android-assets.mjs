#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
execSync("node scripts/build-web.mjs", { cwd: root, stdio: "inherit" });
const src = path.join(root, "dist", "web");
const dest = path.join(root, "android", "app", "src", "main", "assets", "www");
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log("synced android assets", dest);
