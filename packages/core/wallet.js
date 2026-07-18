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
    stats: { ledger_entry_count: 40 },
    totals: {
      minted_cents: 500000,
      remaining_reserve_cents: 447500,
      released_cents: 2500,
    },
  };
}

export function mockProof() {
  const tip = "a".repeat(64);
  return {
    valid: true,
    entry_count: 40,
    verified_count: 40,
    broken_count: 0,
    root_hash: tip,
    public_root_hash: "b".repeat(64),
    entries: [
      {
        sequence: 40,
        type: "ledger_manual_credit",
        entry_hash: tip,
        amount_cents: 25,
      },
    ],
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
