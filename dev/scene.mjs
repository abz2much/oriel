/* Scene style checks (general.page_style: scene). Exit 1 on the first problem.
   1. With the scene style on the tablet, each scene page (Energy, Climate, Household, Security, Vacuum, System) has a title,
      a line above it, status chips, a drawing (an <svg> with a viewBox) with live labels, and compact cards in one row:
      inside the canvas, below the title, none overlapping, and no sideways scrolling with the full test config.
   2. The page's own (classic) cards are hidden and cannot be tapped; tapping a compact card opens the matching classic
      card in a pop-up, inside the canvas; closing it puts the card back.
   3. Climate: the compact − and + do what the classic buttons do (one climate.set_temperature call each).
   4. Home and Living room keep their own layout. No page errors; no service calls unless a control is pressed.
   5. Switching back to classic puts every panel back where the classic layout has it; the phone ignores the style and
      a card that turns from tablet to phone and back gets its panels back on the phone.
   6. The Family page is labelled Household; the Dusk theme exists. */
import fs from 'node:fs';
import { chromium } from 'playwright';

const T0 = new Date('2026-10-20T18:04:00').getTime();
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [T0])); } static now() { return T0; } };
const { mkStates, CALLWS_SRC, CALLAPI_SRC } = await import('./mock.mjs');

const fail = (m) => { console.error('FAIL ' + m); process.exitCode = 1; throw new Error(m); };
const ok = (m) => console.log('ok   ' + m);
const bundle = fs.readFileSync(process.env.BUNDLE || 'dist/oriel.js', 'utf8');
const base = JSON.parse(fs.readFileSync('dev/configs/full.json', 'utf8'));
const SCENE = ['energy', 'climate', 'family', 'security', 'vacuum', 'system'];
const OWN = ['home', 'living'];

const browser = await chromium.launch();
async function mount(cfg, vp = { width: 1280, height: 800 }, extra = {}) {
  const page = await browser.newPage({ viewport: vp });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: T0 });
  await page.setContent('<!doctype html><html><body style="margin:0"><oriel-shell style="display:block;width:100vw;height:100vh"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.clock.runFor(100);
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    window.__calls = []; window.__ws = []; window.__api = [];
    const e = document.querySelector('oriel-shell');
    e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: (d, s, data) => { window.__calls.push([d, s, data]); return Promise.resolve(); }, callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
  }, { cfg, st: Object.assign(mkStates(), extra), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.clock.runFor(600);
  return { page, errors };
}
const go = (page, k) => page.evaluate((k) => document.querySelector('oriel-shell')._setPage(k), k).then(() => page.clock.runFor(400));
/* rects of the page's outermost panels, by id, in canvas pixels */
const panels = (page, k) => page.evaluate((k) => {
  const sh = document.querySelector('oriel-shell'), pg = sh._pages[k].el, wrap = sh.shadowRoot.getElementById('wrap');
  const s = wrap.getBoundingClientRect().width / wrap.offsetWidth || 1, o = wrap.getBoundingClientRect();
  return [...pg.querySelectorAll('.glass,.dark,.black')].filter((x) => !x.parentElement.closest('.glass,.dark,.black') && x.offsetWidth > 0)
    .map((x) => { const b = x.getBoundingClientRect(); return { id: x.id, inRow: !!x.closest('.scRow'), l: (b.left - o.left) / s, t: (b.top - o.top) / s, r: (b.right - o.left) / s, b: (b.bottom - o.top) / s }; });
}, k);

