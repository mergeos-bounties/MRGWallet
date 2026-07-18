/**
 * Browser core for MRGWallet (no Node APIs).
 * Kept in sync with packages/core for UI / extensions / Android WebView.
 */
(function (global) {
  const SHOP_BASE = "https://mergeos.shop";
  const SCAN_BASE = "https://scan.mergeos.shop";
  const DEFAULT_SOLANA_PROGRAM_ID = "4gUBWum3fGKfm7BeGXryzXjPDBDLfhVJRcjN5MPnfDNW";
  const PROTOCOL_VERSION = "mrgwallet.core.v1";
  const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const TITLE_MRG_RE =
    /\[(\d+(?:\.\d+)?)\s*MRG\]|\((\d+(?:\.\d+)?)\s*MRG\)|(?:^|[\s|:/-])(\d+(?:\.\d+)?)\s*MRG(?:\b|$)/i;

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(String(text));
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function base58Encode(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
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

  async function deriveAddress(seed = "mrgwallet:local") {
    const hex = await sha256Hex(seed);
    const hash = new Uint8Array(hex.match(/.{1,2}/g).map((x) => parseInt(x, 16)));
    return base58Encode(hash);
  }

  async function createVault({ seed = "mrgwallet:local", label = "Primary" } = {}) {
    const address = await deriveAddress(seed);
    const secretHash = await sha256Hex(`secret:${seed}:${address}`);
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

  function mrgFromCents(cents) {
    const n = Number(cents || 0);
    if (!Number.isFinite(n) || n === 0) return 0;
    if (Math.abs(n) >= 1000 && n % 100 === 0) return n / 100;
    return n;
  }

  function scanAddressUrl(address) {
    const a = String(address || "").trim();
    return a ? `${SCAN_BASE}/address/${encodeURIComponent(a)}` : null;
  }

  function scanTxUrl(hash) {
    const h = String(hash || "").trim();
    return h ? `${SCAN_BASE}/tx/${encodeURIComponent(h)}` : null;
  }

  function getWalletConfigState(workerId = "") {
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

  function ledgerReferenceBytes32(hexOrObj = {}) {
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

  function summarizeTokenEconomy(economy = {}) {
    const totals = economy.totals || {};
    return {
      token_symbol: economy.token_symbol || "MRG",
      minted_cents: totals.minted_cents || 0,
      remaining_reserve_cents: totals.remaining_reserve_cents || 0,
      released_cents: totals.released_cents || 0,
      ledger_entry_count: (economy.stats && economy.stats.ledger_entry_count) || 0,
    };
  }

  function summarizeLedgerProof(proof = {}) {
    const entries = Array.isArray(proof.entries) ? proof.entries : [];
    const tip = entries.length ? entries[entries.length - 1] : null;
    const tipHash = (tip && tip.entry_hash) || proof.root_hash || "";
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

  function summarizeSolana(manifest = null) {
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

  function summarizeShareEarnings(source = {}) {
    const s = source.share_earnings || source.earnings || source.mrgminer || {};
    const pending = Number(s.pending_mrg || s.pending || 0);
    const paid = Number(s.paid_mrg || s.paid || 0);
    const lifetime = Number(s.lifetime_mrg || s.total_mrg || pending + paid);
    const activeShares = Number(s.active_shares || s.shares || 0);
    return {
      source: s.source || "mock",
      worker_id: s.worker_id || null,
      active_shares: Number.isFinite(activeShares) ? activeShares : 0,
      pending_mrg: Number.isFinite(pending) ? pending : 0,
      paid_mrg: Number.isFinite(paid) ? paid : 0,
      lifetime_mrg: Number.isFinite(lifetime) ? lifetime : 0,
      last_settlement: s.last_settlement || "not settled",
      payout_status: s.payout_status || "mock-estimate",
    };
  }

  function resolveRewardMrg(item = {}) {
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

  function discoverClaimableBounties(market = {}, limit = 12) {
    const bounties = Array.isArray(market.bounties) ? market.bounties : [];
    return bounties
      .filter((b) => {
        const st = String(b.status || "open").toLowerCase();
        return !st || st === "open" || st === "funded" || st === "available";
      })
      .slice(0, Math.max(1, Math.min(limit, 50)))
      .map((b) => {
        const id = b.claim_id || b.id || b.task_id || "";
        return {
          id,
          title: b.title || id,
          project_id: b.project_id || "",
          reward_mrg: resolveRewardMrg(b),
          worker_kind: b.required_worker_kind || b.worker_kind || "human",
          repo: b.source_repository || b.repo_url || "",
        };
      });
  }

  async function buildWalletClaimReceipt({
    vault = null,
    bounty = {},
    proof = null,
    solana = null,
    workerId = "",
  } = {}) {
    const v = vault || (await createVault());
    const tip =
      (proof && (proof.tip_hash || proof.public_root_hash || proof.root_hash)) ||
      (proof && proof.tip && proof.tip.entry_hash) ||
      "";
    const reward = resolveRewardMrg(bounty);
    const taskId = bounty.id || bounty.claim_id || bounty.task_id || "";
    const material = [v.address, taskId, tip, reward, workerId].join("|");
    const receiptHash = await sha256Hex(material);
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

  async function buildWalletSnapshot({
    vault = null,
    economy = {},
    proof = {},
    market = {},
    solanaManifest = null,
    workerId = "",
  } = {}) {
    const v = vault || (await createVault());
    const token = summarizeTokenEconomy(economy);
    const ledger = summarizeLedgerProof(proof);
    const solana = summarizeSolana(solanaManifest);
    const shareEarnings = summarizeShareEarnings(market);
    const bounties = discoverClaimableBounties(market, 10);
    const config = getWalletConfigState(workerId);
    const receipt = bounties[0]
      ? await buildWalletClaimReceipt({
          vault: v,
          bounty: bounties[0],
          proof: ledger,
          solana,
          workerId,
        })
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
      share_earnings: shareEarnings,
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

  function mockEconomy() {
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

  function mockProof() {
    const tip = "a".repeat(64);
    return {
      valid: true,
      entry_count: 40,
      verified_count: 40,
      broken_count: 0,
      root_hash: tip,
      public_root_hash: "b".repeat(64),
      entries: [{ sequence: 40, type: "ledger_manual_credit", entry_hash: tip, amount_cents: 25 }],
    };
  }

  function mockMarket() {
    return {
      share_earnings: {
        source: "mock:mrgminer",
        worker_id: "github:demo",
        active_shares: 3,
        pending_mrg: 12.5,
        paid_mrg: 37.5,
        lifetime_mrg: 50,
        last_settlement: "2026-07-15T00:00:00Z",
        payout_status: "pending-admin-ledger",
      },
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

  function mockSolanaManifest() {
    return {
      program: "mergeos_mrg",
      program_id: DEFAULT_SOLANA_PROGRAM_ID,
      target_chain: "solana",
      token_symbol: "MRG",
    };
  }

  async function mockWalletSnapshot(workerId = "github:demo") {
    return buildWalletSnapshot({
      vault: await createVault({ seed: "mrgwallet:demo", label: "Demo" }),
      economy: mockEconomy(),
      proof: mockProof(),
      market: mockMarket(),
      solanaManifest: mockSolanaManifest(),
      workerId,
    });
  }

  async function getJson(url) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`invalid JSON from ${url}`);
    }
    if (!res.ok) throw new Error((body && body.error) || `${res.status} ${res.statusText}`);
    return body;
  }

  async function fetchTokenEconomy(base = SHOP_BASE) {
    return getJson(`${String(base).replace(/\/$/, "")}/api/public/token-economy`);
  }
  async function fetchLedgerProof(base = SHOP_BASE) {
    return getJson(`${String(base).replace(/\/$/, "")}/api/public/ledger/proof`);
  }
  async function fetchMarketplace(base = SHOP_BASE, limit = 40) {
    return getJson(
      `${String(base).replace(/\/$/, "")}/api/public/marketplace?limit=${encodeURIComponent(limit)}`,
    );
  }
  async function fetchSolanaManifest(base = SHOP_BASE) {
    try {
      return await getJson(
        `${String(base).replace(/\/$/, "")}/contracts/solana/mergeos_mrg.proof-manifest.v1.json`,
      );
    } catch {
      return null;
    }
  }
  async function fetchLiveWalletBundle(base = SHOP_BASE) {
    const [economy, proof, market, solanaManifest] = await Promise.all([
      fetchTokenEconomy(base),
      fetchLedgerProof(base),
      fetchMarketplace(base),
      fetchSolanaManifest(base),
    ]);
    return { economy, proof, market, solanaManifest, source: "live" };
  }

  global.MRGWallet = {
    SHOP_BASE,
    SCAN_BASE,
    DEFAULT_SOLANA_PROGRAM_ID,
    PROTOCOL_VERSION,
    sha256Hex,
    base58Encode,
    deriveAddress,
    createVault,
    mrgFromCents,
    scanAddressUrl,
    scanTxUrl,
    getWalletConfigState,
    ledgerReferenceBytes32,
    summarizeTokenEconomy,
    summarizeLedgerProof,
    summarizeSolana,
    resolveRewardMrg,
    discoverClaimableBounties,
    buildWalletClaimReceipt,
    buildWalletSnapshot,
    mockEconomy,
    mockProof,
    mockMarket,
    mockSolanaManifest,
    mockWalletSnapshot,
    fetchTokenEconomy,
    fetchLedgerProof,
    fetchMarketplace,
    fetchSolanaManifest,
    fetchLiveWalletBundle,
  };
})(typeof window !== "undefined" ? window : globalThis);
