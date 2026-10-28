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

await browser.close();
results.forEach((r) => console.log(r[0], r[1], r[2] ? '  ' + r[2] : ''));
const f = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - f} passed, ${f} failed`);
process.exit(f ? 1 : 0);
