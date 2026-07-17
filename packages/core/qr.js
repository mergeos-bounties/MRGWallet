/**
 * QR code generator for MRGWallet worker_id / github:login.
 * Pure JavaScript implementation — works offline with known id.
 */

import { SCAN_BASE } from "./wallet.js";

/**
 * Generate QR code data matrix for a given text string.
 * Returns a 2D boolean array where true = black module.
 * Based on QR Code Model 2 (ISO 18004).
 */
export function generateQRMatrix(text, errorCorrectionLevel = "M") {
  const data = textToBytes(text);
  const version = selectVersion(data.length, errorCorrectionLevel);
  const size = 17 + version * 4;
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  addFinderPatterns(matrix, reserved, size);
  addAlignmentPatterns(matrix, reserved, version, size);
  addTimingPatterns(matrix, reserved, size);
  addDarkModule(matrix, reserved, version);

  const dataBits = encodeData(data, version, errorCorrectionLevel);
  placeDataBits(matrix, reserved, dataBits, size);
  applyBestMask(matrix, reserved, size);

  return matrix;
}

/**
 * Generate QR code as ASCII art for terminal display.
 */
export function generateQRAscii(text, options = {}) {
  const { quietZone = 2, moduleChar = "██", spaceChar = "  " } = options;
  const matrix = generateQRMatrix(text);
  const lines = [];

  for (let i = 0; i < quietZone; i++) {
    lines.push(spaceChar.repeat(matrix[0].length + quietZone * 2));
  }

  for (const row of matrix) {
    let line = spaceChar.repeat(quietZone);
    for (const cell of row) {
      line += cell ? moduleChar : spaceChar;
    }
    line += spaceChar.repeat(quietZone);
    lines.push(line);
  }

  for (let i = 0; i < quietZone; i++) {
    lines.push(spaceChar.repeat(matrix[0].length + quietZone * 2));
  }

  return lines.join("\n");
}

/**
 * Generate QR code as SVG string.
 */
export function generateQRSvg(text, options = {}) {
  const { moduleSize = 10, margin = 4, foreground = "#000000", background = "#FFFFFF" } = options;
  const matrix = generateQRMatrix(text);
  const size = matrix.length;
  const svgSize = (size + margin * 2) * moduleSize;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">`;
  svg += `<rect width="${svgSize}" height="${svgSize}" fill="${background}"/>`;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x]) {
        svg += `<rect x="${(x + margin) * moduleSize}" y="${(y + margin) * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="${foreground}"/>`;
      }
    }
  }

  svg += "</svg>";
  return svg;
}

/**
 * Generate QR code as data URL (base64 encoded PNG-like format).
 * Uses SVG data URL for offline compatibility.
 */
export function generateQRDataUrl(text, options = {}) {
  const svg = generateQRSvg(text, options);
  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Build worker address URL for scan.mergeos.shop.
 */
export function buildWorkerAddressUrl(workerId) {
  const id = String(workerId || "").trim();
  if (!id) return null;
  return `${SCAN_BASE}/address/${encodeURIComponent(id)}`;
}

/**
 * Generate QR code for worker_id / github:login.
 * Works offline with known id.
 */
export function generateWorkerQR(workerId, options = {}) {
  const url = buildWorkerAddressUrl(workerId);
  if (!url) return null;

  const format = options.format || "ascii";

  switch (format) {
    case "matrix":
      return { matrix: generateQRMatrix(url), url, workerId };
    case "svg":
      return { svg: generateQRSvg(url, options), url, workerId };
    case "dataurl":
      return { dataUrl: generateQRDataUrl(url, options), url, workerId };
    case "ascii":
    default:
      return { ascii: generateQRAscii(url, options), url, workerId };
  }
}

/**
 * Generate QR code for a specific task claim URL.
 */
export function generateTaskClaimQR(taskId, workerId, options = {}) {
  const id = String(taskId || "").trim();
  const worker = String(workerId || "").trim();
  if (!id || !worker) return null;

  const url = `${SCAN_BASE}/address/${encodeURIComponent(worker)}?task=${encodeURIComponent(id)}`;
  const format = options.format || "ascii";

  switch (format) {
    case "matrix":
      return { matrix: generateQRMatrix(url), url, taskId: id, workerId: worker };
    case "svg":
      return { svg: generateQRSvg(url, options), url, taskId: id, workerId: worker };
    case "dataurl":
      return { dataUrl: generateQRDataUrl(url, options), url, taskId: id, workerId: worker };
    case "ascii":
    default:
      return { ascii: generateQRAscii(url, options), url, taskId: id, workerId: worker };
  }
}

// --- Internal QR code generation functions ---

function textToBytes(text) {
  const encoder = new TextEncoder();
  return encoder.encode(String(text));
}

function selectVersion(dataLength, ecl) {
  const capacities = {
    L: [17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953],
    M: [14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331],
    Q: [11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 177, 203, 241, 258, 292, 322, 364, 394, 442, 482, 509, 565, 611, 661, 715, 751, 805, 868, 908, 982, 1030, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663],
    H: [7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 137, 155, 177, 194, 220, 250, 280, 310, 338, 382, 403, 439, 461, 511, 535, 593, 625, 657, 698, 742, 790, 842, 898, 958, 983, 1051, 1093, 1139, 1219, 1273],
  };

  const eclKey = ecl.toUpperCase();
  const caps = capacities[eclKey] || capacities.M;

  for (let v = 1; v <= 40; v++) {
    if (dataLength <= caps[v - 1]) return v;
  }
  return 40;
}

function addFinderPatterns(matrix, reserved, size) {
  const pattern = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];

  const positions = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];

  for (const [row, col] of positions) {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        matrix[row + y][col + x] = pattern[y][x] === 1;
        reserved[row + y][col + x] = true;
      }
    }
  }

  for (const [row, col] of positions) {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const y = row + i;
        const x = col + j;
        if (y >= 0 && y < size && x >= 0 && x < size && !reserved[y][x]) {
          matrix[y][x] = false;
          reserved[y][x] = true;
        }
      }
    }
  }
}

