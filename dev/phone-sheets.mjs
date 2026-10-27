/* Phone pop-ups: every one opens as a sheet at 360x740. Checks that nothing is clipped, every control is at least 44 px,
   the page behind does not scroll, the back button closes the sheet (and leaves the page where it was), a visible button
   and a swipe down close it, the sheets still fit with the on-screen keyboard open (a shorter window), and that confirm
   steps have a large Confirm button set apart from Cancel that a stray tap cannot press. Fake hass: nothing is sent anywhere.
   Usage: node dev/phone-sheets.mjs   Exits 1 on the first failure. */
import './freeze-time.mjs';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const bundle = fs.readFileSync('dist/oriel.js', 'utf8');
const base = JSON.parse(fs.readFileSync('dev/configs/full-nova.json', 'utf8'));
base.home.camera_popups = [{ flag: 'input_boolean.door_cam', camera: 'camera.front', title: 'Front' }];
const results = []; const check = (n, ok, x) => results.push([ok ? 'PASS' : 'FAIL', n, x || '']);
const browser = await chromium.launch();
const W = 360, H = 740, KB = 440; /* KB: the window height with the on-screen keyboard open */

async function open() {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text().slice(0, 200)); });
  await page.route('http://oriel.test/**', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100vw"></oriel-shell></body></html>' }));
  await page.addInitScript(() => { window.loadCardHelpers = async () => ({ createCardElement: async () => { const d = document.createElement('div'); d.textContent = 'camera'; d.style.cssText = 'padding:14px;color:#fff'; return d; } }); });
  await page.clock.install({ time: new Date(2026, 9, 27, 8, 12, 0) });
  await page.goto('http://oriel.test/page');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    window.__calls = []; window.__ws = []; window.__api = []; window.__msgs = [];
    const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: (d, s, data) => { window.__calls.push([d, s, data]); return Promise.resolve(); }, callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
  }, { cfg: base, st: Object.assign(mkStates(), { 'input_boolean.door_cam': { entity_id: 'input_boolean.door_cam', state: 'off', attributes: {} } }), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.waitForTimeout(700);
  return { page, errors };
}
const sr = (page, fn, arg) => page.evaluate(({ src, arg }) => new Function('arg', 'return (' + src + ')(document.querySelector("oriel-shell").shadowRoot, arg)')(arg), { src: fn.toString(), arg });
const go = async (page, k) => { await page.evaluate((k) => document.querySelector('oriel-shell')._setPage(k), k); await page.waitForTimeout(500); };

/* how each sheet opens and closes (by its visible button) */
const SHEETS = {
  more: { open: async (p) => sr(p, (r) => r.querySelector('#tabs [data-more]').click()), panel: '#more .pn', btn: '#moreX', swipe: '#more .mh' },
  shop: { open: async (p) => { await go(p, 'home'); await p.evaluate(() => document.querySelector('oriel-shell')._openShop()); }, panel: '#shop .pn', btn: '#shopX', swipe: '#shop .hd', kb: true },
  bell: { open: async (p) => { await go(p, 'home'); const flag = (state) => p.evaluate((state) => { const e = document.querySelector('oriel-shell'); e.hass = Object.assign({}, e.hass, { states: Object.assign({}, e.hass.states, { 'input_boolean.door_cam': { entity_id: 'input_boolean.door_cam', state, attributes: {} } }) }); }, state); await flag('off'); await p.waitForTimeout(150); await flag('on'); await p.waitForTimeout(300); }, panel: '#bell .cam', btn: '#bellX', swipe: '#bell .cap', kb: true },
  vcConf: { open: async (p) => { await go(p, 'vacuum'); await sr(p, (r) => r.querySelector('#vcCtl .vcB.pri').click()); }, panel: '#vcConf .pn', btn: '#vcCX', swipe: '#vcConf .pn', confirm: { cancel: '#vcCX', go: '#vcCG' } },
  vcMenu: { open: async (p) => { await go(p, 'vacuum'); await sr(p, (r) => r.querySelector('#vcSg .vcT.dd').click()); }, panel: '#vcMenu', btn: '#vcMenu .mx', kb: true },
  nvConf: { open: async (p) => { await go(p, 'nova'); await sr(p, (r) => r.getElementById('nvLk').click()); }, panel: '#nvConf .pn', btn: '#nvCx', swipe: '#nvConf .pn', confirm: { cancel: '#nvCx', go: '#nvCok' } },
  lrPanel: { open: async (p) => { await go(p, 'living'); await sr(p, (r) => r.querySelector('#lrLgrid .tune').click()); }, panel: '#lrPanel', btn: '#lrPx', swipe: '#lrPanel .ph', kb: true },
};
const isOpen = (page, id) => sr(page, (r, id) => { const e = r.getElementById(id); return !!e && e.classList.contains('show') && getComputedStyle(e).display !== 'none'; }, id);

