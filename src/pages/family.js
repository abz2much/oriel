/* Family page, laid out as in the approved mockup: Shopping list on the left; Calendar with Bins under it in the
   middle; To-do with Reminders under it on the right. Lists use the shared to-do controller in core.js (the same one
   as the Home shopping pop-up); reminders use the Nova page's own reader and row drawing. Every card is optional.
   A list never shows half a row: rows that do not fit are left out and a "+ N more" line says how many. */
import { registerPage } from '../core.js';
import { S, t } from '../strings.js';
import { hasEntities } from '../config.js';
import { isEnt, esc, icon, pad } from '../util.js';
import { BIN, LINE } from '../theme/fixed.js';
import { isHex, lum, hex } from '../theme/colour.js';
import { CARDS_CSS, layoutCols, fitRows } from './cards.js';

const CAL_MS = 10 * 60000, DAY = 86400000;
const CU_MS = 5 * 60000, CU_LIST = 7, CU_LOOK = 14, CU_GAP = 16, CU_COL = 692; /* Coming up on Home: refresh every 5 minutes; list 7 days, look 14 days ahead for the empty message */
const WEIGHTS = [370, 410, 320]; /* column widths in the approved mockup */
const CSS = `
#cu{right:24px;bottom:24px;width:344px;padding:12px 16px 4px;display:flex;flex-direction:column;z-index:3;cursor:pointer}
#cu .h{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:0 4px 6px;min-height:34px}
#cu .h b{font-size:22px;font-weight:400}
#cu .pill{border-radius:14px;padding:3px 10px;font-size:12px;background:rgba(var(--oriel-glass),.5);white-space:nowrap}
#cu .cr{display:flex;align-items:center;gap:12px;min-height:52px;border-top:1px solid rgba(var(--oriel-ink),.14);padding:0 4px}
#cu .cr.hide{display:none}
#cu .bar{width:4px;align-self:stretch;margin:9px 0;border-radius:2px;flex:none}
#cu .tx{flex:1;min-width:0}
#cu .tx b{display:block;font-size:16px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cu .tx span{display:block;font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cu .tm{font-size:16px;white-space:nowrap;font-variant-numeric:tabular-nums}
#cu .none{border-top:1px solid rgba(var(--oriel-ink),.14);padding:12px 4px 14px;font-size:14px}
#cu .none span{display:block;font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));margin-top:2px}
#pgFamily .card{padding:20px 22px}
#pgFamily .add{display:flex;align-items:center;gap:8px;min-height:48px;flex:none}
#pgFamily input{flex:1;min-width:0;height:44px;border:0;background:transparent;padding:0;font:inherit;font-size:14px;color:rgb(var(--oriel-ink));border-radius:8px}
#pgFamily input::placeholder{color:rgba(var(--oriel-ink),.75)}
#pgFamily .fmList{list-style:none;margin:0;padding:0}
#pgFamily .fmList li{display:flex;align-items:center;gap:12px;min-height:44px;border-top:1px solid rgba(var(--oriel-ink),.14);font-size:14px;cursor:pointer}
#pgFamily .fmList .ck{width:22px;height:22px;border-radius:7px;border:2px solid rgba(var(--oriel-ink),.7);flex:none}
#pgFamily .fmList li.done span:last-child{text-decoration:line-through;opacity:.6}
#pgFamily .fmList li.done .ck{background:rgb(var(--oriel-accent));border-color:rgb(var(--oriel-accent-strong))}
#pgFamily .fmList .ck .ic{display:none}
#pgFamily .fmList li:first-child{border-top-color:rgba(var(--oriel-ink),.14)}
#fmCal .ch{font-size:12px;text-transform:uppercase;margin:10px 0 2px}
#fmCal .ch:first-child{margin-top:8px}
#fmCal .ev .tt{min-width:0}
#fmBins{flex-shrink:0}
#fmBins .sub{margin:4px 0 14px}
#fmBinRows{display:flex;flex-wrap:wrap;gap:12px}
#fmBinRows .bn{flex:1 1 auto;min-width:96px;border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:2px;min-height:66px;position:relative}
#fmBinRows .bn .nm{font-size:12px;display:flex;align-items:center;gap:6px}
#fmBinRows .bn .nm .ic{width:14px;height:14px}
#fmBinRows .bn .dy{font-size:22px;font-weight:300;line-height:1.2;overflow-wrap:anywhere}
#fmBinRows .bn.soon{box-shadow:0 0 0 3px rgb(var(--oriel-page-ring,var(--oriel-ink))),0 0 0 5px rgba(var(--oriel-raised),.9)}
#fmRem .sub{margin:4px 0 10px}
#fmRem .nvRr{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:44px;padding:0;border-top:1px solid rgba(var(--oriel-ink),.14);border-bottom:0;font-size:14px}
#fmRem .nvRr small{font-size:14px;color:rgb(var(--oriel-ink));white-space:nowrap}
#fmRem .nvRr span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;
const HTML = () => `<div class="pgc" id="fmWrap"><div class="cols">
  <div class="col" id="fmC1"><section id="fmShop" class="card glass"></section></div>
  <div class="col" id="fmC2"><section id="fmCal" class="card glass"><div class="hd"><h3>${esc(S.calendar)}</h3><span class="pill" id="fmCalP"></span></div><div class="fit" id="fmCalBody"></div><div class="more soft hide" id="fmCalMore"></div></section>
    <section id="fmBins" class="card glass"><h3>${esc(S.bins)}</h3><div class="sm soft sub">${esc(S.bins_sub)}</div><div id="fmBinRows"></div></section></div>
  <div class="col" id="fmC3"><section id="fmTodo" class="card glass"></section>
    <section id="fmRem" class="card glass"><h3>${esc(S.reminders)}</h3><div class="sm soft sub">${esc(S.from_nova)}</div><div class="fit" id="fmRemBody"></div><div class="more soft hide" id="fmRemMore"></div></section></div>
