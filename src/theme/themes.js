/* Theme registry and builder. Classic keeps Oriel's original look exactly, variants included. Every other theme
   is built from two seed colours (base and accent) by the rules below, then checked by dev/contrast.mjs. */
import { themeCss, ROLE, VARIANT, CLASSIC_PAGE } from './tokens.js';
import { hex, trip, mix, reach, contrast, WHITE, BLACK, isHex } from './colour.js';

export const DEFAULT_THEME = 'classic';

/* Status hues for dark themes: light enough to read on dark glass. */
const D_GOOD = hex('#8fdc9c'), D_WARN = hex('#f4c860'), D_BAD = hex('#ff9a86'), D_BAD_STRONG = hex('#ff6a58');
const tr = (k) => ROLE[k].split(',').map(Number);

/* Where text usually sits: glass at 20% over the page 30% past its middle stop (matches dev/contrast.mjs). */
const pageRep = (page) => mix(page[1], page[2], 0.3);
const panelOf = (page, glass) => mix(pageRep(page), glass, 0.2);
/* Step ink towards `to` until 62% soft text reads at 4.5:1 on every surface given. */
function softInk(ink, surfaces, to) {
  for (let t = 0; t <= 1; t += 0.02) { const x = mix(ink, to, t); if (surfaces.every((s) => contrast(mix(s, x, 0.62), s) >= 4.6)) return x; }
  return to;
}

/* Text for accent fills: white or a deep accent shade, whichever reads better on every surface given (at alpha a). */
function pickOn(A, surfaces, a = 1) {
  const score = (c) => Math.min(...surfaces.map((s) => contrast(mix(s, c, a), s)));
  let deep = mix(A, BLACK, 0.85);
  for (let t = 0; t <= 1 && score(deep) < 4.6; t += 0.05) deep = mix(mix(A, BLACK, 0.85), BLACK, t);
  return score(WHITE) >= score(deep) ? WHITE : deep;
}
/* Step a colour towards `to` until it reads on every surface given. */
const reachAll = (c, surfaces, ratio, to) => surfaces.reduce((x, s) => reach(x, s, ratio, to), c);

/* The accent family on light glass. A mid-tone accent (violet, raspberry, blue) takes white text, and its fills are
   stepped darker until white reads; a light accent (orange, sage) keeps its fills and takes a deep shade. */
function accentSet(A, panel) {
  const whiteText = contrast(WHITE, A) >= contrast(BLACK, A);
  let fill = A, hi = mix(A, WHITE, 0.2), lo = mix(A, BLACK, 0.08);
  const sc = (c, surfaces, a) => Math.min(...surfaces.map((s) => contrast(mix(s, c, a), s)));
  if (whiteText) {
    hi = A; lo = mix(A, BLACK, 0.12);
    for (let t = 0; t < 0.6 && sc(WHITE, [fill, mix(panel, fill, 0.8)], 0.85) < 4.6; t += 0.04) fill = mix(A, BLACK, t);
    for (let t = 0; t < 0.6 && sc(WHITE, [mix(panel, mix(hi, lo, 0.5), 0.88)], 1) < 4.6; t += 0.04) { hi = mix(A, BLACK, t); lo = mix(A, BLACK, t + 0.12); }
  }
  const btn = mix(panel, mix(hi, lo, 0.5), 0.88);
  const onAccent = whiteText ? WHITE : pickOn(A, [A, btn]), inkOnAccent = whiteText ? WHITE : pickOn(A, [A, mix(panel, A, 0.8)], 0.85);
  return { fill, hi, lo, onAccent, inkOnAccent, strong: reach(A, panel, 3.1, BLACK), ink: reach(A, panel, 4.6, BLACK) };
}

