import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(root, "packages", "web", "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "packages", "web", "index.html"), "utf8");

test("web app exposes persisted EN/VI locale controls", () => {
  assert.match(appSource, /mrgwallet_locale/);
  assert.match(appSource, /Địa chỉ MRG của bạn/);
  assert.match(appSource, /localStorage\.setItem\(LOCALE_KEY, locale\)/);
  assert.match(htmlSource, /id="lang-en"/);
  assert.match(htmlSource, /id="lang-vi"/);
  assert.match(htmlSource, /data-i18n="claimable\.title"/);
});
