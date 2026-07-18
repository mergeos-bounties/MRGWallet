/**
 * MRGWallet core — offline-safe wallet model + MergeOS public discovery.
 * No private keys leave the local vault JSON; mock mode is default.
 */

import crypto from "node:crypto";

export const SHOP_BASE = "https://mergeos.shop";
export const SCAN_BASE = "https://scan.mergeos.shop";
export const DEFAULT_SOLANA_PROGRAM_ID = "4gUBWum3fGKfm7BeGXryzXjPDBDLfhVJRcjN5MPnfDNW";
export const PROTOCOL_VERSION = "mrgwallet.core.v1";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function sha256Hex(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

export function base58Encode(buf) {
  const bytes = Buffer.from(buf);
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
  const digits = [0];
  for (let i = zeros; i < bytes.length; i += 1) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j += 1) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i -= 1) out += BASE58[digits[i]];
  return out;
}

/** Deterministic mock Solana-style address from seed (not a real keypair). */
export function deriveAddress(seed = "mrgwallet:local") {
  const hash = crypto.createHash("sha256").update(String(seed)).digest();
  return base58Encode(hash);
}

export function createVault({ seed = "mrgwallet:local", label = "Primary" } = {}) {
  const address = deriveAddress(seed);
  const secretHash = sha256Hex(`secret:${seed}:${address}`);
  return {
    protocol_version: PROTOCOL_VERSION,
    kind: "vault",
    label,
    address,
    secret_fingerprint: secretHash.slice(0, 16),
    network: "solana",
    token_symbol: "MRG",
    created_at: new Date().toISOString(),
    mock: true,
    notice: "Mock vault — replace with hardware/software wallet seed import for production.",
  };
}

export function mrgFromCents(cents) {
  const n = Number(cents || 0);
  if (!Number.isFinite(n) || n === 0) return 0;
  if (Math.abs(n) >= 1000 && n % 100 === 0) return n / 100;
  return n;
}

export function scanAddressUrl(address) {
  const a = String(address || "").trim();
  return a ? `${SCAN_BASE}/address/${encodeURIComponent(a)}` : null;
}

export function scanTxUrl(hash) {
  const h = String(hash || "").trim();
  return h ? `${SCAN_BASE}/tx/${encodeURIComponent(h)}` : null;
}

export function getWalletConfigState(workerId = "") {
  const id = String(workerId || "").trim();
  if (!id) {
    return {
      status: "needs_configuration",
      ready: false,
      title: "Configure your wallet",
      message: "Add your GitHub worker ID before creating claim receipts.",
      cta: "Open Settings",
      worker_id: null,
    };
  }
  return {
    status: "ready",
    ready: true,
    title: "Wallet configured",
    message: "Claim receipts will include your GitHub worker ID.",
    cta: "Edit Settings",
    worker_id: id,
  };
}

export function ledgerReferenceBytes32(hexOrObj = {}) {
  const hex = String(
    (typeof hexOrObj === "string" ? hexOrObj : null) ||
      hexOrObj.entry_hash ||
      hexOrObj.public_root_hash ||
      hexOrObj.root_hash ||
      "",
  )
    .trim()
    .toLowerCase()
    .replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(hex) ? hex : null;
}

export function summarizeTokenEconomy(economy = {}) {
  const totals = economy.totals || {};
  return {
    token_symbol: economy.token_symbol || "MRG",
    minted_cents: totals.minted_cents || 0,
    remaining_reserve_cents: totals.remaining_reserve_cents || 0,
    released_cents: totals.released_cents || 0,
    ledger_entry_count: (economy.stats && economy.stats.ledger_entry_count) || 0,
  };
}

export function summarizeLedgerProof(proof = {}) {
  const entries = Array.isArray(proof.entries) ? proof.entries : [];
  const tip = entries.length ? entries[entries.length - 1] : null;
  const tipHash = tip?.entry_hash || proof.root_hash || "";
  return {
    valid: Boolean(proof.valid),
    entry_count: proof.entry_count || entries.length,
    verified_count: proof.verified_count || 0,
    broken_count: proof.broken_count || 0,
    root_hash: proof.root_hash || "",
    public_root_hash: proof.public_root_hash || "",
    tip_hash: tipHash,
    ledger_reference: ledgerReferenceBytes32(tipHash || proof.public_root_hash || proof.root_hash),
    scan_tx: tipHash ? scanTxUrl(tipHash) : null,
  };
}