/* Classic with a different accent: only the accent family changes, worked out against Classic's own glass. */
function classicAccent(A) {
  const panel = mix(mix(hex('#a99a8c'), hex('#8a7b6e'), 0.3), WHITE, 0.2);
  const a = accentSet(A, panel);
  return {
    role: { accent: A, 'accent-hi': a.hi, 'accent-lo': a.lo, 'accent-strong': a.strong, 'accent-ink': a.ink, 'on-accent': a.onAccent },
    variant: { 'accent-fill': a.fill, 'ink-on-accent': a.inkOnAccent, 'accent-glow': mix(A, WHITE, 0.45), 'accent-shadow': mix(A, BLACK, 0.5), 'nova-a': mix(A, WHITE, 0.3), 'nova-b': a.lo, 'on-nova': a.onAccent === WHITE ? WHITE : tr('ink'), 'nova-glass': WHITE, 'my-bubble': mix(A, BLACK, 0.7) },
  };
}

function dark(base, accent) {
  const B = hex(base), A = hex(accent);
  const page = [mix(B, WHITE, 0.07), B, mix(B, BLACK, 0.35)];
  const pr = pageRep(page);
  /* The lightest glass (up to 40% white) that keeps near-white text readable on cells, "on" fills and labels. */
  let g = 0.4, glass, panel, cell, ink;
  for (; g >= 0.06; g -= 0.02) {
    glass = mix(B, WHITE, g); panel = panelOf(page, glass); cell = mix(panel, glass, 0.34);
    ink = softInk(mix(WHITE, B, 0.06), [panel, pr, cell], WHITE);
    const ok = [mix(panel, glass, 0.66), mix(pr, glass, 0.78)].every((s) => contrast(ink, s) >= 4.6) && [panel, pr, cell].every((s) => contrast(mix(s, ink, 0.62), s) >= 4.6);
    if (ok) break;
  }
  const darkA = mix(B, BLACK, 0.4), darkB = mix(B, BLACK, 0.62), chipBase = mix(B, BLACK, 0.45);
  const badBg = mix(chipBase, D_BAD_STRONG, 0.26), warnBg = mix(chipBase, D_WARN, 0.24), goodBg = mix(chipBase, D_GOOD, 0.22);
  const good = reachAll(D_GOOD, [cell, goodBg], 4.6, WHITE), warn = reachAll(D_WARN, [cell, warnBg], 4.6, WHITE), bad = reachAll(D_BAD, [cell, badBg], 4.6, WHITE);
  const btn = mix(panel, mix(mix(A, WHITE, 0.15), mix(A, B, 0.22), 0.5), 0.88);
  const onAccent = pickOn(A, [A, btn]), inkOnAccent = pickOn(A, [A, mix(panel, A, 0.8)], 0.85);
  /* if neither white nor a deep shade reads on selected fills, nudge the fill away from the text colour */
  let fill = A;
  const sc = (c, s, a) => Math.min(...s.map((x) => contrast(mix(x, c, a), x)));
  for (let t = 0.04; t < 0.6 && sc(inkOnAccent, [fill, mix(panel, fill, 0.8)], 0.85) < 4.6; t += 0.04) fill = mix(A, inkOnAccent === WHITE ? BLACK : WHITE, t);
  let hi = mix(A, WHITE, 0.15), lo = mix(A, B, 0.22);
  for (let t = 0.04; t < 0.6 && sc(onAccent, [mix(panel, mix(hi, lo, 0.5), 0.88)], 1) < 4.6; t += 0.04) { const to = onAccent === WHITE ? BLACK : WHITE; hi = mix(mix(A, WHITE, 0.15), to, t); lo = mix(mix(A, B, 0.22), to, t); }
  const role = {
    page: `radial-gradient(900px 600px at 46% 46%,rgba(${trip(mix(B, WHITE, 0.16))},.55),transparent 62%),radial-gradient(700px 500px at 90% 100%,rgba(${trip(A)},.07),transparent 70%),linear-gradient(160deg,${page.map((c, i) => `rgb(${trip(c)}) ${[0, 55, 100][i]}%`).join(',')})`,
    frame: mix(B, BLACK, 0.5), glass, ink, raised: mix(B, WHITE, g * 0.5),
    'sheet-a': mix(B, WHITE, g * 0.35), 'sheet-b': mix(B, WHITE, g * 0.15), scrim: mix(B, BLACK, 0.6),
    shadow: mix(B, BLACK, 0.75), 'shadow-deep': BLACK,
    'dark-a': darkA, 'dark-b': darkB, black: mix(B, BLACK, 0.8),
    'on-dark': mix(WHITE, B, 0.03), 'on-dark-text': mix(WHITE, B, 0.08),
    accent: A, 'accent-hi': hi, 'accent-lo': lo, 'accent-strong': reachAll(A, [panel, cell], 3.1, WHITE),
    'accent-ink': reachAll(A, [panel, cell], 4.6, WHITE), 'on-accent': onAccent,
    good, warn, 'warn-bg': warnBg, bad, 'bad-bg': badBg, 'bad-strong': D_BAD_STRONG,
    room: mix(B, WHITE, 0.17), 'house-wall': mix(B, WHITE, 0.3),
  };
  const off = mix(ink, panel, 0.55);
  const variant = {
    'raised-lo': mix(B, WHITE, 0.13),
    'room-2': mix(B, WHITE, 0.15), 'room-3': mix(B, WHITE, 0.13), 'room-4': mix(B, WHITE, 0.11), 'room-5': mix(B, WHITE, 0.16), 'room-6': mix(B, WHITE, 0.14),
    slab: mix(B, WHITE, 0.1), 'house-side': mix(B, WHITE, 0.07), 'floor-side': mix(B, WHITE, 0.08),
    'house-line': mix(B, WHITE, 0.32), 'house-pole': mix(B, WHITE, 0.42), 'house-shadow': BLACK, 'house-label': mix(ink, B, 0.3),
    'kit-top': mix(B, WHITE, 0.3), 'kit-top-2': mix(B, WHITE, 0.32), 'kit-top-3': mix(B, WHITE, 0.29),
    'kit-left': mix(B, WHITE, 0.2), 'kit-left-2': mix(B, WHITE, 0.19), 'kit-left-3': mix(B, WHITE, 0.21),
    'kit-side': mix(B, WHITE, 0.13), 'kit-right': mix(B, WHITE, 0.14), 'kit-shade': mix(B, WHITE, 0.12),
    'ink-fill': darkB, tag: darkB, pill: mix(B, WHITE, g * 0.6), off, 'off-2': off,
    'shadow-glass': BLACK, 'shadow-dark': BLACK, 'shadow-black': BLACK, 'accent-shadow': BLACK,
    'bad-ink': bad, 'bad-line': mix(role['bad-bg'], bad, 0.35), 'bad-line-2': mix(role['bad-bg'], bad, 0.35), 'bad-glow': D_BAD_STRONG,
    'bad-mark': D_BAD_STRONG, 'bad-dot': D_BAD_STRONG, 'bad-bg-2': role['bad-bg'], 'bad-ink-2': bad, 'bad-on-dark': bad,
    'warn-line': mix(role['warn-bg'], warn, 0.35), 'warn-mark': D_WARN, 'warn-bg-2': role['warn-bg'], 'warn-ink': warn,
    'good-2': good, 'good-mark': D_GOOD, 'good-bar': D_GOOD, 'good-bg': goodBg, 'good-ink': good,
    'accent-glow': mix(A, WHITE, 0.3), 'ink-on-accent': inkOnAccent, 'accent-fill': fill, 'my-bubble': mix(A, BLACK, 0.72),
    /* Nova panel: a deep accent-tinted glass, not a slab of neon. */
    'nova-a': mix(B, A, 0.2), 'nova-b': mix(B, A, 0.08), 'on-nova': ink, 'nova-glass': mix(B, WHITE, g * 0.75),
    'nav-fill': mix(B, BLACK, 0.5), /* the phone tab bar is a deep tint of the base: light ink reads on it over any card */
    chip: fill, 'chip-ink': inkOnAccent, /* the rail chip is the accent fill with its own text colour: a dark chip on the dark rail was only about 2:1 */
  };
  return { role, variant };
}

