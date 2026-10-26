/* System page (sliders icon at the bottom of the rail, always shown). Read-only status of Home Assistant, the host,
   backups, connections and things that need attention, Nova (when enabled), tablet buttons, the Oriel version,
   and an optional debug panel listing configured entities that are missing or unavailable. */
import { registerPage, VERSION } from '../core.js';
import { S, t } from '../strings.js';
import { entitiesIn } from '../config.js';
import { isEnt, bad, pad, tidy, esc } from '../util.js';

const P = {
  reload: 'M20 12a8 8 0 11-2.4-5.7M20 4v5h-5', exit: 'M9 4H5v16h4M15 8l4 4-4 4M19 12H9', gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .6-1.4-1.4.6-2-3-1-1 2h-2l-1-2-3 1 .6 2L6 8.6 4 8 3 11l2 1v2l-2 1 1 3 2-.6 1.4 1.4-.6 2 3 1 1-2h2l1 2 3-1-.6-2 1.4-1.4 2 .6 1-3-2-1z',
  moon: 'M20 14A8 8 0 0110 4a8 8 0 1010 10z',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;
const num = (s) => { const v = parseFloat(s); return isNaN(v) ? null : v; };
const span = (v) => {
  const d = new Date(v); if (!v || isNaN(d)) return '';
  let m = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000)); const dd = Math.floor(m / 1440); m -= dd * 1440; const hh = Math.floor(m / 60);
  return dd ? dd + ' d ' + hh + ' h' : hh + ' h ' + (m - hh * 60) + ' m';
};
const nice = (n) => String(n || '').replace(/\s*(battery( percentage)?|ms battery)$/i, '').replace(/\s+/g, ' ').trim() || n;

