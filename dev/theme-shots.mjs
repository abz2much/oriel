/* Theme harness: screenshots every page of the full config (with Nova on and detected) plus the pop-ups,
   with a frozen clock and animations off, so two runs can be diffed pixel by pixel.
   Usage: node dev/theme-shots.mjs [theme ...]   (default: the theme in the config, i.e. the default theme)
   Env: OUT=<dir> (default dev/out/themes), BUNDLE=<file> (default dist/oriel.js), CONFIG=<name in dev/configs> (default full; others shoot Home and System only), ACCENT=#rrggbb to test general.accent.
   Output: <OUT>/<theme>/<shot>.png. Nothing is sent anywhere; service and websocket calls are mocked. */
import fs from 'node:fs';
import { chromium } from 'playwright';

/* Freeze time on both sides so mock data and the page match from run to run. */
const T0 = new Date('2026-10-20T10:30:00').getTime();
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [T0])); } static now() { return T0; } };
const { mkStates, CALLWS_SRC } = await import('./mock.mjs'); /* after the freeze: mock.mjs reads the time on load */

const themes = process.argv.slice(2).length ? process.argv.slice(2) : [''];
const OUT = process.env.OUT || 'dev/out/themes';
const bundle = fs.readFileSync(process.env.BUNDLE || 'dist/oriel.js', 'utf8');
const CONFIG = process.env.CONFIG || 'full';
const base = JSON.parse(fs.readFileSync(`dev/configs/${CONFIG}.json`, 'utf8'));
base.general = base.general || {};
if (CONFIG === 'full') base.nova = { enabled: true, entities: { status: 'sensor.nova_status', suggestions: 'sensor.nova_suggestions', energy_note: 'sensor.nova_energy_note' } };
const extra = {
  'sensor.nova_status': { state: 'ready', attributes: {} },
  'sensor.nova_suggestions': { state: '3', attributes: {} },
  'sensor.nova_energy_note': { state: 'Battery will be full by 2pm, a good time to run the dishwasher.', attributes: {} },
};

/* [shot name, page key, optional JS run inside the shadow root to open a pop-up] */
const ALL = [
  ['home', 'home'], ['living', 'living'], ['energy', 'energy'], ['security', 'security'], ['vacuum', 'vacuum'], ['nova', 'nova'], ['system', 'system'],
  ['home-shop', 'home', 'r.getElementById("shop").classList.add("show")'],
  ['home-bell', 'home', 'r.getElementById("bell").classList.add("show")'],
  ['vacuum-confirm', 'vacuum', 'r.getElementById("vcConf").classList.add("show")'],
  ['nova-confirm', 'nova', 'r.getElementById("nvConf").classList.add("show")'],
];
const SHOTS = CONFIG === 'full' ? ALL : ALL.filter(([n]) => n === 'home' || n === 'system');

const browser = await chromium.launch();
let failed = 0;
for (const theme of themes) {
  const cfg = structuredClone(base);
  if (theme) cfg.general.theme = theme;
  if (process.env.ACCENT) cfg.general.accent = process.env.ACCENT;
  const dir = `${OUT}/${theme || 'default'}`;
  fs.mkdirSync(dir, { recursive: true });
  const errors = [];
  for (const [name, key, open] of SHOTS) {
    /* A fresh page per shot keeps pop-ups and timers from leaking between shots. */
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => errors.push(`${name}: PAGEERROR ${e.message}`));
    await page.clock.install({ time: T0 });
    await page.setContent('<!doctype html><html><head></head><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100vw"></oriel-shell></body></html>');
    await page.addScriptTag({ content: bundle, type: 'module' });
    await page.clock.runFor(100);
    await page.waitForFunction(() => customElements.get('oriel-shell'));
    await page.evaluate(({ cfg, st, ws }) => {
      window.__calls = []; window.__ws = [];
      const e = document.querySelector('oriel-shell');
      e.setConfig(cfg);
      e.hass = {
        states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: ['nova'] },
        callService: (d, s, data) => { window.__calls.push([d, s, data]); return Promise.resolve(); },
        callWS: eval('(' + ws + ')'), callApi: async () => ({}),
      };
    }, { cfg, st: Object.assign(mkStates(), extra), ws: CALLWS_SRC });
    await page.clock.runFor(500);
    await page.evaluate((k) => document.querySelector('oriel-shell')._setPage(k), key);
    await page.clock.runFor(300);
    if (open) { await page.evaluate((src) => { const r = document.querySelector('oriel-shell').shadowRoot; new Function('r', src)(r); }, open); await page.clock.runFor(300); }
    /* SMIL flow dots ignore the fake clock, so park them at time 0. */
    await page.evaluate(() => document.querySelector('oriel-shell').shadowRoot.querySelectorAll('svg').forEach((g) => { if (g.pauseAnimations) { g.pauseAnimations(); g.setCurrentTime(0); } }));
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${dir}/${name}.png`, animations: 'disabled' });
    await page.close();
  }
  console.log(`${theme || 'default'}: ${SHOTS.length} shots, errors ${errors.length}`);
  errors.forEach((e) => console.log('   ', e));
  if (errors.length) failed++;
}
await browser.close();
process.exit(failed ? 1 : 0);
