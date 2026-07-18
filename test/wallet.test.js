import test from "node:test";
import assert from "node:assert/strict";
import {
  createVault,
  deriveAddress,
  mockWalletSnapshot,
  buildWalletClaimReceipt,
  getWalletConfigState,
  resolveRewardMrg,
  discoverClaimableBounties,
  mockMarket,
  mockProof,
  mockSolanaManifest,
  mockEconomy,
  summarizeLedgerProof,
  ledgerReferenceBytes32,
  generateProfileId,
  createWalletProfile,
  addProfile,
  removeProfile,
  updateProfile,
  switchToProfile,
  getActiveProfile,
  getProfilesFromStorage,
  getProfileCount,
  buildProfileSnapshot,
} from "../packages/core/wallet.js";

// Import new functions for testing
import {
  exportVaultToJson,
  validateVaultJson,
  importVaultFromSeed,
  PROTOCOL_VERSION,
} from "../packages/core/wallet.js";

test("createVault yields stable mock address", () => {
  const a = createVault({ seed: "demo" });
  const b = createVault({ seed: "demo" });
  assert.equal(a.address, b.address);
  assert.ok(a.address.length >= 32);
  assert.equal(a.token_symbol, "MRG");
  assert.equal(a.mock, true);
});

test("deriveAddress differs by seed", () => {
  assert.notEqual(deriveAddress("a"), deriveAddress("b"));
});

test("resolveRewardMrg prefers title brackets", () => {
  assert.equal(resolveRewardMrg({ title: "Fix #1: [25 MRG] Docs", reward_cents: 40302 }), 25);
});

test("discoverClaimableBounties lists open MRG work", () => {
  const list = discoverClaimableBounties(mockMarket());
  assert.ok(list.length >= 1);
  assert.equal(list[0].reward_mrg, 25);
});

test("claim receipt binds address to ledger tip", () => {
  const vault = createVault({ seed: "claim-test" });
  const proof = summarizeLedgerProof(mockProof());
  const receipt = buildWalletClaimReceipt({
    vault,
    bounty: { id: "prj_x:1", title: "Fix #1: [50 MRG] UI", reward_mrg: 50 },
    proof,
    solana: mockSolanaManifest(),
    workerId: "github:demo",
  });
  assert.equal(receipt.ready, true);
  assert.equal(receipt.reward_mrg, 50);
  assert.equal(receipt.address, vault.address);
  assert.ok(receipt.receipt_hash.length === 64);
  assert.ok(receipt.ledger_reference);
  assert.ok(receipt.solana.program_id);
});

test("mock wallet snapshot is complete", () => {
  const s = mockWalletSnapshot();
  assert.equal(s.kind, "wallet_snapshot");
  assert.ok(s.vault.address);
  assert.ok(s.token.minted_cents > 0);
  assert.ok(s.ledger.tip_hash);
  assert.ok(s.solana.program_id);
  assert.ok(s.claimable.length >= 1);
  assert.ok(s.sample_receipt.ready);
});

test("wallet config state guides users when worker login is missing", () => {
  const empty = getWalletConfigState("");
  assert.equal(empty.status, "needs_configuration");
  assert.equal(empty.ready, false);
  assert.match(empty.title, /Configure/);
  assert.match(empty.message, /GitHub worker ID/);
  assert.match(empty.cta, /Settings/);

  const configured = getWalletConfigState("github:demo");
  assert.equal(configured.status, "ready");
  assert.equal(configured.ready, true);
});

test("ledgerReferenceBytes32 validates 64 hex", () => {
  const h = "ab".repeat(32);
  assert.equal(ledgerReferenceBytes32(h), h);
  assert.equal(ledgerReferenceBytes32("nope"), null);
});

// --- Multi-wallet profile tests ---

class MockStorage {
  constructor() {
    this.data = {};
  }
  getItem(key) {
    return this.data[key] || null;
  }
  setItem(key, value) {
    this.data[key] = String(value);
  }
  removeItem(key) {
    delete this.data[key];
  }
}

test("generateProfileId returns unique ids", () => {
  const a = generateProfileId();
  const b = generateProfileId();
  assert.ok(a.startsWith("profile_"));
  assert.notEqual(a, b);
});

test("createWalletProfile creates profile with address", () => {
  const p = createWalletProfile({ seed: "test-seed", label: "Work", workerId: "github:test" });
  assert.equal(p.label, "Work");
  assert.equal(p.seed, "test-seed");
  assert.equal(p.worker_id, "github:test");
  assert.ok(p.address);
  assert.ok(p.id.startsWith("profile_"));
  assert.ok(p.created_at);
});

test("addProfile stores and returns profile", () => {
  const storage = new MockStorage();
  const p = addProfile({ seed: "s1", label: "Profile 1" }, storage);
  assert.equal(getProfileCount(storage), 1);
  assert.equal(getActiveProfile(storage).id, p.id);
});

test("addProfile sets first profile as active", () => {
  const storage = new MockStorage();
  const p1 = addProfile({ seed: "s1" }, storage);
  const p2 = addProfile({ seed: "s2" }, storage);
  assert.equal(getActiveProfile(storage).id, p1.id);
  assert.equal(getProfileCount(storage), 2);
});

