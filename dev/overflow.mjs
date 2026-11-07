/* Text overflow checks, with the mock hass. Usage: node dev/overflow.mjs   Exits 1 on any failure.
   BUNDLE=<file> checks another bundle (for example an older release); PAGES=energy,vacuum picks pages; LIST=1 prints every offender.
   At five tablet sizes, on Energy, Vacuum and System (and the System page's Update chip and Auto rotate row, with updates waiting):
   - no text may extend beyond the box that holds it (the card, tile or chip with a background or border), and
   - no box may clip its text (a box with overflow hidden whose content is taller or wider than the box).
   On Energy, with all six Today tiles and a standing charge: no two cards overlap (a card that grows must not run under the next one),
   every Big consumers row stays inside its card (with three appliances, one more than fits; at normal text two still show), the standing charge shows in full, and at normal text every Today tile label shows in full.
   The layout is a fixed canvas that is scaled to the screen, so the sizes also cover the widened canvas (up to 1700 wide).
   Every size is checked at normal text and with every text 25% larger (Android's text scaling and minimum font size do that, and the boxes only had 3 to 10 px to spare). TEXT_ZOOM=1.15 checks one other scale, and MIN_FONT=14 lifts every text smaller than 14 px to 14 px (what Android's text scaling and minimum font size do), to find places that only just fit. */
import './freeze-time.mjs';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const bundle = fs.readFileSync(process.env.BUNDLE || 'dist/oriel.js', 'utf8');
const cfg = JSON.parse(fs.readFileSync('dev/configs/full-nova.json', 'utf8'));
cfg.energy.consumers.appliances = ['Washer', 'Dishwasher', 'Oven']; /* one more appliance than Big consumers has room for: the last row must be left out, not spill */
Object.assign(cfg.energy.today, { house_use: 'sensor.house_use_today', battery_charged: 'sensor.battery_charged_today', standing_charge: 0.97 }); /* all six Today tiles (three rows) and the standing charge line */
const TODAY_STATES = { 'sensor.house_use_today': { entity_id: 'sensor.house_use_today', state: '11.2', attributes: { unit_of_measurement: 'kWh', device_class: 'energy' } },
  'sensor.battery_charged_today': { entity_id: 'sensor.battery_charged_today', state: '9.4', attributes: { unit_of_measurement: 'kWh', device_class: 'energy' } } };
cfg.energy.pv_strings = [{ name: 'PV1', entity: 'sensor.pv_east_power', panels: 8 }, { name: 'PV2', entity: 'sensor.pv_west_power', panels: 4 }];
const PAGES = (process.env.PAGES || 'energy,vacuum,system').split(','), SIZES = [[1024, 768], [1180, 820], [1280, 800], [1366, 1024], [1920, 1200]];
const ZOOMS = process.env.TEXT_ZOOM ? [+process.env.TEXT_ZOOM] : [1, 1.25], MINF = +(process.env.MIN_FONT || 0), LIST = !!process.env.LIST;
const results = []; const check = (n, ok, x) => results.push([ok ? 'PASS' : 'FAIL', n, x || '']);
const browser = await chromium.launch();

/* runs in the page: the offenders on the page that shows */
const SCAN = (key) => {
  const r = document.querySelector('oriel-shell').shadowRoot, pg = r.getElementById('pg' + key[0].toUpperCase() + key.slice(1)), out = [], TOL = 1.5;
  const visible = (e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 && e.getClientRects().length > 0; };
  /* the box a text sits in: the nearest ancestor that paints a background or a border (a card, a tile, a chip) */
  const holder = (el) => { for (let n = el.parentElement; n && n !== pg.parentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'contents') continue; const bg = cs.backgroundColor, painted = (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || cs.backgroundImage !== 'none' || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none'); if (painted && n.getBoundingClientRect().height > 8) return n; } return null; };
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
  const walker = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT);
  for (let tn; (tn = walker.nextNode());) {
    const txt = tn.textContent.trim(); if (!txt) continue;
    const el = tn.parentElement; if (!el || !visible(el) || el.closest('.hide') || (el.closest('svg') && el.tagName.toLowerCase() === 'title')) continue;
    const range = document.createRange(); range.selectNodeContents(tn); const q = range.getBoundingClientRect(); if (!q.width || !q.height) continue;
    const box = holder(el.closest('svg') ? el.closest('svg') : el); if (!box) continue;
    let b = box.getBoundingClientRect(), cut = false;
    for (let n = el; n && n !== box; n = n.parentElement) { const cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) cut = true; } /* a scroller shows the rest by scrolling */
    if (cut) continue;
    const d = { top: b.top - q.top, bottom: q.bottom - b.bottom, left: b.left - q.left, right: q.right - b.right };
    const worst = Math.max(d.top, d.bottom, d.left, d.right);
    if (worst > TOL) out.push({ kind: 'outside', text: txt.slice(0, 28), el: name(el), box: name(box), by: Math.round(worst * 10) / 10, side: Object.keys(d).find((k) => d[k] === worst) });
  }
  /* a box that clips: overflow hidden or clip, and more content than room */
  pg.querySelectorAll('*').forEach((e) => {
    if (!visible(e) || e.closest('svg')) return; const cs = getComputedStyle(e); if (!/(hidden|clip)/.test(cs.overflowY + cs.overflowX)) return;
    if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') return; /* a label that is meant to end in … or at N lines */
    if (!(e.textContent || '').trim()) return;
    const dy = e.scrollHeight - e.clientHeight, dx = e.scrollWidth - e.clientWidth;
    if (dy > TOL || dx > TOL) out.push({ kind: 'clipped', text: (e.textContent || '').trim().slice(0, 28), el: name(e), box: name(e), by: Math.round(Math.max(dy, dx) * 10) / 10, side: dy > TOL ? 'bottom' : 'right' });
  });
  return out;
};

