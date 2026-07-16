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

export function solanaAddressFromEntryHash(entryHash = "") {
  const ref = ledgerReferenceBytes32(entryHash);
  return ref ? base58Encode(Buffer.from(ref, "hex")) : null;
}

export function solanaExplorerAddressUrl(address = "", chain = "solana") {
  const a = String(address || "").trim();
  if (!a) return null;
  const cluster = String(chain || "").toLowerCase().includes("devnet") ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/address/${encodeURIComponent(a)}${cluster}`;
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

export function summarizeSolana(manifest = null, ledger = null) {
  const m = manifest || {};
  const entryHash =
    (ledger && (ledger.ledger_reference || ledger.tip_hash || ledger.public_root_hash || ledger.root_hash)) ||
    "";
  const hasBinding = Boolean(manifest && m.program_id);
  const entryAddress = hasBinding ? solanaAddressFromEntryHash(entryHash) : null;
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
    entry_hash: entryHash || null,
    entry_address: entryAddress,
    explorer_url: entryAddress ? solanaExplorerAddressUrl(entryAddress, m.target_chain) : null,
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

export function buildWalletSnapshot({
  vault = null,
  economy = {},
  proof = {},
  market = {},
  solanaManifest = null,
  workerId = "",
} = {}) {
  const v = vault || createVault();
  const token = summarizeTokenEconomy(economy);
  const ledger = summarizeLedgerProof(proof);
  const solana = summarizeSolana(solanaManifest, ledger);
  const bounties = discoverClaimableBounties(market, 10);
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
