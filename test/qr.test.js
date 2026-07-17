import test from "node:test";
import assert from "node:assert/strict";
import {
  generateQRMatrix,
  generateQRAscii,
  generateQRSvg,
  generateQRDataUrl,
  buildWorkerAddressUrl,
  generateWorkerQR,
  generateTaskClaimQR,
} from "../packages/core/qr.js";

test("generateQRMatrix returns boolean matrix", () => {
  const matrix = generateQRMatrix("https://scan.mergeos.shop/address/github:demo");
  assert.ok(Array.isArray(matrix));
  assert.ok(matrix.length > 0);
  assert.ok(matrix[0].length > 0);
  for (const row of matrix) {
    for (const cell of row) {
      assert.equal(typeof cell, "boolean");
    }
  }
});

test("generateQRMatrix produces consistent output", () => {
  const text = "https://scan.mergeos.shop/address/github:test";
  const m1 = generateQRMatrix(text);
  const m2 = generateQRMatrix(text);
  assert.deepEqual(m1, m2);
});

test("generateQRMatrix handles different error correction levels", () => {
  const text = "test";
  const mL = generateQRMatrix(text, "L");
  const mM = generateQRMatrix(text, "M");
  const mQ = generateQRMatrix(text, "Q");
  const mH = generateQRMatrix(text, "H");
  assert.ok(mL.length > 0);
  assert.ok(mM.length > 0);
  assert.ok(mQ.length > 0);
  assert.ok(mH.length > 0);
});

test("generateQRAscii returns string with module characters", () => {
  const ascii = generateQRAscii("test");
  assert.equal(typeof ascii, "string");
  assert.ok(ascii.includes("██"));
  assert.ok(ascii.includes("  "));
});

test("generateQRAscii respects quiet zone option", () => {
  const ascii1 = generateQRAscii("test", { quietZone: 1 });
  const ascii2 = generateQRAscii("test", { quietZone: 3 });
  assert.ok(ascii2.length > ascii1.length);
});

test("generateQRSvg returns valid SVG string", () => {
  const svg = generateQRSvg("test");
  assert.equal(typeof svg, "string");
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes("</svg>"));
  assert.ok(svg.includes("rect"));
});

test("generateQRSvg respects module size option", () => {
  const svg1 = generateQRSvg("test", { moduleSize: 5 });
  const svg2 = generateQRSvg("test", { moduleSize: 20 });
  assert.ok(svg2.length > svg1.length);
});

test("generateQRDataUrl returns data URL", () => {
  const dataUrl = generateQRDataUrl("test");
  assert.equal(typeof dataUrl, "string");
  assert.ok(dataUrl.startsWith("data:image/svg+xml;base64,"));
});

test("buildWorkerAddressUrl builds correct URL", () => {
  const url = buildWorkerAddressUrl("github:demo");
  assert.equal(url, "https://scan.mergeos.shop/address/github%3Ademo");
});

test("buildWorkerAddressUrl returns null for empty input", () => {
  assert.equal(buildWorkerAddressUrl(""), null);
  assert.equal(buildWorkerAddressUrl(null), null);
  assert.equal(buildWorkerAddressUrl(undefined), null);
});

test("generateWorkerQR returns ascii by default", () => {
  const result = generateWorkerQR("github:demo");
  assert.ok(result.ascii);
  assert.ok(result.url);
  assert.equal(result.workerId, "github:demo");
  assert.ok(result.url.includes("github%3Ademo"));
});

test("generateWorkerQR returns matrix format", () => {
  const result = generateWorkerQR("github:demo", { format: "matrix" });
  assert.ok(result.matrix);
  assert.ok(Array.isArray(result.matrix));
});

test("generateWorkerQR returns svg format", () => {
  const result = generateWorkerQR("github:demo", { format: "svg" });
  assert.ok(result.svg);
  assert.ok(result.svg.includes("<svg"));
});

test("generateWorkerQR returns dataurl format", () => {
  const result = generateWorkerQR("github:demo", { format: "dataurl" });
  assert.ok(result.dataUrl);
  assert.ok(result.dataUrl.startsWith("data:"));
});

test("generateWorkerQR returns null for empty workerId", () => {
  assert.equal(generateWorkerQR(""), null);
  assert.equal(generateWorkerQR(null), null);
});

test("generateTaskClaimQR returns ascii by default", () => {
  const result = generateTaskClaimQR("prj_123:5", "github:demo");
  assert.ok(result.ascii);
  assert.ok(result.url);
  assert.equal(result.taskId, "prj_123:5");
  assert.equal(result.workerId, "github:demo");
  assert.ok(result.url.includes("task=prj_123%3A5"));
});

test("generateTaskClaimQR returns matrix format", () => {
  const result = generateTaskClaimQR("prj_123:5", "github:demo", { format: "matrix" });
  assert.ok(result.matrix);
  assert.ok(Array.isArray(result.matrix));
});

test("generateTaskClaimQR returns svg format", () => {
  const result = generateTaskClaimQR("prj_123:5", "github:demo", { format: "svg" });
  assert.ok(result.svg);
  assert.ok(result.svg.includes("<svg"));
});

test("generateTaskClaimQR returns null for missing taskId", () => {
  assert.equal(generateTaskClaimQR("", "github:demo"), null);
  assert.equal(generateTaskClaimQR(null, "github:demo"), null);
});

test("generateTaskClaimQR returns null for missing workerId", () => {
  assert.equal(generateTaskClaimQR("prj_123:5", ""), null);
  assert.equal(generateTaskClaimQR("prj_123:5", null), null);
});

test("QR matrix size follows QR code spec", () => {
  const shortUrl = generateQRMatrix("test");
  const longUrl = generateQRMatrix("https://scan.mergeos.shop/address/github:username-1234567890");
  assert.ok(longUrl.length >= shortUrl.length);
  assert.ok(longUrl.length % 4 === 1);
});

test("QR matrix has finder patterns in corners", () => {
  const matrix = generateQRMatrix("test");
  const size = matrix.length;

  assert.equal(matrix[0][0], true);
  assert.equal(matrix[0][size - 1], true);
  assert.equal(matrix[size - 1][0], true);

  assert.equal(matrix[0][6], true);
  assert.equal(matrix[6][0], true);
});

test("generateWorkerQR works with github login format", () => {
  const result = generateWorkerQR("github:jpalafox-12");
  assert.ok(result.ascii);
  assert.ok(result.url.includes("github%3Ajpalafox-12"));
  assert.equal(result.workerId, "github:jpalafox-12");
});

test("generateQRAscii with custom characters", () => {
  const ascii = generateQRAscii("test", { moduleChar: "X", spaceChar: "." });
  assert.ok(ascii.includes("X"));
  assert.ok(ascii.includes("."));
  assert.ok(!ascii.includes("██"));
});
