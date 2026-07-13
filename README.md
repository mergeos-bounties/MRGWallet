# MRGWallet

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.17-blue.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-0.1.0-0E8A16.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![MRG](https://img.shields.io/badge/token-MRG-5319E7.svg)](https://scan.mergeos.shop)
[![Solana](https://img.shields.io/badge/chain-Solana-9945FF.svg)](https://github.com/mergeos-bounties/mergeos-contracts)
[![MergeOS](https://img.shields.io/badge/MergeOS-bounties-5319E7.svg)](https://github.com/mergeos-bounties)

**MRGWallet** is the official **MergeOS MRG wallet surface** for **Android**, **Chrome**, and **Firefox**: local vault address, public token/ledger discovery, claim receipts bound to ledger tips, and Solana program anchors — without auto-releasing payouts.

**Product:** [mergeos-bounties/MRGWallet](https://github.com/mergeos-bounties/MRGWallet) · App: [mergeos.shop](https://mergeos.shop/) · Scan: [scan.mergeos.shop](https://scan.mergeos.shop/) · Contracts: [mergeos-contracts](https://github.com/mergeos-bounties/mergeos-contracts)

---

## Highlights

| Surface | Description |
| --- | --- |
| **Core** | `packages/core` — vault, economy/proof/market discovery, claim receipts |
| **Web UI** | `packages/web` — dark wallet UI (shared by extensions + Android) |
| **Chrome / Firefox** | MV3 popup extensions (`npm run build:extensions`) |
| **Android** | WebView shell loading bundled `assets/www` |
| **Safety** | Mock vault by default; live only hits **public** MergeOS APIs |

---

## Quick start

```powershell
cd MRGWallet
npm test
npm run demo
npm run build
```

Open the web UI:

```powershell
# after npm run build:web
start dist\web\index.html
```

### Chrome extension

1. `npm run build:extensions`
2. Chrome → Extensions → Developer mode → **Load unpacked** → `dist/extensions/chrome`

### Firefox extension

1. `npm run build:extensions`
2. `about:debugging` → This Firefox → **Load Temporary Add-on** → `dist/extensions/firefox/manifest.json`

### Android

```powershell
node scripts/sync-android-assets.mjs
cd android
# open in Android Studio or:
# .\gradlew.bat :app:assembleDebug
```

---

## Wallet model

```text
local vault address (mock seed → base58)
        +
public token economy + ledger proof + marketplace
        +
Solana mergeos_mrg program_id / releasePayout
        ↓
claim receipt (address ↔ task ↔ ledger_reference)
        ↓
owner/admin accept  →  optional Solana releasePayout
```

| API (public) | Used for |
| --- | --- |
| `/api/public/token-economy` | Supply / reserves |
| `/api/public/ledger/proof` | Hash tip + validity |
| `/api/public/marketplace` | Open bounties (title MRG) |
| `/contracts/solana/…proof-manifest…` | Program binding |

---

## CLI / scripts

| Command | Purpose |
| --- | --- |
| `npm test` | Core wallet unit tests |
| `npm run demo` | Mock snapshot smoke |
| `npm run build:web` | Browser bundle + UI |
| `npm run build:extensions` | Chrome + Firefox packages |
| `node scripts/sync-android-assets.mjs` | Copy web into Android assets |

---

## Repository layout

```text
MRGWallet/
  packages/
    core/           # Node + browser wallet logic
    web/            # HTML/CSS/JS UI
    extension/      # Chrome/Firefox manifests + icons
  android/          # Kotlin WebView host
  scripts/          # build + demo
  test/             # node:test
  docs/
```

---

## Development

```powershell
npm test
npm run demo
npm run build
```

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

---

## MergeOS bounties

Star → claim issue → PR to **master** → MRG **25–200**.  
See [docs/BOUNTY.md](docs/BOUNTY.md) · [mergeos](https://github.com/mergeos-bounties/mergeos).

---

## License

MIT · MergeOS / ThanhTrucSolutions
