/* Climate page: weather and forecasts, thermostats (with the heating boost), the last 12 hours of each
   thermostat's current temperature, and room temperatures. Every card is optional.
   Forecasts come from weather.get_forecasts (websocket call_service with a response), cached; the history is
   one history/history_during_period request WITH attributes, because current_temperature is an attribute. */
import { registerPage } from '../core.js';
import { S, t, HVAC, WX } from '../strings.js';
import { hasEntities } from '../config.js';
import { isEnt, bad, cap, esc, pad, clamp, el, icon } from '../util.js';
import { CARDS_CSS, layoutCols } from './cards.js';
import { LINE } from '../theme/fixed.js';

const FORECAST_MS = 30 * 60000, HISTORY_MS = 5 * 60000, RETRY_MS = 5 * 60000;
const WEIGHTS = [400, 380, 320]; /* column widths in the approved mockup */
const CSS = `
#clWx{padding:20px 24px}
#clWx .cur{display:flex;align-items:baseline;gap:8px;margin:14px 0 6px;min-height:56px}
#clWx .big{font-weight:200;font-size:56px;line-height:1;font-variant-numeric:tabular-nums}
#clWx .cur .soft{font-size:14px}
#clDays{display:flex;gap:8px;margin-top:22px}
#clDays .d{flex:1;border-radius:16px;padding:10px 4px;text-align:center;background:rgba(var(--oriel-glass),.35);min-width:0}
#clDays .d .h{font-size:20px;margin:6px 0;font-variant-numeric:tabular-nums}
#clWx .cap{font-size:12px;margin:26px 0 6px;text-transform:uppercase}
#clHours{height:150px;border-radius:18px;background:rgba(var(--oriel-glass),.3);display:flex;align-items:flex-end;gap:6px;padding:12px}
#clHours i{flex:1;border-radius:6px;background:rgba(var(--oriel-ink),.62)}
#clHrAx{display:flex;gap:6px;padding:4px 12px 0}
#clHrAx span{flex:1;font-size:12px;text-align:center;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}
#clTh{padding:20px 24px}
#clTh .tr{padding:10px 0;border-top:1px solid rgba(var(--oriel-ink),.14);display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:64px}
#clTh .tr:first-of-type{margin-top:6px}
#clTh .l{display:flex;flex-direction:column;min-width:0;min-height:44px;justify-content:center;cursor:pointer} #clTh .l b{font-weight:400;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #clTh .l span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#clTh .ctl{display:flex;align-items:center;gap:10px;flex:none}
#clTh .tv{font-size:34px;font-weight:200;width:90px;text-align:center;font-variant-numeric:tabular-nums}
#clTh .boost{width:100%;height:50px;border-radius:25px;margin-top:16px;font-size:14px;flex:none}
#clTh .boost .ic{width:18px;height:18px}
#clHist{padding:18px 24px}
#clHistBody{margin:12px 0 4px} #clHistBody svg{width:100%;height:auto;display:block;overflow:visible}
#clHist .lg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px} #clHist .lg span{display:inline-flex;align-items:center;gap:6px}
#clRooms .rr{display:flex;align-items:center;min-height:46px;border-top:1px solid rgba(var(--oriel-ink),.14);font-size:14px;gap:0}
#clRooms .hd+.rl{margin-top:8px}
#clRooms .rr .nm{width:120px;flex:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#clRooms .rr .bar{flex:1;height:8px;border-radius:4px;background:rgba(var(--oriel-ink),.15);margin:0 14px;overflow:hidden} #clRooms .rr .bar i{display:block;height:100%;border-radius:4px;background:rgb(var(--oriel-accent));transform-origin:0 50%}
#clRooms .rr b{width:50px;flex:none;font-weight:400;text-align:right;font-variant-numeric:tabular-nums}
#clRooms .ex{margin-top:18px;line-height:1.35}
`;
const HTML = () => `<div class="pgc" id="clWrap"><div class="cols">
  <div class="col" id="clC1"><section id="clWx" class="card glass"><div class="hd"><h3>${esc(S.weather_title)}</h3><span class="pill" id="clWxP"></span></div>
    <div class="cur"><span class="big" id="clWxT">–</span><span class="soft" id="clWxF"></span></div>
    <div class="sm soft" id="clWxL"></div>
    <div id="clDays"></div>
    <div id="clHoursBox"><div class="cap soft">${esc(S.next_12_hours)}</div><div id="clHours" role="img"></div><div id="clHrAx"></div></div></section></div>
  <div class="col" id="clC2"><section id="clTh" class="card glass"><h3>${esc(S.thermostats)}</h3><div id="clThRows"></div></section>
    <section id="clHist" class="card glass"><div class="hd"><h3>${esc(S.last_12_hours)}</h3><span class="pill">${esc(S.thermostats_pill)}</span></div><div id="clHistBody"></div><div class="lg soft" id="clLg"></div></section></div>
  <div class="col" id="clC3"><section id="clRooms" class="card glass"><div class="hd"><h3>${esc(S.rooms)}</h3><span class="pill">${esc(S.temperature_pill)}</span></div><div class="rl" id="clRl"></div><div class="ex sm soft" id="clEx"></div></section></div>
</div></div>`;