function addAlignmentPatterns(matrix, reserved, version, size) {
  if (version < 2) return;

  const positions = getAlignmentPositions(version, size);
  for (const row of positions) {
    for (const col of positions) {
      if (reserved[row][col]) continue;
      for (let y = -2; y <= 2; y++) {
        for (let x = -2; x <= 2; x++) {
          const ny = row + y;
          const nx = col + x;
          if (ny >= 0 && ny < size && nx >= 0 && nx < size) {
            matrix[ny][nx] = Math.abs(y) === 2 || Math.abs(x) === 2 || (y === 0 && x === 0);
            reserved[ny][nx] = true;
          }
        }
      }
    }
  }
}

function getAlignmentPositions(version, size) {
  if (version === 1) return [];
  const first = 6;
  const last = size - 7;
  const count = Math.floor(version / 7) + 2;
  const step = Math.round((last - first) / (count - 1));
  const positions = [first];
  for (let i = 1; i < count - 1; i++) {
    positions.push(first + step * i);
  }
  positions.push(last);
  return positions;
}

function addTimingPatterns(matrix, reserved, size) {
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) {
      matrix[6][i] = i % 2 === 0;
      reserved[6][i] = true;
    }
    if (!reserved[i][6]) {
      matrix[i][6] = i % 2 === 0;
      reserved[i][6] = true;
    }
  }
}

function addDarkModule(matrix, reserved, version) {
  const row = 4 * version + 9;
  matrix[row][8] = true;
  reserved[row][8] = true;
}

function encodeData(data, version, ecl) {
  const bits = [];
  const mode = 4;
  bits.push(...intToBits(mode, 4));
  bits.push(...intToBits(data.length, getCharCountBits(version)));
  for (const byte of data) {
    bits.push(...intToBits(byte, 8));
  }
  const capacity = getDataCapacity(version, ecl);
  const terminator = Math.min(4, capacity - bits.length);
  bits.push(...Array(terminator).fill(0));
  while (bits.length % 8 !== 0) bits.push(0);
  return bits;
}

function getCharCountBits(version) {
  if (version <= 9) return 8;
  if (version <= 26) return 16;
  return 16;
}

function getDataCapacity(version, ecl) {
  const totalModules = (17 + version * 4) ** 2;
  const functionModules = 3 * 8 * 8 + 2 * (15 + (version - 1) * 4) + 25;
  return totalModules - functionModules;
}

function intToBits(value, length) {
  const bits = [];
  for (let i = length - 1; i >= 0; i--) {
    bits.push((value >> i) & 1);
  }
  return bits;
}

function placeDataBits(matrix, reserved, dataBits, size) {
  let bitIndex = 0;
  let upward = true;

  for (let col = size - 1; col >= 0; col -= 2) {
    if (col === 6) col--;
    const rows = upward ? Array.from({ length: size }, (_, i) => size - 1 - i) : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        if (x < 0 || x >= size) continue;
        if (reserved[row][x]) continue;
        matrix[row][x] = bitIndex < dataBits.length ? dataBits[bitIndex] === 1 : false;
        bitIndex++;
      }
    }
    upward = !upward;
  }
}

function applyBestMask(matrix, reserved, size) {
  let bestMask = 0;
  let bestPenalty = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const masked = applyMask(matrix, reserved, size, mask);
    const penalty = calculatePenalty(masked, size);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
    }
  }

  applyMask(matrix, reserved, size, bestMask);
  addFormatInfo(matrix, size, bestMask);
}

function applyMask(matrix, reserved, size, mask) {
  const result = matrix.map((row) => [...row]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (reserved[y][x]) continue;
      let shouldFlip = false;
      switch (mask) {
        case 0:
          shouldFlip = (y + x) % 2 === 0;
          break;
        case 1:
          shouldFlip = y % 2 === 0;
          break;
        case 2:
          shouldFlip = x % 3 === 0;
          break;
        case 3:
          shouldFlip = (y + x) % 3 === 0;
          break;
        case 4:
          shouldFlip = (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
          break;
        case 5:
          shouldFlip = ((y * x) % 2 + (y * x) % 3) === 0;
          break;
        case 6:
          shouldFlip = ((y * x) % 2 + (y * x) % 3) % 2 === 0;
          break;
        case 7:
          shouldFlip = ((y + x) % 2 + (y * x) % 3) % 2 === 0;
          break;
      }
      if (shouldFlip) result[y][x] = !result[y][x];
    }
  }
  return result;
}

function calculatePenalty(matrix, size) {
  let penalty = 0;
  for (let y = 0; y < size; y++) {
    let count = 1;
    for (let x = 1; x < size; x++) {
      if (matrix[y][x] === matrix[y][x - 1]) {
        count++;
        if (count === 5) penalty += 3;
        else if (count > 5) penalty += 1;
      } else {
        count = 1;
      }
    }
  }
  return penalty;
}

function addFormatInfo(matrix, size, mask) {
  const formatBits = (0b0001 << 3) | mask;
  const formatString = formatBits.toString(2).padStart(10, "0");

  for (let i = 0; i < 6; i++) {
    matrix[8][i] = formatString[i] === "1";
  }
  matrix[8][7] = formatString[6] === "1";
  matrix[8][8] = formatString[7] === "1";
  matrix[7][8] = formatString[8] === "1";

  for (let i = 0; i < 6; i++) {
    matrix[size - 1 - i][8] = formatString[9 - i] === "1";
  }
}
