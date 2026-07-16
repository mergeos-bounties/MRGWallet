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
  summarizeLedgerProof,
  summarizeSolana,
  ledgerReferenceBytes32,
  solanaAddressFromEntryHash,
  solanaExplorerAddressUrl,
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

test("solana entry hash link-out is derived from bytes32 ledger reference", () => {
  const entryHash = "ab".repeat(32);
  const address = solanaAddressFromEntryHash(entryHash);
  assert.ok(address);
  assert.match(solanaExplorerAddressUrl(address), /^https:\/\/explorer\.solana\.com\/address\//);

  const solana = summarizeSolana(mockSolanaManifest(), { ledger_reference: entryHash });
  assert.equal(solana.entry_hash, entryHash);
  assert.equal(solana.entry_address, address);
  assert.match(solana.explorer_url, /^https:\/\/explorer\.solana\.com\/address\//);
});

test("solana entry hash link-out is safe when missing", () => {
  assert.equal(solanaAddressFromEntryHash("not-a-bytes32"), null);

  const solana = summarizeSolana(null, {});
  assert.equal(solana.entry_hash, null);
  assert.equal(solana.entry_address, null);
  assert.equal(solana.explorer_url, null);
});

test("mock wallet snapshot is complete", () => {
  const s = mockWalletSnapshot();
  assert.equal(s.kind, "wallet_snapshot");
  assert.ok(s.vault.address);
  assert.ok(s.token.minted_cents > 0);
  assert.ok(s.ledger.tip_hash);
  assert.ok(s.solana.program_id);
  assert.ok(s.solana.explorer_url);
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
