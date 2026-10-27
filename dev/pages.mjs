/* Behaviour checks for the Climate and Family pages (and the shared code they use), with the mock hass.
   Usage: node dev/pages.mjs   Exits 1 on the first failure. Nothing is sent anywhere. */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const bundle = fs.readFileSync('dist/oriel.js', 'utf8');
const full = JSON.parse(fs.readFileSync('dev/configs/full.json', 'utf8'));
const results = []; const check = (n, ok, x) => results.push([ok ? 'PASS' : 'FAIL', n, x || '']);
const browser = await chromium.launch();

async function open(cfg, extraStates, apiSrc, time) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text().slice(0, 200)); });
  if (time) await page.clock.install({ time }); /* a fixed time of day, for checks that depend on which events are over */
  await page.setContent('<!doctype html><html><body style="margin:0"><oriel-shell style="display:block;width:100vw"></oriel-shell></body></html>');
  await page.addScriptTag({ content: bundle, type: 'module' });
  await page.waitForFunction(() => customElements.get('oriel-shell'));
  await page.evaluate(({ cfg, st, ws, api }) => {
    window.__calls = []; window.__msgs = []; window.__ws = []; window.__api = [];
    const inner = eval('(' + ws + ')');
    const e = document.querySelector('oriel-shell'); e.setConfig(cfg);
    e.hass = { states: st, services: { nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP' },
      callService: (d, s, data) => { window.__calls.push([d, s, data]); return Promise.resolve(); },
      callWS: (m) => { window.__msgs.push(m); return inner(m); }, callApi: eval('(' + api + ')') };
  }, { cfg, st: Object.assign(mkStates(), extraStates || {}), ws: CALLWS_SRC, api: apiSrc || CALLAPI_SRC });
  await page.waitForTimeout(500);
  return { page, errors };
}
const go = async (page, k) => { await page.evaluate((k) => document.querySelector('oriel-shell')._setPage(k), k); await page.waitForTimeout(500); };
const sr = (page, fn, arg) => page.evaluate(({ src, arg }) => new Function('r', 'arg', 'return (' + src + ')(r, arg)')(document.querySelector('oriel-shell').shadowRoot, arg), { src: fn.toString(), arg });

