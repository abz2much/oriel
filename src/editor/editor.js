/* Visual card editor (oriel-shell-editor). Sections that fold, tabs inside the big ones, HA's own <ha-form> for the
   fields (so entity pickers autocomplete), our own add/remove/reorder lists around it, live warnings for entities
   that are missing or the wrong type, and Auto-detect suggestions that apply only when accepted.
   It only reports changes (config-changed); saving is Home Assistant's own Save button. */
import { SECTIONS, EXAMPLE_HOUSE } from './schema.js';
import { validate, detect, getPath, setPath } from './detect.js';
import { ED, t } from '../strings.js';
import { normalise, entitiesIn } from '../config.js';
import { PAGES } from '../core.js';
import { esc } from '../util.js';
import { HA } from '../theme/fixed.js';
import { THEMES, DEFAULT_THEME, themeTokens } from '../theme/themes.js';
import { ROLE, CLASSIC_PAGE } from '../theme/tokens.js';
import { isHex } from '../theme/colour.js';

const CSS = `
:host{display:block;font-family:var(--paper-font-body1_-_font-family,Roboto,'Segoe UI',system-ui,sans-serif);color:var(--primary-text-color,${HA.text})}
*{box-sizing:border-box}
.wrap{position:relative;display:flex;flex-direction:column;gap:8px}
button{font:inherit;cursor:pointer}
button:focus-visible,summary:focus-visible{outline:2px solid var(--primary-color,${HA.primary});outline-offset:2px}
.warn{display:flex;flex-direction:column;gap:6px;padding:10px 14px;background:${HA.noteBg};border-radius:10px;font-size:13px}
.warn .top{display:flex;align-items:center;gap:10px}
.warn .top span{flex:1}
.warn ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:3px}
.link{border:0;background:none;color:var(--primary-color,${HA.primary});font-weight:500;padding:6px 8px;border-radius:16px}
.sec{border:1px solid var(--divider-color,${HA.divider});border-radius:12px;overflow:hidden;background:var(--card-background-color,${HA.card})}
.sh{display:flex;align-items:center;gap:8px;padding:0 6px 0 12px;min-height:56px}
.sh .tg{flex:1;display:flex;align-items:center;gap:12px;border:0;background:none;color:inherit;text-align:left;padding:8px 0;min-height:56px}
.num{width:30px;height:30px;border-radius:50%;background:${HA.primaryTint};color:var(--primary-color,${HA.primary});display:grid;place-items:center;font-size:13px;font-weight:500;flex:none}
.tt{display:flex;flex-direction:column;flex:1;min-width:0}
.tt b{font-weight:500;font-size:15px}
.tt small{font-size:12.5px;color:var(--secondary-text-color,${HA.secondary})}
.chev{width:20px;text-align:center;color:var(--secondary-text-color,${HA.secondary})}
.ad{display:flex;align-items:center;gap:6px}
.body{padding:4px 14px 14px;border-top:1px solid var(--divider-color,${HA.divider2});display:flex;flex-direction:column;gap:12px}
.tabs{display:flex;flex-wrap:wrap;gap:6px;padding-top:10px}
.tabs button{height:34px;padding:0 12px;border-radius:8px;border:0;background:var(--secondary-background-color,${HA.bg2});color:inherit;font-size:13px}
.tabs button[aria-selected=true]{background:var(--primary-color,${HA.primary});color:var(--text-primary-color,${HA.onPrimary})}
.grp{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--secondary-text-color,${HA.secondary});margin-top:6px}
.fl{display:block;font-size:12.5px;color:var(--secondary-text-color,${HA.secondary});margin-bottom:6px}
.dd{position:relative}
.ddb{width:100%;min-height:56px;border:1px solid var(--divider-color,${HA.divider});border-radius:8px;background:var(--secondary-background-color,${HA.bg2});color:inherit;display:flex;align-items:center;gap:12px;padding:8px 12px;font:inherit;cursor:pointer;text-align:left}
.ddb .nm,.opt .nm{flex:1;min-width:0}.ddb .nm b,.opt .nm b{display:block;font-weight:500}.ddb .nm span{font-size:12px;color:var(--secondary-text-color,${HA.secondary})}
.ddl{position:absolute;z-index:5;left:0;right:0;top:calc(100% + 4px);background:var(--card-background-color,${HA.card});border:1px solid var(--divider-color,${HA.divider});border-radius:10px;box-shadow:0 10px 30px ${HA.overlay};padding:6px;max-height:360px;overflow-y:auto}
.opt{width:100%;display:flex;align-items:center;gap:12px;padding:7px 8px;border:0;border-radius:8px;background:none;color:inherit;font:inherit;cursor:pointer;text-align:left}
.opt:hover,.opt[aria-selected=true]{background:${HA.primaryTint}}
.opt .tick{width:18px;color:var(--primary-color,${HA.primary});font-weight:700;text-align:center}
.ddl .lh{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--secondary-text-color,${HA.secondary});padding:8px 8px 4px}
.ttag{font-size:11px;padding:1px 7px;border-radius:9px;border:1px solid var(--divider-color,${HA.divider});color:var(--secondary-text-color,${HA.secondary})}
.sw{width:58px;height:38px;border-radius:7px;position:relative;flex:none;overflow:hidden}
.sw i{position:absolute;left:7px;top:8px;width:28px;height:22px;border-radius:5px}
.sw u{position:absolute;right:6px;top:9px;width:14px;height:8px;border-radius:4px}
.sw s{position:absolute;right:6px;bottom:8px;width:14px;height:8px;border-radius:3px}
.acc{display:flex;gap:8px;align-items:center}
.acc .pick{width:44px;height:44px;border-radius:8px;border:1px solid var(--divider-color,${HA.divider});padding:0;cursor:pointer;flex:none;position:relative;background:var(--secondary-background-color,${HA.bg2})}
.acc .pick span{position:absolute;inset:6px;border-radius:5px}
.acc .pick input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:0;padding:0}
.acc .ain{flex:1;min-width:0;height:44px;border:1px solid var(--divider-color,${HA.divider});border-radius:8px;background:var(--secondary-background-color,${HA.bg2});color:inherit;font:inherit;padding:0 12px}
.acc .reset{border:0;background:none;color:var(--primary-color,${HA.primary});font:inherit;font-weight:500;cursor:pointer;padding:0 4px}
.abad{color:${HA.noteText}}
.ddb:focus-visible,.opt:focus-visible,.acc .pick:focus-within,.acc .ain:focus-visible,.acc .reset:focus-visible{outline:2px solid var(--primary-color,${HA.primary});outline-offset:2px}
.hint{font-size:12.5px;color:var(--secondary-text-color,${HA.secondary});line-height:1.45}
.notes{display:flex;flex-direction:column;gap:4px}
.notes div{font-size:12.5px;color:${HA.noteText};background:${HA.noteBg2};border-radius:8px;padding:6px 10px}
.list{display:flex;flex-direction:column;gap:8px}
.lh{display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:500;padding-top:4px}
.lh small{font-weight:400;font-size:12px;color:var(--secondary-text-color,${HA.secondary})}
.item{border:1px solid var(--divider-color,${HA.divider});border-radius:10px;background:var(--card-background-color,${HA.card})}
.item.drag{opacity:.5}.item.over{border-color:var(--primary-color,${HA.primary})}
.item.bad{border-color:${HA.badLine}}
.ih{display:flex;align-items:center;gap:2px;min-height:48px;padding:0 4px}
.grip{width:24px;text-align:center;color:var(--secondary-text-color,${HA.disabled});cursor:grab;user-select:none}
.ih .lbl{flex:1;border:0;background:none;color:inherit;text-align:left;font-size:14px;padding:8px 6px;min-height:44px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ib{width:40px;height:40px;border:0;background:none;border-radius:20px;color:var(--secondary-text-color,${HA.secondary});display:grid;place-items:center}
.ib:disabled{opacity:.3;cursor:default}
.ib svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.ibody{padding:4px 12px 12px;display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--divider-color,${HA.divider2})}
.add{height:44px;border:1px dashed var(--primary-color,${HA.primary});border-radius:10px;background:none;color:var(--primary-color,${HA.primary});font-weight:500}
.add:disabled{opacity:.4;cursor:default}
.acts{display:flex;gap:8px;flex-wrap:wrap}
.acts button{height:36px;padding:0 14px;border-radius:18px;border:1px solid var(--primary-color,${HA.primary});background:none;color:var(--primary-color,${HA.primary});font-weight:500;font-size:13px}
.state{padding:10px 14px;border-radius:10px;font-size:13.5px;line-height:1.45}
.state.ok{background:${HA.ok}}.state.no{background:${HA.no}}
.ov{position:absolute;inset:0;background:${HA.overlay};display:flex;align-items:flex-start;justify-content:center;padding:24px 8px;z-index:5;border-radius:12px}
.dlg{width:100%;max-width:720px;background:var(--card-background-color,${HA.card});border-radius:20px;box-shadow:0 20px 50px ${HA.overlay};display:flex;flex-direction:column;max-height:calc(100% - 20px);overflow:hidden}
.dlg h3{margin:0;font-size:20px;font-weight:400;padding:18px 20px 4px}
.dlg .hint{padding:0 20px 10px}
.rows{overflow-y:auto;border-top:1px solid var(--divider-color,${HA.divider})}
.row{display:grid;grid-template-columns:44px minmax(0,150px) minmax(0,1fr);gap:8px;align-items:center;padding:8px 14px;border-bottom:1px solid var(--divider-color,${HA.divider3})}
.row label{display:grid;place-items:center;width:44px;height:44px;cursor:pointer}
.row input{width:18px;height:18px}
.row b{font-weight:500;font-size:13.5px}
.row .v{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:13px}
.row .v small{color:var(--secondary-text-color,${HA.secondary});font-size:11.5px}
.row select{height:36px;max-width:100%;border:1px solid var(--divider-color,${HA.divider4});border-radius:6px;background:var(--card-background-color,${HA.card});color:inherit;font:inherit;font-size:13px;padding:0 6px}
.foot{display:flex;align-items:center;gap:8px;padding:12px 16px}
.foot span{flex:1;font-size:12.5px;color:var(--secondary-text-color,${HA.secondary})}
.foot .pri{height:40px;padding:0 20px;border:0;border-radius:20px;background:var(--primary-color,${HA.primary});color:var(--text-primary-color,${HA.onPrimary});font-weight:500}
.nohaform{padding:14px;border-radius:10px;background:${HA.noteBg};font-size:13.5px;line-height:1.5}
`;
const SVG = {
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  del: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
};
const clone = (o) => JSON.parse(JSON.stringify(o || {}));
const human = (s) => { const x = String(s).split('.').filter((p) => !/^\d+$/.test(p)).pop() || String(s); return x.charAt(0).toUpperCase() + x.slice(1).replace(/_/g, ' '); };