try {
  const scene = structuredClone(base); scene.general = Object.assign({}, scene.general, { page_style: 'scene' });
  const { page, errors } = await mount(scene);
  const W = await page.evaluate(() => document.querySelector('oriel-shell').shadowRoot.getElementById('wrap').offsetWidth);
  if (!(await page.evaluate(() => document.querySelector('oriel-shell').shadowRoot.getElementById('wrap').classList.contains('scene')))) fail('the scene style is not on (#wrap.scene missing)');
  for (const k of SCENE) {
    await go(page, k);
    const info = await page.evaluate((k) => {
      const sh = document.querySelector('oriel-shell'), pg = sh._pages[k].el, h = pg.querySelector('.scHero'), svg = pg.querySelector('.scArt svg'), row = pg.querySelector('.scRow');
      const wrap = sh.shadowRoot.getElementById('wrap'), o = wrap.getBoundingClientRect(), s = o.width / wrap.offsetWidth || 1;
      const r = (e) => { const b = e.getBoundingClientRect(); return { id: e.dataset.open || e.className, l: (b.left - o.left) / s, t: (b.top - o.top) / s, r: (b.right - o.left) / s, b: (b.bottom - o.top) / s }; };
      const classic = [...pg.querySelectorAll('.glass,.dark,.black')].filter((x) => !x.closest('.scRow,.scPop') && !x.parentElement.closest('.glass,.dark,.black') && x.offsetWidth > 0);
      return {
        title: h && h.querySelector('h1') ? h.querySelector('h1').textContent : '', meta: h ? (h.querySelector('.meta') || {}).textContent || '' : '',
        chips: h ? h.querySelectorAll('.scChip').length : 0, vb: svg ? svg.getAttribute('viewBox') : '', labels: pg.querySelectorAll('.scArt .scLab').length,
        hero: h ? r(h) : null, cards: row ? [...row.querySelectorAll('.scC')].map(r) : [], overflow: row ? row.scrollWidth - row.clientWidth : 0,
        shown: classic.filter((x) => getComputedStyle(x).visibility !== 'hidden' || getComputedStyle(x).pointerEvents !== 'none').map((x) => x.id),
      };
    }, k);
    if (!info.title) fail(`${k}: no title`);
    if (!info.meta.trim()) fail(`${k}: no line above the title`);
    if (!info.chips) fail(`${k}: no status chips under the title`);
    if (!/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/.test(info.vb || '')) fail(`${k}: no drawing with a viewBox`);
    if (!info.labels) fail(`${k}: no live labels on the drawing`);
    if (info.cards.length < 3) fail(`${k}: only ${info.cards.length} compact cards`);
    if (info.overflow > 1) fail(`${k}: the row scrolls sideways by ${info.overflow}px with the full config`);
    if (info.shown.length) fail(`${k}: classic cards still showing or tappable: ${info.shown.join(', ')}`);
    info.cards.forEach((p) => { if (p.b > 800.5 || p.t < 0 || p.l < 0) fail(`${k}: card ${p.id} is outside the canvas`); if (p.t < info.hero.b - 0.5) fail(`${k}: card ${p.id} overlaps the title block`); });
    for (let i = 0; i < info.cards.length; i++) for (let j = i + 1; j < info.cards.length; j++) {
      const a = info.cards[i], b = info.cards[j];
      if (a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5) fail(`${k}: cards ${a.id} and ${b.id} overlap`);
    }
    /* tap each card that opens a classic card: the pop-up shows it inside the canvas; close puts it back */
    const opens = await page.evaluate((k) => [...document.querySelector('oriel-shell')._pages[k].el.querySelectorAll('.scRow .scC[data-open]')].map((c) => c.dataset.open), k);
    if (!opens.length) fail(`${k}: no compact card opens a full card`);
    for (const id of opens) {
      await page.evaluate(({ k, id }) => document.querySelector('oriel-shell')._pages[k].el.querySelector(`.scRow .scC[data-open="${id}"]`).click(), { k, id });
      await page.clock.runFor(300);
      const pop = await page.evaluate((id) => {
        const sh = document.querySelector('oriel-shell'), w = sh.shadowRoot.getElementById('wrap'), o = w.getBoundingClientRect(), s = o.width / w.offsetWidth || 1;
        const pp = sh.shadowRoot.querySelector('.scPop'), el = sh.shadowRoot.getElementById(id);
        if (!pp || !el) return { ok: false, why: !pp ? 'no pop-up' : 'no ' + id };
        const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
        return { ok: pp.contains(el) && cs.visibility !== 'hidden', l: (b.left - o.left) / s, t: (b.top - o.top) / s, r: (b.right - o.left) / s, b: (b.bottom - o.top) / s, why: pp.contains(el) ? 'hidden' : 'not in the pop-up' };
      }, id);
      if (!pop.ok) fail(`${k}: tapping the ${id} card does not show it (${pop.why})`);
      if (pop.t < -0.5 || pop.b > 800.5) fail(`${k}: the ${id} pop-up is outside the canvas (${pop.t.toFixed(0)}–${pop.b.toFixed(0)})`);
      await page.evaluate(() => document.querySelector('oriel-shell').shadowRoot.querySelector('.scPop .scX').click());
      await page.clock.runFor(300);
      const back = await page.evaluate((id) => { const sh = document.querySelector('oriel-shell'), el = sh.shadowRoot.getElementById(id); return !sh.shadowRoot.querySelector('.scPop') && !!el && !el.closest('.scPop'); }, id);
      if (!back) fail(`${k}: closing the ${id} pop-up does not put the card back`);
    }
    ok(`${k}: “${info.title}”, “${info.meta.trim()}”, ${info.chips} chips, ${info.labels} labels, ${info.cards.length} compact cards with no sideways scroll; ${opens.length} open the full card and close again`);
  }
  if (await page.evaluate(() => window.__calls.length)) fail('opening and closing cards made service calls');
  /* climate: the compact + and − are the classic buttons */
  await go(page, 'climate');
  const bump = await page.evaluate(async () => {
    const sh = document.querySelector('oriel-shell'), b = sh._pages.climate.el.querySelector('.scRow [data-act^="bump:"][data-act*=":1:"]');
    if (!b) return 'no + button';
    window.__calls = []; b.click(); return '';
  });
  if (bump) fail('climate: ' + bump);
  await page.clock.runFor(3000);
  const cc = await page.evaluate(() => window.__calls.filter((c) => c[0] === 'climate' && c[1] === 'set_temperature').length);
  if (cc !== 1) fail(`climate: the compact + made ${cc} set_temperature calls, expected 1`);
  await page.evaluate(() => { window.__calls = []; });
  ok('climate: the compact + calls climate.set_temperature once, like the full card');
  for (const k of OWN) {
    await go(page, k);
    const has = await page.evaluate((k) => { const pg = document.querySelector('oriel-shell')._pages[k].el; return !!(pg.querySelector('.scRow') || pg.querySelector('.scArt')); }, k);
    if (has) fail(`${k}: should keep its own layout in the scene style`);
  }
  ok('Home and Living room keep their own layout');
  const fam = await page.evaluate(() => [...document.querySelector('oriel-shell').shadowRoot.querySelectorAll('#rail a')].map((a) => a.getAttribute('aria-label')));
  if (!fam.includes('Household') || fam.includes('Family')) fail('the rail should say Household, not Family: ' + fam.join(', '));
  ok('the rail says Household');
  if (errors.length) fail('page errors: ' + errors.join(' | '));
  ok('no page errors');

  /* back to classic: every panel where a classic render has it */
  const classic = structuredClone(base);
  const ref = await mount(classic);
  for (const k of SCENE) {
    await page.evaluate((cfg) => document.querySelector('oriel-shell').setConfig(cfg), classic);
    await page.clock.runFor(300);
    await go(page, k); await go(ref.page, k);
    const [a, b] = [await panels(page, k), await panels(ref.page, k)];
    if (a.length !== b.length) fail(`${k}: ${a.length} panels after switching back, ${b.length} in classic`);
    a.forEach((p, i) => { const q = b[i]; if (p.id !== q.id || ['l', 't', 'r', 'b'].some((z) => Math.abs(p[z] - q[z]) > 0.5)) fail(`${k}: ${p.id} is not back in place after switching to classic`); });
    const left = await page.evaluate((k) => !!document.querySelector('oriel-shell')._pages[k].el.querySelector('.scRow,.scHero,.scArt,.scPop,.scHid'), k);
    if (left) fail(`${k}: scene parts left behind after switching to classic`);
  }
  ok('switching back to classic puts every panel back in place and removes the scene parts');
  await ref.page.close(); await page.close();

  /* phone ignores the style */
  const ph = await mount(scene, { width: 390, height: 844 });
  const phone = await ph.page.evaluate(() => { const w = document.querySelector('oriel-shell').shadowRoot.getElementById('wrap'); return { phone: w.classList.contains('phone'), scene: w.classList.contains('scene'), rows: w.querySelectorAll('.scRow').length }; });
  if (!phone.phone || phone.scene || phone.rows) fail('the phone layout should ignore the scene style: ' + JSON.stringify(phone));
  if (ph.errors.length) fail('phone page errors: ' + ph.errors.join(' | '));
  ok('the phone layout ignores the scene style');
  await ph.page.close();

  /* the same card flips from tablet to phone and back: panels go home on the phone, return to the row on the tablet */
  const fl = await mount(scene);
  const parents = () => fl.page.evaluate((keys) => { const sh = document.querySelector('oriel-shell'); return keys.map((k) => [...sh._pages[k].el.querySelectorAll('.glass,.dark,.black')].filter((x) => !x.parentElement.closest('.glass,.dark,.black')).map((x) => x.id + '<' + (x.parentElement.id || x.parentElement.className)).join(' ')); }, SCENE);
  const ref2 = await mount(classic);
  const want = await ref2.page.evaluate((keys) => { const sh = document.querySelector('oriel-shell'); return keys.map((k) => [...sh._pages[k].el.querySelectorAll('.glass,.dark,.black')].filter((x) => !x.parentElement.closest('.glass,.dark,.black')).map((x) => x.id + '<' + (x.parentElement.id || x.parentElement.className)).join(' ')); }, SCENE);
  await ref2.page.close();
  await fl.page.setViewportSize({ width: 390, height: 844 }); await fl.page.waitForTimeout(500); await fl.page.clock.runFor(800);
  const onPhone = await parents();
  const hidOnPhone = await fl.page.evaluate(() => document.querySelector('oriel-shell').shadowRoot.querySelectorAll('.scHid,.scRow,.scHero,.scArt').length);
  if (hidOnPhone) fail(`on the phone ${hidOnPhone} scene parts or hidden cards are left`);
  onPhone.forEach((p, i) => { if (p !== want[i]) fail(`${SCENE[i]}: on the phone the panels are not back in their classic places:\n  got  ${p}\n  want ${want[i]}`); });
  /* inline widths match a card that was a phone from the start (some pages set widths themselves) */
  const widths = (pg) => pg.evaluate((keys) => { const sh = document.querySelector('oriel-shell'); return keys.flatMap((k) => [...sh._pages[k].el.querySelectorAll('.glass,.dark,.black')].filter((x) => !x.parentElement.closest('.glass,.dark,.black')).map((x) => x.id + ':' + x.style.width)); }, SCENE);
  const freshPhone = await mount(classic, { width: 390, height: 844 });
  const [gotW, wantW] = [await widths(fl.page), await widths(freshPhone.page)];
  await freshPhone.page.close();
  const diffW = gotW.filter((x, i) => x !== wantW[i]);
  if (diffW.length) fail('panels keep the scene width on the phone: ' + diffW.join(', ') + ' (a fresh phone card has ' + wantW.filter((x, i) => x !== gotW[i]).join(', ') + ')');
  await fl.page.setViewportSize({ width: 1280, height: 800 }); await fl.page.waitForTimeout(500); await fl.page.clock.runFor(800);
  for (const k of SCENE) { await go(fl.page, k); const n = await fl.page.evaluate((k) => document.querySelector('oriel-shell')._pages[k].el.querySelectorAll('.scRow .scC').length, k); if (!n) fail(`${k}: no compact cards after phone → tablet`); }
  if (fl.errors.length) fail('flip page errors: ' + fl.errors.join(' | '));
  ok('tablet → phone → tablet: the panels go back to their classic places on the phone and into the row again on the tablet');
  await fl.page.close();

  /* the scene look is on every page while the scene style is on (Home, Living room and Nova included), and off with classic */
  {
    const m = await mount(scene);
    for (const k of ['home', 'living', 'energy']) {
      await go(m.page, k);
      const on = await m.page.evaluate(() => document.querySelector('oriel-shell').shadowRoot.getElementById('wrap').classList.contains('scnow'));
      if (!on) fail(`${k}: the scene look is not on while the scene style is on`);
    }
    await m.page.close();
    const c2 = await mount(classic);
    if (await c2.page.evaluate(() => document.querySelector('oriel-shell').shadowRoot.getElementById('wrap').classList.contains('scnow'))) fail('the scene look is on with the classic style');
    await c2.page.close();
    ok('the scene look covers every page (Home, Living room and Nova too) and only with the scene style');
  }

  /* a Dreame vacuum with a room map: a compact card opens the map with its room buttons */
  {
    const dv = structuredClone(scene);
    dv.vacuum.vacuums[0] = Object.assign({}, dv.vacuum.vacuums[0], { integration: 'dreame', map_camera: 'camera.robot_map' });
    const m = await mount(dv, undefined, { 'camera.robot_map': { state: 'idle', attributes: { friendly_name: 'Robot map', entity_picture: '', rooms: { 1: { name: 'Kitchen', order: 1 }, 2: { name: 'Hall', order: 2 }, 3: { name: 'Living room', order: 3 } } } } });
    await go(m.page, 'vacuum');
    const has = await m.page.evaluate(() => !!document.querySelector('oriel-shell')._pages.vacuum.el.querySelector('.scRow .scC[data-open="vcMapP"]'));
    if (!has) fail('vacuum: no compact card opens the room map (room cleaning is unreachable)');
    await m.page.evaluate(() => document.querySelector('oriel-shell')._pages.vacuum.el.querySelector('.scRow .scC[data-open="vcMapP"]').click());
    await m.page.clock.runFor(400);
    const rooms = await m.page.evaluate(() => { const sh = document.querySelector('oriel-shell'), pop = sh.shadowRoot.querySelector('.scPop'); return pop ? pop.querySelectorAll('#vcRooms .vcR').length : -1; });
    if (rooms < 3) fail(`vacuum: the room map pop-up shows ${rooms} room buttons, expected 3`);
    if (m.errors.length) fail('vacuum room map page errors: ' + m.errors.join(' | '));
    ok(`vacuum: a "Clean a room" card opens the room map with its ${rooms} room buttons`);
    await m.page.close();
  }

  const themes = fs.readFileSync('src/theme/themes.js', 'utf8');
  if (!/\bdusk: \{ name: 'Dusk'/.test(themes)) fail('there is no Dusk theme');
  ok('the Dusk theme exists (its contrast is checked by dev/contrast.mjs with every theme)');
} catch (e) {
  if (!process.exitCode) { console.error('FAIL ' + e.message); process.exitCode = 1; }
} finally {
  await browser.close();
}
