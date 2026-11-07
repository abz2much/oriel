/* Full screen: the round button at the right of the header (tablet layout only).
   On: Oriel hides Home Assistant's header and sidebar itself and asks the browser for full screen (its bars and the system bars).
   Off: everything comes back. The choice is kept on this device (localStorage), so after a reload the header and sidebar stay hidden;
   the browser's own full screen needs a tap, so it is only asked for from the button.
   Hiding works by adding one <style id="oriel-fs"> to three places in Home Assistant's page, with the rules the kiosk-mode project uses
   (github.com/NemesisRE/kiosk-mode, src/styles): the dashboard's hui-root (its header), ha-drawer (the sidebar, in home-assistant-main's scope)
   and ha-drawer's shadow root (the drawer shell). Nothing else in Home Assistant is changed, and the styles are removed when the button is
   tapped off, in the phone layout, in the card editor's preview, and when the card leaves the page (another dashboard keeps its sidebar). */
import { addMethods } from './core.js';

const KEY = 'oriel.fullscreen', STYLE_ID = 'oriel-fs';
const CSS = {
  header: '.header{display:none!important}#view{min-height:100vh!important;--kiosk-header-height:0px;padding-top:calc(var(--safe-area-inset-top,0px) + var(--view-container-padding-top,0px))!important}',
  sidebar: ':host{--ha-sidebar-width:0px!important;--kiosk-sidebar-width:0px}partial-panel-resolver{--mdc-top-app-bar-width:100%!important}ha-drawer>ha-sidebar{display:none!important}',
  drawer: 'wa-drawer,.sidebar-shell{display:none!important}',
};

addMethods({
  _fsStored() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return !!this._fsMem; } },
  /* hidden only in the tablet layout, never in the card editor's preview */
  _fsAllowed() { return !this._phone && !this._idleInEditor(); },
  _fsOn() { return this._fsAllowed() && this._fsStored(); },
  /* the three places in Home Assistant's page; any of them can be missing (outside Home Assistant, or a future change to its page) */
  _fsTargets() {
    const out = [];
    let n = this, root = null;
    for (let i = 0; n && i < 40; i++) { const r = n.getRootNode && n.getRootNode(); if (!r || !r.host) break; if (r.host.localName === 'hui-root') { root = r; break; } n = r.host; }
    if (root) out.push([root, CSS.header]);
    const ha = document.querySelector('home-assistant'), mainRoot = ha && ha.shadowRoot && ha.shadowRoot.querySelector('home-assistant-main');
    const drawer = mainRoot && mainRoot.shadowRoot && mainRoot.shadowRoot.querySelector('ha-drawer');
    if (drawer) { out.push([drawer, CSS.sidebar]); if (drawer.shadowRoot) out.push([drawer.shadowRoot, CSS.drawer]); }
    return out;
  },
  /* add or remove Oriel's style in each place; never throws. The places styled are remembered, so they can be cleaned up after the card has left the page
     (by then it can no longer find its dashboard). Own style found among the place's direct children (:scope does not work on a shadow root). */
  _fsApply(on) {
    let targets = [];
    try { targets = this._fsTargets(); } catch (e) { targets = []; }
    const mine = (host) => [...host.children].find((e) => e.localName === 'style' && e.id === STYLE_ID);
    const done = this._fsDone || (this._fsDone = new Set());
    if (!on) targets = targets.concat([...done].map((h) => [h]));
    targets.forEach(([host, css]) => {
      try {
        const old = mine(host);
        if (!on) { if (old) old.remove(); done.delete(host); return; }
        done.add(host); if (old) return;
        const st = document.createElement('style'); st.id = STYLE_ID; st.textContent = css; host.appendChild(st);
      } catch (e) { /* that place is not there: leave it */ }
    });
  },
  /* the button and Home Assistant's page follow the stored choice and the layout */
  _fsSync() {
    const b = this.$ && this.$('bFs'), on = this._fsOn();
    this._fsApply(on);
    if (!b) return;
    b.classList.toggle('hide', !this._fsAllowed());
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', on ? this._fsText.exit : this._fsText.enter); b.title = b.getAttribute('aria-label');
    b.innerHTML = this._fsIcon(on);
  },
  /* the tap: store the choice, hide or show, and enter or leave the browser's full screen (a refusal or no support is fine) */
  _fsToggle() {
    const on = !this._fsOn();
    try { localStorage.setItem(KEY, on ? '1' : '0'); this._fsMem = undefined; } catch (e) { this._fsMem = on; }
    this._fsSync();
    const d = document;
    try {
      if (on) { const el = d.documentElement; if (el && typeof el.requestFullscreen === 'function' && !d.fullscreenElement) { const p = el.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } }
      else if (d.fullscreenElement && typeof d.exitFullscreen === 'function') { const p = d.exitFullscreen(); if (p && p.catch) p.catch(() => {}); }
    } catch (e) { /* the browser said no: the header and sidebar are still hidden */ }
  },
  _fsInit(text, iconFn) {
    this._fsText = text; this._fsIcon = iconFn;
    const b = this.$('bFs'); if (b && !b._fsWired) { b._fsWired = true; b.addEventListener('click', () => this._fsToggle()); }
    this._fsSync();
  },
  _fsStop() { this._fsApply(false); },
});
