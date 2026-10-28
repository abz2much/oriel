/* Navigation motion checks, with the mock hass. Usage: node dev/nav-motion.mjs   Exits 1 on any failure.
   The sliding indicator (the phone bar's bubble, the tablet rail's chip) and the card fade on a page change:
   - the indicator is non-interactive, hidden from assistive tech, and sits behind the links;
   - it is placed by measuring the active item: after a page change, a resize, a layout flip and a rebuild;
   - first paint and rebuilds place it with no transition, only a page change animates;
   - reduced motion: the indicator jumps and the cards just appear;
   - cards fade in on a page change (not on a hass update) and end with no leftover transform;
   - the phone bar with four pages (no More) and with more than five (More);
   - the glass sits inside @supports (backdrop-filter), and the stacking of the rail, tabs and pages is untouched. */
import './freeze-time.mjs';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const bundle = fs.readFileSync('dist/oriel.js', 'utf8');
const full = JSON.parse(fs.readFileSync('dev/configs/full-nova.json', 'utf8'));
const few = JSON.parse(JSON.stringify(full)); /* four pages: Home, Living, Energy and System (System always shows) */
['climate', 'security', 'family', 'vacuum', 'system', 'nova'].forEach((k) => { few[k] = {}; }); few.nova = { enabled: false }; few.home.shopping = '';
const results = []; const check = (n, ok, x) => results.push([ok ? 'PASS' : 'FAIL', n, x || '']);
const browser = await chromium.launch();

async function open(W, H, cfg, reduced) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent('<!doctype html><html><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100%"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    window.__hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: () => Promise.resolve(), callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
    e.hass = window.__hass;
  }, { cfg, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.waitForTimeout(700);
  return { page, ctx, errors };
}
const run = (page, js) => page.evaluate((src) => new Function('r', 'e', src)(document.querySelector('oriel-shell').shadowRoot, document.querySelector('oriel-shell')), js);

/* in the page: how far the visible indicator is from the active item (px), and how many indicators show */
const ALIGN = `const nav = r.getElementById('%NAV%'), a = nav.querySelector('a.on'), inds = [...nav.querySelectorAll('.navI')].filter((i) => getComputedStyle(i).opacity !== '0');
  if (!a || inds.length !== 1) return { err: 'active ' + !!a + ', visible indicators ' + inds.length };
  const x = inds[0].getBoundingClientRect(), y = a.getBoundingClientRect();
  return { d: Math.max(Math.abs(x.left - y.left), Math.abs(x.top - y.top), Math.abs(x.width - y.width), Math.abs(x.height - y.height)) };`;
const aligned = async (page, nav) => { const o = await run(page, ALIGN.replace('%NAV%', nav)); return { ok: !o.err && o.d < 1, why: o.err || o.d.toFixed(2) + ' px off' }; };

