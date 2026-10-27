/* Idle clock: not a page. A dark screen that covers the card while a presence sensor has been off for a set time, and goes
   away when the sensor turns on or anyone touches the screen. Off unless general.idle_clock.presence is set.
   It never covers anything urgent and never goes idle on bad data (unavailable, unknown or a missing entity count as "someone is there").
   Events come from the same store as the Home "Coming up" card (family.js); bins from the Family page's bin fetch. */
import { addMethods } from './core.js';
import { S, t, WX } from './strings.js';
import { isEnt, icon, pad } from './util.js';
import { IDLE } from './theme/fixed.js';

const MIN_MS = 60000, FILL_S = 30, GUARD_MS = 500;
/* minutes: a number, or text from YAML; out of range or not a number falls back to 5 and is held to 1..60 */
const minutes = (v) => { const n = Math.round(parseFloat(v)); return Number.isFinite(n) ? Math.min(60, Math.max(1, n)) : 5; };

const CSS = `
#idle{position:absolute;inset:0;z-index:60;display:none;overflow:hidden;color:${IDLE.time};touch-action:manipulation;--u:1;
  background:radial-gradient(ellipse 62% 56% at 50% 44%,${IDLE.bgA},${IDLE.bgB} 58%,${IDLE.bgC})}
#idle.show{display:block}
#idle .in{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:idleDrift 60s ease-in-out infinite}
@keyframes idleDrift{0%,100%{transform:translate(0,0)}25%{transform:translate(6px,-4px)}50%{transform:translate(0,-8px)}75%{transform:translate(-6px,-4px)}}
@media (prefers-reduced-motion:reduce){#idle .in{animation:none}}
#idle .tm{font-size:calc(var(--u)*250px);font-weight:200;line-height:1;white-space:nowrap;margin-top:calc(var(--u)*-4px)}
#idle .dt{font-size:calc(var(--u)*34px);font-weight:300;color:${IDLE.date};margin-top:calc(var(--u)*30px);white-space:nowrap}
#idle .cs{display:flex;justify-content:center;gap:calc(var(--u)*16px);margin-top:calc(var(--u)*58px);max-width:94%;flex-wrap:wrap}
#idle .ch{display:flex;align-items:center;gap:calc(var(--u)*10px);height:calc(var(--u)*52px);padding:0 calc(var(--u)*22px);border-radius:calc(var(--u)*26px);background:${IDLE.chip};border:1px solid ${IDLE.chipLine};color:${IDLE.chipText};font-size:max(14px,calc(var(--u)*20px));min-width:0}
#idle .ch .ic{width:calc(var(--u)*22px);height:calc(var(--u)*22px);min-width:16px;flex:none}
#idle .ch .tx{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(var(--u)*560px)}
#idle .ch .bar{width:4px;height:calc(var(--u)*28px);border-radius:2px;flex:none}
#idle .hint{position:absolute;left:0;right:0;bottom:calc(var(--u)*32px);text-align:center;font-size:max(12px,calc(var(--u)*14px));color:${IDLE.hint};padding:0 16px}
`;