/* series styles: colour + marker shape, so a line is never told apart by colour alone. All lines are solid (a dashed
   line looks broken). The first two colours are the fixed colour-blind-safe pair from theme/fixed.js, set in the render. */
const SERIES = [
  { c: '', m: 'circle' }, { c: '', m: 'square' },
  { c: 'rgba(var(--oriel-ink),.85)', m: 'diamond' }, { c: 'rgb(var(--oriel-accent-ink))', m: 'triangle' },
];
const mark = (g, shape, x, y, col) => {
  const a = { fill: col, stroke: 'rgb(var(--oriel-raised))', 'stroke-width': 2 };
  if (shape === 'circle') el('circle', Object.assign({ cx: x, cy: y, r: 5 }, a), g);
  else if (shape === 'square') el('rect', Object.assign({ x: x - 4.5, y: y - 4.5, width: 9, height: 9 }, a), g);
  else if (shape === 'diamond') el('path', Object.assign({ d: `M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}z` }, a), g);
  else el('path', Object.assign({ d: `M${x} ${y - 6}L${x + 6} ${y + 5}L${x - 6} ${y + 5}z` }, a), g);
};
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

/* Time-weighted hourly averages of a step series. pts: [{ t, v }] sorted, v null when the reading is unusable.
   A value holds until the next row, so a steady temperature (no new rows) still fills its hours. */
export function hourlyAverages(pts, start, bins, now) {
  const out = [];
  for (let i = 0; i < bins; i++) {
    const a = start + i * 3600, b = Math.min(start + (i + 1) * 3600, now);
    let sum = 0, dur = 0;
    for (let j = 0; j < pts.length; j++) {
      if (pts[j].v == null) continue;
      const s = Math.max(pts[j].t, a), e = Math.min(j + 1 < pts.length ? pts[j + 1].t : now, b);
      if (e > s) { sum += pts[j].v * (e - s); dur += e - s; }
    }
    out.push(dur > 0 && dur >= Math.min(600, (b - a) * 0.5) ? sum / dur : null);
  }
  return out;
}
/* history rows -> [{ t, v }]. Accepts the compact (s, a, lu) and long (state, attributes, last_updated) shapes. */
export function tempRows(rows) {
  const out = [];
  (rows || []).forEach((e) => {
    const st = e.s !== undefined ? e.s : e.state, a = e.a || e.attributes || {};
    const t = e.lu !== undefined ? e.lu : Date.parse(e.last_updated || e.last_changed) / 1000;
    if (!Number.isFinite(t)) return;
    out.push({ t, v: bad(st) ? null : num(a.current_temperature) });
  });
  return out.sort((x, y) => x.t - y.t);
}