const CSS = `
#syWrap{position:absolute;left:var(--dx,0px);top:0;width:1280px;height:800px;pointer-events:none}
#syWrap>*{pointer-events:auto}
#pgSystem .abs{position:absolute}
#pgSystem .ic{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}
#pgSystem .hd{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500;gap:8px}
#pgSystem .hd small{font-size:12px;font-weight:400;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}
#pgSystem .dark .hd small{color:rgba(var(--oriel-on-dark),.6)}
#pgSystem .card{padding:16px 18px;overflow:hidden}
#pgSystem .big{font-size:30px;font-weight:200;line-height:1.1;margin:8px 0 4px;display:flex;align-items:center;gap:10px}
#pgSystem .row{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13.5px;padding:7px 0;border-top:1px solid rgba(var(--oriel-ink),.09);min-height:34px}
#pgSystem .row.nb{border-top:0}
#pgSystem .row>span{color:rgba(var(--oriel-ink),.68);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pgSystem .row>b{font-weight:500;white-space:nowrap}
#pgSystem .dark .row{border-top-color:rgba(var(--oriel-on-dark),.12)} #pgSystem .dark .row>span{color:rgba(var(--oriel-on-dark),.65)}
#pgSystem .tap{cursor:pointer}
#pgSystem .pill{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:12px;font-size:12px;font-weight:500;background:rgba(var(--oriel-glass),.6);white-space:nowrap}
#pgSystem .pill.ok{background:rgb(var(--oriel-good-bg));color:rgb(var(--oriel-good-ink))} #pgSystem .pill.warn{background:rgb(var(--oriel-warn-bg-2));color:rgb(var(--oriel-warn-ink))} #pgSystem .pill.red{background:rgb(var(--oriel-bad-bg-2));color:rgb(var(--oriel-bad-ink-2))}
#pgSystem .bar{height:8px;border-radius:4px;background:rgba(var(--oriel-ink),.12);margin:2px 0 6px;overflow:hidden}
#pgSystem .bar i{display:block;height:100%;border-radius:4px;background:rgb(var(--oriel-good-bar));transform:translateX(-100%);transition:transform .4s}
#pgSystem .bar i.mid{background:rgb(var(--oriel-warn-mark))} #pgSystem .bar i.hi{background:rgb(var(--oriel-bad-mark))}
#pgSystem .btn{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:13px 14px;margin-bottom:10px;border:1px solid rgba(var(--oriel-glass),.7);border-radius:18px;background:rgba(var(--oriel-glass),.5);color:rgb(var(--oriel-ink));font-size:14.5px;font-weight:500;cursor:pointer}
#pgSystem .btn small{display:block;font-size:12px;font-weight:400;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));margin-top:1px}
#pgSystem .btn:active{background:rgba(var(--oriel-glass),.8)}
#pgSystem button{font-family:inherit}
#syToast{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);background:rgb(var(--oriel-ink-fill));color:rgb(var(--oriel-on-dark));border-radius:18px;padding:10px 18px;font-size:13.5px;opacity:0;pointer-events:none;transition:opacity .2s}
#syToast.on{opacity:1}
#syHA{left:100px;top:84px;width:380px;height:214px} #syHost{left:100px;top:312px;width:380px;height:232px} #syConn{left:100px;top:558px;width:380px;height:150px}
#syAtt{left:496px;top:84px;width:400px;height:300px} #syNova{left:496px;top:398px;width:400px;height:262px}
#syTab{left:912px;top:84px;width:268px;height:420px}
#syDbg{left:912px;top:516px;width:344px;height:260px;display:flex;flex-direction:column}
#syDbgL{flex:1;min-height:0;overflow-y:auto;margin-top:6px}
#syDbgL .row{font-size:12px;min-height:28px;padding:4px 0}
#syDbgL .row>span{font-family:ui-monospace,Menlo,monospace;font-size:12px}
`;
const HTML = () => `<div id="syWrap">
  <div id="syHA" class="abs glass mid card"><div class="hd"><span>Home Assistant</span><small id="syVer"></small></div>
    <div class="big" id="syHealth">-</div>
    <div class="row" id="syUpR"><span>${esc(S.up_for)}</span><b id="syUp">-</b></div><div class="row" id="syBkR"><span>${esc(S.backup)}</span><b id="syBk">-</b></div><div class="row"><span>${esc(S.updates_waiting)}</span><b id="syUpd">-</b></div></div>
  <div id="syHost" class="abs glass mid card"><div class="hd"><span>${esc(S.host)}</span></div>
    <div id="syHostRows"></div></div>
  <div id="syConn" class="abs glass mid card"><div class="hd"><span>${esc(S.connections)}</span></div><div id="syConnRows"></div></div>
  <div id="syAtt" class="abs glass mid card"><div class="hd"><span>${esc(S.needs_attention)}</span><small id="syAttS"></small></div>
    <div class="row nb"><span>${esc(S.low_batteries)}</span><span class="pill" id="syLowN">-</span></div><div id="syLow"></div>
    <div class="row"><span>${esc(S.entities_unavailable)}</span><span class="pill" id="syUnN">-</span></div><div id="syUn"></div></div>
  <div id="syNova" class="abs dark card"><div class="hd"><span>Nova</span></div>
    <div class="big" id="syNv">-</div>
    <div class="row"><span>${esc(S.quiet_mode)}</span><b id="syNq">-</b></div><div class="row"><span>${esc(S.lockdown)}</span><b id="syNl">-</b></div>
    <div class="row"><span>${esc(S.suggestions_waiting)}</span><b id="syNs">-</b></div><div class="row"><span>${esc(S.next_reminder)}</span><b id="syNr">-</b></div></div>
  <div id="syTab" class="abs glass mid card"><div class="hd"><span>${esc(S.tablet)}</span></div><div style="height:10px"></div>
    <button class="btn" id="syBtnR">${ic('reload')}<span>${esc(S.reload_dashboard)}<small>${esc(S.reload_hint)}</small></span></button>
    <button class="btn" id="syBtnK">${ic('exit')}<span>${esc(S.show_header)}<small>${esc(S.show_header_hint)}</small></span></button>
    <button class="btn" id="syBtnS">${ic('gear')}<span>${esc(S.ha_settings)}<small>${esc(S.ha_settings_hint)}</small></span></button>
    <button class="btn" id="syBtnN">${ic('moon')}<span>${esc(S.nova_nap)}<small>${esc(S.nova_nap_hint)}</small></span></button>
    <div class="hd" style="margin-top:18px"><span>Oriel</span><small>v${VERSION}</small></div></div>
  <div id="syDbg" class="abs glass mid card"><div class="hd"><span>${esc(S.debug)}</span><small id="syDbgS"></small></div><div id="syDbgL"></div></div>
  <div id="syToast" role="status"></div>
</div>`;