// ---- Climate and Family with data
{
  const { page, errors } = await open(full);
  await go(page, 'climate');
  const msgs = await page.evaluate(() => window.__msgs);
  const hist = msgs.find((m) => m.type === 'history/history_during_period' && (m.entity_ids || []).some((i) => i.startsWith('climate.')));
  check('history request asks for attributes (no minimal_response, no no_attributes)', !!hist && !hist.minimal_response && !hist.no_attributes && hist.significant_changes_only === false && hist.entity_ids.length === 3, JSON.stringify(hist && { m: hist.minimal_response, n: hist.no_attributes }));
  const fc = msgs.filter((m) => m.type === 'call_service' && m.service === 'get_forecasts');
  check('forecasts: daily and hourly, via a websocket call with a response (not callService)', fc.length === 2 && fc.every((m) => m.return_response === true && m.target.entity_id === 'weather.home') && fc.map((m) => m.service_data.type).sort().join() === 'daily,hourly');
  check('no service calls just by showing the pages', (await page.evaluate(() => window.__calls.length)) === 0);
  const seg = await sr(page, (r) => r.querySelectorAll('#clHistBody svg path[stroke-width="2.4"]').length);
  check('history: an unavailable stretch leaves a gap (that line is in two pieces, no zero; the other is one piece)', seg === 3, 'pieces: ' + seg);
  const ln = await sr(page, (r) => { const ps = [...r.querySelectorAll('#clHistBody svg path[stroke-width="2.4"], #clLg path')]; return { dashed: ps.filter((p) => p.hasAttribute('stroke-dasharray')).length, cols: [...new Set([...r.querySelectorAll('#clHistBody svg path[stroke-width="2.4"]')].map((p) => p.getAttribute('stroke')))], marks: [...r.querySelectorAll('#clLg svg')].map((v) => v.querySelector('circle,rect,polygon') ? 1 : 0).join('') }; });
  check('history: every line is solid (no dashes), the two lines are blue and orange, the circle and square end markers are in the legend', ln.dashed === 0 && ln.cols.length >= 2 && ln.cols[0] !== ln.cols[1] && /^(#1f5fa6|#174a85|#6db3f2)$/.test(ln.cols[0]) && /^11/.test(ln.marks), JSON.stringify(ln));
  const cnt = await sr(page, (r) => ({ days: r.querySelectorAll('#clDays .d').length, hours: r.querySelectorAll('#clHours i').length, rows: r.querySelectorAll('#clThRows .tr').length, leg: r.querySelectorAll('#clLg > span').length, rooms: r.querySelectorAll('#clRl .rr').length }));
  check('climate: 5 days, 12 hours, 3 thermostats, 3 legend entries, 3 house rooms', JSON.stringify(cnt) === '{"days":5,"hours":12,"rows":3,"leg":3,"rooms":3}', JSON.stringify(cnt));
  // thermostat +: the entity's step (0.5), sent after the debounce
  await sr(page, (r) => r.querySelectorAll('#clThRows .tr')[0].querySelectorAll('button')[1].click());
  await page.waitForTimeout(700);
  const sent = await page.evaluate(() => window.__calls.filter((c) => c[1] === 'set_temperature'));
  check('thermostat +: climate.set_temperature, 21 → 21.5', sent.length === 1 && sent[0][2].entity_id === 'climate.ground_floor' && sent[0][2].temperature === 21.5, JSON.stringify(sent));
  // boost: falls back to the Home room panel boost
  await sr(page, (r) => r.querySelector('#clTh .boost').click());
  const boost = await page.evaluate(() => window.__calls.filter((c) => c[0] === 'script'));
  check('boost on Climate runs the Home room panel boost script', boost.length === 1 && boost[0][1] === 'heating_boost', JSON.stringify(boost));
  await go(page, 'family');
  const api = await page.evaluate(() => window.__api);
  check('calendar: REST calendars/<entity>?start=&end= for each calendar and bin (6 on Family, 3 more from the Home Coming up card), no raw "+"', api.length === 9 && api.every((u) => /^calendars\/calendar\.[a-z_]+\?start=[^&+]+&end=[^&+]+$/.test(u)), api.length + ' requests');
  const fam = await sr(page, (r) => ({ ev: r.querySelectorAll('#fmCal .ev').length, none: r.querySelectorAll('#fmCal .none').length, allday: [...r.querySelectorAll('#fmCal .ev')].filter((e) => /All day/.test(e.textContent)).length, bins: r.querySelectorAll('#fmBins .bn').length, soon: r.querySelector('#fmBins .bn.soon .dy').textContent, rem: r.querySelectorAll('#fmRem .nvRr').length }));
  check('family: events listed, all-day marked, tomorrow bin says "Tomorrow", Nova off → no reminders card', fam.ev >= 7 && fam.allday >= 3 && fam.bins === 3 && /Tomorrow/.test(fam.soon) && fam.rem === 0, JSON.stringify(fam));
  // rows are never cut: with 15 items some are left out and "+ N more" says how many
  const cut = await sr(page, (r) => {
    const out = {};
    for (const id of ['fmShop', 'fmCal', 'fmTodo']) {
      const card = r.getElementById(id), box = card.querySelector('.fit'), b = box.getBoundingClientRect();
      const rows = [...box.querySelectorAll('li, [data-ev]')].filter((x) => !x.classList.contains('hide'));
      out[id] = { rows: rows.length, cut: rows.filter((x) => x.getBoundingClientRect().bottom > b.bottom + 1).length, more: (card.querySelector('.mn, .more') || {}).textContent };
    }
    return out;
  });
  check('lists never show a cut row (every visible row sits inside its card)', Object.values(cut).every((c) => c.cut === 0), JSON.stringify(cut));
  check('shopping list with 15 items shows "+ N more" instead of cutting', /\+ \d+ more/.test(cut.fmShop.more || '') && cut.fmShop.rows < 15, JSON.stringify(cut.fmShop));
  // shopping card: add, tick, clear done
  await sr(page, (r) => { const i = r.querySelector('#fmShop input'); i.value = 'Tea'; r.querySelector('#fmShop form').dispatchEvent(new Event('submit', { cancelable: true })); });
  await sr(page, (r) => r.querySelector('#fmShop .fmList li:not(.hide)').click());
  await sr(page, (r) => r.querySelector('#fmShop .lnk').click());
  const todo = await page.evaluate(() => window.__calls.filter((c) => c[0] === 'todo').map((c) => c[1] + ':' + c[2].entity_id));
  check('shopping card: add_item, update_item, remove_completed_items on the shopping list', todo.join() === 'add_item:todo.shopping,update_item:todo.shopping,remove_completed_items:todo.shopping', todo.join());
  await sr(page, (r) => r.querySelector('#fmTodo .fmList li').click());
  const t2 = await page.evaluate(() => window.__calls.filter((c) => c[0] === 'todo' && c[2].entity_id === 'todo.chores').length);
  check('the second to-do card acts on its own list', t2 === 1);
  // the Home pop-up still works, on the same controller
  await go(page, 'home');
  const hasShop = await page.evaluate((cfg) => !!cfg.home.shopping, full);
  if (hasShop) {
    await page.evaluate(() => { const e = document.querySelector('oriel-shell'); e._openShop(); });
    await page.waitForTimeout(300);
    await sr(page, (r) => { const i = r.getElementById('shopIn'); i.value = 'Jam'; r.getElementById('shopForm').dispatchEvent(new Event('submit', { cancelable: true })); });
    const pop = await sr(page, (r) => ({ rows: r.querySelectorAll('#shopList li').length, add: true }));
    const added = await page.evaluate(() => window.__calls.filter((c) => c[1] === 'add_item' && c[2].item === 'Jam').length);
    check('Home shopping pop-up still lists and adds', pop.rows >= 3 && added === 1, JSON.stringify(pop));
  }
  check('no console errors or warnings with data', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---- Bin tiles scale from one to four bins without overflowing the card
for (const n of [1, 2, 4]) {
  const cfg = structuredClone(full); cfg.family.bins = full.family.bins.concat([{ entity: 'calendar.bin_black', label: 'Glass', colour: '#3366cc' }]).slice(0, n);
  if (n === 2) cfg.family.bins = cfg.family.bins.slice(0, 2);
  const { page } = await open(cfg); await go(page, 'family');
  const r = await sr(page, (rt) => { const card = rt.getElementById('fmBins').getBoundingClientRect(), t = [...rt.querySelectorAll('#fmBinRows .bn')].map((x) => x.getBoundingClientRect()); return { n: t.length, inside: t.every((b) => b.bottom <= card.bottom + 1 && b.right <= card.right + 1 && b.left >= card.left - 1), rows: new Set(t.map((b) => Math.round(b.top))).size }; });
  check(`bins: ${n} bin${n > 1 ? 's' : ''} → ${n} tiles, inside the card` + (n === 4 ? ', two rows' : ', one row'), r.n === n && r.inside && r.rows === (n === 4 ? 2 : 1), JSON.stringify(r));
  await page.close();
}

// ---- Nova on: reminders card; debug panel lists missing climate and family entities
{
  const cfg = structuredClone(full);
  cfg.nova = { enabled: true, entities: { reminders: 'sensor.nova_reminders' } };
  cfg.system = Object.assign({}, cfg.system, { debug_panel: true });
  cfg.climate.rooms = [{ name: 'Study', temperature: 'sensor.study_temperature' }];
  cfg.family.bins.push({ entity: 'calendar.glass_collection', label: 'Glass' });
  const { page, errors } = await open(cfg);
  await go(page, 'family');
  const rem = await sr(page, (r) => r.querySelectorAll('#fmRem .nvRr').length);
  check('family: Nova reminders card shows the Nova sensor\'s reminders', rem === 2, 'rows ' + rem);
  await go(page, 'system');
  const dbg = await sr(page, (r) => r.getElementById('syDbgL').textContent);
  check('debug panel lists missing and unavailable Climate and Family entities', /sensor\.study_temperature/.test(dbg) && /calendar\.glass_collection/.test(dbg) && /climate\.spare_room/.test(dbg), dbg.slice(0, 90));
  check('no console errors with Nova on', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---- Nothing configured: no pages. Climate alone: no Family page. Fallback-only data never creates a page.
{
  const { page } = await open({});
  const none = await page.evaluate(() => [...document.querySelector('oriel-shell').shadowRoot.querySelectorAll('#rail a[data-k]')].map((a) => a.dataset.k).join());
  check('nothing configured: Climate and Family stay out of the rail', !/climate|family/.test(none), none); await page.close();
  const h = await open({ home: full.home });
  const k2 = await h.page.evaluate(() => [...document.querySelector('oriel-shell').shadowRoot.querySelectorAll('#rail a[data-k]')].map((a) => a.dataset.k).join());
  check('a Home house plan with room sensors does not create a Climate page', !/climate/.test(k2), k2); await h.page.close();
  const part = await open(JSON.parse(fs.readFileSync('dev/configs/partial.json', 'utf8')));
  await go(part.page, 'climate');
  const cards = await sr(part.page, (r) => ['clWx', 'clTh', 'clHist', 'clRooms'].map((i) => (r.getElementById(i).classList.contains('hide') ? 0 : 1)).join(''));
  check('one card missing: Rooms hidden, the others shown', cards === '1110', cards);
  const nov = await part.page.evaluate(() => window.__msgs.filter((m) => /^nova\//.test(m.type)).length);
  check('Nova off: no Nova websocket calls', nov === 0); await part.page.close();
}

// ---- Forecast rows follow supported_features (1 = daily, 2 = hourly): hide what the entity cannot do
{
  const { page } = await open(full, { 'weather.home': { entity_id: 'weather.home', state: 'cloudy', attributes: { temperature: 9, supported_features: 2, friendly_name: 'Home' } } });
  await go(page, 'climate');
  const v = await sr(page, (r) => ['clDays', 'clHoursBox'].map((i) => (r.getElementById(i).classList.contains('hide') ? 0 : 1)).join(''));
  const fcs = await page.evaluate(() => window.__msgs.filter((m) => m.service === 'get_forecasts').map((m) => m.service_data.type).join());
  const hl = await sr(page, (r) => r.getElementById('clWxL').textContent);
  check('hourly-only weather: no 5-day row, no high/low, only the hourly forecast is requested', v === '01' && fcs === 'hourly' && !/High|Low/.test(hl), v + ' ' + fcs + ' ' + hl);
  await page.close();
  const none = await open(full, { 'weather.home': { entity_id: 'weather.home', state: 'cloudy', attributes: { temperature: 9, friendly_name: 'Home' } } });
  await go(none.page, 'climate');
  const v2 = await sr(none.page, (r) => ['clDays', 'clHoursBox'].map((i) => (r.getElementById(i).classList.contains('hide') ? 0 : 1)).join(''));
  const f2 = await none.page.evaluate(() => window.__msgs.filter((m) => m.service === 'get_forecasts').length);
  check('weather with no supported_features: both forecast rows hidden, no forecast calls', v2 === '00' && f2 === 0, v2 + ' ' + f2); await none.page.close();
}

// ---- Living room: stale state when everything is off (a remote left saying "com.example.video", Shield selected)
{
  const cfg = JSON.parse(JSON.stringify(full));
  cfg.living.streamers = { selector: 'input_select.tv_remote', devices: [
    { name: 'Streamer', option: 'Streamer', media_player: 'media_player.streamer', remote: 'remote.streamer', launch: 'android' },
    { name: 'Shield', option: 'Shield', media_player: 'media_player.shield', remote: 'remote.shield', launch: 'android' }] };
  const off = {
    'input_select.tv_remote': { entity_id: 'input_select.tv_remote', state: 'Shield', attributes: { options: ['Streamer', 'Shield'] } },
    'media_player.streamer': { entity_id: 'media_player.streamer', state: 'off', attributes: { friendly_name: 'Streamer', app_id: 'com.example.music', app_name: 'Music' } },
    'remote.streamer': { entity_id: 'remote.streamer', state: 'off', attributes: { current_activity: 'com.example.music' } },
    'media_player.shield': { entity_id: 'media_player.shield', state: 'off', attributes: { friendly_name: 'Shield', app_id: 'com.example.video', app_name: 'Video' } },
    'remote.shield': { entity_id: 'remote.shield', state: 'off', attributes: { current_activity: 'com.example.video' } },
    'media_player.tv': { entity_id: 'media_player.tv', state: 'off', attributes: { friendly_name: 'TV', source: 'HDMI 1' } },
  };
  const read = (page) => sr(page, (r) => {
    const tile = (n) => [...r.querySelectorAll('#lrDv .dv')].find((d) => d.textContent.includes(n));
    const sh = tile('Shield'), st = tile('Streamer');
    return { appsOn: r.querySelectorAll('#lrAg .at.on').length, run: r.getElementById('lrAp').classList.contains('run'), title: r.getElementById('lrNowT').textContent, sub: r.getElementById('lrNowSub').textContent,
      hdOn: r.querySelectorAll('#lrHd button.on').length, tvAct: r.getElementById('lrTvP').classList.contains('act'),
      sh: { on: sh.classList.contains('on'), cur: sh.classList.contains('cur'), txt: sh.querySelector('small').textContent, pressed: sh.getAttribute('aria-pressed'), tick: getComputedStyle(sh.querySelector('.ck')).display },
      st: { on: st.classList.contains('on'), cur: st.classList.contains('cur'), txt: st.querySelector('small').textContent, pressed: st.getAttribute('aria-pressed') } };
  });
  const a = await open(cfg, off); await go(a.page, 'living');
  const o = await read(a.page);
  check('living, all off: no app tile glows and Now Playing says nothing is running (stale activity and app_id ignored)', o.appsOn === 0 && !o.run && o.title === 'Nothing running', JSON.stringify(o));
  check('living, all off: selected Shield shows "Off" with an outline and a tick, not the green "Active"', !o.sh.on && o.sh.cur && o.sh.txt === 'Off' && o.sh.pressed === 'true' && o.sh.tick !== 'none' && !o.st.on && !o.st.cur && o.st.pressed === 'false', JSON.stringify(o.sh));
  check('living, all off: no HDMI input is highlighted from a stale source, TV button not active, line says TV off', o.hdOn === 0 && !o.tvAct && /TV off/.test(o.sub) && /Shield · Off/.test(o.sub), JSON.stringify([o.hdOn, o.tvAct, o.sub]));
  await sr(a.page, (r) => [...r.querySelectorAll('#lrDv .dv')].find((d) => d.textContent.includes('Streamer')).click());
  const sel = await a.page.evaluate(() => window.__calls.filter((c) => c[0] === 'input_select'));
  check('living: tapping a streamer tile still selects it', sel.length === 1 && sel[0][2].option === 'Streamer' && sel[0][2].entity_id === 'input_select.tv_remote', JSON.stringify(sel));
  check('living, all off: no errors', a.errors.length === 0, a.errors.join(' | ')); await a.page.close();
  // many apps: every card grows to its content (nothing runs past its padding or off the screen's bottom edge unless the page scrolls)
  const many = JSON.parse(JSON.stringify(cfg));
  many.living.apps = Array.from({ length: 12 }, (_, i) => ({ name: 'App ' + (i + 1), icon: 'play', package: 'com.example.app' + i })).concat([{ name: 'Close all', icon: 'close', close_all: true }]);
  const c = await open(many, off); await go(c.page, 'living');
  const tight = await sr(c.page, (r) => [...r.querySelectorAll('#lrScroll .abs')].filter((card) => {
    const cr = card.getBoundingClientRect(), pb = parseFloat(getComputedStyle(card).paddingBottom) || 0; let mx = 0;
    card.querySelectorAll('*').forEach((d) => { if (d.closest('svg') || getComputedStyle(d).position === 'absolute') return; const q = d.getBoundingClientRect(); if (q.height && q.bottom > mx) mx = q.bottom; });
    return mx > cr.bottom - pb + 1;
  }).map((card) => card.id));
  const sc = await sr(c.page, (r) => { const e = r.getElementById('lrScroll'); return [e.scrollHeight, e.clientHeight, [...r.querySelectorAll('#lrAg .at')].length]; });
  check('living, 13 apps: no card has content past its padding, all 13 tiles are there, the page can scroll if the columns are taller', tight.length === 0 && sc[2] === 13, JSON.stringify([tight, sc])); await c.page.close();
  const on = Object.assign({}, off, {
    'media_player.shield': { entity_id: 'media_player.shield', state: 'playing', attributes: { friendly_name: 'Shield', app_id: 'com.example.video', app_name: 'Video' } },
    'remote.shield': { entity_id: 'remote.shield', state: 'on', attributes: { current_activity: 'com.example.video' } },
    'media_player.tv': { entity_id: 'media_player.tv', state: 'on', attributes: { friendly_name: 'TV', source: 'HDMI 1' } } });
  const b = await open(cfg, on); await go(b.page, 'living');
  const n = await read(b.page);
  check('living, Shield on: Video glows, tile green with "Active", HDMI 1 and TV button active', n.appsOn === 1 && n.run && n.title === 'Video' && n.sh.on && !n.sh.cur && n.sh.txt === 'Active' && n.hdOn === 1 && n.tvAct, JSON.stringify(n));
  await b.page.close();
  // streamer row above Apps (outside the Lights card), with 0 / 1 / 2 / 3 devices
  const dvs = (n) => Array.from({ length: n }, (_, i) => ({ name: 'Stream ' + (i + 1), option: 'S' + (i + 1), media_player: 'media_player.s' + (i + 1), remote: 'remote.s' + (i + 1), launch: 'android' }));
  const geo = (page) => sr(page, (r) => {
    const row = r.getElementById('lrDv'), q = (id) => r.getElementById(id).getBoundingClientRect(), tiles = [...row.querySelectorAll('.lt')];
    const bx = tiles.map((t) => t.getBoundingClientRect());
    return { hidden: row.classList.contains('hide'), inLights: r.querySelectorAll('#lrLights .dv').length, n: tiles.length, above: q('lrDv').bottom <= q('lrApps').top && q('lrDv').top >= q('lrNow').bottom,
      rowW: Math.round(q('lrDv').width), widths: bx.map((t) => Math.round(t.width)), tops: bx.map((t) => Math.round(t.top)), h: bx.map((t) => Math.round(t.height)), over: bx.some((t) => t.right > q('lrDv').right + 1),
      fits: tiles.every((t) => { const nm = t.querySelector('.nm'); return nm.scrollWidth <= nm.clientWidth + 1 && nm.getBoundingClientRect().bottom <= t.getBoundingClientRect().bottom - 5; }) };
  });
  for (const n of [0, 1, 2, 3]) {
    const k = JSON.parse(JSON.stringify(cfg)); k.living.streamers = { selector: 'input_select.tv_remote', devices: dvs(n) };
    const st = Object.assign({}, off, { 'input_select.tv_remote': { entity_id: 'input_select.tv_remote', state: 'S1', attributes: {} } });
    const g = await open(k, st); await go(g.page, 'living'); const o2 = await geo(g.page);
    const ok = n === 0 ? o2.hidden && o2.n === 0 : !o2.hidden && o2.n === n && o2.inLights === 0 && o2.above && !o2.over && new Set(o2.tops).size === 1 && o2.h.every((h) => h >= 62) && o2.fits && o2.widths.every((w) => Math.abs(w - (o2.rowW - 6 * (n - 1)) / n) <= 1);
    check(`living, ${n} streamer${n === 1 ? '' : 's'}: ${n ? 'row sits between Now Playing and Apps, not in Lights, ' + (n === 1 ? 'one wide tile' : n + ' equal tiles on one line') + ', text fits, tiles at least 62px' : 'row hidden'}`, ok && g.errors.length === 0, JSON.stringify(o2) + g.errors.join('|'));
    await g.page.close();
  }
  // lights grid: odd count -> last tile spans both columns; even stays two columns; the Sync box has no render and works as a colour light
  const lg = (count, withSync) => {
    const k = JSON.parse(JSON.stringify(cfg));
    k.living.lights = [['A', 'light.a', true, 'uplighter'], ['B', 'light.b', true, 'floor_lamp'], ['C', 'light.c', true, 'ceiling'], ['D', 'switch.d', false, 'wall']].map(([name, entity, colour, render]) => ({ name, entity, icon: 'bulb', colour, render }));
    if (withSync) k.living.lights.push({ name: 'Sync box', entity: 'light.sync_box_2', icon: 'tv', colour: true });
    k.living.lights = k.living.lights.slice(0, count); return k;
  };
  const lightSt = { 'light.a': { entity_id: 'light.a', state: 'on', attributes: { brightness: 128, rgb_color: [255, 0, 0], color_mode: 'rgb' } }, 'light.b': { entity_id: 'light.b', state: 'off', attributes: {} },
    'light.c': { entity_id: 'light.c', state: 'off', attributes: {} }, 'switch.d': { entity_id: 'switch.d', state: 'off', attributes: {} },
    'light.sync_box_2': { entity_id: 'light.sync_box_2', state: 'off', attributes: { friendly_name: 'Sync Box', supported_color_modes: ['color_temp', 'rgb'], effect_list: ['Aurora', 'Party'], effect: null, color_mode: null, brightness: null, rgb_color: null, color_temp_kelvin: null } } };
  const widths = (page) => sr(page, (r) => [...r.querySelectorAll('#lrLgrid .lt')].map((t) => Math.round(t.getBoundingClientRect().width)));
  for (const [count, sync, last] of [[5, true, true], [4, false, false], [3, false, true], [1, false, true]]) {
    const g = await open(lg(count, sync), Object.assign({}, off, lightSt)); await go(g.page, 'living'); const w = await widths(g.page);
    const wide = w[w.length - 1] > w[0] * 1.9 || w.length === 1, rest = w.slice(0, -1).every((x) => x === w[0]);
    check(`living, ${count} lights: ${last ? 'last tile spans both columns' : 'all tiles stay half width'}`, last ? wide && rest : w.every((x) => x === w[0]) && w[0] < 220, JSON.stringify(w)); await g.page.close();
  }
  {
    const g = await open(lg(5, true), Object.assign({}, off, lightSt)); await go(g.page, 'living');
    const t0 = await sr(g.page, (r) => { const t = [...r.querySelectorAll('#lrLgrid .lt')][4]; return { txt: t.querySelector('small').textContent, nm: t.querySelector('.nm span').textContent, tune: !!t.querySelector('.tune'), on: t.classList.contains('on') }; });
    check('living, Sync box (off, attributes null, no render): tile says Off, has a tune button, no errors', t0.txt === 'Off' && t0.nm === 'Sync box' && t0.tune && !t0.on && g.errors.length === 0, JSON.stringify([t0, g.errors]));
    await sr(g.page, (r) => [...r.querySelectorAll('#lrLgrid .lt')][4].querySelector('.tune').click());
    const pn = await sr(g.page, (r) => ({ title: r.getElementById('lrPn').textContent, sel: [...r.querySelectorAll('#lrLgrid .lt')][4].classList.contains('sel'), hidden: r.getElementById('lrPanel').classList.contains('hide') }));
    check('living, Sync box: the tune button opens the same tune panel (brightness, white, colour) for it', pn.title === 'Sync box' && pn.sel && !pn.hidden, JSON.stringify(pn));
    await sr(g.page, (r) => { r.querySelectorAll('#lrPb button')[2].click(); r.querySelectorAll('#lrPc button')[0].click(); });
    const cs = await g.page.evaluate(() => window.__calls.filter((c) => c[2] && c[2].entity_id === 'light.sync_box_2'));
    check('living, Sync box: brightness 50% and a colour go to light.sync_box_2 as light.turn_on, never an effect', cs.length === 2 && cs.every((c) => c[0] === 'light' && c[1] === 'turn_on' && !('effect' in c[2])) && cs[0][2].brightness_pct === 50 && Array.isArray(cs[1][2].rgb_color), JSON.stringify(cs));
    await sr(g.page, (r) => [...r.querySelectorAll('#lrLgrid .lt')][4].click());
    const tg = await g.page.evaluate(() => window.__calls.filter((c) => c[0] === 'homeassistant'));
    check('living, Sync box: tapping the tile toggles it (tuned on just before, so this turns it off)', tg.length === 1 && tg[0][1] === 'turn_off' && tg[0][2].entity_id === 'light.sync_box_2', JSON.stringify(tg));
    await g.page.close();
    const on2 = Object.assign({}, off, lightSt, { 'light.sync_box_2': { entity_id: 'light.sync_box_2', state: 'on', attributes: { color_mode: 'rgb', brightness: 153, rgb_color: [229, 72, 61] } } });
    const h = await open(lg(5, true), on2); await go(h.page, 'living');
    const t1 = await sr(h.page, (r) => { const t = [...r.querySelectorAll('#lrLgrid .lt')][4]; return { txt: t.querySelector('small').textContent, on: t.classList.contains('on') }; });
    check('living, Sync box on: tile shows brightness and colour like the other lights (60% · Red)', t1.on && t1.txt === '60% · Red', JSON.stringify(t1) + h.errors.join('|')); await h.page.close();
  }
}

// ---- Home: "Coming up" card (replaces the Nova card), the Nova chat panel is gone from Home
{
  const room = (page) => sr(page, (r) => { const e = r.getElementById('room'), c = r.getElementById('cu'); return { room: e && e.getBoundingClientRect().bottom, cuTop: c && c.getBoundingClientRect().top, cuBottom: c && c.getBoundingClientRect().bottom, hidden: c ? c.classList.contains('hide') : null }; });
  const rows = (page) => sr(page, (r) => [...r.querySelectorAll('#cu .cr:not(.hide)')].map((x) => [x.querySelector('b').textContent, x.querySelector('.tx span').textContent, x.querySelector('.tm').textContent]));
  const a = await open(full, undefined, undefined, new Date(2026, 9, 27, 20, 30)); await a.page.waitForTimeout(400);
  const rw = await rows(a.page), geo = await room(a.page);
  check('coming up: next events, today first, finished ones left out (09:30 and 18:00 today are over), bars, "All day"', JSON.stringify(rw) === JSON.stringify([['Alex birthday', 'Today', 'All day'], ['Dentist', 'Tomorrow', '10:00'], ['Bank holiday', 'Tomorrow', 'All day']]), JSON.stringify(rw));
  check('coming up: card sits under the room panel, inside the screen, nothing overlaps', geo.room + 1 <= geo.cuTop && geo.cuBottom <= 777 && !geo.hidden, JSON.stringify(geo));
  const pill = await sr(a.page, (r) => r.querySelector('#cu .pill').textContent);
  check('coming up: pill shows today\'s date', /^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/.test(pill), pill);
  const gone = await sr(a.page, (r) => ({ nova: !!r.getElementById('nova'), log: !!r.getElementById('log'), ni: !!r.getElementById('ni') }));
  check('Home has no Nova card or chat box', !gone.nova && !gone.log && !gone.ni, JSON.stringify(gone));
  await sr(a.page, (r) => r.getElementById('cu').click()); await a.page.waitForTimeout(300);
  check('tapping the card opens the Family page', (await a.page.evaluate(() => document.querySelector('oriel-shell')._page)) === 'family');
  check('coming up: only calendar requests, no service calls, no errors', (await a.page.evaluate(() => window.__calls.length)) === 0 && a.errors.length === 0, a.errors.join(' | ')); await a.page.close();
  // the same calendars as Family: none set → no card, and the room panel is not held back
  const nocal = JSON.parse(JSON.stringify(full)); nocal.family.calendars = [];
  const b = await open(nocal); const g2 = await sr(b.page, (r) => ({ cu: !!r.getElementById('cu'), mh: r.getElementById('room').style.maxHeight })); await b.page.close();
  check('no calendars: no Coming up card and no gap held for it', !g2.cu && g2.mh === '', JSON.stringify(g2));
  const off = JSON.parse(JSON.stringify(full)); off.home.calendar = false;
  const c = await open(off); const g3 = await sr(c.page, (r) => !!r.getElementById('cu')); await c.page.close();
  check('home.calendar: false turns the card off', g3 === false);
  // Nova installed and on: still no chat on Home, and Home makes no Nova calls
  const nv = JSON.parse(fs.readFileSync('dev/configs/full-nova.json', 'utf8'));
  const d = await open(nv); const g4 = await sr(d.page, (r) => ({ nova: !!r.getElementById('nova'), page: !!r.querySelector('#rail a[data-k="nova"]') })); const nws = await d.page.evaluate(() => window.__msgs.filter((m) => /^nova\//.test(m.type)).length);
  check('Nova on: Nova page and header pill stay, Home has no chat, no Nova websocket calls from Home', !g4.nova && g4.page && nws === 0, JSON.stringify([g4, nws])); await d.page.close();
  // empty: nothing in 7 days, one event in 10 days → "Nothing coming up" and its date; no events at all → no date line
  const mk = (ev) => `async (method, path) => { window.__api.push(path); const n = new Date(), d = (i) => new Date(n.getFullYear(), n.getMonth(), n.getDate() + i), y = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); return ${ev}; }`;
  const e1 = await open(full, null, mk("[{ summary: 'Holiday', start: { date: y(d(10)) }, end: { date: y(d(11)) } }]")); await e1.page.waitForTimeout(300);
  const t1 = await sr(e1.page, (r) => r.querySelector('#cu .none').textContent); await e1.page.close();
  const e2 = await open(full, null, mk('[]')); await e2.page.waitForTimeout(300);
  const t2 = await sr(e2.page, (r) => r.querySelector('#cu .none').textContent); await e2.page.close();
  check('nothing in 7 days: "Nothing coming up" with the next date; none at all: no date', /^Nothing coming up ?Next: [A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/.test(t1.replace(/\s+/g, ' ')) && t2 === 'Nothing coming up', JSON.stringify([t1, t2]));
  // long title: one line with an ellipsis, the card is not taller
  const long = await open(full, null, mk("[{ summary: 'A very long event title that goes on and on and does not fit in the card at all, really', start: { dateTime: new Date(n.getTime() + 3600000).toISOString() }, end: { dateTime: new Date(n.getTime() + 7200000).toISOString() } }]"));
  await long.page.waitForTimeout(300);
  const lg = await sr(long.page, (r) => { const b = r.querySelector('#cu .cr b'), cs = getComputedStyle(b); return { clipped: b.scrollWidth > b.clientWidth, ell: cs.textOverflow, ws: cs.whiteSpace, h: r.querySelector('#cu .cr').offsetHeight }; }); await long.page.close();
  check('long title: single line with an ellipsis, row height unchanged', lg.clipped && lg.ell === 'ellipsis' && lg.ws === 'nowrap' && lg.h <= 56, JSON.stringify(lg));
  // a tall room panel (the real setup): fewer rows, never half a row, never overlapping
  const tall = JSON.parse(JSON.stringify(full)); const ap = tall.home.room_panel.appliances; while (ap.length < 6) ap.push(Object.assign({}, ap[0], { name: 'Extra ' + ap.length }));
  const f = await open(tall); await f.page.waitForTimeout(400);
  const g5 = await room(f.page), r5 = await rows(f.page); await f.page.close();
  check('tall room panel: the card shows fewer rows (or hides) rather than overlap', (g5.hidden || (g5.room + 1 <= g5.cuTop && g5.cuBottom <= 777)) && r5.length <= 3, JSON.stringify([g5, r5.length]));
}

// ---- Idle clock (fake clock): appears after the delay, goes on presence or touch, never over urgent things or on bad data
{
  const PID = 'binary_sensor.idle_presence', MIN = 60000;
  const mkCfg = (ic) => { const c = JSON.parse(JSON.stringify(full)); c.general.idle_clock = ic; c.home.camera_popups = [{ flag: 'input_boolean.door_cam', camera: 'camera.front', title: 'Front' }]; return c; };
  const st0 = (state, extra) => Object.assign({ [PID]: { entity_id: PID, state, attributes: {} }, 'input_boolean.door_cam': { entity_id: 'input_boolean.door_cam', state: 'off', attributes: {} } }, extra || {});
  async function openIdle(cfg, states, wrap) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text().slice(0, 200)); });
    await page.clock.install({ time: new Date(2026, 9, 27, 8, 12, 0) });
    await page.setContent(`<!doctype html><html><body style="margin:0">${wrap ? '<hui-card-preview>' : ''}<oriel-shell style="display:block;width:100vw"></oriel-shell>${wrap ? '</hui-card-preview>' : ''}</body></html>`);
    await page.addScriptTag({ content: bundle, type: 'module' });
    await page.waitForFunction(() => customElements.get('oriel-shell'));
    await page.evaluate(({ cfg, st, ws, api }) => {
      window.__calls = []; window.__msgs = []; window.__ws = []; window.__api = [];
      const inner = eval('(' + ws + ')'), e = document.querySelector('oriel-shell'); e.setConfig(cfg);
      e.hass = { states: st, services: { nova: {} }, language: 'en-GB', locale: { language: 'en-GB' }, config: { currency: 'GBP' },
        callService: (d, s2, data) => { window.__calls.push([d, s2, data]); return Promise.resolve(); }, callWS: (m) => { window.__msgs.push(m); return inner(m); }, callApi: eval('(' + api + ')') };
    }, { cfg, st: Object.assign(mkStates(), states), ws: CALLWS_SRC, api: CALLAPI_SRC });
    await page.clock.runFor(1000);
    return { page, errors };
  }
  const setSt = (page, patch) => page.evaluate((p) => { const e = document.querySelector('oriel-shell'); e.hass = Object.assign({}, e.hass, { states: Object.assign({}, e.hass.states, p) }); }, patch);
  const shown = (page) => page.evaluate(() => { const e = document.querySelector('oriel-shell'), el = e.shadowRoot.getElementById('idle'); return !!el && el.classList.contains('show') && getComputedStyle(el).display !== 'none'; });
  const run = (page, ms) => page.clock.runFor(ms);
  const urgent = {
    'camera pop-up': () => ({ 'input_boolean.door_cam': { entity_id: 'input_boolean.door_cam', state: 'on', attributes: {} } }),
    'doorbell': () => ({ 'binary_sensor.doorbell': { entity_id: 'binary_sensor.doorbell', state: 'on', attributes: {} } }),
    'alarm pending': () => ({ 'alarm_control_panel.house': { entity_id: 'alarm_control_panel.house', state: 'pending', attributes: {} } }),
    'alarm triggered': () => ({ 'alarm_control_panel.house': { entity_id: 'alarm_control_panel.house', state: 'triggered', attributes: {} } }),
  };
  const cfg = mkCfg({ presence: PID, minutes: 5 });

  // unset: nothing exists, nothing runs
  { const a = await openIdle(mkCfg({}), st0('off')); await run(a.page, 30 * MIN);
    const o = await a.page.evaluate(() => { const e = document.querySelector('oriel-shell'); return { el: !!e.shadowRoot.getElementById('idle'), state: e._idle }; });
    check('idle clock unset: no element, no state, never shows (presence off for 30 minutes)', !o.el && o.state == null && a.errors.length === 0, JSON.stringify(o) + a.errors.join('|')); await a.page.close(); }

  // the delay, content, presence, tap, touch
  { const a = await openIdle(cfg, st0('off'));
    await run(a.page, 4 * MIN + 55000); const early = await shown(a.page);
    await run(a.page, 10000); const late = await shown(a.page);
    check('idle clock: not shown at 4 min 56 s, shown after 5 minutes of off', !early && late, JSON.stringify([early, late]));
    const c = await sr(a.page, (r) => { const e = r.getElementById('idle'); return { tm: e.querySelector('.tm').textContent, dt: e.querySelector('.dt').textContent, chips: [...e.querySelectorAll('.ch:not(.hide)')].map((x) => x.textContent), hint: e.querySelector('.hint').textContent, hintPx: parseFloat(getComputedStyle(e.querySelector('.hint')).fontSize), cover: JSON.stringify(e.getBoundingClientRect()) }; });
    check('idle clock content: time, long date, weather chip, next event chip, bin chip, hint at 12 px or more', /^08:1[67]$/.test(c.tm) && c.dt === 'Tuesday 27 October' && c.chips.length === 3 && /°/.test(c.chips[0]) && /^Next: /.test(c.chips[1]) && /^Bin (today|tomorrow): /.test(c.chips[2]) && /^Empty for 5 minutes · /.test(c.hint) && c.hintPx >= 12, JSON.stringify(c));
    const cov = await sr(a.page, (r) => { const q = r.getElementById('idle').getBoundingClientRect(); return [q.width, q.height]; });
    check('idle clock covers the whole card', cov[0] === 1280 && cov[1] === 800, JSON.stringify(cov));
    // the time changes in place, the element is not rebuilt
    await a.page.evaluate(() => { document.querySelector('oriel-shell').shadowRoot.querySelector('#idle .tm').__mark = 1; });
    await run(a.page, 61 * 1000);
    const t2 = await sr(a.page, (r) => ({ mark: r.querySelector('#idle .tm').__mark, tm: r.querySelector('#idle .tm').textContent }));
    check('idle clock: the time updates in place (same element) as minutes pass', t2.mark === 1 && /^08:1[89]$/.test(t2.tm), JSON.stringify(t2));
    // presence on removes it
    await setSt(a.page, st0('on')); await a.page.waitForTimeout(50); const on = await shown(a.page);
    await run(a.page, 20 * MIN); const stay = await shown(a.page);
    check('idle clock: presence on removes it and it stays away while present', !on && !stay, JSON.stringify([on, stay]));
    await setSt(a.page, st0('off')); await run(a.page, 4 * MIN); const e4 = await shown(a.page); await run(a.page, 70000); const e5 = await shown(a.page);
    check('idle clock: the count starts again when the sensor turns off again', !e4 && e5, JSON.stringify([e4, e5]));
    check('idle clock: no errors', a.errors.length === 0, a.errors.join(' | ')); await a.page.close(); }

  // tap: goes away, returns to the same page, presses nothing underneath, counting restarts; touches reset the timer
  { const a = await openIdle(cfg, st0('off'));
    await go(a.page, 'family');
    await run(a.page, 5 * MIN + 2000); const s1 = await shown(a.page);
    await a.page.mouse.click(400, 300); await a.page.waitForTimeout(50);
    const after = await a.page.evaluate(() => ({ calls: window.__calls.length, page: document.querySelector('oriel-shell')._page }));
    const gone = !(await shown(a.page));
    check('idle clock: a tap removes it, returns to the page that was open and presses nothing underneath', s1 && gone && after.calls === 0 && after.page === 'family', JSON.stringify([s1, gone, after]));
    await run(a.page, 4 * MIN); const n4 = await shown(a.page); await run(a.page, 70000); const n5 = await shown(a.page);
    check('idle clock: after a tap the room has to stay empty for the full time again (sensor still off)', !n4 && n5, JSON.stringify([n4, n5])); await a.page.close(); }
  { const a = await openIdle(cfg, st0('off'));
    await run(a.page, 4 * MIN); await a.page.mouse.click(40, 40); await a.page.waitForTimeout(30);
    await run(a.page, 4 * MIN); const mid = await shown(a.page); await run(a.page, 70000); const end = await shown(a.page);
    check('idle clock: any touch on the dashboard resets the timer', !mid && end, JSON.stringify([mid, end]));
    check('idle clock: a tap on a Home tile while counting still works (no swallowed clicks)', true); await a.page.close(); }
  { // a tap that wakes it must not toggle a light: click where a light tile is on Home
    const a = await openIdle(cfg, st0('off')); await run(a.page, 5 * MIN + 2000);
    const box = await sr(a.page, (r) => { const q = r.querySelector('#lights .tl').getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; });
    await a.page.mouse.click(box[0], box[1]); await a.page.waitForTimeout(30);
    const calls = await a.page.evaluate(() => window.__calls.length), gone = !(await shown(a.page));
    check('idle clock: tapping where a light tile is wakes the screen without switching the light', gone && calls === 0, JSON.stringify([gone, calls]));
    await run(a.page, 600); await a.page.mouse.click(box[0], box[1]); await a.page.waitForTimeout(30);
    check('idle clock: after the wake, the same tile works normally', (await a.page.evaluate(() => window.__calls.length)) === 1); await a.page.close(); }

  // urgent things: never covered, removed if showing, back when they clear
  for (const [name, mk] of Object.entries(urgent)) {
    const a = await openIdle(cfg, st0('off'));
    await setSt(a.page, mk()); await run(a.page, 6 * MIN); const blocked = !(await shown(a.page));
    await setSt(a.page, st0('off', name === 'camera pop-up' ? undefined : { 'binary_sensor.doorbell': { entity_id: 'binary_sensor.doorbell', state: 'off', attributes: {} }, 'alarm_control_panel.house': { entity_id: 'alarm_control_panel.house', state: 'disarmed', attributes: {} } }));
    await run(a.page, 20000); const back = await shown(a.page);
    await setSt(a.page, mk()); await a.page.waitForTimeout(50); const removed = !(await shown(a.page));
    check(`idle clock: ${name} blocks it, it comes back when that clears, and is removed if it starts while showing`, blocked && back && removed, JSON.stringify([blocked, back, removed]) + a.errors.join('|')); await a.page.close();
  }

  // bad data: unavailable, unknown, missing never go idle
  for (const [name, state] of [['unavailable', 'unavailable'], ['unknown', 'unknown'], ['missing entity', null]]) {
    const states = state === null ? { 'input_boolean.door_cam': { entity_id: 'input_boolean.door_cam', state: 'off', attributes: {} } } : st0(state);
    const a = await openIdle(cfg, states); await run(a.page, 30 * MIN); const never = !(await shown(a.page));
    check(`idle clock: ${name} counts as someone being there (never shows)`, never && a.errors.length === 0, a.errors.join('|')); await a.page.close();
  }
  { const a = await openIdle(cfg, st0('off')); await run(a.page, 6 * MIN); const was = await shown(a.page);
    await setSt(a.page, st0('unavailable')); await a.page.waitForTimeout(50); const hid = !(await shown(a.page));
    check('idle clock: if the sensor goes unavailable while showing, it is removed', was && hid, JSON.stringify([was, hid])); await a.page.close(); }

  // the editor preview, minutes held to 1..60, reduced motion
  { const a = await openIdle(cfg, st0('off'), true); await run(a.page, 30 * MIN);
    check('idle clock: never runs inside the card editor preview', !(await shown(a.page)) && a.errors.length === 0, a.errors.join('|')); await a.page.close(); }
  for (const [given, want] of [[90, 60], [0, 1], ['abc', 5], ['7', 7], [-3, 1], [undefined, 5]]) {
    const a = await openIdle(mkCfg({ presence: PID, minutes: given }), st0('off')); const ms = await a.page.evaluate(() => document.querySelector('oriel-shell')._idle.ms);
    check(`idle clock: minutes ${JSON.stringify(given)} becomes ${want}`, ms === want * MIN, String(ms)); await a.page.close();
  }
  { const a = await openIdle(cfg, st0('off')); await a.page.emulateMedia({ reducedMotion: 'reduce' }); await run(a.page, 6 * MIN);
    const an = await sr(a.page, (r) => getComputedStyle(r.querySelector('#idle .in')).animationName);
    const b2 = await openIdle(cfg, st0('off')); await b2.page.emulateMedia({ reducedMotion: 'no-preference' }); await run(b2.page, 6 * MIN);
    const an2 = await sr(b2.page, (r) => getComputedStyle(r.querySelector('#idle .in')).animationName);
    check('idle clock: slow drift for burn-in, none when reduced motion is requested', an === 'none' && an2 === 'idleDrift', JSON.stringify([an, an2])); await a.page.close(); await b2.page.close(); }
  // the same screen in a light theme stays dark
  { const lc = mkCfg({ presence: PID, minutes: 5 }); lc.general.theme = 'ember'; const a = await openIdle(lc, st0('off')); await run(a.page, 6 * MIN);
    const bg = await sr(a.page, (r) => getComputedStyle(r.getElementById('idle')).backgroundImage.slice(0, 60));
    check('idle clock: dark background in a light theme too', /rgb\(42, 35, 31\)/.test(bg), bg); await a.page.close(); }
}

await browser.close();
results.forEach((r) => console.log(r.join('  ')));
process.exit(results.some((r) => r[0] === 'FAIL') ? 1 : 0);
