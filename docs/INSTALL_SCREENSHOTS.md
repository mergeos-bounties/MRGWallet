# Install screenshots

This document provides **step-by-step visual walkthroughs** for loading MRGWallet on Chrome, Firefox, and Android. Each step includes a description of what you should **see** on your screen — these serve as text-based stand-ins for actual screenshots.

> **Adding real screenshots:** Replace the placeholder filenames below with actual screenshots placed in `docs/screenshots/`. Reference them with relative paths, e.g. `![Load unpacked](screenshots/screenshot-chrome-load-unpacked.png)`.

---

## Chrome extension

### Prerequisites

- Chrome **88+** (Chromium-based browsers also work)
- MRGWallet built: `npm run build:extensions`
- Output present at `dist/extensions/chrome/`

### Steps

#### 1. Open Extensions page

| Action | What you should see |
|--------|---------------------|
| Type `chrome://extensions` in the address bar and press Enter | A white page titled **Extensions** with a list of any already-installed extensions. If this is your first time, the list is empty except for a message like "You can add extensions from the Chrome Web Store." |

**Screenshot reference:** `screenshot-chrome-extensions-page.png`

#### 2. Enable Developer mode

| Action | What you should see |
|--------|---------------------|
| Toggle **Developer mode** on (top-right corner) | A blue/colored toggle switch moves to the right. Three new buttons appear below the toggle: **Load unpacked**, **Pack extension**, and **Update**. A warning banner may appear: "This is a feature intended for developers..." |

**Screenshot reference:** `screenshot-chrome-developer-mode.png`

#### 3. Click "Load unpacked"

| Action | What you should see |
|--------|---------------------|
| Click the **Load unpacked** button | A native OS file-picker dialog opens, showing your file system. The dialog title reads "Select the extension directory." |

**Screenshot reference:** `screenshot-chrome-load-unpacked.png`

#### 4. Select the extension directory

| Action | What you should see |
|--------|---------------------|
| Navigate to `dist/extensions/chrome/` and click **Select** (or **Open**) | The file-picker closes. MRGWallet appears in the extensions list with a card showing: the extension name **MRGWallet**, a short description, its ID (a long auto-generated hash), and an **Inspect views** link for the background service worker. A colored icon badge appears in the Chrome toolbar (top-right). |

**Screenshot reference:** `screenshot-chrome-extension-loaded.png`

#### 5. Open the popup

| Action | What you should see |
|--------|---------------------|
| Click the MRGWallet puzzle-piece icon (or extension icon) in the Chrome toolbar | A dark-themed popup window appears showing the MRGWallet interface: vault address, token balance, and navigation options. |

**Screenshot reference:** `screenshot-chrome-popup.png`

---

## Firefox extension

### Prerequisites

- Firefox **109+**
- MRGWallet built: `npm run build:extensions`
- Output present at `dist/extensions/firefox/manifest.json`

### Steps

#### 1. Open `about:debugging`

| Action | What you should see |
|--------|---------------------|
| Type `about:debugging` in the address bar and press Enter | A Firefox internal page loads with a sidebar on the left containing links: **Setup**, **This Firefox**, **USB devices**. The main area shows setup information about remote debugging. |

**Screenshot reference:** `screenshot-firefox-about-debugging.png`

#### 2. Navigate to This Firefox

| Action | What you should see |
|--------|---------------------|
| Click **This Firefox** in the left sidebar | The main area changes to show a section titled **Temporary Extensions** (currently empty, with the text "No temporary extensions have been loaded") and a **Load Temporary Add-on…** button. Below is a **Extensions** section listing any permanently installed add-ons. |

**Screenshot reference:** `screenshot-firefox-this-firefox.png`

#### 3. Click "Load Temporary Add-on…"

| Action | What you should see |
|--------|---------------------|
| Click the **Load Temporary Add-on…** button | A native OS file-picker dialog opens. |

**Screenshot reference:** `screenshot-firefox-load-temp-addon.png`

#### 4. Select the manifest.json

| Action | What you should see |
|--------|---------------------|
| Navigate to `dist/extensions/firefox/manifest.json` and click **Open** | The file-picker closes. MRGWallet appears under **Temporary Extensions** with its name, extension ID (`mrgwallet@mergeos.shop`), and a **Remove** button. The MRGWallet icon appears in the Firefox toolbar. |

**Screenshot reference:** `screenshot-firefox-extension-loaded.png`

#### 5. Open the popup

