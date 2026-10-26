/* Compares two folders of theme-harness PNGs pixel by pixel.
   Usage: node dev/themediff.mjs <before dir> <after dir> [heatmap dir] [max ΔE, default 2.5]
   Per image: pixels that differ at all, largest ΔE2000, and pixels over the limit. A heat map (grey = same,
   yellow = changed within the limit, red = over it) is written when a heatmap dir is given.
   Exits 1 if any pixel is over the limit. */
import fs from 'node:fs';
import { chromium } from 'playwright';

const [A, B, HM, LIM = '2.5'] = process.argv.slice(2);
const limit = +LIM;
if (HM) fs.mkdirSync(HM, { recursive: true });
const names = fs.readdirSync(A).filter((f) => f.endsWith('.png') && fs.existsSync(`${B}/${f}`)).sort();
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();
let bad = 0;
for (const n of names) {
  const r = await page.evaluate(async ({ a, b, limit, want }) => {
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const W = ia.width, H = ia.height;
    const get = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, W, H).data; };
    const da = get(ia), db = get(ib), out = new ImageData(W, H);
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const lab = (r, g, bb) => {
      r = lin(r); g = lin(g); bb = lin(bb);
      const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
      const x = t((r * 0.4124 + g * 0.3576 + bb * 0.1805) / 0.95047), y = t(r * 0.2126 + g * 0.7152 + bb * 0.0722), z = t((r * 0.0193 + g * 0.1192 + bb * 0.9505) / 1.08883);
      return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
    };
    const rad = Math.PI / 180;
    const de = (p, q) => {
      const [L1, a1, b1] = p, [L2, a2, b2] = q;
      const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2, G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
      const ap1 = a1 * (1 + G), ap2 = a2 * (1 + G), Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
      const hp = (x, y) => { const v = Math.atan2(y, x) / rad; return v < 0 ? v + 360 : v; };
      const h1 = hp(ap1, b1), h2 = hp(ap2, b2);
      let dh = h2 - h1; if (Math.abs(dh) > 180) dh -= Math.sign(dh) * 360;
      const dL = L2 - L1, dC = Cp2 - Cp1, dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh / 2) * rad);
      const Lm = (L1 + L2) / 2, Cpm = (Cp1 + Cp2) / 2; let hm = (h1 + h2) / 2; if (Math.abs(h1 - h2) > 180) hm += 180;
      const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
      const SL = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2), SC = 1 + 0.045 * Cpm, SH = 1 + 0.015 * Cpm * T;
      const RT = -2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
      return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
    };
    let changed = 0, over = 0, max = 0, bx = [1e9, 1e9, -1, -1];
    for (let i = 0; i < da.length; i += 4) {
      const same = da[i] === db[i] && da[i + 1] === db[i + 1] && da[i + 2] === db[i + 2];
      if (same) { const v = da[i] * 0.25 + 40; out.data[i] = out.data[i + 1] = out.data[i + 2] = v; out.data[i + 3] = 255; continue; }
      changed++;
      const d = de(lab(da[i], da[i + 1], da[i + 2]), lab(db[i], db[i + 1], db[i + 2]));
      if (d > max) max = d;
      if (d > limit) { over++; const px = (i / 4) % W, py = Math.floor(i / 4 / W); bx = [Math.min(bx[0], px), Math.min(bx[1], py), Math.max(bx[2], px), Math.max(bx[3], py)]; out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 0; } else { out.data[i] = 255; out.data[i + 1] = 210; out.data[i + 2] = 0; }
      out.data[i + 3] = 255;
    }
    let png = null;
    if (want && changed) { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').putImageData(out, 0, 0); png = c.toDataURL('image/png'); }
    return { changed, over, max, total: W * H, png, bx: over ? bx.join(',') : '' };
  }, { a: b64(`${A}/${n}`), b: b64(`${B}/${n}`), limit, want: !!HM });
  if (HM && r.png) fs.writeFileSync(`${HM}/${n}`, Buffer.from(r.png.split(',')[1], 'base64'));
  if (r.over) bad++;
  console.log(`${n.padEnd(20)} changed ${String(r.changed).padStart(7)} (${((100 * r.changed) / r.total).toFixed(3)}%)  max ΔE ${r.max.toFixed(2).padStart(6)}  over ${r.over}${r.bx ? '  at ' + r.bx : ''}`);
}
await browser.close();
process.exit(bad ? 1 : 0);
