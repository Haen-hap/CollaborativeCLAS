/**
 * Autonomous ISO/IEC 18004 Byte-Mode QR Matrix Synthesizer (Level L, v1–v5).
 * Generates 2D boolean module grids and renders directly onto HTMLCanvasElement
 * surfaces without external runtime dependencies.
 */

const GALOIS_EXP_TABLE = new Uint8Array(512);
const GALOIS_LOG_TABLE = new Uint8Array(256);

(function bootstrapGaloisField() {
  let accumulator = 1;
  for (let idx = 0; idx < 255; idx += 1) {
    GALOIS_EXP_TABLE[idx] = accumulator;
    GALOIS_LOG_TABLE[accumulator] = idx;
    accumulator <<= 1;
    if (accumulator & 0x100) {
      accumulator ^= 0x11d;
    }
  }
  for (let idx = 255; idx < GALOIS_EXP_TABLE.length; idx += 1) {
    GALOIS_EXP_TABLE[idx] = GALOIS_EXP_TABLE[idx - 255];
  }
})();

const VERSION_CAPACITY_SPECS = Object.freeze({
  1: { totalBytes: 26, payloadBytes: 19, alignmentCenters: [] },
  2: { totalBytes: 44, payloadBytes: 34, alignmentCenters: [6, 18] },
  3: { totalBytes: 70, payloadBytes: 55, alignmentCenters: [6, 22] },
  4: { totalBytes: 100, payloadBytes: 80, alignmentCenters: [6, 26] },
  5: { totalBytes: 134, payloadBytes: 108, alignmentCenters: [6, 30] },
});

function galoisMultiply(leftFactor, rightFactor) {
  if (leftFactor === 0 || rightFactor === 0) {
    return 0;
  }
  return GALOIS_EXP_TABLE[
    GALOIS_LOG_TABLE[leftFactor] + GALOIS_LOG_TABLE[rightFactor]
  ];
}

function buildReedSolomonGenerator(eccDegree) {
  let poly = [1];
  for (let step = 0; step < eccDegree; step += 1) {
    const nextPoly = new Array(poly.length + 1).fill(0);
    for (let pos = 0; pos < poly.length; pos += 1) {
      nextPoly[pos] ^= poly[pos];
      nextPoly[pos + 1] ^= galoisMultiply(poly[pos], GALOIS_EXP_TABLE[step]);
    }
    poly = nextPoly;
  }
  return poly;
}

function computeParityBytes(payloadCodewords, eccDegree) {
  const generatorPoly = buildReedSolomonGenerator(eccDegree);
  const register = [
    ...payloadCodewords,
    ...new Array(eccDegree).fill(0),
  ];

  for (let idx = 0; idx < payloadCodewords.length; idx += 1) {
    const leadCoefficient = register[idx];
    if (leadCoefficient !== 0) {
      for (let offset = 0; offset < generatorPoly.length; offset += 1) {
        register[idx + offset] ^= galoisMultiply(
          generatorPoly[offset],
          leadCoefficient,
        );
      }
    }
  }

  return register.slice(payloadCodewords.length);
}

function pushBitSequence(targetBits, numericValue, bitWidth) {
  for (let shift = bitWidth - 1; shift >= 0; shift -= 1) {
    targetBits.push((numericValue >>> shift) & 1);
  }
}

function encodePayloadStream(rawText) {
  const utf8Octets = new TextEncoder().encode(rawText);
  const selectedVersion = [1, 2, 3, 4, 5].find(
    (ver) => utf8Octets.length <= VERSION_CAPACITY_SPECS[ver].payloadBytes - 2,
  );

  if (!selectedVersion) {
    throw new Error(
      "Target URI exceeds the maximum byte capacity for local QR synthesis.",
    );
  }

  const { totalBytes, payloadBytes } = VERSION_CAPACITY_SPECS[selectedVersion];
  const bitStream = [];

  // Byte mode indicator (0100) + character count
  pushBitSequence(bitStream, 0b0100, 4);
  pushBitSequence(bitStream, utf8Octets.length, 8);
  for (const octet of utf8Octets) {
    pushBitSequence(bitStream, octet, 8);
  }

  const capacityBits = payloadBytes * 8;
  pushBitSequence(bitStream, 0, Math.min(4, capacityBits - bitStream.length));
  while (bitStream.length % 8 !== 0) {
    bitStream.push(0);
  }

  const payloadCodewords = [];
  for (let cursor = 0; cursor < bitStream.length; cursor += 8) {
    let byteVal = 0;
    for (let bitOffset = 0; bitOffset < 8; bitOffset += 1) {
      byteVal = (byteVal << 1) | bitStream[cursor + bitOffset];
    }
    payloadCodewords.push(byteVal);
  }

  const padAlternator = [0xec, 0x11];
  let padIdx = 0;
  while (payloadCodewords.length < payloadBytes) {
    payloadCodewords.push(padAlternator[padIdx % 2]);
    padIdx += 1;
  }

  return {
    version: selectedVersion,
    totalBytes,
    payloadBytes,
    payloadCodewords,
  };
}

function calculateBchRemainder(value, generatorBits) {
  let remainder = value;
  const polyDegree = 31 - Math.clz32(generatorBits);
  while (remainder !== 0 && 31 - Math.clz32(remainder) >= polyDegree) {
    remainder ^=
      generatorBits << (31 - Math.clz32(remainder) - polyDegree);
  }
  return remainder;
}

