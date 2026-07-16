import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browserCore = path.join(root, "packages", "web", "mrgwallet-core.browser.js");

test("browser core exposes MRGWallet and builds mock snapshot", async () => {
  const code = fs.readFileSync(browserCore, "utf8");
  const sandbox = {
    console,
    TextEncoder,
    Uint8Array,
    fetch: async () => {
      throw new Error("offline");
    },
    crypto: webcrypto,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  assert.ok(sandbox.MRGWallet);
  assert.equal(sandbox.MRGWallet.token_symbol || sandbox.MRGWallet.PROTOCOL_VERSION, sandbox.MRGWallet.PROTOCOL_VERSION);
  const snap = await sandbox.MRGWallet.mockWalletSnapshot("github:test");
  assert.equal(snap.kind, "wallet_snapshot");
  assert.ok(snap.vault.address.length >= 32);
  assert.ok(snap.sample_receipt.ready);
  assert.ok(snap.solana.program_id);
  assert.ok(snap.solana.entry_address);
  assert.match(snap.solana.explorer_url, /^https:\/\/explorer\.solana\.com\/address\//);
});

test("built dist web core matches browser source after build-web", () => {
  // Ensure build script copies dedicated browser core (no duplicate const)
  const src = fs.readFileSync(browserCore, "utf8");
  assert.match(src, /global\.MRGWallet/);
  assert.doesNotMatch(src, /const SHOP_BASE[\s\S]*const SHOP_BASE/);
});