| Action | What you should see |
|--------|---------------------|
| Click the MRGWallet icon in the Firefox toolbar | The dark-themed MRGWallet popup opens, identical to the Chrome version. |

**Screenshot reference:** `screenshot-firefox-popup.png`

---

## Android

### Prerequisites

- Android SDK / Android Studio installed
- USB debugging enabled on your Android device (or an emulator running)
- MRGWallet web UI built: `npm run build:web`
- Android assets synced: `npm run sync:android`

### Steps

#### 1. Build web assets

| Action | What you should see |
|--------|---------------------|
| Run `npm run build:web` in the project root | Terminal output shows the build process: bundling JavaScript, copying assets, and writing output to the `packages/web/dist/` directory. The final line reads something like "Build complete." |

**Screenshot reference:** `screenshot-android-build-web.png`

#### 2. Sync Android assets

| Action | What you should see |
|--------|---------------------|
| Run `npm run sync:android` | Terminal output copies files from the web build into `android/app/src/main/assets/www/`. The script prints each copied file or a summary like "Assets synced to android/app/src/main/assets/www". |

**Screenshot reference:** `screenshot-android-sync-assets.png`

#### 3. Open the Android project in Android Studio

| Action | What you should see |
|--------|---------------------|
| Open Android Studio, click **Open**, and select the `android/` folder | Android Studio loads the project. Gradle sync starts automatically. After sync completes, the project structure appears in the left pane with `app/`, `Gradle Scripts/`, etc. No build errors should appear in the status bar. |

**Screenshot reference:** `screenshot-android-studio-open.png`

#### 4. Build the debug APK

| Action | What you should see |
|--------|---------------------|
| Run `./gradlew :app:assembleDebug` in the `android/` directory (or click the green **Run** triangle in Android Studio) | Terminal output shows Gradle tasks: `:app:preBuild`, `:app:compileDebugKotlin`, `:app:mergeDebugAssets`, `:app:packageDebug`, etc. The final line reads **BUILD SUCCESSFUL**. The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. |

**Screenshot reference:** `screenshot-android-gradle-build.png`

#### 5. Install and run on device

| Action | What you should see |
|--------|---------------------|
| Connect your Android device via USB (or start an emulator). Run `./gradlew :app:installDebug` (or click **Run** in Android Studio with your device selected) | The app installs on your device. A confirmation toast appears: "App installed." The MRGWallet app launches automatically showing the WebView loading the MRGWallet UI. Your device screen displays the dark wallet interface with vault address and token data. |

**Screenshot reference:** `screenshot-android-device-running.png`

#### 6. Verify the app

| Action | What you should see |
|--------|---------------------|
| Tap around the wallet interface on your device | The WebView responds to touch: navigation works, vault address is displayed, token economy data loads from the public MergeOS API (if online). The app behaves identically to the desktop browser version. |

**Screenshot reference:** `screenshot-android-app-verified.png`

---

## Screenshot file index

| File name | Captures |
|-----------|----------|
| `screenshot-chrome-extensions-page.png` | `chrome://extensions` with Developer mode off |
| `screenshot-chrome-developer-mode.png` | Developer mode toggle ON, showing Load unpacked / Pack extension / Update buttons |
| `screenshot-chrome-load-unpacked.png` | OS file-picker selecting `dist/extensions/chrome/` |
| `screenshot-chrome-extension-loaded.png` | MRGWallet card in extensions list after loading |
| `screenshot-chrome-popup.png` | MRGWallet popup window open in the toolbar |
| `screenshot-firefox-about-debugging.png` | `about:debugging` setup page |
| `screenshot-firefox-this-firefox.png` | This Firefox panel with Load Temporary Add-on… button |
| `screenshot-firefox-load-temp-addon.png` | OS file-picker selecting `manifest.json` |
| `screenshot-firefox-extension-loaded.png` | MRGWallet listed under Temporary Extensions |
| `screenshot-firefox-popup.png` | MRGWallet popup in Firefox toolbar |
| `screenshot-android-build-web.png` | Terminal output of `npm run build:web` |
| `screenshot-android-sync-assets.png` | Terminal output of `npm run sync:android` |
| `screenshot-android-studio-open.png` | Android Studio project view after opening `android/` |
| `screenshot-android-gradle-build.png` | Terminal with `BUILD SUCCESSFUL` from `assembleDebug` |
| `screenshot-android-device-running.png` | MRGWallet running on an Android device screen |
| `screenshot-android-app-verified.png` | App responding to touch interaction on device |