test("switchToProfile changes active profile", () => {
  const storage = new MockStorage();
  const p1 = addProfile({ seed: "s1" }, storage);
  const p2 = addProfile({ seed: "s2" }, storage);
  assert.equal(getActiveProfile(storage).id, p1.id);
  switchToProfile(p2.id, storage);
  assert.equal(getActiveProfile(storage).id, p2.id);
});

test("switchToProfile returns false for invalid id", () => {
  const storage = new MockStorage();
  addProfile({ seed: "s1" }, storage);
  assert.equal(switchToProfile("invalid", storage), false);
});

test("removeProfile removes and updates active", () => {
  const storage = new MockStorage();
  const p1 = addProfile({ seed: "s1" }, storage);
  const p2 = addProfile({ seed: "s2" }, storage);
  removeProfile(p1.id, storage);
  assert.equal(getProfileCount(storage), 1);
  assert.equal(getActiveProfile(storage).id, p2.id);
});

test("removeProfile sets null active when all removed", () => {
  const storage = new MockStorage();
  const p1 = addProfile({ seed: "s1" }, storage);
  removeProfile(p1.id, storage);
  assert.equal(getProfileCount(storage), 0);
  assert.equal(getActiveProfile(storage), null);
});

test("updateProfile updates fields", () => {
  const storage = new MockStorage();
  const p = addProfile({ seed: "s1", label: "Old" }, storage);
  const updated = updateProfile(p.id, { label: "New", worker_id: "github:new" }, storage);
  assert.equal(updated.label, "New");
  assert.equal(updated.worker_id, "github:new");
  assert.equal(updated.id, p.id);
});

test("updateProfile returns null for invalid id", () => {
  const storage = new MockStorage();
  assert.equal(updateProfile("invalid", { label: "X" }, storage), null);
});

test("buildProfileSnapshot produces valid snapshot", () => {
  const storage = new MockStorage();
  const p = addProfile({ seed: "snap-test", label: "Snap", workerId: "github:snap" }, storage);
  const snap = buildProfileSnapshot(p, {
    economy: mockEconomy(),
    proof: mockProof(),
    market: mockMarket(),
    solanaManifest: mockSolanaManifest(),
  });
  assert.equal(snap.kind, "wallet_snapshot");
  assert.equal(snap.vault.label, "Snap");
  assert.equal(snap.config.worker_id, "github:snap");
  assert.ok(snap.vault.address);
});

test("profiles persist across storage reads", () => {
  const storage = new MockStorage();
  addProfile({ seed: "s1" }, storage);
  addProfile({ seed: "s2" }, storage);
  const profiles = getProfilesFromStorage(storage);
  assert.equal(profiles.length, 2);
  assert.equal(profiles[0].seed, "s1");
  assert.equal(profiles[1].seed, "s2");
});

// --- Vault Import/Export tests ---

test("exportVaultToJson exports public metadata only", () => {
  const vault = createVault({ seed: "export-test", label: "Backup" });
  const exported = exportVaultToJson(vault);
  assert.equal(exported.kind, "vault_export");
  assert.equal(exported.label, "Backup");
  assert.equal(exported.address, vault.address);
  assert.equal(exported.token_symbol, "MRG");
  assert.ok(exported.exported_at);
  assert.ok(exported.notice);
  assert.equal(exported.secret_fingerprint, vault.secret_fingerprint);
  // Seed should not be in export
  assert.equal(exported.seed, undefined);
});

test("exportVaultToJson default vault", () => {
  const exported = exportVaultToJson();
  assert.equal(exported.kind, "vault_export");
  assert.ok(exported.address);
  assert.equal(exported.mock, true);
});

test("validateVaultJson validates correct export", () => {
  const vault = createVault({ seed: "validate-test" });
  const exported = exportVaultToJson(vault);
  const valid = validateVaultJson(exported);
  assert.equal(valid.valid, true);
  assert.equal(valid.address, vault.address);
});

test("validateVaultJson rejects invalid JSON", () => {
  assert.equal(validateVaultJson(null).valid, false);
  assert.ok(validateVaultJson(null).error);
  assert.equal(validateVaultJson({}).valid, false);
  assert.equal(validateVaultJson({ kind: "wrong" }).valid, false);
});

test("importVaultFromSeed creates vault from seed", () => {
  const seed = "my-secret-seed-12345";
  const vault = importVaultFromSeed(seed, { label: "Imported" });
  assert.equal(vault.label, "Imported");
  assert.ok(vault.address);
  assert.equal(vault.protocol_version, PROTOCOL_VERSION);
});

test("importVaultFromSeed requires seed", () => {
  assert.throws(() => importVaultFromSeed(null), /Seed is required/);
  assert.throws(() => importVaultFromSeed(""), /Seed is required/);
  assert.throws(() => importVaultFromSeed(123), /Seed is required/);
});

test("importVaultFromSeed validates seed length", () => {
  assert.throws(() => importVaultFromSeed("short"), /at least 8 characters/);
});

test("importVaultFromSeed with default label", () => {
  const vault = importVaultFromSeed("test-seed-abc");
  assert.equal(vault.label, "Imported");
});

test("export/import roundtrip preserves address", () => {
  const original = createVault({ seed: "roundtrip-test", label: "Original" });
  const exported = exportVaultToJson(original);
  const imported = importVaultFromSeed("roundtrip-test", { label: "Roundtrip" });
  assert.equal(imported.address, original.address);
  assert.equal(imported.label, "Roundtrip");
});
