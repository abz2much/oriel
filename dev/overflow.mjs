/* Text overflow checks, with the mock hass. Usage: node dev/overflow.mjs   Exits 1 on any failure.
   BUNDLE=<file> checks another bundle (for example an older release); PAGES=energy,vacuum picks pages; LIST=1 prints every offender.
   At five tablet sizes, on Energy, Vacuum and System (and the System page's Update chip and Auto rotate row, with updates waiting):
   - no text may extend beyond the box that holds it (the card, tile or chip with a background or border), and
   - no box may clip its text (a box with overflow hidden whose content is taller or wider than the box).
   The layout is a fixed canvas that is scaled to the screen, so the sizes also cover the widened canvas (up to 1700 wide).
   Every size is checked at normal text and with every text 25% larger (Android's text scaling and minimum font size do that, and the boxes only had 3 to 10 px to spare). TEXT_ZOOM=1.15 checks one other scale, and MIN_FONT=14 lifts every text smaller than 14 px to 14 px (what Android's text scaling and minimum font size do), to find places that only just fit. */
import './freeze-time.mjs';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const bundle = fs.readFileSync(process.env.BUNDLE || 'dist/oriel.js', 'utf8');
const cfg = JSON.parse(fs.readFileSync('dev/configs/full-nova.json', 'utf8'));
cfg.energy.today.standing_charge = 0.97; /* the Net cost tile's second line */
cfg.energy.pv_strings = [{ name: 'PV1', entity: 'sensor.pv_east_power', panels: 8 }, { name: 'PV2', entity: 'sensor.pv_west_power', panels: 4 }];
const PAGES = (process.env.PAGES || 'energy,vacuum,system').split(','), SIZES = [[1024, 768], [1180, 820], [1280, 800], [1366, 1024], [1920, 1200]];
const ZOOMS = process.env.TEXT_ZOOM ? [+process.env.TEXT_ZOOM] : [1, 1.25], MINF = +(process.env.MIN_FONT || 0), LIST = !!process.env.LIST;
const results = []; const check = (n, ok, x) => results.push([ok ? 'PASS' : 'FAIL', n, x || '']);
const browser = await chromium.launch();

/* runs in the page: the offenders on the page that shows */
const SCAN = (key) => {
  const r = document.querySelector('oriel-shell').shadowRoot, pg = r.getElementById('pg' + key[0].toUpperCase() + key.slice(1)), out = [], TOL = 1.5;
  const visible = (e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 && e.getClientRects().length > 0; };
  /* the box a text sits in: the nearest ancestor that paints a background or a border (a card, a tile, a chip) */
  const holder = (el) => { for (let n = el.parentElement; n && n !== pg.parentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'contents') continue; const bg = cs.backgroundColor, painted = (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || cs.backgroundImage !== 'none' || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none'); if (painted && n.getBoundingClientRect().height > 8) return n; } return null; };
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
  const walker = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT);
  for (let tn; (tn = walker.nextNode());) {
    const txt = tn.textContent.trim(); if (!txt) continue;
    const el = tn.parentElement; if (!el || !visible(el) || el.closest('.hide') || (el.closest('svg') && el.tagName.toLowerCase() === 'title')) continue;
    const range = document.createRange(); range.selectNodeContents(tn); const q = range.getBoundingClientRect(); if (!q.width || !q.height) continue;
    const box = holder(el.closest('svg') ? el.closest('svg') : el); if (!box) continue;
    let b = box.getBoundingClientRect(), cut = false;
    for (let n = el; n && n !== box; n = n.parentElement) { const cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) cut = true; } /* a scroller shows the rest by scrolling */
    if (cut) continue;
    const d = { top: b.top - q.top, bottom: q.bottom - b.bottom, left: b.left - q.left, right: q.right - b.right };
    const worst = Math.max(d.top, d.bottom, d.left, d.right);
    if (worst > TOL) out.push({ kind: 'outside', text: txt.slice(0, 28), el: name(el), box: name(box), by: Math.round(worst * 10) / 10, side: Object.keys(d).find((k) => d[k] === worst) });
  }
  /* a box that clips: overflow hidden or clip, and more content than room */
  pg.querySelectorAll('*').forEach((e) => {
    if (!visible(e) || e.closest('svg')) return; const cs = getComputedStyle(e); if (!/(hidden|clip)/.test(cs.overflowY + cs.overflowX)) return;
    if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') return; /* a label that is meant to end in … or at N lines */
    if (!(e.textContent || '').trim()) return;
    const dy = e.scrollHeight - e.clientHeight, dx = e.scrollWidth - e.clientWidth;
    if (dy > TOL || dx > TOL) out.push({ kind: 'clipped', text: (e.textContent || '').trim().slice(0, 28), el: name(e), box: name(e), by: Math.round(Math.max(dy, dx) * 10) / 10, side: dy > TOL ? 'bottom' : 'right' });
  });
  return out;
};

async function open(W, H, ZOOM, extra) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: new Date(2026, 9, 27, 8, 12, 0) });
  await page.setContent('<!doctype html><html><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100%"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: () => Promise.resolve(), callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
  }, { cfg, st: Object.assign(mkStates(), extra || {}), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.clock.runFor(1500); await page.waitForTimeout(500);
  if (MINF) await page.evaluate((m) => { const r = document.querySelector('oriel-shell').shadowRoot, els = [...r.querySelectorAll('#screen *')].map((e) => [e, parseFloat(getComputedStyle(e).fontSize)]); els.forEach(([e, px]) => { if (px && px < m && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) e.style.setProperty('font-size', m + 'px', 'important'); }); }, MINF);
  if (ZOOM !== 1) await page.evaluate((z) => { const r = document.querySelector('oriel-shell').shadowRoot, els = [...r.querySelectorAll('#screen *')].map((e) => [e, parseFloat(getComputedStyle(e).fontSize)]); els.forEach(([e, px]) => { if (px) e.style.setProperty('font-size', px * z + 'px', 'important'); }); }, ZOOM); /* each element's own size, once (not compounded) */
  await page.evaluate(() => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.querySelector('oriel-shell').shadowRoot.appendChild(st); });
  return { page, errors };
}

for (const ZOOM of ZOOMS) for (const [W, H] of SIZES) {
  const { page, errors } = await open(W, H, ZOOM);
  for (const key of PAGES) {
    await page.evaluate((k) => document.querySelector('oriel-shell')._setPage(k), key); await page.clock.runFor(1200); await page.waitForTimeout(400);
    const bad = await page.evaluate(SCAN, key);
    check(`${W}x${H} text x${ZOOM} ${key}: no text outside its box, nothing clipped`, bad.length === 0, bad.slice(0, LIST ? 99 : 6).map((o) => `${o.kind} "${o.text}" (${o.el} in ${o.box}) by ${o.by}px at the ${o.side}`).join(' | '));
  }
  check(`${W}x${H} text x${ZOOM}: no page errors`, errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
results.forEach((r) => console.log(r[0], r[1], r[2] ? '  ' + r[2] : ''));
const f = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - f} passed, ${f} failed`);
process.exit(f ? 1 : 0);
