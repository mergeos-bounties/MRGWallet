#!/usr/bin/env node
import { mockWalletSnapshot } from "../packages/core/wallet.js";

const snap = mockWalletSnapshot("github:demo");
console.log(
  JSON.stringify(
    {
      address: snap.vault.address,
      token: snap.token,
      ledger_tip: snap.ledger.tip_hash?.slice(0, 16) + "…",
      solana: snap.solana.program_id,
      claimable: snap.claimable.length,
      receipt: snap.sample_receipt?.receipt_id,
    },
    null,
    2,
  ),
);
console.log("mrgwallet demo complete (mock)");
