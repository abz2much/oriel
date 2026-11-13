/* Scene style (general.page_style: scene), tablet layout only. The look of the approved mockups:
   on Energy, Climate, Household, Security, Vacuum and System the page shows a line and a large title at the top left,
   status chips under it, the page's drawing on the right with live labels, and compact cards in one row along the
   bottom, sized to fit without sideways scrolling. Tapping a compact card opens the page's own full card in a pop-up
   (same element, same controls and confirm steps); closing it puts the card back. The page's full cards stay where
   the classic layout has them, hidden, so their code keeps running unchanged.
   While a scene page shows, the whole card takes the warm dusk look of the mockups (its own colours, whatever the theme).
   Home, Living room and Nova keep their layouts; the phone layout ignores the style. Read-only except the Climate
   − and + and the boost, which call the same methods as the full card. */
import { addMethods } from './core.js';
import { S, t, WX, HVAC } from './strings.js';
import { isEnt, esc, hm, bad, tidy } from './util.js';
import { sceneArt, sceneXY, sceneViewBox } from './scenes/art.js';

export const SCENE_KEYS = ['energy', 'climate', 'family', 'security', 'vacuum', 'system'];
const PANEL = '.glass,.dark,.black';
const DAY = 86400000;

/* The mockups' look: warm dusk light, light frosted glass, white text, cream glow for things that are on. */
const LOOK = `--oriel-page:radial-gradient(520px 420px at 78% 12%,rgba(214,150,72,.55),transparent 70%),radial-gradient(640px 520px at 22% 78%,rgba(120,78,44,.5),transparent 70%),radial-gradient(420px 320px at 60% 36%,rgba(255,196,120,.16),transparent 70%),linear-gradient(165deg,#3a2a1e 0%,#24190f 60%,#140e09 100%);
 --oriel-glass:255,255,255;--oriel-ink:255,255,255;--oriel-raised:104,82,64;--oriel-raised-lo:78,60,46;--oriel-on-dark-text:255,250,244;--oriel-on-dark:255,255,255;
 --oriel-accent:255,226,182;--oriel-accent-hi:255,236,206;--oriel-accent-lo:236,196,140;--oriel-accent-strong:255,214,150;--oriel-accent-ink:255,222,170;--oriel-on-accent:46,30,16;--oriel-accent-fill:255,226,182;--oriel-ink-on-accent:46,30,16;
 --oriel-ink-fill:20,14,10;--oriel-shadow:0,0,0;--oriel-shadow-glass:0,0,0;--oriel-good:170,232,170;--oriel-warn:255,210,120;--oriel-bad:255,170,150;--oriel-off:200,190,180;
 --oriel-bad-bg:150,62,46;--oriel-bad-ink:255,226,218;--oriel-bad-line:200,100,80;--oriel-warn-bg:130,96,30;--oriel-warn-ink:255,236,200;--oriel-good-bg:60,110,60;--oriel-ok-fill:90,140,90;
 --oriel-rail:20,14,10;--oriel-rail-ink:255,250,244;--oriel-chip:255,255,255;--oriel-chip-ink:40,28,18;--oriel-dark-a:30,22,16;--oriel-dark-b:16,11,8;--oriel-black:12,9,7;
 --oriel-room:90,70,54;--oriel-room-2:100,80,63;--oriel-room-3:94,74,58;--oriel-room-4:88,69,54;--oriel-room-5:104,84,66;--oriel-room-6:98,78,61;--oriel-house-wall:120,96,76;
 --oriel-slab:96,76,60;--oriel-house-side:70,54,42;--oriel-floor-side:78,61,48;--oriel-house-label:236,224,210;--oriel-house-line:200,180,160;
 --oriel-kit-top:120,98,80;--oriel-kit-top-2:126,104,86;--oriel-kit-top-3:116,95,77;--oriel-kit-left:92,72,56;--oriel-kit-left-2:86,67,52;--oriel-kit-left-3:96,76,60;--oriel-kit-side:76,59,46;--oriel-kit-right:80,62,48;--oriel-kit-shade:72,56,43;
 --oriel-nova-a:120,96,76;--oriel-nova-b:70,54,42;--oriel-on-nova:255,255,255;--oriel-nova-glass:255,255,255;--oriel-my-bubble:255,226,182;
 --oriel-sheet-a:70,54,42;--oriel-sheet-b:46,34,26;--oriel-scrim:10,6,4;--oriel-pill:120,96,76;--oriel-soft:.72;--oriel-soft-page:.8`;