addMethods({
  /* the one gate: false means the idle clock never shows (and is removed if showing) */
  _idleAllowed() { return !this._idleInEditor() && !this._idlePhone(); },
  /* the card editor's preview (and the dashboard editor dialogs) must never go dark */
  _idleInEditor() {
    let n = this;
    for (let i = 0; n && i < 80; i++) {
      const tag = (n.localName || '').toLowerCase();
      if (tag === 'hui-card-preview' || tag === 'hui-dialog-edit-card' || tag === 'hui-card-element-editor' || (tag === 'hui-card' && n.preview === true)) return true;
      n = n.parentNode || n.host;
    }
    return false;
  },
  /* the phone layout has no idle clock */
  _idlePhone() { return !!this._phone; },

  _idleInit() {
    const ic = this._c.general.idle_clock || {}, id = ic.presence;
    if (!isEnt(id)) return;
    this.addCss('idle', CSS);
    const el = document.createElement('div'); el.id = 'idle'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', S.idle_clock_label); el.tabIndex = -1;
    el.innerHTML = '<div class="in"><div class="tm"></div><div class="dt"></div><div class="cs"><span class="ch hide" data-k="wx"></span><span class="ch hide" data-k="ev"></span><span class="ch hide" data-k="bin"></span></div><div class="hint"></div></div>';
    this.shadowRoot.appendChild(el);
    const u = this._idle = { id, ms: minutes(ic.minutes) * MIN_MS, off: 0, touch: 0, guard: 0, shown: false, el, timer: null, tick: 0, n: 0, sig: '', time: '', timeSig: '' };
    u.down = () => { /* any touch on the card: the count starts again; a touch on the clock removes it */
      const now = Date.now(); u.touch = now;
      if (u.shown) u.guard = now + GUARD_MS;
      this._idleSync();
    };
    /* the tap that wakes the screen must not press the tile under it: clicks just after a wake are dropped */
    u.click = (e) => { if (Date.now() < u.guard) { e.stopPropagation(); e.preventDefault(); } };
    u.key = (e) => { if (u.shown && e.target === el) { u.touch = Date.now(); this._idleSync(); } };
    this.shadowRoot.addEventListener('pointerdown', u.down, true);
    this.shadowRoot.addEventListener('click', u.click, true);
    el.addEventListener('keydown', u.key);
  },
  _idleStop() {
    const u = this._idle; if (!u) return;
    clearTimeout(u.timer); clearInterval(u.tick);
    this.shadowRoot.removeEventListener('pointerdown', u.down, true); this.shadowRoot.removeEventListener('click', u.click, true);
    u.el.remove(); this._idle = null;
  },
  /* anything that must stay visible: a camera pop-up, the doorbell, an alarm about to go off or gone off */
  _idleUrgent() {
    const g = this._c.general, sc = this._c.security || {}, bell = this.$('bell');
    if (this._camKey || (bell && bell.classList.contains('show'))) return true;
    if (isEnt(sc.doorbell) && this.sv(sc.doorbell) === 'on') return true;
    return [g.alarm, sc.alarm].some((id) => isEnt(id) && ['pending', 'triggered'].includes(this.sv(id)));
  },
  /* Called on every hass update, every touch and when the timer is due. Decides whether the clock shows. */
  _idleSync() {
    const u = this._idle; if (!u || !this._built) return;
    const s = this.st(u.id), now = Date.now();
    if (!s || s.state !== 'off') u.off = 0; /* on, or bad data: someone is there */
    else if (!u.off) { const lc = Date.parse(s.last_changed); u.off = Number.isFinite(lc) && lc <= now ? lc : now; }
    const due = u.off ? Math.max(u.off, u.touch) + u.ms : 0, ok = this._idleAllowed() && !this._idleUrgent();
    const want = !!due && now >= due && ok;
    if (want && !u.shown) this._idleShow(); else if (!want && u.shown) this._idleHide();
    clearTimeout(u.timer); u.timer = null;
    if (due && now < due) u.timer = setTimeout(() => this._idleSync(), Math.min(due - now + 20, 2147483000));
    else if (due && !ok) u.timer = setTimeout(() => this._idleSync(), 15000); /* waiting for a pop-up, doorbell or alarm to clear */
    if (u.shown) this._idleFill();
  },
  _idleShow() {
    const u = this._idle; u.shown = true; u.sig = ''; u.n = 0;
    this._idleLayout(); u.el.classList.add('show');
    this._idleTime(); this._idleFill(true); this._idleFetch();
    clearInterval(u.tick); u.tick = setInterval(() => { this._idleTime(); if (++u.n % FILL_S === 0) { this._idleFetch(); this._idleFill(); } }, 1000);
  },
  _idleHide() {
    const u = this._idle; u.shown = false; clearInterval(u.tick); u.tick = 0; u.el.classList.remove('show');
  },
  /* one unit = the card scaled against the 1280 x 800 design, so the clock fills any size */
  _idleLayout() {
    const u = this._idle; if (!u) return;
    u.el.style.setProperty('--u', String(Math.max(0.4, Math.min((this.clientWidth || 1280) / 1280, (this.clientHeight || 800) / 800))));
  },
  /* refresh the events and bins when stale: the same stores as Coming up and the Family page */
  _idleFetch() {
    const again = () => { if (this._idle && this._idle.shown) this._idleFill(); };
    if (this._calStore && this._calStore() && this._calStale()) Promise.resolve(this._calFetch()).then(again);
    const fm = this._fm;
    if (fm && fm.bins.length && !fm.bs.busy && (Date.now() - fm.bs.t > 5 * MIN_MS || fm.bs.key !== new Date().toDateString())) Promise.resolve(this._fmFetchBins()).then(again);
  },
  _idleFmt(d, o) { try { return d.toLocaleTimeString(this.lang(), Object.assign({ hour: '2-digit', minute: '2-digit' }, o)); } catch (e) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); } },
  /* the time updates in place, once a second, only when its text changes */
  _idleTime() {
    const u = this._idle, now = new Date(), tf = this._h && this._h.locale && this._h.locale.time_format;
    const tx = this._idleFmt(now, tf === '12' ? { hour12: true } : tf === '24' ? { hour12: false } : {});
    if (tx !== u.time) { u.time = tx; u.el.querySelector('.tm').textContent = tx; }
    const day = now.toDateString();
    if (day !== u.day) { u.day = day; let dt = ''; try { dt = now.toLocaleDateString(this.lang(), { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { dt = day; } u.el.querySelector('.dt').textContent = dt; }
  },
  /* the chips and the hint; rebuilt only when what they say changes */
  _idleFill(force) {
    const u = this._idle, now = new Date(), g = this._c.general, chips = {};
    const w = this.st(g.weather);
    if (w && !['unavailable', 'unknown'].includes(w.state)) {
      const tt = parseFloat(w.attributes && w.attributes.temperature), cond = WX[w.state] || '';
      const txt = [Number.isFinite(tt) ? Math.round(tt) + '°' : '', cond].filter(Boolean).join(' · ');
      if (txt) chips.wx = { ic: /rain|pour|lightning|snow/.test(w.state) ? 'rain' : /sunny|clear/.test(w.state) ? 'sun' : 'cloud', txt };
    }
    const it = this._calItems ? this._calItems(now)[0] : null;
    if (it) {
      const { e, d } = it, tm = e.allDay ? S.all_day : this._idleFmt(e.start, {});
      let when = tm;
      if (d === 1) when = S.tomorrow_cap + ' ' + tm;
      else if (d > 1) { try { when = e.start.toLocaleDateString(this.lang(), { weekday: 'short' }) + ' ' + tm; } catch (x) { when = tm; } }
      chips.ev = { bar: this._cuColour(e.ci, true), txt: t('idle_next', { title: e.title, when }) };
    }
    const fm = this._fm;
    if (fm && fm.bins.length && fm.bs.next) {
      const pick = (day) => fm.bins.filter((b, i) => fm.bs.next[i] === day).map((b) => b.label || this.name(b.entity));
      const td = pick(0), tm = pick(1);
      if (td.length) chips.bin = { txt: t('idle_bin_today', { label: td.join(', ') }) };
      else if (tm.length) chips.bin = { txt: t('idle_bin_tomorrow', { label: tm.join(', ') }) };
    }
    const mins = Math.max(0, Math.floor((now - u.off) / MIN_MS)), h = Math.floor(mins / 60);
    const span = mins < 1 ? t('idle_minutes_many', { n: 0 }) : mins === 1 ? S.idle_minute_one : h < 1 ? t('idle_minutes_many', { n: mins }) : t('idle_hours', { h, m: mins % 60 });
    const sig = JSON.stringify([chips, span, this.lang()]);
    if (!force && sig === u.sig) return; u.sig = sig;
    ['wx', 'ev', 'bin'].forEach((k) => {
      const el = u.el.querySelector(`[data-k="${k}"]`), c = chips[k]; el.classList.toggle('hide', !c); if (!c) return;
      el.innerHTML = (c.ic ? icon(c.ic) : '') + (c.bar ? '<i class="bar"></i>' : '') + '<span class="tx"></span>';
      el.querySelector('.tx').textContent = c.txt; if (c.bar) el.querySelector('.bar').style.background = c.bar;
    });
    u.el.querySelector('.hint').textContent = t('idle_hint', { n: span });
  },
});