const SystemExt = {
  _syInitPage() {
    const pg = document.createElement('div');
    pg.id = 'pgSystem'; pg.innerHTML = HTML();
    const $ = (id) => pg.querySelector('#' + id);
    const c = this._syc = this._c.system, g = this._c.general;
    this._sy = { pg, $, toastT: null, tick: null };
    const H = c.host || {}, U = c.updates || {}, B = c.backups || {};
    $('syBtnR').addEventListener('click', () => { try { location.reload(); } catch (e) { /* nothing */ } });
    $('syBtnK').addEventListener('click', () => {
      const base = g.kiosk_path || (location.pathname.replace(/\/+$/, '') || '/');
      this.navigate(base + '?disable_km'); setTimeout(() => { try { location.reload(); } catch (e) { /* nothing */ } }, 150);
    });
    $('syBtnS').addEventListener('click', () => this.navigate(g.settings_path || '/config'));
    $('syBtnN').addEventListener('click', async () => {
      try { await this.call('nova', 'nap', { duration_minutes: 60 }); this._syToast(S.nova_napping); }
      catch (e) { this._syToast(S.nap_failed); console.warn('[oriel] system nap', e); }
    });
    // host rows: only the ones configured
    const hr = $('syHostRows');
    [['cpu', S.processor, true], ['memory', S.memory, true], ['disk', S.disk, true], ['cpu_temperature', S.processor_temp, false]].forEach(([k, label, withBar]) => {
      if (!isEnt(H[k])) return;
      hr.insertAdjacentHTML('beforeend', `<div class="row nb tap" data-k="${k}"${withBar ? ' style="padding-bottom:0"' : ''}><span></span><b id="sy_${k}">-</b></div>${withBar ? `<div class="bar"><i id="sy_${k}B"></i></div>` : ''}`);
      const row = hr.querySelector(`[data-k="${k}"]`); row.firstChild.textContent = label; this.tap(row, () => this.moreInfo(H[k]));
    });
    $('syHost').classList.toggle('hide', !hr.children.length);
    // connections
    const cr = $('syConnRows'); this._sy.conn = [];
    (c.connections || []).filter((x) => x && isEnt(x.entity)).forEach((x, i) => {
      const row = document.createElement('div'); row.className = 'row tap' + (i ? '' : ' nb'); row.innerHTML = '<span></span><b>-</b>'; row.firstChild.textContent = x.name || this.name(x.entity);
      this.tap(row, () => this.moreInfo(x.entity)); cr.appendChild(row); this._sy.conn.push({ x, b: row.lastChild });
    });
    if (isEnt(B.stale)) {
      const row = document.createElement('div'); row.className = 'row tap' + (cr.children.length ? '' : ' nb'); row.innerHTML = `<span>${esc(S.backups)}</span><b id="syBkS">-</b>`;
      this.tap(row, () => this.moreInfo(B.stale)); cr.appendChild(row);
    }
    $('syConn').classList.toggle('hide', !cr.children.length);
    // Home Assistant card
    this.tap($('syUpR'), () => this.moreInfo(H.uptime)); $('syUpR').classList.toggle('hide', !isEnt(H.uptime));
    this.tap($('syBkR'), () => this.moreInfo(B.last)); $('syBkR').classList.toggle('hide', !isEnt(B.last));
    // left column stacks without gaps
    let y = 84; [['syHA', 214], ['syHost', 232], ['syConn', 150]].forEach(([id, h]) => { const n = $(id); if (n.classList.contains('hide')) return; n.style.top = y + 'px'; y += h + 14; });
    // Nova (only when enabled), debug panel (only when asked for)
    const nova = this._c.nova.enabled;
    $('syNova').classList.toggle('hide', !nova); $('syBtnN').classList.toggle('hide', !nova);
    const NE = this._c.nova.entities;
    [['syNv', NE.status], ['syNq', NE.quiet], ['syNl', NE.lockdown], ['syNs', NE.suggestions], ['syNr', NE.reminders]].forEach(([id, ent]) => { const n = $(id); if (n && isEnt(ent)) { const row = n.closest('.row') || n; row.classList.add('tap'); this.tap(row, () => this.moreInfo(ent)); } });
    $('syDbg').classList.toggle('hide', !c.debug_panel);
    this._sy.tick = setInterval(() => { if (this._page === 'system') { try { this._updateSystem(); } catch (e) { /* next tick */ } } }, 30000);
    return pg;
  },
  _syToast(tx) {
    const n = this._sy.$('syToast'); if (!n) return; n.textContent = tx; n.classList.add('on');
    clearTimeout(this._sy.toastT); this._sy.toastT = setTimeout(() => n.classList.remove('on'), 3000);
  },
  _syStop() { if (this._sy && this._sy.tick) { clearInterval(this._sy.tick); this._sy.tick = null; } },
  _syWhen(v) {
    const d = new Date(v); if (!v || isNaN(d)) return '';
    const now = new Date(), tm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(d) - day(now)) / 86400000);
    if (diff === 0) return t('when_today', { t: tm }); if (diff === 1) return t('when_tomorrow', { t: tm }); if (diff === -1) return t('when_yesterday', { t: tm });
    let wd; try { wd = d.toLocaleDateString(this.lang(), { weekday: 'short' }); } catch (e) { wd = ''; }
    return wd + ' ' + tm;
  },

  _updateSystem() {
    if (!this._sy || !this._h) return;
    const Sx = this._h.states, c = this._syc, $ = this._sy.$, get = (e) => (isEnt(e) && Sx[e]) || null, st = (e) => { const s = get(e); return s ? s.state : undefined; };
    const set = (id, tx) => { const n = $(id); if (n && n.textContent !== tx) n.textContent = tx; };
    const pillCls = (id, cls) => { const n = $(id); if (n) n.className = 'pill' + (cls ? ' ' + cls : ''); };
    const H = c.host || {}, U = c.updates || {}, B = c.backups || {};
    // Home Assistant
    const core = get(U.core), os = get(U.os);
    set('syVer', [core && core.attributes.installed_version ? 'Core ' + core.attributes.installed_version : '', os && os.attributes.installed_version ? 'OS ' + os.attributes.installed_version : ''].filter(Boolean).join(' · '));
    const allUpd = Object.keys(Sx).filter((k) => k.startsWith('update.') && Sx[k].state === 'on').length;
    const stale = st(B.stale) === 'on';
    const health = stale ? S.backups_stale : allUpd ? t(allUpd > 1 ? 'n_updates_waiting' : 'one_update_waiting', { n: allUpd }) : S.all_good;
    const hn = $('syHealth'), hcls = stale ? 'red' : allUpd ? 'warn' : 'ok';
    hn.innerHTML = `<span></span><span class="pill ${hcls}"></span>`; hn.firstChild.textContent = health; hn.lastChild.textContent = stale ? S.check : allUpd ? S.update : S.healthy;
    set('syUp', bad(st(H.uptime)) ? '-' : span(st(H.uptime)));
    const bl = st(B.last), bn = st(B.next);
    set('syBk', bad(bl) ? '-' : this._syWhen(bl) + (bad(bn) ? '' : ' · ' + t('next_x', { x: this._syWhen(bn) })));
    set('syUpd', allUpd ? t('n_waiting', { n: allUpd }) : S.none);
    // host
    const bar = (k, unit, warn, hi) => {
      if (!isEnt(H[k])) return;
      const v = num(st(H[k])); set('sy_' + k, v == null ? '-' : (unit === '°C' ? Math.round(v) + '°C' : v.toFixed(v < 10 ? 1 : 0).replace(/\.0$/, '') + '%'));
      const b = $('sy_' + k + 'B'); if (b) { b.style.transform = `translateX(${(v == null ? 0 : Math.max(0, Math.min(100, v))) - 100}%)`; b.className = v != null && v >= hi ? 'hi' : v != null && v >= warn ? 'mid' : ''; }
    };
    bar('cpu', '%', 60, 85); bar('memory', '%', 75, 90); bar('disk', '%', 75, 90); bar('cpu_temperature', '°C');
    // connections
    this._sy.conn.forEach(({ x, b }) => {
      const v = st(x.entity), ok = x.ok_state !== undefined && x.ok_state !== '' ? String(x.ok_state) : 'on';
      b.textContent = bad(v) ? '-' : v === ok ? (x.ok_label || tidy(v)) : (x.other_label || tidy(v));
    });
    set('syBkS', bad(st(B.stale)) ? '-' : stale ? S.stale : S.up_to_date);
    // attention: low batteries and unavailable entities across the whole system
    const low = [], un = {}, lowPct = Number(c.low_battery_pct) || 20;
    Object.keys(Sx).forEach((k) => {
      const s = Sx[k], dom = k.split('.')[0];
      if (dom === 'update' || dom === 'automation' || dom === 'script' || dom === 'scene') return;
      if (s.state === 'unavailable') un[dom] = (un[dom] || 0) + 1;
      if (dom === 'sensor' && s.attributes && s.attributes.device_class === 'battery') { const v = num(s.state); if (v != null && v < lowPct) low.push([nice(s.attributes.friendly_name || k), v, k]); }
    });
    low.sort((a, b) => a[1] - b[1]);
    $('syLowN').textContent = String(low.length); pillCls('syLowN', low.length ? 'warn' : 'ok');
    const lowEl = $('syLow'), lowSig = low.map((x) => x.join('|')).join(';');
    if (lowEl.dataset.s !== lowSig) {
      lowEl.dataset.s = lowSig; lowEl.innerHTML = '';
      low.slice(0, 5).forEach(([n, v, k]) => { const r = document.createElement('div'); r.className = 'row tap'; r.innerHTML = '<span></span><b></b>'; r.firstChild.textContent = n; r.lastChild.textContent = Math.round(v) + '%'; this.tap(r, () => this.moreInfo(k)); lowEl.appendChild(r); });
    }
    const tot = Object.keys(un).reduce((a, k) => a + un[k], 0);
    $('syUnN').textContent = String(tot); pillCls('syUnN', tot > 150 ? 'red' : tot ? 'warn' : 'ok');
    const unEl = $('syUn'), names = { switch: S.d_switch, sensor: S.d_sensor, binary_sensor: S.d_binary_sensor, light: S.d_light, media_player: S.d_media_player, button: S.d_button, number: S.d_number, select: S.d_select, camera: S.d_camera, climate: S.d_climate, cover: S.d_cover };
    const top = Object.keys(un).sort((a, b) => un[b] - un[a]), shown = top.slice(0, 3), rest = top.slice(3).reduce((a, k) => a + un[k], 0);
    const rows = shown.map((k) => [names[k] || k.replace(/_/g, ' '), un[k]]); if (rest) rows.push([S.other, rest]);
    const unSig = JSON.stringify(rows);
    if (unEl.dataset.s !== unSig) { unEl.dataset.s = unSig; unEl.innerHTML = ''; rows.forEach(([n, v]) => { const r = document.createElement('div'); r.className = 'row'; r.innerHTML = '<span></span><b></b>'; r.firstChild.textContent = n; r.lastChild.textContent = String(v); unEl.appendChild(r); }); }
    set('syAttS', low.length || tot ? '' : S.nothing_to_report_short);
    // Nova
    if (this._c.nova.enabled) {
      const NE = this._c.nova.entities, ns = st(NE.status), nq = st(NE.quiet) === 'on', nl = st(NE.lockdown) === 'on';
      const word = bad(ns) ? S.not_reporting_cap : ns === 'ready' ? S.ready : tidy(ns);
      $('syNv').innerHTML = '<span></span><span class="pill ' + (bad(ns) ? 'warn' : 'ok') + '"></span>'; $('syNv').firstChild.textContent = word; $('syNv').lastChild.textContent = bad(ns) ? S.offline : S.online;
      set('syNq', bad(st(NE.quiet)) ? '-' : nq ? S.on : S.off); set('syNl', bad(st(NE.lockdown)) ? '-' : nl ? S.on : S.off);
      set('syNs', bad(st(NE.suggestions)) ? '-' : String(st(NE.suggestions)));
      const nr = st(NE.reminders); set('syNr', bad(nr) || nr === '0' ? S.none : /^\d{4}-/.test(nr) ? this._syWhen(nr) : nr);
    }
    if (c.debug_panel) this._syDebug();
  },

  /* every entity in the card config that does not exist, or is unavailable or unknown */
  _syDebug() {
    const $ = this._sy.$, Sx = this._h.states, cfg = Object.assign({}, this._c);
    if (!cfg.nova.enabled) cfg.nova = {};
    const ids = [...new Set(entitiesIn(cfg))].sort();
    const list = ids.map((id) => { const s = Sx[id]; return [id, !s ? 'missing' : bad(s.state) ? s.state : null]; }).filter((x) => x[1]);
    const nMiss = list.filter((x) => x[1] === 'missing').length, nUn = list.length - nMiss;
    set($('syDbgS'), list.length ? t('debug_summary', { a: nMiss, b: nUn, n: ids.length }) : t('debug_ok', { n: ids.length }));
    const sig = JSON.stringify(list), box = $('syDbgL');
    if (box.dataset.s === sig) return; box.dataset.s = sig; box.innerHTML = '';
    list.forEach(([id, why]) => {
      const r = document.createElement('div'); r.className = 'row'; r.innerHTML = '<span></span><b></b>'; r.firstChild.textContent = id; r.lastChild.textContent = why === 'missing' ? S.missing_entity : why;
      if (why !== 'missing') { r.classList.add('tap'); this.tap(r, () => this.moreInfo(id)); }
      box.appendChild(r);
    });
    function set(n, tx) { if (n.textContent !== tx) n.textContent = tx; }
  },
};

registerPage({
  key: 'system', icon: 'sliders', bottom: true,
  label() { return S.page_system; },
  css: CSS,
  enabled() { return true; },
  init() { return this._syInitPage(); },
  update() { this._updateSystem(); },
  stop() { this._syStop(); },
  methods: SystemExt,
});
