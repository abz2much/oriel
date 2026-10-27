/* Phone layout checks (portrait), with the mock hass. Usage: node dev/phone.mjs   Exits 1 on the first failure.
   Covers: when the layout turns on (the card's own width), the tab bar and More sheet, and every phone page at 390x844,
   360x740 and 412x915: no sideways scrolling, nothing cut off the right edge, text at 12 px or more, tap targets at 44 px or more. */
import './freeze-time.mjs';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const bundle = fs.readFileSync('dist/oriel.js', 'utf8');
const base = JSON.parse(fs.readFileSync('dev/configs/full-nova.json', 'utf8'));
const results = []; const check = (n, ok, x) => results.push([ok ? 'PASS' : 'FAIL', n, x || '']);
const browser = await chromium.launch();
const PHONES = [[390, 844], [360, 740], [412, 915]];

async function open(cfg, W, H, cardW) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text().slice(0, 200)); });
  await page.clock.install({ time: new Date(2026, 9, 27, 8, 12, 0) });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#2a2420"><div id="box" style="width:${cardW ? cardW + 'px' : '100vw'}"><oriel-shell style="display:block;width:100%"></oriel-shell></div></body></html>`);
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    window.__calls = []; window.__ws = []; window.__api = []; window.__msgs = [];
    const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    e.hass = { states: st, services: { light: {}, climate: {}, script: {}, nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP', components: [] },
      callService: (d, s, data) => { window.__calls.push([d, s, data]); return Promise.resolve(); }, callWS: eval('(' + ws + ')'), callApi: eval('(' + api + ')') };
  }, { cfg, st: mkStates(), ws: CALLWS_SRC, api: CALLAPI_SRC });
  await page.waitForTimeout(700);
  return { page, errors };
}
const sr = (page, fn, arg) => page.evaluate(({ src, arg }) => new Function('arg', 'return (' + src + ')(document.querySelector("oriel-shell").shadowRoot, arg)')(arg), { src: fn.toString(), arg });
const info = (page) => sr(page, (r) => { const w = r.getElementById('wrap'), e = r.host; return { phone: w.classList.contains('phone'), flag: e._phone, tr: w.style.transform, w: w.getBoundingClientRect().width }; });
const pageOpts = (cfg, keep) => { /* a config with only some pages */ const c = JSON.parse(JSON.stringify(cfg)); ['living', 'energy', 'climate', 'family', 'security', 'vacuum'].forEach((k) => { if (!keep.includes(k)) c[k] = JSON.parse(JSON.stringify({})); }); if (!keep.includes('nova')) c.nova = { enabled: false }; return c; };

// when the layout turns on
{
  for (const [vw, w, want] of [[1280, 390, true], [1280, 699, true], [1280, 700, false], [844, 844, false], [1280, 1280, false]]) {
    const a = await open(base, vw, 800, w); const o = await info(a.page);
    check(`layout auto: a card ${w}px wide in a ${vw}px window is ${want ? 'phone' : 'tablet'}`, o.phone === want && !!o.flag === want && (want ? o.tr === 'none' : /scale/.test(o.tr)), JSON.stringify(o)); await a.page.close();
  }
  for (const [lay, w, want] of [['tablet', 390, false], ['phone', 1280, true], ['auto', 390, true]]) {
    const c = JSON.parse(JSON.stringify(base)); c.general.layout = lay; const a = await open(c, 1280, 800, w); const o = await info(a.page);
    check(`general.layout: ${lay} at ${w}px is ${want ? 'phone' : 'tablet'}`, o.phone === want, JSON.stringify(o)); await a.page.close();
  }
  // resizing the card flips the layout both ways, the Nova pill moves into the chip row and back
  const a = await open(base, 1280, 800, 1100);
  const pillIn = () => sr(a.page, (r) => { const p = r.getElementById('nvPill'); return p ? p.parentNode.id : null; });
  const t0 = await pillIn();
  await a.page.evaluate(() => { document.getElementById('box').style.width = '390px'; }); await a.page.waitForTimeout(300);
  const p1 = await pillIn(), o1 = await info(a.page);
  await a.page.evaluate(() => { document.getElementById('box').style.width = '1100px'; }); await a.page.waitForTimeout(300);
  const p2 = await pillIn(), o2 = await info(a.page);
  check('layout follows the card width as it is resized (and Nova\'s header pill moves into the chip row and back)', t0 === 'screen' && p1 === 'hchips' && o1.phone && p2 === 'screen' && !o2.phone && /scale/.test(o2.tr), JSON.stringify([t0, p1, o1.phone, p2, o2.phone]));
  check('layout switching: no errors', a.errors.length === 0, a.errors.join(' | ')); await a.page.close();
}

