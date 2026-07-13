#!/usr/bin/env node
/**
 * Build web + extensions and zip Chrome/Firefox packages for GitHub Releases.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version || "0.0.0";
const outDir = path.join(root, "dist", "release");

execSync("npm run build", { cwd: root, stdio: "inherit" });
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

function zipDir(srcDir, zipPath) {
  // Use PowerShell Compress-Archive on Windows; zip on Unix
  if (process.platform === "win32") {
    const ps = `Compress-Archive -Path '${srcDir}\\*' -DestinationPath '${zipPath}' -Force`;
    execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit" });
  } else {
    execSync(`cd "${srcDir}" && zip -r "${zipPath}" .`, { stdio: "inherit", shell: true });
  }
}

const chromeZip = path.join(outDir, `MRGWallet-chrome-v${version}.zip`);
const firefoxZip = path.join(outDir, `MRGWallet-firefox-v${version}.zip`);
const webZip = path.join(outDir, `MRGWallet-web-v${version}.zip`);

zipDir(path.join(root, "dist", "extensions", "chrome"), chromeZip);
zipDir(path.join(root, "dist", "extensions", "firefox"), firefoxZip);
zipDir(path.join(root, "dist", "web"), webZip);

const checksums = [];
for (const f of [chromeZip, firefoxZip, webZip]) {
  const buf = fs.readFileSync(f);
  const sha = createHash("sha256").update(buf).digest("hex");
  const name = path.basename(f);
  checksums.push(`${sha}  ${name}`);
  console.log("packed", name, sha.slice(0, 16) + "…");
}
fs.writeFileSync(path.join(outDir, `MRGWallet-v${version}.sha256`), checksums.join("\n") + "\n", "utf8");

const notes = path.join(outDir, "RELEASE_NOTES.md");
fs.writeFileSync(
  notes,
  `# MRGWallet v${version}

## Install

### Chrome
1. Download \`MRGWallet-chrome-v${version}.zip\` and extract
2. Chrome → Extensions → Developer mode → **Load unpacked** → select extracted folder

### Firefox
1. Download \`MRGWallet-firefox-v${version}.zip\` and extract
2. \`about:debugging\` → This Firefox → **Load Temporary Add-on** → select \`manifest.json\`

### Web / Android assets
- Web zip: open \`index.html\` via \`npm run serve\` (or any static host)
- Android: open \`android/\` in Android Studio after \`npm run sync:android\`

## Verify
\`\`\`
npm test
npm run demo
\`\`\`

## Notes
- Mock vault by default; **Refresh live** uses public MergeOS APIs only
- Payout release remains owner/admin (optional Solana releasePayout)
`,
  "utf8",
);

console.log("release artifacts in", outDir);
