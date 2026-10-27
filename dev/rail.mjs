/* Rail and tab bar checks, with the mock hass. Usage: node dev/rail.mjs   Exits 1 on any failure.
   The rail (tablet, 1280x800) and the tab bar (phone, 390x844) must be the topmost element at the centre of every item, on
   every page and in the states that move things about (page scrolled, light panel open, an app or streamer chosen, after a
   page switch), and a real tap on an item must switch the page. The full-screen pop-ups must still cover the rail. */
import './freeze-time.mjs';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const bundle = fs.readFileSync('dist/oriel.js', 'utf8');
const cfg = JSON.parse(fs.readFileSync('dev/configs/full-nova.json', 'utf8'));
cfg.general.idle_clock = { presence: 'binary_sensor.room_presence' };
const L = cfg.living.lights; for (let i = 0; i < 6; i++) L.push(...JSON.parse(JSON.stringify(L.slice(0, 2)))); /* Living tall enough to scroll */
const results = []; const check = (n, ok, x) => results.push([ok ? 'PASS' : 'FAIL', n, x || '']);
const browser = await chromium.launch();

async function open(W, H) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: true });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: new Date(2026, 9, 27, 8, 12, 0) });
  await page.setContent('<!doctype html><html><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100%"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    window.__calls = [];
    const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: (d, s, data) => { window.__calls.push([d, s, data]); return Promise.resolve(); }, callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
  }, { cfg, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.waitForTimeout(700);
  return { page, errors };
}
/* runs a snippet with r = the shadow root and e = the card */
const run = (page, js) => page.evaluate((src) => new Function('r', 'e', src)(document.querySelector('oriel-shell').shadowRoot, document.querySelector('oriel-shell')), js);
/* the items whose centre is not the item itself, with what is there instead */
const covered = (page, sel) => page.evaluate((sel) => {
  const r = document.querySelector('oriel-shell').shadowRoot, nm = (n) => n ? n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') : 'nothing';
  return [...r.querySelectorAll(sel)].filter((a) => a.getClientRects().length).map((a) => {
    const q = a.getBoundingClientRect(), h = r.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2);
    return h && a.contains(h) ? null : (a.dataset.k || a.dataset.t || 'more') + ' under ' + nm(h);
  }).filter(Boolean);
}, sel);
const centres = (page, sel) => page.evaluate((sel) => [...document.querySelector('oriel-shell').shadowRoot.querySelectorAll(sel)].filter((a) => a.getClientRects().length && (a.dataset.k || a.dataset.t)).map((a) => { const q = a.getBoundingClientRect(); return [a.dataset.k || a.dataset.t, q.x + q.width / 2, q.y + q.height / 2]; }), sel);

const STATES = [
  ['as opened', ''],
  ['scrolled to the end', "r.querySelectorAll('.page:not(.off) *, #pages').forEach((n) => { if (n.scrollHeight > n.clientHeight + 1 && getComputedStyle(n).overflowY !== 'visible') n.scrollTop = n.scrollHeight; });"],
  ['light panel open', "const t = r.querySelector('#pgLiving .tune'); if (t) t.click();", 'living'],
  ['an app chosen', "const b = r.querySelector('#lrAg .at:not(.stop)'); if (b) b.click();", 'living'],
  ['a streamer chosen', "const d = [...r.querySelectorAll('#pgLiving .lt.dv')].pop(); if (d) d.click();", 'living'],
];

async function sweep(W, H, sel, label, states) {
  const { page, errors } = await open(W, H);
  const keys = await run(page, 'return Object.keys(e._pages);');
  for (const k of keys) for (const [sn, js, only] of states) {
    if (only && only !== k) continue;
    /* every state is reached by a page switch, from Home (or from Living for Home) */
    const go = `if (e._lvPanel) e._lvPanel(false); e._setPage(${JSON.stringify(k === 'home' ? 'living' : 'home')}); e._setPage(${JSON.stringify(k)});` + js;
    await run(page, go); await page.waitForTimeout(120);
    const c = await covered(page, sel);
    const missed = [];
    for (const [to, x, y] of await centres(page, sel)) {
      if (to === k) continue;
      await run(page, go); await page.waitForTimeout(40);
      await page.touchscreen.tap(x, y); await page.waitForTimeout(40);
      const now = await run(page, 'return e._page;'); if (now !== to) missed.push(to);
    }
    check(`${label}: ${k}, ${sn}: every item is on top and a tap switches the page`, !c.length && !missed.length, [c.join(', '), missed.length ? 'taps that did nothing: ' + missed.join(', ') : ''].filter(Boolean).join(' | '));
  }
  check(`${label}: no errors`, errors.length === 0, errors.join(' | '));
  return page;
}

const tab = await sweep(1280, 800, '#rail a', 'rail 1280x800', STATES);
// the full-screen pop-ups still cover the rail
for (const [name, js] of [
  ['shopping list', 'e._openShop();'],
  ['camera pop-up', "r.getElementById('bell').classList.add('show');"],
  ['Nova confirm', "e._setPage('nova'); r.getElementById('nvConf').classList.add('show');"],
  ['vacuum confirm', "e._setPage('vacuum'); r.getElementById('vcConf').classList.add('show');"],
  ['idle clock', 'e._idleShow();'],
]) {
  await run(tab, "e._setPage('home');" + js); await tab.waitForTimeout(80);
  const c = await covered(tab, '#rail a'), n = await run(tab, "return r.querySelectorAll('#rail a').length;");
  check(`rail 1280x800: the ${name} still covers the rail`, c.length === n, `${n - c.length} of ${n} rail items show through`);
  await run(tab, "e._closeShop(); r.querySelectorAll('#bell,#nvConf,#vcConf').forEach((x) => x && x.classList.remove('show')); if (e._idle && e._idle.shown) e._idleHide();");
}
// Living's scroller lets taps through to the rail, but a drag on a card, or under the shortest column, still scrolls it
{
  await run(tab, "e._setPage('living');"); await tab.waitForTimeout(120);
  const g = await run(tab, "const s = r.getElementById('lrScroll'), c = [...s.querySelectorAll(':scope>.lrc')].map((x) => x.getBoundingClientRect()), z = c.reduce((a, q) => (q.height < a.height ? q : a), c[0]); return { max: s.scrollHeight - s.clientHeight, card: [c[0].left + 60, 400], low: [z.left + 60, 760] };");
  const cdp = await tab.context().newCDPSession(tab), out = [];
  for (const [name, [x, y]] of [['on a card', g.card], ['under the shortest column', g.low]]) {
    await run(tab, "r.getElementById('lrScroll').scrollTop = 0;");
    await cdp.send('Input.synthesizeScrollGesture', { x, y, yDistance: -300, gestureSourceType: 'touch', speed: 1200 }); await tab.waitForTimeout(150);
    out.push(name + ' ' + (await run(tab, "return r.getElementById('lrScroll').scrollTop;")));
  }
  check('Living: a drag on a card and under the shortest column still scrolls the page', g.max > 0 && out.every((o) => +o.split(' ').pop() > 0), `scroll range ${g.max}; ${out.join(', ')}`);
}
await tab.close();
await (await sweep(390, 844, '#tabs a', 'tab bar 390x844', STATES.filter((s) => s[0] !== 'light panel open'))).close(); /* the phone's light panel is a sheet that covers the bar on purpose */

await browser.close();
results.forEach((r) => console.log(r[0], r[1], r[2] ? '  ' + r[2] : ''));
const f = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - f} passed, ${f} failed`);
process.exit(f ? 1 : 0);