/* ---------- tablet rail ---------- */
{
  const { page, errors } = await open(1280, 800, full);
  const info = await run(page, `const rail = r.getElementById('rail'), pl = rail.querySelector('.pl'), ind = pl.querySelector(':scope>.navI');
    return { has: !!ind, first: !!ind && ind.parentElement.firstElementChild === ind, inPl: !!ind && ind.parentElement === pl, aria: ind && ind.getAttribute('aria-hidden'),
      pe: ind && getComputedStyle(ind).pointerEvents, z: ind && getComputedStyle(ind).zIndex, tr: ind && getComputedStyle(ind).transitionDuration,
      railZ: getComputedStyle(rail).zIndex, a: !!rail.querySelector('a.on') };`);
  check('rail: an indicator exists inside the .pl wrapper, first, so the links paint on top', info.has && info.inPl && info.first);
  check('rail: the indicator is aria-hidden and pointer-events:none, with no z-index', info.aria === 'true' && info.pe === 'none' && info.z === 'auto', JSON.stringify([info.aria, info.pe, info.z]));
  check('rail: the stacking of #rail is untouched (no z-index)', info.railZ === 'auto', info.railZ);
    check('rail: first paint has no transition', info.tr === '0s', info.tr);
  let al = await aligned(page, 'rail'); check('rail: the chip is on the active item as opened', al.ok, al.why);

  /* a tap on the item under the indicator still reaches the link */
  const hit = await run(page, `const a = r.querySelector('#rail a[data-k="energy"]'), q = a.getBoundingClientRect(), h = r.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); return !!h && a.contains(h);`);
  check('rail: the link is topmost at its centre', hit);

  /* a page change animates the slide (and only a page change) */
  const slide = await run(page, `const ind = r.querySelector('#rail .pl>.navI'); e._setPage('energy'); return ind ? { n: ind.getAnimations().length, dur: getComputedStyle(ind).transitionDuration } : { n: -1, dur: 'no indicator' };`);
  check('rail: a page change animates the chip (a transition runs)', slide.n >= 1 && slide.dur !== '0s', JSON.stringify(slide));
  const cur = await run(page, `const a = r.querySelector('#rail a.on'); return [a && a.dataset.k, a && a.getAttribute('aria-current'), r.querySelectorAll('#rail a[aria-current]').length];`);
  check('rail: the active item has aria-current after a page change, and only one does', cur[0] === 'energy' && cur[1] === 'page' && cur[2] === 1, JSON.stringify(cur));
  await page.waitForTimeout(700);
  al = await aligned(page, 'rail'); check('rail: the chip lines up with the active item after a page change', al.ok, al.why);

  /* every item, including the .end group that sits outside .pl */
  const keys = await run(page, `return [...r.querySelectorAll('#rail a[data-k]')].map((a) => a.dataset.k);`);
  const miss = [];
  for (const k of keys) { await run(page, `e._setPage('${k}');`); await page.waitForTimeout(550); const o = await aligned(page, 'rail'); if (!o.ok) miss.push(k + ' (' + o.why + ')'); }
  check('rail: the chip lines up with every page in turn, the bottom group too', !miss.length, miss.join(', '));

  /* when the page icons scroll (.pl.scroll), the chip scrolls with them: it lives inside .pl */
  const sc = await run(page, `const rail = r.getElementById('rail'), pl = rail.querySelector('.pl'); rail.style.maxHeight = '300px'; pl.classList.add('scroll'); e._setPage('vacuum'); pl.scrollTop = 90; return { over: pl.scrollHeight > pl.clientHeight, top: pl.scrollTop };`);
  await page.waitForTimeout(600); al = await aligned(page, 'rail');
  check('rail: when the icons scroll the chip scrolls with them and stays on the active item', sc.over && sc.top > 0 && al.ok, JSON.stringify(sc) + ' ' + al.why);
  await run(page, `const rail = r.getElementById('rail'); rail.style.maxHeight = ''; rail.querySelector('.pl').classList.remove('scroll');`);

  /* a rebuild recreates it with no transition and no drift */
  await run(page, "e._setPage('climate');"); await page.waitForTimeout(550);
  const rb = await run(page, `e.setConfig(JSON.parse(JSON.stringify(e._raw))); e.hass = window.__hass; const ind = r.querySelector('#rail .pl>.navI'), nav = r.getElementById('rail'), a = nav.querySelector('a.on');
    if (!ind || !a) return { err: 'missing' }; const x = ind.getBoundingClientRect(), y = a.getBoundingClientRect(); return { n: ind.getAnimations().length, d: Math.abs(x.top - y.top) + Math.abs(x.left - y.left) };`);
  check('rail: after a rebuild the chip is recreated, in place at once, with no transition', !rb.err && rb.n === 0 && rb.d < 1, JSON.stringify(rb));

  /* the fade: cards animate on a page change, end clean, and do not animate on a hass update */
  await run(page, "e._setPage('home');"); await page.waitForTimeout(1500);
  const f0 = await run(page, `e._setPage('energy'); const pg = r.getElementById('pgEnergy'); return pg.getAnimations({ subtree: true }).filter((a) => a.animationName === 'nvFade').length;`);
  check('page change: the cards fade in (a nvFade animation runs on the new page)', f0 >= 1, 'animations ' + f0);
  await page.waitForTimeout(1800);
  const f1 = await run(page, `const pg = r.getElementById('pgEnergy'), bad = []; let n = 0;
    pg.querySelectorAll('.glass,.dark,.black,.nova,.card').forEach((c) => { if (!c.getClientRects().length) return; n++; const cs = getComputedStyle(c); if (cs.transform !== 'none' || cs.opacity !== '1') bad.push((c.id || c.className) + ' ' + cs.transform + ' ' + cs.opacity); });
    return { n, bad, left: pg.getAnimations({ subtree: true }).filter((a) => a.animationName === 'nvFade').length };`);
  check('page change: after the fade no card has a transform or less than full opacity', f1.n > 0 && !f1.bad.length && f1.left === 0, JSON.stringify(f1));
  const f2 = await run(page, `e.hass = Object.assign({}, window.__hass, { states: Object.assign({}, window.__hass.states) }); return r.getElementById('pgEnergy').getAnimations({ subtree: true }).filter((a) => a.animationName === 'nvFade').length;`);
  check('hass update: the cards do not fade', f2 === 0, 'animations ' + f2);
  const f3 = await run(page, `const fades = () => r.getElementById('pgEnergy').getAnimations({ subtree: true }).filter((a) => a.animationName === 'nvFade').length; const n = fades(); e._setPage('energy'); return n + fades();`);
  check('page change: choosing the page already showing does not fade', f3 === 0, String(f3));
  /* the fade only adds and removes its own class: Nova's chat input is class nvIn, and a page change must leave it alone */
  await run(page, "e._setPage('nova');"); await page.waitForTimeout(1500); await run(page, "e._setPage('home');"); await page.waitForTimeout(100); await run(page, "e._setPage('nova');"); await page.waitForTimeout(1500);
  const nv = await run(page, "const i = r.getElementById('nvIn'), c = r.getElementById('nvChat'); return { cls: i && i.className, h: i && Math.round(i.getBoundingClientRect().height), card: c && Math.round(c.getBoundingClientRect().height) };");
  check("page change: Nova's own classes are untouched (the chat input keeps nvIn and 44 px, the card keeps its height)", nv.cls === 'nvIn' && nv.h === 44 && nv.card > 400, JSON.stringify(nv));
  check('rail: no page errors', errors.length === 0, errors.join(' | '));
  await page.context().close();
}