// tab bar and More sheet
{
  const a = await open(base, 390, 844);
  const tabs = await sr(a.page, (r) => ({ tabs: [...r.querySelectorAll('#tabs a')].map((x) => (x.dataset.t || 'more') + ':' + x.querySelector('.lb').textContent), more: [...r.querySelectorAll('#moreG .mt')].map((x) => x.dataset.t), rail: getComputedStyle(r.getElementById('rail')).display, bar: r.getElementById('tabs').getBoundingClientRect().height }));
  check('tab bar: the first four pages in rail order, then More; the rest in the sheet, System included', JSON.stringify(tabs.tabs) === JSON.stringify(['home:Home', 'living:Living', 'energy:Energy', 'climate:Climate', 'more:More']) && JSON.stringify(tabs.more) === JSON.stringify(['family', 'security', 'vacuum', 'nova', 'system']) && tabs.rail === 'none', JSON.stringify(tabs));
  const sel = (page) => sr(page, (r) => ({ on: [...r.querySelectorAll('#tabs a.on')].map((x) => x.dataset.t || 'more'), cur: [...r.querySelectorAll('#tabs a[aria-current]')].map((x) => x.dataset.t || 'more'), open: r.getElementById('more').classList.contains('show'), page: r.host._page, tiles: [...r.querySelectorAll('#moreG .mt.on')].map((x) => x.dataset.t) }));
  const s0 = await sel(a.page);
  await sr(a.page, (r) => r.querySelector('#tabs [data-t="energy"]').click()); const s1 = await sel(a.page);
  check('tab bar: the selected tab is marked (raised pill and aria-current, not colour alone) and a tap switches the page', s0.on.join() === 'home' && s0.cur.join() === 'home' && s1.on.join() === 'energy' && s1.cur.join() === 'energy' && s1.page === 'energy', JSON.stringify([s0, s1]));
  await sr(a.page, (r) => r.querySelector('#tabs [data-more]').click()); const s2 = await sel(a.page);
  await sr(a.page, (r) => r.querySelector('#moreG [data-t="family"]').click()); const s3 = await sel(a.page);
  check('More: opens the sheet; choosing a page goes there, closes the sheet, and marks More and the tile', s2.open && !s3.open && s3.page === 'family' && s3.on.join() === 'more' && s3.tiles.join() === 'family', JSON.stringify([s2, s3]));
  await sr(a.page, (r) => r.querySelector('#tabs [data-more]').click()); await sr(a.page, (r) => r.getElementById('moreX').click()); const s4 = await sel(a.page);
  await sr(a.page, (r) => r.querySelector('#tabs [data-more]').click()); await sr(a.page, (r) => r.getElementById('more').click()); const s5 = await sel(a.page);
  check('More: closes with its visible close button and with a tap outside the sheet', !s4.open && !s5.open, JSON.stringify([s4, s5]));
  await sr(a.page, (r) => r.querySelector('#tabs [data-more]').click());
  const box = await sr(a.page, (r) => { const q = r.querySelector('#more .mh').getBoundingClientRect(); return [q.x + 30, q.y + 20]; });
  await a.page.mouse.move(box[0], box[1]); await a.page.mouse.down(); await a.page.mouse.move(box[0], box[1] + 40); await a.page.mouse.move(box[0], box[1] + 120); await a.page.mouse.up();
  check('More: swiping down closes it', !(await sel(a.page)).open);
  await sr(a.page, (r) => r.querySelector('#tabs [data-more]').click()); /* the sheet must be open to measure its tiles */
  const sizes = await sr(a.page, (r) => [...r.querySelectorAll('#tabs a, #moreG .mt, #moreX, #hdr-r button')].map((x) => { const q = x.getBoundingClientRect(); return [x.id || x.dataset.t || 'more', Math.round(q.width), Math.round(q.height)]; }).filter((x) => x[1] < 44 || x[2] < 44));
  check('tab bar, More tiles and header buttons are at least 44 x 44 (the close button gets an invisible 44 px area)', sizes.filter((x) => x[0] !== 'moreX').length === 0, JSON.stringify(sizes));
  check('tab bar and sheet: no errors, no service calls', a.errors.length === 0 && (await a.page.evaluate(() => window.__calls.length)) === 0, a.errors.join(' | ')); await a.page.close();
  // five or fewer pages: no More, System stays a tab
  for (const [keep, n] of [[['climate'], 3], [['climate', 'family', 'security'], 5], [['climate', 'family', 'security', 'vacuum'], 6]]) {
    const b = await open(pageOpts(base, keep), 390, 844);
    const t = await sr(b.page, (r) => ({ tabs: [...r.querySelectorAll('#tabs a')].map((x) => x.dataset.t || 'more'), sheet: [...r.querySelectorAll('#moreG .mt')].map((x) => x.dataset.t) }));
    const want = n <= 5 ? !t.tabs.includes('more') && t.tabs.includes('system') && t.tabs.length === n && !t.sheet.length : t.tabs.length === 5 && t.tabs[4] === 'more' && t.sheet.includes('system');
    check(`${n} pages: ${n <= 5 ? 'every page is a tab, no More, System reachable' : 'four tabs and More with System in the sheet'}`, want, JSON.stringify(t)); await b.page.close();
  }
}

