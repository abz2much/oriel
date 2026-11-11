/* Screenshots of the scene style (general.page_style: scene) on every scene page, for looking at.
   Usage: node dev/scene-shots.mjs [theme]   (default dusk)  Output: dev/out/scene/<theme>-<page>.png, plus two pop-ups */
import fs from 'node:fs';
import { chromium } from 'playwright';
const T0 = new Date('2026-10-20T18:04:00').getTime();
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [T0])); } static now() { return T0; } };
const { mkStates, CALLWS_SRC, CALLAPI_SRC } = await import('./mock.mjs');
const theme = process.argv[2] || 'dusk';
const cfg = JSON.parse(fs.readFileSync('dev/configs/full.json', 'utf8'));
cfg.general = Object.assign({}, cfg.general, { page_style: 'scene', theme });
fs.mkdirSync('dev/out/scene', { recursive: true });
const browser = await chromium.launch();
for (const [k, pop] of [['home'], ['living'], ['energy'], ['climate'], ['family'], ['security'], ['vacuum'], ['system'], ['security', 'scDoors'], ['family', 'fmShop']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (/failed|scene/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await page.clock.install({ time: T0 });
  await page.setContent('<!doctype html><html><body style="margin:0"><oriel-shell style="display:block;width:100vw;height:100vh"></oriel-shell></body></html>');
  await page.addScriptTag({ content: fs.readFileSync('dist/oriel.js', 'utf8'), type: 'module' });
  await page.clock.runFor(100);
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => { window.__calls = []; window.__ws = []; window.__api = []; const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {}, todo: {}, calendar: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [], version: '2026.11.1' }, callService: () => Promise.resolve(), callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') }; },
  { cfg, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.clock.runFor(600);
  await page.evaluate((k) => document.querySelector('oriel-shell')._setPage(k), k);
  for (let i = 0; i < 6; i++) { await page.clock.runFor(1000); await page.waitForTimeout(50); }
  await page.evaluate(() => document.querySelector('oriel-shell').shadowRoot.querySelectorAll('svg').forEach((g) => { if (g.pauseAnimations) { g.pauseAnimations(); g.setCurrentTime(0); } }));
  if (pop) { await page.evaluate(({ k, pop }) => document.querySelector('oriel-shell')._pages[k].el.querySelector(`.scC[data-open="${pop}"]`).click(), { k, pop }); for (let i = 0; i < 2; i++) { await page.clock.runFor(500); await page.waitForTimeout(50); } }
  await page.screenshot({ path: `dev/out/scene/${theme}-${k}${pop ? '-' + pop : ''}.png`, animations: 'disabled' });
  console.log(k, errs.length ? 'errors: ' + errs.join(' | ') : 'ok');
  await page.close();
}
await browser.close();