function clean(o, keepEmpty) {
  if (Array.isArray(o)) return o.map((x) => (x && typeof x === 'object' ? clean(x, true) : x));
  if (!o || typeof o !== 'object') return o;
  const out = {};
  Object.keys(o).forEach((k) => {
    let v = o[k];
    if (v === '' || v === undefined) return;
    if (v && typeof v === 'object') {
      v = clean(v, false);
      if (Array.isArray(v) ? !v.length : !Object.keys(v).length) return;
    }
    out[k] = v;
  });
  return keepEmpty || Object.keys(out).length ? out : {};
}

export class OrielShellEditor extends HTMLElement {
  constructor() {
    super();
    this._open = 'general'; this._tab = {}; this._exp = new Set(); this._showWarn = false; this._dlg = null; this._forms = [];
  }
  setConfig(config) {
    const c = clone(config);
    // our own change echoed back by Home Assistant: keep the live object the open forms and lists point at
    if (this._last && JSON.stringify(clean(c)) === JSON.stringify(this._last)) { this._paintWarnings(); return; }
    this._config = c;
    this._render();
  }
  set hass(h) {
    const first = !this._hass; this._hass = h;
    this._forms.forEach((f) => { f.hass = h; });
    if (first) this._render(); else this._paintWarnings();
  }
  connectedCallback() { this._ensureForm().then(() => this._render()); }