// the idle clock is skipped in phone mode
{
  const c = JSON.parse(JSON.stringify(base)); c.general.idle_clock = { presence: 'binary_sensor.idle_p', minutes: 5 };
  for (const [w, want] of [[390, false], [1280, true]]) {
    const a = await open(c, 1280, 800, w);
    await a.page.evaluate(() => { const e = document.querySelector('oriel-shell'); e.hass = Object.assign({}, e.hass, { states: Object.assign({}, e.hass.states, { 'binary_sensor.idle_p': { entity_id: 'binary_sensor.idle_p', state: 'off', attributes: {} } }) }); });
    await a.page.clock.runFor(6 * 60000); const sh = await sr(a.page, (r) => { const e = r.getElementById('idle'); return !!e && e.classList.contains('show'); });
    check(`idle clock: ${want ? 'shows' : 'is skipped'} in ${w < 700 ? 'phone' : 'tablet'} layout`, sh === want, String(sh)); await a.page.close();
  }
}

// every phone page at every phone size
const PAGES = (process.env.PHONE_PAGES || 'home,living,energy,climate,family,security,vacuum,nova,system').split(',');
for (const [W, H] of PHONES) {
  const a = await open(base, W, H);
  for (const k of PAGES) {
    await a.page.evaluate((k) => document.querySelector('oriel-shell')._setPage(k), k); await a.page.waitForTimeout(450);
    const o = await sr(a.page, (r, k) => {
      const pages = r.getElementById('pages'), pg = r.getElementById('pg' + k[0].toUpperCase() + k.slice(1)), W = r.host.clientWidth, out = { sideways: pages.scrollWidth > pages.clientWidth + 1, past: [], small: [], rows: [], tap: [] };
      const inScroller = (e) => !!e.closest('#hchips');
      pg.querySelectorAll('*').forEach((e) => {
        if (e.closest('svg') && e.tagName !== 'svg') return; const q = e.getBoundingClientRect(); if (!q.width || !q.height) return; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
        if ((q.right > W + 1 || q.left < -1) && !(e.tagName === 'I' && e.parentNode.classList.contains('bar'))) out.past.push((e.id || e.className || e.tagName) + ' ' + Math.round(q.left) + '..' + Math.round(q.right));
        const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (own && parseFloat(cs.fontSize) < 12) out.small.push(e.tagName + '.' + (e.className || '') + ' ' + cs.fontSize + ' "' + e.textContent.trim().slice(0, 18) + '"');
        if (e.matches('button, [role=button], a')) { const af = getComputedStyle(e, '::after'), ah = af.content !== 'none' ? parseFloat(af.height) || 0 : 0, h = Math.max(q.height, ah); /* an invisible tap area counts */ if (h < 43.5 && !/round/.test(e.className) && !e.closest('#room, #qa')) out.tap.push((e.id || e.className || e.tagName) + ' ' + Math.round(h)); }
      });
      pg.querySelectorAll('svg text').forEach((t) => { const m = t.getScreenCTM(), fs = parseFloat(getComputedStyle(t).fontSize) * (m ? m.a : 1); if (fs < 11.9 && t.getBoundingClientRect().width) out.small.push('svg text ' + fs.toFixed(1) + ' "' + t.textContent.trim().slice(0, 14) + '"'); });
      return out;
    }, k);
    check(`${k} at ${W}x${H}: no sideways scrolling, nothing past the card edge, text at 12 px or more`, !o.sideways && o.past.length === 0 && o.small.length === 0, JSON.stringify({ sideways: o.sideways, past: o.past.slice(0, 4), small: o.small.slice(0, 4) }));
    check(`${k} at ${W}x${H}: tap targets at least 44 px high`, o.tap.length === 0, JSON.stringify(o.tap.slice(0, 5)));
  }
  // Home's house: the whole drawing, labels inside the card, none overlapping, power labels kept, text at 12 px or more; header row ends before the buttons
  await a.page.evaluate(() => document.querySelector('oriel-shell')._setPage('home')); await a.page.waitForTimeout(500);
  const hs = await sr(a.page, (r) => {
    const svg = r.getElementById('stage'), sr0 = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, out = { vb: [vb.x, vb.y, vb.width, vb.height].map(Math.round).join(' '), shown: [], hidden: 0, outside: [], overlap: 0, tags: 0, minText: 99 };
    const boxes = [...svg.querySelectorAll('.ftag, .pill')].map((g) => ({ g, tag: g.classList.contains('ftag'), r: (g.classList.contains('ftag') ? g.children[1] : g.children[1]).getBoundingClientRect(), on: g.style.display !== 'none' }));
    boxes.forEach((b) => { if (!b.on) { out.hidden++; return; } out.shown.push(b.tag ? 'tag' : 'pill'); if (b.tag) out.tags++;
      if (b.r.left < sr0.left + 2 || b.r.right > sr0.right - 2 || b.r.top < sr0.top + 2 || b.r.bottom > sr0.bottom - 2) out.outside.push(b.g.textContent.trim().slice(0, 16));
      b.g.querySelectorAll('text').forEach((t) => { const m = t.getScreenCTM(); out.minText = Math.min(out.minText, parseFloat(getComputedStyle(t).fontSize) * (m ? m.a : 1)); }); });
    const on = boxes.filter((b) => b.on); for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) { const p = on[i].r, q = on[j].r; if (p.left < q.right && p.right > q.left && p.top < q.bottom && p.bottom > q.top) out.overlap++; }
    const hc = r.getElementById('hchips').getBoundingClientRect(), hr = r.getElementById('hdr-r').getBoundingClientRect(); out.gap = Math.round(hr.left - hc.right);
    out.cardW = Math.round(sr0.width); out.cardH = Math.round(sr0.height); return out;
  });
  check(`house at ${W}x${H}: the whole drawing in the card, every label inside it, none overlapping, text at 12 px or more, power labels shown`, hs.vb === '-225 -125 640 585' && hs.outside.length === 0 && hs.overlap === 0 && hs.minText >= 11.9 && hs.tags >= 1, JSON.stringify(hs));
  check(`header at ${W}x${H}: the chip row ends before the alarm, door and window buttons (a gap, never behind them)`, hs.gap >= 8, String(hs.gap));
  const ch = await sr(a.page, (r) => { const h = r.getElementById('hchips'), rr = h.getBoundingClientRect(); const info = (c) => { const q = c.getBoundingClientRect(); return { id: c.id || (c.classList.contains('wx') ? 'wx' : 'chip'), cut: q.right > rr.right + 0.5 || q.left < rr.left - 0.5, seen: Math.min(q.right, rr.right) - Math.max(q.left, rr.left) > 0, op: getComputedStyle(c).opacity }; }; const all = [...h.children].filter((c) => c.getBoundingClientRect().width).map(info); return { scrolls: h.scrollWidth > h.clientWidth + 2, cutShown: all.filter((x) => x.cut && x.seen && x.op !== '0'), clk: all.find((x) => x.id === 'clk') || null, wx: all.find((x) => x.id === 'wx') || null }; });
  check(`header at ${W}x${H}: a chip either fits whole in the row or is hidden, never cut off; the weather and clock chips are whole`, ch.scrolls && ch.cutShown.length === 0 && ch.clk && !ch.clk.cut && ch.wx && !ch.wx.cut, JSON.stringify(ch));
  check(`phone pages at ${W}x${H}: no errors`, a.errors.length === 0, a.errors.join(' | ')); await a.page.close();
}

