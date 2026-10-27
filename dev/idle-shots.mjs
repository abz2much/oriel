/* Screenshots of the idle clock (fake clock, mock data). Usage: OUT=dev/out/idle node dev/idle-shots.mjs [theme ...]
   Sizes: 1280x800 and 1024x768. Default themes: classic and midnight-signal. */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const OUT = process.env.OUT || 'dev/out/idle';
const themes = process.argv.slice(2).length ? process.argv.slice(2) : ['classic', 'midnight-signal'];
fs.mkdirSync(OUT, { recursive: true });
const bundle = fs.readFileSync('dist/oriel.js', 'utf8');
const full = JSON.parse(fs.readFileSync('dev/configs/full.json', 'utf8'));
const browser = await chromium.launch();
for (const theme of themes) {
  for (const [W, H] of [[1280, 800], [1024, 768]]) {
    const cfg = JSON.parse(JSON.stringify(full)); cfg.general.theme = theme; cfg.general.idle_clock = { presence: 'binary_sensor.idle_presence', minutes: 5 };
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.clock.install({ time: new Date(2026, 9, 27, 8, 12, 0) });
    await page.setContent('<!doctype html><html><body style="margin:0"><oriel-shell style="display:block;width:100vw"></oriel-shell></body></html>');
    await page.addScriptTag({ content: bundle, type: 'module' });
    await page.waitForFunction(() => customElements.get('oriel-shell'));
    await page.evaluate(({ cfg, st, ws, api }) => {
      window.__api = []; window.__ws = []; window.__msgs = []; const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
      e.hass = { states: st, services: { nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP' }, callService: () => Promise.resolve(), callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
    }, { cfg, st: Object.assign(mkStates(), { 'binary_sensor.idle_presence': { entity_id: 'binary_sensor.idle_presence', state: 'off', attributes: {}, last_changed: new Date(2026, 9, 27, 8, 12, 0).toISOString() } }), ws: CALLWS_SRC, api: CALLAPI_SRC });
    await page.clock.runFor(5 * 60000 + 3000); await page.waitForTimeout(500); await page.clock.runFor(2000);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${theme}-${W}x${H}.png` });
    await page.close();
  }
}
await browser.close();
console.log('saved to', OUT);
