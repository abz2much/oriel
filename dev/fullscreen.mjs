/* Full screen button checks. Usage: node dev/fullscreen.mjs   Exits 1 on any failure.
   Oriel runs inside a fake Home Assistant page with the same nesting as the real one:
   home-assistant > (shadow) home-assistant-main > (shadow) ha-drawer [ha-sidebar, partial-panel-resolver > ha-panel-lovelace > (shadow) hui-root > (shadow) .header + #view > oriel-shell].
   The browser's full screen calls are stubs that count calls (FS=ok), reject (FS=reject) or are missing (FS=none).
   - tablet layout: the button is in the header, labelled, not pressed; a tap hides Home Assistant's header and sidebar, asks the browser for full screen
     and stores the choice on this device; a second tap brings them back and leaves the browser's full screen
   - the choice survives a reload (header and sidebar hidden at once) and the browser is not asked for full screen without a tap
   - a browser that refuses full screen, or has none: no page error, header and sidebar still hide
   - phone layout: no button, and a stored choice does not hide Home Assistant's header and sidebar
   - the card editor's preview: no button, nothing hidden
   - the card leaving the page puts the header and sidebar back
   - outside Home Assistant (no hui-root): a tap does not throw
   - the System page has no "Show header and sidebar" button any more */
import './freeze-time.mjs';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const bundle = fs.readFileSync(process.env.BUNDLE || 'dist/oriel.js', 'utf8');
const cfg = JSON.parse(fs.readFileSync('dev/configs/full.json', 'utf8'));
const KEY = 'oriel.fullscreen';
const results = []; const check = (n, ok, x) => results.push([ok ? 'PASS' : 'FAIL', n, x === undefined ? '' : typeof x === 'string' ? x : JSON.stringify(x)]);
const browser = await chromium.launch();

/* the fake Home Assistant page; inEditor wraps the card in hui-card-preview; bare puts the card straight in the body */
const FAKE_HA = ({ inEditor, bare }) => {
  const mk = (tag, html) => { if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: 'open' }).innerHTML = html; } }); };
  mk('home-assistant', '<home-assistant-main></home-assistant-main>');
  mk('home-assistant-main', '<ha-drawer><ha-sidebar></ha-sidebar><partial-panel-resolver><ha-panel-lovelace></ha-panel-lovelace></partial-panel-resolver></ha-drawer>');
  mk('ha-drawer', '<style>:host{display:block}::slotted(partial-panel-resolver){display:block;flex:1;min-width:0}::slotted(ha-sidebar){flex:none}</style><wa-drawer class="sidebar-shell" style="display:block;width:4px;height:4px"></wa-drawer><div style="display:flex;width:100%"><slot></slot></div>'); /* the dashboard fills the width next to the sidebar, as in Home Assistant */
  mk('ha-sidebar', '<nav style="display:block;width:100px;height:300px">sidebar</nav>');
  mk('ha-panel-lovelace', '<hui-root></hui-root>');
  mk('hui-root', '<div class="header" style="height:56px">header</div><div id="view"></div>');
  document.body.innerHTML = bare ? '<oriel-shell style="display:block;width:100%"></oriel-shell>' : '<home-assistant></home-assistant>';
  if (bare) return;
  const view = document.querySelector('home-assistant').shadowRoot.querySelector('home-assistant-main').shadowRoot.querySelector('ha-panel-lovelace').shadowRoot.querySelector('hui-root').shadowRoot.getElementById('view');
  view.innerHTML = inEditor ? '<hui-card-preview><oriel-shell style="display:block;width:100%"></oriel-shell></hui-card-preview>' : '<oriel-shell style="display:block;width:100%"></oriel-shell>';
};