/* ---------- reduced motion ---------- */
for (const [W, H, nav] of [[1280, 800, 'rail'], [390, 844, 'tabs']]) {
  const { page, errors } = await open(W, H, full, true);
  const r = await run(page, `const ind = r.querySelector('#${nav} .navI'); e._setPage('energy'); const pg = r.getElementById('pgEnergy');
    return { ind: !!ind, anim: ind ? ind.getAnimations().length : -1, dur: ind && getComputedStyle(ind).transitionDuration, cards: pg.getAnimations({ subtree: true }).filter((a) => a.animationName === 'nvFade').length };`);
  check(`reduced motion (${nav}): the indicator jumps and the cards just appear`, r.ind && r.anim === 0 && r.dur === '0s' && r.cards === 0, JSON.stringify(r));
  await page.waitForTimeout(150); const al = await aligned(page, nav); check(`reduced motion (${nav}): the indicator is on the active item at once`, al.ok, al.why);
  check(`reduced motion (${nav}): no page errors`, errors.length === 0, errors.join(' | '));
  await page.context().close();
}

/* ---------- phone bar ---------- */
for (const [label, cfg, expectMore] of [['four pages', few, false], ['more than five pages', full, true]]) {
  const { page, errors } = await open(390, 844, cfg);
  const info = await run(page, `const nav = r.getElementById('tabs'), ind = nav.querySelector('.navI'), tabs = [...nav.querySelectorAll('a')];
    return { n: tabs.length, more: !!nav.querySelector('[data-more]'), has: !!ind, first: !!ind && nav.firstElementChild === ind, aria: ind && ind.getAttribute('aria-hidden'), pe: ind && getComputedStyle(ind).pointerEvents, z: ind && getComputedStyle(ind).zIndex,
      tr: ind && getComputedStyle(ind).transitionDuration, tabsZ: getComputedStyle(nav).zIndex, pagesZ: getComputedStyle(r.getElementById('pages')).zIndex, linksPositioned: tabs.every((a) => getComputedStyle(a).position !== 'static'),
      minTap: Math.min(...tabs.map((a) => a.getBoundingClientRect().height)) };`);
  check(`phone bar (${label}): ${expectMore ? 'five tabs with More' : 'four tabs and no More'}`, expectMore ? info.n === 5 && info.more : info.n === 4 && !info.more, JSON.stringify([info.n, info.more]));
  check(`phone bar (${label}): the bubble is first in the bar, aria-hidden, pointer-events:none, no z-index, links above it`, info.has && info.first && info.aria === 'true' && info.pe === 'none' && info.z === 'auto' && info.linksPositioned, JSON.stringify(info));
  check(`phone bar (${label}): stacking untouched (#tabs 40, #pages auto) and tap targets 44 px or more`, info.tabsZ === '40' && info.pagesZ === 'auto' && info.minTap >= 44, JSON.stringify([info.tabsZ, info.pagesZ, info.minTap]));
  check(`phone bar (${label}): first paint has no transition`, info.tr === '0s', info.tr);
  let al = await aligned(page, 'tabs'); check(`phone bar (${label}): the bubble is on the active tab as opened`, al.ok, al.why);
  const keys = await run(page, `return [...r.getElementById('tabs').querySelectorAll('a[data-t]')].map((a) => a.dataset.t).concat(e._tabRest || []);`);
  const miss = [];
  for (const k of keys) { await run(page, `e._setPage('${k}');`); await page.waitForTimeout(550); const o = await aligned(page, 'tabs'); if (!o.ok) miss.push(k + ' (' + o.why + ')'); }
  check(`phone bar (${label}): the bubble lines up with every page in turn${expectMore ? ', More included' : ''}`, !miss.length, miss.join(', '));
  /* resize: a narrower phone */
  await run(page, "e._setPage('living');"); await page.waitForTimeout(500);
  await page.setViewportSize({ width: 360, height: 740 }); await page.waitForTimeout(500);
  al = await aligned(page, 'tabs'); check(`phone bar (${label}): the bubble follows a resize to 360 wide`, al.ok, al.why);
  /* a rebuild: in place at once, no transition */
  const rb = await run(page, `e.setConfig(JSON.parse(JSON.stringify(e._raw))); e.hass = window.__hass; const nav = r.getElementById('tabs'), ind = nav.querySelector('.navI'), a = nav.querySelector('a.on');
    if (!ind || !a) return { err: 'missing' }; const x = ind.getBoundingClientRect(), y = a.getBoundingClientRect(); return { n: ind.getAnimations().length, d: Math.abs(x.left - y.left) + Math.abs(x.width - y.width) };`);
  check(`phone bar (${label}): after a rebuild the bubble is recreated, in place at once, with no transition`, !rb.err && rb.n === 0 && rb.d < 1, JSON.stringify(rb));
  /* a page change slides, and the bubble is the only highlight (no solid chip on the link) */
  const sl = await run(page, `const nav = r.getElementById('tabs'), ind = nav.querySelector('.navI'); e._setPage('energy'); const on = nav.querySelector('a.on'); return { n: ind ? ind.getAnimations().length : -1, bg: getComputedStyle(on).backgroundColor, w: getComputedStyle(on).fontWeight };`);
  check(`phone bar (${label}): a page change slides the bubble, and the link has no chip of its own`, sl.n >= 1 && (sl.bg === 'rgba(0, 0, 0, 0)' || sl.bg === 'transparent') && +sl.w >= 500, JSON.stringify(sl));
  /* layout flip: tablet, then back */
  await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(600);
  al = await aligned(page, 'rail'); check(`phone bar (${label}): after flipping to the tablet layout the rail chip is on the active item`, al.ok, al.why);
  check(`phone bar (${label}): no page errors`, errors.length === 0, errors.join(' | '));
  await page.context().close();
}

