/* global MRGWallet */
(function () {
  const $ = (id) => document.getElementById(id);

  function kv(el, rows) {
    el.innerHTML = rows
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v ?? "—"}</dd></div>`)
      .join("");
  }

  function short(h, n = 12) {
    if (!h) return "—";
    const s = String(h);
    return s.length <= n * 2 ? s : `${s.slice(0, n)}…${s.slice(-6)}`;
  }

  async function render(snapshot, mode) {
    $("mode-badge").textContent = mode;
    $("mode-badge").classList.toggle("live", mode === "live");
    $("address").textContent = snapshot.vault.address;
    $("link-scan").href = snapshot.vault.scan || "https://scan.mergeos.shop";
    kv($("token-dl"), [
      ["Symbol", snapshot.token.token_symbol],
      ["Minted", snapshot.token.minted_cents],
      ["Reserve", snapshot.token.remaining_reserve_cents],
      ["Released", snapshot.token.released_cents],
      ["Entries", snapshot.token.ledger_entry_count],
    ]);
    kv($("ledger-dl"), [
      ["Server valid", String(snapshot.ledger.valid)],
      ["Entries", snapshot.ledger.entry_count],
      ["Verified", snapshot.ledger.verified_count],
      ["Broken", snapshot.ledger.broken_count],
      ["Tip", short(snapshot.ledger.tip_hash)],
      ["Ledger ref", short(snapshot.ledger.ledger_reference)],
    ]);
    kv($("solana-dl"), [
      ["Program", snapshot.solana.program],
      ["Program id", short(snapshot.solana.program_id, 10)],
      ["Chain", snapshot.solana.target_chain],
      ["Status", snapshot.solana.status],
      ["Release ix", snapshot.solana.release_instruction],
    ]);
    const list = $("bounty-list");
    list.innerHTML = "";
    for (const b of snapshot.claimable) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${b.id}<br/><span class="muted">${escapeHtml(b.title)}</span></span><span class="reward">${b.reward_mrg} MRG</span>`;
      list.appendChild(li);
    }
    if (!snapshot.claimable.length) {
      list.innerHTML = `<li><span class="muted">No open bounties discovered</span></li>`;
    }
    $("receipt").textContent = snapshot.sample_receipt
      ? JSON.stringify(snapshot.sample_receipt, null, 2)
      : "—";
    $("generated").textContent = snapshot.generated_at || "";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function loadMock() {
    const seed = localStorage.getItem("mrgwallet_seed") || "mrgwallet:local";
    localStorage.setItem("mrgwallet_seed", seed);
    const vault = await MRGWallet.createVault({ seed, label: "Primary" });
    const snap = await MRGWallet.buildWalletSnapshot({
      vault,
      economy: MRGWallet.mockEconomy(),
      proof: MRGWallet.mockProof(),
      market: MRGWallet.mockMarket(),
      solanaManifest: MRGWallet.mockSolanaManifest(),
      workerId: localStorage.getItem("mrgwallet_worker") || "github:local",
    });
    await render(snap, "mock");
    return snap;
  }

  async function loadLive() {
    try {
      const bundle = await MRGWallet.fetchLiveWalletBundle();
      const seed = localStorage.getItem("mrgwallet_seed") || "mrgwallet:local";
      const vault = await MRGWallet.createVault({ seed, label: "Primary" });
      const snap = await MRGWallet.buildWalletSnapshot({
        vault,
        economy: bundle.economy,
        proof: bundle.proof,
        market: bundle.market,
        solanaManifest: bundle.solanaManifest,
        workerId: localStorage.getItem("mrgwallet_worker") || "github:local",
      });
      await render(snap, "live");
      return snap;
    } catch (err) {
      console.warn("live unavailable", err);
      await loadMock();
      $("mode-badge").textContent = "mock-fallback";
    }
  }

  $("btn-copy").addEventListener("click", async () => {
    const text = $("address").textContent;
    try {
      await navigator.clipboard.writeText(text);
      $("btn-copy").textContent = "Copied";
      setTimeout(() => ($("btn-copy").textContent = "Copy"), 1200);
    } catch {
      $("btn-copy").textContent = "Copy failed";
    }
  });

  $("btn-refresh").addEventListener("click", () => loadLive());

  loadLive();
})();
