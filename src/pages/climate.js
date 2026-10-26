/* Climate page: weather and forecasts, thermostats (with the heating boost), the last 12 hours of each
   thermostat's current temperature, and room temperatures. Every card is optional.
   Forecasts come from weather.get_forecasts (websocket call_service with a response), cached; the history is
   one history/history_during_period request WITH attributes, because current_temperature is an attribute. */
import { registerPage } from '../core.js';
import { S, t, HVAC, WX } from '../strings.js';
import { hasEntities } from '../config.js';
import { isEnt, bad, cap, esc, pad, clamp, el, icon } from '../util.js';
import { CARDS_CSS, layoutCols } from './cards.js';

const FORECAST_MS = 30 * 60000, HISTORY_MS = 5 * 60000, RETRY_MS = 5 * 60000;
const CSS = `
#clWx .now{display:flex;align-items:center;gap:14px;margin-top:2px}
#clWx .now .ic{width:40px;height:40px;stroke-width:1.4}
#clWx .now b{font-size:64px;font-weight:200;line-height:1;font-variant-numeric:tabular-nums}
#clWx .now div{display:flex;flex-direction:column;gap:2px;min-width:0} #clWx .now span{font-size:15px}
#clWx .facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
#clWx .fact{border-radius:16px;background:rgba(var(--oriel-glass),.34);border:1px solid rgba(var(--oriel-glass),.5);padding:8px 10px;display:flex;flex-direction:column;gap:2px;min-width:0}
#clWx .fact small{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))} #clWx .fact b{font-size:15px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#clWx .sec{margin:4px 0 -2px;padding:0}
#clDays{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
#clDays .d{border-radius:16px;background:rgba(var(--oriel-glass),.28);border:1px solid rgba(var(--oriel-glass),.45);padding:8px 2px;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:13px;min-width:0}
#clDays .d small{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));white-space:nowrap}
#clDays .d .ic{width:22px;height:22px}
#clHours{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:3px;align-items:end;height:150px}
#clHours .h{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;height:100%;font-size:12px;font-variant-numeric:tabular-nums}
#clHours .h i{display:block;width:100%;max-width:22px;border-radius:6px 6px 3px 3px;background:rgb(var(--oriel-accent-strong))}
#clHours .h small{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}
#clTh .tr{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:8px;align-items:center;min-height:56px;border-top:1px solid rgba(var(--oriel-ink),.09)}
#clTh .tr:first-of-type{border-top:0}
#clTh .tr .l{display:flex;flex-direction:column;min-width:0;min-height:44px;justify-content:center} #clTh .tr .l b{font-weight:400;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#clTh .tr .v{display:flex;flex-direction:column;align-items:flex-end;min-width:70px} #clTh .tr .v b{font-size:26px;font-weight:200;line-height:1.1;font-variant-numeric:tabular-nums}
#clTh .tr .round:disabled{opacity:.4;cursor:default}
#clTh .boost{width:100%;height:40px;margin-top:2px}
#clHistBody svg{width:100%;height:auto;overflow:visible}
#clHist .lg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px} #clHist .lg span{display:inline-flex;align-items:center;gap:6px}
#clRooms .rr{display:grid;grid-template-columns:minmax(0,1fr) 110px 52px;gap:10px;align-items:center;min-height:44px;font-size:14px;border-top:1px solid rgba(var(--oriel-ink),.09)}
#clRooms .rr:first-of-type{border-top:0}
#clRooms .rr .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#clRooms .rr .bar{height:8px;border-radius:4px;background:rgba(var(--oriel-ink),.12);overflow:hidden} #clRooms .rr .bar i{display:block;height:100%;border-radius:4px;background:rgb(var(--oriel-accent-strong));transform-origin:0 50%}
#clRooms .rr b{font-weight:400;text-align:right;font-variant-numeric:tabular-nums}
#clRooms .rl{flex:1;min-height:0;overflow-y:auto}
#clRooms .ex{display:flex;flex-direction:column;gap:4px;font-size:13.5px;border-top:1px solid rgba(var(--oriel-ink),.09);padding-top:10px}
`;
const HTML = () => `<div class="pgc" id="clWrap"><div class="cols">
  <div class="col" id="clC1"><section id="clWx" class="card grow glass mid"><div class="hd"><span>${esc(S.weather_title)}</span><small id="clWxS"></small></div>
    <div class="now"><span id="clWxI"></span><b id="clWxT">–</b><div><span id="clWxC">–</span><small class="soft" id="clWxF"></small></div></div>
    <div class="facts"><div class="fact" id="clWind"><small>${esc(S.wind)}</small><b>–</b></div><div class="fact" id="clHum"><small>${esc(S.humidity)}</small><b>–</b></div><div class="fact" id="clHL"><small>${esc(S.high_low_label)}</small><b>–</b></div></div>
    <div id="clDaysBox"><div class="sec soft">${esc(S.next_5_days)}</div><div id="clDays"></div></div>
    <div id="clHoursBox"><div class="sec soft">${esc(S.next_12_hours)}</div><div id="clHours" role="img"></div></div></section></div>
  <div class="col" id="clC2"><section id="clTh" class="card glass mid"><div class="hd"><span>${esc(S.thermostats)}</span></div><div id="clThRows"></div></section>
    <section id="clHist" class="card grow glass mid"><div class="hd"><span>${esc(S.last_12_hours)}</span><small>${esc(S.hourly_average)}</small></div><div id="clHistBody"></div><div class="lg" id="clLg"></div></section></div>
  <div class="col" id="clC3"><section id="clRooms" class="card grow glass mid"><div class="hd"><span>${esc(S.rooms)}</span></div><div class="rl" id="clRl"></div><div class="ex" id="clEx"></div></section></div>
</div></div>`;