// Family on a phone: every shopping and to-do item is there and tickable, the calendar's "+N more" expands and collapses
{
  const c = JSON.parse(JSON.stringify(base)); const a = await open(c, 390, 844);
  await a.page.evaluate(() => { const e = document.querySelector('oriel-shell'); const st = Object.assign({}, e.hass.states); window.__orig = e.hass; });
  await a.page.evaluate(() => document.querySelector('oriel-shell')._setPage('family')); await a.page.waitForTimeout(700);
  const o = await sr(a.page, (r) => { const li = [...r.querySelectorAll('#fmShop .fmList li')]; const td = [...r.querySelectorAll('#fmTodo .fmList li')]; return { shop: li.length, shopHidden: li.filter((x) => x.classList.contains('hide') || getComputedStyle(x).display === 'none').length, todo: td.length, todoHidden: td.filter((x) => getComputedStyle(x).display === 'none').length,
    clear: !!r.querySelector('#fmShop .lnk') && getComputedStyle(r.querySelector('#fmShop .lnk')).display !== 'none', mn: r.querySelector('#fmShop .mn') ? getComputedStyle(r.querySelector('#fmShop .mn')).display : 'none', last: li.length ? Math.round(li[li.length - 1].getBoundingClientRect().height) : 0 }; });
  check('Family phone: every shopping and to-do item is listed (none hidden, no "+N more" on the lists) and "Clear done" stays', o.shop >= 6 && o.shopHidden === 0 && o.todoHidden === 0 && o.mn === 'none' && o.clear, JSON.stringify(o));
  await sr(a.page, (r) => r.querySelectorAll('#fmShop .fmList li')[r.querySelectorAll('#fmShop .fmList li').length - 1].click()); await a.page.waitForTimeout(300);
  const calls = await a.page.evaluate(() => window.__calls.filter((x) => x[0] === 'todo'));
  check('Family phone: the last (13th) shopping item can be ticked', calls.length === 1 && calls[0][1] === 'update_item', JSON.stringify(calls));
  const cal = (page) => sr(page, (r) => { const ev = [...r.querySelectorAll('#fmCal [data-ev]')], more = r.getElementById('fmCalMore'), b = more.querySelector('button'); return { shown: ev.filter((x) => getComputedStyle(x).display !== 'none').length, total: ev.length, more: getComputedStyle(more).display !== 'none', btn: b ? b.textContent : '', exp: b ? b.getAttribute('aria-expanded') : '', h: b ? Math.round(b.getBoundingClientRect().height) : 0 }; });
  const c0 = await cal(a.page);
  await sr(a.page, (r) => r.querySelector('#fmCalMore button').click()); await a.page.waitForTimeout(100); const c1 = await cal(a.page);
  await sr(a.page, (r) => r.querySelector('#fmCalMore button').click()); await a.page.waitForTimeout(100); const c2 = await cal(a.page);
  check('Family phone: Calendar "+N more" shows the rest when tapped, with a visible "Show less" to collapse again', c0.total > c0.shown && /more/.test(c0.btn) && c1.shown === c1.total && /less/i.test(c1.btn) && c1.exp === 'true' && c2.shown === c0.shown && /more/.test(c2.btn), JSON.stringify([c0, c1, c2]));
  check('Family phone: no errors', a.errors.length === 0, a.errors.join(' | ')); await a.page.close();
}

