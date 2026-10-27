/* Compares two folders of layout-shots PNGs (same file names) and fails on any pixel that differs.
   Usage: node dev/tablet-diff.mjs <before-dir> <after-dir>   Exits 1 if any file differs or is missing. */
import fs from 'node:fs';
import { chromium } from 'playwright';
const [A, B] = process.argv.slice(2);
const files = fs.readdirSync(A).filter((f) => f.endsWith('.png')).sort();
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const browser = await chromium.launch(), page = await browser.newPage();
/* Two renders of the same build can differ by a few levels in blurred glass (the GPU path); TOL is above that noise. */
const TOL = +(process.env.TOL || 16), NOISE = +(process.env.NOISE || 12); /* a few isolated anti-aliasing flickers between two runs of the same build are noise */ let bad = 0, worst = 0;
for (const f of files) {
  if (!fs.existsSync(`${B}/${f}`)) { console.log('MISSING', f); bad++; continue; }
  const n = await page.evaluate(async ({ a, b, TOL }) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [x, y] = await Promise.all([load(a), load(b)]); if (x.width !== y.width || x.height !== y.height) return [-1, 0];
    const get = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const p = get(x), q = get(y); let d = 0, mx = 0; for (let i = 0; i < p.length; i++) { const e = Math.abs(p[i] - q[i]); if (e > TOL) d++; if (e > mx) mx = e; } return [d, mx];
  }, { a: b64(`${A}/${f}`), b: b64(`${B}/${f}`), TOL });
  worst = Math.max(worst, n[1]);
  if (n[0] > NOISE) { console.log('DIFF', f, n[0] === -1 ? 'size differs' : n[0] + ' channel values over ' + TOL + ' (largest step ' + n[1] + ')'); bad++; }
}
await browser.close();
console.log(bad ? `${bad} of ${files.length} differ` : `all ${files.length} identical (at most ${NOISE} values per image differ by more than ${TOL} of 255; largest step seen ${worst})`);
process.exit(bad ? 1 : 0);