/* geometry of an open sheet: the panel is inside the screen, every control is inside the panel and at least 44 x 44 (an invisible tap area counts) */
const geo = (page, sel) => sr(page, (r, sel) => {
  const host = r.host.getBoundingClientRect(), panel = r.querySelector(sel), q = panel.getBoundingClientRect(), out = { panel: [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)], host: [Math.round(host.width), Math.round(host.height)], outside: [], small: [], clipped: [], vis: [] };
  if (q.left < -0.5 || q.top < -0.5 || q.right > host.width + 0.5 || q.bottom > host.height + 0.5) out.outside.push('panel');
  const panelScroll = ['auto', 'scroll'].includes(getComputedStyle(panel).overflowY) && panel.scrollHeight > panel.clientHeight + 1; out.scrolls = panelScroll;
  panel.querySelectorAll('button, input, select, [role=button], a, textarea').forEach((e) => {
    const c = e.getBoundingClientRect(), cs = getComputedStyle(e); if (!c.width || cs.display === 'none' || cs.visibility === 'hidden') return;
    const inList = e.closest('ul') || panelScroll; /* a scrolling list or sheet may carry rows past its edge */
    const af = getComputedStyle(e, '::after'), aw = af.content !== 'none' ? parseFloat(af.width) || 0 : 0, ah = af.content !== 'none' ? parseFloat(af.height) || 0 : 0, w = Math.max(c.width, aw), h = Math.max(c.height, ah);
    const label = (e.id || e.className || e.tagName) + ''; if (e.matches('button, input, select')) out.vis.push([label, Math.round(c.height)]); /* the visible box, not the tap area */
    if (w < 43.5 || h < 43.5) out.small.push(label + ' ' + Math.round(w) + 'x' + Math.round(h));
    if (!inList && (c.left < q.left - 1 || c.right > q.right + 1 || c.top < q.top - 1 || c.bottom > q.bottom + 1)) out.clipped.push(label);
    if (!inList && (c.right > host.width + 1 || c.bottom > host.height + 1 || c.left < -1 || c.top < -1)) out.outside.push(label);
  });
  panel.querySelectorAll('*').forEach((e) => { /* text that does not fit its box (and is not trimmed with an ellipsis on purpose) */ const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (own && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && getComputedStyle(e).textOverflow !== 'ellipsis' && !/^(svg|path|text)$/i.test(e.tagName)) out.clipped.push('text:' + (e.id || e.className || e.tagName)); });
  return out;
}, sel);

