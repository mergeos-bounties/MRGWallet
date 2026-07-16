import test from "node:test";
import assert from "node:assert/strict";
import {
  createVault,
  deriveAddress,
  mockWalletSnapshot,
  buildWalletClaimReceipt,
  getWalletConfigState,
  summarizeShareEarnings,
  resolveRewardMrg,
  discoverClaimableBounties,
  mockMarket,
  mockProof,
  mockSolanaManifest,
  summarizeLedgerProof,
  ledgerReferenceBytes32,
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
  assert.equal(s.share_earnings.pending_mrg, 12.5);
  assert.equal(s.share_earnings.payout_status, "pending-admin-ledger");
  assert.ok(s.sample_receipt.ready);
});

test("share earnings summary supports offline MRGMinner-style mock data", () => {
  const summary = summarizeShareEarnings({
    mrgminer: {
      source: "file:mrgminer-shares.json",
      worker_id: "github:worker",
      active_shares: 4,
      pending_mrg: "8.5",
      paid_mrg: 16,
      payout_status: "ready",
    },
  });
  assert.equal(summary.source, "file:mrgminer-shares.json");
  assert.equal(summary.worker_id, "github:worker");
  assert.equal(summary.active_shares, 4);
  assert.equal(summary.pending_mrg, 8.5);
  assert.equal(summary.paid_mrg, 16);
  assert.equal(summary.lifetime_mrg, 24.5);
  assert.equal(summary.payout_status, "ready");
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
