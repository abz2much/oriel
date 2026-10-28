/* Auto rotation checks (general.auto_rotate), with the mock hass and a fake clock. Usage: node dev/auto-rotate.mjs   Exits 1 on any failure.
   Off by default. When on, the card moves to the next page in rail order every idle_seconds, wraps after the last page, and waits
   after_touch_seconds after a person changed the page or touched the card. It never moves while the idle clock, a pop-up, a focused
   text field or a hidden tab is in the way. One timer, cleared on disconnect, and a config change applies without a reload. */
import './freeze-time.mjs';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const bundle = fs.readFileSync('dist/oriel.js', 'utf8');
const base = JSON.parse(fs.readFileSync('dev/configs/full-nova.json', 'utf8'));
base.general.idle_clock = { presence: 'binary_sensor.room_presence', minutes: 5 };
const withRotate = (o) => { const c = JSON.parse(JSON.stringify(base)); c.general.auto_rotate = Object.assign({ enabled: true, idle_seconds: 60, after_touch_seconds: 300 }, o || {}); return c; };
const results = []; const check = (n, ok, x) => results.push([ok ? 'PASS' : 'FAIL', n, x || '']);
const browser = await chromium.launch();
const T0 = new Date(2026, 9, 27, 8, 12, 0);

async function open(W, H, cfg) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: T0 });
  await page.setContent('<!doctype html><html><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100%"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    window.__sets = []; const e = window.__e = document.querySelector('oriel-shell'), orig = e._setPage;
    e._setPage = function (k, o) { window.__sets.push([k, !!(o && o.auto)]); return orig.call(this, k, o); }; /* a spy: who asked for which page */
    e.setConfig(cfg);
    window.__hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: () => Promise.resolve(), callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
    e.hass = window.__hass;
  }, { cfg, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.clock.runFor(1000);
  return { page, ctx, errors };
}
const run = (page, js) => page.evaluate((src) => new Function('r', 'e', src)(window.__e.shadowRoot, window.__e), js);
const cur = (page) => run(page, 'return e._page;');
const secs = (page, s) => page.clock.runFor(s * 1000);
/* the rail order, read from what the rail shows (the same order the phone's tabs and More follow) */
const order = (page) => run(page, `return [...r.querySelectorAll('#rail a[data-k]')].map((a) => a.dataset.k);`);
const go = (page, k) => run(page, `e._setPage('${k}');`);
const resetSpy = (page) => run(page, 'window.__sets.length = 0;');
const autoSets = (page) => run(page, 'return window.__sets.filter((s) => s[1]).length;');

/* ---------- off by default ---------- */
{
  const { page, errors } = await open(1280, 800, base); /* no auto_rotate in the config at all */
  await secs(page, 1200);
  check('off by default: with no setting the page never changes (20 minutes)', (await cur(page)) === 'home' && (await autoSets(page)) === 0);
  await page.context().close();
  const b = await open(1280, 800, withRotate({ enabled: false }));
  await secs(b.page, 1200);
  check('off: enabled false never changes the page', (await cur(b.page)) === 'home' && (await autoSets(b.page)) === 0);
  const dflt = await open(1280, 800, base); const dv = await run(dflt.page, 'return e._c.general.auto_rotate;'); await dflt.ctx.close();
  check('defaults: the merged config has enabled false, 60 and 300', dv && dv.enabled === false && dv.idle_seconds === 60 && dv.after_touch_seconds === 300, JSON.stringify(dv));
  check('off: no page errors', errors.length + b.errors.length === 0);
  await b.ctx.close();
}