const CSS = `
#wrap.scene.scnow{${LOOK}}
#wrap.scene.scnow #screen{background:var(--oriel-page)}
#wrap.scene.scnow .glass{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2);box-shadow:0 18px 40px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.18)}
#wrap.scene.scnow #stage .pill rect[rx]{fill:rgba(18,13,10,.74)!important;stroke:rgba(255,255,255,.22)!important}
#wrap.scene.scnow .dark{background:rgba(10,7,5,.5);border-color:rgba(255,255,255,.12)}
#wrap.scene .scHid{visibility:hidden!important;pointer-events:none!important}
#wrap.scene .scHero{position:absolute;left:calc(var(--dx,0px) + 120px);top:150px;max-width:640px;pointer-events:none;z-index:2;color:#fff}
#wrap.scene .scHero .meta{font-size:13px;letter-spacing:.14em;font-weight:600;text-transform:uppercase;opacity:.85}
#wrap.scene .scHero h1{margin:6px 0 14px;font-size:86px;line-height:1;font-weight:500;letter-spacing:-.02em}
#wrap.scene .scChips{display:flex;gap:8px;flex-wrap:wrap;max-width:620px}
#wrap.scene .scChip{font-size:14px;padding:7px 14px;border-radius:99px;display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);white-space:nowrap}
#wrap.scene .scChip.bad{background:rgba(190,80,60,.45);border-color:rgba(255,150,130,.5)}
#wrap.scene .scChip.ok{background:rgba(140,200,140,.22);border-color:rgba(170,232,170,.4)}
#wrap.scene .scChip.warm{background:rgba(255,226,182,.28);border-color:rgba(255,226,182,.5)}
#wrap.scene .scChip i{width:8px;height:8px;border-radius:50%;background:currentColor;display:inline-block}
#wrap.scene .scArt{position:absolute;right:calc(var(--dx,0px) + 0px);top:40px;width:720px;height:500px;pointer-events:none;z-index:1;
  -webkit-mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,#000 70%,transparent 100%);mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,#000 70%,transparent 100%)}
#wrap.scene .scArt svg{position:absolute;inset:0;width:100%;height:100%}
#wrap.scene .scTag{position:absolute;left:calc(var(--dx,0px) + 120px);bottom:calc(var(--ch,230px) + 42px);font-size:12px;letter-spacing:.14em;font-weight:600;color:#fff;opacity:.7;text-transform:uppercase;pointer-events:none;z-index:2}
#wrap.scene .scRow{position:absolute;left:calc(var(--dx,0px) + 120px);right:calc(var(--dx,0px) + 24px);bottom:30px;height:var(--ch,230px);display:flex;gap:14px;
  overflow-x:auto;overflow-y:hidden;pointer-events:auto;z-index:3;scrollbar-width:none;overscroll-behavior-x:contain;color:#fff}
#wrap.scene .scRow::-webkit-scrollbar{display:none}
#wrap.scene .scC{position:relative;height:100%;border-radius:22px;padding:18px;display:flex;flex-direction:column;overflow:hidden;cursor:pointer;min-width:170px;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);box-shadow:0 18px 40px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.18);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
  -webkit-tap-highlight-color:transparent;font:inherit;color:inherit;text-align:left}
#wrap.scene .scC.lit{background:rgba(255,232,196,.3);border-color:rgba(255,226,182,.55)}
#wrap.scene .scC.dk{background:rgba(10,7,5,.5);border-color:rgba(255,255,255,.12)}
#wrap.scene .scC.bad{border-color:rgba(255,150,130,.55)}
#wrap.scene .scC:active{transform:scale(.985)}
#wrap.scene .scC .ic{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}
#wrap.scene .scC .st{position:absolute;right:18px;top:20px;font-size:12px;letter-spacing:.1em;font-weight:600;opacity:.85;text-transform:uppercase;max-width:60%;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#wrap.scene .scC h3{margin:0;font-size:17px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#wrap.scene .scC .hd{display:flex;justify-content:space-between;align-items:baseline;gap:10px;min-width:0}
#wrap.scene .scC .hd h3{flex:1 1 auto}
#wrap.scene .scC .s2{flex:0 1 auto;max-width:50%;font-size:12px;letter-spacing:.1em;font-weight:600;opacity:.85;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#wrap.scene .scC b.nm{margin-top:auto;font-size:19px;font-weight:500}
#wrap.scene .scC small{opacity:.72;font-size:13px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#wrap.scene .scC .big{font-size:44px;font-weight:300;line-height:1.05;margin-top:6px;font-variant-numeric:tabular-nums}
#wrap.scene .scC .big u{text-decoration:none;font-size:18px;opacity:.7;margin-left:3px}
#wrap.scene .scC .bar{height:6px;border-radius:6px;background:rgba(255,255,255,.18);margin-top:10px;flex:none}
#wrap.scene .scC .bar i{display:block;height:100%;border-radius:6px;background:#ffe2b6}
#wrap.scene .scC .ls{list-style:none;margin:10px 0 0;padding:0;font-size:14px;min-height:0;overflow:hidden}
#wrap.scene .scC .ls li{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-top:1px solid rgba(255,255,255,.12)}
#wrap.scene .scC .ls li span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#wrap.scene .scC .ls li span:last-child{opacity:.75;white-space:nowrap}
#wrap.scene .scC .ls li.bad{color:#ffb2a0} #wrap.scene .scC .ls li.ok{color:#aee8a8} #wrap.scene .scC .ls li.warn{color:#ffd27a}
#wrap.scene .scC .sub{font-size:11px;letter-spacing:.12em;opacity:.6;margin-top:10px;font-weight:600;text-transform:uppercase}
#wrap.scene .scC .bx{display:inline-block;width:15px;height:15px;border:1.5px solid rgba(255,255,255,.7);border-radius:5px;margin-right:9px;vertical-align:-3px}
#wrap.scene .scC .ctl{display:flex;align-items:center;gap:10px;margin-top:auto}
#wrap.scene .scC .rd{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:22px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.22);color:#fff;cursor:pointer;flex:none;padding:0;font-family:inherit}
#wrap.scene .scC .rd:active{transform:scale(.94)}
#wrap.scene .scC .ctl{gap:6px}
#wrap.scene .scC .ctl .big{flex:1;text-align:center;margin:0;font-size:40px;white-space:nowrap;min-width:0}
#wrap.scene .scC .btn{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;overflow:hidden}
#wrap.scene .scC .btn span{font-size:12px;padding:5px 10px;border-radius:99px;background:rgba(255,255,255,.16);white-space:nowrap}
#wrap.scene .scC .g2{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-top:10px}
#wrap.scene .scC .g2 .big{font-size:30px;margin-top:0}
#wrap.scene .scC .cols{display:flex;align-items:flex-end;gap:8px;height:84px;margin-top:auto}
#wrap.scene .scC .cols i{flex:1;border-radius:6px;background:rgba(255,255,255,.35);min-height:4px}
#wrap.scene .scC .colx{display:flex;justify-content:space-around;font-size:12px;opacity:.7;margin-top:6px}
#wrap.scene .scC .bins{display:flex;gap:8px;margin-top:auto}
#wrap.scene .scC .bins div{flex:1;min-width:0;border-radius:14px;padding:9px 9px;font-size:12px}
#wrap.scene .scC .bins div b{display:block;font-size:16px;font-weight:400;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#wrap.scene .scC .bins div.soon{outline:2px solid #fff;outline-offset:-2px}
#wrap.scene .scC .cams{display:flex;gap:8px;margin-top:10px;flex:1;min-height:0}
#wrap.scene .scC .cams div{flex:1;border-radius:12px;background:linear-gradient(160deg,#3b4652,#1b2026) center/cover no-repeat;position:relative;min-width:0}
#wrap.scene .scC .cams div span{position:absolute;left:8px;bottom:8px;font-size:11px;background:rgba(0,0,0,.55);padding:2px 7px;border-radius:6px;max-width:85%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#wrap.scene .scPop{position:absolute;top:0;bottom:0;left:calc(-1 * var(--dx,0px));right:calc(-1 * var(--dx,0px));z-index:15;display:flex;align-items:center;justify-content:center;
  background:rgba(10,6,4,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);visibility:visible;pointer-events:auto}
#wrap.scene .page>.scPop{left:0;right:0}
#wrap.scene .scPop .scHold{position:relative;max-height:720px;max-width:1180px;overflow:auto;scrollbar-width:none;border-radius:28px}
#wrap.scene .scPop .scHold>*{max-height:720px;box-sizing:border-box;position:relative!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;margin:0!important;visibility:visible!important;pointer-events:auto!important}
#wrap.scene .scPop .scX{position:absolute;right:calc(var(--dx,0px) + 24px);top:22px;width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.16);color:#fff;font-size:24px;line-height:1;cursor:pointer;font-family:inherit}
@media (prefers-reduced-motion:reduce){#wrap.scene .scArt animateMotion{display:none}}
`;

/* small icons for the compact cards (24 × 24, stroke) */
const ICON = {
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  flame: 'M12 3c3 4 5 6 5 10a5 5 0 01-10 0c0-2 1-3.5 2-5 0 2 1 3 2 3 0-3-1-5 1-8z', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  play: 'M7 5l12 7-12 7z', heatp: 'M4 6h16v12H4zM8 12a3 3 0 106 0 3 3 0 00-6 0M17 9v6', tablet: 'M6 3h12v18H6zM11 18h2',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[n] || ICON.bolt}"/></svg>`;

/* where each drawing's labels sit, in the drawing's own coordinates, with a nudge in viewBox units */
const SPOT = {
  energy: { solar: [40, 50, 95, -70, -40], house: [0, 90, 30, -170, -10], battery: [125, 42, 0, -20, 50], grid: [215, 80, 120, 14, -8] },
  climate: { stat: [0, 30, 50, -150, -10], outside: [106, 0, 60, 8, -6], heat: [79, 6, 2, 40, 40] },
  family: { cal: [0, 50, 54, -160, -10], list: [17, 7, 24, -40, 56], bin: [170, 8, 26, 14, -12] },
  security: { front: [38, 80, 38, -200, -6], open: [110, 48, 38, 44, 40], cam: [118, 74, 47, 50, 118], alarm: [93, 80, 53, -70, -54] },
  vacuum: { robot: [125, 30, 8, 26, -40], dock: [125, 9, 36, -170, -40] },
  system: { screen: [66, 1, 54, -60, -60], router: [45, 11, 40, -190, -10], nas: [91, 13, 16, 20, 40] },
};

