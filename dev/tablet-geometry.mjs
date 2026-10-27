/* Tablet guard: the position and size of every element on every page (and the open pop-ups) at tablet sizes must match
   dev/tablet-geometry.json, which was taken from the 0.4.0 bundle before the phone layout existed. New elements (the phone's
   tab bar, sheets and headings) must take no room on the tablet. The idle clock and phone layout never move a tablet pixel.
   Usage: node dev/tablet-geometry.mjs                check dist/oriel.js against the snapshot (npm test runs this)
          node dev/tablet-geometry.mjs --write [bundle]   write the snapshot from a bundle (default dist/oriel.js)
   A deliberate tablet change: run --write on the new bundle in the same pull request and say why in the changelog. */
import './freeze-time.mjs';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const WRITE = process.argv[2] === '--write', FILE = 'dev/tablet-geometry.json', TOL = 0.6;
const bundle = fs.readFileSync(WRITE && process.argv[3] ? process.argv[3] : 'dist/oriel.js', 'utf8');
const cfg = JSON.parse(fs.readFileSync('dev/configs/full-nova.json', 'utf8'));
cfg.home.camera_popups = [{ flag: 'input_boolean.door_cam', camera: 'camera.front', title: 'Front' }];
const SIZES = [[1280, 800], [1024, 768], [1366, 1024]];

/* runs in the page: every element under #screen (not inside svg drawings) keyed by its nearest id and its place among siblings */
const SNAP = () => {
  const root = document.querySelector('oriel-shell').shadowRoot, out = {};
  const key = (e) => { let path = [], n = e; while (n && n.id === '' && n.parentElement) { const sib = [...n.parentElement.children].indexOf(n); path.unshift(n.tagName.toLowerCase() + ':' + sib); n = n.parentElement; } return (n && n.id ? '#' + n.id : '') + (path.length ? '/' + path.join('/') : ''); };
  root.getElementById('screen').querySelectorAll('[id], button, input, select, textarea, a, [role=button], .chip, .card, .glass, .dark, .black, .nova, .lt, .tl, .at, .ot, .bt, .sc, .cell, .row, .round, .qa, .ap, .ev, .bn, .tr, svg').forEach((e) => { /* the blocks and controls: every box on a page */
    if (e.closest('svg') && e.tagName !== 'svg') return;
    const q = e.getBoundingClientRect(); if (!q.width || !q.height) return; out[key(e)] = [Math.round(q.left * 10) / 10, Math.round(q.top * 10) / 10, Math.round(q.width * 10) / 10, Math.round(q.height * 10) / 10];
  });
  return out;
};

const browser = await chromium.launch();
const all = {};
for (const [W, H] of SIZES) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.clock.install({ time: new Date(2026, 9, 27, 8, 12, 0) });
  await page.addInitScript(() => { let a = 12345; Math.random = () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; window.loadCardHelpers = async () => ({ createCardElement: async () => { const d = document.createElement('div'); d.textContent = 'camera'; return d; } }); });
  await page.setContent('<!doctype html><html><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100vw"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => { window.__calls = []; window.__ws = []; window.__api = []; window.__msgs = []; const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] }, callService: () => Promise.resolve(), callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') }; },
  { cfg, st: Object.assign(mkStates(), { 'input_boolean.door_cam': { entity_id: 'input_boolean.door_cam', state: 'off', attributes: {} } }), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.waitForTimeout(900);
  await page.evaluate(() => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.querySelector('oriel-shell').shadowRoot.appendChild(st); });
  const keys = await page.evaluate(() => Object.keys(document.querySelector('oriel-shell')._pages));
  for (const k of keys) {
    await page.evaluate((k) => document.querySelector('oriel-shell')._setPage(k), k); await page.waitForTimeout(450);
    all[`${W}x${H}/${k}`] = await page.evaluate(SNAP);
  }
  if (W === 1280) { /* the pop-ups on the tablet */
    const pops = { shop: () => document.querySelector('oriel-shell')._openShop(), vacuum_confirm: () => { const e = document.querySelector('oriel-shell'); e._setPage('vacuum'); e._vcAsk({ title: 'Start?', text: 'Text', label: 'Start', calls: [] }); }, nova_confirm: () => { const e = document.querySelector('oriel-shell'); e._setPage('nova'); e._nvConfirm(true); },
      camera: () => { const e = document.querySelector('oriel-shell'); e._setPage('home'); e.hass = Object.assign({}, e.hass, { states: Object.assign({}, e.hass.states, { 'input_boolean.door_cam': { entity_id: 'input_boolean.door_cam', state: 'on', attributes: {} } }) }); } };
    for (const [name, fn] of Object.entries(pops)) { await page.evaluate(fn); await page.waitForTimeout(400); all[`${W}x${H}/popup_${name}`] = await page.evaluate(SNAP); await page.reload; }
  }
  await page.close();
}
await browser.close();

if (WRITE) { fs.writeFileSync(FILE, JSON.stringify(all)); console.log('wrote', FILE, Object.keys(all).length, 'views,', Object.values(all).reduce((n, v) => n + Object.keys(v).length, 0), 'elements,', Math.round(fs.statSync(FILE).size / 1024) + ' KB'); process.exit(0); }
const base = JSON.parse(fs.readFileSync(FILE, 'utf8')), bad = [];
for (const [view, snap] of Object.entries(all)) {
  const b = base[view]; if (!b) { bad.push(view + ': not in the snapshot'); continue; }
  for (const [k, v] of Object.entries(b)) {
    const n = snap[k]; if (!n) { bad.push(`${view} ${k}: missing`); continue; }
    if (v.some((x, i) => Math.abs(x - n[i]) > TOL)) bad.push(`${view} ${k}: ${v.join(',')} -> ${n.join(',')}`);
  }
  /* an element that gained an id has a new key but the same box: pair it with the baseline key it replaces */
  const gone = Object.keys(b).filter((k) => !(k in snap)).map((k) => b[k].join()), news = Object.entries(snap).filter(([k]) => !(k in b));
  news.forEach(([k, n]) => { const i = gone.indexOf(n.join()); if (i >= 0) { gone.splice(i, 1); const j = bad.findIndex((x) => x.startsWith(`${view} `) && x.endsWith(': missing') && b[x.slice(view.length + 1, -9)] && b[x.slice(view.length + 1, -9)].join() === n.join()); if (j >= 0) bad.splice(j, 1); } else bad.push(`${view} ${k}: a new element takes room on the tablet (${n.join(',')})`); });
}
if (bad.length) { console.log('FAIL tablet layout differs from the 0.4.0 snapshot in ' + bad.length + ' place(s):'); bad.slice(0, 25).forEach((x) => console.log('  ' + x)); process.exit(1); }
console.log(`ok   tablet layout matches the 0.4.0 snapshot (${Object.keys(base).length} views, ${Object.values(base).reduce((n, v) => n + Object.keys(v).length, 0)} elements)`);