/* runs in the page: Energy's layout problems (in canvas px, before the screen scale) */
const EN_LAYOUT = (ZOOM) => {
  const r = document.querySelector('oriel-shell').shadowRoot, out = [], TOL = 0.5, k = r.getElementById('enWrap').getBoundingClientRect().width / 1280;
  const shown = (e) => e && !e.classList.contains('hide') && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
  const R = (e) => e.getBoundingClientRect(), px = (v) => Math.round(v / k * 10) / 10;
  const cards = [...r.getElementById('enWrap').children].filter(shown);
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const a = R(cards[i]), b = R(cards[j]), w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > TOL && h > TOL) out.push(`#${cards[i].id} and #${cards[j].id} overlap ${px(w)} x ${px(h)}`);
  }
  const cons = r.getElementById('enCons');
  if (shown(cons)) { const c = R(cons); [...cons.children].filter(shown).forEach((e) => { const q = R(e); const by = Math.max(c.top - q.top, q.bottom - c.bottom, c.left - q.left, q.right - c.right); if (by > TOL) out.push(`${e.id ? '#' + e.id : e.className} is outside #enCons by ${px(by)}`); }); }
  if (shown(cons)) { const n = [...r.querySelectorAll('#enMach .ap2')].filter(shown).length; if (ZOOM === 1 && n < 2) out.push(`Big consumers shows ${n} appliance rows at normal text, room for 2`); }
  const sc = [...r.querySelectorAll('#enToday *')].find((e) => shown(e) && e.children.length === 0 && /0\.97/.test(e.textContent));
  if (!sc) out.push('the standing charge (0.97) is not shown on the Today card');
  else if (sc.scrollWidth > sc.clientWidth + 1 || sc.scrollHeight > sc.clientHeight + 1) out.push(`the standing charge "${sc.textContent}" is cut`);
  if (ZOOM === 1) r.querySelectorAll('#enTg .tl small').forEach((s) => { const t = s.closest('.tl'), cs = getComputedStyle(t), inner = R(t).right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth), sp = s.querySelector('span');
    if (sp.scrollWidth > sp.clientWidth + 1 || R(sp).right > inner + TOL) out.push(`Today label "${sp.textContent}" does not fit its tile`); });
  return out;
};

async function open(W, H, ZOOM, extra) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: new Date(2026, 9, 27, 8, 12, 0) });
  await page.setContent('<!doctype html><html><body style="margin:0;background:#2a2420"><oriel-shell style="display:block;width:100%"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: () => Promise.resolve(), callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
  }, { cfg, st: Object.assign(mkStates(), TODAY_STATES, extra || {}), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.clock.runFor(1500); await page.waitForTimeout(500);
  if (MINF) await page.evaluate((m) => { const r = document.querySelector('oriel-shell').shadowRoot, els = [...r.querySelectorAll('#screen *')].map((e) => [e, parseFloat(getComputedStyle(e).fontSize)]); els.forEach(([e, px]) => { if (px && px < m && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) e.style.setProperty('font-size', m + 'px', 'important'); }); }, MINF);
  if (ZOOM !== 1) await page.evaluate((z) => { const r = document.querySelector('oriel-shell').shadowRoot, els = [...r.querySelectorAll('#screen *')].map((e) => [e, parseFloat(getComputedStyle(e).fontSize)]); els.forEach(([e, px]) => { if (px) e.style.setProperty('font-size', px * z + 'px', 'important'); }); }, ZOOM); /* each element's own size, once (not compounded) */
  await page.evaluate(() => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.querySelector('oriel-shell').shadowRoot.appendChild(st); });
  return { page, errors };
}

for (const ZOOM of ZOOMS) for (const [W, H] of SIZES) {
  const { page, errors } = await open(W, H, ZOOM);
  for (const key of PAGES) {
    await page.evaluate((k) => document.querySelector('oriel-shell')._setPage(k), key); await page.clock.runFor(1200); await page.waitForTimeout(400);
    const bad = await page.evaluate(SCAN, key);
    if (key === 'system') { /* the Update chip (updates are waiting in the mock) and the Auto rotate row are on the page and are inside what was scanned */
      const here = await page.evaluate(() => { const r = document.querySelector('oriel-shell').shadowRoot, u = r.getElementById('syUpBtn'), a = r.getElementById('syBtnA'); return { chip: !!u && u.getClientRects().length > 0, row: !!a && a.getClientRects().length > 0, rowH: a ? a.getBoundingClientRect().height : 0 }; });
      check(`${W}x${H} text x${ZOOM} system: the Update chip and the Auto rotate row are there`, here.chip && here.row, JSON.stringify(here));
    }
    if (key === 'energy') { const lay = await page.evaluate(EN_LAYOUT, ZOOM); check(`${W}x${H} text x${ZOOM} energy: no cards overlap, Big consumers rows inside, standing charge in full${ZOOM === 1 ? ', Today labels in full' : ''}`, lay.length === 0, lay.join(' | ')); }
    check(`${W}x${H} text x${ZOOM} ${key}: no text outside its box, nothing clipped`, bad.length === 0, bad.slice(0, LIST ? 99 : 6).map((o) => `${o.kind} "${o.text}" (${o.el} in ${o.box}) by ${o.by}px at the ${o.side}`).join(' | '));
  }
  check(`${W}x${H} text x${ZOOM}: no page errors`, errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
results.forEach((r) => console.log(r[0], r[1], r[2] ? '  ' + r[2] : ''));
const f = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - f} passed, ${f} failed`);
process.exit(f ? 1 : 0);
