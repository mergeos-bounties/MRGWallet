/* global MRGWallet */
(function () {
  const $ = (id) => document.getElementById(id);
  const lang = () => localStorage.getItem("mrgwallet_lang") || "en";
  const L = () => (window.MRGLang && window.MRGLang[lang()]) || {};

  // Parse ?task_id= from query string (supports deep link preselect)
  const urlParams = new URLSearchParams(window.location.search);
  const DEEP_LINK_TASK_ID = urlParams.get("task_id") || "";

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
    h("token-title", t.token_title || "Token economy");
    h("ledger-title", t.ledger_title || "Ledger tip");
    h("solana-title", t.solana_title || "Solana binding");
    const bwTitle = $("bw-title");
    if (bwTitle) bwTitle.textContent = t.bw_title || "Bandwidth Share";
    h("bounty-title", t.bounty_title || "Claimable bounties");
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
    renderConfigState(snapshot.config);
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
    const bw = snapshot.bandwidth_share;
    if (bw) {
      const statusEl = $("bw-status");
      const online = bw.status === "online";
      statusEl.textContent = online ? (t.bw_online || "Online") : (t.bw_offline || "Offline");
      statusEl.className = "status " + (online ? "online" : "offline");
      kv($("bw-dl"), [
        [t.bw_bytes || "Bytes shared", formatBytes(bw.total_bytes_shared)],
        [t.bw_sessions || "Sessions", String(bw.sessions_count)],
        [t.bw_earned || "MRG earned", bw.mrg_earned.toFixed(1) + " MRG"],
      ]);
    }
    const list = $("bounty-list");
    list.innerHTML = "";
    let preselectIndex = -1;
    for (const b of snapshot.claimable) {
      const li = document.createElement("li");
      const isPreselected = DEEP_LINK_TASK_ID && b.id === DEEP_LINK_TASK_ID;
      if (isPreselected) preselectIndex = snapshot.claimable.indexOf(b);
      li.innerHTML = `<span>${b.id}<br/><span class="muted">${escapeHtml(b.title)}</span></span><span class="reward${isPreselected ? " highlight" : ""}">${b.reward_mrg} MRG</span>`;
      if (isPreselected) li.style.outline = "2px solid var(--accent)";
      list.appendChild(li);
    }
    if (!snapshot.claimable.length) {
      list.innerHTML = `<li><span class="muted">${t.bounty_none || "No open bounties discovered"}</span></li>`;
    }
    // If deep-linked task_id was found, auto-generate claim receipt
    if (preselectIndex >= 0 && DEEP_LINK_TASK_ID) {
      const bounty = snapshot.claimable[preselectIndex];
      MRGWallet.buildWalletClaimReceipt({
        vault: snapshot.vault,
        bounty,
        proof: snapshot.ledger,
        solana: snapshot.solana,
        workerId: localStorage.getItem("mrgwallet_worker") || "",
      }).then((receipt) => {
        $("receipt").textContent = JSON.stringify(receipt, null, 2);
      });
    }
    ledgerEntries = Array.isArray(snapshot.ledger.entries) ? snapshot.ledger.entries : [];
    currentPage = 1;
    renderLedgerTable();
    $("receipt").textContent = snapshot.sample_receipt
      ? JSON.stringify(snapshot.sample_receipt, null, 2)
      : "—";
    $("generated").textContent = (t.generated || "Generated") + " " + (snapshot.generated_at || "");
  }

  function renderConfigState(config = {}) {
    const state = config.ready === false ? config : MRGWallet.getWalletConfigState(config.worker_id || "");
    const panel = $("config-empty");
    if (!panel) return;
    panel.hidden = state.ready;
    $("config-empty-title").textContent = state.title || "Configure your wallet";
    $("config-empty-message").textContent =
      state.message || "Add your GitHub worker ID before creating claim receipts.";
    $("config-empty-cta").textContent = state.cta || "Open Settings";
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const v = bytes / Math.pow(1024, i);
    return v.toFixed(i > 0 ? 1 : 0) + " " + units[i];
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  let ledgerEntries = [];
  let filteredEntries = [];
  let currentPage = 1;
  const PER_PAGE = 5;

  function renderLedgerTable() {
    const fromVal = $("filter-date-from").value;
    const toVal = $("filter-date-to").value;
    const activeType = document.querySelector("#filter-type .filter-btn.active");
    const typeVal = activeType ? activeType.dataset.type : "";

    filteredEntries = ledgerEntries.filter(function (e) {
      if (typeVal && e.bounty_type !== typeVal) return false;
      if (fromVal && e.date < fromVal) return false;
      if (toVal && e.date > toVal + "T23:59:59Z") return false;
      return true;
    });

    var totalPages = Math.max(1, Math.ceil(filteredEntries.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var start = (currentPage - 1) * PER_PAGE;
    var pageEntries = filteredEntries.slice(start, start + PER_PAGE);
    var tbody = $("ledger-tbody");

    if (!pageEntries.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="muted" style="text-align:center;padding:1rem">No entries found</td></tr>';
    } else {
      tbody.innerHTML = pageEntries.map(function (e) {
        var date = e.date ? e.date.slice(0, 10) : "—";
        var typeLabel = e.bounty_type ? e.bounty_type.charAt(0).toUpperCase() + e.bounty_type.slice(1) : "—";
        var amount = (e.amount_cents / 100).toFixed(2) + " MRG";
        var title = escapeHtml(e.title || "—");
        return "<tr><td>" + date + '</td><td><span class="badge-type badge-' + e.bounty_type + '">' + typeLabel + '</span></td><td>' + title + '</td><td class="amount">' + amount + "</td></tr>";
      }).join("");
    }

    $("page-indicator").textContent = "Page " + currentPage + " of " + totalPages;
    $("btn-page-prev").disabled = currentPage <= 1;
    $("btn-page-next").disabled = currentPage >= totalPages;
  }

  async function loadMock() {
    const seed = localStorage.getItem("mrgwallet_seed") || "mrgwallet:local";
    localStorage.setItem("mrgwallet_seed", seed);
    const workerId = localStorage.getItem("mrgwallet_worker") || "";
    const vault = await MRGWallet.createVault({ seed, label: "Primary" });
    const snap = await MRGWallet.buildWalletSnapshot({
      vault,
      economy: MRGWallet.mockEconomy(),
      proof: MRGWallet.mockProof(),
      market: MRGWallet.mockMarket(),
      solanaManifest: MRGWallet.mockSolanaManifest(),
      workerId,
    });
    await render(snap, "mock");
    return snap;
  }

  async function loadLive() {
    try {
      const bundle = await MRGWallet.fetchLiveWalletBundle();
      const seed = localStorage.getItem("mrgwallet_seed") || "mrgwallet:local";
      const workerId = localStorage.getItem("mrgwallet_worker") || "";
      const vault = await MRGWallet.createVault({ seed, label: "Primary" });
      const snap = await MRGWallet.buildWalletSnapshot({
        vault,
        economy: bundle.economy,
        proof: bundle.proof,
        market: bundle.market,
        solanaManifest: bundle.solanaManifest,
        workerId,
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

  $("filter-date-from").addEventListener("change", function () { currentPage = 1; renderLedgerTable(); });
  $("filter-date-to").addEventListener("change", function () { currentPage = 1; renderLedgerTable(); });
  $("btn-filter-apply").addEventListener("click", function () { currentPage = 1; renderLedgerTable(); });
  $("btn-filter-reset").addEventListener("click", function () {
    $("filter-date-from").value = "";
    $("filter-date-to").value = "";
    document.querySelectorAll("#filter-type .filter-btn").forEach(function (b) { b.classList.remove("active"); });
    var allBtn = document.querySelector('#filter-type .filter-btn[data-type=""]');
    if (allBtn) allBtn.classList.add("active");
    currentPage = 1;
    renderLedgerTable();
  });
  document.querySelectorAll("#filter-type .filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#filter-type .filter-btn").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
    });
  });
  $("btn-page-prev").addEventListener("click", function () {
    if (currentPage > 1) { currentPage--; renderLedgerTable(); }
  });
  $("btn-page-next").addEventListener("click", function () {
    var totalPages = Math.max(1, Math.ceil(filteredEntries.length / PER_PAGE));
    if (currentPage < totalPages) { currentPage++; renderLedgerTable(); }
  });

  applyLang();
  loadLive();
})();