/* ---------- no square flash when a tab or rail item is tapped ---------- */
/* The mobile tap highlight, a focus box after a pointer tap, a pressed background and a selectable label all draw a square round a rounded button. */
for (const [W, H, nav] of [[390, 844, 'tabs'], [1280, 800, 'rail']]) {
  const { page, errors } = await open(W, H, full);
  const info = await run(page, `const a = r.querySelector('#${nav} a'), cs = getComputedStyle(a); return { hl: cs.getPropertyValue('-webkit-tap-highlight-color'), us: cs.userSelect, tc: cs.getPropertyValue('-webkit-touch-callout') };`);
  check(`tap flash (${nav}): the tap highlight colour is transparent`, /rgba\(0, 0, 0, 0\)|transparent/.test(info.hl), info.hl);
  check(`tap flash (${nav}): labels are not selectable`, info.us === 'none', info.us);
  const pt = await run(page, `const q = r.querySelector('#${nav} a:not(.on)').getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2];`);
  if (nav === 'tabs') await page.touchscreen.tap(pt[0], pt[1]); else await page.mouse.click(pt[0], pt[1]);
  await page.waitForTimeout(150);
  const after = await run(page, `const f = r.activeElement; const a = f && f.closest ? f : null; const cs = a ? getComputedStyle(a) : null; return { focused: !!a, visible: a ? a.matches(':focus-visible') : false, outline: cs ? cs.outlineStyle + ' ' + cs.outlineWidth : 'none', shadow: cs ? cs.boxShadow : 'none' };`);
  check(`tap flash (${nav}): no focus ring after a pointer tap`, !after.focused || (!after.visible && /^(none|auto) 0px$|^none/.test(after.outline) ), JSON.stringify(after));
  const pt2 = await run(page, `const q = r.querySelector('#${nav} a:not(.on)').getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2];`);
  await page.mouse.move(pt2[0], pt2[1]); await page.mouse.down();
  const down = await run(page, `const a = r.querySelector('#${nav} a:not(.on):active') || r.querySelector('#${nav} a:not(.on)'), cs = getComputedStyle(a); return { bg: cs.backgroundColor, img: cs.backgroundImage, shadow: cs.boxShadow };`);
  await page.mouse.up();
  check(`tap flash (${nav}): no pressed background box while a finger is down`, (down.bg === 'rgba(0, 0, 0, 0)' || down.bg === 'transparent') && down.img === 'none' && down.shadow === 'none', JSON.stringify(down));
  /* every layer that moves or shows has a radius, so no square can appear mid-slide */
  const rad = await run(page, `const i = r.querySelector('#${nav} .navI'), n = r.getElementById('${nav}'); return { ind: i ? getComputedStyle(i).borderTopLeftRadius : 'none', nav: getComputedStyle(n).borderTopLeftRadius, link: getComputedStyle(r.querySelector('#${nav} a')).borderTopLeftRadius };`);
  check(`tap flash (${nav}): the indicator, the bar and the links all have rounded corners`, [rad.ind, rad.nav, rad.link].every((x) => parseFloat(x) >= 16), JSON.stringify(rad));
  check(`tap flash (${nav}): no page errors`, errors.length === 0, errors.join(' | '));
  await page.context().close();
}