/* depth (optional, default 1) shades the page more deeply, so white lines on cards and the house stand out more.
   Raise it only as far as the contrast check still passes. */
function light(base, accent, depth = 1) {
  const B = hex(base), A = hex(accent);
  const deep = mix(B, BLACK, 0.72); /* a dark of the base hue, used to shade the page, house and shadows */
  const page = [mix(B, deep, 0.09 * depth), mix(B, deep, 0.21 * depth), mix(B, deep, 0.34 * depth)];
  const glass = WHITE;
  const panel = panelOf(page, glass);
  const ink = softInk(mix(A, BLACK, 0.82), [panel, pageRep(page)], BLACK);
  /* Classic's status hues, stepped darker where they would read under target on this glass. */
  const good = reach(tr('good'), panel, 4.6, BLACK), warn = reach(tr('warn'), panel, 4.6, BLACK), bad = reach(tr('bad'), panel, 4.6, BLACK);
  const { fill, hi, lo, onAccent, inkOnAccent } = accentSet(A, panel);
  const role = {
    page: `radial-gradient(900px 600px at 46% 46%,rgba(${trip(B)},.55),transparent 62%),radial-gradient(700px 500px at 90% 100%,rgba(${trip(mix(B, deep, 0.5))},.65),transparent 70%),linear-gradient(160deg,${page.map((c, i) => `rgb(${trip(c)}) ${[0, 55, 100][i]}%`).join(',')})`,
    frame: mix(deep, BLACK, 0.4), glass, ink, raised: WHITE,
    'sheet-a': mix(WHITE, B, 0.6), 'sheet-b': mix(B, deep, 0.1), scrim: mix(deep, BLACK, 0.5),
    shadow: mix(deep, BLACK, 0.3), 'shadow-deep': BLACK,
    'dark-a': mix(A, BLACK, 0.8), 'dark-b': mix(A, BLACK, 0.9), black: mix(A, BLACK, 0.95),
    'on-dark': WHITE, 'on-dark-text': mix(WHITE, B, 0.5),
    accent: A, 'accent-hi': hi, 'accent-lo': lo,
    'accent-strong': reach(A, panel, 3.1, BLACK), 'accent-ink': reach(A, panel, 4.6, BLACK), 'on-accent': onAccent,
    good, warn, bad, room: mix(B, deep, 0.05), 'house-wall': mix(WHITE, B, 0.4),
  };
  /* Other status colours keep Classic's values: they were made for light glass and sit on their own fills. */
  const variant = {
    'raised-lo': mix(B, deep, 0.1),
    'room-2': mix(B, deep, 0.08), 'room-3': mix(B, deep, 0.11), 'room-4': mix(B, deep, 0.14), 'room-5': mix(B, deep, 0.06), 'room-6': mix(B, deep, 0.09),
    slab: mix(B, deep, 0.09), 'house-side': mix(B, deep, 0.2), 'floor-side': mix(B, deep, 0.16),
    'kit-top': mix(WHITE, B, 0.5), 'kit-top-2': mix(WHITE, B, 0.3), 'kit-top-3': mix(WHITE, B, 0.6),
    'kit-left': mix(B, deep, 0.12), 'kit-left-2': mix(B, deep, 0.15), 'kit-left-3': mix(B, deep, 0.1),
    'kit-side': mix(B, deep, 0.22), 'kit-right': mix(B, deep, 0.2), 'kit-shade': mix(B, deep, 0.25),
    'house-line': mix(B, deep, 0.45), 'house-pole': mix(B, deep, 0.6), 'house-shadow': deep, 'house-label': mix(ink, B, 0.25),
    'ink-fill': ink, tag: mix(A, BLACK, 0.88), pill: mix(A, BLACK, 0.65),
    'shadow-glass': mix(deep, BLACK, 0.3), 'shadow-dark': mix(deep, BLACK, 0.6), 'shadow-black': mix(deep, BLACK, 0.8),
    'accent-shadow': mix(A, BLACK, 0.5), 'accent-glow': mix(A, WHITE, 0.45), 'ink-on-accent': inkOnAccent, 'my-bubble': mix(A, BLACK, 0.7), 'accent-fill': fill,
    'nova-a': mix(A, WHITE, 0.55), 'nova-b': mix(A, WHITE, 0.3), 'on-nova': ink, 'nova-glass': WHITE,
    'good-2': good, 'good-mark': reach(tr('accent-strong'), panel, 3.1, BLACK), 'good-ink': VARIANT['good-ink'][0].split(',').map(Number),
  };
  return { role, variant, statusFromClassic: true };
}

