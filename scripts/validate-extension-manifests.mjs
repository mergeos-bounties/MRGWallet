#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionDir = path.join(root, "packages", "extension");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(extensionDir, file), "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateCommon(manifest, name) {
  assert(manifest.manifest_version === 3, `${name}: manifest_version must be 3`);
  assert(manifest.name === "MRGWallet", `${name}: name must be MRGWallet`);
  assert(/^\d+\.\d+\.\d+$/.test(manifest.version || ""), `${name}: version must be semver x.y.z`);
  assert(manifest.action?.default_popup === "web/index.html", `${name}: popup must load web/index.html`);
  assert(Array.isArray(manifest.permissions), `${name}: permissions must be an array`);
  assert(manifest.permissions.includes("storage"), `${name}: storage permission is required`);
  assert(manifest.permissions.includes("alarms"), `${name}: alarms permission is required`);
  assert(
    Array.isArray(manifest.host_permissions) &&
      manifest.host_permissions.includes("https://mergeos.shop/*") &&
      manifest.host_permissions.includes("https://scan.mergeos.shop/*"),
    `${name}: host_permissions must include MergeOS shop and scan origins`,
  );
  for (const size of ["16", "48", "128"]) {
    assert(manifest.icons?.[size] === `icons/icon${size}.png`, `${name}: icons.${size} is missing`);
    assert(
      manifest.action?.default_icon?.[size] === `icons/icon${size}.png`,
      `${name}: action.default_icon.${size} is missing`,
    );
  }
}

function validateFirefox(manifest) {
  const gecko = manifest.browser_specific_settings?.gecko;
  assert(gecko?.id === "mrgwallet@mergeos.shop", "firefox: gecko id must be stable");
  assert(gecko?.strict_min_version === "109.0", "firefox: strict_min_version must be 109.0");
}

const chrome = readJson("manifest.chrome.json");
const firefox = readJson("manifest.firefox.json");

validateCommon(chrome, "chrome");
validateCommon(firefox, "firefox");
validateFirefox(firefox);

console.log("extension manifests ok");