  async _ensureForm() {
    if (customElements.get('ha-form')) return true;
    // ha-form loads lazily in Home Assistant; asking a built-in card for its editor loads it
    try {
      const helpers = await window.loadCardHelpers();
      const c = await helpers.createCardElement({ type: 'entities', entities: [] });
      if (c && c.constructor && c.constructor.getConfigElement) await c.constructor.getConfigElement();
    } catch (e) { /* not in Home Assistant */ }
    if (!customElements.get('ha-form')) { try { await Promise.race([customElements.whenDefined('ha-form'), new Promise((r) => setTimeout(r, 3000))]); } catch (e) { /* no form */ } }
    return !!customElements.get('ha-form');
  }

  _emit() {
    const out = clean(this._config);
    out.type = this._config.type || 'custom:oriel-shell';
    this._last = clean(clone(out));
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: out }, bubbles: true, composed: true }));
    this._paintWarnings(); this._paintSummaries(); this._paintTitles();
  }
  _paintTitles() {
    (this._titles || []).forEach((x) => { const item = getPath(this._config, x.ipath.join('.')) || {}; x.el.textContent = (x.open ? '▾ ' : '▸ ') + ((x.l.label && x.l.label(item)) || t('item_n', { n: x.i + 1 })); });
  }

  /* ---------- labels ---------- */
  _label(sec, ctx, name) {
    const plain = ctx.replace(/\.\d+\./g, '.').replace(/\.\d+$/, '');
    return ED[`${sec}.${plain}${name}`] || ED[`${sec}.${name}`] || ED['f.' + name] || human(name);
  }

  /* ---------- render ---------- */
  _render() {
    if (!this._config || !this.isConnected) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const root = this.shadowRoot;
    root.innerHTML = `<style>${CSS}</style><div class="wrap"></div>`;
    const wrap = root.querySelector('.wrap'); this._wrap = wrap; this._forms = []; this._notes = []; this._sums = {}; this._titles = [];
    if (!customElements.get('ha-form')) { wrap.insertAdjacentHTML('beforeend', `<div class="nohaform">${esc(ED.no_form)}</div>`); return; }
    this._warnBox = document.createElement('div'); this._warnBox.className = 'warn'; this._warnBox.setAttribute('role', 'status'); wrap.appendChild(this._warnBox);
    SECTIONS.forEach((s, i) => wrap.appendChild(this._section(s, i)));
    if (this._dlg) wrap.appendChild(this._dialog());
    this._paintWarnings(); this._paintSummaries();
  }

  _section(s, i) {
    const box = document.createElement('div'); box.className = 'sec';
    const open = this._open === s.key;
    box.innerHTML = `<div class="sh"><button type="button" class="tg" aria-expanded="${open}"><span class="num">${i + 1}</span><span class="tt"><b>${esc(ED['sec.' + s.key] || human(s.key))}</b><small></small></span><span class="chev" aria-hidden="true">${open ? '▴' : '▾'}</span></button>${s.key === 'nova' && !this._config.nova?.enabled ? '' : `<button type="button" class="link ad">${SVG.spark}${esc(ED.auto_detect)}</button>`}</div>`;
    this._sums[s.key] = box.querySelector('.tt small');
    box.querySelector('.tg').addEventListener('click', () => { this._open = open ? '' : s.key; this._render(); });
    const ad = box.querySelector('.ad'); if (ad) ad.addEventListener('click', () => this._openDetect(s.key));
    if (!open) return box;
    const body = document.createElement('div'); body.className = 'body'; box.appendChild(body);
    body.insertAdjacentHTML('beforeend', `<div class="hint">${esc(ED['hint.' + s.key] || '')}</div>`);
    if (s.key === 'nova') body.appendChild(this._novaState());
    let g = s.groups[0];
    if (s.groups.length > 1) {
      const cur = this._tab[s.key] || s.groups[0].key; g = s.groups.find((x) => x.key === cur) || s.groups[0];
      const tabs = document.createElement('div'); tabs.className = 'tabs'; tabs.setAttribute('role', 'tablist');
      s.groups.forEach((x) => {
        const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(x === g));
        b.textContent = ED[`g.${s.key}.${x.key}`] || human(x.key);
        b.addEventListener('click', () => { this._tab[s.key] = x.key; this._render(); }); tabs.appendChild(b);
      });
      body.appendChild(tabs);
    }
    if (s.key === 'general') { body.appendChild(this._look()); body.insertAdjacentHTML('beforeend', `<div class="grp">${esc(ED.header)}</div>`); }
    if (g.actions) body.appendChild(this._actions(s, g));
    this._node(body, s.key, g, [s.key], '');
    return box;
  }

  /* ---------- Look: theme dropdown with colour previews, and an accent colour ---------- */
  _look() {
    const gen = () => this._config.general || {};
    const box = document.createElement('div'); box.className = 'look';
    box.innerHTML = `<div class="grp">${esc(ED.look)}</div>
      <div><span class="fl" id="thL">${esc(ED.theme)}</span><div class="dd"><button type="button" class="ddb" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="thL"></button><div class="ddl" role="listbox" aria-labelledby="thL" hidden></div></div></div>
      <div><label class="fl" for="accIn">${esc(ED.accent)}</label><div class="acc"><span class="pick"><span></span><input type="color" aria-label="${esc(ED.accent_pick)}"></span><input class="ain" id="accIn" type="text" autocomplete="off" spellcheck="false" placeholder="${esc(ED.accent_ph)}"><button type="button" class="reset">${esc(ED.reset)}</button></div>
      <div class="hint">${esc(ED.accent_hint)}</div><div class="hint abad" hidden></div></div>`;
    const ddb = box.querySelector('.ddb'), list = box.querySelector('.ddl'), dd = box.querySelector('.dd');
    const ain = box.querySelector('.ain'), col = box.querySelector('.pick input'), dot = box.querySelector('.pick span'), bad = box.querySelector('.abad');
    const swatch = (id) => {
      const t = themeTokens(id), r = (k) => `rgb(${t.role[k] || ROLE[k]})`, dark = THEMES[id].style === 'dark';
      const stops = [...(t.role.page || CLASSIC_PAGE).matchAll(/(rgb\(\d+,\d+,\d+\)|#[0-9a-f]{6})\s+\d+%/gi)].map((m) => m[1]);
      return `<span class="sw" aria-hidden="true" style="background:linear-gradient(160deg,${stops.join(',')})"><i style="background:rgba(${t.role.glass || ROLE.glass},${dark ? 0.35 : 0.55})"></i><u style="background:${r('accent')}"></u><s style="background:${r('dark-b')}"></s></span>`;
    };
    const tagOf = (id) => (THEMES[id].style === 'dark' ? ED.theme_dark : ED.theme_light);
    const paintButton = () => {
      const raw = gen().theme, id = THEMES[raw] ? raw : DEFAULT_THEME, unknown = raw != null && raw !== '' && !THEMES[raw];
      ddb.innerHTML = `${swatch(id)}<span class="nm"><b>${esc(unknown ? ED.theme_unknown.split('{id}').join(raw) : THEMES[id].name)}</b><span>${esc(tagOf(id))}${id === DEFAULT_THEME ? ' · ' + esc(ED.theme_default) : ''}</span></span><span aria-hidden="true">▾</span>`;
    };
    const setOpen = (open) => {
      list.hidden = !open; ddb.setAttribute('aria-expanded', String(open));
      if (!open) return;
      const cur = THEMES[gen().theme] ? gen().theme : DEFAULT_THEME, ids = Object.keys(THEMES);
      const opt = (id) => `<button type="button" class="opt" role="option" data-id="${id}" aria-selected="${id === cur}"><span class="tick" aria-hidden="true">${id === cur ? '✓' : ''}</span>${swatch(id)}<span class="nm"><b>${esc(THEMES[id].name)}</b></span><span class="ttag">${esc(tagOf(id))}</span></button>`;
      list.innerHTML = `<div class="lh">${esc(ED.theme_light)}</div>${ids.filter((i) => THEMES[i].style !== 'dark').map(opt).join('')}<div class="lh">${esc(ED.theme_dark)}</div>${ids.filter((i) => THEMES[i].style === 'dark').map(opt).join('')}`;
      list.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
        setPath(this._config, 'general.theme', b.dataset.id === DEFAULT_THEME ? undefined : b.dataset.id);
        this._emit(); setOpen(false); paintButton(); paintAccent(); ddb.focus();
      }));
      const sel = list.querySelector('[aria-selected="true"]'); if (sel) sel.focus();
    };
    const paintAccent = () => {
      const a = gen().accent, v = a == null ? '' : String(a);
      if (this.shadowRoot.activeElement !== ain) ain.value = v;
      const t0 = themeTokens(THEMES[gen().theme] ? gen().theme : DEFAULT_THEME), shown = isHex(v) ? v : `rgb(${t0.role.accent || ROLE.accent})`;
      dot.style.background = shown;
      if (isHex(v)) col.value = v.length === 4 ? '#' + v.slice(1).replace(/./g, (c) => c + c) : v;
      bad.hidden = !v || isHex(v); bad.textContent = v && !isHex(v) ? ED.accent_bad.split('{id}').join(v) : '';
    };
    const setAccent = (v, always) => {
      v = String(v || '').trim();
      if (!always && v && !isHex(v)) { paintAccent(); return; } /* half-typed: wait for a full colour or the change event */
      setPath(this._config, 'general.accent', v || undefined); this._emit(); paintAccent();
    };
    ddb.addEventListener('click', () => setOpen(list.hidden));
    box.addEventListener('keydown', (e) => {
      if (list.hidden) return;
      const opts = [...list.querySelectorAll('.opt')], i = opts.indexOf(this.shadowRoot.activeElement);
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); ddb.focus(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); (opts[i + 1] || opts[0]).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (opts[i - 1] || opts[opts.length - 1]).focus(); }
    });
    /* one outside-click handler at a time: each render replaces the last */
    if (this._lookOff) this.shadowRoot.removeEventListener('click', this._lookOff);
    this._lookOff = (e) => { if (!list.hidden && !e.composedPath().includes(dd)) setOpen(false); };
    this.shadowRoot.addEventListener('click', this._lookOff);
    ain.addEventListener('input', () => setAccent(ain.value, false));
    ain.addEventListener('change', () => setAccent(ain.value, true));
    col.addEventListener('input', () => { ain.value = col.value; setAccent(col.value, true); });
    box.querySelector('.reset').addEventListener('click', () => { ain.value = ''; setAccent('', true); });
    paintButton(); paintAccent();
    return box;
  }

  _novaState() {
    const d = document.createElement('div');
    const on = !!(this._config.nova && this._config.nova.enabled), found = !!(this._hass && this._hass.services && this._hass.services.nova);
    d.className = 'state ' + (found ? 'ok' : on ? 'no' : '');
    d.textContent = found ? ED.nova_found : on ? ED.nova_missing : ED.nova_off;
    return d;
  }

  _actions(s, g) {
    const d = document.createElement('div'); d.className = 'acts';
    const house = getPath(this._config, 'home.house.floors');
    if (g.actions.includes('example')) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = ED.house_example; b.disabled = Array.isArray(house) && house.length > 0;
      b.addEventListener('click', () => { setPath(this._config, 'home.house.floors', clone(EXAMPLE_HOUSE.floors)); this._emit(); this._render(); }); d.appendChild(b);
    }
    if (g.actions.includes('clear')) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = ED.house_clear; b.disabled = !(Array.isArray(house) && house.length);
      b.addEventListener('click', () => {
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = ED.house_clear_sure; return; }
        setPath(this._config, 'home.house.floors', undefined); this._emit(); this._render();
      });
      d.appendChild(b);
    }
    return d;
  }

  /* one object: its fields in an ha-form, its warnings, then its lists */
  _node(host, sec, node, path, ctx) {
    const objOf = (create) => { let o = this._config; for (const k of path.join('.').split('.')) { if (o[k] == null) { if (!create) return {}; o[k] = {}; } o = o[k]; } return o; };
    const obj = objOf(false);
    if (node.fields && node.fields.length) {
      const yaml = [];
      const fields = node.fields.filter((f) => {
        const v = getPath(obj, f.name);
        const ok = !f.selector.entity || v == null || typeof v === 'string' || (Array.isArray(v) && v.every((x) => typeof x === 'string'));
        if (!ok) yaml.push(f.name);
        return ok;
      });
      const data = {};
      fields.forEach((f) => { const v = getPath(obj, f.name); if (v !== undefined) data[f.name] = f.csv && Array.isArray(v) ? v.join(', ') : v; });
      const form = document.createElement('ha-form');
      form.hass = this._hass;
      form.computeLabel = (sc) => this._label(sec, ctx, sc.name);
      form.computeHelper = (sc) => { const f = fields.find((x) => x.name === sc.name); return f && f.csv ? ED.csv_hint : ED[`help.${sec}.${ctx.replace(/\.\d+\./g, '.')}${sc.name}`] || undefined; };
      form.data = data;
      form.schema = fields.map((f) => ({ name: f.name, selector: f.selector }));
      form.addEventListener('value-changed', (e) => {
        e.stopPropagation();
        const v = e.detail.value || {}, target = objOf(true);
        fields.forEach((f) => {
          let nv = v[f.name];
          if (f.csv && typeof nv === 'string') nv = nv.split(',').map((x) => x.trim()).filter(Boolean).map((x) => (/^\d+$/.test(x) && /weekdays/.test(f.name) ? Number(x) : x));
          if (Array.isArray(nv) && !nv.length) nv = undefined;
          setPath(target, f.name, nv);
        });
        form.data = v;
        this._emit();
      });
      host.appendChild(form); this._forms.push(form);
      if (yaml.length) host.insertAdjacentHTML('beforeend', `<div class="hint">${esc(t('yaml_only', { f: yaml.map((n) => this._label(sec, ctx, n)).join(', ') }))}</div>`);
      const notes = document.createElement('div'); notes.className = 'notes'; host.appendChild(notes);
      this._notes.push({ el: notes, where: path.join('.'), sec, ctx, names: new Set(fields.map((f) => f.name)) });
    }
    (node.lists || []).forEach((l) => host.appendChild(this._list(sec, l, path, ctx, objOf)));
  }

  _list(sec, l, path, ctx, objOf) {
    const box = document.createElement('div'); box.className = 'list';
    const arr = getPath(objOf(false), l.key);
    const items = Array.isArray(arr) ? arr : [];
    const key = path.concat([l.key]).join('.');
    box.innerHTML = `<div class="lh"><span></span><small></small></div>`;
    box.querySelector('.lh span').textContent = this._label(sec, ctx, l.key) + ' · ' + items.length;
    if (items.length > 1) box.querySelector('.lh small').textContent = ED.drag_hint;
    const cur = () => { const a = getPath(objOf(false), l.key); return Array.isArray(a) ? a.slice() : []; };
    const write = (next) => { setPath(objOf(true), l.key, next.length ? next : undefined); this._emit(); this._render(); };
    items.forEach((item, i) => {
      const ipath = path.concat([l.key, i]), id = ipath.join('.'), open = this._exp.has(id);
      const card = document.createElement('div'); card.className = 'item'; card.dataset.where = id;
      const name = (l.label && l.label(item || {})) || t('item_n', { n: i + 1 });
      card.innerHTML = `<div class="ih"><span class="grip" aria-hidden="true">⋮⋮</span><button type="button" class="lbl" aria-expanded="${open}"></button>
        <button type="button" class="ib up" aria-label="${esc(ED.move_up)}">${SVG.up}</button><button type="button" class="ib dn" aria-label="${esc(ED.move_down)}">${SVG.down}</button>
        <button type="button" class="ib del" aria-label="${esc(ED.remove)}">${SVG.del}</button></div>`;
      card.querySelector('.lbl').textContent = (open ? '▾ ' : '▸ ') + name;
      card.querySelector('.lbl').addEventListener('click', () => { if (open) this._exp.delete(id); else this._exp.add(id); this._render(); });
      const up = card.querySelector('.up'), dn = card.querySelector('.dn');
      up.disabled = i === 0; dn.disabled = i === items.length - 1;
      const move = (from, to) => { const next = cur(); const [x] = next.splice(from, 1); next.splice(to, 0, x); this._exp.clear(); write(next); };
      up.addEventListener('click', () => move(i, i - 1)); dn.addEventListener('click', () => move(i, i + 1));
      card.querySelector('.del').addEventListener('click', () => { const next = cur(); next.splice(i, 1); this._exp.clear(); write(next); });
      // drag to reorder
      const grip = card.querySelector('.grip'); grip.draggable = true;
      grip.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', key + '|' + i); card.classList.add('drag'); });
      grip.addEventListener('dragend', () => card.classList.remove('drag'));
      card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('over'); });
      card.addEventListener('dragleave', () => card.classList.remove('over'));
      card.addEventListener('drop', (e) => { e.preventDefault(); card.classList.remove('over'); const [k, from] = (e.dataTransfer.getData('text/plain') || '').split('|'); if (k === key && +from !== i) move(+from, i); });
      this._titles.push({ el: card.querySelector('.lbl'), l, ipath, i, open });
      if (open) { const b = document.createElement('div'); b.className = 'ibody'; card.appendChild(b); this._node(b, sec, l.item, ipath, ctx + l.key + '.' + i + '.'); }
      box.appendChild(card);
    });
    const add = document.createElement('button'); add.type = 'button'; add.className = 'add';
    add.textContent = '+ ' + (ED[`add.${sec}.${l.key}`] || ED.add_item);
    add.disabled = !!l.max && items.length >= l.max;
    add.addEventListener('click', () => { const next = cur(); next.push({}); this._exp.add(path.concat([l.key, next.length - 1]).join('.')); write(next); });
    box.appendChild(add);
    return box;
  }

  /* ---------- warnings and summaries ---------- */
  _paintWarnings() {
    if (!this._warnBox || !this._config) return;
    const ws = validate(this._config, this._hass);
    this._ws = ws;
    const msg = (w) => t(w.kind === 'missing' ? 'w_missing' : w.kind === 'domain' ? 'w_domain' : w.kind === 'theme' ? 'w_theme' : w.kind === 'accent' ? 'w_accent' : 'w_format', { id: w.id, domains: (w.domains || []).join(' or ') });
    const where = (w) => [ED['sec.' + w.where[0]] || w.where[0]].concat(w.where.slice(1).filter((x) => typeof x === 'string').map(human)).join(' › ');
    const box = this._warnBox; box.innerHTML = '';
    box.style.display = ws.length ? '' : 'none';
    if (ws.length) {
      const top = document.createElement('div'); top.className = 'top';
      top.innerHTML = `<span></span><button type="button" class="link"></button>`;
      top.firstChild.textContent = t(ws.length === 1 ? 'warn_one' : 'warn_n', { n: ws.length });
      top.lastChild.textContent = this._showWarn ? ED.hide : ED.show;
      top.lastChild.addEventListener('click', () => { this._showWarn = !this._showWarn; this._paintWarnings(); });
      box.appendChild(top);
      if (this._showWarn) {
        const ul = document.createElement('ul');
        ws.forEach((w) => { const li = document.createElement('li'); li.textContent = where(w) + ': ' + msg(w); ul.appendChild(li); });
        box.appendChild(ul);
      }
    }
    (this._notes || []).forEach((n) => {
      const mine = ws.filter((w) => w.where.join('.') === n.where && n.names.has(w.field));
      n.el.innerHTML = '';
      mine.forEach((w) => { const d = document.createElement('div'); d.textContent = this._label(n.sec, n.ctx, w.field) + ': ' + msg(w); n.el.appendChild(d); });
    });
    this.shadowRoot && this.shadowRoot.querySelectorAll('.item').forEach((el) => {
      const id = el.dataset.where; el.classList.toggle('bad', ws.some((w) => w.where.join('.').startsWith(id + '.') || w.where.join('.') === id));
    });
  }
  _paintSummaries() {
    if (!this._sums) return;
    let norm; try { norm = normalise(this._config); } catch (e) { norm = null; }
    SECTIONS.forEach((s) => {
      const el = this._sums[s.key]; if (!el) return;
      const n = new Set(entitiesIn(this._config[s.key] || {})).size;
      const page = PAGES.find((p) => p.key === s.key);
      let shown = true;
      if (page && norm) { try { shown = !!page.enabled.call({}, norm); } catch (e) { shown = false; } }
      const bits = [];
      if (s.key === 'nova') bits.push(this._config.nova && this._config.nova.enabled ? ED.on : ED.off);
      bits.push(n ? t('n_set', { n }) : ED.not_set_up);
      if (page && !shown && s.key !== 'nova') bits.push(ED.page_hidden);
      el.textContent = bits.join(' · ');
    });
  }

  /* ---------- auto-detect ---------- */
  _openDetect(sec) {
    const list = detect(sec, this._config, this._hass);
    this._dlg = { sec, list: list.map((x) => Object.assign({ on: x.strong, pick: x.value }, x)) };
    this._render();
  }
  _dialog() {
    const D = this._dlg, ov = document.createElement('div'); ov.className = 'ov';
    const dlg = document.createElement('div'); dlg.className = 'dlg'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
    const title = t('detect_title', { s: ED['sec.' + D.sec] || D.sec });
    dlg.innerHTML = `<h3></h3><div class="hint"></div><div class="rows"></div><div class="foot"><span></span><button type="button" class="link cx"></button><button type="button" class="pri ok"></button></div>`;
    dlg.querySelector('h3').textContent = title;
    dlg.setAttribute('aria-label', title);
    dlg.querySelector('.hint').textContent = D.list.length ? t('detect_found', { n: D.list.length }) : ED.detect_none;
    dlg.querySelector('.foot span').textContent = ED.detect_keep;
    dlg.querySelector('.cx').textContent = ED.cancel;
    const okBtn = dlg.querySelector('.ok');
    const paintOk = () => { const n = D.list.filter((x) => x.on).length; okBtn.textContent = t('apply_n', { n }); okBtn.disabled = !n; };
    const rows = dlg.querySelector('.rows');
    D.list.forEach((x, i) => {
      const r = document.createElement('div'); r.className = 'row';
      const label = x.kind === 'items' ? this._label(D.sec, '', x.path) : this._label(D.sec, '', x.path);
      r.innerHTML = `<label><input type="checkbox"></label><b></b><div class="v"></div>`;
      const cb = r.querySelector('input'); cb.checked = !!x.on; cb.setAttribute('aria-label', t('use_for', { f: label }));
      cb.addEventListener('change', () => { x.on = cb.checked; paintOk(); });
      r.querySelector('b').textContent = label;
      const v = r.querySelector('.v');
      if (x.kind === 'items') v.textContent = t('add_n_items', { n: x.items.length + (x.items[0] && (x.items[0].sensors || x.items[0].rooms) ? ' (' + (x.items[0].sensors || x.items[0].rooms).length + ')' : '') });
      else if (Array.isArray(x.value)) v.textContent = x.value.join(', ');
      else if (x.alts.length) {
        const s = document.createElement('select'); s.setAttribute('aria-label', label);
        [x.value].concat(x.alts).forEach((id) => { const o = document.createElement('option'); o.value = id; o.textContent = this._ename(id); s.appendChild(o); });
        s.addEventListener('change', () => { x.pick = s.value; }); v.appendChild(s);
      } else v.textContent = this._ename(x.value);
      const why = document.createElement('small'); why.textContent = x.why; v.appendChild(why);
      rows.appendChild(r);
      void i;
    });
    paintOk();
    dlg.querySelector('.cx').addEventListener('click', () => { this._dlg = null; this._render(); });
    okBtn.addEventListener('click', () => {
      const obj = this._config[D.sec] || (this._config[D.sec] = {});
      D.list.filter((x) => x.on).forEach((x) => {
        if (x.kind === 'field') setPath(obj, x.path, x.pick);
        else { const cur = getPath(obj, x.path); setPath(obj, x.path, (Array.isArray(cur) ? cur : []).concat(x.items)); }
      });
      this._dlg = null; this._emit(); this._render();
    });
    ov.addEventListener('click', (e) => { if (e.target === ov) { this._dlg = null; this._render(); } });
    ov.appendChild(dlg);
    setTimeout(() => { try { (rows.querySelector('input') || okBtn).focus(); } catch (e) { /* gone */ } }, 30);
    return ov;
  }
  _ename(id) { const s = this._hass && this._hass.states && this._hass.states[id]; return s && s.attributes.friendly_name ? `${s.attributes.friendly_name} · ${id}` : id; }
}

export function defineEditor() {
  if (!customElements.get('oriel-shell-editor')) customElements.define('oriel-shell-editor', OrielShellEditor);
}
