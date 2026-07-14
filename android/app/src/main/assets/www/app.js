/* global MRGWallet */
(function () {
  const $ = (id) => document.getElementById(id);
  const lang = () => localStorage.getItem("mrgwallet_lang") || "en";
  const L = () => (window.MRGLang && window.MRGLang[lang()]) || {};

  function __(key, fallback) {
    const v = L()[key];
    return v !== undefined ? v : (fallback ?? key);
  }

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

  function applyLang() {
    const t = L();
    document.title = t.brand || "MRGWallet";
    document.querySelector("html").lang = lang() === "vi" ? "vi" : "en";
    const h = (id, text) => { const e = $(id); if (e) e.textContent = text; };
    $("mode-badge").textContent = $("mode-badge").textContent === "live" ? (t.badge_live || "live") : (t.badge_mock || "mock");
    const addrH = document.querySelector("section.card h1");
    if (addrH) addrH.textContent = t.addr_title || "Your MRG address";
    const btnCopy = $("btn-copy");
    if (btnCopy && btnCopy.textContent !== "Copied" && btnCopy.textContent !== "Đã sao chép") btnCopy.textContent = t.addr_copy || "Copy";
    $("link-scan").textContent = t.addr_scan || "Open Scan";
    const addrNote = document.querySelector("section.card .muted");
    if (addrNote && addrNote.textContent.includes("Mock vault")) addrNote.textContent = t.addr_note || "Mock vault by default. Production uses Solana SPL MRG + MergeOS ledger proofs.";
    const secHeaders = document.querySelectorAll("section.card h2");
    if (secHeaders.length >= 4) {
      if (secHeaders[0]) secHeaders[0].textContent = t.token_title || "Token economy";
      if (secHeaders[1]) secHeaders[1].textContent = t.ledger_title || "Ledger tip";
      if (secHeaders[2]) secHeaders[2].textContent = t.solana_title || "Solana binding";
      if (secHeaders[3]) secHeaders[3].textContent = t.bounty_title || "Claimable bounties";
    }
    $("btn-refresh").textContent = t.bounty_refresh || "Refresh live";
    $("receipt-title").textContent = t.receipt_title || "Claim receipt";
    const receiptNote = document.querySelector("#receipt").nextElementSibling;
    if (receiptNote && receiptNote.classList.contains("muted")) receiptNote.textContent = t.receipt_note || "Binds wallet address to ledger tip. Payout still needs admin accept / Solana releasePayout.";
    const settingsH = $("settings-title");
    if (settingsH) settingsH.textContent = t.settings_title || "Settings";
    const workerLabel = document.querySelector(".field span");
    if (workerLabel) workerLabel.innerHTML = `${t.worker_label || "Worker ID"} <span class="muted">(${t.worker_placeholder || "github:login"})</span>`;
    const workerMuted = document.querySelector(".field + .muted");
    if (workerMuted) workerMuted.textContent = t.worker_muted || "Used in claim receipts to identify the worker. Saved to localStorage.";
    const langLabel = document.querySelector("#lang-select-label");
    if (langLabel) langLabel.textContent = t.lang_label || "Language";
  }

  async function render(snapshot, mode) {
    const t = L();
    $("mode-badge").textContent = mode === "live" ? (t.badge_live || "live") : (mode === "mock-fallback" ? (t.badge_mock_fallback || "mock-fallback") : (t.badge_mock || "mock"));
    $("mode-badge").classList.toggle("live", mode === "live");
    $("address").textContent = snapshot.vault.address;
    $("link-scan").href = snapshot.vault.scan || "https://scan.mergeos.shop";
    kv($("token-dl"), [
      [t.symbol || "Symbol", snapshot.token.token_symbol],
      [t.minted || "Minted", snapshot.token.minted_cents],
      [t.reserve || "Reserve", snapshot.token.remaining_reserve_cents],
      [t.released || "Released", snapshot.token.released_cents],
      [t.entries || "Entries", snapshot.token.ledger_entry_count],
    ]);
    kv($("ledger-dl"), [
      [t.server_valid || "Server valid", String(snapshot.ledger.valid)],
      [t.entries || "Entries", snapshot.ledger.entry_count],
      [t.verified || "Verified", snapshot.ledger.verified_count],
      [t.broken || "Broken", snapshot.ledger.broken_count],
      [t.tip || "Tip", short(snapshot.ledger.tip_hash)],
      [t.ledger_ref || "Ledger ref", short(snapshot.ledger.ledger_reference)],
    ]);
    kv($("solana-dl"), [
      [t.program || "Program", snapshot.solana.program],
      [t.program_id || "Program id", short(snapshot.solana.program_id, 10)],
      [t.chain || "Chain", snapshot.solana.target_chain],
      [t.status || "Status", snapshot.solana.status],
      [t.release_ix || "Release ix", snapshot.solana.release_instruction],
    ]);
    const list = $("bounty-list");
    list.innerHTML = "";
    for (const b of snapshot.claimable) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${b.id}<br/><span class="muted">${escapeHtml(b.title)}</span></span><span class="reward">${b.reward_mrg} MRG</span>`;
      list.appendChild(li);
    }
    if (!snapshot.claimable.length) {
      list.innerHTML = `<li><span class="muted">${t.bounty_none || "No open bounties discovered"}</span></li>`;
    }
    $("receipt").textContent = snapshot.sample_receipt
      ? JSON.stringify(snapshot.sample_receipt, null, 2)
      : "—";
    $("generated").textContent = (t.generated || "Generated") + " " + (snapshot.generated_at || "");
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
    }
  }

  function reloadUI() {
    localStorage.setItem("mrgwallet_lang", $("lang-select").value);
    applyLang();
    loadLive();
  }

  $("btn-copy").addEventListener("click", async () => {
    const text = $("address").textContent;
    const t = L();
    try {
      await navigator.clipboard.writeText(text);
      $("btn-copy").textContent = t.addr_copied || "Copied";
      setTimeout(() => ($("btn-copy").textContent = t.addr_copy || "Copy"), 1200);
    } catch {
      $("btn-copy").textContent = t.addr_copy_failed || "Copy failed";
    }
  });

  $("btn-refresh").addEventListener("click", () => loadLive());

  const workerInput = $("worker-id");
  workerInput.value = localStorage.getItem("mrgwallet_worker") || "";
  workerInput.addEventListener("input", () => {
    const val = workerInput.value.trim();
    if (val) {
      localStorage.setItem("mrgwallet_worker", val);
    } else {
      localStorage.removeItem("mrgwallet_worker");
    }
    loadLive();
  });

  const langSelect = $("lang-select");
  langSelect.value = lang();
  langSelect.addEventListener("change", reloadUI);

  applyLang();
  loadLive();
})();
