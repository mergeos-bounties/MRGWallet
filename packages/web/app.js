/* global MRGWallet */
(function () {
  const $ = (id) => document.getElementById(id);
  const LOCALE_KEY = "mrgwallet_locale";
  const STRINGS = {
    en: {
      "address.title": "Your MRG address",
      "address.help": "Mock vault by default. Production uses Solana SPL MRG + MergeOS ledger proofs.",
      "actions.copy": "Copy",
      "actions.copied": "Copied",
      "actions.copyFailed": "Copy failed",
      "actions.openScan": "Open Scan",
      "actions.refresh": "Refresh live",
      "token.title": "Token economy",
      "token.symbol": "Symbol",
      "token.minted": "Minted",
      "token.reserve": "Reserve",
      "token.released": "Released",
      "token.entries": "Entries",
      "ledger.title": "Ledger tip",
      "ledger.serverValid": "Server valid",
      "ledger.entries": "Entries",
      "ledger.verified": "Verified",
      "ledger.broken": "Broken",
      "ledger.tip": "Tip",
      "ledger.ref": "Ledger ref",
      "solana.title": "Solana binding",
      "solana.program": "Program",
      "solana.programId": "Program id",
      "solana.chain": "Chain",
      "solana.status": "Status",
      "solana.releaseIx": "Release ix",
      "claimable.title": "Claimable bounties",
      "claimable.empty": "No open bounties discovered",
      "receipt.title": "Claim receipt",
      "receipt.help": "Binds wallet address to ledger tip. Payout still needs admin accept / Solana releasePayout.",
    },
    vi: {
      "address.title": "Địa chỉ MRG của bạn",
      "address.help": "Mặc định dùng ví mô phỏng. Bản production dùng Solana SPL MRG và bằng chứng sổ cái MergeOS.",
      "actions.copy": "Sao chép",
      "actions.copied": "Đã sao chép",
      "actions.copyFailed": "Không thể sao chép",
      "actions.openScan": "Mở Scan",
      "actions.refresh": "Làm mới trực tiếp",
      "token.title": "Kinh tế token",
      "token.symbol": "Ký hiệu",
      "token.minted": "Đã phát hành",
      "token.reserve": "Dự trữ",
      "token.released": "Đã giải ngân",
      "token.entries": "Mục",
      "ledger.title": "Đỉnh sổ cái",
      "ledger.serverValid": "Máy chủ hợp lệ",
      "ledger.entries": "Mục",
      "ledger.verified": "Đã xác minh",
      "ledger.broken": "Lỗi",
      "ledger.tip": "Đỉnh",
      "ledger.ref": "Tham chiếu sổ cái",
      "solana.title": "Liên kết Solana",
      "solana.program": "Chương trình",
      "solana.programId": "ID chương trình",
      "solana.chain": "Chuỗi",
      "solana.status": "Trạng thái",
      "solana.releaseIx": "Lệnh giải ngân",
      "claimable.title": "Bounty có thể nhận",
      "claimable.empty": "Chưa phát hiện bounty nào đang mở",
      "receipt.title": "Biên nhận claim",
      "receipt.help": "Gắn địa chỉ ví với đỉnh sổ cái. Payout vẫn cần admin chấp nhận / Solana releasePayout.",
    },
  };
  let locale = localStorage.getItem(LOCALE_KEY) === "vi" ? "vi" : "en";
  let currentSnapshot = null;
  let currentMode = "mock";

  function t(key) {
    return STRINGS[locale][key] || STRINGS.en[key] || key;
  }

  function applyLocale() {
    document.documentElement.lang = locale;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    $("lang-en").setAttribute("aria-pressed", String(locale === "en"));
    $("lang-vi").setAttribute("aria-pressed", String(locale === "vi"));
  }

  function setLocale(nextLocale) {
    locale = nextLocale === "vi" ? "vi" : "en";
    localStorage.setItem(LOCALE_KEY, locale);
    applyLocale();
    if (currentSnapshot) render(currentSnapshot, currentMode);
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

  async function render(snapshot, mode) {
    currentSnapshot = snapshot;
    currentMode = mode;
    applyLocale();
    $("mode-badge").textContent = mode;
    $("mode-badge").classList.toggle("live", mode === "live");
    $("address").textContent = snapshot.vault.address;
    $("link-scan").href = snapshot.vault.scan || "https://scan.mergeos.shop";
    kv($("token-dl"), [
      [t("token.symbol"), snapshot.token.token_symbol],
      [t("token.minted"), snapshot.token.minted_cents],
      [t("token.reserve"), snapshot.token.remaining_reserve_cents],
      [t("token.released"), snapshot.token.released_cents],
      [t("token.entries"), snapshot.token.ledger_entry_count],
    ]);
    kv($("ledger-dl"), [
      [t("ledger.serverValid"), String(snapshot.ledger.valid)],
      [t("ledger.entries"), snapshot.ledger.entry_count],
      [t("ledger.verified"), snapshot.ledger.verified_count],
      [t("ledger.broken"), snapshot.ledger.broken_count],
      [t("ledger.tip"), short(snapshot.ledger.tip_hash)],
      [t("ledger.ref"), short(snapshot.ledger.ledger_reference)],
    ]);
    kv($("solana-dl"), [
      [t("solana.program"), snapshot.solana.program],
      [t("solana.programId"), short(snapshot.solana.program_id, 10)],
      [t("solana.chain"), snapshot.solana.target_chain],
      [t("solana.status"), snapshot.solana.status],
      [t("solana.releaseIx"), snapshot.solana.release_instruction],
    ]);
    const list = $("bounty-list");
    list.innerHTML = "";
    for (const b of snapshot.claimable) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${b.id}<br/><span class="muted">${escapeHtml(b.title)}</span></span><span class="reward">${b.reward_mrg} MRG</span>`;
      list.appendChild(li);
    }
    if (!snapshot.claimable.length) {
      list.innerHTML = `<li><span class="muted">${t("claimable.empty")}</span></li>`;
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
      $("btn-copy").textContent = t("actions.copied");
      setTimeout(() => ($("btn-copy").textContent = t("actions.copy")), 1200);
    } catch {
      $("btn-copy").textContent = t("actions.copyFailed");
    }
  });

  $("btn-refresh").addEventListener("click", () => loadLive());
  $("lang-en").addEventListener("click", () => setLocale("en"));
  $("lang-vi").addEventListener("click", () => setLocale("vi"));

  applyLocale();
  loadLive();
})();
