/* Navigation motion and auto rotation. Not a page.
   - The sliding indicator: the phone bar's bubble and the tablet rail's chip. It is an <i aria-hidden> behind the links, placed by
     measuring the active item (never from a fixed width), and recreated on every rebuild of the rail or the tabs.
   - The card fade on a page change (a CSS animation on the cards, class navFx, that ends with no transform left behind).
   - Auto rotation (general.auto_rotate): off unless enabled is true. One timer; it goes through _setPage like a tap does. */
import { addMethods } from './core.js';

const FADE_SEL = '.glass,.dark,.black,.nova,.card';
const FADE_STEP = 70, FADE_SPREAD = 500; /* ms between cards; the last card starts no later than FADE_SPREAD */
/* every pop-up that can sit over a page, by id (the phone's More sheet included) */
const OVERLAYS = ['more', 'shop', 'bell', 'vcConf', 'vcMenu', 'nvConf', 'lrPanel'];
const MAX_TIMER = 2147483000;
const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const seconds = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

addMethods({
  /* ---------- the indicator ---------- */
  /* Called after the rail and the tab bar were rebuilt (both use innerHTML): new indicators, placed at once with no transition. */
  _navBuild() {
    this._navStop();
    const rail = this.$('rail'), tabs = this.$('tabs'); if (!rail || !tabs) return;
    this._navInd = [];
    const add = (box, group) => {
      const i = document.createElement('i'); i.className = 'navI hid'; i.setAttribute('aria-hidden', 'true'); i.dataset.g = group;
      box.insertBefore(i, box.firstChild); this._navInd.push(i); return i;
    };
    const pl = rail.querySelector(':scope>.pl');
    if (pl) add(pl, 'pl'); /* inside .pl, so the chip scrolls with the items when .pl scrolls */
    if (rail.querySelector(':scope>a.end')) add(rail, 'end'); /* the bottom group sits outside .pl, so it has its own chip */
    add(tabs, 'tabs');
    rail.classList.add('nv'); tabs.classList.add('nv');
    this._navPlace(false);
    if (typeof ResizeObserver === 'function') { /* a resize, a label that wraps, the phone/tablet flip: measure again */
      this._navRo = new ResizeObserver(() => this._navPlace(false));
      [rail, pl, tabs].concat([...rail.querySelectorAll('a'), ...tabs.querySelectorAll('a')]).forEach((n) => n && this._navRo.observe(n));
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (this._built) this._navPlace(false); }); /* the font swaps in after first paint */
  },
  _navStop() { if (this._navRo) { this._navRo.disconnect(); this._navRo = null; } this._navInd = null; },
  /* Put each indicator on its group's active item. animate: slide there (a page change); otherwise jump, with no transition. */
  _navPlace(animate) {
    if (!this._navInd) return;
    const rail = this.$('rail'), tabs = this.$('tabs'); if (!rail || !tabs) return;
    this._navInd.forEach((ind) => {
      const g = ind.dataset.g, box = g === 'pl' ? rail.querySelector(':scope>.pl') : g === 'end' ? rail : tabs;
      const a = box && box.querySelector(g === 'end' ? ':scope>a.on' : 'a.on');
      if (!a || !a.offsetWidth || !a.offsetHeight) { /* nothing active in this group, or the bar is not showing: it fades out where it was */
        if (animate && !ind.classList.contains('hid')) ind.classList.add('go');
        ind.classList.add('hid'); ind._m = null; return;
      }
      const x = a.offsetLeft, y = a.offsetTop, w = a.offsetWidth, h = a.offsetHeight, m = [x, y, w, h].join(), wasShown = !ind.classList.contains('hid');
      if (wasShown && ind._m === m) return; /* already there: a slide in progress is left alone */
      ind._m = m;
      const slide = !!animate && wasShown;
      ind.classList.toggle('go', slide); /* no transition on first paint, a rebuild or a resize: only a page change slides */
      ind.style.width = w + 'px'; ind.style.height = h + 'px';
      if (g === 'tabs') { ind.style.top = y + 'px'; ind.style.transform = `translateX(${x}px)`; }
      else { ind.style.left = x + 'px'; ind.style.transform = `translateY(${y}px)`; }
      if (!wasShown) { void ind.offsetWidth; if (animate) ind.classList.add('go'); ind.classList.remove('hid'); } /* arriving from another group: fades in where it belongs */
    });
  },

  /* ---------- the card fade ---------- */
  /* The cards of the page just shown fade in and rise 16 px, 70 ms apart (the last no later than 500 ms). The cards themselves are
     animated, not their wrappers, and the animation ends at transform:none, so nothing is left to break fixed children or backdrop-filter. */
  _navFade(pageEl) {
    this.shadowRoot.querySelectorAll('.navFx').forEach((c) => { c.classList.remove('navFx'); c.style.removeProperty('--nd'); });
    if (reduced() || !pageEl) return;
    const all = [...pageEl.querySelectorAll(FADE_SEL)];
    const cards = all.filter((c) => {
      if (all.some((o) => o !== c && o.contains(c)) || !c.getClientRects().length) return false; /* the outer cards only, and only those showing */
      const cs = getComputedStyle(c); return cs.transform === 'none' && cs.animationName === 'none'; /* a card that places itself with a transform, or already animates, is left alone */
    }).map((c) => ({ c, q: c.getBoundingClientRect() })).sort((a, b) => (Math.round(a.q.top / 24) - Math.round(b.q.top / 24)) || (a.q.left - b.q.left));
    const step = cards.length > 1 ? Math.min(FADE_STEP, FADE_SPREAD / (cards.length - 1)) : 0;
    cards.forEach(({ c }, i) => {
      c.style.setProperty('--nd', Math.round(i * step) + 'ms');
      const done = (e) => { if (e.target !== c) return; c.classList.remove('navFx'); c.style.removeProperty('--nd'); c.removeEventListener('animationend', done); c.removeEventListener('animationcancel', done); };
      c.addEventListener('animationend', done); c.addEventListener('animationcancel', done);
      c.classList.add('navFx');
    });
  },

  /* ---------- auto rotation ---------- */
  _arInit() {
    this._arStop();
    const o = (this._c.general || {}).auto_rotate || {};
    if (o.enabled !== true || this._idleInEditor()) return; /* off unless it is switched on; never in the card editor's preview */
    const a = this._ar = { idle: seconds(o.idle_seconds, 60, 5, 3600) * 1000, after: seconds(o.after_touch_seconds, 300, 5, 86400) * 1000, at: Date.now(), by: 'auto', timer: null };
    a.down = () => this._arNote(false); /* any touch on the card */
    a.vis = () => { if (!document.hidden) { a.at = Date.now(); a.by = 'auto'; this._arSchedule(); } }; /* back on screen: a fresh interval */
    this.shadowRoot.addEventListener('pointerdown', a.down, true);
    document.addEventListener('visibilitychange', a.vis);
    this._arSchedule();
  },
  _arStop() {
    const a = this._ar; if (!a) return;
    clearTimeout(a.timer);
    if (this.shadowRoot) this.shadowRoot.removeEventListener('pointerdown', a.down, true);
    document.removeEventListener('visibilitychange', a.vis);
    this._ar = null;
  },
  /* a person did something (a touch, or a page change that is not automatic): the long wait starts from now */
  _arNote(auto) {
    const a = this._ar; if (!a || auto) return;
    a.at = Date.now(); a.by = 'person'; this._arSchedule();
  },
  _arDue() { const a = this._ar; return a.at + (a.by === 'person' ? a.after : a.idle); },
  /* the one timer */
  _arSchedule() {
    const a = this._ar; if (!a) return;
    clearTimeout(a.timer);
    a.timer = setTimeout(() => this._arTick(), Math.min(MAX_TIMER, Math.max(0, this._arDue() - Date.now()) + 20));
  },
  _arTick() {
    const a = this._ar; if (!a || !this._built) return;
    const now = Date.now();
    if (now < this._arDue()) { this._arSchedule(); return; } /* touched meanwhile */
    const order = this._navOrder || [];
    if (this._arBlocked() || order.length < 2) { a.at = now; a.by = 'auto'; this._arSchedule(); return; } /* in the way: ask again after a full interval */
    const next = order[(order.indexOf(this._page) + 1) % order.length];
    a.at = now; a.by = 'auto';
    this._setPage(next, { auto: true });
    this._arSchedule();
  },
  /* the idle clock, a pop-up or sheet, a text field with focus, a hidden tab */
  _arBlocked() {
    if (document.hidden) return true;
    if (this._idle && this._idle.shown) return true;
    const r = this.shadowRoot;
    if (this._shopOpen || OVERLAYS.some((id) => { const el = r.getElementById(id); return !!el && el.classList.contains('show'); })) return true;
    const f = r.activeElement;
    return !!f && (/^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName) || f.isContentEditable);
  },
});
