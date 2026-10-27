/* Every rail page at several viewport sizes, with a frozen start time so two runs of the same build match pixel for pixel.
   Usage: SIZES=1280x800,1024x768 CFG=full-nova OUT=dev/out/tablet node dev/layout-shots.mjs [page ...]
   Defaults: the four tablet sizes, config full-nova (every page on, Nova installed), every page in the rail.
   Phone sizes for the phone layout: SIZES=390x844,360x740,412x915. Compare two runs with dev/imgdiff.mjs. */
import './freeze-time.mjs'; /* first: the mock states are built from the current time */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const SIZES = (process.env.SIZES || '1280x800,1024x768,1366x1024,1920x1080').split(',').map((s) => s.split('x').map(Number));
const CFG = process.env.CFG || 'full-nova', OUT = process.env.OUT || 'dev/out/layout';
const only = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const bundle = fs.readFileSync(process.env.BUNDLE || 'dist/oriel.js', 'utf8');
const cfg = JSON.parse(fs.readFileSync(`dev/configs/${CFG}.json`, 'utf8'));
if (process.env.LAYOUT) cfg.general = Object.assign({}, cfg.general, { layout: process.env.LAYOUT });
const browser = await chromium.launch();
let bad = 0;
for (const [W, H] of SIZES) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text().slice(0, 200)); });
  await page.clock.install({ time: new Date(2026, 9, 27, 8, 12, 0) });
  await page.addInitScript(() => { let a = 12345; Math.random = () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }); /* the same numbers every run */
  await page.setContent('<!doctype html><html><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100vw"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    window.__calls = []; window.__ws = []; window.__api = []; window.__msgs = [];
    const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: (d, s, data) => { window.__calls.push([d, s, data]); return Promise.resolve(); }, callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
  }, { cfg, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.waitForTimeout(900);
  await page.evaluate(() => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.querySelector('oriel-shell').shadowRoot.appendChild(st); }); /* still frames */
  const keys = await page.evaluate(() => Object.keys(document.querySelector('oriel-shell')._pages));
  for (const k of keys.filter((k) => !only.length || only.includes(k))) {
    await page.evaluate((k) => { const e = document.querySelector('oriel-shell'); e._setPage(k); const st = e.shadowRoot.getElementById('stage'); if (st && k === 'home') { st.pauseAnimations(); st.setCurrentTime(0); } }, k); /* the house's flow lines animate (SMIL) */
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${k}-${W}x${H}.png` });
    if (W < 700) { /* phone: the whole page, by making the window as tall as the page */
      const need = await page.evaluate(() => { const p = document.querySelector('oriel-shell').shadowRoot.getElementById('pages'); return p.scrollHeight - p.clientHeight; });
      if (need > 4) {
        await page.setViewportSize({ width: W, height: Math.min(H + need + 8, 6000) }); await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}/${k}-${W}x${H}-full.png` });
        await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(400);
      }
    }
  }
  if (W < 700) { /* the More sheet */
    await page.evaluate(() => { const e = document.querySelector('oriel-shell'); e._setPage('family'); e.shadowRoot.querySelector('#tabs [data-more]').click(); });
    await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/more-${W}x${H}.png` });
  }
  if (errors.length) { bad++; console.log(`${W}x${H}: errors`, errors.slice(0, 4)); }
  await page.close();
}
await browser.close();
console.log('saved to', OUT, bad ? '(with errors)' : '');
process.exit(bad ? 1 : 0);
