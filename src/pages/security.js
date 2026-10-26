/* Security page: house status, doors and windows, presence, cameras, the last hours of events and device health.
   Read-only: it never calls a service. Live camera video only starts on a tap and stops on Stop, when you leave
   the page, when the tab is hidden, and after live_seconds. Everything comes from config.security. */
import { registerPage } from '../core.js';
import { S, t } from '../strings.js';
import { hasEntities } from '../config.js';
import { isEnt, pad, hm, bad, sameDay, esc } from '../util.js';
import { STATE, CAM } from '../theme/fixed.js';

const STATES = {
  disarmed: { l: 'alarm_disarmed', c: STATE.green[0], t: STATE.green[1], an: 'scBreathe 4s' },
  armed_home: { l: 'alarm_armed_home', c: STATE.teal[0], t: STATE.teal[1], an: 'scPulse 3s' },
  armed_night: { l: 'alarm_armed_night', c: STATE.teal[0], t: STATE.teal[1], an: 'scPulse 3s' },
  armed_away: { l: 'alarm_armed_away', c: STATE.away[0], t: STATE.away[1], an: 'scPulse 3s' },
  armed_vacation: { l: 'alarm_armed_vacation', c: STATE.away[0], t: STATE.away[1], an: 'scPulse 3s' },
  armed_custom_bypass: { l: 'alarm_armed_custom', c: STATE.teal[0], t: STATE.teal[1], an: 'scPulse 3s' },
  arming: { l: 'alarm_arming', c: STATE.amber[0], t: STATE.amber[1], an: 'scPulse 1s' },
  pending: { l: 'alarm_pending', c: STATE.amber[0], t: STATE.amber[1], an: 'scPulse 1s' },
  triggered: { l: 'alarm_triggered', c: STATE.red[0], t: STATE.red[1], an: 'scStrobe .5s' },
  unknown: { l: 'alarm_unknown', c: STATE.grey[0], t: STATE.grey[1], an: 'none' },
};
const P = {
  shield: 'M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z', door: 'M6 21V4a1 1 0 011-1h10a1 1 0 011 1v17M4 21h16M14 12h.01', win: 'M5 3h14v18H5zM12 3v18M5 12h14',
  cam: 'M3 7h13v10H3zM16 10l5-3v10l-5-3z', play: 'M8 5l11 7-11 7z', stop: 'M7 7h10v10H7z', bell: 'M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4',
  user: 'M12 4a4 4 0 100 8 4 4 0 000-8zM4 21c1-4 4.5-6 8-6s7 2 8 6', alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;
const words = (v) => String(v).replace(/_/g, ' ');

const CSS = `
#pgSecurity .abs{position:absolute}
#scWrap{position:absolute;left:var(--dx,0px);top:0;width:1280px;height:800px;pointer-events:none}
#scWrap>*{pointer-events:auto}
#pgSecurity .ic{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}
#pgSecurity .scHd{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500;gap:8px}
#pgSecurity .scHd small{font-size:11.5px;font-weight:400;color:rgba(var(--oriel-ink),.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pgSecurity .dark .scHd small{color:rgba(var(--oriel-on-dark),.6)}
#pgSecurity .chip{height:26px;font-size:12px;padding:0 10px;white-space:nowrap;position:relative;cursor:pointer}
#pgSecurity .chip::after{content:"";position:absolute;left:-3px;right:-3px;top:min(0px,calc(50% - 23px));bottom:min(0px,calc(50% - 23px))}
#pgSecurity .chip.bad{background:rgb(var(--oriel-bad-bg));color:rgb(var(--oriel-bad));border-color:rgb(var(--oriel-bad-line-2))}
#pgSecurity .chip.ok{background:rgba(var(--oriel-ok-fill),.55);color:rgb(var(--oriel-ink))}
#pgSecurity .chip.warn{background:rgb(var(--oriel-warn-bg));color:rgb(var(--oriel-warn));border-color:rgb(var(--oriel-warn-line))}
#pgSecurity .chip.dk{background:rgba(var(--oriel-on-dark),.1);border-color:rgba(var(--oriel-on-dark),.18);color:rgb(var(--oriel-on-dark))}
#pgSecurity .chip.dk.bad{background:rgb(var(--oriel-bad-bg));color:rgb(var(--oriel-bad))}
#scHero,#scDoors,#scMotion,#scCams,#scEv,#scHealth{border-radius:28px}
#scHero{left:100px;top:84px;width:420px;height:314px;padding:18px 22px;overflow:hidden;transition:background .6s}
#scHero::before{content:"";position:absolute;inset:0;border-radius:28px;pointer-events:none;animation:var(--an,none) ease-in-out infinite}
@keyframes scBreathe{0%,100%{box-shadow:inset 0 0 22px color-mix(in srgb,var(--gc) 20%,transparent)}50%{box-shadow:inset 0 0 70px color-mix(in srgb,var(--gc) 55%,transparent)}}
@keyframes scPulse{0%,100%{box-shadow:inset 0 0 22px color-mix(in srgb,var(--gc) 25%,transparent)}50%{box-shadow:inset 0 0 60px color-mix(in srgb,var(--gc) 65%,transparent)}}
@keyframes scStrobe{0%,100%{box-shadow:inset 0 0 14px color-mix(in srgb,var(--gc) 30%,transparent)}50%{box-shadow:inset 0 0 90px color-mix(in srgb,var(--gc) 95%,transparent)}}
@media (prefers-reduced-motion:reduce){#scHero::before{animation:none!important;box-shadow:inset 0 0 0 4px var(--gc)}}
#scHero.alert{background:rgb(var(--oriel-bad-bg))}
#scState{font-size:54px;font-weight:200;line-height:1;margin-top:20px;cursor:pointer;white-space:nowrap}
#scSub{font-size:15px;margin-top:10px;font-weight:300;min-height:40px;line-height:1.3;overflow:hidden;max-height:40px}
#scWho{font-size:12.5px;color:rgba(var(--oriel-ink),.62);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#scNova{margin-top:10px;overflow:hidden;display:none}
#scNova.on{display:block}
#scNova .scNh{font-size:11.5px;color:rgba(var(--oriel-ink),.62);font-weight:500}
#scNova .scNl{font-size:12.5px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
#scPanels{position:absolute;left:22px;right:22px;bottom:20px;display:flex;gap:6px;flex-wrap:wrap}
#scDoors{left:536px;top:84px;width:440px;height:314px;padding:16px}
/* lists spread out to fill their card, up to 44px a row, so rows are easy to tap; many rows shrink back */
#scDoors,#scMotion,#scHealth{display:flex;flex-direction:column} #scAreas,#scMoBody{flex:1;min-height:0;display:flex;flex-direction:column}
#scAreas{margin-top:6px}
.scAr{display:grid;grid-template-columns:112px 1fr;align-items:center;min-height:27px;flex:1 1 27px;max-height:44px;font-size:13px;border-bottom:1px solid rgba(var(--oriel-ink),.07)}
.scAr:last-child{border:0}
.scAr .scN{color:rgba(var(--oriel-ink),.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.scAr .scS{display:flex;gap:6px;flex-wrap:nowrap}
.scSn{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:12px;background:rgba(var(--oriel-glass),.55);font-size:11.5px;position:relative;cursor:pointer;white-space:nowrap}
.scSn::after{content:"";position:absolute;left:-3px;right:-3px;top:min(0px,calc(50% - 23px));bottom:min(0px,calc(50% - 23px))}
.scSn i{width:7px;height:7px;border-radius:50%;background:rgb(var(--oriel-good-mark));display:block}
.scSn.open{background:rgb(var(--oriel-bad-bg));color:rgb(var(--oriel-bad))}.scSn.open i{background:rgb(var(--oriel-bad-strong))}
.scSn.off{opacity:.5}.scSn.off i{background:rgb(var(--oriel-off))}
#scDoors.hot .scSn.open{box-shadow:0 0 0 1.5px rgb(var(--oriel-bad-strong))}
#scMotion{left:992px;top:84px;width:264px;height:314px;padding:16px;overflow:hidden}
.scMr{display:flex;align-items:center;justify-content:space-between;min-height:24px;flex:1 1 24px;max-height:44px;font-size:13px;cursor:pointer;gap:6px}
.scMr span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.scMr small{color:rgba(var(--oriel-ink),.62);font-size:11.5px;white-space:nowrap}
.scMr.on small{color:rgb(var(--oriel-good-2));font-weight:500}.scMr.on.hot small{color:rgb(var(--oriel-bad-strong))}
.scMh{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:rgba(var(--oriel-ink),.62);margin:8px 0 1px}
.scMr.mut{color:rgba(var(--oriel-ink),.62)}
#scCams{left:100px;top:410px;width:1156px;height:190px;padding:14px 16px}
#scCamRow{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:10px}
.scCam{height:132px;border-radius:20px;position:relative;overflow:hidden;background:linear-gradient(150deg,${CAM.tileA},${CAM.tileB});color:${CAM.text};cursor:pointer}
.scCam img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none}
.scCam .scLive{position:absolute;inset:0;background:${CAM.video};display:none;color:${CAM.text};font-size:12px;align-items:center;justify-content:center}
.scCam.live .scLive{display:flex}
.scCam .scLive>*{width:100%;height:100%;display:block}
.scCam .scL{position:absolute;left:12px;top:9px;font-size:13px;text-shadow:0 1px 4px ${CAM.shadow};z-index:3;white-space:nowrap}
.scCam .scTm{position:absolute;left:12px;bottom:10px;font-size:11px;color:${CAM.soft};text-shadow:0 1px 4px ${CAM.shadow};z-index:3;white-space:nowrap}
.scCam .scBt{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:50px;height:50px;border-radius:25px;background:${CAM.btn};border:1px solid ${CAM.btnLine};display:grid;place-items:center;color:${CAM.text};cursor:pointer;padding:0;z-index:4}
.scCam.live .scBt{top:auto;bottom:8px;left:auto;right:8px;transform:none;width:44px;height:44px;border-radius:22px;background:${CAM.btnLive}}
.scCam .scBd{position:absolute;right:8px;top:8px;display:flex;gap:4px;z-index:3}
.scCam.live .scBd{display:none}
.scCam .scBd span{height:20px;padding:0 8px;border-radius:10px;font-size:10.5px;background:${CAM.chip};display:flex;align-items:center}
.scCam .scBd span.on{background:${CAM.live}}
.scCam.off{opacity:.55}.scCam.off .scBt{display:none}
#scEv{left:100px;top:612px;width:560px;height:164px;padding:14px 16px;overflow:hidden}
.scEvr{display:grid;grid-template-columns:48px 20px 1fr;gap:8px;align-items:center;height:24px;font-size:12.5px;cursor:pointer}
.scEvr .scT{color:rgba(var(--oriel-ink),.62);font-variant-numeric:tabular-nums}
.scEvr .scX{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.scEvr.hi{color:rgb(var(--oriel-bad))}
.scEmpty{font-size:12.5px;color:rgba(var(--oriel-ink),.62);padding-top:6px}
#scHealth{left:676px;top:612px;width:580px;height:164px;padding:14px 16px}
#scHg{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-top:8px;font-size:12.5px;flex:1;min-height:0;grid-auto-rows:minmax(23px,44px);align-content:start}
.scHb{display:flex;align-items:center;justify-content:space-between;min-height:23px;cursor:pointer;gap:6px}
.scHb span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.scHb b{font-weight:400;white-space:nowrap}.scHb b.lo{color:rgb(var(--oriel-bad-on-dark))}
`;
const HTML = () => `<div id="scWrap">
  <div id="scHero" class="abs glass mid">
    <div class="scHd"><span>${esc(S.house_status)}</span><span class="chip" id="scClock">–</span></div>
    <div id="scState">–</div><div id="scSub"></div><div id="scWho"></div>
    <div id="scNova"><div class="scNh">${esc(S.nova_saw)}</div></div>
    <div id="scPanels"></div>
  </div>
  <div id="scDoors" class="abs glass">
    <div class="scHd"><span>${esc(S.doors_and_windows)}</span><span class="chip ok" id="scOpenChip">–</span></div>
    <div id="scAreas"></div>
  </div>
  <div id="scMotion" class="abs glass">
    <div class="scHd"><span>${esc(S.presence)}</span><small id="scMoSub"></small></div>
    <div id="scMoBody"></div>
  </div>
  <div id="scCams" class="abs dark">
    <div class="scHd"><span>${esc(S.cameras)}</span><small id="scCamSub"></small></div>
    <div id="scCamRow"></div>
  </div>
  <div id="scEv" class="abs glass">
    <div class="scHd"><span id="scEvT"></span><small id="scEvS"></small></div>
    <div id="scEvl" style="margin-top:6px"></div>
  </div>
  <div id="scHealth" class="abs dark">
    <div class="scHd"><span>${esc(S.device_health)}</span><span class="chip dk" id="scTamper">–</span></div>
    <div id="scHg"></div>
  </div>
</div>`;

const SecurityExt = {
  _scInitPage() {
    const pg = document.createElement('div');
    pg.id = 'pgSecurity'; pg.innerHTML = HTML();
    const $ = (id) => pg.querySelector('#' + id);
    const c = this._c.security;
    this._scc = Object.assign({}, c, { alarm: isEnt(c.alarm) ? c.alarm : this._c.general.alarm });
    this._sc = { pg, $, vis: false, tm: null, n: 0, events: null, evBusy: false, evOk: true, live: null, tok: 0, liveTimer: null, mm: 0 };
    this._scBuild();
    // visibility is read from the page's own class, so timers and streams follow whichever page is showing
    this._sc.obs = new MutationObserver(() => this._scVis()); this._sc.obs.observe(pg, { attributes: true, attributeFilter: ['class'] });
    this._sc.onVis = () => { if (document.hidden) this._scStopLive(); };
    document.addEventListener('visibilitychange', this._sc.onVis);
    return pg;
  },
  _scTap(node, id) { if (!node || !isEnt(id)) return; this.tap(node, (e) => { e.stopPropagation(); this.moreInfo(id); }); },
  _scList(e) { return [].concat(e || []).map((x) => (typeof x === 'string' ? { entity: x } : x)).filter((x) => x && isEnt(x.entity)); },

  _scBuild() {
    const c = this._scc, S0 = this._sc, $ = S0.$;
    this._scTap($('scState'), c.alarm);
    $('scHero').classList.toggle('hide', !isEnt(c.alarm));
    // linked panels as small chips
    S0.linked = (c.linked_panels || []).map((p) => ({ p, ents: this._scList(p.entities) })).filter((x) => x.ents.length).map((x) => {
      const s = document.createElement('span'); s.className = 'chip'; $('scPanels').appendChild(s); this._scTap(s, x.ents[0].entity);
      return Object.assign(x, { el: s, mm: 0 });
    });
    S0.cLast = document.createElement('span'); S0.cLast.className = 'chip'; $('scPanels').appendChild(S0.cLast); this._scTap(S0.cLast, c.alarm);
    // doors and windows
    S0.open = [];
    (c.openings || []).forEach((a) => {
      const items = (a.sensors || []).filter((it) => it && isEnt(it.entity)); if (!items.length) return;
      const r = document.createElement('div'); r.className = 'scAr';
      r.innerHTML = '<span class="scN"></span><span class="scS"></span>'; r.firstChild.textContent = a.area || '';
      items.forEach((it) => {
        const s = document.createElement('span'); s.className = 'scSn'; s.innerHTML = '<i></i><span></span>'; s.lastChild.textContent = it.name || this.name(it.entity);
        this._scTap(s, it.entity); r.lastChild.appendChild(s); S0.open.push({ it: Object.assign({ label: it.label || it.name || this.name(it.entity) }, it), a, s });
      });
      $('scAreas').appendChild(r);
    });
    $('scDoors').classList.toggle('hide', !S0.open.length);
    // presence
    S0.mo = [];
    $('scMoSub').textContent = c.presence_subtitle || '';
    (c.presence || []).forEach((f) => {
      const rooms = (f.rooms || []).map((r) => Object.assign({}, r, { e: [].concat(r.entities || []).filter(isEnt) })).filter((r) => r.e.length); if (!rooms.length) return;
      if (f.floor) { const h = document.createElement('div'); h.className = 'scMh'; h.textContent = f.floor; $('scMoBody').appendChild(h); }
      rooms.forEach((it) => {
        const r = document.createElement('div'); r.className = 'scMr'; r.innerHTML = '<span></span><small>–</small>'; r.firstChild.textContent = it.name || this.name(it.e[0]);
        this.tap(r, () => this.moreInfo(it.e.find((x) => this.sv(x) === 'on') || it.e[0])); $('scMoBody').appendChild(r); S0.mo.push({ it, r, sm: r.lastChild });
      });
    });
    $('scMotion').classList.toggle('hide', !S0.mo.length);
    // cameras
    const cams = (c.cameras || []).filter((x) => x && isEnt(x.camera)).slice(0, 6);
    $('scCamRow').style.gridTemplateColumns = `repeat(${Math.max(cams.length, 1) < 5 ? 5 : cams.length},1fr)`;
    $('scCamSub').textContent = t('cameras_hint', { s: Math.round((Number(c.snapshot_seconds) || 30)) });
    S0.cams = cams.map((cfg) => {
      const tile = document.createElement('div'); tile.className = 'scCam';
      tile.innerHTML = `<img alt=""><div class="scLive"></div><span class="scL"></span><div class="scBd"><span>${esc(S.motion)}</span><span>${esc(S.person)}</span><span style="display:none">${esc(S.pet)}</span></div><button type="button" class="scBt" aria-label="${esc(S.play)}">${ic('play')}</button><span class="scTm">–</span>`;
      tile.querySelector('.scL').textContent = cfg.name || this.name(cfg.camera);
      const bs = tile.querySelectorAll('.scBd span');
      const tl = { cfg, tile, img: tile.querySelector('img'), live: tile.querySelector('.scLive'), btn: tile.querySelector('.scBt'), tm: tile.querySelector('.scTm'), bm: bs[0], bp: bs[1], bt: bs[2], ok: false };
      if (!isEnt(cfg.motion)) tl.bm.remove(); if (!isEnt(cfg.person)) tl.bp.remove();
      tl.img.addEventListener('load', () => { tl.ok = true; tl.img.style.display = 'block'; tl.tm.textContent = t('snapshot_at', { t: hm(new Date()) }); });
      tl.img.addEventListener('error', () => { tl.ok = false; tl.img.style.display = 'none'; tl.tm.textContent = S.no_snapshot; });
      tl.btn.addEventListener('click', (e) => { e.stopPropagation(); this._scPlay(tl); });
      tile.addEventListener('click', () => { if (!tile.classList.contains('live')) this.moreInfo(cfg.camera); });
      $('scCamRow').appendChild(tile); return tl;
    });
    $('scCams').classList.toggle('hide', !S0.cams.length);
    // events and device health
    $('scEvT').textContent = t('last_n_hours', { n: c.events_hours });
    S0.hb = [];
    for (let i = 0; i < 8; i++) {
      const d = document.createElement('div'); d.className = 'scHb'; d.innerHTML = '<span>–</span><b>–</b>';
      $('scHg').appendChild(d); S0.hb.push({ d, l: d.firstChild, v: d.lastChild, e: null });
      this.tap(d, () => { const e = S0.hb[i].e; if (e) this.moreInfo(e); });
    }
    this.tap($('scTamper'), () => { if (S0.tamperOn && S0.tamperOn[0]) this.moreInfo(S0.tamperOn[0]); });
    // with no cameras the bottom row moves up
    if (!S0.cams.length) { $('scEv').style.top = '410px'; $('scHealth').style.top = '410px'; }
    $('scEv').classList.toggle('hide', !this._scEvIds().length);
  },

  /* ---------- visibility and timers ---------- */
  _scVis() {
    const S0 = this._sc; if (!S0) return;
    const on = !S0.pg.classList.contains('off');
    if (on === S0.vis) return; S0.vis = on;
    if (on) { S0.n = 0; this._scSnaps(); this._scEvents(); S0.tm = setInterval(() => this._scTick(), (Number(this._scc.snapshot_seconds) || 30) * 1000); }
    else { clearInterval(S0.tm); S0.tm = null; this._scStopLive(); }
  },
  _scTick() { const S0 = this._sc; if (!S0 || !S0.vis) return; S0.n++; this._scSnaps(); if (S0.n % 2 === 0) this._scEvents(); },
  _scStop() {
    const S0 = this._sc; if (!S0) return;
    clearInterval(S0.tm); S0.tm = null; clearTimeout(S0.evT); this._scStopLive();
    if (S0.obs) S0.obs.disconnect();
    if (S0.onVis) document.removeEventListener('visibilitychange', S0.onVis);
    S0.vis = false;
  },

  /* ---------- cameras ---------- */
  _scSnaps() {
    const S0 = this._sc, ms = (Number(this._scc.snapshot_seconds) || 30) * 1000; if (!S0) return;
    S0.cams.forEach((tl) => {
      const s = this.st(tl.cfg.camera), pic = s && s.attributes && s.attributes.entity_picture;
      const dead = !s || bad(s.state);
      tl.tile.classList.toggle('off', dead);
      if (dead) { tl.img.style.display = 'none'; tl.tm.textContent = S.not_available; return; }
      if (!pic) { tl.tm.textContent = S.no_snapshot; return; }
      if (tl.tile.classList.contains('live')) return;
      tl.img.src = pic + (pic.indexOf('?') >= 0 ? '&' : '?') + 'sc=' + Math.floor(Date.now() / ms);
    });
  },
  async _scPlay(tl) {
    const S0 = this._sc;
    if (S0.live && S0.live.t === tl) { this._scStopLive(); return; }
    this._scStopLive();
    const tok = ++S0.tok;
    tl.live.textContent = S.starting; tl.tile.classList.add('live'); tl.btn.innerHTML = ic('stop'); tl.btn.setAttribute('aria-label', S.stop);
    try {
      const helpers = await window.loadCardHelpers();
      const type = customElements.get('webrtc-camera') ? 'custom:webrtc-camera' : 'picture-entity';
      const cfg = type === 'picture-entity' ? { type, entity: tl.cfg.camera, camera_view: 'live', show_name: false, show_state: false } : { type, entity: tl.cfg.camera };
      const card = await helpers.createCardElement(cfg);
      if (S0.tok !== tok) return;           // stopped while the card was loading
      card.hass = this._h; tl.live.textContent = ''; tl.live.appendChild(card);
      S0.live = { t: tl, card };
      S0.liveTimer = setTimeout(() => this._scStopLive(), (Number(this._scc.live_seconds) || 120) * 1000);
    } catch (e) {
      console.warn('[oriel] security live view failed', e);
      if (S0.tok === tok) tl.live.textContent = S.live_unavailable;
    }
  },
  _scStopLive() {
    const S0 = this._sc; if (!S0) return;
    S0.tok++; clearTimeout(S0.liveTimer); S0.liveTimer = null;
    S0.cams.forEach((tl) => {
      if (!tl.tile.classList.contains('live')) return;
      tl.tile.classList.remove('live'); tl.live.textContent = '';
      tl.btn.innerHTML = ic('play'); tl.btn.setAttribute('aria-label', S.play);
    });
    S0.live = null;
  },

  /* ---------- events (logbook) ---------- */
  _scEvIds() {
    const c = this._scc, S0 = this._sc, ids = [c.alarm, c.doorbell].filter(isEnt);
    S0.open.forEach((r) => ids.push(r.it.entity));
    S0.cams.forEach((m) => { if (isEnt(m.cfg.person)) ids.push(m.cfg.person); });
    return ids;
  },
  async _scEvents() {
    const S0 = this._sc, c = this._scc; if (!S0 || S0.evBusy || !this._h) return;
    const ids = this._scEvIds(); if (!ids.length) return;
    S0.evBusy = true;
    try {
      const now = new Date(), start = new Date(now.getTime() - c.events_hours * 3600000);
      const r = await this._h.callWS({ type: 'logbook/get_events', start_time: start.toISOString(), end_time: now.toISOString(), entity_ids: ids });
      S0.events = this._scBuildEvents(Array.isArray(r) ? r : []); S0.evOk = true;
    } catch (e) { console.warn('[oriel] security events failed', e); S0.evOk = false; }
    S0.evBusy = false;
    try { this._scEvDraw(); } catch (e) { console.warn('[oriel] security events draw', e); }
  },
  _scBuildEvents(raw) {
    const c = this._scc, S0 = this._sc, now = Date.now(), lab = {}, camOf = {};
    S0.open.forEach((r) => { lab[r.it.entity] = { l: r.it.label, w: r.it.window !== undefined ? !!r.it.window : /window/i.test(r.it.label) }; });
    S0.cams.forEach((m) => { if (isEnt(m.cfg.person)) camOf[m.cfg.person] = m.cfg.name || this.name(m.cfg.camera); });
    const ts = (e) => { const w = e.when; return typeof w === 'number' ? (w > 1e12 ? w : w * 1000) : Date.parse(w); };
    const evs = raw.map((e) => ({ t: ts(e), id: e.entity_id, s: e.state })).filter((e) => Number.isFinite(e.t) && e.id).sort((a, b) => a.t - b.t);
    const out = [], grp = {}, ALARM = { disarmed: S.ev_disarmed, armed_home: S.ev_armed_home, armed_away: S.ev_armed_away, armed_night: S.ev_armed_night, triggered: S.ev_triggered, pending: S.ev_pending };
    evs.forEach((e) => {
      if (e.id === c.alarm) { if (ALARM[e.s]) out.push({ t: e.t, i: 'shield', x: ALARM[e.s], hi: e.s === 'triggered', e: e.id }); return; }
      if (e.id === c.doorbell) {
        if (e.s !== 'on') return; const g = grp[e.id];
        if (g && e.t - g.t1 < 120000) { g.t1 = e.t; return; }
        grp[e.id] = { t1: e.t }; out.push({ t: e.t, i: 'bell', x: S.ev_doorbell, e: e.id }); return;
      }
      if (camOf[e.id]) {
        if (e.s !== 'on') return; const g = grp[e.id];
        if (g && e.t - g.t1 < 300000) { g.t1 = e.t; return; }
        grp[e.id] = { t1: e.t }; out.push({ t: e.t, i: 'cam', x: t('ev_person', { cam: camOf[e.id] }), e: e.id }); return;
      }
      const L = lab[e.id]; if (!L) return;
      let g = grp[e.id];
      if (e.s === 'on') {
        if (g && !g.o.stale && e.t - g.t1 < 600000) { g.n++; g.t1 = e.t; g.o.closed = false; }
        else { const o = { t: e.t, i: L.w ? 'win' : 'door', e: e.id, n: 1, closed: false, L: L.l }; g = grp[e.id] = { o, n: 1, t1: e.t }; out.push(o); }
        g.o.n = g.n;
      } else if (e.s === 'off' && g) { g.t1 = e.t; g.o.closed = true; }
    });
    out.forEach((o) => {
      if (o.L) {
        const still = this.sv(o.e) === 'on';
        o.x = t('ev_opened', { name: o.L }) + (o.closed ? S.ev_and_closed : (still ? S.ev_still_open : '')) + (o.n > 1 ? t('ev_times', { n: o.n }) : '');
      }
    });
    return out.filter((o) => now - o.t < c.events_hours * 3600000 + 60000).sort((a, b) => b.t - a.t);
  },
  _scEvDraw() {
    const S0 = this._sc, $ = S0.$, box = $('scEvl'), c = this._scc; if (!box) return;
    $('scEvS').textContent = S0.events === null ? '' : (S0.evOk ? '' : S.could_not_refresh);
    box.innerHTML = '';
    if (S0.events === null) { box.innerHTML = `<div class="scEmpty">${esc(S0.evOk ? S.loading : S.events_unavailable)}</div>`; return; }
    if (!S0.events.length) { box.innerHTML = `<div class="scEmpty">${esc(t('nothing_to_report', { n: c.events_hours }))}</div>`; return; }
    S0.events.slice(0, c.event_rows).forEach((o) => {
      const r = document.createElement('div'); r.className = 'scEvr' + (o.hi ? ' hi' : '');
      r.innerHTML = `<span class="scT">${hm(new Date(o.t))}</span>${ic(o.i)}<span class="scX"></span>`; r.lastChild.textContent = o.x;
      this._scTap(r, o.e); box.appendChild(r);
    });
  },

  /* ---------- update ---------- */
  _updateSecurity() {
    if (!this._sc) return;
    const run = (name, fn) => { try { fn.call(this); } catch (e) { console.warn('[oriel] security ' + name, e); } };
    run('hero', this._scHero); run('nova', this._scNova); run('openings', this._scOpenings); run('presence', this._scPresence);
    run('cameras', this._scCamsUpdate); run('health', this._scHealth);
    run('events', function () {
      // refresh the event list soon after the alarm, a door or the doorbell changes, not only on the timer
      const S0 = this._sc, c = this._scc, a = this.st(c.alarm);
      const sig = (a ? a.state + a.last_changed : '') + '|' + S0.open.map((r) => (this.sv(r.it.entity) === 'on' ? 1 : 0)).join('') + this.sv(c.doorbell);
      if (S0.sig !== undefined && S0.sig !== sig) { clearTimeout(S0.evT); S0.evT = setTimeout(() => this._scEvents(), 2500); }
      S0.sig = sig;
    });
  },
  _scWhen(d, now) {
    if (!d || isNaN(d)) return '';
    if (sameDay(d, now)) return t('time_today', { t: hm(d) });
    if (sameDay(d, new Date(now.getTime() - 86400000))) return t('time_yesterday', { t: hm(d) });
    return this._scDay(d);
  },
  _scDay(d) { try { return d.toLocaleDateString(this.lang(), { day: 'numeric', month: 'short' }); } catch (e) { return d.toDateString(); } },

  _scHero() {
    const c = this._scc, S0 = this._sc, $ = S0.$, now = new Date();
    if (!isEnt(c.alarm)) return;
    const a = this.st(c.alarm), s = a && !bad(a.state) ? a.state : 'unknown', T = STATES[s] || STATES.unknown;
    const hero = $('scHero');
    hero.style.setProperty('--gc', T.c); hero.style.setProperty('--an', T.an);
    hero.classList.toggle('alert', s === 'triggered');
    $('scState').textContent = S[T.l]; $('scState').style.color = this._stateText(T.t);
    $('scClock').textContent = t('updated_at', { t: hm(now) });
    const rows = S0.open, open = [], missing = [];
    rows.forEach((r) => { const v = this.sv(r.it.entity); if (v === 'on') open.push(r); else if (bad(v)) missing.push(r); });
    let sub;
    if (s === 'triggered') {
      const os = a.attributes && a.attributes.open_sensors, k = os && typeof os === 'object' ? Object.keys(os)[0] : null;
      const hit = k && rows.find((r) => r.it.entity === k), fs = k && this.st(k);
      sub = k ? t('triggered_by', { name: hit ? hit.it.label : (fs && fs.attributes.friendly_name) || k }) : S.alarm_has_triggered;
    } else if (s === 'unknown') sub = S.alarm_not_reporting;
    else if (!rows.length) sub = '';
    else if (open.length) sub = t('n_open_list', { n: open.length, list: open.slice(0, 2).map((r) => r.it.label).join(', ') }) + (open.length > 2 ? t('plus_more', { n: open.length - 2 }) : '');
    else if (rows.length - missing.length === 0) sub = S.no_openings_reporting;
    else sub = t('all_closed_n', { n: rows.length - missing.length });
    if (s !== 'triggered' && s !== 'unknown' && missing.length) sub += t('n_not_reporting', { n: missing.length });
    $('scSub').textContent = sub;
    // who and when: names are never shown, only whether it was automatic
    const by = a && a.attributes && a.attributes.changed_by, lc = a && new Date(a.last_changed);
    $('scWho').textContent = s === 'unknown' ? '' : s === 'triggered' ? t('sounding_since', { t: hm(lc) })
      : (by ? (/automation/i.test(by) ? S.changed_auto : S.changed_hand) : S.changed) + ' · ' + this._scWhen(lc, now);
    // linked panels: amber if one disagrees with the main panel for over a minute, or is not reporting
    const EXPECT = { disarmed: 'disarmed', armed_home: 'armed_home', armed_away: 'armed_away' };
    S0.linked.forEach((L) => {
      const vals = L.ents.map((x) => this.sv(x.entity)), nm = L.p.name || this.name(L.ents[0].entity), suf = L.p.suffix || '';
      let txt;
      if (vals.length === 1) txt = bad(vals[0]) ? S.not_reporting : words(vals[0]) + suf;
      else if (vals.every((v) => v === vals[0])) txt = bad(vals[0]) ? S.not_reporting : words(vals[0]) + suf;
      else txt = L.ents.map((x, i) => (x.label ? x.label + ' ' : '') + (bad(vals[i]) ? '–' : words(vals[i]))).join(', ');
      L.el.textContent = nm + ': ' + txt;
      if (L.p.compare !== false && vals.length === 1) {
        const mism = EXPECT[s] && !bad(vals[0]) && vals[0] !== EXPECT[s];
        if (mism) { if (!L.mm) L.mm = Date.now(); } else L.mm = 0;
        L.el.classList.toggle('warn', (!!L.mm && Date.now() - L.mm > 60000) || bad(vals[0]));
      }
    });
    const lt = a && a.attributes && a.attributes.last_triggered, ld = lt ? new Date(lt) : null;
    S0.cLast.style.display = ld && !isNaN(ld) ? '' : 'none';
    if (ld && !isNaN(ld)) S0.cLast.textContent = t('last_alarm', { d: sameDay(ld, now) ? S.today_lc : this._scDay(ld) });
  },

  // Nova's recent camera lines (only with Nova on), in the free space above the chips; clipped, never grows into them
  _scNova() {
    const N = this._c.nova, S0 = this._sc, $ = S0.$, box = $('scNova');
    const id = N.enabled ? N.entities.camera_summary : '';
    const s = isEnt(id) ? this.st(id) : null, cut = Date.now() - 12 * 3600000;
    const list = (s && Array.isArray(s.attributes.recent) ? s.attributes.recent : [])
      .filter((r) => r && r.text && Date.parse(r.time) >= cut).sort((x, y) => Date.parse(y.time) - Date.parse(x.time)).slice(0, 2);
    const sig = JSON.stringify(list);
    if (S0.nvSig !== sig) {
      S0.nvSig = sig;
      box.querySelectorAll('.scNl').forEach((n) => n.remove());
      list.forEach((r) => {
        const d = document.createElement('div'); d.className = 'scNl';
        d.textContent = String(r.text).replace(/\s+/g, ' ') + ' · ' + hm(new Date(r.time));
        this.tap(d, () => this.moreInfo(id)); box.appendChild(d);
      });
    }
    box.classList.toggle('on', list.length > 0);
    if (!list.length) return;
    box.style.maxHeight = '';
    const room = $('scPanels').offsetTop - 8 - box.offsetTop, need = box.firstChild.offsetHeight + (box.children[1] ? box.children[1].offsetHeight : 0);
    if (room < need) box.classList.remove('on'); else box.style.maxHeight = room + 'px';
  },

  _scOpenings() {
    const S0 = this._sc, $ = S0.$; let n = 0;
    S0.open.forEach((r) => {
      const v = this.sv(r.it.entity), on = v === 'on';
      if (on) n++;
      r.s.classList.toggle('open', on); r.s.classList.toggle('off', bad(v));
    });
    const chip = $('scOpenChip'); chip.textContent = n ? t('n_open', { n }) : S.none_open;
    chip.classList.toggle('bad', n > 0); chip.classList.toggle('ok', n === 0);
    $('scDoors').classList.toggle('hot', this.sv(this._scc.alarm) === 'triggered');
    chip.onclick = () => { const f = S0.open.find((r) => this.sv(r.it.entity) === 'on'); if (f) this.moreInfo(f.it.entity); };
  },

  _scPresence() {
    const S0 = this._sc, armedAway = this.sv(this._scc.alarm) === 'armed_away';
    S0.mo.forEach((m) => {
      const vals = m.it.e.map((x) => this.sv(x)), on = vals.indexOf('on') >= 0, dead = vals.every(bad);
      m.r.classList.toggle('on', on); m.r.classList.toggle('hot', on && armedAway);
      m.sm.textContent = dead ? S.not_reporting : on ? (m.it.wording === 'motion' ? S.movement : S.someone_here) : S.clear_lc;
    });
  },

  _scCamsUpdate() {
    const S0 = this._sc;
    S0.cams.forEach((tl) => {
      const on = (id) => this.sv(id) === 'on';
      if (tl.bm.isConnected) tl.bm.classList.toggle('on', on(tl.cfg.motion));
      if (tl.bp.isConnected) tl.bp.classList.toggle('on', on(tl.cfg.person));
      const pet = on(tl.cfg.pet); tl.bt.style.display = pet ? '' : 'none'; tl.bt.classList.toggle('on', pet);
      const s = this.st(tl.cfg.camera), dead = !s || bad(s.state);
      tl.tile.classList.toggle('off', dead);
      if (dead && !tl.tile.classList.contains('live')) tl.tm.textContent = S.not_available;
    });
    if (S0.live && S0.live.card) { try { S0.live.card.hass = this._h; } catch (e) { /* card gone */ } }
  },

  _scHealth() {
    const c = this._scc, S0 = this._sc, $ = S0.$, low = Number(c.low_battery_pct) || 30;
    const hubs = (c.hubs || []).filter((h) => h && isEnt(h.entity)).slice(0, 6);
    const room = Math.max(0, 7 - hubs.length);
    const bats = (c.batteries || []).map((b) => (Array.isArray(b) ? { name: b[0], entity: b[1] } : b)).filter((b) => b && isEnt(b.entity))
      .map((b) => ({ n: b.name || this.name(b.entity), e: b.entity, v: this.num(b.entity) })).filter((b) => b.v !== null).sort((x, y) => x.v - y.v).slice(0, Math.min(5, room));
    const cells = bats.map((b) => ({ l: b.n, v: Math.round(b.v) + '%', lo: b.v < low, e: b.e }));
    hubs.forEach((h) => {
      const v = this.sv(h.entity), ok = h.ok_state !== undefined && h.ok_state !== '' ? String(h.ok_state) : null;
      cells.push({ l: h.name || this.name(h.entity), v: bad(v) ? '–' : (ok !== null && v === ok ? (h.ok_label || words(v)) : words(v)), lo: !bad(v) && ok !== null && v !== ok, e: h.entity });
    });
    const miss = S0.open.filter((r) => bad(this.sv(r.it.entity))).length + S0.mo.filter((m) => m.it.e.every((x) => bad(this.sv(x)))).length;
    if (S0.open.length || S0.mo.length) cells.push({ l: S.sensors_not_reporting, v: miss ? String(miss) : S.none, lo: miss > 0, e: null });
    S0.hb.forEach((h, i) => {
      const x = cells[i]; h.d.style.visibility = x ? '' : 'hidden'; if (!x) return;
      h.l.textContent = x.l; h.v.textContent = x.v; h.v.classList.toggle('lo', !!x.lo); h.e = x.e;
    });
    // tamper: any tamper sensor that is on
    const hass = this._h, on = [];
    if (hass && hass.states) for (const id of Object.keys(hass.states)) { if (id.indexOf('binary_sensor.') === 0 && id.indexOf('tamper') > 0) { const s = hass.states[id]; if (s.attributes && s.attributes.device_class === 'tamper' && s.state === 'on') on.push(id); } }
    S0.tamperOn = on;
    const tp = $('scTamper'); tp.classList.toggle('bad', on.length > 0);
    tp.textContent = on.length ? t('tamper_on', { name: (hass.states[on[0]].attributes.friendly_name || on[0]).replace(/ tamper.*$/i, '') }) + (on.length > 1 ? ' +' + (on.length - 1) : '') : S.tamper_clear;
  },
};

registerPage({
  key: 'security', icon: 'shield',
  label() { return S.page_security; },
  css: CSS,
  enabled(c) { return hasEntities(Object.assign({}, c.security, { low_battery_pct: 0 })); },
  init() { return this._scInitPage(); },
  update() { this._updateSecurity(); },
  always() { if (this._page !== 'security' && this._sc && this._sc.live) { try { this._sc.live.card.hass = this._h; } catch (e) { /* card gone */ } } },
  stop() { this._scStop(); },
  methods: SecurityExt,
});