export function summarizeSolana(manifest = null) {
  const m = manifest || {};
  return {
    program: m.program || "mergeos_mrg",
    program_id: m.program_id || DEFAULT_SOLANA_PROGRAM_ID,
    target_chain: m.target_chain || "solana",
    token_symbol: m.token_symbol || "MRG",
    status: m.program_id ? "manifest" : "scaffold",
    idl_url: m.idl_url || `${SHOP_BASE}/contracts/solana/mergeos_mrg.v1.idl.json`,
    public_manifest_url:
      m.public_manifest_url || `${SHOP_BASE}/contracts/solana/mergeos_mrg.proof-manifest.v1.json`,
    release_instruction: "releasePayout",
  };
}

const TITLE_MRG_RE =
  /\[(\d+(?:\.\d+)?)\s*MRG\]|\((\d+(?:\.\d+)?)\s*MRG\)|(?:^|[\s|:/-])(\d+(?:\.\d+)?)\s*MRG(?:\b|$)/i;

export function resolveRewardMrg(item = {}) {
  const m = String(item.title || "").match(TITLE_MRG_RE);
  if (m) {
    const n = Number(m[1] || m[2] || m[3]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (item.reward_mrg != null && Number.isFinite(Number(item.reward_mrg))) {
    const v = Number(item.reward_mrg);
    if (Number.isInteger(v) && v > 0 && v <= 10000) return v;
  }
  return mrgFromCents(item.reward_cents || 0);
}

export function discoverClaimableBounties(market = {}, limit = 12) {
  const bounties = Array.isArray(market.bounties) ? market.bounties : [];
  return bounties
    .filter((b) => {
      const st = String(b.status || "open").toLowerCase();
      return !st || st === "open" || st === "funded" || st === "available";
    })
    .slice(0, Math.max(1, Math.min(limit, 50)))
    .map((b) => {
      const id = b.claim_id || b.id || b.task_id || "";
      const reward = resolveRewardMrg(b);
      return {
        id,
        title: b.title || id,
        project_id: b.project_id || "",
        reward_mrg: reward,
        worker_kind: b.required_worker_kind || b.worker_kind || "human",
        repo: b.source_repository || b.repo_url || "",
      };
    });
}

/**
 * Build a wallet claim receipt bound to address + ledger tip (discoverable, not auto-payout).
 */
export function buildWalletClaimReceipt({
  vault = null,
  bounty = {},
  proof = null,
  solana = null,
  workerId = "",
} = {}) {
  const v = vault || createVault();
  const tip =
    (proof && (proof.tip_hash || proof.public_root_hash || proof.root_hash)) ||
    (proof && proof.tip && proof.tip.entry_hash) ||
    "";
  const reward = resolveRewardMrg(bounty);
  const taskId = bounty.id || bounty.claim_id || bounty.task_id || "";
  const material = [v.address, taskId, tip, reward, workerId].join("|");
  const receiptHash = sha256Hex(material);
  const ledgerRef = ledgerReferenceBytes32(tip || proof || {});
  return {
    protocol_version: "mrgwallet.claim-receipt.v1",
    kind: "wallet_claim_receipt",
    ready: Boolean(v.address && taskId && tip),
    receipt_id: `rcpt_${receiptHash.slice(0, 16)}`,
    receipt_hash: receiptHash,
    address: v.address,
    worker_id: workerId || null,
    task_id: taskId,
    title: bounty.title || "",
    reward_mrg: reward,
    ledger_tip_hash: tip || null,
    ledger_reference: ledgerRef,
    solana: solana
      ? {
          program_id: solana.program_id,
          release_instruction: "releasePayout",
          ledger_reference: ledgerRef,
        }
      : null,
    scan_address: scanAddressUrl(v.address),
    scan_tx: tip ? scanTxUrl(tip) : null,
    notice:
      "Payout release requires owner/admin accept on MergeOS (optional Solana releasePayout). This receipt only binds wallet address to ledger proof.",
    formed_at: new Date().toISOString(),
  };
}

/**
 * Export vault as a JSON-safe object — public metadata only, NO seed/private key.
 */
export function exportVault(address, label, fingerprint) {
  if (!address || typeof address !== "string") throw new Error("exportVault: address is required");
  return {
    protocol_version: PROTOCOL_VERSION,
    kind: "vault_export",
    address,
    label: label || "",
    secret_fingerprint: fingerprint || "",
    network: "solana",
    token_symbol: "MRG",
    mock: true,
    exported_at: new Date().toISOString(),
  };
}

/**
 * Import a vault export JSON string — validates structure, returns parsed data.
 * Does NOT import or restore any seed/private key material.
 */
export function importVault(jsonString) {
  if (!jsonString || typeof jsonString !== "string") {
    throw new Error("importVault: expected a JSON string");
  }
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error("importVault: invalid JSON");
  }
  if (!data || typeof data !== "object") throw new Error("importVault: exported data must be an object");
  if (data.kind !== "vault_export") throw new Error("importVault: kind must be 'vault_export'");
  if (!data.protocol_version) throw new Error("importVault: missing protocol_version");
  if (!data.address || typeof data.address !== "string") throw new Error("importVault: missing or invalid address");
  if (!data.exported_at) throw new Error("importVault: missing exported_at");
  return data;
}

export function buildWalletSnapshot({
  vault = null,
  economy = {},
  proof = {},
  market = {},
  solanaManifest = null,
  bandwidthShare = null,
  workerId = "",
} = {}) {
  const v = vault || createVault();
  const token = summarizeTokenEconomy(economy);
  const ledger = summarizeLedgerProof(proof);
  ledger.entries = Array.isArray(proof.entries) ? proof.entries : [];
  const solana = summarizeSolana(solanaManifest);
  const bounties = discoverClaimableBounties(market, 10);
  const bw = bandwidthShare || mockBandwidthShare();
  const config = getWalletConfigState(workerId);
  const receipt = bounties[0]
    ? buildWalletClaimReceipt({ vault: v, bounty: bounties[0], proof: ledger, solana, workerId })
    : null;
  return {
    protocol_version: PROTOCOL_VERSION,
    kind: "wallet_snapshot",
    vault: {
      label: v.label,
      address: v.address,
      network: v.network,
      token_symbol: v.token_symbol,
      mock: v.mock,
      scan: scanAddressUrl(v.address),
    },
    token,
    ledger,
    solana,
    bandwidth_share: bw,
    config,
    claimable: bounties,
    sample_receipt: receipt,
    explore: {
      shop: SHOP_BASE,
      scan: SCAN_BASE,
      token_economy: `${SHOP_BASE}/api/public/token-economy`,
      ledger_proof: `${SHOP_BASE}/api/public/ledger/proof`,
      marketplace: `${SHOP_BASE}/api/public/marketplace`,
    },
    generated_at: new Date().toISOString(),
  };
}

export function mockEconomy() {
  return {
    token_symbol: "MRG",
    stats: { ledger_entry_count: 16 },
    totals: {
      minted_cents: 500000,
      remaining_reserve_cents: 447500,
      released_cents: 2500,
    },
  };
}

const _MOCK_HASHES = [
  "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
  "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
  "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
  "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
  "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
  "e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683",
  "7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451",
  "2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3",
  "19581e27de7ced00ff1ce50b2047e7a567c76b1cbaebabe5ef03f7c3017bb5b7",
  "4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5",
  "4fc82b26aecb47d2868c4efbe3581732a3e7cbcc6c2efb32062c08170a05eeb8",
  "6b51d431df5d7f141cbececcf79edf3dd861c3b4069f0b11661a3eefacbba918",
  "3fdba35f04dc8c462986c992bcf875546257113072a909c162f7e470e581e278",
  "8527a891e224136950ff32ca212b45bc93f69fbb801c3b1ebedac52775f99e61",
  "e629fa6598d732768f7c726b4b621285f9c3b85303900aa912017db7617d8bdb",
  "b17ef6d19c7a5b1ee83b907c595526dcb1eb06db8227d650d5dda0a9f4ce8cd9",
];

export function mockLedgerEntries() {
  return [
    { sequence: 1,  date: "2026-01-05T10:30:00Z",  bounty_type: "bug",     title: "Fix login crash",        amount_cents: 2500,  entry_hash: _MOCK_HASHES[0] },
    { sequence: 2,  date: "2026-01-18T14:15:00Z",  bounty_type: "feature", title: "Dark mode toggle",        amount_cents: 5000,  entry_hash: _MOCK_HASHES[1] },
    { sequence: 3,  date: "2026-02-02T09:00:00Z",  bounty_type: "qa",      title: "E2E test suite",          amount_cents: 1500,  entry_hash: _MOCK_HASHES[2] },
    { sequence: 4,  date: "2026-02-14T11:45:00Z",  bounty_type: "docs",    title: "API reference docs",      amount_cents: 1000,  entry_hash: _MOCK_HASHES[3] },
    { sequence: 5,  date: "2026-02-28T16:30:00Z",  bounty_type: "payment", title: "Milestone payout Q1",     amount_cents: 10000, entry_hash: _MOCK_HASHES[4] },
    { sequence: 6,  date: "2026-03-10T08:20:00Z",  bounty_type: "bug",     title: "Memory leak fix",         amount_cents: 3000,  entry_hash: _MOCK_HASHES[5] },
    { sequence: 7,  date: "2026-03-22T13:10:00Z",  bounty_type: "feature", title: "Export CSV feature",      amount_cents: 4500,  entry_hash: _MOCK_HASHES[6] },
    { sequence: 8,  date: "2026-04-05T17:00:00Z",  bounty_type: "qa",      title: "Regression tests",        amount_cents: 2000,  entry_hash: _MOCK_HASHES[7] },
    { sequence: 9,  date: "2026-04-19T12:30:00Z",  bounty_type: "docs",    title: "User guide update",       amount_cents: 800,   entry_hash: _MOCK_HASHES[8] },
    { sequence: 10, date: "2026-05-01T09:45:00Z",  bounty_type: "payment", title: "Milestone payout Q2",     amount_cents: 12000, entry_hash: _MOCK_HASHES[9] },
    { sequence: 11, date: "2026-05-15T15:20:00Z",  bounty_type: "bug",     title: "Auth token refresh bug",  amount_cents: 3500,  entry_hash: _MOCK_HASHES[10] },
    { sequence: 12, date: "2026-06-01T11:00:00Z",  bounty_type: "feature", title: "Webhook integration",      amount_cents: 6000,  entry_hash: _MOCK_HASHES[11] },
    { sequence: 13, date: "2026-06-12T10:30:00Z",  bounty_type: "qa",      title: "Performance benchmarks",  amount_cents: 1800,  entry_hash: _MOCK_HASHES[12] },
    { sequence: 14, date: "2026-06-25T14:00:00Z",  bounty_type: "docs",    title: "Contributing guide",      amount_cents: 700,   entry_hash: _MOCK_HASHES[13] },
    { sequence: 15, date: "2026-07-04T08:00:00Z",  bounty_type: "payment", title: "Milestone payout Q3",     amount_cents: 15000, entry_hash: _MOCK_HASHES[14] },
    { sequence: 16, date: "2026-07-10T16:45:00Z",  bounty_type: "bug",     title: "CSS layout issue",        amount_cents: 1200,  entry_hash: _MOCK_HASHES[15] },
  ];
}

export function mockProof() {
  const entries = mockLedgerEntries();
  const tip = "a".repeat(64);
  return {
    valid: true,
    entry_count: entries.length,
    verified_count: entries.length,
    broken_count: 0,
    root_hash: tip,
    public_root_hash: "b".repeat(64),
    entries,
  };
}

export function mockMarket() {
  return {
    bounties: [
      {
        id: "prj_demo:1",
        title: "Fix #1: [25 MRG] Wallet docs screenshots",
        project_id: "prj_demo",
        status: "open",
        required_worker_kind: "human",
      },
      {
        id: "prj_demo:2",
        title: "Fix #2: [50 MRG] Chrome popup balance UI",
        project_id: "prj_demo",
        status: "open",
      },
    ],
  };
}

export function mockSolanaManifest() {
  return {
    program: "mergeos_mrg",
    program_id: DEFAULT_SOLANA_PROGRAM_ID,
    target_chain: "solana",
    token_symbol: "MRG",
  };
}

export function mockBandwidthShare() {
  return {
    total_bytes_shared: 2457600000,
    sessions_count: 12,
    mrg_earned: 0,
    status: "offline",
  };
}

export function mockWalletSnapshot(workerId = "github:demo") {
  return buildWalletSnapshot({
    vault: createVault({ seed: "mrgwallet:demo", label: "Demo" }),
    economy: mockEconomy(),
    proof: mockProof(),
    market: mockMarket(),
    solanaManifest: mockSolanaManifest(),
    workerId,
  });
}

/**
 * Multi-wallet profile manager — supports switching between worker identities.
 */

const PROFILES_STORAGE_KEY = "mrgwallet_profiles";
const ACTIVE_PROFILE_KEY = "mrgwallet_active_profile";

export function generateProfileId() {
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createWalletProfile({ seed, label = "Primary", workerId = "" } = {}) {
  const profileId = generateProfileId();
  const vault = createVault({ seed, label });
  return {
    id: profileId,
    label,
    seed,
    worker_id: workerId,
    address: vault.address,
    created_at: new Date().toISOString(),
  };
}

export function getProfilesFromStorage(storage = localStorage) {
  try {
    const raw = storage.getItem(PROFILES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProfilesToStorage(profiles, storage = localStorage) {
  storage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

export function getActiveProfileId(storage = localStorage) {
  return storage.getItem(ACTIVE_PROFILE_KEY) || null;
}

export function setActiveProfileId(profileId, storage = localStorage) {
  storage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

export function getActiveProfile(storage = localStorage) {
  const activeId = getActiveProfileId(storage);
  const profiles = getProfilesFromStorage(storage);
  if (!activeId) return profiles[0] || null;
  return profiles.find((p) => p.id === activeId) || profiles[0] || null;
}

export function addProfile({ seed, label = "Primary", workerId = "" } = {}, storage = localStorage) {
  const profiles = getProfilesFromStorage(storage);
  const profile = createWalletProfile({ seed, label, workerId });
  profiles.push(profile);
  saveProfilesToStorage(profiles, storage);
  if (profiles.length === 1) {
    setActiveProfileId(profile.id, storage);
  }
  return profile;
}

export function removeProfile(profileId, storage = localStorage) {
  const profiles = getProfilesFromStorage(storage);
  const filtered = profiles.filter((p) => p.id !== profileId);
  saveProfilesToStorage(filtered, storage);
  const activeId = getActiveProfileId(storage);
  if (activeId === profileId) {
    setActiveProfileId(filtered[0]?.id || null, storage);
  }
  return filtered;
}

export function updateProfile(profileId, updates, storage = localStorage) {
  const profiles = getProfilesFromStorage(storage);
  const idx = profiles.findIndex((p) => p.id === profileId);
  if (idx === -1) return null;
  profiles[idx] = { ...profiles[idx], ...updates, id: profileId };
  saveProfilesToStorage(profiles, storage);
  return profiles[idx];
}

export function switchToProfile(profileId, storage = localStorage) {
  const profiles = getProfilesFromStorage(storage);
  const exists = profiles.some((p) => p.id === profileId);
  if (!exists) return false;
  setActiveProfileId(profileId, storage);
  return true;
}

export function getProfileCount(storage = localStorage) {
  return getProfilesFromStorage(storage).length;
}

export function buildProfileSnapshot(profile, { economy = {}, proof = {}, market = {}, solanaManifest = null } = {}) {
  const vault = createVault({ seed: profile.seed, label: profile.label });
  return buildWalletSnapshot({
    vault,
    economy,
    proof,
    market,
    solanaManifest,
    workerId: profile.worker_id,
  });
}