/* ---------- tablet ---------- */
{
  const { page, errors } = await open(1280, 800, withRotate());
  const ord = await order(page);
  await secs(page, 58);
  check('rotates at idle_seconds: nothing before 60 s', (await cur(page)) === 'home');
  await secs(page, 3);
  check('rotates at idle_seconds: the next page in rail order after 60 s', (await cur(page)) === ord[1], `${await cur(page)} (expected ${ord[1]})`);
  const spy = await run(page, 'return window.__sets.slice(-1)[0];');
  check('rotation uses _setPage with the auto flag (the same code path as a tap)', spy && spy[0] === ord[1] && spy[1] === true, JSON.stringify(spy));
  await secs(page, 60);
  check('the next move is another idle_seconds later (an automatic move is not a touch)', (await cur(page)) === ord[2], `${await cur(page)} (expected ${ord[2]})`);

  /* wraps */
  await resetSpy(page);
  await go(page, ord[ord.length - 1]); await secs(page, 301);
  check('wraps: after the last page it goes to the first', (await cur(page)) === ord[0], `${await cur(page)} (expected ${ord[0]})`);

  /* a tap waits after_touch_seconds */
  const tapAt = async (k) => { const [x, y] = await run(page, `const q = r.querySelector('#rail a[data-k="${k}"]').getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2];`); await page.touchscreen.tap(x, y); };
  await tapAt('energy');
  check('a tap on the rail changes the page', (await cur(page)) === 'energy');
  await secs(page, 290);
  check('after a tap it waits after_touch_seconds: no move at 290 s', (await cur(page)) === 'energy');
  await secs(page, 15);
  const afterWait = await cur(page);
  check('after a tap it moves once the 300 s wait has passed', afterWait === ord[(ord.indexOf('energy') + 1) % ord.length], `${afterWait}`);
  await secs(page, 61);
  check('after that it carries on at idle_seconds', (await cur(page)) === ord[(ord.indexOf('energy') + 2) % ord.length], `${await cur(page)}`);

  /* a touch anywhere on the card restarts the wait */
  await go(page, 'home'); await secs(page, 200);
  const hit = await run(page, `const el = r.elementFromPoint(640, 12); return el ? (el.id || el.className || el.tagName) : 'nothing';`); /* the empty strip above the cards */
  await page.touchscreen.tap(640, 12);
  check('the touch test taps empty canvas (it does not press a control)', /screen|wrap|pages|page|hdr|nothing|^$/i.test(String(hit)) && !(await run(page, "return r.getElementById('shop').classList.contains('show');")), String(hit));
  await secs(page, 200);
  check('a touch on the card restarts the wait (200 s + touch + 200 s: no move)', (await cur(page)) === 'home');
  await secs(page, 125);
  check('...and it moves 300 s after the touch', (await cur(page)) !== 'home');

  /* paused by: the idle clock, a pop-up, a focused field, a hidden tab. After the block it waits one interval, and never moves during it. */
  const paused = async (name, on, off) => {
    await go(page, 'home'); await secs(page, 1); await run(page, on); await secs(page, 400);
    const stayed = (await cur(page)) === 'home';
    await run(page, off); await secs(page, 130);
    const moved = (await cur(page)) !== 'home';
    check(`paused while ${name}: no move, then it carries on after`, stayed && moved, `stayed ${stayed}, moved ${moved}`);
  };
  await paused('the idle clock shows', 'e._idleShow();', 'e._idleHide();');
  await paused('the shopping list is open', 'e._openShop();', 'e._closeShop();');
  await paused('the camera pop-up is open', "r.getElementById('bell').classList.add('show');", "r.getElementById('bell').classList.remove('show');");
  await paused('a text field has focus', "const i = document.createElement('input'); i.id = 'tmpIn'; r.appendChild(i); i.focus();", "const i = r.getElementById('tmpIn'); i.blur(); i.remove();");
  await paused('the tab is hidden', "Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));", "delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));");

  check('tablet: no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();
}

/* ---------- hass updates never reset it ---------- */
{
  const { page } = await open(1280, 800, withRotate());
  for (let i = 0; i < 6; i++) { await secs(page, 10); await run(page, 'e.hass = Object.assign({}, window.__hass, { states: Object.assign({}, window.__hass.states) });'); }
  await secs(page, 2);
  check('hass updates do not reset the timer (still one move at 60 s, with an update every 10 s)', (await autoSets(page)) === 1, String(await autoSets(page)));
  await page.context().close();
}

/* ---------- config change without a reload ---------- */
{
  const { page } = await open(1280, 800, base);
  await secs(page, 300); check('config change: off to start with', (await cur(page)) === 'home');
  await run(page, `e.setConfig(${JSON.stringify(withRotate({ idle_seconds: 30 }))}); e.hass = window.__hass;`); await secs(page, 1);
  await secs(page, 33);
  check('config change: turning it on takes effect with no reload (30 s)', (await cur(page)) !== 'home', await cur(page));
  await run(page, `e.setConfig(${JSON.stringify(withRotate({ enabled: false }))}); e.hass = window.__hass; window.__sets.length = 0;`); await secs(page, 600);
  check('config change: turning it off stops it', (await autoSets(page)) === 0);
  await run(page, `e.setConfig(${JSON.stringify(withRotate({ idle_seconds: 20 }))}); e.hass = window.__hass; window.__sets.length = 0;`); await secs(page, 45);
  check('config change: a new idle_seconds applies (20 s: two moves in 45 s)', (await autoSets(page)) === 2, String(await autoSets(page)));
  await page.context().close();
}

/* ---------- disconnect clears the timer ---------- */
{
  const { page } = await open(1280, 800, withRotate({ idle_seconds: 20 }));
  await run(page, 'window.__sets.length = 0; e.remove();');
  await secs(page, 300);
  check('disconnect: no move after the card is removed', (await autoSets(page)) === 0);
  await run(page, "document.body.appendChild(e); e.hass = window.__hass;"); await secs(page, 1); await secs(page, 25);
  check('disconnect: put back, it starts again', (await autoSets(page)) >= 1, String(await autoSets(page)));
  await page.context().close();
}

/* ---------- one page, or pages that do not render ---------- */
{
  /* the page set is cut down in the page: Home, Energy and System only (Living and the rest "do not render") */
  const { page, errors } = await open(1280, 800, withRotate({ idle_seconds: 30 }));
  await run(page, `const orig = e._pageDefs; e._pageDefs = function () { return orig.call(this).filter((d) => ['home', 'energy', 'system'].includes(d.key)); }; e._pageSig = null; e._syncPages(); window.__sets.length = 0;`);
  const seen = []; for (let i = 0; i < 4; i++) { await secs(page, 31); seen.push(await cur(page)); }
  check('pages that do not render are skipped (Home, Energy, System only)', JSON.stringify(seen) === JSON.stringify(['energy', 'system', 'home', 'energy']), JSON.stringify(seen));
  /* only Home is left */
  await run(page, `const orig2 = e._pageDefs; e._pageDefs = function () { return orig2.call(this).filter((d) => d.key === 'home'); }; e._pageSig = null; e._syncPages(); window.__sets.length = 0;`);
  await secs(page, 300);
  check('one page: nothing happens and nothing breaks', (await autoSets(page)) === 0 && (await cur(page)) === 'home' && errors.length === 0, `auto moves ${await autoSets(page)}, errors ${errors.join(' | ')}`);
  await page.context().close();
}

/* ---------- phone: it steps through the pages under More too ---------- */
{
  const { page, errors } = await open(390, 844, withRotate({ idle_seconds: 30 }));
  const ord = await run(page, `return [...r.querySelectorAll('#tabs a[data-t]')].map((a) => a.dataset.t).concat(e._tabRest || []);`);
  const seen = [await cur(page)];
  for (let i = 0; i < ord.length; i++) { await secs(page, 31); seen.push(await cur(page)); }
  check('phone: it steps through every page, those under More included, then wraps', JSON.stringify(seen) === JSON.stringify(ord.concat([ord[0]])) || JSON.stringify(seen.slice(0, ord.length + 1)) === JSON.stringify(ord.concat([ord[0]])), JSON.stringify([seen, ord]));
  await go(page, 'home'); await run(page, 'e._phoneMore(true);'); await secs(page, 400);
  check('phone: paused while the More menu is open', (await cur(page)) === 'home');
  check('phone: no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();
}

/* ---------- the on-screen switch (System page): per device, stored in localStorage ---------- */
const KEY = 'oriel.auto_rotate';
/* a real origin (the blank test page cannot use localStorage); pre sets values before the card starts; breakStore makes every storage call throw */
async function openStore(W, H, cfg, { pre, breakStore } = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://oriel.test/**', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100%"></oriel-shell></body></html>' }));
  await page.clock.install({ time: T0 });
  await page.addInitScript(({ pre, breakStore }) => {
    if (breakStore) { Storage.prototype.getItem = () => { throw new Error('storage denied'); }; Storage.prototype.setItem = () => { throw new Error('storage denied'); }; }
    else if (pre) Object.keys(pre).forEach((k) => { if (!sessionStorage.getItem('__pre_done')) localStorage.setItem(k, pre[k]); }), sessionStorage.setItem('__pre_done', '1');
  }, { pre, breakStore });
  await page.goto('https://oriel.test/');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    window.__sets = []; const e = window.__e = document.querySelector('oriel-shell'), orig = e._setPage;
    e._setPage = function (k, o) { window.__sets.push([k, !!(o && o.auto)]); return orig.call(this, k, o); };
    e.setConfig(cfg);
    window.__hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: () => Promise.resolve(), callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
    e.hass = window.__hass;
  }, { cfg, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.clock.runFor(1000);
  return { page, ctx, errors };
}
const sw = (page) => run(page, `const b = r.getElementById('syBtnA'); if (!b) return null; const q = b.getBoundingClientRect(), t = b.querySelector('.tg'); return { role: b.getAttribute('role'), on: b.getAttribute('aria-checked'), cls: b.classList.contains('on'), sub: (b.querySelector('small') || {}).textContent, h: q.height, w: q.width, tg: !!t, tgOn: t ? getComputedStyle(t).backgroundColor : '' };`);
const stored = (page) => page.evaluate((k) => { try { return localStorage.getItem(k); } catch (e) { return 'ERR'; } }, KEY);
const flip = async (page) => { const pt = await run(page, `const q = (r.getElementById('syBtnA') || r.host).getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2];`); await page.mouse.click(pt[0], pt[1]); await page.clock.runFor(200); };
const toSystem = async (page) => { await go(page, 'system'); await page.clock.runFor(600); };
const cfgWith = (o) => { const c = JSON.parse(JSON.stringify(base)); if (o) c.general.auto_rotate = Object.assign({ enabled: false, idle_seconds: 60, after_touch_seconds: 300 }, o); return c; };

{ /* default: off; the sub text reads the config */
  const a = await openStore(1280, 800, cfgWith()); await toSystem(a.page); const s = await sw(a.page);
  check('switch: the System page has an Auto rotate row with a switch, off by default', !!s && s.role === 'switch' && s.on === 'false' && !s.cls && s.tg, JSON.stringify(s));
  check('switch: the sub text reads the config (60 s, 5 min after a touch)', !!s && s.sub === 'Every 60 s, 5 min after a touch', s && s.sub);
  check('switch: the row has a tap area of at least 44 px', !!s && s.h >= 44, s && String(s.h));
  await secs(a.page, 400); check('switch: off by default means the page never changes by itself', (await autoSets(a.page)) === 0);
  check('switch: no page errors', a.errors.length === 0, a.errors.join(' | ')); await a.ctx.close();
  const b = await openStore(1280, 800, cfgWith({ idle_seconds: 30, after_touch_seconds: 90 })); await toSystem(b.page);
  check('switch: other timings read from the config (30 s, 1.5 min)', (await sw(b.page) || {}).sub === 'Every 30 s, 1.5 min after a touch', (await sw(b.page) || {}).sub); await b.ctx.close();
}
{ /* flip on and off, no reload; the first move waits after_touch_seconds; the choice is stored */
  const a = await openStore(1280, 800, cfgWith({ idle_seconds: 60, after_touch_seconds: 300 })); await toSystem(a.page); await resetSpy(a.page);
  await flip(a.page); let s = await sw(a.page);
  check('switch: tapping it turns it on (aria-checked, on style) with no reload', !!s && s.on === 'true' && s.cls, JSON.stringify(s));
  check('switch: the choice is stored under one key', (await stored(a.page)) === '1', await stored(a.page));
  await secs(a.page, 280); check('switch: flipping counts as a touch: nothing moves for 280 s (after_touch_seconds is 300)', (await autoSets(a.page)) === 0);
  await secs(a.page, 40); check('switch: then the first automatic move happens', (await autoSets(a.page)) === 1, String(await autoSets(a.page)));
  await flip(a.page); s = await sw(a.page); /* back to the System page first? the card moved on, so go there */
  await toSystem(a.page); await flip(a.page); s = await sw(a.page); await resetSpy(a.page);
  check('switch: tapping again turns it off', !!s && s.on === 'false' && !s.cls && (await stored(a.page)) === '0', JSON.stringify([s, await stored(a.page)]));
  await secs(a.page, 900); check('switch: off clears the timer (no move in 15 minutes)', (await autoSets(a.page)) === 0, String(await autoSets(a.page)));
  check('switch: no page errors', a.errors.length === 0, a.errors.join(' | ')); await a.ctx.close();
}
{ /* the choice survives a re-render and a reload */
  const a = await openStore(1280, 800, cfgWith()); await toSystem(a.page); await flip(a.page);
  await run(a.page, `e.setConfig(JSON.parse(JSON.stringify(e._raw))); e.hass = window.__hass;`); await a.page.clock.runFor(600); await toSystem(a.page);
  const s = await sw(a.page); check('switch: the choice survives a re-render (setConfig)', !!s && s.on === 'true' && s.cls, JSON.stringify(s));
  await run(a.page, 'window.__sets.length = 0;'); await secs(a.page, 310); await secs(a.page, 5);
  check('switch: and rotation is running after the re-render', (await autoSets(a.page)) >= 1, String(await autoSets(a.page)));
  await a.ctx.close();
}
{ /* the stored value on this device beats the config, both ways */
  const off = await openStore(1280, 800, cfgWith({ enabled: true, idle_seconds: 20 }), { pre: { [KEY]: '0' } }); await toSystem(off.page); const so = await sw(off.page); await run(off.page, 'window.__sets.length = 0;'); await secs(off.page, 300);
  check('switch: stored off beats config on (switch off, no rotation)', !!so && so.on === 'false' && (await autoSets(off.page)) === 0, JSON.stringify([so, await autoSets(off.page)])); await off.ctx.close();
  const on = await openStore(1280, 800, cfgWith({ enabled: false, idle_seconds: 20 }), { pre: { [KEY]: '1' } }); await run(on.page, 'window.__sets.length = 0;'); await secs(on.page, 45);
  check('switch: stored on beats config off (it rotates; the switch is on)', (await autoSets(on.page)) >= 1 && ((await (async () => { await toSystem(on.page); return sw(on.page); })()) || {}).on === 'true', String(await autoSets(on.page))); await on.ctx.close();
  const cfgOn = await openStore(1280, 800, cfgWith({ enabled: true, idle_seconds: 20 })); await toSystem(cfgOn.page); const sc = await sw(cfgOn.page);
  check('switch: with nothing stored, the config decides (enabled true: switch on)', !!sc && sc.on === 'true', JSON.stringify(sc)); await cfgOn.ctx.close();
}
{ /* storage fails: the page still works and uses the config */
  const a = await openStore(1280, 800, cfgWith({ enabled: true, idle_seconds: 20 }), { breakStore: true }); await run(a.page, 'window.__sets.length = 0;'); await secs(a.page, 45);
  check('switch: storage broken: the config value is used (rotation runs)', (await autoSets(a.page)) >= 1, String(await autoSets(a.page)));
  await toSystem(a.page); const s0 = await sw(a.page); check('switch: storage broken: the row shows the config value (on)', !!s0 && s0.on === 'true', JSON.stringify(s0));
  await flip(a.page); const s1 = await sw(a.page); await run(a.page, 'window.__sets.length = 0;'); await secs(a.page, 600);
  check('switch: storage broken: flipping still works for this session (off, no rotation)', !!s1 && s1.on === 'false' && (await autoSets(a.page)) === 0, JSON.stringify([s1, await autoSets(a.page)]));
  check('switch: storage broken: no page errors', a.errors.length === 0, a.errors.join(' | ')); await a.ctx.close();
}
{ /* the phone shows the row too, and it works */
  const a = await openStore(390, 844, cfgWith({ idle_seconds: 30, after_touch_seconds: 120 })); await toSystem(a.page);
  await run(a.page, `const b = r.getElementById('syBtnA'); if (b) b.scrollIntoView({ block: 'center' });`); await a.page.clock.runFor(300);
  const s = await sw(a.page); check('switch: the phone shows the row (44 px, sub text 2 min)', !!s && s.h >= 44 && s.sub === 'Every 30 s, 2 min after a touch', JSON.stringify(s));
  await flip(a.page); const s2 = await sw(a.page); check('switch: the phone switch turns it on', !!s2 && s2.on === 'true', JSON.stringify(s2)); await a.ctx.close();
}

await browser.close();
results.forEach((r) => console.log(r[0], r[1], r[2] ? '  ' + r[2] : ''));
const f = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - f} passed, ${f} failed`);
process.exit(f ? 1 : 0);
