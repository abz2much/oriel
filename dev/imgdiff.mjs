/* Pixel diff of two PNGs (optionally one region) in headless Chromium, no extra packages.
   Usage: node dev/imgdiff.mjs a.png b.png [x y w h] [out.png]
   Prints the share of pixels that differ by more than a small tolerance; writes a diff image if asked. */
import fs from 'node:fs';
import { chromium } from 'playwright';

const [a, b, x = 0, y = 0, w = 0, h = 0, out] = process.argv.slice(2);
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();
const res = await page.evaluate(async ({ A, B, x, y, w, h, wantOut }) => {
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const [ia, ib] = await Promise.all([load(A), load(B)]);
  const W = +w || ia.width, H = +h || ia.height;
  const get = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(img, -x, -y); return g.getImageData(0, 0, W, H); };
  const da = get(ia), db = get(ib), dc = new ImageData(W, H);
  let diff = 0;
  for (let i = 0; i < da.data.length; i += 4) {
    const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
    if (d > 24) { diff++; dc.data[i] = 255; dc.data[i + 3] = 255; } else { dc.data[i] = dc.data[i + 1] = dc.data[i + 2] = da.data[i] * .3; dc.data[i + 3] = 255; }
  }
  let png = null;
  if (wantOut) { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').putImageData(dc, 0, 0); png = c.toDataURL('image/png'); }
  return { pct: (100 * diff / (W * H)).toFixed(3), diff, total: W * H, png };
}, { A: b64(a), B: b64(b), x: +x, y: +y, w: +w, h: +h, wantOut: !!out });
if (out && res.png) fs.writeFileSync(out, Buffer.from(res.png.split(',')[1], 'base64'));
console.log(`different pixels: ${res.diff} of ${res.total} (${res.pct}%)`);
await browser.close();