const ClimateExt = {
  _clInit() {
    this.addCss('cards', CARDS_CSS);
    const pg = document.createElement('div'); pg.id = 'pgClimate'; pg.innerHTML = HTML();
    const $ = (id) => pg.querySelector('#' + id), c = this._c.climate;
    const cl = this._cl = { pg, $, fc: { daily: { t: 0 }, hourly: { t: 0 } }, hist: { t: 0 }, sig: {} };
    cl.th = (c.thermostats || []).filter((x) => x && isEnt(x.entity));
    cl.wx = isEnt(c.weather) ? c.weather : '';
    // rooms: the page's own list, else the temperature sensors of the Home house plan
    const own = (c.rooms || []).filter((r) => r && isEnt(r.temperature));
    const house = []; ((this._c.home.house || {}).floors || []).forEach((f) => (f.rooms || []).forEach((r) => { if (r && isEnt(r.temperature)) house.push(r); }));
    cl.rooms = (own.length ? own : house).map((r) => ({ name: r.name || this.name(r.temperature), entity: r.temperature }));
    $('clWx').classList.toggle('hide', !cl.wx); $('clTh').classList.toggle('hide', !cl.th.length); $('clHist').classList.toggle('hide', !cl.th.length); $('clRooms').classList.toggle('hide', !cl.rooms.length);
    if (cl.wx) this.tap($('clWx').querySelector('.cur'), () => this.moreInfo(cl.wx));
    // thermostat rows: name and "action · now 20.5°" on the left, − target + on the right
    const box = $('clThRows'); cl.rows = [];
    cl.th.forEach((x) => {
      const r = document.createElement('div'); r.className = 'tr';
      r.innerHTML = `<div class="l"><b></b><span class="sm soft">–</span></div><div class="ctl"><button type="button" class="sb" aria-label="${esc(S.lower)}">${icon('minus')}</button><span class="tv">–</span><button type="button" class="sb" aria-label="${esc(S.raise)}">${icon('plus')}</button></div>`;
      r.querySelector('.l b').textContent = x.name || this.name(x.entity);
      const [bm, bp] = r.querySelectorAll('button');
      bm.addEventListener('click', () => this._bump(x.entity, -1, x.step)); bp.addEventListener('click', () => this._bump(x.entity, 1, x.step));
      this.tap(r.querySelector('.l'), () => this.moreInfo(x.entity));
      box.appendChild(r); cl.rows.push({ x, r, sub: r.querySelector('.l span'), tv: r.querySelector('.tv'), bm, bp });
    });
    // boost: this page's own config, else the Home room panel's
    const B = this._boostCfg(c.boost); this._clBoost = null;
    if (cl.th.length && [B.start, B.timer, B.switch].some(isEnt)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'boost';
      b.addEventListener('click', () => this._toggleBoost(B)); $('clTh').appendChild(b); this._clBoost = { btn: b, cfg: B };
    }
    layoutCols(pg, WEIGHTS);
    return pg;
  },
  _clStop() { this._cl = null; this._clBoost = null; },
  _renderThermo() {
    const cl = this._cl; if (!cl) return;
    cl.rows.forEach(({ x, sub, tv, bm, bp }) => {
      const s = this.st(x.entity), ok = !!s && !bad(s.state), a = ok ? s.attributes : {};
      const tt = ok ? this.ov('t:' + x.entity, a.temperature) : null, cv = num(a.current_temperature);
      const act = HVAC[a.hvac_action] || (a.hvac_action ? cap(a.hvac_action) : ok ? cap(String(s.state).replace(/_/g, ' ')) : '');
      tv.textContent = tt != null ? Number(tt).toFixed(1) + '°' : '–';
      sub.textContent = ok ? [act, cv != null ? t('now_temp', { t: cv.toFixed(1) }) : ''].filter(Boolean).join(' · ') : '–';
      bm.disabled = bp.disabled = !ok || tt == null;
    });
  },

  /* ---------- weather ---------- */
  _clFeatures() { const s = this.st(this._cl.wx), f = s && Number(s.attributes.supported_features); return { daily: !!(f & 1), hourly: !!(f & 2) }; },
  async _clFetchForecast(type) {
    const cl = this._cl, slot = cl.fc[type]; if (!cl || slot.busy || !this._h) return;
    slot.busy = true;
    try {
      const r = await this._h.callWS({ type: 'call_service', domain: 'weather', service: 'get_forecasts', service_data: { type }, target: { entity_id: cl.wx }, return_response: true });
      const body = (r && r.response) || r || {}, f = body[cl.wx] && body[cl.wx].forecast;
      slot.items = Array.isArray(f) ? f : []; slot.err = !Array.isArray(f); slot.t = Date.now();
    } catch (e) { slot.err = true; slot.t = Date.now() - FORECAST_MS + RETRY_MS; }
    slot.busy = false;
    if (this._cl === cl) this._clRenderWeather();
  },
  _clRenderWeather() {
    const cl = this._cl; if (!cl || !cl.wx) return;
    const $ = cl.$, s = this.st(cl.wx), a = (s && s.attributes) || {}, ok = !!s && !bad(s.state), ft = this._clFeatures();
    const d0 = ft.daily && cl.fc.daily.items && cl.fc.daily.items[0];
    const temp = ok ? num(a.temperature) : null, fl = ok ? num(a.apparent_temperature) : null, w = ok ? num(a.wind_speed) : null, h = ok ? num(a.humidity) : null;
    $('clWxT').textContent = temp != null ? Math.round(temp) + '°' : '–';
    $('clWxP').textContent = ok ? (WX[s.state] || cap(String(s.state).replace(/[-_]/g, ' '))) : '–';
    $('clWxF').textContent = [fl != null ? t('feels_short', { t: Math.round(fl) }) : '', w != null ? t('wind_x', { w: Math.round(w) + (a.wind_speed_unit ? ' ' + a.wind_speed_unit : '') }) : ''].filter(Boolean).join(' · ');
    const hi = d0 ? num(d0.temperature) : null, lo = d0 ? num(d0.templow) : null, rp = d0 ? num(d0.precipitation_probability) : null;
    $('clWxL').textContent = [hi != null ? t('high_x', { h: Math.round(hi) }) : '', lo != null ? t('low_x', { l: Math.round(lo) }) : '', rp != null ? t('rain_x', { p: Math.round(rp) }) : '', h != null ? t('humidity_x', { h: Math.round(h) }) : ''].filter(Boolean).join(' · ');
    // 5-day row: weekday, high, low (rain chance, when the forecast has it, is in each cell's label)
    const dsig = JSON.stringify([ft.daily, cl.fc.daily.items, cl.fc.daily.err, this.lang()]);
    $('clDays').classList.toggle('hide', !ft.daily);
    if (ft.daily && cl.sig.days !== dsig) {
      cl.sig.days = dsig; const box = $('clDays'); box.innerHTML = '';
      const items = (cl.fc.daily.items || []).slice(0, 5);
      if (!items.length) box.innerHTML = `<div class="empty" style="flex:1">${esc(cl.fc.daily.err ? S.forecast_unavailable : S.forecast_loading)}</div>`;
      items.forEach((d) => {
        const dt = new Date(d.datetime), div = document.createElement('div'); div.className = 'd';
        let wd = ''; try { wd = dt.toLocaleDateString(this.lang(), { weekday: 'short' }); } catch (e) { wd = ''; }
        const hh = num(d.temperature), ll = num(d.templow), p = num(d.precipitation_probability);
        div.innerHTML = '<div class="sm"></div><div class="h"></div><div class="sm soft"></div>';
        const [n, b, l] = div.children; n.textContent = wd; b.textContent = hh != null ? Math.round(hh) + '°' : '–'; l.textContent = ll != null ? Math.round(ll) + '°' : '';
        div.setAttribute('aria-label', [wd, WX[d.condition] || '', hh != null ? Math.round(hh) + '°' : '', ll != null ? t('low_x', { l: Math.round(ll) }) : '', p != null ? t('rain_x', { p }) : ''].filter(Boolean).join(', '));
        if (p != null) div.title = t('rain_chance', { p });
        box.appendChild(div);
      });
    }
    // next 12 hours: bars (value in each bar's label), the hour every third bar
    $('clHoursBox').classList.toggle('hide', !ft.hourly);
    const hsig = JSON.stringify([ft.hourly, cl.fc.hourly.items, cl.fc.hourly.err, Math.floor(Date.now() / 3600000)]);
    if (ft.hourly && cl.sig.hours !== hsig) {
      cl.sig.hours = hsig; const box = $('clHours'), ax = $('clHrAx'); box.innerHTML = ''; ax.innerHTML = '';
      const from = Date.now() - 3600000, items = (cl.fc.hourly.items || []).filter((x) => Date.parse(x.datetime) >= from).slice(0, 12);
      if (!items.length) { box.style.display = 'block'; box.innerHTML = `<div class="empty">${esc(cl.fc.hourly.err ? S.forecast_unavailable : S.forecast_loading)}</div>`; }
      else {
        box.style.display = '';
        const vals = items.map((x) => num(x.temperature)), ok2 = vals.filter((v) => v != null), mn = Math.min(...ok2), mx = Math.max(...ok2), span = Math.max(1, mx - mn), lab = [];
        items.forEach((x, i) => {
          const v = vals[i], p = num(x.precipitation_probability), hr = pad(new Date(x.datetime).getHours()), bar = document.createElement('i');
          bar.style.height = v != null ? Math.round(36 + clamp((v - mn) / span, 0, 1) * 78) + 'px' : '4px';
          const txt = `${hr}:00 ${v != null ? Math.round(v) + '°' : '–'}${p != null ? ', ' + t('rain_x', { p }) : ''}`; bar.title = txt; lab.push(txt);
          box.appendChild(bar);
          const sp = document.createElement('span'); sp.textContent = i % 3 === 0 ? hr : ''; ax.appendChild(sp);
        });
        box.setAttribute('aria-label', S.next_12_hours + ': ' + lab.join(', '));
      }
    }
  },

  async _clFetchHistory() {
    const cl = this._cl; if (!cl || cl.hist.busy || !this._h || !cl.th.length) return;
    cl.hist.busy = true;
    const now = Date.now() / 1000, hour = Math.floor(now / 3600) * 3600, start = hour - 11 * 3600, ids = cl.th.map((x) => x.entity);
    try {
      // attributes are required (current_temperature is one): no minimal_response, no no_attributes
      const r = await this._h.callWS({ type: 'history/history_during_period', start_time: new Date(start * 1000).toISOString(), end_time: new Date(now * 1000).toISOString(), entity_ids: ids, include_start_time_state: true, significant_changes_only: false, minimal_response: false, no_attributes: false });
      cl.hist.data = {}; ids.forEach((id) => { cl.hist.data[id] = hourlyAverages(tempRows((r && r[id]) || []), start, 12, now); });
      cl.hist.start = start; cl.hist.err = false; cl.hist.t = Date.now();
    } catch (e) { cl.hist.err = true; cl.hist.t = Date.now() - HISTORY_MS + RETRY_MS; }
    cl.hist.busy = false;
    if (this._cl === cl) this._clRenderHistory();
  },
  _clRenderHistory() {
    const cl = this._cl; if (!cl || !cl.th.length) return;
    const body = cl.$('clHistBody'), lg = cl.$('clLg'), H = cl.hist, series = cl.th.slice(0, SERIES.length);
    const pair = LINE[this._dark ? 'dark' : this._classic ? 'classic' : 'light'], colour = (k) => (k < 2 ? pair[k] : SERIES[k].c);
    const sig = JSON.stringify([H.data, H.err, H.start, !!this._dark, !!this._classic]); if (cl.sig.hist === sig) return; cl.sig.hist = sig;
    body.innerHTML = ''; lg.innerHTML = '';
    const all = series.reduce((a, x) => a.concat(((H.data || {})[x.entity] || []).filter((v) => v != null)), []);
    if (!all.length) { body.innerHTML = `<div class="empty">${esc(H.err ? S.history_unavailable : H.data ? S.no_history : S.forecast_loading)}</div>`; return; }
    // the mockup's chart: 332 × 124, grid from x 30 to 326, labels in the left 30 px
    const W = 332, HT = 124, L = 30, R = 326, T = 8, B = 100;
    let lo = Math.floor(Math.min(...all) - 0.3), hi = Math.ceil(Math.max(...all) + 0.3); if ((hi - lo) % 2) hi += 1; if (hi - lo < 2) hi = lo + 2;
    const X = (i) => L + i * ((R - L) / 11), Y = (v) => B - ((v - lo) / (hi - lo)) * (B - T), ink = 'rgba(var(--oriel-ink),var(--oriel-soft,.62))';
    const svg = el('svg', { viewBox: `0 0 ${W} ${HT}`, role: 'img' }, body);
    [lo, (lo + hi) / 2, hi].forEach((v) => {
      el('line', { x1: L, x2: R, y1: Y(v), y2: Y(v), stroke: 'rgba(var(--oriel-ink),.2)', 'stroke-width': 1 }, svg);
      const tx = el('text', { x: 0, y: Y(v) + 4, 'font-size': 12, fill: ink }, svg); tx.textContent = v + '°';
    });
    [0, 4, 8, 11].forEach((i) => {
      const tx = el('text', { x: X(i), y: 120, 'text-anchor': i === 11 ? 'end' : 'middle', 'font-size': 12, fill: ink }, svg);
      tx.textContent = pad(new Date((H.start + i * 3600) * 1000).getHours()) + ':00';
    });
    const desc = [];
    series.forEach((x, k) => {
      const st = SERIES[k], vals = (H.data || {})[x.entity] || [], col = colour(k);
      let seg = [];
      const flush = () => {
        if (seg.length > 1) el('path', { d: 'M' + seg.map((p) => p.join(',')).join(' L'), fill: 'none', stroke: col, 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
        if (seg.length === 1) mark(svg, st.m, seg[0][0], seg[0][1], col); /* a lone hour has no line, so it gets its marker */
        seg = [];
      };
      vals.forEach((v, i) => { if (v == null) flush(); else seg.push([X(i), Y(v)]); }); flush();
      const li = vals.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop();
      if (li !== undefined && li >= 0) { mark(svg, st.m, X(li), Y(vals[li]), col); desc.push((x.name || this.name(x.entity)) + ' ' + vals[li].toFixed(1) + '°'); }
      const item = document.createElement('span'); item.innerHTML = `<svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true"></svg><span></span>`;
      const ls = item.querySelector('svg'); el('path', { d: 'M1 6H29', stroke: col, 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' }, ls); mark(ls, st.m, 15, 6, col);
      item.lastChild.textContent = x.name || this.name(x.entity); lg.appendChild(item);
    });
    svg.setAttribute('aria-label', S.last_12_hours + ': ' + desc.join(', '));
  },

  /* ---------- rooms ---------- */
  _clRenderRooms() {
    const cl = this._cl; if (!cl || !cl.rooms.length) return;
    const rows = cl.rooms.map((r) => { const s = this.st(r.entity), v = s && !bad(s.state) ? num(s.state) : null; return { r, v, f: s && s.attributes.unit_of_measurement === '°F' }; });
    const sig = JSON.stringify(rows.map((x) => [x.r.entity, x.v])); if (cl.sig.rooms === sig) return; cl.sig.rooms = sig;
    const box = cl.$('clRl'); box.innerHTML = '';
    rows.forEach(({ r, v, f }) => {
      const lo = f ? 54 : 12, hi = f ? 75 : 24, div = document.createElement('div'); div.className = 'rr tap';
      div.innerHTML = `<span class="nm"></span><span class="bar"><i></i></span><b></b>`;
      div.querySelector('.nm').textContent = r.name; div.querySelector('b').textContent = v != null ? v.toFixed(1) + '°' : '–';
      div.querySelector('i').style.transform = `scaleX(${v != null ? clamp((v - lo) / (hi - lo), 0.03, 1) : 0})`;
      this.tap(div, () => this.moreInfo(r.entity)); div.setAttribute('aria-label', r.name + ' ' + (v != null ? v.toFixed(1) + '°' : '–'));
      box.appendChild(div);
    });
    const ok = rows.filter((x) => x.v != null).sort((a, b) => a.v - b.v), ex = cl.$('clEx'); ex.innerHTML = '';
    ex.classList.toggle('hide', ok.length < 2);
    if (ok.length >= 2) [['coldest_x', ok[0]], ['warmest_x', ok[ok.length - 1]]].forEach(([k, x]) => { const d = document.createElement('div'); d.textContent = t(k, { n: x.r.name, t: x.v.toFixed(1) }); ex.appendChild(d); });
  },

  _updateClimate() {
    const cl = this._cl; if (!cl || !this._h) return;
    const now = Date.now();
    if (cl.wx) {
      const f = this._clFeatures();
      if (f.daily && now - cl.fc.daily.t > FORECAST_MS) this._clFetchForecast('daily');
      if (f.hourly && now - cl.fc.hourly.t > FORECAST_MS) this._clFetchForecast('hourly');
      this._clRenderWeather();
    }
    if (cl.th.length) { this._renderThermo(); if (now - cl.hist.t > HISTORY_MS) this._clFetchHistory(); }
    this._clRenderRooms(); this._renderBoost();
  },
};

registerPage({
  key: 'climate', icon: 'thermo',
  label() { return S.page_climate; },
  css: CSS,
  enabled(c) { return hasEntities(c.climate); },
  init() { return this._clInit(); },
  update() { this._updateClimate(); },
  stop() { this._clStop(); },
  methods: ClimateExt,
});
