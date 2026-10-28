/* Contrast report for every theme. Surfaces are flattened the way they render (glass over page, text at 62%
   over its surface, ...). The glass and page figures were checked against pixels sampled from the harness
   screenshots (Classic, Midnight Signal, Ember: within a few levels).
   Usage: node dev/contrast.mjs [theme ...]   (ACCENT=#rrggbb tests general.accent)   Writes dev/out/contrast.md and prints any pair under target.
   Exits 1 if a pair fails. */
import fs from 'node:fs';
import { THEMES, themeTokens } from '../src/theme/themes.js';
import { ROLE, VARIANT, CLASSIC_PAGE } from '../src/theme/tokens.js';
import { hex, mix, contrast } from '../src/theme/colour.js';
import { STATE, STATE_ON_DARK, STATE_ON_CLASSIC, BIN, LINE, IDLE } from '../src/theme/fixed.js';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(THEMES);
const P = (s) => s.split(',').map(Number);
const over = (bg, fg, a) => mix(bg, fg, a);

function values(id) {
  const t = themeTokens(id, process.env.ACCENT);
  const v = {};
  for (const k in ROLE) if (k !== 'page') v[k] = P(t.role[k] || ROLE[k]);
  for (const k in VARIANT) {
    if (t.classic) { v[k] = P((t.variant && t.variant[k]) || VARIANT[k][0]); continue; }
    let x = k; while (!(t.variant && t.variant[x]) && VARIANT[x]) x = VARIANT[x][1];
    v[k] = t.variant && t.variant[x] ? P(t.variant[x]) : v[x];
  }
  /* the page under most panels: 30% of the way from the middle stop to the last (calibrated against screenshots) */
  const page = t.role.page || CLASSIC_PAGE;
  const stops = [...page.matchAll(/(?:rgb\((\d+,\d+,\d+)\)|(#[0-9a-f]{6}))\s+\d+%/gi)].map((m) => (m[1] ? P(m[1]) : hex(m[2])));
  v.pageMid = stops[2] ? mix(stops[1], stops[2], 0.3) : stops[0];
  v.softA = t.extra && t.extra['soft-on-accent'] ? +t.extra['soft-on-accent'] : 0.62;
  v.soft = t.extra && t.extra.soft ? +t.extra.soft : 0.62; v.softPage = t.extra && t.extra['soft-page'] ? +t.extra['soft-page'] : v.soft;
  v.navA = +t.extra['nav-a']; v.navTint = +t.extra['nav-tint']; v.navSoft = +t.extra['nav-soft']; /* the phone bar's opacity, the bubble's accent tint, the inactive label alpha */
  return { v, dark: THEMES[id].style === 'dark', classic: !!t.classic };
}

function surfaces(v) {
  const s = {};
  s.page = v.pageMid;
  s.glass = over(s.page, v.glass, 0.2); /* the glass gradient (.42 to .14) where text usually sits */
  s['glass mid'] = over(s.page, v.glass, 0.14);
  s.cell = over(s.glass, v.glass, 0.34);
  s['on fill'] = over(s.glass, v.glass, 0.66);
  s.raised = v.raised;
  s.sheet = over(over(s.page, v.scrim, 0.5), mix(v['sheet-a'], v['sheet-b'], 0.5), 0.97);
  s['dark panel'] = over(s.page, mix(v['dark-a'], v['dark-b'], 0.5), 0.87);
  s.black = v.black;
  s['ink fill'] = v['ink-fill'];
  s['chip on'] = v['accent-fill'];
  s['chip ok'] = over(s.glass, v['ok-fill'], 0.55);
  s['selected room'] = over(s.glass, v['accent-fill'], 0.8);
  s['accent button'] = over(s.glass, mix(v['accent-hi'], v['accent-lo'], 0.5), 0.88);
  s['nova panel'] = over(s.page, mix(v['nova-a'], v['nova-b'], 0.5), 0.64);
  s['nova bubble'] = over(s['nova panel'], v['nova-glass'], 0.55);
  s['my bubble'] = over(s['nova panel'], v['my-bubble'], 0.85);
  s['bad chip'] = v['bad-bg']; s['warn chip'] = v['warn-bg']; s['good pill'] = v['good-bg'];
  s['red pill'] = v['bad-bg-2']; s['amber pill'] = v['warn-bg-2'];
  s['dark chip'] = over(s['dark panel'], v['on-dark'], 0.1);
  for (const k in BIN) s['bin ' + k] = hex(BIN[k]);
  s.idle = hex(IDLE.bgA); s['idle chip'] = over(s.idle, [255, 255, 255], 0.07); /* the idle clock: dark in every theme; the lightest part of its background is the worst case */
  s['tab bar'] = over(s.page, mix(v['sheet-a'], v['sheet-b'], 0.5), 0.96); /* the phone tab bar: the sheet panel colours at .96 over the page */
  s['sheet tile'] = over(s.sheet, v.glass, 0.55); /* a tile in the phone More sheet */
  s['room label'] = over(s.page, v.glass, 0.78);
  s['power tag'] = over(s.page, v.tag, 0.9);
  /* the tablet rail (0.6.0): its fill at .86 over the page, and the chip that slides to the active item */
  s.rail = over(s.page, v.rail, 0.86); s.chip = v.chip;
  /* the phone bar (0.6.0) is glass over whatever card is under it: every surface above is a possible backdrop. The bubble's three gradient stops sit on the bar. */
  Object.keys(s).filter((k) => !k.startsWith('idle') && !k.startsWith('bar over') && k !== 'rail' && k !== 'chip').forEach((k) => {
    const bar = over(s[k], v['nav-fill'], v.navA);
    s['bar over ' + k] = bar;
    s['bubble top over ' + k] = over(bar, v.bubble, 0.88); s['bubble mid over ' + k] = over(bar, v.bubble, 0.46); s['bubble tint over ' + k] = over(bar, v.accent, v.navTint);
  });
  return s;
}

/* [label, text colour, alpha, surface, target] */
function pairs(v, dark, classic, S) {
  const st = (t) => hex(dark ? STATE_ON_DARK[t] || t : classic ? STATE_ON_CLASSIC[t] || t : t);
  const L = [];
  const add = (label, fg, a, surf, target) => L.push([label, fg, a, surf, target]);
  for (const s of ['page', 'glass', 'glass mid', 'cell', 'on fill', 'raised', 'sheet', 'room label']) add('text', v.ink, 1, s, 4.5);
  for (const s of ['page', 'glass', 'glass mid', 'cell', 'sheet']) { const a = s === 'page' ? v.softPage : v.soft; add(`soft text (${Math.round(a * 100)}%)`, v.ink, a, s, 4.5); }
  for (const s of ['glass', 'cell']) { add('accent text', v['accent-ink'], 1, s, 4.5); add('good', v.good, 1, s, 4.5); add('warn', v.warn, 1, s, 4.5); add('bad', v.bad, 1, s, 4.5); }
  add('alert text', v['bad-ink'], 1, 'bad chip', 4.5); add('bad', v.bad, 1, 'bad chip', 4.5); add('warn', v.warn, 1, 'warn chip', 4.5);
  add('good pill text', v['good-ink'], 1, 'good pill', 4.5); add('red pill text', v['bad-ink-2'], 1, 'red pill', 4.5); add('amber pill text', v['warn-ink'], 1, 'amber pill', 4.5);
  add('text', v['on-dark-text'], 1, 'dark panel', 4.5); add('soft text (60%)', v['on-dark'], 0.6, 'dark panel', 4.5);
  add('text', v['on-dark'], 1, 'black', 4.5); add('soft text (60%)', v['on-dark'], 0.6, 'black', 4.5);
  add('text', v['on-dark'], 1, 'ink fill', 4.5); add('text', v['on-dark'], 1, 'dark chip', 4.5); add('low value', v['bad-on-dark'], 1, 'dark panel', 4.5);
  for (const s of ['chip on', 'selected room']) add('text', v['ink-on-accent'], 1, s, 4.5);
  add('text', v.ink, 1, 'chip ok', 4.5);
  add(`soft text (${Math.round(v.softA * 100)}%)`, v['ink-on-accent'], v.softA, 'selected room', 4.5);
  add('text', v['on-accent'], 1, 'accent button', 4.5);
  add('text', v['on-nova'], 1, 'nova panel', 4.5); add('text', v['on-nova'], 1, 'nova bubble', 4.5); add('placeholder (70%)', v['on-nova'], 0.7, 'nova bubble', 4.5);
  add('text', v['on-dark'], 1, 'my bubble', 4.5);
  add('label (72%)', v['on-dark'], 0.72, 'power tag', 4.5); add('value', v['on-dark'], 1, 'power tag', 4.5);
  for (const k in STATE) add(`state "${k}" (large)`, st(STATE[k][1]), 1, 'glass mid', 3);
  /* Climate and Family: the add boxes, the ticked circle, the bin 'tomorrow' chip, chart lines on glass */
  add('placeholder (75%)', v.ink, 0.75, 'raised', 4.5); /* the ticked circle is ink-on-accent on accent-fill: the 'chip on' pair */
  add('bin chip text', v.warn, 1, 'warn chip', 4.5); add('chart line: ink', v.ink, 0.85, 'glass', 3); add('chart line: bad-strong', v['bad-strong'], 1, 'glass', 3); add('hour bars (ink 62%)', v.ink, 0.62, 'glass', 3);
  for (const k in BIN) { add(`bin tile text (${k})`, v['on-dark'], 1, 'bin ' + k, 4.5); } add('chart line: accent-ink', v['accent-ink'], 1, 'glass', 3);
  LINE[dark ? 'dark' : classic ? 'classic' : 'light'].forEach((c, i) => add(`graph line ${i + 1} (fixed ${c})`, hex(c), 1, 'glass', 3));
  add('idle clock: time (large)', hex(IDLE.time), 1, 'idle', 3); add('idle clock: date (large)', hex(IDLE.date), 1, 'idle', 3); add('idle clock: hint (12 px)', hex(IDLE.hint), 1, 'idle', 4.5); add('idle clock: chip text', hex(IDLE.chipText), 1, 'idle chip', 4.5);
  IDLE.bars.forEach((c, i) => add(`idle clock: calendar bar ${i + 1}`, hex(c), 1, 'idle chip', 3));
  add('phone tab label (soft)', v.ink, v.soft, 'tab bar', 4.5); add('phone tab label (selected)', v.ink, 1, 'raised', 4.5); add('phone More tile text', v.ink, 1, 'sheet tile', 4.5);
  add('greeting (large)', v.ink, 1, 'page', 3);
  /* navigation: the rail, and the phone bar's labels over every possible card (inactive labels at the theme's soft value, the active one in full ink on the bubble) */
  add('rail label (74%)', v['rail-ink'], 0.74, 'rail', 4.5); add('rail label, active', v['chip-ink'], 1, 'chip', 4.5);
  Object.keys(S).filter((k) => k.startsWith('bar over ')).forEach((k) => {
    const b = k.slice(9);
    add(`phone tab label, inactive (${Math.round(v.navSoft * 100)}%) over ${b}`, v.ink, v.navSoft, k, 4.5);
    for (const part of ['top', 'mid', 'tint']) add(`phone tab label, active, on the bubble (${part}) over ${b}`, v.ink, 1, `bubble ${part} over ${b}`, 4.5);
  });
  /* Energy on the phone: an amount that shows as zero is drawn in the soft colour (flow nodes, Today tiles, heat pump, house use) */
  add('Energy zero amount (soft, large: 24 px)', v.ink, v.soft, 'on fill', 3); add('Energy zero amount (soft)', v.ink, v.soft, 'cell', 4.5);
  add('Energy zero amount (60%)', v['on-dark'], 0.6, 'dark panel', 4.5); add('Energy zero amount (60%)', v['on-dark'], 0.6, 'black', 4.5);
  add('icon: accent-strong', v['accent-strong'], 1, 'glass', 3); add('icon: bad-strong', v['bad-strong'], 1, 'glass', 3); add('icon: good-mark', v['good-mark'], 1, 'glass', 3);
  return L;
}

let md = '# Oriel contrast report\n\nTargets: 4.5:1 body text, 3:1 large text and icons. Surfaces flattened as rendered.\n';
let fails = 0;
for (const id of ids) {
  const { v, dark, classic } = values(id), s = surfaces(v);
  const rows = pairs(v, dark, classic, s).map(([label, fg, a, surf, target]) => {
    const r = contrast(over(s[surf], fg, a), s[surf]);
    return { label, surf, r, target, ok: r >= target };
  });
  const bad = rows.filter((x) => !x.ok);
  fails += bad.length;
  const min = rows.reduce((m, x) => Math.min(m, x.r / x.target), 9);
  md += `\n## ${THEMES[id].name} (${id})\n\n${rows.length} pairs, ${bad.length} under target.\n\n| Text | On | Ratio | Target | |\n|---|---|---|---|---|\n` +
    rows.map((x) => `| ${x.label} | ${x.surf} | ${x.r.toFixed(2)} | ${x.target} | ${x.ok ? 'ok' : '**FAIL**'} |`).join('\n') + '\n';
  console.log(`${THEMES[id].name.padEnd(18)} ${rows.length} pairs, ${bad.length} under target`);
  bad.forEach((x) => console.log(`   FAIL ${x.label} on ${x.surf}: ${x.r.toFixed(2)} (needs ${x.target})`));
}
fs.mkdirSync('dev/out', { recursive: true });
fs.writeFileSync('dev/out/contrast.md', md);
process.exit(fails ? 1 : 0);