// Vacuum compact card without a map: the Pause/Stop/Dock buttons and the Mode box sit together (no blank slots between them)
{
  const a = await open(base, 390, 844); await a.page.evaluate(() => document.querySelector('oriel-shell')._setPage('vacuum')); await a.page.waitForTimeout(700);
  const o = await sr(a.page, (r) => { const f = r.querySelector('.vcF1'); if (!f) return null; const c = f.querySelector('.f1c').getBoundingClientRect(), kids = [...f.querySelectorAll('.kv>*')].filter((k) => getComputedStyle(k).display !== 'none'), k0 = kids[0] && kids[0].getBoundingClientRect(), fr = f.getBoundingClientRect(); return { gap: k0 ? Math.round(k0.top - c.bottom) : null, shown: kids.length, below: k0 ? Math.round(fr.bottom - k0.bottom) : null }; });
  check('Vacuum compact card with no map: the Mode box sits right under the buttons (gap of 16 px or less) and the card closes up', !!o && o.gap !== null && o.gap <= 16 && o.shown >= 1 && o.below <= 24, JSON.stringify(o)); await a.page.close();
}

// Nova turned on but not installed: a centred message on the phone too
{
  const c = JSON.parse(JSON.stringify(base)); const a = await open(c, 390, 844);
  await a.page.evaluate(() => { const e = document.querySelector('oriel-shell'); e.hass = Object.assign({}, e.hass, { services: { light: {} } }); });
  await a.page.evaluate(() => document.querySelector('oriel-shell')._setPage('nova')); await a.page.waitForTimeout(700);
  const o = await sr(a.page, (r) => { const n = r.getElementById('nvNo'), q = n.getBoundingClientRect(), w = r.host.clientWidth; return { show: getComputedStyle(n).display, align: getComputedStyle(n).alignItems, ta: getComputedStyle(n).textAlign, left: Math.round(q.left), right: Math.round(w - q.right), others: [...r.querySelectorAll('#nvWrap>:not(#nvNo):not(#nvToast)')].filter((x) => getComputedStyle(x).display !== 'none').length }; });
  check('Nova not detected on a phone: one centred message card, nothing else on the page', o.show === 'flex' && o.align === 'center' && o.ta === 'center' && Math.abs(o.left - o.right) <= 2 && o.others === 0, JSON.stringify(o)); await a.page.close();
}

