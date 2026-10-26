/* Dev harness: renders dist/oriel.js with mock states and screenshots every page that shows in the rail.
   Usage: node dev/shots.mjs [config ...]   (default: empty minimal full)
   Output: dev/out/<config>-<page>.png (or OUT=<dir> JPEG=1 for compressed copies, as used for docs/screenshots). Every service call and websocket call is logged, none is sent anywhere. */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const names = process.argv.slice(2).length ? process.argv.slice(2) : ['empty', 'minimal', 'full'];
const W = +(process.env.W || 1280), H = +(process.env.H || 800);
const OUT = process.env.OUT || 'dev/out', JPEG = !!process.env.JPEG;
fs.mkdirSync(OUT, { recursive: true });
const bundle = fs.readFileSync('dist/oriel.js', 'utf8');

const browser = await chromium.launch();
let failed = 0;
for (const name of names) {
  const cfg = JSON.parse(fs.readFileSync(`dev/configs/${name}.json`, 'utf8'));
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type().toUpperCase() + ' ' + m.text().slice(0, 300)); });
  await page.setContent('<!doctype html><html><head></head><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100vw"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api, nova }) => {
    window.__calls = []; window.__ws = []; window.__api = [];
    const e = document.querySelector('oriel-shell');
    e.setConfig(cfg);
    e.hass = {
      states: st, services: Object.assign({ light: {}, climate: {}, script: {} }, nova ? { nova: {} } : {}), language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: (d, s, data) => { window.__calls.push([d, s, data]); return Promise.resolve(); },
      callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')'),
    };
  }, { cfg, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC, nova: name === 'full-nova' }); /* only full-nova has Nova installed */
  await page.waitForTimeout(700);
  const keys = await page.evaluate(() => [...document.querySelector('oriel-shell').shadowRoot.querySelectorAll('#rail a[data-k]')].map((a) => a.dataset.k));
  for (const k of keys) {
    await page.evaluate((k) => document.querySelector('oriel-shell')._setPage(k), k);
    await page.waitForTimeout(400);
    await page.screenshot(JPEG ? { path: `${OUT}/${name}-${k}.jpg`, type: 'jpeg', quality: 82 } : { path: `${OUT}/${name}-${k}.png` });
  }
  const calls = await page.evaluate(() => window.__calls);
  const novaWs = await page.evaluate(() => window.__ws.filter((x) => /^nova\//.test(x)).length);
  console.log(`${name}: pages [${keys.join(', ')}], service calls ${calls.length}, Nova websocket calls ${novaWs}, errors ${errors.length}`);
  errors.forEach((e) => console.log('   ', e));
  if (errors.some((e) => e.startsWith('PAGEERROR'))) failed++;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
