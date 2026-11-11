/* Scene style checks (general.page_style: scene). Exit 1 on the first problem.
   1. With the scene style on the tablet, each scene page (Energy, Climate, Household, Security, Vacuum, System) has a title,
      a drawing (an <svg> with a viewBox) and its panels in one row along the bottom: inside the canvas, below the title,
      no two panels overlapping.
   2. Home, Living room and Nova keep their own layout (no row, no drawing).
   3. No page errors and no service calls.
   4. Switching back to classic puts every panel back where the classic layout has it.
   5. The phone layout ignores the scene style.
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
async function mount(cfg, vp = { width: 1280, height: 800 }) {
  const page = await browser.newPage({ viewport: vp });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: T0 });
  await page.setContent('<!doctype html><html><body style="margin:0"><oriel-shell style="display:block;width:100vw;height:100vh"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.clock.runFor(100);
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    window.__calls = [];
    const e = document.querySelector('oriel-shell');
    e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: (d, s, data) => { window.__calls.push([d, s, data]); return Promise.resolve(); }, callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
  }, { cfg, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC });
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
      const pg = document.querySelector('oriel-shell')._pages[k].el, h = pg.querySelector('.scHero'), svg = pg.querySelector('.scArt svg'), row = pg.querySelector('.scRow');
      const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right }; };
      return { title: h && h.querySelector('h1') ? h.querySelector('h1').textContent : '', vb: svg ? svg.getAttribute('viewBox') : '', hero: r(h), row: r(row) };
    }, k);
    if (!info.title) fail(`${k}: no title`);
    if (!/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/.test(info.vb || '')) fail(`${k}: no drawing with a viewBox`);
    const ps = await panels(page, k);
    if (!ps.length) fail(`${k}: no panels shown`);
    const out = ps.filter((p) => !p.inRow); if (out.length) fail(`${k}: panels not in the row: ${out.map((p) => p.id).join(', ')}`);
    ps.forEach((p) => { if (p.b > 800.5 || p.t < 0) fail(`${k}: ${p.id} is outside the canvas vertically (${p.t.toFixed(0)}–${p.b.toFixed(0)})`); });
    ps.forEach((p) => { if (p.t < info.hero.b - 0.5) fail(`${k}: ${p.id} (top ${p.t.toFixed(0)}) overlaps the title block (bottom ${info.hero.b.toFixed(0)})`); });
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      if (a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5) fail(`${k}: ${a.id} and ${b.id} overlap`);
    }
    ok(`${k}: title “${info.title}”, a drawing, ${ps.length} panels in one row inside the canvas (width ${W})`);
  }
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
  const calls = await page.evaluate(() => window.__calls.length); if (calls) fail(calls + ' service calls');
  ok('no page errors, no service calls');

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
    const left = await page.evaluate((k) => !!document.querySelector('oriel-shell')._pages[k].el.querySelector('.scRow,.scHero,.scArt'), k);
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
  onPhone.forEach((p, i) => { if (p !== want[i]) fail(`${SCENE[i]}: on the phone the panels are not back in their classic places:\n  got  ${p}\n  want ${want[i]}`); });
  /* inline widths match a card that was a phone from the start (some pages set widths themselves) */
  const widths = (pg) => pg.evaluate((keys) => { const sh = document.querySelector('oriel-shell'); return keys.flatMap((k) => [...sh._pages[k].el.querySelectorAll('.glass,.dark,.black')].filter((x) => !x.parentElement.closest('.glass,.dark,.black')).map((x) => x.id + ':' + x.style.width)); }, SCENE);
  const freshPhone = await mount(classic, { width: 390, height: 844 });
  const [gotW, wantW] = [await widths(fl.page), await widths(freshPhone.page)];
  await freshPhone.page.close();
  const diffW = gotW.filter((x, i) => x !== wantW[i]);
  if (diffW.length) fail('panels keep the scene width on the phone: ' + diffW.join(', ') + ' (a fresh phone card has ' + wantW.filter((x, i) => x !== gotW[i]).join(', ') + ')');
  await fl.page.setViewportSize({ width: 1280, height: 800 }); await fl.page.waitForTimeout(500); await fl.page.clock.runFor(800);
  for (const k of SCENE) { await go(fl.page, k); const ps = await panels(fl.page, k); if (!ps.length || ps.some((p) => !p.inRow)) fail(`${k}: panels not back in the row after phone → tablet`); }
  if (fl.errors.length) fail('flip page errors: ' + fl.errors.join(' | '));
  ok('tablet → phone → tablet: the panels go back to their classic places on the phone and into the row again on the tablet');
  await fl.page.close();

  const themes = fs.readFileSync('src/theme/themes.js', 'utf8');
  if (!/\bdusk: \{ name: 'Dusk'/.test(themes)) fail('there is no Dusk theme');
  ok('the Dusk theme exists (its contrast is checked by dev/contrast.mjs with every theme)');
} catch (e) {
  if (!process.exitCode) { console.error('FAIL ' + e.message); process.exitCode = 1; }
} finally {
  await browser.close();
}