/* the browser's full screen: counted stubs */
const FS_STUB = (mode) => {
  window.__rf = 0; window.__xf = 0; let el = null;
  Object.defineProperty(Document.prototype, 'fullscreenElement', { configurable: true, get() { return el; } });
  if (mode === 'none') { Element.prototype.requestFullscreen = undefined; Document.prototype.exitFullscreen = undefined; return; }
  Element.prototype.requestFullscreen = function () { window.__rf++; if (mode === 'reject') return Promise.reject(new Error('not allowed')); el = this; return Promise.resolve(); };
  Document.prototype.exitFullscreen = function () { window.__xf++; el = null; return Promise.resolve(); };
};

async function open(W, H, { pre, fs = 'ok', inEditor, bare } = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://oriel.test/**', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#2a2420"></body></html>' }));
  await page.addInitScript(({ pre, KEY }) => { if (pre !== undefined && !sessionStorage.getItem('__pre_done')) { localStorage.setItem(KEY, pre); sessionStorage.setItem('__pre_done', '1'); } }, { pre, KEY });
  await page.addInitScript(FS_STUB, fs);
  await page.goto('https://oriel.test/');
  await page.evaluate(FAKE_HA, { inEditor: !!inEditor, bare: !!bare });
  await start(page);
  return { page, ctx, errors };
}
async function start(page) {
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    const find = () => { const ha = document.querySelector('home-assistant'); if (!ha) return document.querySelector('oriel-shell'); return ha.shadowRoot.querySelector('home-assistant-main').shadowRoot.querySelector('ha-panel-lovelace').shadowRoot.querySelector('hui-root').shadowRoot.querySelector('oriel-shell'); };
    const e = window.__e = find(); e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: () => Promise.resolve(), callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
  }, { cfg, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.waitForTimeout(700);
}

/* what shows: Home Assistant's header, sidebar and drawer shell, the button, and the stored choice */
const STATE = (KEY) => {
  const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
  const ha = document.querySelector('home-assistant'), main = ha && ha.shadowRoot.querySelector('home-assistant-main').shadowRoot;
  const drawer = main && main.querySelector('ha-drawer'), root = main && main.querySelector('ha-panel-lovelace').shadowRoot.querySelector('hui-root').shadowRoot;
  const b = window.__e && window.__e.shadowRoot && window.__e.shadowRoot.getElementById('bFs');
  let stored = null; try { stored = localStorage.getItem(KEY); } catch (e) { stored = 'ERR'; }
  return { header: root ? vis(root.querySelector('.header')) : null, sidebar: drawer ? vis(drawer.querySelector('ha-sidebar')) : null, shell: drawer ? vis(drawer.shadowRoot.querySelector('wa-drawer')) : null,
    button: vis(b), label: b ? b.getAttribute('aria-label') : null, pressed: b ? b.getAttribute('aria-pressed') : null, stored, rf: window.__rf, xf: window.__xf, fsEl: !!document.fullscreenElement };
};
const tap = (page) => page.evaluate(() => { const b = window.__e.shadowRoot.getElementById('bFs'); if (b) b.click(); }); /* no button: nothing happens, and the checks say so */
const state = (page) => page.evaluate(STATE, KEY);