/* ---------- the glass reads as glass, and the labels stay readable on real pixels ---------- */
/* Classic's bar is as clear as the mockup (0.26); in each theme, with a black card and then a light card scrolled under the bar, the label colour is measured on the
   bar's real rendered pixels (beside the icons, top and bottom), so the filter model in dev/contrast.mjs is checked against what a browser draws. */
{
  const lumOf = (c) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  for (const theme of ['classic', 'ember', 'deep-teal', 'midnight-signal', 'violet-mist']) {
    const cfg = JSON.parse(JSON.stringify(full)); cfg.general.theme = theme;
    const { page, errors } = await open(390, 844, cfg);
    await run(page, "e._setPage('energy');"); await page.waitForTimeout(1300);
    const css = await run(page, `const w = r.getElementById('wrap'), cs = getComputedStyle(w), t = getComputedStyle(r.getElementById('tabs')); return { ink: cs.getPropertyValue('--oriel-ink').trim(), soft: cs.getPropertyValue('--oriel-nav-soft').trim(), bg: t.backgroundColor, bf: t.backdropFilter };`);
    if (theme === 'classic') { const a = +css.bg.match(/[\d.]+(?=\))/)[0]; check('glass: Classic bar fill is far clearer than the 0.64 of 0.6.0 (at most 0.5)', a <= 0.5 && /blur\(26px\) saturate\(1.35\)/.test(css.bf), css.bg + ' ' + css.bf); }
    const ink = css.ink.split(',').map(Number), soft = +css.soft;
    for (const [what, sel] of [['a black card', '#pgEnergy .black, #pgEnergy .dark'], ['a light card', '#pgEnergy .glass']]) {
      await run(page, `const pg = r.getElementById('pages'), bar = r.getElementById('tabs').getBoundingClientRect(), all = [...r.querySelectorAll('${sel}')].filter((x) => x.getClientRects().length && x.getBoundingClientRect().height > 150 && !x.closest('.glass .glass')); const b = all[all.length - 1]; if (b) { const q = b.getBoundingClientRect(); pg.scrollTop += (q.top + q.height / 2) - (bar.top + bar.height / 2); }`);
      await page.waitForTimeout(400);
      const box = await run(page, `const b = r.getElementById('tabs').getBoundingClientRect(), tabs = [...r.querySelectorAll('#tabs a')].map((a) => a.getBoundingClientRect()); return { top: b.top, bottom: b.bottom, centres: tabs.map((q) => q.x + q.width / 2), active: [...r.querySelectorAll('#tabs a')].findIndex((a) => a.classList.contains('on')) };`);
      const png = (await page.screenshot()).toString('base64');
      const pts = []; box.centres.forEach((cx, i) => { if (i === box.active) return; [-30, 30].forEach((dx) => [box.top + 10, box.bottom - 10].forEach((y) => pts.push([Math.round(cx + dx), Math.round(y)]))); });
      const px = await page.evaluate(async ({ png, pts }) => { const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return pts.map(([x, y]) => [...g.getImageData(x, y, 1, 1).data].slice(0, 3)); }, { png, pts });
      let worst = 99; px.forEach((p) => { const label = p.map((v, i) => v + (ink[i] - v) * soft); worst = Math.min(worst, ratio(label, p)); });
      check(`glass: ${theme}: labels stay readable on the real bar over ${what} (worst ${worst.toFixed(2)}:1, needs 4.5)`, worst >= 4.5, `samples ${px.length}`);
    }
    check(`glass: ${theme}: no page errors`, errors.length === 0, errors.join(' | '));
    await page.context().close();
  }
}

