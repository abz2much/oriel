/* Phone tap areas, with the mock hass. Usage: node dev/phone-taps.mjs   Exits 1 on any failure.
   On every phone page at 360, 390 and 412 wide, no two tappable controls may have overlapping tap areas. A control's tap area
   is its box plus its invisible ::after area (the 46 px areas round small controls), cut by any parent that clips overflow.
   Compared within one layer: the page, the header, the tab bar. A control inside another control is meant to sit on top of
   it, so those pairs are not compared. */
import './freeze-time.mjs';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const bundle = fs.readFileSync('dist/oriel.js', 'utf8');
const cfg = JSON.parse(fs.readFileSync('dev/configs/full-nova.json', 'utf8'));
const results = []; const check = (n, ok, x) => results.push([ok ? 'PASS' : 'FAIL', n, x || '']);
const browser = await chromium.launch();
const PHONES = [[360, 740], [390, 844], [412, 915]];

/* runs in the page: the overlapping pairs on the page that shows, in the header and in the tab bar */
const OVERLAPS = (key) => {
  const r = document.querySelector('oriel-shell').shadowRoot, pg = r.getElementById('pg' + key[0].toUpperCase() + key.slice(1));
  const SEL = 'a, button, input, select, textarea, [role=button], [role=switch], [role=checkbox], [tabindex]:not([tabindex="-1"])';
  const STOP = new Set([r.getElementById('pages'), r.getElementById('screen'), r.getElementById('wrap')]);
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '')) + (e.textContent.trim() ? ' "' + e.textContent.trim().replace(/\s+/g, ' ').slice(0, 16) + '"' : e.getAttribute('aria-label') ? ' "' + e.getAttribute('aria-label').slice(0, 16) + '"' : '');
  const tappable = (e) => {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') return false;
    const cs = getComputedStyle(e); if (cs.pointerEvents === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    if (e.matches(SEL)) return true;
    return cs.cursor === 'pointer' && (!e.parentElement || getComputedStyle(e.parentElement).cursor !== 'pointer');
  };
  const area = (e) => {
    const q = e.getBoundingClientRect(); if (!q.width || !q.height || !e.getClientRects().length) return null;
    let x0 = q.left, y0 = q.top, x1 = q.right, y1 = q.bottom;
    const af = getComputedStyle(e, '::after');
    if (af.content !== 'none' && af.position === 'absolute' && af.pointerEvents !== 'none' && af.display !== 'none') {
      const px = q.left + e.clientLeft, py = q.top + e.clientTop, l = parseFloat(af.left), t = parseFloat(af.top), rt = parseFloat(af.right), b = parseFloat(af.bottom);
      if ([l, t, rt, b].every(Number.isFinite)) { x0 = Math.min(x0, px + l); y0 = Math.min(y0, py + t); x1 = Math.max(x1, px + e.clientWidth - rt); y1 = Math.max(y1, py + e.clientHeight - b); }
    }
    for (let p = e.parentElement; p && !STOP.has(p); p = p.parentElement) { /* a parent that clips overflow cuts the area */
      const cs = getComputedStyle(p); if (cs.display === 'contents') continue; const pq = p.getBoundingClientRect();
      if (cs.overflowX !== 'visible') { x0 = Math.max(x0, pq.left); x1 = Math.min(x1, pq.right); }
      if (cs.overflowY !== 'visible') { y0 = Math.max(y0, pq.top); y1 = Math.min(y1, pq.bottom); }
    }
    return x1 - x0 > 0.5 && y1 - y0 > 0.5 ? { x0, y0, x1, y1 } : null;
  };
  const out = [];
  for (const [layer, root] of [['page', pg], ['header', r.getElementById('hdr')], ['tab bar', r.getElementById('tabs')]]) {
    const els = [...root.querySelectorAll('*')].filter(tappable).map((e) => ({ e, a: area(e) })).filter((x) => x.a);
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const p = els[i], q = els[j]; if (p.e.contains(q.e) || q.e.contains(p.e)) continue;
      const w = Math.min(p.a.x1, q.a.x1) - Math.max(p.a.x0, q.a.x0), h = Math.min(p.a.y1, q.a.y1) - Math.max(p.a.y0, q.a.y0);
      if (w > 0.5 && h > 0.5) out.push(`${layer}: ${name(p.e)} and ${name(q.e)} overlap ${w.toFixed(1)} x ${h.toFixed(1)}`);
    }
  }
  return out;
};

for (const [W, H] of PHONES) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: new Date(2026, 9, 27, 8, 12, 0) });
  await page.setContent('<!doctype html><html><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100%"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    window.__calls = [];
    const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: (d, s, data) => { window.__calls.push([d, s, data]); return Promise.resolve(); }, callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
  }, { cfg, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.waitForTimeout(700);
  const keys = await page.evaluate(() => Object.keys(document.querySelector('oriel-shell')._pages));
  for (const k of keys) {
    await page.evaluate((k) => document.querySelector('oriel-shell')._setPage(k), k); await page.waitForTimeout(450);
    const o = await page.evaluate(OVERLAPS, k);
    check(`${k} at ${W}x${H}: no two tap areas overlap`, o.length === 0, o.slice(0, 8).join(' | ') + (o.length > 8 ? ` | and ${o.length - 8} more` : ''));
  }
  check(`phone tap areas at ${W}x${H}: no errors`, errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
results.forEach((r) => console.log(r[0], r[1], r[2] ? '  ' + r[2] : ''));
const f = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - f} passed, ${f} failed`);
process.exit(f ? 1 : 0);
