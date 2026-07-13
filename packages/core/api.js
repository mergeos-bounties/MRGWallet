/**
 * Public MergeOS fetch helpers (browser + Node).
 */

import { SHOP_BASE } from "./wallet.js";

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`invalid JSON from ${url}`);
  }
  if (!res.ok) {
    throw new Error(body?.error || `${res.status} ${res.statusText}`);
  }
  return body;
}

export async function fetchTokenEconomy(base = SHOP_BASE) {
  return getJson(`${base.replace(/\/$/, "")}/api/public/token-economy`);
}

export async function fetchLedgerProof(base = SHOP_BASE) {
  return getJson(`${base.replace(/\/$/, "")}/api/public/ledger/proof`);
}

export async function fetchMarketplace(base = SHOP_BASE, limit = 40) {
  return getJson(`${base.replace(/\/$/, "")}/api/public/marketplace?limit=${encodeURIComponent(limit)}`);
}

export async function fetchSolanaManifest(base = SHOP_BASE) {
  try {
    return await getJson(
      `${base.replace(/\/$/, "")}/contracts/solana/mergeos_mrg.proof-manifest.v1.json`,
    );
  } catch {
    return null;
  }
}

export async function fetchLiveWalletBundle(base = SHOP_BASE) {
  const [economy, proof, market, solanaManifest] = await Promise.all([
    fetchTokenEconomy(base),
    fetchLedgerProof(base),
    fetchMarketplace(base),
    fetchSolanaManifest(base),
  ]);
  return { economy, proof, market, solanaManifest, source: "live" };
}