/* ---------- the glass is inside @supports, with today's solid bar as the fallback ---------- */
{
  const { page } = await open(390, 844, full);
  const sup = await run(page, `const out = { glass: false, solid: false, outside: false }; const walk = (rules, inSup) => [...rules].forEach((x) => {
      if (x.selectorText !== undefined) { /* a style rule (it may also carry nested rules, so look at it first) */
        if (/#tabs$/.test(x.selectorText) && /blur\\(26px\\)/.test(x.style.getPropertyValue('backdrop-filter') + x.style.getPropertyValue('-webkit-backdrop-filter'))) { if (inSup) out.glass = true; else out.outside = true; }
        if (/#wrap\\.phone #tabs$/.test(x.selectorText) && !inSup && /gradient/.test(x.style.getPropertyValue('background') + x.style.getPropertyValue('background-image'))) out.solid = true;
      } else if (x.cssRules) walk(x.cssRules, inSup || (x.conditionText !== undefined && /backdrop-filter/.test(x.conditionText))); });
    [...r.styleSheets].forEach((s) => walk(s.cssRules, false)); return out;`);
  check('phone bar: the 26 px glass is only declared inside @supports (backdrop-filter), and the solid gradient stays as the fallback', sup.glass && !sup.outside && sup.solid, JSON.stringify(sup));
  await page.context().close();
}

await browser.close();
results.forEach((r) => console.log(r[0], r[1], r[2] ? '  ' + r[2] : ''));
const f = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - f} passed, ${f} failed`);
process.exit(f ? 1 : 0);