export const THEMES = {
  classic: { name: 'Classic', classic: true },
  'midnight-signal': { name: 'Midnight Signal', style: 'dark', base: '#0B132B', accent: '#39FF88' },
  'plum-dusk': { name: 'Plum Dusk', style: 'dark', base: '#1A0B2E', accent: '#FFB7A5' },
  'cocoa-bark': { name: 'Cocoa Bark', style: 'dark', base: '#382A28', accent: '#C1A094' },
  'forest-mint': { name: 'Forest Mint', style: 'dark', base: '#18251D', accent: '#B7FF72' },
  'deep-teal': { name: 'Deep Teal', style: 'dark', base: '#03313A', accent: '#8FFFE0' },
  'slate-harbour': { name: 'Slate Harbour', style: 'dark', base: '#11212D', accent: '#9BA8AB' },
  'violet-mist': { name: 'Violet Mist', style: 'light', base: '#F0F2F5', accent: '#7A35FF' },
  'berry-sky': { name: 'Berry Sky', style: 'light', base: '#E0F2FE', accent: '#C2185B' },
  'quantum-ice': { name: 'Quantum Ice', style: 'light', base: '#DFF7FF', accent: '#2457FF' },
  'pine-mist': { name: 'Pine Mist', style: 'light', base: '#DAF1DE', accent: '#235347', depth: 1.3 },
  ember: { name: 'Ember', style: 'light', base: '#FFFCF4', accent: '#FF6115' },
};