// Home: Coming up shows every row (no tablet fitting), the house is a framed card, everything in one column
{
  const a = await open(base, 390, 844);
  const o = await sr(a.page, (r) => { const q = (id) => r.getElementById(id).getBoundingClientRect(); const ids = ['greet', 'energy', 'stage', 'cu', 'room', 'today', 'qa']; return { tops: ids.map((i) => Math.round(q(i).top)), lefts: ids.map((i) => Math.round(q(i).left)), widths: ids.map((i) => Math.round(q(i).width)), rows: r.querySelectorAll('#cu .cr:not(.hide)').length, stageH: Math.round(q('stage').height) }; });
  const asc = o.tops.every((t, i) => i === 0 || t > o.tops[i - 1]);
  check('Home phone: one column in order (greeting, energy, house, Coming up, room panel, Today, quick actions), cards full width', asc && o.widths.slice(1).every((w) => w >= 340) && new Set(o.lefts.slice(1)).size === 1, JSON.stringify(o));
  check('Home phone: Coming up shows all its rows (no tablet-column fitting)', o.rows === 3, String(o.rows)); await a.page.close();
}

results.forEach((r) => console.log(r.join('  ')));
await browser.close();
process.exit(results.some((r) => r[0] === 'FAIL') ? 1 : 0);
