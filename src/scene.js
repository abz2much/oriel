/* Scene style (general.page_style: scene), tablet layout only.
   On Energy, Climate, Household, Security, Vacuum and System: a large page title at the top left, the page's drawing
   behind it on the right, and the page's own panels moved into one row along the bottom that scrolls sideways.
   The panels are the same elements the classic layout uses (same ids, same code); only where they sit changes.
   Home, Living room and Nova keep their own layouts. The phone layout ignores the style: switching to it puts every
   panel back where it came from. Changing the config rebuilds the card, so the style is applied fresh each time. */
import { addMethods } from './core.js';
import { sceneArt } from './scenes/art.js';

export const SCENE_KEYS = ['energy', 'climate', 'family', 'security', 'vacuum', 'system'];
const PANEL = '.glass,.dark,.black';

const CSS = `
#wrap.scene .scHero{position:absolute;left:calc(var(--dx,0px) + 120px);top:104px;max-width:560px;pointer-events:none;z-index:1}
#wrap.scene .scHero .meta{font-size:13px;letter-spacing:.14em;font-weight:500;text-transform:uppercase;color:rgba(var(--oriel-ink),var(--oriel-soft-page,.72))}
#wrap.scene .scHero h1{margin:6px 0 0;font-size:76px;line-height:1;font-weight:500;letter-spacing:-.02em;color:rgb(var(--oriel-ink))}
#wrap.scene .scArt{position:absolute;right:calc(var(--dx,0px) + 8px);top:56px;width:720px;height:420px;pointer-events:none;z-index:0;
  -webkit-mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,#000 70%,transparent 100%);mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,#000 70%,transparent 100%)}
#wrap.scene .scArt svg{width:100%;height:100%}
#wrap.scene .scRow{position:absolute;left:112px;right:0;bottom:24px;display:flex;align-items:flex-end;gap:16px;
  overflow-x:auto;overflow-y:hidden;padding:24px 24px 0 0;pointer-events:auto;z-index:2;scrollbar-width:none;overscroll-behavior-x:contain;scroll-snap-type:x proximity}
#wrap.scene .scRow::-webkit-scrollbar{display:none}
#wrap.scene .scRow>*{position:relative!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;
  flex:0 0 auto;max-height:440px;overflow-y:auto;scroll-snap-align:start;margin:0!important}
#wrap.scene .page>.scRow{left:calc(var(--dx,0px) + 112px)} /* a page with no wrapper of its own */
@media (prefers-reduced-motion:reduce){#wrap.scene .scArt animateMotion{display:none}}
`;

addMethods({
  /* on when the config asks for it and the tablet layout shows */
  _sceneOn() { return !!(this._c && this._c.general.page_style === 'scene') && !this._phone; },
  _sceneSync() {
    const wrap = this.$('wrap'); if (!wrap || !this._pages) return;
    const on = this._sceneOn();
    if (on && !this._sceneCss) { this.addCss('scene', CSS); this._sceneCss = true; }
    wrap.classList.toggle('scene', on);
    SCENE_KEYS.forEach((k) => {
      const p = this._pages[k]; if (!p) return;
      try { if (on) this._sceneApply(k, p); else this._sceneUndo(p); } catch (e) { console.warn('[oriel] scene ' + k, e); }
    });
  },
  _sceneApply(k, p) {
    if (p.scene) { this._sceneMeta(p); return; }
    const pg = p.el;
    const panels = [...pg.querySelectorAll(PANEL)].filter((x) => !x.parentElement.closest(PANEL));
    if (!panels.length) return;
    /* each panel keeps the width the classic layout gives it; measured while the page shows */
    const off = pg.classList.contains('off'); if (off) pg.classList.remove('off');
    const moved = panels.map((el) => ({ el, parent: el.parentNode, next: el.nextSibling, css: el.style.cssText, w: el.offsetWidth }));
    if (off) pg.classList.add('off');
    const hero = document.createElement('div'); hero.className = 'scHero';
    hero.innerHTML = '<div class="meta"></div><h1></h1>';
    const art = document.createElement('div'); art.className = 'scArt'; art.innerHTML = sceneArt(k);
    const row = document.createElement('div'); row.className = 'scRow';
    moved.forEach((m) => { if (m.w > 0) m.el.style.width = m.w + 'px'; row.appendChild(m.el); });
    /* the row goes inside the page's own wrapper (#enWrap, .pgc …) so the page's styles, written from that wrapper, still apply */
    let host = moved[0].parent;
    while (host && host.parentElement && host.parentElement !== pg) host = host.parentElement;
    if (!host || host === pg || host.parentElement !== pg) host = pg;
    pg.append(art, hero); host.appendChild(row);
    p.scene = { moved, nodes: [art, hero, row] };
    this._sceneMeta(p);
  },
  /* the title is the page's own label (the rail's); the line above it is today's date */
  _sceneMeta(p) {
    const hero = p.scene && p.scene.nodes[1]; if (!hero) return;
    const label = typeof p.def.label === 'function' ? p.def.label.call(this, this._c) : p.def.label;
    const lang = (this._h && (this._h.locale && this._h.locale.language || this._h.language)) || undefined;
    let day = '';
    try { day = new Date().toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { day = new Date().toDateString(); }
    const h1 = hero.querySelector('h1'), meta = hero.querySelector('.meta');
    if (h1.textContent !== label) h1.textContent = label;
    if (meta.textContent !== day) meta.textContent = day;
  },
  _sceneUndo(p) {
    if (!p.scene) return;
    const { moved, nodes } = p.scene;
    for (let i = moved.length - 1; i >= 0; i--) {
      const m = moved[i];
      m.el.style.cssText = m.css;
      if (m.next && m.next.parentNode === m.parent) m.parent.insertBefore(m.el, m.next); else m.parent.appendChild(m.el);
    }
    nodes.forEach((n) => n.remove());
    p.scene = null;
  },
});
