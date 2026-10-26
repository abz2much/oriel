/* Dev harness for the visual editor, with the stand-in ha-form. Checks:
   1. a config passes through unchanged when only one field is edited (no data lost or reshaped);
   2. list add / move / remove; 3. warnings for missing and wrong-domain entities; 4. auto-detect applies only on Apply;
   5. house example; 6. theme dropdown, accent colour and their warnings, and the card switching theme on a new config.
   Usage: node dev/editor.mjs [config.json]   Screenshots go to dev/out/editor-*.png */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { mkStates } from './mock.mjs';

const cfgFile = process.argv[2] || 'dev/configs/full.json';
const input = Object.assign({ type: 'custom:oriel-shell' }, JSON.parse(fs.readFileSync(cfgFile, 'utf8')));
fs.mkdirSync('dev/out', { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 760, height: 1100 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.setContent('<!doctype html><html><head></head><body style="margin:0;padding:16px;background:#fafafa"><div id="host"></div></body></html>');
await p.addScriptTag({ content: fs.readFileSync('dev/fake-ha-form.js', 'utf8') });
await p.addScriptTag({ content: fs.readFileSync(process.env.BUNDLE || 'dist/oriel.js', 'utf8'), type: 'module' });
await p.waitForFunction(() => customElements.get('oriel-shell-editor'));
await p.evaluate(({ cfg, st }) => {
  const ed = document.createElement('oriel-shell-editor');
  window.__out = [];
  ed.addEventListener('config-changed', (e) => { window.__out.push(e.detail.config); ed.setConfig(e.detail.config); });
  ed.setConfig(cfg);
  ed.hass = { states: st, services: {}, locale: { language: 'en-GB' }, config: {} };
  document.getElementById('host').appendChild(ed); window.__ed = ed;
}, { cfg: input, st: mkStates() });
await p.waitForTimeout(400);
const R = (fn, arg) => p.evaluate(fn, arg);
const results = [];
const check = (name, ok, extra) => { results.push([ok ? 'PASS' : 'FAIL', name, extra || '']); };

// 1. round trip: change the weather label only
await R(() => { const sr = window.__ed.shadowRoot, i = sr.querySelector('ha-form input[data-name="weather_label"]'); i.value = 'Garden'; i.dispatchEvent(new Event('change')); });
let out = await R(() => window.__out[window.__out.length - 1]);
const expect = JSON.parse(JSON.stringify(input)); expect.general = Object.assign({}, expect.general, { weather_label: 'Garden' });
const norm = (o) => JSON.stringify(o, Object.keys(JSON.parse(JSON.stringify(o))).sort());
const deepSort = (o) => (Array.isArray(o) ? o.map(deepSort) : o && typeof o === 'object' ? Object.keys(o).sort().reduce((a, k) => { a[k] = deepSort(o[k]); return a; }, {}) : o);
check('round trip: only the edited field changes', JSON.stringify(deepSort(out)) === JSON.stringify(deepSort(expect)));
void norm;
await p.screenshot({ path: (process.env.OUT || 'dev/out') + '/editor-general.png', fullPage: true });

// 2. lists: open Home > Room panel, add a light, move it up, remove it
const clickText = (sel, text) => R(({ sel, text }) => { const n = [...window.__ed.shadowRoot.querySelectorAll(sel)].find((x) => x.textContent.trim().includes(text)); if (n) n.click(); return !!n; }, { sel, text });
await clickText('.tg', 'Home'); await p.waitForTimeout(100);
await clickText('.tabs button', 'Room panel'); await p.waitForTimeout(100);
const before = (await R(() => window.__out[window.__out.length - 1])).home.room_panel.lights.length;
await clickText('.add', 'Add light'); await p.waitForTimeout(100);
await R(() => { const sr = window.__ed.shadowRoot, forms = [...sr.querySelectorAll('.ibody ha-form')], f = forms[forms.length - 1]; const i = f.querySelector('input[data-name="entity"]'); i.value = 'light.does_not_exist'; i.dispatchEvent(new Event('change')); const n = f.querySelector('input[data-name="name"]'); n.value = 'Test'; n.dispatchEvent(new Event('change')); });
await p.waitForTimeout(100);
out = await R(() => window.__out[window.__out.length - 1]);
check('list: add item', out.home.room_panel.lights.length === before + 1 && out.home.room_panel.lights[before].name === 'Test');
const warn = await R(() => window.__ed.shadowRoot.querySelector('.warn').textContent);
check('warning shown for a missing entity', /warning/.test(warn), warn.trim().slice(0, 60));
await p.screenshot({ path: (process.env.OUT || 'dev/out') + '/editor-lists.png', fullPage: true });
await R(() => { const cards = [...window.__ed.shadowRoot.querySelectorAll('.item')].filter((c) => c.dataset.where.startsWith('home.room_panel.lights')); cards[cards.length - 1].querySelector('.up').click(); });
await p.waitForTimeout(100);
out = await R(() => window.__out[window.__out.length - 1]);
check('list: move up', out.home.room_panel.lights[before - 1].name === 'Test');
await R(() => { const cards = [...window.__ed.shadowRoot.querySelectorAll('.item')].filter((c) => c.dataset.where.startsWith('home.room_panel.lights')); cards.find((c) => c.querySelector('.lbl').textContent.includes('Test')).querySelector('.del').click(); });
await p.waitForTimeout(100);
out = await R(() => window.__out[window.__out.length - 1]);
check('list: remove', out.home.room_panel.lights.length === before && !out.home.room_panel.lights.some((l) => l.name === 'Test'));

// 3. wrong domain warning: put a sensor in heating
await R(() => { const cards = [...window.__ed.shadowRoot.querySelectorAll('.item')].filter((c) => c.dataset.where.startsWith('home.room_panel.heating')); cards[0].querySelector('.lbl').click(); });
await p.waitForTimeout(100);
await R(() => { const sr = window.__ed.shadowRoot, f = sr.querySelector('.item[data-where="home.room_panel.heating.0"] ha-form'); const i = f.querySelector('input[data-name="entity"]'); i.value = 'sensor.kitchen_temperature'; i.dispatchEvent(new Event('change')); });
await p.waitForTimeout(100);
const note = await R(() => { const n = window.__ed.shadowRoot.querySelector('.item[data-where="home.room_panel.heating.0"] .notes'); return n ? n.textContent : ''; });
check('wrong-domain note on the item', /wrong type/.test(note), note.slice(0, 80));

// 4. auto-detect on an empty config: nothing applied until Apply
await R(() => { window.__out = []; window.__ed.setConfig({ type: 'custom:oriel-shell' }); });
await p.waitForTimeout(100);
await clickText('.tg', 'Energy'); await p.waitForTimeout(100);
await R(() => [...window.__ed.shadowRoot.querySelectorAll('.sec')].find((s) => s.textContent.includes('Energy')).querySelector('.ad').click());
await p.waitForTimeout(150);
const rows = await R(() => window.__ed.shadowRoot.querySelectorAll('.dlg .row').length);
const emittedBefore = await R(() => window.__out.length);
check('auto-detect lists suggestions without applying them', rows > 0 && emittedBefore === 0, rows + ' suggestions');
await p.screenshot({ path: (process.env.OUT || 'dev/out') + '/editor-detect.png', fullPage: true });
await R(() => window.__ed.shadowRoot.querySelector('.dlg .ok').click());
await p.waitForTimeout(100);
out = await R(() => window.__out[window.__out.length - 1]);
check('auto-detect applies on Apply', !!(out && out.energy && out.energy.solar_power === 'sensor.solar_power'), out && out.energy ? Object.keys(out.energy).join(',') : 'none');

// 5. house example button
await clickText('.tg', 'Home'); await p.waitForTimeout(100);
await clickText('.tabs button', 'House'); await p.waitForTimeout(100);
await clickText('.acts button', 'Start from example'); await p.waitForTimeout(100);
out = await R(() => window.__out[window.__out.length - 1]);
check('house: start from example', !!(out.home && out.home.house && out.home.house.floors.length === 2));
await p.screenshot({ path: (process.env.OUT || 'dev/out') + '/editor-house.png', fullPage: true });

// 6. theme dropdown and accent colour (General section)
await R((cfg) => { window.__out = []; window.__ed.setConfig(cfg); }, input);
await p.waitForTimeout(100);
const openGeneral = () => R(() => { const s = [...window.__ed.shadowRoot.querySelectorAll('.sec')].find((x) => x.textContent.includes('General')); if (!s.querySelector('.body')) s.querySelector('.tg').click(); });
await openGeneral(); await p.waitForTimeout(100);
await R(() => window.__ed.shadowRoot.querySelector('.ddb').click()); await p.waitForTimeout(100);
const nOpts = await R(() => window.__ed.shadowRoot.querySelectorAll('.ddl .opt').length);
check('theme: dropdown lists every theme with a preview', nOpts === 12 && (await R(() => window.__ed.shadowRoot.querySelectorAll('.ddl .opt .sw').length)) === 12, nOpts + ' options');
await p.screenshot({ path: (process.env.OUT || 'dev/out') + '/editor-theme.png', fullPage: true });
await R(() => window.__ed.shadowRoot.querySelector('.ddl .opt[data-id="ember"]').click()); await p.waitForTimeout(100);
out = await R(() => window.__out[window.__out.length - 1]);
check('theme: picking Ember sets general.theme', out.general.theme === 'ember');
await R(() => { window.__ed.shadowRoot.querySelector('.ddb').click(); }); await p.waitForTimeout(50);
await R(() => window.__ed.shadowRoot.querySelector('.ddl .opt[data-id="classic"]').click()); await p.waitForTimeout(100);
out = await R(() => window.__out[window.__out.length - 1]);
check('theme: picking Classic removes the key (it is the default)', !('theme' in out.general));
const typeAccent = (v, ev) => R(({ v, ev }) => { const i = window.__ed.shadowRoot.querySelector('.ain'); i.focus(); i.value = v; i.dispatchEvent(new Event(ev)); }, { v, ev });
await typeAccent('#2457ff', 'input'); await p.waitForTimeout(100);
out = await R(() => window.__out[window.__out.length - 1]);
check('accent: a hex colour applies as you type', out.general.accent === '#2457ff');
await typeAccent('red', 'input'); await typeAccent('red', 'change'); await p.waitForTimeout(100);
out = await R(() => window.__out[window.__out.length - 1]);
const unfold = () => R(() => { const l = window.__ed.shadowRoot.querySelector('.warn .link'); if (l && /show/i.test(l.textContent)) l.click(); });
await unfold(); await p.waitForTimeout(50);
const accWarn = await R(() => ({ box: window.__ed.shadowRoot.querySelector('.warn').textContent, inline: !window.__ed.shadowRoot.querySelector('.abad').hidden }));
check('accent: not a hex colour gives a warning', out.general.accent === 'red' && /not a hex colour/.test(accWarn.box) && accWarn.inline, accWarn.box.trim().slice(0, 60));
await R(() => window.__ed.shadowRoot.querySelector('.acc .reset').click()); await p.waitForTimeout(100);
out = await R(() => window.__out[window.__out.length - 1]);
check('accent: Reset removes it', !('accent' in out.general));
await R((cfg) => { const c = JSON.parse(JSON.stringify(cfg)); c.general.theme = 'sunset'; window.__ed.setConfig(c); }, input); await p.waitForTimeout(100);
await openGeneral(); await p.waitForTimeout(100);
await unfold(); await p.waitForTimeout(50);
const unk = await R(() => ({ box: window.__ed.shadowRoot.querySelector('.warn').textContent, btn: window.__ed.shadowRoot.querySelector('.ddb').textContent }));
check('theme: unknown id warns and the dropdown says so', /no theme called “sunset”/.test(unk.box) && /sunset/.test(unk.btn), unk.box.trim().slice(0, 60));
const swap = await R(() => {
  const c = document.createElement('oriel-shell'); document.body.appendChild(c);
  c.setConfig({ general: { theme: 'ember' } }); const a = c.shadowRoot.getElementById('theme').textContent;
  c.setConfig({ general: { theme: 'classic' } }); const b2 = c.shadowRoot.getElementById('theme').textContent;
  c.setConfig({ general: { theme: 'nope' } }); const n = c.shadowRoot.getElementById('theme').textContent;
  c.remove(); return { ember: a.includes('--oriel-accent:255,97,21'), classic: b2.includes('--oriel-accent:185,220,138'), unknown: n === b2 };
});
check('card: a new config switches theme at once; unknown id shows Classic', swap.ember && swap.classic && swap.unknown, JSON.stringify(swap));

results.forEach((r) => console.log(r.join('  ')));
console.log('errors:', errors.length ? errors : 'none');
await b.close();
process.exit(results.some((r) => r[0] === 'FAIL') || errors.length ? 1 : 0);
