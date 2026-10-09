// Compact byte-mode QR encoder (error correction level L, versions 1–5).
// This keeps QR generation local and avoids a runtime service or dependency.
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
let gfValue = 1;

for (let index = 0; index < 255; index += 1) {
  GF_EXP[index] = gfValue;
  GF_LOG[gfValue] = index;
  gfValue <<= 1;
  if (gfValue & 0x100) gfValue ^= 0x11d;
}
for (let index = 255; index < GF_EXP.length; index += 1) {
  GF_EXP[index] = GF_EXP[index - 255];
}

const BLOCKS = [null, [[1, 26, 19]], [[1, 44, 34]], [[1, 70, 55]], [[1, 100, 80]], [[1, 134, 108]]];
const ALIGNMENT = [[], [], [6, 18], [6, 22], [6, 26], [6, 30]];

function multiply(a, b) {
  return a && b ? GF_EXP[GF_LOG[a] + GF_LOG[b]] : 0;
}

function makeGenerator(degree) {
  let polynomial = [1];
  for (let index = 0; index < degree; index += 1) {
    const next = new Array(polynomial.length + 1).fill(0);
    polynomial.forEach((coefficient, position) => {
      next[position] ^= coefficient;
      next[position + 1] ^= multiply(coefficient, GF_EXP[index]);
    });
    polynomial = next;
  }
  return polynomial;
}

function errorCorrection(data, degree) {
  const generator = makeGenerator(degree);
  const result = [...data, ...new Array(degree).fill(0)];
  for (let index = 0; index < data.length; index += 1) {
    const factor = result[index];
    if (factor) {
      generator.forEach((coefficient, offset) => {
        result[index + offset] ^= multiply(coefficient, factor);
      });
    }
  }
  return result.slice(data.length);
}

function appendBits(bits, value, length) {
  for (let bit = length - 1; bit >= 0; bit -= 1) bits.push((value >>> bit) & 1);
}

function makeData(text) {
  const bytes = new TextEncoder().encode(text);
  const version = [1, 2, 3, 4, 5].find((item) => bytes.length <= BLOCKS[item][0][2] - 2);
  if (!version) throw new Error("URL is too long for the built-in QR generator.");

  const [, totalCodewords, dataCodewords] = BLOCKS[version][0];
  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((byte) => appendBits(bits, byte, 8));
  const maxBits = dataCodewords * 8;
  appendBits(bits, 0, Math.min(4, maxBits - bits.length));
  while (bits.length % 8) bits.push(0);

  const data = [];
  for (let index = 0; index < bits.length; index += 8) {
    data.push(bits.slice(index, index + 8).reduce((value, bit) => (value << 1) | bit, 0));
  }
  for (let pad = 0; data.length < dataCodewords; pad += 1) data.push(pad % 2 ? 0x11 : 0xec);
  return { version, totalCodewords, dataCodewords, data };
}

function bch(value, polynomial) {
  let result = value;
  const degree = 31 - Math.clz32(polynomial);
  while (result && 31 - Math.clz32(result) >= degree) {
    result ^= polynomial << (31 - Math.clz32(result) - degree);
  }
  return result;
}

function createMatrix(version, codewords) {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(null));
  const set = (x, y, value) => {
    if (x >= 0 && y >= 0 && x < size && y < size) modules[y][x] = Boolean(value);
  };

  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, distance !== 2 && distance !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  for (let index = 8; index < size - 8; index += 1) {
    if (modules[6][index] === null) set(index, 6, index % 2 === 0);
    if (modules[index][6] === null) set(6, index, index % 2 === 0);
  }

  ALIGNMENT[version].forEach((cy) => ALIGNMENT[version].forEach((cx) => {
    if (modules[cy][cx] !== null) return;
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }));

  // Reserve format information and the fixed dark module.
  for (let index = 0; index < 9; index += 1) {
    if (modules[8][index] === null) set(index, 8, false);
    if (modules[index][8] === null) set(8, index, false);
  }
  for (let index = 0; index < 8; index += 1) {
    set(size - 1 - index, 8, false);
    set(8, size - 1 - index, false);
  }
  set(8, size - 8, true);

  const dataBits = [];
  codewords.forEach((byte) => appendBits(dataBits, byte, 8));
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let step = 0; step < size; step += 1) {
      const y = upward ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        if (modules[y][x] !== null) continue;
        const rawBit = dataBits[bitIndex] ?? 0;
        bitIndex += 1;
        set(x, y, rawBit ^ ((x + y) % 2 === 0)); // QR mask pattern 0
      }
    }
    upward = !upward;
  }

  const formatData = 0b01 << 3; // L error correction, mask 0
  const format = ((formatData << 10) | bch(formatData << 10, 0x537)) ^ 0x5412;
  for (let index = 0; index <= 5; index += 1) set(8, index, (format >>> index) & 1);
  set(8, 7, (format >>> 6) & 1);
  set(8, 8, (format >>> 7) & 1);
  set(7, 8, (format >>> 8) & 1);
  for (let index = 9; index < 15; index += 1) set(14 - index, 8, (format >>> index) & 1);
  for (let index = 0; index < 8; index += 1) set(size - 1 - index, 8, (format >>> index) & 1);
  for (let index = 8; index < 15; index += 1) set(8, size - 15 + index, (format >>> index) & 1);

  return modules;
}

export function makeQrDataUrl(text, scale = 8, margin = 4) {
  const { version, data, dataCodewords, totalCodewords } = makeData(text);
  const ecc = errorCorrection(data, totalCodewords - dataCodewords);
  const matrix = createMatrix(version, [...data, ...ecc]);
  const size = matrix.length;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = (size + margin * 2) * scale;
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111827";
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) context.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale);
  }));
  return canvas.toDataURL("image/png");
}