addMethods({
  _sceneOn() { return !!(this._c && this._c.general.page_style === 'scene') && !this._phone; },
  /* the scene look covers every page while the style is on (Home, Living room and Nova keep their layouts) */
  _sceneMark() { const w = this.$('wrap'); if (w) w.classList.toggle('scnow', this._sceneOn()); },
  _sceneSync() {
    const wrap = this.$('wrap'); if (!wrap || !this._pages) return;
    const on = this._sceneOn();
    if (on && !this._sceneCss) { this.addCss('scene', CSS); this._sceneCss = true; }
    wrap.classList.toggle('scene', on);
    SCENE_KEYS.forEach((k) => {
      const p = this._pages[k]; if (!p) return;
      try { if (on) this._sceneApply(k, p); else this._sceneUndo(p); } catch (e) { console.warn('[oriel] scene ' + k, e); }
    });
    this._sceneMark();
    const cur = on && this._pages[this._page];
    if (cur && cur.scene) { try { this._sceneRender(this._page, cur); } catch (e) { console.warn('[oriel] scene ' + this._page, e); } }
  },
  _sceneApply(k, p) {
    if (p.scene) return;
    const pg = p.el;
    const panels = [...pg.querySelectorAll(PANEL)].filter((x) => !x.parentElement.closest(PANEL));
    panels.forEach((x) => x.classList.add('scHid'));
    /* the pop-up goes inside the page's own wrapper (#enWrap, .pgc …) so the page's styles still apply to the card in it */
    let host = panels[0] ? panels[0].parentNode : pg;
    while (host && host.parentElement && host.parentElement !== pg) host = host.parentElement;
    if (!host || host.parentElement !== pg) host = pg;
    const hero = document.createElement('div'); hero.className = 'scHero';
    hero.innerHTML = '<div class="meta"></div><h1></h1><div class="scChips"></div>';
    const art = document.createElement('div'); art.className = 'scArt';
    art.innerHTML = sceneArt(k) + `<svg class="scLabs" viewBox="${sceneViewBox(k)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg>`;
    const tag = document.createElement('div'); tag.className = 'scTag hide'; tag.textContent = S.sc_scroll + ' →';
    const row = document.createElement('div'); row.className = 'scRow';
    row.addEventListener('click', (e) => this._sceneTap(k, e));
    pg.append(art, hero, tag, row);
    p.scene = { k, panels, host, nodes: [art, hero, tag, row], hero, art, tag, row, sig: {}, pop: null };
  },
  _sceneUndo(p) {
    if (!p.scene) return;
    this._scenePopClose(p);
    p.scene.panels.forEach((x) => x.classList.remove('scHid'));
    p.scene.nodes.forEach((n) => n.remove());
    p.scene = null;
  },

  /* ---------- drawing the title, chips, labels and compact cards ---------- */
  _sceneRender(k, p) {
    const sc = p.scene, B = SCENE_BUILD[k];
    const d = Object.assign({ meta: '', chips: [], labels: [], cards: [], ch: 230, waiting: false }, B ? B.call(this) : {});
    /* lists, the calendar and events load after the page draws: look again shortly, a few times, until they are in */
    if (d.waiting && (sc.tries = (sc.tries || 0) + 1) <= 15) this.debounce('scene', 1000, () => { const q = this._pages && this._pages[k]; if (q && q.scene && this._page === k) this._sceneRender(k, q); });
    if (!d.cards.length) d.cards = this._sceneFallback(sc);
    const label = typeof p.def.label === 'function' ? p.def.label.call(this, this._c) : p.def.label;
    const heroSig = JSON.stringify([label, d.meta, d.chips]);
    if (sc.sig.hero !== heroSig) {
      sc.sig.hero = heroSig;
      sc.hero.querySelector('.meta').textContent = d.meta;
      sc.hero.querySelector('h1').textContent = label;
      sc.hero.querySelector('.scChips').innerHTML = d.chips.filter((c) => c && c.t).map((c) => `<span class="scChip ${c.k || ''}">${c.dot ? '<i></i>' : ''}${esc(c.t)}</span>`).join('');
    }
    const labSig = JSON.stringify(d.labels);
    if (sc.sig.lab !== labSig) { sc.sig.lab = labSig; sc.art.querySelector('.scLabs').innerHTML = d.labels.filter(Boolean).map((l) => this._sceneLabel(k, l)).join(''); }
    const cardSig = JSON.stringify([d.cards.map((c) => [c.h, c.open, c.cls, c.w, c.g]), d.ch]);
    if (sc.sig.cards !== cardSig) {
      sc.sig.cards = cardSig;
      p.el.style.setProperty('--ch', d.ch + 'px');
      sc.row.innerHTML = d.cards.map((c) => `<div class="scC ${c.cls || ''}" role="button" tabindex="0"${c.open ? ` data-open="${esc(c.open)}"` : ''} style="flex:${c.g || 1} 1 ${c.w || 260}px">${c.h}</div>`).join('');
      requestAnimationFrame(() => sc.tag.classList.toggle('hide', sc.row.scrollWidth <= sc.row.clientWidth + 1));
    }
  },
  _sceneLabel(k, l) {
    const at = (SPOT[k] || {})[l.at]; if (!at) return '';
    const [x, y] = sceneXY(at[0], at[1], at[2]), gx = x + at[3], gy = y + at[4];
    const w = Math.max(150, 22 + 9.6 * Math.max(String(l.v).length * 1.25, String(l.l).length * 0.9));
    return `<g class="scLab" transform="translate(${gx.toFixed(1)},${gy.toFixed(1)})"><rect x="0" y="-36" rx="14" width="${w.toFixed(0)}" height="50" fill="rgba(18,13,10,.74)" stroke="rgba(255,255,255,.2)"/>`
      + `<circle cx="15" cy="-21" r="4.5" fill="${l.c || '#ffe2b6'}"/><text x="27" y="-16" font-size="14" fill="#fff" opacity=".82" font-family="Outfit,system-ui,sans-serif">${esc(l.l)}</text>`
      + `<text x="13" y="6" font-size="21" fill="#fff" font-family="Outfit,system-ui,sans-serif">${esc(l.v)}</text></g>`;
  },
  /* a page whose builder found nothing to show: one card per full card, by its heading */
  _sceneFallback(sc) {
    return sc.panels.filter((x) => !x.classList.contains('hide') && x.id).slice(0, 5).map((x) => {
      const h = x.querySelector('h3,.hd,.vcHd'); const title = (h && h.textContent.trim().split('\n')[0]) || x.id;
      return { open: x.id, w: 240, h: `<h3>${esc(title)}</h3><small style="margin-top:auto">${esc(S.sc_tap_full)}</small>` };
    });
  },
  _sceneTap(k, e) {
    const act = e.target.closest('[data-act]');
    if (act) { e.stopPropagation(); this._sceneAct(act.dataset.act); return; }
    const card = e.target.closest('.scC[data-open]'); if (card) this._scenePopOpen(k, card.dataset.open);
  },
  _sceneAct(a) {
    const [kind, ent, dir, step] = a.split(':');
    if (kind === 'bump' && isEnt(ent) && this._bump) this._bump(ent, Number(dir), step ? Number(step) : undefined);
    if (kind === 'boost') { const b = this._cl && this._cl.pg && this._cl.pg.querySelector('.boost'); if (b) b.click(); }
  },

  /* ---------- the pop-up with the full card ---------- */
  _scenePopOpen(k, id) {
    const p = this._pages[k]; if (!p || !p.scene) return;
    this._scenePopClose(p);
    const el = p.scene.panels.find((x) => x.id === id); if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const pop = document.createElement('div'); pop.className = 'scPop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true');
    pop.innerHTML = `<div class="scHold"></div><button type="button" class="scX" aria-label="${esc(S.sc_close)}">×</button>`;
    const hold = pop.firstChild;
    const rec = { el, parent: el.parentNode, next: el.nextSibling, css: el.style.cssText };
    el.classList.remove('scHid');
    if (w > 0) el.style.width = w + 'px';
    if (h > 0 && !/\bheight\b/.test(rec.css)) el.style.minHeight = Math.min(h, 720) + 'px';
    hold.appendChild(el);
    pop.addEventListener('click', (e) => { if (e.target === pop || e.target.closest('.scX')) this._scenePopClose(p); });
    p.scene.host.appendChild(pop);
    p.scene.pop = { pop, rec };
    this._scenePopKey = (e) => { if (e.key === 'Escape') this._scenePopClose(p); };
    document.addEventListener('keydown', this._scenePopKey);
    requestAnimationFrame(() => { if (this._built && this._h) this._update(); }); /* the card measures itself at its new place */
  },
  _scenePopClose(p) {
    const sc = p && p.scene; if (!sc || !sc.pop) return;
    const { pop, rec } = sc.pop;
    rec.el.style.cssText = rec.css; rec.el.classList.add('scHid');
    if (rec.next && rec.next.parentNode === rec.parent) rec.parent.insertBefore(rec.el, rec.next); else rec.parent.appendChild(rec.el);
    pop.remove(); sc.pop = null;
    if (this._scenePopKey) { document.removeEventListener('keydown', this._scenePopKey); this._scenePopKey = null; }
  },

  /* ---------- small readers shared by the pages ---------- */
  _snKw(id) { /* a power entity in kW, signed as the sensor gives it */
    const s = this.st(id); if (!s) return null; const v = parseFloat(s.state); if (!Number.isFinite(v)) return null;
    const u = (s.attributes && s.attributes.unit_of_measurement) || 'W';
    return u === 'kW' ? v : u === 'MW' ? v * 1000 : v / 1000;
  },
  _snVal(id) { if (!isEnt(id)) return ''; const f = this.fmt(id); return f.n === '–' ? '' : (f.n + (f.u ? ' ' + f.u : '')); },
  _snDeg(v) { return v == null || !Number.isFinite(Number(v)) ? '–' : (Math.round(Number(v) * 10) / 10).toFixed(1); },
  _snWhen(ms) { /* today: 17:52; yesterday: Yesterday 17:52; this week: Tue 17:52 */
    if (!Number.isFinite(ms)) return '';
    const d = new Date(ms), now = new Date(), d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (ms >= d0) return hm(d);
    if (ms >= d0 - DAY) return (S.yesterday || 'Yesterday') + ' ' + hm(d);
    try { return d.toLocaleDateString(this.lang(), { weekday: 'short' }) + ' ' + hm(d); } catch (e) { return hm(d); }
  },
  _snDate() { try { return new Date().toLocaleDateString(this.lang(), { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return new Date().toDateString(); } },
});

const pctBar = (v) => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, v || 0)).toFixed(0)}%"></i></div>`;
const li = (a, b, cls) => `<li${cls ? ` class="${cls}"` : ''}><span>${esc(a)}</span><span>${esc(b == null ? '' : b)}</span></li>`;

