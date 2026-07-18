# Deep Link: `mrgwallet://claim`

MRGWallet supports deep linking via `mrgwallet://claim` scheme to preselect an open bounty and build a claim receipt in one tap.

## Usage

```
mrgwallet://claim?task_id=<bounty_id>
```

Examples:

- `mrgwallet://claim?task_id=7` — preselects bounty #7 (Deep link issue)
- `mrgwallet://claim?task_id=prj_demo:1` — preselects `prj_demo:1`

## How it works

### Android

1. `AndroidManifest.xml` declares an intent‑filter for `mrgwallet://claim`
2. `MainActivity.kt` parses the `task_id` query parameter from the incoming URI
3. The WebView loads `index.html?task_id=<encoded_id>` instead of the plain `index.html`

### Web / Chrome / Firefox

1. The web UI reads `?task_id=` from `window.location.search`
2. `app.js` matches the deep‑linked bounty in the claimable list by `b.id`
3. The matching bounty is **highlighted** with a gold reward badge and an accent outline
4. A **claim receipt is auto‑generated** and displayed in the receipt panel

## Testing

### Android

```bash
adb shell am start -d "mrgwallet://claim?task_id=7"
```

### Web (browser)

```
http://127.0.0.1:8787/?task_id=7
```

### Screenshot

When opened with `?task_id=7`, the matching bounty appears highlighted:

- Gold reward badge (`highlight` class)
- Accent‑color outline on the list item
- Claim receipt section auto‑filled for the selected bounty

## Implementation details

| File | Change |
|------|--------|
| `android/app/src/main/AndroidManifest.xml` | Added `VIEW` intent‑filter for `mrgwallet://claim` |
| `android/app/src/main/java/shop/mergeos/mrgwallet/MainActivity.kt` | Parses deep‑link URI, appends `?task_id=` to WebView URL |
| `packages/web/app.js` | Reads `?task_id=` query param, highlights & preselects bounty, auto‑generates receipt |
| `packages/web/styles.css` | `.reward.highlight` class styling |
| `packages/web/mrgwallet-core.browser.js` | Mock market includes testable bounty id `7` |
