/* Family page: shopping list, calendar (today, tomorrow, this week), bin collections, a second to-do list and
   Nova's reminders. Lists use the shared to-do controller in core.js (the same one as the Home shopping pop-up);
   reminders use the Nova page's own reader and row drawing. Every card is optional. */
import { registerPage } from '../core.js';
import { S, t } from '../strings.js';
import { hasEntities } from '../config.js';
import { isEnt, esc, icon } from '../util.js';
import { BIN } from '../theme/fixed.js';
import { isHex, lum, hex } from '../theme/colour.js';
import { CARDS_CSS, layoutCols } from './cards.js';

const CAL_MS = 10 * 60000, DAY = 86400000;
const CSS = `
#pgFamily .fmList{list-style:none;margin:0;padding:0;flex:1;min-height:0;overflow-y:auto}
#pgFamily .fmList li{display:flex;align-items:center;gap:12px;min-height:44px;padding:6px 12px;border-radius:16px;background:rgba(var(--oriel-glass),.5);margin-bottom:6px;font-size:14.5px;cursor:pointer}
#pgFamily .fmList .ck{width:24px;height:24px;border-radius:50%;border:2px solid rgba(var(--oriel-ink),.45);flex:none;display:grid;place-items:center}
#pgFamily .fmList li.done{opacity:.6;text-decoration:line-through} #pgFamily .fmList li.done .ck{background:rgb(var(--oriel-accent-fill));border-color:rgb(var(--oriel-accent-strong));color:rgb(var(--oriel-ink-on-accent))}
#pgFamily .fmList .ck .ic{width:14px;height:14px;stroke-width:2.4}
#pgFamily form{display:flex;gap:8px;margin:0}
#pgFamily input{flex:1;min-width:0;height:44px;border-radius:22px;border:1px solid rgba(var(--oriel-ink),.2);background:rgb(var(--oriel-raised));padding:0 16px;font:inherit;font-size:14.5px;color:rgb(var(--oriel-ink))}
#pgFamily input::placeholder{color:rgba(var(--oriel-ink),.75)}
#pgFamily .clr{height:44px;border-radius:22px;border:0;background:rgb(var(--oriel-ink-fill));color:rgb(var(--oriel-on-dark));font-size:14px;cursor:pointer}
#pgFamily .clr:disabled{opacity:.45;cursor:default}
#fmCal .cs{display:flex;flex-direction:column;gap:2px} #fmCal .cs+.cs{margin-top:8px}
#fmCal .ch{font-size:12px;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));padding-bottom:2px}
#fmCal .ev{display:grid;grid-template-columns:62px minmax(0,1fr);gap:10px;align-items:center;min-height:44px;border-top:1px solid rgba(var(--oriel-ink),.09);font-size:14px}
#fmCal .ev .w{display:flex;flex-direction:column;line-height:1.2;font-size:13px;font-variant-numeric:tabular-nums} #fmCal .ev .w small{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}
#fmCal .ev .ad{display:inline-block;align-self:flex-start;font-size:12px;padding:1px 8px;border-radius:10px;border:1px solid rgba(var(--oriel-ink),.4)}
#fmCal .ev .tx{display:flex;flex-direction:column;min-width:0} #fmCal .ev .tx span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #fmCal .ev .tx small{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}
#fmCal .none{font-size:13px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));padding:6px 0;border-top:1px solid rgba(var(--oriel-ink),.09)}
#fmCalBody{flex:1;min-height:0;overflow-y:auto}
#fmBins .bn{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:12px;align-items:center;min-height:48px;border-radius:16px;padding:4px 8px;font-size:14.5px}
#fmBins .bn .sw{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;border:2px solid rgba(var(--oriel-ink),.55)}
#fmBins .bn .sw .ic{width:16px;height:16px}
#fmBins .bn .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#fmBins .bn .dy{font-size:13.5px;white-space:nowrap;font-variant-numeric:tabular-nums}
#fmBins .bn.soon{background:rgb(var(--oriel-warn-bg));color:rgb(var(--oriel-warn));border:1px solid rgb(var(--oriel-warn-line))}
#fmBins .bn.soon .dy{font-weight:600;display:inline-flex;align-items:center;gap:6px} #fmBins .bn.soon .dy .ic{width:16px;height:16px}
`;
const HTML = () => `<div class="pgc" id="fmWrap"><div class="cols">
  <div class="col" id="fmC1"><section id="fmShop" class="card grow glass mid"></section><section id="fmTodo" class="card grow glass mid"></section></div>
  <div class="col" id="fmC2"><section id="fmCal" class="card grow glass mid"><div class="hd"><span>${esc(S.calendar)}</span></div><div id="fmCalBody"></div></section></div>
  <div class="col" id="fmC3"><section id="fmBins" class="card glass mid"><div class="hd"><span>${esc(S.bins)}</span></div><div id="fmBinRows"></div></section>
    <section id="fmRem" class="card grow glass mid"><div class="hd"><span>${esc(S.reminders)}</span><small>${esc(S.next_24h)}</small></div><div id="fmRemBody"></div></section></div>
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
  _fmInit() {
    this.addCss('cards', CARDS_CSS);
    const pg = document.createElement('div'); pg.id = 'pgFamily'; pg.innerHTML = HTML();
    const $ = (id) => pg.querySelector('#' + id), F = this._c.family;
    const fm = this._fm = { pg, $, cal: { t: 0, key: '' }, bs: { t: 0, key: '' }, sig: {}, views: [] };
    fm.shop = isEnt(F.shopping) ? F.shopping : ''; fm.todo = isEnt(F.todo) ? F.todo : '';
    fm.cals = (F.calendars || []).filter((c) => c && isEnt(c.entity)).slice(0, 8);
    fm.bins = (F.bins || []).filter((b) => b && isEnt(b.entity));
    fm.rem = this._c.nova.enabled === true && F.reminders !== false && isEnt(this._c.nova.entities.reminders);
    $('fmShop').classList.toggle('hide', !fm.shop); $('fmTodo').classList.toggle('hide', !fm.todo); $('fmCal').classList.toggle('hide', !fm.cals.length);
    $('fmBins').classList.toggle('hide', !fm.bins.length); $('fmRem').classList.toggle('hide', !fm.rem);
    if (fm.shop) this._fmTodoCard($('fmShop'), fm.shop, S.shopping_list, 'to_buy', S.nothing_on_list);
    if (fm.todo) this._fmTodoCard($('fmTodo'), fm.todo, S.todo_list, 'n_to_do', S.nothing_to_do);
    // a column with two cards splits its height; with one, it fills
    layoutCols(pg);
    return pg;
  },
  _fmStop() {
    const fm = this._fm; if (!fm) return;
    fm.views.forEach(([id, fn]) => { if (this._td && this._td[id]) this._td[id].views.delete(fn); });
    this._fm = null;
  },
  /* one list card: title and count, add box, the rows, "Clear done" */
  _fmTodoCard(card, id, title, countKey, empty) {
    card.innerHTML = `<div class="hd"><span></span><small></small></div><form autocomplete="off"><input placeholder="${esc(S.add_item)}" aria-label="${esc(S.add_item)}" enterkeyhint="done"><button type="submit" class="round" aria-label="${esc(S.add)}">${icon('plus')}</button></form><ul class="fmList"></ul><button type="button" class="clr">${esc(S.clear_done)}</button>`;
    card.querySelector('.hd span').textContent = title;
    const small = card.querySelector('small'), ul = card.querySelector('ul'), clr = card.querySelector('.clr'), inp = card.querySelector('input');
    const view = () => {
      const left = this._todoRows(ul, id, empty);
      small.textContent = left ? t(countKey, { n: left }) : '';
      clr.disabled = !(this._todo(id).items || []).some((i) => i.status === 'completed');
    };
    card.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const tx = inp.value.trim(); if (tx) { inp.value = ''; this._todoAdd(id, tx); } });
    clr.addEventListener('click', () => this._todoClear(id));
    this._todo(id).views.add(view); this._fm.views.push([id, view]);
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
    const base = fm.cal.base, body = fm.$('fmCalBody'), multi = fm.cals.length > 1;
    const sig = JSON.stringify([fm.cal.data, fm.cal.err, this.lang()]); if (fm.sig.cal === sig) return; fm.sig.cal = sig;
    const groups = [{ k: 'today', n: S.today, ev: [] }, { k: 'tomorrow', n: S.tomorrow_cap, ev: [] }, { k: 'week', n: S.this_week, ev: [] }];
    fm.cal.data.forEach((list) => list.forEach((e) => {
      const [s, en] = spanOf(e, base);
      if (en < 0 || s > 6) return;
      [[0, 0], [1, 1], [2, 6]].forEach(([lo, hi], gi) => { if (s <= hi && en >= lo) groups[gi].ev.push({ e, d: Math.max(s, lo) }); });
    }));
    body.innerHTML = '';
    if (fm.cal.err) { body.innerHTML = `<div class="empty">${esc(S.calendar_unavailable)}</div>`; return; }
    const fmt = (d, o) => { try { return d.toLocaleDateString(this.lang(), o); } catch (e) { return ''; } };
    const tm = (d) => { try { return d.toLocaleTimeString(this.lang(), { hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return ''; } };
    groups.forEach((g) => {
      g.ev.sort((x, y) => x.d - y.d || (y.e.allDay - x.e.allDay) || x.e.start - y.e.start || x.e.title.localeCompare(y.e.title));
      const sec = document.createElement('div'); sec.className = 'cs'; sec.innerHTML = `<div class="ch"></div>`; sec.firstChild.textContent = g.n;
      if (!g.ev.length) sec.insertAdjacentHTML('beforeend', `<div class="none">${esc(S.nothing_planned)}</div>`);
      g.ev.forEach(({ e, d }) => {
        const row = document.createElement('div'); row.className = 'ev';
        const when = e.allDay ? `<span class="ad">${esc(S.all_day)}</span>` : `<span>${esc(tm(e.start))}</span>`;
        const wd = g.k === 'week' ? fmt(new Date(base.getTime() + d * DAY + 7200000), { weekday: 'short' }) : '';
        row.innerHTML = `<div class="w">${wd ? `<b style="font-weight:500">${esc(wd)}</b>` : ''}${e.allDay ? when : wd ? `<small>${esc(tm(e.start))}</small>` : when}</div><div class="tx"><span></span>${multi && e.cal ? '<small></small>' : ''}</div>`;
        row.querySelector('.tx span').textContent = e.title;
        const sm = row.querySelector('.tx small'); if (sm) sm.textContent = e.cal;
        sec.appendChild(row);
      });
      body.appendChild(sec);
    });
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
    const c = String(b.colour || '').trim().toLowerCase(), guess = /black/.test(String(b.label).toLowerCase()) ? 'black' : /brown/.test(String(b.label).toLowerCase()) ? 'brown' : /green/.test(String(b.label).toLowerCase()) ? 'green' : '';
    return BIN[c] || (isHex(c) ? c : BIN[guess] || '');
  },
  _fmRenderBins() {
    const fm = this._fm; if (!fm || !fm.bs.next) return;
    const sig = JSON.stringify([fm.bs.next, fm.bs.key, this.lang()]); if (fm.sig.bins === sig) return; fm.sig.bins = sig;
    const box = fm.$('fmBinRows'); box.innerHTML = '';
    fm.bins.forEach((b, i) => {
      const d = fm.bs.next[i], col = this._fmBinColour(b), row = document.createElement('div'), soon = d === 0 || d === 1;
      row.className = 'bn tap' + (soon ? ' soon' : '');
      const label = b.label || this.name(b.entity);
      let txt = d == null ? '–' : d < 0 ? S.bin_none : d === 0 ? S.bin_today : d === 1 ? S.bin_tomorrow : '';
      if (d >= 2) { const dt = new Date(fm.bs.base.getTime() + d * DAY + 7200000); try { txt = dt.toLocaleDateString(this.lang(), d < 7 ? { weekday: 'short', day: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { txt = dt.toDateString(); } }
      const dark = col && isHex(col) ? lum(hex(col)) < 0.5 : true;
      row.innerHTML = `<span class="sw" style="${col ? `background:${esc(col)};` : 'background:rgba(var(--oriel-ink),.12);'}color:${dark ? 'rgb(var(--oriel-on-dark))' : 'rgb(var(--oriel-black))'}">${icon('bin')}</span><span class="nm"></span><span class="dy">${soon ? icon('bell') : ''}<span></span></span>`;
      row.querySelector('.nm').textContent = label; row.querySelector('.dy span').textContent = txt;
      row.setAttribute('aria-label', label + ': ' + txt);
      this.tap(row, () => this.moreInfo(b.entity)); box.appendChild(row);
    });
  },

  _fmRenderReminders() {
    const fm = this._fm; if (!fm || !fm.rem) return;
    const list = this._nvRemList(), sig = JSON.stringify(list) + this.lang(); if (fm.sig.rem === sig) return; fm.sig.rem = sig;
    this._nvRemRows(fm.$('fmRemBody'), list, S.nothing_due);
  },

  _updateFamily() {
    const fm = this._fm; if (!fm || !this._h) return;
    const now = Date.now(), key = new Date().toDateString();
    if (!fm.loaded) { fm.loaded = true; if (fm.shop) this._todoLoad(fm.shop); if (fm.todo) this._todoLoad(fm.todo); }
    if (fm.shop) this._todoWatch(fm.shop); if (fm.todo) this._todoWatch(fm.todo);
    if (fm.cals.length && (now - fm.cal.t > CAL_MS || fm.cal.key !== key)) this._fmFetchCalendar();
    if (fm.bins.length && (now - fm.bs.t > CAL_MS || fm.bs.key !== key)) this._fmFetchBins();
    this._fmRenderReminders();
  },
};

registerPage({
  key: 'family', icon: 'family',
  label() { return S.page_family; },
  css: CSS,
  enabled(c) { return hasEntities(c.family); },
  init() { return this._fmInit(); },
  update() { this._updateFamily(); },
  stop() { this._fmStop(); },
  methods: FamilyExt,
});
