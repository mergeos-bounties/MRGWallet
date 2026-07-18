# Chrome Extension Load Unpacked Walkthrough

## Prerequisites

- **Node.js >= 18.17** — [download](https://nodejs.org/)
- **Git** — [download](https://git-scm.com/)
- **Chrome** (or Brave / Edge / any Chromium browser)

## Step 1: Clone and build

```powershell
git clone https://github.com/mergeos-bounties/MRGWallet.git
cd MRGWallet
npm install
npm run build:extensions
```

This creates the unpacked extension at `dist/extensions/chrome/`.

```
dist/extensions/chrome/
├── manifest.json
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── web/
    ├── index.html
    ├── app.js
    ├── styles.css
    ├── vi.js
    ├── mrgwallet-core.js
    └── icons/
```

## Step 2: Open Extensions page

Open Chrome and navigate to:

```
chrome://extensions
```

Or click the puzzle piece icon → **Manage extensions**.

## Step 3: Enable Developer mode

Toggle **Developer mode** on (top-right corner).

![Developer mode toggle](https://developer.chrome.com/static/docs/extensions/get-started/tutorial/hello-world/image/extension-page-c0ef4c3a1db71_856.png)

## Step 4: Load unpacked

Click **Load unpacked** and select the folder:

```
MRGWallet/dist/extensions/chrome/
```

The extension appears immediately in the list:

```
MRGWallet 0.1.0
ID: …
Inspect views: service worker
```

## Step 5: Pin the extension

Click the puzzle piece icon, find **MRGWallet**, and click the pin icon so it stays visible in the toolbar.

## Step 6: Verify

Click the MRGWallet icon in the toolbar. The popup shows:

- Your local vault address
- Token economy stats
- Ledger proof
- Marketplace bounties
- Claim receipts

Expected output on first load:

```
MRGWallet

Address
  mrg:local:abc123def…

Token economy
  Supply: 1,000,000 MRG
  Reserves: 800,000 MRG

Ledger
  Tip: a1b2c3d4…
  Verified: ✓

Marketplace
  12 open bounties
```

## Using a release zip instead

If you don't want to build from source, download the latest release:

1. Go to [GitHub Releases](https://github.com/mergeos-bounties/MRGWallet/releases)
2. Download `MRGWallet-chrome-vX.Y.Z.zip`
3. Extract the zip to a folder
4. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select the extracted folder

## Troubleshooting

**"Could not load manifest"**  
The folder you selected should contain `manifest.json` directly (not a nested folder). Select `dist/extensions/chrome/`, not `dist/extensions/`.

**Extension loads but popup is blank**  
Open the extension's service worker console: `chrome://extensions` → MRGWallet → **Inspect** under "Service Worker". Check for JS errors.

**No icons in toolbar**  
Pin the extension: click the puzzle piece icon → pin MRGWallet.

**Permissions warning**  
MRGWallet requests `storage` permission and host access to `mergeos.shop` / `scan.mergeos.shop`. These are required for wallet persistence and public API queries. No data is sent to third parties.

## Update after pull

```powershell
git pull
npm run build:extensions
```

Then go to `chrome://extensions` and click the refresh icon on MRGWallet.