function assembleModuleGrid(version, fullCodewords) {
  const dimension = version * 4 + 17;
  const grid = Array.from({ length: dimension }, () =>
    new Array(dimension).fill(null),
  );

  const assignCell = (col, row, isDark) => {
    if (col >= 0 && row >= 0 && col < dimension && row < dimension) {
      grid[row][col] = Boolean(isDark);
    }
  };

  const stampFinderPattern = (centerCol, centerRow) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const chebyshevRadius = Math.max(Math.abs(dx), Math.abs(dy));
        assignCell(
          centerCol + dx,
          centerRow + dy,
          chebyshevRadius !== 2 && chebyshevRadius !== 4,
        );
      }
    }
  };

  stampFinderPattern(3, 3);
  stampFinderPattern(dimension - 4, 3);
  stampFinderPattern(3, dimension - 4);

  for (let pos = 8; pos < dimension - 8; pos += 1) {
    if (grid[6][pos] === null) assignCell(pos, 6, pos % 2 === 0);
    if (grid[pos][6] === null) assignCell(6, pos, pos % 2 === 0);
  }

  const { alignmentCenters } = VERSION_CAPACITY_SPECS[version];
  for (const centerRow of alignmentCenters) {
    for (const centerCol of alignmentCenters) {
      if (grid[centerRow][centerCol] !== null) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          assignCell(
            centerCol + dx,
            centerRow + dy,
            Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
          );
        }
      }
    }
  }

  for (let idx = 0; idx < 9; idx += 1) {
    if (grid[8][idx] === null) assignCell(idx, 8, false);
    if (grid[idx][8] === null) assignCell(8, idx, false);
  }
  for (let idx = 0; idx < 8; idx += 1) {
    assignCell(dimension - 1 - idx, 8, false);
    assignCell(8, dimension - 1 - idx, false);
  }
  assignCell(8, dimension - 8, true);

  const serialBits = [];
  for (const codeword of fullCodewords) {
    pushBitSequence(serialBits, codeword, 8);
  }

  let bitPointer = 0;
  let ascendingScan = true;

  for (let rightCol = dimension - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol -= 1;
    for (let step = 0; step < dimension; step += 1) {
      const row = ascendingScan ? dimension - 1 - step : step;
      for (let pairOffset = 0; pairOffset < 2; pairOffset += 1) {
        const col = rightCol - pairOffset;
        if (grid[row][col] !== null) continue;
        const bitVal = serialBits[bitPointer] ?? 0;
        bitPointer += 1;
        const maskedBit = bitVal ^ ((col + row) % 2 === 0 ? 1 : 0);
        assignCell(col, row, maskedBit);
      }
    }
    ascendingScan = !ascendingScan;
  }

  const formatPrefix = 0b01 << 3;
  const formatBits =
    ((formatPrefix << 10) |
      calculateBchRemainder(formatPrefix << 10, 0x537)) ^
    0x5412;

  for (let idx = 0; idx <= 5; idx += 1) {
    assignCell(8, idx, (formatBits >>> idx) & 1);
  }
  assignCell(8, 7, (formatBits >>> 6) & 1);
  assignCell(8, 8, (formatBits >>> 7) & 1);
  assignCell(7, 8, (formatBits >>> 8) & 1);
  for (let idx = 9; idx < 15; idx += 1) {
    assignCell(14 - idx, 8, (formatBits >>> idx) & 1);
  }
  for (let idx = 0; idx < 8; idx += 1) {
    assignCell(dimension - 1 - idx, 8, (formatBits >>> idx) & 1);
  }
  for (let idx = 8; idx < 15; idx += 1) {
    assignCell(8, dimension - 15 + idx, (formatBits >>> idx) & 1);
  }

  return grid;
}

export function buildQrMatrixGrid(targetUri) {
  const { version, totalBytes, payloadBytes, payloadCodewords } =
    encodePayloadStream(targetUri);
  const parityBytes = computeParityBytes(
    payloadCodewords,
    totalBytes - payloadBytes,
  );
  return assembleModuleGrid(version, [...payloadCodewords, ...parityBytes]);
}

export function drawMatrixGridToCanvas(
  canvasElement,
  matrixGrid,
  {
    pixelScale = 8,
    quietZone = 4,
    darkModuleHex = "#0A192F",
    lightSurfaceHex = "#FFFFFF",
  } = {},
) {
  if (!canvasElement || !Array.isArray(matrixGrid)) {
    throw new Error("A valid HTMLCanvasElement and matrix grid are required.");
  }

  const moduleCount = matrixGrid.length;
  const totalDimensionPx = (moduleCount + quietZone * 2) * pixelScale;

  canvasElement.width = totalDimensionPx;
  canvasElement.height = totalDimensionPx;

  const ctx2d = canvasElement.getContext("2d");
  ctx2d.fillStyle = lightSurfaceHex;
  ctx2d.fillRect(0, 0, totalDimensionPx, totalDimensionPx);

  ctx2d.fillStyle = darkModuleHex;
  for (let rowIdx = 0; rowIdx < moduleCount; rowIdx += 1) {
    const rowCells = matrixGrid[rowIdx];
    for (let colIdx = 0; colIdx < moduleCount; colIdx += 1) {
      if (rowCells[colIdx]) {
        ctx2d.fillRect(
          (colIdx + quietZone) * pixelScale,
          (rowIdx + quietZone) * pixelScale,
          pixelScale,
          pixelScale,
        );
      }
    }
  }

  return {
    dimensionPx: totalDimensionPx,
    moduleCount,
  };
}

export function paintQrOntoCanvas(
  canvasElement,
  targetUri,
  options = {},
) {
  const matrixGrid = buildQrMatrixGrid(targetUri);
  return drawMatrixGridToCanvas(canvasElement, matrixGrid, options);
}

export function makeQrDataUrl(text, scale = 8, margin = 4) {
  const offscreenCanvas = document.createElement("canvas");
  paintQrOntoCanvas(offscreenCanvas, text, {
    pixelScale: scale,
    quietZone: margin,
  });
  return offscreenCanvas.toDataURL("image/png");
}