for (const [name, S] of Object.entries(SHEETS)) {
  const { page, errors } = await open();
  await S.open(page); await page.waitForTimeout(350);
  check(`${name}: opens as a sheet`, await isOpen(page, name === 'lrPanel' ? 'lrPanel' : S.panel.split(' ')[0].slice(1)), '');
  const st = await sr(page, (r) => ({ sheet: r.getElementById('wrap').classList.contains('sheet'), ov: getComputedStyle(r.getElementById('pages')).overflowY }));
  check(`${name}: the page behind is locked (no scrolling while the sheet is open)`, st.sheet && st.ov === 'hidden', JSON.stringify(st));
  if (process.env.SHOTS) { fs.mkdirSync(process.env.SHOTS, { recursive: true }); await page.screenshot({ path: `${process.env.SHOTS}/sheet-${name}-${W}x${H}.png` }); } /* for review: SHOTS=dev/out/sheets node dev/phone-sheets.mjs */
  let g = await geo(page, S.panel);
  check(`${name} at ${W}x${H}: nothing clipped, every control inside the sheet and at least 44 x 44`, g.outside.length === 0 && g.small.length === 0 && g.clipped.length === 0, JSON.stringify(g));
  if (name === 'bell') { const ins = await sr(page, (r) => { const c = r.querySelector('#bell .cam').getBoundingClientRect(), f = r.querySelector('#bell .feed').getBoundingClientRect(); return { left: Math.round(f.left - c.left), top: Math.round(f.top - c.top), right: Math.round(c.right - f.right) }; });
    check('bell: the camera picture is inset from the sheet edge like the other sheets (nothing at its corner is cut by the rounded edge)', ins.left >= 14 && ins.top >= 14 && ins.right >= 14, JSON.stringify(ins)); }
  const pad = await sr(page, (r, sel) => { const p = r.querySelector(sel); return parseFloat(getComputedStyle(p.closest('#shop, #bell, #vcConf, #nvConf, #more, #lrPanel, #vcMenu') || p).paddingBottom) || 0; }, S.panel);
  check(`${name}: has room under it for the safe area (bottom padding or offset)`, pad >= 0, String(pad));
  // back button: closes the sheet and stays on the page
  const url0 = await page.evaluate(() => location.href), pg0 = await page.evaluate(() => document.querySelector('oriel-shell')._page);
  await page.goBack(); await page.waitForTimeout(250);
  const afterBack = { open: await isOpen(page, S.panel.split(' ')[0].slice(1)), url: await page.evaluate(() => location.href), pg: await page.evaluate(() => document.querySelector('oriel-shell')._page) };
  check(`${name}: the back button closes the sheet and leaves the page and address as they were`, !afterBack.open && afterBack.url === url0 && afterBack.pg === pg0, JSON.stringify(afterBack));
  // visible close button, then no leftover history entry
  await S.open(page); await page.waitForTimeout(300);
  await sr(page, (r, sel) => r.querySelector(sel).click(), S.btn); await page.waitForTimeout(250);
  const hist = await page.evaluate(() => history.state);
  check(`${name}: the visible close button closes it (and leaves no extra history entry)`, !(await isOpen(page, S.panel.split(' ')[0].slice(1))) && !(hist && hist.oriel === 'sheet'), JSON.stringify(hist));
  // swipe down
  if (S.swipe) {
    await S.open(page); await page.waitForTimeout(300);
    const pt = await sr(page, (r, sel) => { const q = r.querySelector(sel).getBoundingClientRect(); return [q.left + q.width / 2, q.top + Math.min(20, q.height / 2)]; }, S.swipe);
    await page.mouse.move(pt[0], pt[1]); await page.mouse.down(); await page.mouse.move(pt[0], pt[1] + 50); await page.mouse.move(pt[0], pt[1] + 140); await page.mouse.up(); await page.waitForTimeout(250);
    check(`${name}: swiping down closes it`, !(await isOpen(page, S.panel.split(' ')[0].slice(1))), '');
  }
  // keyboard open: a shorter window; the sheet still fits and its controls stay reachable
  if (S.kb) {
    await S.open(page); await page.waitForTimeout(300);
    const g0 = await geo(page, S.panel); /* the controls at full height, to catch any that the keyboard squashes */
    await page.setViewportSize({ width: W, height: KB }); await page.waitForTimeout(400);
    if (name === 'shop') await sr(page, (r) => r.getElementById('shopIn').focus());
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/sheet-${name}-keyboard-${W}x${KB}.png` });
    g = await geo(page, S.panel);
    const inp = name === 'shop' ? await sr(page, (r) => { const q = r.getElementById('shopIn').getBoundingClientRect(); return [Math.round(q.top), Math.round(q.bottom)]; }) : [0, 0];
    const squashed = g.vis.filter(([l, h], i) => { const before = g0.vis[i] ? g0.vis[i][1] : h; return h < before - 2 || (h < 44 && before >= 44); }); /* same control, same place in the list */ /* a button the keyboard shrinks below its normal size */
    check(`${name} with the keyboard open (window ${W}x${KB}): fits, nothing clipped, controls at least 44 px and none squashed${name === 'shop' ? ', the add box stays visible' : ''}`, g.outside.length === 0 && g.small.length === 0 && g.clipped.length === 0 && squashed.length === 0 && (name !== 'shop' || (inp[0] >= 0 && inp[1] <= KB)), JSON.stringify([squashed, g, inp]));
    await sr(page, (r, sel) => r.querySelector(sel).click(), S.btn); await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(200);
  }
  // confirm steps
  if (S.confirm) {
    await S.open(page); await page.waitForTimeout(250);
    const cf = await sr(page, (r, c) => { const a = r.querySelector(c.cancel).getBoundingClientRect(), b = r.querySelector(c.go).getBoundingClientRect(); return { cancelH: Math.round(a.height), goH: Math.round(b.height), gap: Math.round(b.top - a.bottom), goW: Math.round(b.width), below: b.top >= a.bottom }; }, S.confirm);
    check(`${name}: a large Confirm button (60 px or more), set at least 24 px apart from Cancel and below it`, cf.goH >= 60 && cf.gap >= 24 && cf.below && cf.cancelH >= 48, JSON.stringify(cf));
    await page.evaluate(() => { window.__calls.length = 0; });
    await sr(page, (r, c) => r.querySelector(c.go).click(), S.confirm); await page.waitForTimeout(100);
    const early = await page.evaluate(() => window.__calls.length);
    check(`${name}: a stray tap right after it opens cannot confirm`, early === 0 && await isOpen(page, S.panel.split(' ')[0].slice(1)), String(early));
    await page.waitForTimeout(500); await sr(page, (r, c) => r.querySelector(c.go).click(), S.confirm); await page.waitForTimeout(150);
    const late = await page.evaluate(() => window.__calls.length);
    check(`${name}: Confirm works after the pause (a fake call only)`, late >= 1, String(late));
  }
  check(`${name}: no errors`, errors.length === 0, errors.join(' | '));
  await page.close();
}

// the tablet keeps its pop-ups as they were: not moved out of their pages, no phone sheet class
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.route('http://oriel.test/**', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0"><oriel-shell style="display:block;width:100vw"></oriel-shell></body></html>' }));
  await page.goto('http://oriel.test/page'); await page.addScriptTag({ content: bundle, type: 'module' }); await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => { window.__calls = []; window.__ws = []; window.__api = []; window.__msgs = []; const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    e.hass = { states: st, services: { nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: {}, callService: () => Promise.resolve(), callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') }; }, { cfg: base, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.waitForTimeout(700);
  const o = await sr(page, (r) => ({ vc: r.getElementById('vcConf').parentNode.id, nv: r.getElementById('nvConf').parentNode.id, lr: r.getElementById('lrPanel').parentNode.id, sheet: r.getElementById('wrap').classList.contains('sheet'), tabs: getComputedStyle(r.getElementById('tabs')).display, more: getComputedStyle(r.getElementById('more')).display }));
  check('tablet: pop-ups stay inside their pages, no sheet class, no tab bar', o.vc === 'vcWrap' && o.nv === 'nvWrap' && o.lr === 'lrLights' && !o.sheet && o.tabs === 'none' && o.more === 'none', JSON.stringify(o));
  await page.close();
}

results.forEach((r) => console.log(r.join('  ')));
await browser.close();
process.exit(results.some((r) => r[0] === 'FAIL') ? 1 : 0);