const wxIcon = (c) => (/sunny|clear/.test(c) ? 'sun' : /rain|pour|lightning|hail|snowy/.test(c) ? 'rain' : 'cloud');
/* series styles: colour token + dash + marker shape, so a line is never told apart by colour alone */
const SERIES = [
  { c: 'rgb(var(--oriel-accent-strong))', d: '', m: 'circle' }, { c: 'rgba(var(--oriel-ink),.85)', d: '7 4', m: 'square' },
  { c: 'rgb(var(--oriel-bad-strong))', d: '2 4', m: 'diamond' }, { c: 'rgb(var(--oriel-accent-ink))', d: '10 3 2 3', m: 'triangle' },
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
    if (cl.wx) this.tap($('clWx').querySelector('.now'), () => this.moreInfo(cl.wx));
    // thermostat rows
    const box = $('clThRows'); cl.rows = [];
    cl.th.forEach((x) => {
      const r = document.createElement('div'); r.className = 'tr';
      r.innerHTML = `<div class="l"><b></b><small class="soft">–</small></div><div class="v"><b>–</b><small class="soft"></small></div><button type="button" class="round sm" aria-label="${esc(S.lower)}">${icon('minus')}</button><button type="button" class="round sm" aria-label="${esc(S.raise)}">${icon('plus')}</button>`;
      r.querySelector('.l b').textContent = x.name || this.name(x.entity);
      const [bm, bp] = r.querySelectorAll('button');
      bm.addEventListener('click', () => this._bump(x.entity, -1, x.step)); bp.addEventListener('click', () => this._bump(x.entity, 1, x.step));
      this.tap(r.querySelector('.l'), () => this.moreInfo(x.entity));
      box.appendChild(r); cl.rows.push({ x, r, sub: r.querySelector('.l small'), cur: r.querySelector('.v b'), tgt: r.querySelector('.v small'), bm, bp });
    });
    // boost: this page's own config, else the Home room panel's
    const B = this._boostCfg(c.boost); this._clBoost = null;
    if (cl.th.length && [B.start, B.timer, B.switch].some(isEnt)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'boost';
      b.addEventListener('click', () => this._toggleBoost(B)); $('clTh').appendChild(b); this._clBoost = { btn: b, cfg: B };
    }
    layoutCols(pg);
    return pg;
  },
  _clStop() { this._cl = null; this._clBoost = null; },
  _renderThermo() {
    const cl = this._cl; if (!cl) return;
    cl.rows.forEach(({ x, sub, cur, tgt, bm, bp }) => {
      const s = this.st(x.entity), ok = !!s && !bad(s.state);
      const a = ok ? s.attributes : {}, tt = ok ? this.ov('t:' + x.entity, a.temperature) : null, cv = num(a.current_temperature);
      cur.textContent = cv != null ? cv.toFixed(1) + '°' : '–';
      tgt.textContent = tt != null ? t('target_x', { t: Number(tt).toFixed(1) }) : '';
      sub.textContent = ok ? (HVAC[a.hvac_action] || (a.hvac_action ? cap(a.hvac_action) : cap(String(s.state).replace(/_/g, ' ')))) : '–';
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
    const temp = ok ? num(a.temperature) : null, fl = ok ? num(a.apparent_temperature) : null;
    $('clWxT').textContent = temp != null ? Math.round(temp) + '°' : '–';
    $('clWxI').innerHTML = ok ? icon(wxIcon(s.state)) : icon('cloud');
    $('clWxC').textContent = ok ? (WX[s.state] || cap(String(s.state).replace(/[-_]/g, ' '))) : '–';
    $('clWxF').textContent = fl != null ? t('feels_like', { t: Math.round(fl) }) : '';
    const w = ok ? num(a.wind_speed) : null, h = ok ? num(a.humidity) : null;
    $('clWind').lastChild.textContent = w != null ? Math.round(w) + (a.wind_speed_unit ? ' ' + a.wind_speed_unit : '') : '–';
    $('clHum').lastChild.textContent = h != null ? Math.round(h) + '%' : '–';
    const hi = d0 ? num(d0.temperature) : null, lo = d0 ? num(d0.templow) : null;
    $('clHL').classList.toggle('hide', !ft.daily);
    $('clHL').lastChild.textContent = hi != null && lo != null ? t('high_low', { h: Math.round(hi), l: Math.round(lo) }) : hi != null ? t('high_only', { h: Math.round(hi) }) : lo != null ? t('low_only', { l: Math.round(lo) }) : '–';
    // 5-day row
    const dsig = JSON.stringify([ft.daily, cl.fc.daily.items, cl.fc.daily.err, this.lang()]);
    $('clDaysBox').classList.toggle('hide', !ft.daily);
    if (ft.daily && cl.sig.days !== dsig) {
      cl.sig.days = dsig; const box = $('clDays'); box.innerHTML = '';
      const items = (cl.fc.daily.items || []).slice(0, 5);
      if (!items.length) box.innerHTML = `<div class="empty" style="grid-column:1/-1">${esc(cl.fc.daily.err ? S.forecast_unavailable : S.forecast_loading)}</div>`;
      items.forEach((d) => {
        const dt = new Date(d.datetime), div = document.createElement('div'); div.className = 'd';
        let wd = ''; try { wd = dt.toLocaleDateString(this.lang(), { weekday: 'short' }); } catch (e) { wd = ''; }
        const hh = num(d.temperature), ll = num(d.templow), rp = num(d.precipitation_probability);
        div.innerHTML = `<span></span>${icon(wxIcon(d.condition || ''))}<b></b><small></small><small></small>`;
        const [n, , b, s1, s2] = div.childNodes; n.textContent = wd; b.textContent = hh != null ? Math.round(hh) + '°' : '–'; b.style.fontWeight = 400;
        s1.textContent = ll != null ? Math.round(ll) + '°' : ''; if (rp != null) { s2.textContent = rp + '%'; s2.title = t('rain_chance', { p: rp }); } else s2.remove();
        div.setAttribute('aria-label', [wd, WX[d.condition] || '', hh != null ? Math.round(hh) + '°' : '', rp != null ? t('rain_chance', { p: rp }) : ''].filter(Boolean).join(', '));
        box.appendChild(div);
      });
    }
    // next 12 hours: bars, the value above and the hour below; rain chance only if the forecast has it
    $('clHoursBox').classList.toggle('hide', !ft.hourly);
    const hsig = JSON.stringify([ft.hourly, cl.fc.hourly.items, cl.fc.hourly.err, Math.floor(Date.now() / 3600000)]);
    if (ft.hourly && cl.sig.hours !== hsig) {
      cl.sig.hours = hsig; const box = $('clHours'); box.innerHTML = '';
      const from = Date.now() - 3600000, items = (cl.fc.hourly.items || []).filter((x) => Date.parse(x.datetime) >= from).slice(0, 12);
      if (!items.length) { box.style.display = 'block'; box.innerHTML = `<div class="empty">${esc(cl.fc.hourly.err ? S.forecast_unavailable : S.forecast_loading)}</div>`; }
      else {
        box.style.display = '';
        const vals = items.map((x) => num(x.temperature)), ok2 = vals.filter((v) => v != null), mn = Math.min(...ok2) - 2, mx = Math.max(...ok2), span = Math.max(1, mx - mn);
        const rain = items.some((x) => num(x.precipitation_probability) != null);
        const lab = [];
        items.forEach((x, i) => {
          const v = vals[i], col = document.createElement('div'); col.className = 'h';
          col.innerHTML = `<span></span><i></i>${rain ? '<small></small>' : ''}<small></small>`;
          const [top, bar] = col.children; top.textContent = v != null ? Math.round(v) + '°' : '–';
          bar.style.height = v != null ? Math.round(clamp((v - mn) / span, 0.05, 1) * 84) + 'px' : '2px';
          const sm = col.querySelectorAll('small'); sm[sm.length - 1].textContent = pad(new Date(x.datetime).getHours());
          if (rain) { const p = num(x.precipitation_probability); sm[0].textContent = p != null ? p + '%' : ''; if (p != null) sm[0].title = t('rain_chance', { p }); }
          lab.push(`${pad(new Date(x.datetime).getHours())}:00 ${v != null ? Math.round(v) + '°' : '–'}`);
          box.appendChild(col);
        });
        box.setAttribute('aria-label', S.next_12_hours + ': ' + lab.join(', '));
      }
    }
  },

  /* ---------- last 12 hours ---------- */
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
    const sig = JSON.stringify([H.data, H.err, H.start]); if (cl.sig.hist === sig) return; cl.sig.hist = sig;
    body.innerHTML = ''; lg.innerHTML = '';
    const all = series.reduce((a, x) => a.concat(((H.data || {})[x.entity] || []).filter((v) => v != null)), []);
    if (!all.length) { body.innerHTML = `<div class="empty">${esc(H.err ? S.history_unavailable : H.data ? S.no_history : S.forecast_loading)}</div>`; return; }
    const W = 336, HT = 150, L = 34, R = 8, T = 10, B = 22, mn = Math.floor(Math.min(...all) * 2) / 2 - 0.5, mx = Math.ceil(Math.max(...all) * 2) / 2 + 0.5;
    const X = (i) => L + (i + 0.5) * ((W - L - R) / 12), Y = (v) => T + (1 - (v - mn) / (mx - mn)) * (HT - T - B);
    const svg = el('svg', { viewBox: `0 0 ${W} ${HT}`, role: 'img' }, body);
    [mn, (mn + mx) / 2, mx].forEach((v) => {
      el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: 'rgba(var(--oriel-ink),.12)', 'stroke-width': 1 }, svg);
      const tx = el('text', { x: L - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 12, fill: 'rgba(var(--oriel-ink),var(--oriel-soft,.62))' }, svg); tx.textContent = (Math.round(v * 2) / 2) + '°';
    });
    for (let i = 0; i < 12; i += 3) { const tx = el('text', { x: X(i), y: HT - 5, 'text-anchor': 'middle', 'font-size': 12, fill: 'rgba(var(--oriel-ink),var(--oriel-soft,.62))' }, svg); tx.textContent = pad(new Date((H.start + i * 3600) * 1000).getHours()) + ':00'; }
    const lastT = el('text', { x: X(11), y: HT - 5, 'text-anchor': 'middle', 'font-size': 12, fill: 'rgba(var(--oriel-ink),var(--oriel-soft,.62))' }, svg); lastT.textContent = S.now_label || 'Now';
    const desc = [];
    series.forEach((x, k) => {
      const st = SERIES[k], vals = (H.data || {})[x.entity] || [], col = st.c;
      let seg = [];
      const flush = () => {
        if (seg.length > 1) el('path', { d: 'M' + seg.map((p) => p.join(',')).join(' L'), fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-dasharray': st.d, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
        if (seg.length === 1) mark(svg, st.m, seg[0][0], seg[0][1], col); /* a lone hour has no line, so it gets its marker */
        seg = [];
      };
      vals.forEach((v, i) => { if (v == null) flush(); else seg.push([X(i), Y(v)]); }); flush();
      const li = vals.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop();
      if (li !== undefined && li >= 0) { mark(svg, st.m, X(li), Y(vals[li]), col); desc.push((x.name || this.name(x.entity)) + ' ' + vals[li].toFixed(1) + '°'); }
      const item = document.createElement('span'); item.innerHTML = `<svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true"></svg><span></span>`;
      const ls = item.querySelector('svg'); el('path', { d: 'M1 6H29', stroke: col, 'stroke-width': 2, 'stroke-dasharray': st.d, fill: 'none', 'stroke-linecap': 'round' }, ls); mark(ls, st.m, 15, 6, col);
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
      const lo = f ? 50 : 10, hi = f ? 86 : 30, div = document.createElement('div'); div.className = 'rr tap';
      div.innerHTML = `<span class="nm"></span><span class="bar"><i></i></span><b></b>`;
      div.querySelector('.nm').textContent = r.name; div.querySelector('b').textContent = v != null ? v.toFixed(1) + '°' : '–';
      div.querySelector('i').style.transform = `scaleX(${v != null ? clamp((v - lo) / (hi - lo), 0.03, 1) : 0})`;
      this.tap(div, () => this.moreInfo(r.entity)); div.setAttribute('aria-label', r.name + ' ' + (v != null ? v.toFixed(1) + '°' : '–'));
      box.appendChild(div);
    });
    const ok = rows.filter((x) => x.v != null).sort((a, b) => a.v - b.v), ex = cl.$('clEx'); ex.innerHTML = '';
    ex.classList.toggle('hide', ok.length < 2);
    if (ok.length >= 2) {
      [['coldest_x', ok[0]], ['warmest_x', ok[ok.length - 1]]].forEach(([k, x]) => { const d = document.createElement('div'); d.textContent = t(k, { n: x.r.name, t: x.v.toFixed(1) }); ex.appendChild(d); });
    }
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
