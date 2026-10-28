/* Entry point: the core, then each page, then define the element. */
import { OrielShell, VERSION } from './core.js';
import { S } from './strings.js';
import { BANNER } from './theme/fixed.js';
import './house.js';
import './idle.js';
import './phone.js';
import './nav.js';
import './pages/living.js';
import './pages/energy.js';
import './pages/climate.js';
import './pages/family.js';
import './pages/security.js';
import './pages/vacuum.js';
import './pages/system.js';
import './pages/nova.js';
import { defineEditor } from './editor/editor.js';

if (!customElements.get('oriel-shell')) customElements.define('oriel-shell', OrielShell);
defineEditor();
window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === 'oriel-shell')) {
  window.customCards.push({ type: 'oriel-shell', name: S.card_name, description: S.card_description, preview: false });
}
console.info(`%c ORIEL %c v${VERSION} `, ...BANNER);
