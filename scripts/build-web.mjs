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
    const a = path.join(from, ent.name);
    const b = path.join(to, ent.name);
    if (ent.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

copyDir(src, out);
// bundle core as ESM for browser via simple concat shim
const walletSrc = fs.readFileSync(path.join(root, "packages", "core", "wallet.js"), "utf8");
const apiSrc = fs.readFileSync(path.join(root, "packages", "core", "api.js"), "utf8");
// browser-friendly: strip node:crypto imports and inject WebCrypto fallbacks
const browserWallet = walletSrc
  .replace(/import crypto from "node:crypto";\n/, "")
  .replace(
    /export function sha256Hex\(text\) \{\n  return crypto\.createHash\("sha256"\)\.update\(String\(text\)\)\.digest\("hex"\);\n\}/,
    `export async function sha256Hex(text) {
  const data = new TextEncoder().encode(String(text));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}`,
  )
  .replace(
    /export function deriveAddress\(seed = "mrgwallet:local"\) \{\n  const hash = crypto\.createHash\("sha256"\)\.update\(String\(seed\)\)\.digest\(\);\n  return base58Encode\(hash\);\n\}/,
    `export async function deriveAddress(seed = "mrgwallet:local") {
  const hex = await sha256Hex(seed);
  const hash = new Uint8Array(hex.match(/.{1,2}/g).map((x) => parseInt(x, 16)));
  return base58Encode(hash);
}`,
  )
  .replace(
    /export function createVault\(\{ seed = "mrgwallet:local", label = "Primary" \} = \{\}\) \{\n  const address = deriveAddress\(seed\);\n  const secretHash = sha256Hex\(`secret:\$\{seed\}:\$\{address\}`\);/,
    `export async function createVault({ seed = "mrgwallet:local", label = "Primary" } = {}) {
  const address = await deriveAddress(seed);
  const secretHash = await sha256Hex(\`secret:\${seed}:\${address}\`);`,
  )
  .replace(
    /const receiptHash = sha256Hex\(material\);/,
    `const receiptHash = await sha256Hex(material);`,
  )
  .replace(
    /export function buildWalletClaimReceipt\(/,
    `export async function buildWalletClaimReceipt(`,
  )
  .replace(
    /export function buildWalletSnapshot\(/,
    `export async function buildWalletSnapshot(`,
  )
  .replace(
    /const receipt = bounties\[0\]\n    \? buildWalletClaimReceipt\(\{ vault: v, bounty: bounties\[0\], proof: ledger, solana, workerId \}\)\n    : null;/,
    `const receipt = bounties[0]
    ? await buildWalletClaimReceipt({ vault: v, bounty: bounties[0], proof: ledger, solana, workerId })
    : null;`,
  )
  .replace(
    /export function mockWalletSnapshot\(workerId = "github:demo"\) \{\n  return buildWalletSnapshot\(\{/,
    `export async function mockWalletSnapshot(workerId = "github:demo") {
  return buildWalletSnapshot({`,
  )
  // base58Encode Buffer -> Uint8Array
  .replace(
    /export function base58Encode\(buf\) \{\n  const bytes = Buffer\.from\(buf\);/,
    `export function base58Encode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);`,
  );

const browserApi = apiSrc.replace(/import \{ SHOP_BASE \} from "\.\/wallet\.js";\n/, "");

fs.writeFileSync(
  path.join(out, "mrgwallet-core.js"),
  `// Auto-generated browser bundle of packages/core\nconst SHOP_BASE = "https://mergeos.shop";\nconst SCAN_BASE = "https://scan.mergeos.shop";\n` +
    browserWallet.replace(/export /g, "") +
    "\n" +
    browserApi.replace(/export /g, "").replace(/from "\.\/wallet\.js"/g, "") +
    `\nwindow.MRGWallet = {
  SHOP_BASE, SCAN_BASE, DEFAULT_SOLANA_PROGRAM_ID, PROTOCOL_VERSION,
  sha256Hex, base58Encode, deriveAddress, createVault, mrgFromCents,
  scanAddressUrl, scanTxUrl, ledgerReferenceBytes32,
  summarizeTokenEconomy, summarizeLedgerProof, summarizeSolana,
  resolveRewardMrg, discoverClaimableBounties, buildWalletClaimReceipt,
  buildWalletSnapshot, mockEconomy, mockProof, mockMarket, mockSolanaManifest,
  mockWalletSnapshot, fetchTokenEconomy, fetchLedgerProof, fetchMarketplace,
  fetchSolanaManifest, fetchLiveWalletBundle
};\n`,
  "utf8",
);

console.log("built", out);