/* Each page: { meta, chips: [{t, k: ok|bad|warm, dot}], labels: [{at, l, v, c}], cards: [{h, open, cls, w, g}], ch }.
   Everything is optional: a card, chip or label whose entities are not set is left out. */
const SCENE_BUILD = {
  energy() {
    const c = this._c.energy, out = { chips: [], labels: [], cards: [] };
    const sol = this._snKw(c.solar_power), house = this._snKw(c.house_power);
    let bp = this._snKw(c.battery_power); if (bp != null && c.battery_power_positive === 'discharging') bp = -bp;
    let g = null; if (c.grid && isEnt(c.grid.entity)) { g = this._snKw(c.grid.entity); if (g != null && c.grid.positive === 'export') g = -g; }
    const kw = (v) => Math.abs(v).toFixed(2) + ' kW', price = this.num(c.price);
    out.meta = [S.sc_live, hm(new Date()), price != null ? t('sc_price_now', { p: this.money(price) }) : ''].filter(Boolean).join(' · ');
    if (sol != null) out.chips.push(sol > 0.01 ? { t: '☀ ' + t('sc_generating', { v: kw(sol) }), k: 'warm' } : { t: S.sc_solar_idle });
    if (house != null) out.chips.push({ t: t('sc_house', { v: kw(house) }) });
    if (g != null) out.chips.push(g < -0.01 ? { t: t('sc_exporting', { v: kw(g) }), k: 'ok', dot: 1 } : g > 0.01 ? { t: t('sc_importing', { v: kw(g) }) } : { t: S.sc_grid_idle });
    if (bp != null) out.chips.push({ t: bp > 0.01 ? t('sc_bat_charging', { v: kw(bp) }) : bp < -0.01 ? t('sc_bat_discharging', { v: kw(bp) }) : S.sc_bat_idle });
    const inv = ((c.health || {}).inverter_online_from || []).filter(isEnt);
    if (inv.length) { const on = inv.some((id) => !bad(this.sv(id))); out.chips.push(on ? { t: S.sc_inv_on, k: 'ok', dot: 1 } : { t: S.sc_inv_off, k: 'bad' }); }
    const socs = ((c.battery || {}).soc || []).map((id) => this.num(id)).filter((v) => v != null);
    const soc = socs.length ? socs.reduce((a, b) => a + b, 0) / socs.length : this.num((this._c.home.energy_card || {}).battery_soc);
    if (soc != null) {
      const cap = Number((c.battery || {}).capacity_kwh), res = (c.battery || {}).reserve_pct;
      out.cards.push({ open: 'enBatC', cls: 'dk', w: 250, h: `<span class="st">${esc(bp > 0.01 ? S.sc_charging : bp < -0.01 ? S.sc_discharging : '')}</span><h3>${esc(S.sc_battery)}</h3><div class="big" style="font-size:60px;margin-top:10px">${soc.toFixed(0)}<u>%</u></div>${pctBar(soc)}`
        + `<small style="margin-top:8px">${esc([cap > 0 ? t('sc_of_kwh', { a: (soc * cap / 100).toFixed(1), b: cap }) : '', res != null ? t('sc_reserve', { n: res }) : ''].filter(Boolean).join(' · '))}</small>` });
    }
    const td = c.today || {}, tiles = [[S.sc_solar_yield, td.solar_yield, ''], [S.sc_grid_import, td.grid_import, 'color:#ffb2a0'], [S.sc_grid_export, td.grid_export, 'color:#aee8a8'], [S.sc_net_cost, td.net_cost, '']].filter((x) => isEnt(x[1]));
    if (tiles.length) out.cards.push({ open: 'enToday', w: 320, g: 1.3, h: `<h3>${esc(S.sc_today)}</h3><div class="g2">${tiles.map(([l, id, st]) => `<div><small>${esc(l)}</small><div class="big" style="${st}">${esc(this._snVal(id) || '–')}</div></div>`).join('')}</div>` });
    if (isEnt(td.house_use)) out.cards.push({ open: 'enChart', cls: 'dk', w: 260, h: `<h3>${esc(S.sc_house_use)}</h3><div class="big" style="margin-top:auto">${esc(this._snVal(td.house_use) || '–')}</div><small>${esc(S.sc_so_far)}</small>` });
    const fc = c.forecast || {}, days = (fc.days || []).filter(isEnt).slice(0, 4);
    if (days.length || isEnt(fc.remaining_today)) {
      const vals = days.map((id) => this.num(id) || 0), mx = Math.max(1, ...vals), bands = fc.bands || [10, 20];
      const col = (v) => (v >= bands[1] ? '#8fc76a' : v >= bands[0] ? '#e8b25a' : '#d0624a');
      const wd = (i) => { if (!i) return S.sc_today; try { return new Date(Date.now() + i * DAY).toLocaleDateString(this.lang(), { weekday: 'short' }); } catch (e) { return ''; } };
      const sub = [isEnt(fc.remaining_today) ? t('sc_left_today', { v: this._snVal(fc.remaining_today) }) : '', days[1] ? t('sc_tomorrow_v', { v: this._snVal(days[1]) }) : ''].filter(Boolean).join(' · ');
      out.cards.push({ open: 'enFc', w: 300, h: `<h3>${esc(S.sc_forecast)}</h3><small>${esc(sub)}</small>${vals.length ? `<div class="cols">${vals.map((v) => `<i style="height:${(v / mx * 100).toFixed(0)}%;background:${col(v)}"></i>`).join('')}</div><div class="colx">${vals.map((v, i) => `<span>${esc(wd(i))}</span>`).join('')}</div>` : ''}` });
    }
    const hp = (c.consumers || {}).heat_pump || {};
    if (isEnt(hp.power)) out.cards.push({ open: 'enCons', w: 220, h: `${ic('heatp')}<span class="st">${esc(this._snVal(hp.power) || '–')}</span><b class="nm">${esc(S.sc_heat_pump)}</b><small>${esc(isEnt(hp.today) ? t('sc_v_today', { v: this._snVal(hp.today) }) : '')}</small>` });
    if (sol != null) out.labels.push({ at: 'solar', l: S.sc_solar, v: kw(sol), c: '#ffcf87' });
    if (house != null) out.labels.push({ at: 'house', l: S.sc_house_l, v: kw(house), c: '#ffe2b6' });
    if (soc != null) out.labels.push({ at: 'battery', l: S.sc_battery + ' ' + soc.toFixed(0) + '%', v: bp != null ? (bp >= 0 ? '+' : '−') + kw(bp) : '', c: '#8fdc9c' });
    if (g != null) out.labels.push({ at: 'grid', l: g < 0 ? S.sc_grid_export_l : S.sc_grid_import_l, v: kw(g), c: '#9cc2ff' });
    out.ch = 250;
    return out;
  },

  climate() {
    const c = this._c.climate, cl = this._cl || {}, out = { chips: [], labels: [], cards: [] };
    const wx = isEnt(c.weather) ? c.weather : this._c.general.weather, w = this.st(wx), a = (w && w.attributes) || {};
    if (w) {
      const cond = WX[w.state] || tidy(w.state), parts = [cond];
      if (a.apparent_temperature != null) parts.push(t('sc_feels', { t: Math.round(a.apparent_temperature) }));
      if (a.wind_speed != null) parts.push(t('sc_wind', { v: Math.round(a.wind_speed) + ' ' + (a.wind_speed_unit || '') }).trim());
      if (a.humidity != null) parts.push(t('sc_humidity', { n: Math.round(a.humidity) }));
      out.meta = parts.join(' · ');
      out.cards.push({ open: 'clWx', w: 280, h: `<div class="hd"><h3>${esc(S.sc_outside)}</h3><span class="s2">${esc(cond)}</span></div><div class="big" style="margin-top:auto;font-size:56px">${a.temperature != null ? Math.round(a.temperature) : '–'}°</div><small>${esc([a.humidity != null ? t('sc_humidity', { n: Math.round(a.humidity) }) : '', a.wind_speed != null ? t('sc_wind', { v: Math.round(a.wind_speed) + ' ' + (a.wind_speed_unit || '') }) : ''].filter(Boolean).join(' · '))}</small>` });
    } else out.meta = this._snDate();
    const th = (c.thermostats || []).filter((x) => x && isEnt(x.entity) && this.st(x.entity) && !bad(this.sv(x.entity)));
    let heatNow = null;
    th.forEach((x) => {
      const s = this.st(x.entity), at = (s && s.attributes) || {}, heating = at.hvac_action === 'heating', nm = x.name || this.name(x.entity);
      if (heating && !heatNow) heatNow = at.current_temperature;
      out.chips.push(heating ? { t: '🔥 ' + t('sc_heating_n', { n: nm }), k: 'warm' } : { t: t('sc_idle_n', { n: nm }) });
      out.cards.push({ open: 'clTh', cls: heating ? 'lit' : '', w: 300, g: 1.2, h: `<h3>${esc(nm)}</h3><small>${esc(at.current_temperature != null ? t(heating ? 'sc_heating_now' : 'sc_idle_now', { t: this._snDeg(at.current_temperature) }) : tidy(s ? s.state : ''))}</small>`
        + `<div class="ctl"><button type="button" class="rd" data-act="bump:${esc(x.entity)}:-1:${esc(x.step || '')}" aria-label="${esc(S.lower)}">−</button><div class="big">${this._snDeg(this.ov ? this.ov('t:' + x.entity, at.temperature) : at.temperature)}°</div><button type="button" class="rd" data-act="bump:${esc(x.entity)}:1:${esc(x.step || '')}" aria-label="${esc(S.raise)}">+</button></div>` });
    });
    const rooms = (cl.rooms || []).map((r) => ({ n: r.name, v: this.num(r.entity) })).filter((r) => r.v != null);
    if (rooms.length > 1) { const s = rooms.slice().sort((a, b) => a.v - b.v), lo = s[0], hi = s[s.length - 1]; out.chips.push({ t: t('sc_coldest', { n: lo.n, t: this._snDeg(lo.v) }) }, { t: t('sc_warmest', { n: hi.n, t: this._snDeg(hi.v) }) }); }
    const boost = cl.pg && cl.pg.querySelector('#clTh .boost');
    if (boost && !boost.closest('.hide')) out.cards.push({ cls: 'dk', w: 220, h: `${ic('flame')}<b class="nm" data-act="boost" role="button" style="cursor:pointer">${esc(boost.textContent.trim() || S.sc_boost)}</b><small data-act="boost" style="cursor:pointer">${esc(S.sc_heating)}</small>` });
    if (rooms.length) { const mx = Math.max(...rooms.map((r) => r.v)), mn = Math.min(...rooms.map((r) => r.v)) - 2; out.cards.push({ open: 'clRooms', w: 280, h: `<h3>${esc(S.sc_rooms)}</h3><ul class="ls">${rooms.slice(0, 4).map((r) => `<li><span>${esc(r.n)}</span><span>${this._snDeg(r.v)}°</span></li>`).join('')}</ul>`, mx, mn }); }
    if (th.length && out.cards.length < 5) out.cards.push({ open: 'clHist', w: 220, h: `<h3>${esc(S.sc_last12)}</h3><svg viewBox="0 0 200 70" style="margin-top:auto;width:100%"><path d="M0 40 C30 26 50 20 80 20 S120 34 140 46 S180 52 200 46" stroke="#ffcf87" stroke-width="2.5" fill="none"/><path d="M0 54 C30 44 50 38 80 38" stroke="#9cc2ff" stroke-width="2.5" fill="none"/></svg><small>${esc(S.sc_tap_graph)}</small>` });
    if (th[0]) { const at = (this.st(th[0].entity) || {}).attributes || {}; out.labels.push({ at: 'stat', l: S.sc_thermostat, v: t('sc_set', { t: this._snDeg(at.temperature) }), c: '#ffcf87' }); }
    if (w) out.labels.push({ at: 'outside', l: S.sc_outside + ' · ' + (WX[w.state] || tidy(w.state)), v: (a.temperature != null ? Math.round(a.temperature) : '–') + '°', c: '#9cc2ff' });
    if (heatNow != null) out.labels.push({ at: 'heat', l: S.sc_heating, v: t('sc_now_t', { t: this._snDeg(heatNow) }), c: '#ff8a3c' });
    out.ch = 230;
    return out;
  },

  family() {
    const c = this._c.family, fm = this._fm || {}, out = { chips: [], labels: [], cards: [] };
    const base = (fm.cal && fm.cal.base) ? fm.cal.base.getTime() : new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const evs = []; ((fm.cal && fm.cal.data) || []).forEach((l) => l.forEach((e) => evs.push(e)));
    evs.sort((a, b) => a.start - b.start);
    const on = (e, d0, d1) => e.start.getTime() < base + d1 * DAY && (e.end.getTime() > base + d0 * DAY || e.start.getTime() >= base + d0 * DAY);
    const today = evs.filter((e) => on(e, 0, 1)), tom = evs.filter((e) => on(e, 1, 2) && !on(e, 0, 1)), later = evs.filter((e) => e.start.getTime() >= base + 2 * DAY && e.start.getTime() < base + 7 * DAY);
    const tm = (e) => (e.allDay ? (S.all_day || 'All day') : hm(e.start));
    out.meta = this._snDate() + (fm.cal && fm.cal.data ? ' · ' + (today.length === 1 ? S.sc_event_today : t('sc_events_today', { n: today.length })) : '');
    const bins = (fm.bins || c.bins || []).filter((b) => b && isEnt(b.entity)), next = (fm.bs && fm.bs.next) || [];
    const dayTxt = (d) => { if (d == null) return '–'; if (d < 0) return S.bin_none || '–'; if (d === 0) return S.bin_today || 'Today'; if (d === 1) return S.bin_tomorrow || 'Tomorrow';
      try { return new Date(base + d * DAY + 7200000).toLocaleDateString(this.lang(), { weekday: 'short', day: 'numeric' }); } catch (e) { return ''; } };
    bins.forEach((b, i) => { const d = next[i]; if (d === 0 || d === 1) out.chips.push({ t: '🔔 ' + t('sc_bin_due', { b: b.label || this.name(b.entity), d: dayTxt(d).toLowerCase() }), k: 'bad' }); });
    const items = (id) => { if (!isEnt(id)) return null; const d = this._todo(id); const all = d.items; return all ? all.filter((x) => x.status !== 'completed') : null; };
    const shop = items(c.shopping), todo = items(c.todo), cnt = (id, list) => (list ? list.length : Number(this.sv(id)) || 0);
    if (isEnt(c.shopping)) out.chips.push({ t: t('sc_on_list', { n: cnt(c.shopping, shop) }) });
    if (isEnt(c.todo)) out.chips.push({ t: t('sc_to_do_n', { n: cnt(c.todo, todo) }) });
    const nx = today.find((e) => !e.allDay && e.start.getTime() > Date.now()) || tom[0];
    if (nx) out.chips.push({ t: t('sc_next', { t: nx.title + ' ' + tm(nx) }), k: 'warm' });
    if (isEnt(c.shopping)) out.cards.push({ open: 'fmShop', w: 300, h: `<div class="hd"><h3>${esc(S.sc_shopping)}</h3><span class="s2">${esc(t('sc_items', { n: cnt(c.shopping, shop) }))}</span></div><ul class="ls">${(shop || []).slice(0, 6).map((x) => `<li><span><i class="bx"></i>${esc(x.summary)}</span><span></span></li>`).join('') || li(S.sc_list_empty, '')}</ul>${shop && shop.length > 6 ? `<small style="margin-top:auto">${esc(t('sc_more', { n: shop.length - 6 }))}</small>` : ''}` });
    if ((c.calendars || []).length) {
      const sec = (title, list, n) => (list.length ? `<div class="sub">${esc(title)}</div><ul class="ls" style="margin-top:4px">${list.slice(0, n).map((e) => li(e.title, tm(e))).join('')}</ul>` : '');
      out.cards.push({ open: 'fmCal', w: 320, g: 1.2, h: `<h3>${esc(S.sc_calendar)}</h3>${sec(S.today || 'Today', today, 3)}${sec(S.tomorrow_cap || 'Tomorrow', tom, 2)}${!today.length && !tom.length ? `<ul class="ls">${li(S.sc_nothing, '')}</ul>` : ''}` });
      if (later.length && !isEnt(c.todo)) out.cards.push({ open: 'fmCal', w: 260, h: `<div class="hd"><h3>${esc(S.sc_later)}</h3><span class="s2">${esc(S.sc_this_week)}</span></div><ul class="ls">${later.slice(0, 4).map((e) => { let wd = ''; try { wd = e.start.toLocaleDateString(this.lang(), { weekday: 'short' }); } catch (x) { /* none */ } return li(e.title, wd + ' · ' + tm(e)); }).join('')}</ul>` });
    }
    if (isEnt(c.todo)) out.cards.push({ open: 'fmTodo', w: 220, g: 0.8, h: `<div class="hd"><h3>${esc(S.sc_todo)}</h3><span class="s2">${esc(t('sc_items', { n: cnt(c.todo, todo) }))}</span></div><ul class="ls">${(todo || []).slice(0, 5).map((x) => `<li><span><i class="bx"></i>${esc(x.summary)}</span><span></span></li>`).join('') || li(S.sc_list_empty, '')}</ul>` });
    if (bins.length) out.cards.push({ open: 'fmBins', w: 360, g: 1.4, h: `<h3>${esc(S.sc_bins)}</h3><div class="bins">${bins.slice(0, 3).map((b, i) => { const d = next[i], col = (this._fmBinColour && this._fmBinColour(b)) || 'rgba(255,255,255,.14)'; return `<div class="${d === 0 || d === 1 ? 'soon' : ''}" style="background:${esc(col)}">${esc(b.label || this.name(b.entity))}<b>${esc(dayTxt(d))}</b></div>`; }).join('')}</div>` });
    if (fm.cal && fm.cal.data) out.labels.push({ at: 'cal', l: S.sc_calendar + ' · ' + (S.today || 'Today').toLowerCase(), v: today.length === 1 ? S.sc_event_today.replace(/ today$/, '') : String(today.length) + ' ' + (today.length === 1 ? 'event' : 'events'), c: '#ffcf87' });
    if (isEnt(c.shopping)) out.labels.push({ at: 'list', l: S.sc_shopping, v: t('sc_items', { n: cnt(c.shopping, shop) }), c: '#fff6c8' });
    const soon = bins.map((b, i) => ({ b, d: next[i] })).filter((x) => x.d != null && x.d >= 0).sort((a, b) => a.d - b.d)[0];
    if (soon) out.labels.push({ at: 'bin', l: soon.b.label || this.name(soon.b.entity), v: dayTxt(soon.d), c: '#ffcf87' });
    out.waiting = (isEnt(c.shopping) && !shop) || (isEnt(c.todo) && !todo) || ((c.calendars || []).length && !(fm.cal && fm.cal.data)) || (bins.length && !(fm.bs && fm.bs.next));
    out.ch = 300;
    return out;
  },

  security() {
    const c = this._scc || this._c.security, S0 = this._sc || {}, out = { chips: [], labels: [], cards: [] };
    const alarm = isEnt(c.alarm) ? c.alarm : this._c.general.alarm, as = this.sv(alarm);
    const evs = (S0.events || []).slice().sort((a, b) => b.t - a.t);
    out.meta = [S.sc_read_only, evs[0] ? t('sc_last_event', { t: this._snWhen(evs[0].t) }) : ''].filter(Boolean).join(' · ');
    if (isEnt(alarm)) out.chips.push({ t: '⛉ ' + tidy(as || '–'), k: as === 'triggered' ? 'bad' : '' });
    const rows = (S0.open || []).map((r) => ({ l: r.it.label, id: r.it.entity, on: this.sv(r.it.entity) === 'on' }));
    const open = rows.filter((r) => r.on);
    if (rows.length) out.chips.push(open.length ? { t: open.length === 1 ? t('sc_x_open', { x: open[0].l }) : t('sc_n_open', { n: open.length }), k: 'bad' } : { t: S.sc_all_closed, k: 'ok', dot: 1 });
    const fd = this._c.general.front_door;
    if (isEnt(fd)) out.chips.push(this.sv(fd) === 'on' ? { t: S.sc_front_open, k: 'bad' } : { t: S.sc_front_closed });
    const here = []; (c.presence || []).forEach((f) => (f.rooms || []).forEach((r) => { if ((r.entities || []).some((id) => this.sv(id) === 'on')) here.push(r.name); }));
    if ((c.presence || []).length) out.chips.push(here.length ? { t: t('sc_someone', { r: here[0] }), k: 'ok', dot: 1 } : { t: S.sc_nobody });
    if (isEnt(alarm)) out.cards.push({ open: 'scHero', cls: as === 'triggered' ? 'bad' : '', w: 230, h: `${ic('shield')}<span class="st">${esc(tidy(as || '–'))}</span><b class="nm">${esc(S.sc_alarm)}</b><small>${esc(S.sc_read_only)}</small>` });
    if (rows.length) out.cards.push({ open: 'scDoors', w: 300, g: 1.2, h: `<div class="hd"><h3>${esc(S.sc_doors)}</h3><span class="s2">${esc(open.length ? t('sc_n_open', { n: open.length }) : S.sc_all_closed)}</span></div><ul class="ls">${open.concat(rows.filter((r) => !r.on)).slice(0, 4).map((r) => li(r.l, r.on ? S.sc_open : S.sc_closed, r.on ? 'bad' : '')).join('')}</ul>${rows.length > 4 ? `<small style="margin-top:auto">${esc(t('sc_more', { n: rows.length - 4 }))}</small>` : ''}` });
    const cams = (c.cameras || []).filter((m) => m && isEnt(m.camera));
    if (cams.length) out.cards.push({ open: 'scCams', w: 340, g: 1.3, h: `<div class="hd"><h3>${esc(S.sc_cameras)}</h3><span class="s2">${esc(S.sc_live_tap)}</span></div><div class="cams">${cams.slice(0, 2).map((m) => { const s = this.st(m.camera), pic = s && s.attributes && s.attributes.entity_picture; return `<div${pic ? ` style="background-image:url('${esc(pic)}')"` : ''}><span>${esc(m.name || this.name(m.camera))}</span></div>`; }).join('')}</div>${cams.length > 2 ? `<small style="margin-top:6px">${esc(t('sc_more', { n: cams.length - 2 }))}</small>` : ''}` });
    if (S0.events) out.cards.push({ open: 'scEv', w: 280, h: `<h3>${esc(S.sc_events)}</h3><ul class="ls">${evs.slice(0, 4).map((e) => li(e.x, this._snWhen(e.t))).join('') || li(S.sc_no_events, '')}</ul>` });
    if ((c.presence || []).length) out.cards.push({ open: 'scMotion', w: 240, h: `<h3>${esc(S.sc_presence)}</h3><ul class="ls">${here.slice(0, 4).map((r) => li(r, '●', 'ok')).join('') || li(S.sc_nobody, '')}</ul>` });
    if (isEnt(fd)) out.labels.push({ at: 'front', l: S.sc_front_door, v: this.sv(fd) === 'on' ? S.sc_open : S.sc_closed, c: this.sv(fd) === 'on' ? '#ff6a58' : '#8fdc9c' });
    if (rows.length) out.labels.push(open.length ? { at: 'open', l: open[0].l, v: S.sc_open, c: '#ff6a58' } : { at: 'open', l: S.sc_doors, v: S.sc_all_closed, c: '#8fdc9c' });
    const mc = cams.find((m) => isEnt(m.motion)); if (mc) { const s = this.st(mc.motion); out.labels.push({ at: 'cam', l: mc.name || this.name(mc.camera), v: s && s.last_changed ? t('sc_motion', { t: this._snWhen(Date.parse(s.last_changed)) }) : '–', c: '#9cc2ff' }); }
    if (isEnt(alarm)) out.labels.push({ at: 'alarm', l: S.sc_alarm, v: tidy(as || '–'), c: '#9cc2ff' });
    out.waiting = !S0.events;
    out.ch = 230;
    return out;
  },

  vacuum() {
    const vs = (this._c.vacuum.vacuums || []).filter((v) => v && isEnt(v.entity)), m = vs[0], out = { chips: [], labels: [], cards: [] };
    if (!m) return out;
    const state = this.sv(m.state_sensor) || this.sv(m.entity) || '', vs0 = this.st(m.entity);
    const bat = this.num(m.battery) != null ? this.num(m.battery) : (vs0 && vs0.attributes && vs0.attributes.battery_level);
    const last = [this._snVal(m.last_area), this._snVal(m.last_time)].filter(Boolean).join(' · ');
    out.meta = last ? t('sc_last_clean', { a: last }) : (m.name || this.name(m.entity));
    out.chips.push({ t: tidy(state) + (bat != null ? ' · ' + Math.round(bat) + '%' : ''), k: /dock|charg/.test(state) ? 'ok' : '', dot: 1 });
    const sch = (m.schedule || [])[0]; if (sch && sch.label) out.chips.push({ t: t('sc_next_run', { t: sch.label }) });
    const err = this.sv(m.error); if (err && !bad(err) && !/^(no_error|none|ok|0)$/i.test(err)) out.chips.push({ t: tidy(err), k: 'bad' });
    (m.station || []).forEach((x) => { const v = this.sv(x.entity); if (isEnt(x.entity) && v && !bad(v) && x.ok_state && v !== x.ok_state) out.chips.push({ t: (x.name || this.name(x.entity)) + ': ' + tidy(v), k: 'bad' }); });
    out.cards.push({ open: 'vcHero', cls: 'lit', w: 230, h: `${ic('play')}<span class="st">${esc(S.sc_ask_first)}</span><b class="nm">${esc(S.sc_start)}</b><small>${esc(m.name || this.name(m.entity))}</small>` });
    const vsc = this._pages.vacuum && this._pages.vacuum.scene, mapP = vsc && vsc.panels.find((x) => x.id === 'vcMapP');
    if (mapP && !mapP.classList.contains('hide')) {
      const rooms = (this._vcRoomList ? this._vcRoomList() : []).slice().sort((a, b) => (a.o || 0) - (b.o || 0));
      out.cards.push({ open: 'vcMapP', w: 260, h: `<h3>${esc(S.sc_rooms_clean)}</h3><div class="btn">${rooms.slice(0, 6).map((r) => `<span>${esc(r.n)}</span>`).join('')}</div>${rooms.length > 6 ? `<small style="margin-top:auto">${esc(t('sc_more', { n: rooms.length - 6 }))}</small>` : ''}` });
    }
    const set = (m.settings || []).filter((x) => isEnt(x.entity));
    if (set.length) out.cards.push({ open: 'vcSet', w: 280, h: `<h3>${esc(S.sc_settings)}</h3><ul class="ls">${set.slice(0, 4).map((x) => li(x.label || this.name(x.entity), tidy(this.sv(x.entity) || '–'))).join('')}</ul>` });
    if ((m.schedule || []).length) out.cards.push({ open: 'vcSch', w: 260, h: `<h3>${esc(S.sc_schedule)}</h3><ul class="ls">${m.schedule.slice(0, 3).map((x) => li(x.label || x.at || '', x.at || '')).join('')}</ul>` });
    const parts = (m.consumables || []).map((x) => ({ n: x.name || this.name(x.percent), v: this.num(x.percent) })).filter((x) => x.v != null).sort((a, b) => a.v - b.v);
    const maint = (this._pages.vacuum.scene || {}).panels || [], maintOk = maint.some((x) => x.id === 'vcMaint' && x.offsetWidth > 0);
    if (parts.length) out.cards.push({ open: maintOk ? 'vcMaint' : 'vcHero', w: 260, h: `<h3>${esc(S.sc_parts)}</h3><ul class="ls">${parts.slice(0, 4).map((x) => li(x.n, Math.round(x.v) + '%', x.v < 20 ? 'bad' : x.v < 50 ? 'warn' : '')).join('')}</ul>` });
    vs.slice(1, 3).forEach((v, i) => {
      const b = this.num(v.battery) != null ? this.num(v.battery) : ((this.st(v.entity) || {}).attributes || {}).battery_level;
      out.cards.push({ open: 'vcF1' + (i ? '_' + (i + 1) : ''), w: 200, h: `<div class="hd"><h3>${esc(v.name || this.name(v.entity))}</h3><span class="s2">${esc(tidy(this.sv(v.state_sensor) || this.sv(v.entity) || ''))}</span></div><div class="big" style="margin-top:auto">${b != null ? Math.round(b) : '–'}<u>%</u></div>` });
    });
    out.labels.push({ at: 'robot', l: m.name || this.name(m.entity), v: tidy(state) + (bat != null ? ' · ' + Math.round(bat) + '%' : ''), c: '#8fdc9c' });
    if (isEnt(m.station_status)) out.labels.push({ at: 'dock', l: S.sc_dock, v: tidy(this.sv(m.station_status) || '–'), c: '#9cc2ff' });
    out.ch = 230;
    return out;
  },

  system() {
    const c = this._c.system, h = this._h || {}, states = h.states || {}, out = { chips: [], labels: [], cards: [] };
    const ver = (h.config && h.config.version) || '';
    const up = this.st((c.host || {}).uptime); let upTxt = '';
    if (up) { const t0 = Date.parse(up.state); if (Number.isFinite(t0)) { const d = Math.floor((Date.now() - t0) / DAY); upTxt = d >= 1 ? (d === 1 ? S.sc_day : t('sc_days', { n: d })) : t('sc_hours', { n: Math.max(0, Math.floor((Date.now() - t0) / 3600000)) }); } }
    out.meta = [ver ? t('sc_ha', { v: ver }) : '', upTxt ? t('sc_up', { d: upTxt }) : ''].filter(Boolean).join(' · ') || this._snDate();
    const conns = (c.connections || []).filter((x) => x && isEnt(x.entity)), off = conns.filter((x) => this.sv(x.entity) !== (x.ok_state || 'on'));
    if (conns.length) out.chips.push(off.length ? { t: t('sc_offline', { n: off.length }), k: 'bad' } : { t: S.sc_connected, k: 'ok', dot: 1 });
    const bk = this.st((c.backups || {}).last), bkT = bk ? Date.parse(bk.state) : NaN;
    if (Number.isFinite(bkT)) out.chips.push({ t: t('sc_backup', { t: this._snWhen(bkT) }) });
    const pct = Number(c.low_battery_pct) || 20, low = [];
    Object.keys(states).forEach((id) => { const s = states[id], a = s.attributes || {}; if (a.device_class === 'battery' && a.unit_of_measurement === '%') { const v = parseFloat(s.state); if (Number.isFinite(v) && v < pct) low.push({ n: a.friendly_name || id, v }); } });
    low.sort((a, b) => a.v - b.v);
    if (low.length) out.chips.push({ t: t('sc_low_bat', { n: low.length }), k: 'warm' });
    const ups = Object.keys(states).filter((id) => id.startsWith('update.') && states[id].state === 'on').length;
    out.chips.push(ups ? { t: ups === 1 ? S.sc_update : t('sc_updates', { n: ups }), k: 'warm' } : { t: S.sc_up_to_date, k: 'ok', dot: 1 });
    out.cards.push({ open: 'syHA', w: 300, h: `<h3>Home Assistant</h3><div class="big" style="font-size:34px;margin-top:10px">${esc(ver || '–')}</div><ul class="ls">${li(S.sc_backups, Number.isFinite(bkT) ? this._snWhen(bkT) : '–')}${li(S.sc_updates_l, ups ? String(ups) : S.sc_up_to_date, ups ? 'warn' : 'ok')}</ul>` });
    const host = c.host || {}, hr = [[S.sc_cpu, host.cpu], [S.sc_mem, host.memory], [S.sc_disk, host.disk]].filter((x) => isEnt(x[1]));
    if (hr.length) out.cards.push({ open: 'syHost', w: 280, h: `<h3>${esc(S.sc_host)}</h3>${hr.map(([l, id]) => { const v = this.num(id); return `<small style="margin-top:10px;display:flex;justify-content:space-between"><span>${esc(l)}</span><span>${v != null ? Math.round(v) + '%' : '–'}</span></small>${pctBar(v)}`; }).join('')}` });
    out.cards.push({ open: 'syAtt', w: 260, h: `<div class="hd"><h3>${esc(S.sc_attention)}</h3><span class="s2">${esc(low.length ? String(low.length) : '')}</span></div><ul class="ls">${low.slice(0, 4).map((x) => li(x.n, Math.round(x.v) + '%', 'warn')).join('') || li(S.sc_none_low, '', 'ok')}</ul>` });
    if (conns.length) out.cards.push({ open: 'syConn', w: 260, h: `<h3>${esc(S.sc_conns)}</h3><ul class="ls">${conns.slice(0, 4).map((x) => { const okk = this.sv(x.entity) === (x.ok_state || 'on'); return li(x.name || this.name(x.entity), okk ? (x.ok_label || '●') : (x.other_label || tidy(this.sv(x.entity) || '–')), okk ? 'ok' : 'bad'); }).join('')}</ul>` });
    out.cards.push({ open: 'syTab', w: 200, h: `${ic('tablet')}<b class="nm">${esc(S.sc_tablet)}</b><small>${esc(S.sc_tap_full)}</small>` });
    if (ver) out.labels.push({ at: 'screen', l: 'Home Assistant', v: ver, c: '#9cc2ff' });
    if (conns.length) out.labels.push({ at: 'router', l: S.sc_conns, v: off.length ? t('sc_offline', { n: off.length }) : S.sc_connected, c: off.length ? '#ff6a58' : '#8fdc9c' });
    if (Number.isFinite(bkT)) out.labels.push({ at: 'nas', l: S.sc_backups, v: this._snWhen(bkT), c: '#f4c860' });
    out.ch = 230;
    return out;
  },
};
