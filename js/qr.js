/* Byte-mode QR, error level M, versions 1–6. Draws an SVG. */
(function (root) {
  const ALIGN = {
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
  };
  // version: [eccPerBlock, blocks, dataPerBlock] — level M, one group through v6
  const SPEC = {
    1: [10, 1, 16],
    2: [16, 1, 28],
    3: [26, 1, 44],
    4: [18, 2, 32],
    5: [24, 2, 43],
    6: [16, 4, 27],
  };

  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (function gf() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function mul(a, b) {
    if (!a || !b) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  function rs(data, eccLen) {
    let gen = [1];
    for (let i = 0; i < eccLen; i++) {
      const next = new Array(gen.length + 1).fill(0);
      for (let j = 0; j < gen.length; j++) {
        next[j] ^= gen[j];
        next[j + 1] ^= mul(gen[j], EXP[i]);
      }
      gen = next;
    }
    const out = data.concat(new Array(eccLen).fill(0));
    for (let i = 0; i < data.length; i++) {
      const factor = out[i];
      if (!factor) continue;
      for (let j = 0; j < gen.length; j++) out[i + j] ^= mul(gen[j], factor);
    }
    return out.slice(data.length);
  }

  function pickVersion(len) {
    for (let v = 1; v <= 6; v++) {
      const spec = SPEC[v];
      if (spec[1] * spec[2] >= len + 3) return v;
    }
    return 6;
  }

  function dataBytes(bytes, version) {
    const spec = SPEC[version];
    const capacity = spec[1] * spec[2];
    const bits = [];
    function push(value, n) {
      for (let i = n - 1; i >= 0; i--) bits.push((value >> i) & 1);
    }
    push(0b0100, 4);
    push(bytes.length, 8);
    bytes.forEach((b) => push(b, 8));
    const maxBits = capacity * 8;
    for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    const out = [];
    for (let i = 0; i < bits.length; i += 8) {
      let n = 0;
      for (let b = 0; b < 8; b++) n = (n << 1) | bits[i + b];
      out.push(n);
    }
    let pad = 0;
    while (out.length < capacity) out.push(pad++ % 2 ? 0x11 : 0xec);
    return out;
  }

  function withEcc(data, version) {
    const [eccLen, blocks, per] = SPEC[version];
    const groups = [];
    for (let i = 0; i < blocks; i++) {
      const slice = data.slice(i * per, (i + 1) * per);
      groups.push({ data: slice, ecc: rs(slice, eccLen) });
    }
    const out = [];
    for (let i = 0; i < per; i++) groups.forEach((g) => out.push(g.data[i]));
    for (let i = 0; i < eccLen; i++) groups.forEach((g) => out.push(g.ecc[i]));
    return out;
  }

  function finder(m, r, c) {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const yy = r + y;
        const xx = c + x;
        if (yy < 0 || xx < 0 || yy >= m.length || xx >= m.length) continue;
        const on = y >= 0 && y <= 6 && x >= 0 && x <= 6 && (y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4));
        m[yy][xx] = on ? 1 : 0;
      }
    }
  }

  function build(version, codewords) {
    const n = 21 + (version - 1) * 4;
    const m = Array.from({ length: n }, () => Array(n).fill(null));
    const reserved = Array.from({ length: n }, () => Array(n).fill(false));
    function set(r, c, v) {
      m[r][c] = v;
      reserved[r][c] = true;
    }
    finder(m, 0, 0);
    finder(m, 0, n - 7);
    finder(m, n - 7, 0);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (m[i][j] !== null) reserved[i][j] = true;
        if (m[i][n - 8 + j] !== null) reserved[i][n - 8 + j] = true;
        if (m[n - 8 + i][j] !== null) reserved[n - 8 + i][j] = true;
      }
    }
    for (let i = 0; i < n; i++) {
      if (m[6][i] === null) set(6, i, i % 2 === 0 ? 1 : 0);
      if (m[i][6] === null) set(i, 6, i % 2 === 0 ? 1 : 0);
    }
    set(n - 8, 8, 1);
    const align = ALIGN[version] || [];
    const inFinder = (r, c) =>
      (r <= 8 && c <= 8) || (r <= 8 && c >= n - 9) || (r >= n - 9 && c <= 8);
    align.forEach((r) => {
      align.forEach((c) => {
        if (inFinder(r, c)) return;
        for (let y = -2; y <= 2; y++) {
          for (let x = -2; x <= 2; x++) {
            const edge = Math.max(Math.abs(x), Math.abs(y)) === 2 || (x === 0 && y === 0);
            set(r + y, c + x, edge ? 1 : 0);
          }
        }
      });
    });
    for (let i = 0; i < 9; i++) {
      if (i !== 6) reserved[8][i] = reserved[i][8] = true;
    }
    for (let i = 0; i < 8; i++) {
      reserved[8][n - 1 - i] = true;
      reserved[n - 1 - i][8] = true;
    }

    const bits = [];
    codewords.forEach((word) => {
      for (let i = 7; i >= 0; i--) bits.push((word >> i) & 1);
    });
    let bi = 0;
    for (let col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      const upward = ((col + 1) & 2) === 0;
      for (let i = 0; i < n; i++) {
        const row = upward ? n - 1 - i : i;
        for (const dc of [0, -1]) {
          const c = col + dc;
          if (reserved[row][c] || m[row][c] !== null) continue;
          m[row][c] = bi < bits.length ? bits[bi++] : 0;
        }
      }
    }
    return { m, reserved, n };
  }

  function formatBits(mask) {
    const data = mask;
    let rem = data << 10;
    for (let i = 14; i >= 10; i--) {
      if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
    }
    return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
  }

  function applyMask(m, reserved, mask) {
    const n = m.length;
    const out = m.map((row) => row.slice());
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (reserved[r][c]) continue;
        let flip = false;
        if (mask === 0) flip = (r + c) % 2 === 0;
        else if (mask === 1) flip = r % 2 === 0;
        else if (mask === 2) flip = c % 3 === 0;
        else if (mask === 3) flip = (r + c) % 3 === 0;
        else if (mask === 4) flip = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
        else if (mask === 5) flip = ((r * c) % 2) + ((r * c) % 3) === 0;
        else if (mask === 6) flip = (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
        else flip = (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
        if (flip) out[r][c] ^= 1;
      }
    }
    return out;
  }

  function paintFormat(m, mask) {
    const n = m.length;
    const bits = formatBits(mask);
    const bit = (i) => (bits >> (14 - i)) & 1;
    for (let i = 0; i <= 5; i++) m[i][8] = bit(i);
    m[7][8] = bit(6);
    m[8][8] = bit(7);
    m[8][7] = bit(8);
    for (let i = 9; i < 15; i++) m[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) m[8][n - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) m[n - 15 + i][8] = bit(i);
  }

  function penalty(m) {
    const n = m.length;
    let score = 0;
    for (let r = 0; r < n; r++) {
      let run = 1;
      for (let c = 1; c < n; c++) {
        if (m[r][c] === m[r][c - 1]) run++;
        else {
          if (run >= 5) score += 3 + run - 5;
          run = 1;
        }
      }
      if (run >= 5) score += 3 + run - 5;
    }
    for (let c = 0; c < n; c++) {
      let run = 1;
      for (let r = 1; r < n; r++) {
        if (m[r][c] === m[r - 1][c]) run++;
        else {
          if (run >= 5) score += 3 + run - 5;
          run = 1;
        }
      }
      if (run >= 5) score += 3 + run - 5;
    }
    let dark = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) dark += m[r][c] ? 1 : 0;
    score += Math.floor(Math.abs(dark / (n * n) - 0.5) * 20) * 10;
    return score;
  }

  function svg(matrix) {
    const n = matrix.length;
    let d = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) d += "M" + c + " " + r + "h1v1h-1z";
      }
    }
    const q = n + 8;
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ' +
      q +
      " " +
      q +
      '" shape-rendering="crispEdges"><rect x="-4" y="-4" width="' +
      q +
      '" height="' +
      q +
      '" fill="#fff"/><path fill="#111" d="' +
      d +
      '"/></svg>'
    );
  }

  function fundoraQrSvg(text) {
    const bytes = Array.from(new TextEncoder().encode(String(text)));
    const version = pickVersion(bytes.length);
    const { m, reserved } = build(version, withEcc(dataBytes(bytes, version), version));
    let best = null;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const painted = applyMask(m, reserved, mask);
      paintFormat(painted, mask);
      const score = penalty(painted);
      if (score < bestScore) {
        bestScore = score;
        best = painted;
      }
    }
    return svg(best);
  }

  root.fundoraQrSvg = fundoraQrSvg;
})(typeof window !== "undefined" ? window : globalThis);