const STATUS_VARIANTS = ['bad-ink', 'bad-line', 'bad-line-2', 'bad-glow', 'bad-mark', 'bad-dot', 'bad-bg-2', 'bad-ink-2', 'bad-on-dark', 'warn-line', 'warn-mark', 'warn-bg-2', 'warn-ink', 'good-2', 'good-mark', 'good-bar', 'good-bg', 'good-ink', 'off', 'off-2'];
const STATUS_ROLES = ['warn-bg', 'bad-bg', 'bad-strong'];

/* Classic, made readable (0.2.8): the smallest darkening that takes each failing pair to 4.5:1 for text and 3:1
   for icons on Classic's mid-tone glass, and stronger soft text. Kept out of ROLE and VARIANT because the other
   light themes borrow their status colours from those. */
const CLASSIC_READABLE = {
  role: { 'accent-ink': '41,69,18', good: '41,69,18', warn: '84,57,0', bad: '108,41,20', 'accent-strong': '72,94,43', 'bad-strong': '159,47,36' },
  variant: { 'good-mark': '72,94,43' },
  extra: { soft: '.78', 'soft-page': '.86', 'soft-on-accent': '.7' },
};


/* Navigation glass (0.6.0). The phone tab bar is a translucent tint over whatever card sits under it, so its opacity is worked out per
   theme: the least tint at which the inactive labels read (4.6:1, soft ink) over the lightest and darkest surfaces the theme has under it.
   dev/contrast.mjs re-checks the result over every surface it knows. nav-tint is how much accent the bubble's far corner carries
   (0.6 in the approved mockup), lowered where the active label would not read on it. */