</div></div>`;

const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayIdx = (d, base) => Math.round((day0(d) - base) / DAY);
const localDate = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s); };
/* a calendar API event -> { allDay, start, end (exclusive for all-day), title } */
export function parseEvent(ev) {
  const raw = (v) => (v && typeof v === 'object' ? v.dateTime || v.date : v);
  const a = raw(ev.start), b = raw(ev.end); if (!a) return null;
  const allDay = (ev.start && typeof ev.start === 'object' && !!ev.start.date && !ev.start.dateTime) || (typeof a === 'string' && a.length === 10);
  const start = allDay ? localDate(a) : new Date(a), end = b ? (allDay ? localDate(b) : new Date(b)) : start;
  if (isNaN(start)) return null;
  return { allDay, start, end: isNaN(end) ? start : end, title: String(ev.summary || '') };
}
/* day indexes (0 = today) an event covers; all-day ends are exclusive */
export function spanOf(e, base) {
  const s = dayIdx(e.start, base); let en = e.allDay ? dayIdx(e.end, base) - 1 : dayIdx(new Date(e.end - (e.end > e.start ? 1 : 0)), base);
  if (en < s) en = s; return [s, en];
}
const fetchCal = (self, id, a, b) => self._h.callApi('GET', 'calendars/' + id + '?start=' + encodeURIComponent(a.toISOString()) + '&end=' + encodeURIComponent(b.toISOString()));

const FamilyExt = {
  /* ---------- Coming up (a card on Home, under the room panel; uses the calendars set for this page) ---------- */
  _cuInit() {
    const home = this.$('pgHome'), cals = (this._c.family.calendars || []).filter((c) => c && isEnt(c.entity)).slice(0, 8);
    if (!home || !cals.length || this._c.home.calendar === false) return;
    const el = document.createElement('div'); el.id = 'cu'; el.className = 'abs glass mid hide';
    el.innerHTML = `<div class="h"><b>${esc(S.coming_up)}</b><span class="pill"></span></div><div class="rows"></div>`;
    el.setAttribute('aria-label', S.coming_up + ' · ' + S.page_family);
    this.tap(el, () => this._setPage('family'));
    home.appendChild(el);
    this._cu = { el, cals, t: 0, key: '', data: null, err: false, busy: false, fitT: 0 };
  },
  _cuStop() { const cu = this._cu; if (!cu) return; cu.el.remove(); this._cu = null; const r = this.$('room'); if (r) r.style.maxHeight = ''; },
  async _cuFetch() {
    const cu = this._cu; if (!cu || cu.busy || !this._h) return; cu.busy = true;
    const base = day0(new Date()), end = new Date(base.getTime() + (CU_LOOK + 1) * DAY);
    const res = await Promise.all(cu.cals.map(async (c) => { try { const r = await fetchCal(this, c.entity, base, end); return Array.isArray(r) ? r : []; } catch (e) { return null; } }));
    if (this._cu !== cu) return;
    if (res.some((r) => r !== null)) cu.data = res.map((r, i) => (r || []).map(parseEvent).filter(Boolean).map((e) => Object.assign(e, { ci: i })));
    cu.err = !cu.data; cu.t = Date.now(); cu.key = base.toDateString(); cu.busy = false;
    this._cuUpdate();
  },
  /* the calendar's colour: the colour-blind-safe pair, then the theme's green and ink; the title says which calendar it is */
  _cuColour(i) {
    const pair = LINE[this._dark ? 'dark' : this._classic ? 'classic' : 'light'];
    return [pair[0], 'rgb(var(--oriel-accent-strong))', 'rgba(var(--oriel-ink),.85)', pair[1]][i % 4];
  },
  _cuRender() {
    const cu = this._cu; if (!cu) return;
    const now = new Date(), base = day0(now), rows = cu.el.querySelector('.rows'), fmt = (d, o) => { try { return d.toLocaleDateString(this.lang(), o); } catch (e) { return ''; } };
    cu.el.querySelector('.pill').textContent = fmt(now, { weekday: 'short', day: 'numeric', month: 'short' });
    const items = [];
    (cu.data || []).forEach((list) => list.forEach((e) => {
      const [s, en] = spanOf(e, base);
      if (en < 0 || s > CU_LOOK) return;
      if (!e.allDay && (e.end > e.start ? e.end <= now : e.start < now)) return; /* finished */
      items.push({ e, d: Math.max(s, 0) });
    }));
    items.sort((x, y) => x.d - y.d || (x.e.allDay - y.e.allDay) || x.e.start - y.e.start || x.e.title.localeCompare(y.e.title));
    const list = items.filter((x) => x.d < CU_LIST).slice(0, 3), sig = JSON.stringify([list.map((x) => [x.e.title, x.d, +x.e.start, x.e.allDay, x.e.ci]), items.length && items[0].d, cu.err, this.lang(), !!this._dark, !!this._classic]) + now.toDateString();
    if (cu.sig === sig) return; cu.sig = sig; cu.fitted = false;
    rows.innerHTML = '';
    if (!list.length) {
      const nx = items[0], n = document.createElement('div'); n.className = 'none';
      n.textContent = cu.err ? S.calendar_unavailable : S.nothing_coming_up;
      if (nx && !cu.err) { const sp = document.createElement('span'); sp.textContent = t('next_event', { d: fmt(new Date(base.getTime() + nx.d * DAY + 7200000), { weekday: 'short', day: 'numeric', month: 'short' }) }); n.appendChild(sp); }
      rows.appendChild(n); return;
    }
    list.forEach(({ e, d }) => {
      const r = document.createElement('div'); r.className = 'cr';
      r.innerHTML = '<i class="bar"></i><div class="tx"><b></b><span></span></div><span class="tm"></span>';
      r.querySelector('.bar').style.background = this._cuColour(e.ci);
      r.querySelector('b').textContent = e.title; r.title = e.title;
      const day = new Date(base.getTime() + d * DAY + 7200000);
      r.querySelector('.tx span').textContent = d === 0 ? S.today : d === 1 ? S.tomorrow_cap : fmt(day, d < 7 ? { weekday: 'short' } : { weekday: 'short', day: 'numeric', month: 'short' });
      r.querySelector('.tm').textContent = e.allDay ? S.all_day : pad(e.start.getHours()) + ':' + pad(e.start.getMinutes());
      rows.appendChild(r);
    });
  },
  /* The card is as tall as its rows. It takes the space under the room panel: rows that do not fit are left out
     (none at all: the card hides) and the room panel is held above it. Needs Home on screen to measure. */
  _cuFit() {
    const cu = this._cu, room = this.$('room'); if (!cu || this._page !== 'home' || !cu.sig) return;
    cu.el.classList.remove('hide'); room.style.maxHeight = '';
    const rows = [...cu.el.querySelectorAll('.cr, .none')]; rows.forEach((r) => r.classList.remove('hide'));
    const used = room.classList.contains('hide') ? 0 : room.scrollHeight + CU_GAP, avail = CU_COL - used;
    const hs = rows.map((r) => r.offsetHeight), chrome = cu.el.offsetHeight - hs.reduce((x, y) => x + y, 0);
    let n = rows.length, h = chrome + hs.reduce((x, y) => x + y, 0);
    while (n > 0 && h > avail) { n--; rows[n].classList.add('hide'); h -= hs[n]; }
    cu.el.classList.toggle('hide', n === 0);
    if (!room.classList.contains('hide')) room.style.maxHeight = (n === 0 ? CU_COL : CU_COL - cu.el.offsetHeight - CU_GAP) + 'px';
    cu.fitted = true;
  },
  _cuUpdate() {
    const cu = this._cu; if (!cu || !this._h) return;
    if (!cu.busy && (Date.now() - cu.t > CU_MS || cu.key !== new Date().toDateString())) this._cuFetch();
    if (cu.data || cu.err) { this._cuRender(); }
    if (this._page === 'home' && (!cu.fitted || Date.now() - cu.fitT > 1500)) { cu.fitT = Date.now(); this._cuFit(); }
  },

  _fmInit() {
    this.addCss('cards', CARDS_CSS);
    const pg = document.createElement('div'); pg.id = 'pgFamily'; pg.innerHTML = HTML();
    const $ = (id) => pg.querySelector('#' + id), F = this._c.family;
    const fm = this._fm = { pg, $, cal: { t: 0, key: '' }, bs: { t: 0, key: '' }, sig: {}, views: [], fits: [] };
    fm.shop = isEnt(F.shopping) ? F.shopping : ''; fm.todo = isEnt(F.todo) ? F.todo : '';
    fm.cals = (F.calendars || []).filter((c) => c && isEnt(c.entity)).slice(0, 8);
    fm.bins = (F.bins || []).filter((b) => b && isEnt(b.entity));
    fm.rem = this._c.nova.enabled === true && F.reminders !== false && isEnt(this._c.nova.entities.reminders);
    $('fmShop').classList.toggle('hide', !fm.shop); $('fmTodo').classList.toggle('hide', !fm.todo); $('fmCal').classList.toggle('hide', !fm.cals.length);
    $('fmBins').classList.toggle('hide', !fm.bins.length); $('fmRem').classList.toggle('hide', !fm.rem);
    $('fmCalP').textContent = fm.cals.length === 1 ? fm.cals[0].name || this.name(fm.cals[0].entity) : t('n_calendars', { n: fm.cals.length });
    if (fm.shop) this._fmTodoCard($('fmShop'), fm.shop, S.shopping_list, true);
    if (fm.todo) this._fmTodoCard($('fmTodo'), fm.todo, S.todo_list, false);
    layoutCols(pg, WEIGHTS);
    this._cuInit();
    return pg;
  },
  _fmStop() {
    this._cuStop();
    const fm = this._fm; if (!fm) return;
    fm.views.forEach(([id, fn]) => { if (this._td && this._td[id]) this._td[id].views.delete(fn); });
    this._fm = null;
  },
  /* re-measure every list that trims itself (only meaningful while the page is showing) */
  _fmFit() { const fm = this._fm; if (!fm || this._page !== 'family') return; fm.fits.forEach((f) => { try { f(); } catch (e) { console.warn('[oriel] family fit', e); } }); },
  /* one list card. The shopping card also has the add box and "Clear done"; the to-do card only ticks. */
  _fmTodoCard(card, id, title, full) {
    card.innerHTML = `<div class="hd"><h3></h3><span class="pill"></span></div>${full ? `<form class="add" autocomplete="off"><input placeholder="${esc(S.add_item)}" aria-label="${esc(S.add_item)}" enterkeyhint="done"><button type="submit" class="sb" aria-label="${esc(S.add)}">${icon('plus')}</button></form>` : ''}<div class="fit"><ul class="fmList"></ul></div><div class="more soft"><span class="mn"></span><span class="sep"> · </span><button type="button" class="lnk">${esc(S.clear_done)}</button></div>`;
    card.querySelector('h3').textContent = title;
    const pill = card.querySelector('.pill'), box = card.querySelector('.fit'), ul = card.querySelector('ul'), foot = card.querySelector('.more'), mn = card.querySelector('.mn'), sep = card.querySelector('.sep'), clr = card.querySelector('.lnk');
    const empty = full ? S.nothing_on_list : S.nothing_to_do;
    let hidden = 0;
    const fit = () => {
      if (this._page !== 'family') return; /* a hidden page has no height to measure */
      const rows = [...ul.children].filter((r) => r.tagName === 'LI');
      mn.textContent = t('more_n', { n: 99 }); foot.classList.remove('hide'); sep.classList.remove('hide'); mn.classList.remove('hide');
      hidden = fitRows(box, rows);
      mn.textContent = hidden ? t('more_n', { n: hidden }) : ''; mn.classList.toggle('hide', !hidden); sep.classList.toggle('hide', !hidden || !full);
      clr.classList.toggle('hide', !full); foot.classList.toggle('hide', !hidden && !full);
    };
    const view = () => {
      const left = this._todoRows(ul, id, empty);
      pill.textContent = left ? t(left === 1 ? 'items_one' : 'items_many', { n: left }) : '';
      pill.classList.toggle('hide', !left);
      clr.disabled = !(this._todo(id).items || []).some((i) => i.status === 'completed');
      fit();
    };
    if (full) {
      const inp = card.querySelector('input');
      card.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const tx = inp.value.trim(); if (tx) { inp.value = ''; this._todoAdd(id, tx); } });
      clr.addEventListener('click', () => this._todoClear(id));
    }
    this._todo(id).views.add(view); this._fm.views.push([id, view]); this._fm.fits.push(fit);
    view();
  },

  /* ---------- calendar ---------- */
  async _fmFetchCalendar() {
    const fm = this._fm; if (!fm || fm.cal.busy || !this._h) return; fm.cal.busy = true;
    const base = day0(new Date()), end = new Date(base.getTime() + 7 * DAY + 3600000);
    const res = await Promise.all(fm.cals.map(async (c) => { try { const r = await fetchCal(this, c.entity, base, end); return Array.isArray(r) ? r : []; } catch (e) { return null; } }));
    fm.cal.data = res.map((r, i) => (r || []).map(parseEvent).filter(Boolean).map((e) => Object.assign(e, { cal: fm.cals[i].name || '' })));
    fm.cal.err = res.every((r) => r === null); fm.cal.t = Date.now(); fm.cal.key = base.toDateString(); fm.cal.busy = false; fm.cal.base = base;
    if (this._fm === fm) this._fmRenderCalendar();
  },
  _fmRenderCalendar() {
    const fm = this._fm; if (!fm || !fm.cal.data) return;
    const base = fm.cal.base, body = fm.$('fmCalBody');
    const sig = JSON.stringify([fm.cal.data, fm.cal.err, this.lang()]); if (fm.sig.cal !== sig) {
      fm.sig.cal = sig;
      const groups = [{ k: 'today', n: S.today, ev: [] }, { k: 'tomorrow', n: S.tomorrow_cap, ev: [] }, { k: 'week', n: S.this_week, ev: [] }];
      fm.cal.data.forEach((list) => list.forEach((e) => {
        const [s, en] = spanOf(e, base);
        if (en < 0 || s > 6) return;
        [[0, 0], [1, 1], [2, 6]].forEach(([lo, hi], gi) => { if (s <= hi && en >= lo) groups[gi].ev.push({ e, d: Math.max(s, lo) }); });
      }));
      body.innerHTML = '';
      if (fm.cal.err) { body.innerHTML = `<div class="empty">${esc(S.calendar_unavailable)}</div>`; }
      else {
        const fmt = (d, o) => { try { return d.toLocaleDateString(this.lang(), o); } catch (e) { return ''; } };
        const tm = (d) => { try { return d.toLocaleTimeString(this.lang(), { hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return ''; } };
        groups.forEach((g) => {
          g.ev.sort((x, y) => x.d - y.d || (y.e.allDay - x.e.allDay) || x.e.start - y.e.start || x.e.title.localeCompare(y.e.title));
          const sec = document.createElement('div'); sec.className = 'cs'; sec.innerHTML = `<div class="ch soft"></div>`; sec.firstChild.textContent = g.n;
          if (!g.ev.length) sec.insertAdjacentHTML('beforeend', `<div class="row none soft"><span>${esc(S.nothing_planned)}</span></div>`);
          g.ev.forEach(({ e, d }) => {
            const row = document.createElement('div'); row.className = 'row ev'; row.dataset.ev = '1';
            const wd = g.k === 'week' ? fmt(new Date(base.getTime() + d * DAY + 7200000), { weekday: 'short' }) : '';
            const when = e.allDay ? (wd ? wd + ' · ' + S.all_day : S.all_day) : (wd ? wd + ' ' : '') + tm(e.start);
            row.innerHTML = '<span class="tt"></span><span></span>'; row.firstChild.textContent = e.title; row.lastChild.textContent = when;
            if (e.cal) row.title = e.cal;
            sec.appendChild(row);
          });
          body.appendChild(sec);
        });
      }
    }
    this._fmFitCalendar();
  },
  /* leave out the events that do not fit, and any section left with none, then say how many */
  _fmFitCalendar() {
    const fm = this._fm; if (!fm || this._page !== 'family') return;
    const body = fm.$('fmCalBody'), more = fm.$('fmCalMore'), secs = [...body.querySelectorAll('.cs')], rows = [...body.querySelectorAll('[data-ev]')];
    secs.forEach((s) => s.classList.remove('hide')); more.textContent = t('more_n', { n: 99 }); more.classList.remove('hide');
    const hidden = fitRows(body, rows);
    secs.forEach((s) => { const evs = [...s.querySelectorAll('[data-ev]')]; if (evs.length && evs.every((r) => r.classList.contains('hide'))) s.classList.add('hide'); });
    more.textContent = t('more_n', { n: hidden }); more.classList.toggle('hide', !hidden);
  },

  /* ---------- bins ---------- */
  async _fmFetchBins() {
    const fm = this._fm; if (!fm || fm.bs.busy || !this._h) return; fm.bs.busy = true;
    const base = day0(new Date()), end = new Date(base.getTime() + 28 * DAY);
    const res = await Promise.all(fm.bins.map(async (b) => { try { const r = await fetchCal(this, b.entity, base, end); return Array.isArray(r) ? r : []; } catch (e) { return null; } }));
    fm.bs.next = res.map((r) => {
      if (!r) return null;
      const days = r.map(parseEvent).filter(Boolean).map((e) => Math.max(0, spanOf(e, base)[0])).sort((a, b) => a - b);
      return days.length ? days[0] : -1;
    });
    fm.bs.base = base; fm.bs.t = Date.now(); fm.bs.key = base.toDateString(); fm.bs.busy = false;
    if (this._fm === fm) this._fmRenderBins();
  },
  _fmBinColour(b) {
    const c = String(b.colour || '').trim().toLowerCase(), l = String(b.label).toLowerCase(), guess = /black/.test(l) ? 'black' : /brown/.test(l) ? 'brown' : /green/.test(l) ? 'green' : '';
    return BIN[c] || (isHex(c) ? c : BIN[guess] || '');
  },
  /* one tile per bin: its name small, the next collection large ("Tomorrow", "Thu 6"). Today and tomorrow get a ring and a bell as well. */
  _fmRenderBins() {
    const fm = this._fm; if (!fm || !fm.bs.next) return;
    const sig = JSON.stringify([fm.bs.next, fm.bs.key, this.lang()]); if (fm.sig.bins === sig) return; fm.sig.bins = sig;
    const box = fm.$('fmBinRows'); box.innerHTML = '';
    const n = fm.bins.length, basis = n === 4 ? 'calc(50% - 6px)' : n > 4 ? 'calc(33.3% - 8px)' : '';
    fm.bins.forEach((b, i) => {
      const d = fm.bs.next[i], col = this._fmBinColour(b), tile = document.createElement('div'), soon = d === 0 || d === 1;
      tile.className = 'bn tap' + (soon ? ' soon' : ''); if (basis) tile.style.flexBasis = basis;
      const label = b.label || this.name(b.entity);
      let txt = d == null ? '–' : d < 0 ? S.bin_none : d === 0 ? S.bin_today : d === 1 ? S.bin_tomorrow : '';
      if (d >= 2) { const dt = new Date(fm.bs.base.getTime() + d * DAY + 7200000); try { txt = dt.toLocaleDateString(this.lang(), { weekday: 'short', day: 'numeric' }); } catch (e) { txt = dt.toDateString(); } }
      const dark = col && isHex(col) ? lum(hex(col)) < 0.5 : true;
      tile.style.background = col || 'rgba(var(--oriel-ink),.12)'; tile.style.color = dark ? 'rgb(var(--oriel-on-dark))' : 'rgb(var(--oriel-black))';
      tile.innerHTML = `<span class="nm">${soon ? icon('bell') : ''}<span></span></span><span class="dy"></span>`;
      tile.querySelector('.nm span:last-child').textContent = label; tile.querySelector('.dy').textContent = txt;
      tile.setAttribute('aria-label', label + ': ' + txt);
      this.tap(tile, () => this.moreInfo(b.entity)); box.appendChild(tile);
    });
  },

  /* "Today 20:00", "Tomorrow 09:00", "Thu 18:30" */
  _fmWhen(v) {
    const d = new Date(v); if (!v || isNaN(d)) return '';
    const base = day0(new Date()), i = dayIdx(d, base), tm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (i === 0) return t('bin_today') + ' ' + tm; if (i === 1) return S.bin_tomorrow + ' ' + tm;
    let wd = ''; try { wd = d.toLocaleDateString(this.lang(), i > 1 && i < 7 ? { weekday: 'short' } : { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { wd = ''; }
    return wd + ' ' + tm;
  },
  _fmRenderReminders() {
    const fm = this._fm; if (!fm || !fm.rem) return;
    const list = this._nvRemList(), sig = JSON.stringify(list) + this.lang();
    if (fm.sig.rem !== sig) { fm.sig.rem = sig; this._nvRemRows(fm.$('fmRemBody'), list, S.nothing_due, (v) => this._fmWhen(v)); }
    if (this._page !== 'family') return;
    const body = fm.$('fmRemBody'), more = fm.$('fmRemMore'); more.textContent = t('more_n', { n: 99 }); more.classList.remove('hide');
    const hidden = fitRows(body, [...body.querySelectorAll('.nvRr')]);
    more.textContent = t('more_n', { n: hidden }); more.classList.toggle('hide', !hidden);
  },

  _updateFamily() {
    const fm = this._fm; if (!fm || !this._h) return;
    const now = Date.now(), key = new Date().toDateString();
    if (!fm.loaded) { fm.loaded = true; if (fm.shop) this._todoLoad(fm.shop); if (fm.todo) this._todoLoad(fm.todo); }
    if (fm.shop) this._todoWatch(fm.shop); if (fm.todo) this._todoWatch(fm.todo);
    if (fm.cals.length && (now - fm.cal.t > CAL_MS || fm.cal.key !== key)) this._fmFetchCalendar();
    if (fm.bins.length && (now - fm.bs.t > CAL_MS || fm.bs.key !== key)) this._fmFetchBins();
    this._fmRenderReminders(); this._fmFitCalendar(); this._fmFit();
  },
};

registerPage({
  key: 'family', icon: 'family',
  label() { return S.page_family; },
  css: CSS,
  enabled(c) { return hasEntities(c.family); },
  init() { return this._fmInit(); },
  update() { this._updateFamily(); },
  always() { this._cuUpdate(); },
  stop() { this._fmStop(); },
  methods: FamilyExt,
});
