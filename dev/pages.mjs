/* Behaviour checks for the Climate and Family pages (and the shared code they use), with the mock hass.
   Usage: node dev/pages.mjs   Exits 1 on the first failure. Nothing is sent anywhere. */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates, CALLWS_SRC, CALLAPI_SRC } from './mock.mjs';

const bundle = fs.readFileSync('dist/oriel.js', 'utf8');
const full = JSON.parse(fs.readFileSync('dev/configs/full.json', 'utf8'));
const results = []; const check = (n, ok, x) => results.push([ok ? 'PASS' : 'FAIL', n, x || '']);
const browser = await chromium.launch();

async function open(cfg, extraStates) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text().slice(0, 200)); });
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
  }, { cfg, st: Object.assign(mkStates(), extraStates || {}), ws: CALLWS_SRC, api: CALLAPI_SRC });
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
  const seg = await sr(page, (r) => r.querySelectorAll('#clHistBody svg path[stroke-dasharray=""]').length);
  check('history: an unavailable stretch leaves a gap (the line is in two pieces, no zero)', seg === 2, 'pieces: ' + seg);
  const cnt = await sr(page, (r) => ({ days: r.querySelectorAll('#clDays .d').length, hours: r.querySelectorAll('#clHours .h').length, rows: r.querySelectorAll('#clThRows .tr').length, leg: r.querySelectorAll('#clLg > span').length, rooms: r.querySelectorAll('#clRl .rr').length }));
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
  check('calendar: REST calendars/<entity>?start=&end= for each calendar and bin, no raw "+"', api.length === 6 && api.every((u) => /^calendars\/calendar\.[a-z_]+\?start=[^&+]+&end=[^&+]+$/.test(u)), api.length + ' requests');
  const fam = await sr(page, (r) => ({ ev: r.querySelectorAll('#fmCal .ev').length, none: r.querySelectorAll('#fmCal .none').length, allday: r.querySelectorAll('#fmCal .ad').length, bins: r.querySelectorAll('#fmBins .bn').length, soon: r.querySelector('#fmBins .bn.soon .dy').textContent, rem: r.querySelectorAll('#fmRem .nvRr').length }));
  check('family: events listed, all-day marked, tomorrow bin says "Tomorrow", Nova off → no reminders card', fam.ev >= 7 && fam.allday >= 3 && fam.bins === 3 && /Tomorrow/.test(fam.soon) && fam.rem === 0, JSON.stringify(fam));
  // shopping card: add, tick, clear done
  await sr(page, (r) => { const i = r.querySelector('#fmShop input'); i.value = 'Tea'; r.querySelector('#fmShop form').dispatchEvent(new Event('submit', { cancelable: true })); });
  await sr(page, (r) => r.querySelector('#fmShop .fmList li').click());
  await sr(page, (r) => r.querySelector('#fmShop .clr').click());
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
  const v = await sr(page, (r) => ['clDaysBox', 'clHoursBox', 'clHL'].map((i) => (r.getElementById(i).classList.contains('hide') ? 0 : 1)).join(''));
  const fcs = await page.evaluate(() => window.__msgs.filter((m) => m.service === 'get_forecasts').map((m) => m.service_data.type).join());
  check('hourly-only weather: no 5-day row, no high/low, only the hourly forecast is requested', v === '010' && fcs === 'hourly', v + ' ' + fcs);
  await page.close();
  const none = await open(full, { 'weather.home': { entity_id: 'weather.home', state: 'cloudy', attributes: { temperature: 9, friendly_name: 'Home' } } });
  await go(none.page, 'climate');
  const v2 = await sr(none.page, (r) => ['clDaysBox', 'clHoursBox'].map((i) => (r.getElementById(i).classList.contains('hide') ? 0 : 1)).join(''));
  const f2 = await none.page.evaluate(() => window.__msgs.filter((m) => m.service === 'get_forecasts').length);
  check('weather with no supported_features: both forecast rows hidden, no forecast calls', v2 === '00' && f2 === 0, v2 + ' ' + f2); await none.page.close();
}

await browser.close();
results.forEach((r) => console.log(r.join('  ')));
process.exit(results.some((r) => r[0] === 'FAIL') ? 1 : 0);