const NAV_A_FROM = 0.26, NAV_A_MAX = 0.96, NAV_TINT = 0.6, NAV_SOFT = 0.66;
const r2 = (x) => Math.round(x * 100) / 100;
function navLevels(out) {
  const P = (v) => v.split(',').map(Number);
  const get = (k) => {
    if (out.role[k] !== undefined) return P(out.role[k]);
    let x = k;
    while (x in VARIANT) { if (out.variant[x] !== undefined) return P(out.variant[x]); if (out.classic) return P(VARIANT[x][0]); x = VARIANT[x][1]; }
    return P(out.role[x] !== undefined ? out.role[x] : ROLE[x]);
  };
  const stops = [...(out.role.page || CLASSIC_PAGE).matchAll(/(?:rgb\((\d+,\d+,\d+)\)|(#[0-9a-f]{6}))\s+\d+%/gi)].map((m) => (m[1] ? P(m[1]) : hex(m[2])));
  const page = stops[2] ? mix(stops[1], stops[2], 0.3) : stops[0], glass = get('glass'), ink = get('ink');
  const g20 = mix(page, glass, 0.2), cell = mix(g20, glass, 0.34);
  const backs = [page, g20, cell, mix(g20, glass, 0.66), get('raised'), get('black'), mix(page, mix(get('dark-a'), get('dark-b'), 0.5), 0.87), get('accent-fill'), mix(g20, mix(get('accent-hi'), get('accent-lo'), 0.5), 0.88)];
  const soft = Math.max(NAV_SOFT, out.extra && out.extra.soft ? +out.extra.soft : 0);
  const fill = get('nav-fill'), bubble = get('bubble'), accent = get('accent');
  let a = NAV_A_FROM;
  while (a < NAV_A_MAX && !backs.every((b) => { const bar = mix(b, fill, a); return contrast(mix(bar, ink, soft), bar) >= 4.6; })) a = r2(a + 0.02);
  let tint = NAV_TINT;
  const reads = (t) => backs.every((b) => { const bar = mix(b, fill, a); return [mix(bar, bubble, 0.88), mix(bar, bubble, 0.46), mix(bar, accent, t)].every((s) => contrast(ink, s) >= 4.6); });
  while (tint > 0 && !reads(tint)) tint = r2(tint - 0.05);
  return { 'nav-a': String(a), 'nav-tint': String(Math.max(0, tint)), 'nav-soft': String(soft) };
}

/* Full token values for a theme id, as triplet strings ({ role, variant }). An accent override rebuilds the accent
   family (fills, toggles, accent text, text on accent) from the new colour, so it stays readable. */
export function themeTokens(id, accent) {
  const t = THEMES[id] || THEMES[DEFAULT_THEME];
  let out;
  const fmt = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? trip(v) : v]));
  if (t.classic) {
    out = { role: Object.assign({}, CLASSIC_READABLE.role), variant: Object.assign({}, CLASSIC_READABLE.variant), extra: Object.assign({}, CLASSIC_READABLE.extra), classic: true };
    if (isHex(accent)) { const c = classicAccent(hex(accent)); Object.assign(out.role, fmt(c.role)); Object.assign(out.variant, fmt(c.variant)); }
  } else {
    const b = (t.style === 'dark' ? dark : light)(t.base, isHex(accent) ? accent : t.accent, t.depth);
    out = { role: fmt(b.role), variant: fmt(b.variant), extra: { 'soft-on-accent': '.85' } };
    if (b.statusFromClassic) {
      STATUS_ROLES.forEach((k) => { out.role[k] = ROLE[k]; });
      STATUS_VARIANTS.forEach((k) => { if (!(k in out.variant)) out.variant[k] = VARIANT[k][0]; });
    }
  }
  Object.assign(out.extra, navLevels(out));
  return out;
}

export const themeStyle = (id, accent) => themeCss(themeTokens(id, accent));
export const isDarkTheme = (id) => (THEMES[id] || THEMES[DEFAULT_THEME]).style === 'dark';
export const isClassicTheme = (id) => !!(THEMES[id] || THEMES[DEFAULT_THEME]).classic;