/* 1. tablet: off, then on, then off */
{
  const { page, ctx, errors } = await open(1280, 800);
  let s = await state(page);
  check('tablet: the button shows, labelled "Full screen", not pressed; Home Assistant header and sidebar show', s.button && s.label === 'Full screen' && s.pressed === 'false' && s.header && s.sidebar && s.shell, s);
  check('tablet: the button sits in the header row with the other round buttons', await page.evaluate(() => { const r = window.__e.shadowRoot, b = r.getElementById('bFs'); return !!b && b.parentElement.id === 'hdr-r' && b.classList.contains('round'); }));
  await tap(page); await page.waitForTimeout(100); s = await state(page);
  check('tap on: header, sidebar and drawer shell hidden; browser asked once; stored on this device; button pressed, labelled "Exit full screen"', !s.header && !s.sidebar && !s.shell && s.rf === 1 && s.fsEl && s.stored === '1' && s.pressed === 'true' && s.label === 'Exit full screen', s);
  await tap(page); await page.waitForTimeout(100); s = await state(page);
  check('tap off: header, sidebar and drawer shell back; browser left full screen; stored off; button not pressed', s.header && s.sidebar && s.shell && s.xf === 1 && !s.fsEl && s.stored === '0' && s.pressed === 'false' && s.label === 'Full screen', s);
  check('tablet: no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
/* 2. a stored choice: hidden at once after a reload, with no full screen request (that needs a tap) */
{
  const { page, ctx, errors } = await open(1280, 800, { pre: '1' });
  const s = await state(page);
  check('reload with the choice stored: header and sidebar hidden at once, button pressed, browser not asked', !s.header && !s.sidebar && s.pressed === 'true' && s.rf === 0, s);
  check('reload: no page errors', errors.length === 0, errors.join(' | '));
  await page.evaluate(() => window.__e.remove()); await page.waitForTimeout(100);
  const g = await state(page);
  check('the card leaving the page puts the header and sidebar back', g.header && g.sidebar && g.shell, g);
  await ctx.close();
}
/* 3. a browser that refuses full screen, and one without it */
for (const mode of ['reject', 'none']) {
  const { page, ctx, errors } = await open(1280, 800, { fs: mode });
  await tap(page); await page.waitForTimeout(150); const s = await state(page);
  check(`browser full screen ${mode === 'reject' ? 'refused' : 'missing'}: header and sidebar still hide, choice stored, no page error`, !s.header && !s.sidebar && s.stored === '1' && errors.length === 0, [s, errors]);
  await tap(page); await page.waitForTimeout(100); const t = await state(page);
  check(`browser full screen ${mode === 'reject' ? 'refused' : 'missing'}: a second tap brings them back`, t.header && t.sidebar && t.stored === '0' && errors.length === 0, [t, errors]);
  await ctx.close();
}
/* 4. phone layout: no button; a stored choice does not hide anything */
{
  const { page, ctx, errors } = await open(390, 844, { pre: '1' });
  const s = await state(page);
  check('phone: no button, and the stored choice does not hide the header or sidebar', !s.button && s.header && s.sidebar, s);
  await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(400);
  const t = await state(page);
  check('turned to the tablet layout: the button shows and the stored choice hides them', t.button && !t.header && !t.sidebar, t);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  const u = await state(page);
  check('back to the phone layout: header and sidebar come back, no button', !u.button && u.header && u.sidebar, u);
  check('phone: no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
/* 5. the card editor's preview */
{
  const { page, ctx, errors } = await open(1280, 800, { pre: '1', inEditor: true });
  const s = await state(page);
  check('card editor preview: no button, nothing hidden', !s.button && s.header && s.sidebar, s);
  check('card editor preview: no page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
/* 6. outside Home Assistant */
{
  const { page, ctx, errors } = await open(1280, 800, { bare: true });
  await tap(page).catch((e) => errors.push(e.message)); await page.waitForTimeout(100);
  check('outside Home Assistant: a tap does not throw', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
/* 7. System no longer has the kiosk button */
{
  const { page, ctx } = await open(1280, 800);
  await page.evaluate(() => window.__e._setPage('system')); await page.waitForTimeout(400);
  const has = await page.evaluate(() => { const r = window.__e.shadowRoot; return { btn: !!r.getElementById('syBtnK'), text: /Show header and sidebar|Leaves kiosk mode/.test(r.getElementById('pgSystem') ? r.getElementById('pgSystem').textContent : '') }; });
  check('System: no "Show header and sidebar" button', !has.btn && !has.text, has);
  await ctx.close();
}

await browser.close();
results.forEach((r) => console.log(r[0], r[1], r[2] ? '  ' + r[2] : ''));
const f = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - f} passed, ${f} failed`);
process.exit(f ? 1 : 0);
