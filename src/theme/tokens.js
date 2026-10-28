/* Colour tokens. Every themable colour in Oriel is one of these CSS custom properties on the card root.
   Colours are stored as comma-separated RGB triplets so any opacity can be applied where used:
   rgb(var(--oriel-ink)) is solid, rgba(var(--oriel-ink),.62) is 62%. (The legacy comma form keeps gradients
   rendering exactly as before; Chrome interpolates the space-separated form differently.)
   ROLE tokens are what a theme sets. VARIANT tokens exist so the Classic theme keeps its exact look; other
   themes fill each variant from the role named in `from` unless the theme sets it itself. */

export const ROLE = {
  page: null, /* the whole page background (a CSS background value, not a triplet); see classicPage() */
  frame: '42,36,32', /* letterbox around the 1280×800 canvas */
  glass: '255,255,255', /* glass fills, borders, highlights and "on" fills, at any opacity */
  ink: '31,26,23', /* text (solid), soft text (.62), lines and tracks (.07–.35) */
  raised: '255,255,255', /* solid round buttons, inputs, the active rail item */
  'sheet-a': '248,243,236', /* pop-up sheet gradient start */
  'sheet-b': '226,217,206', /* pop-up sheet gradient end */
  scrim: '26,21,18', /* dimmed backdrop behind pop-ups */
  shadow: '60,40,28', /* warm drop shadows */
  'shadow-deep': '0,0,0', /* dialog and pop-up shadows */
  'dark-a': '44,37,33', /* dark panel gradient start */
  'dark-b': '26,21,19', /* dark panel gradient end */
  black: '12,11,10', /* black panels: energy chart, doorbell, camera */
  'on-dark': '255,255,255', /* text, icons and fills on dark panels and strong fills, at any opacity */
  'on-dark-text': '247,242,235', /* warm-white body text on dark panels */
  accent: '185,220,138', /* accent fills, "on" chips, battery bar, selected rooms */
  'accent-hi': '196,229,148', /* top of the accent button gradient */
  'accent-lo': '150,188,98', /* bottom of the accent button gradient */
  'accent-strong': '125,162,74', /* toggles on, ticks, "on" dots */
  'accent-ink': '63,106,28', /* accent-coloured text, links and focus ring on glass */
  'on-accent': '28,42,15', /* text on accent fills; your own chat bubble */
  good: '63,106,28', /* "good" values on glass */
  warn: '122,82,0', /* warning text */
  'warn-bg': '255,233,184', /* warning chip fill */
  bad: '154,58,29', /* bad or alert text on glass */
  'bad-bg': '255,217,207', /* alert chip, tile and hero fill */
  'bad-strong': '192,57,43', /* alert rings, open-sensor dots */
  room: '241,234,223', /* house room tint */
  'house-wall': '255,250,242', /* house wall gradient */
};

export const VARIANT = {
  'raised-lo': ['228,220,210', 'raised'], /* bottom of the raised button gradient */
  'room-2': ['236,227,216', 'room'],
  'room-3': ['228,217,204', 'room'],
  'room-4': ['221,208,194', 'room'],
  'room-5': ['239,231,220', 'room'],
  'room-6': ['233,223,210', 'room-2'],
  slab: ['232,223,211', 'room-2'], /* slab front faces */
  'house-side': ['207,195,181', 'room'], /* slab sides, energy-kit right faces */
  'floor-side': ['217,205,191', 'house-side'], /* upper floor sides */
  'house-line': ['120,100,82', 'ink'], /* floor board lines */
  'house-pole': ['107,93,81', 'ink'], /* grid pole */
  'house-shadow': ['74,58,46', 'shadow'], /* shadow under the house */
  'house-label': ['74,63,55', 'ink'], /* secondary text in room labels */
  'accent-glow': ['212,239,166', 'accent-hi'], /* centre of the "someone here" room glow */
  'kit-top': ['244,241,236', 'raised'], /* energy-kit cube tops */
  'kit-top-2': ['251,250,247', 'kit-top'], /* battery cabinet top */
  'kit-top-3': ['241,237,230', 'kit-top'], /* home box top */
  'kit-left': ['220,213,203', 'raised-lo'], /* energy-kit cube left faces */
  'kit-left-3': ['227,221,211', 'kit-left'], /* battery cabinet left face */
  'kit-left-2': ['212,204,192', 'kit-left'], /* home box left face */
  'kit-side': ['201,192,180', 'house-side'], /* inverter right face */
  'kit-right': ['207,199,187', 'house-side'], /* battery cabinet right face */
  'kit-shade': ['191,181,168', 'house-side'], /* home-box right face */
  'nova-a': ['196,229,148', 'accent-hi'], /* Nova chat panel gradient start */
  'nova-b': ['150,188,98', 'accent-lo'], /* Nova chat panel gradient end */
  'on-nova': ['28,42,15', 'on-accent'], /* text on the Nova panel */
  'my-bubble': ['28,42,15', 'on-accent'], /* your own chat messages */
  'nova-glass': ['255,255,255', 'glass'], /* bubbles and inputs on the Nova panel */
  'accent-fill': ['185,220,138', 'accent'], /* selected and "on" fills that carry text */
  'ink-on-accent': ['31,26,23', 'on-accent'], /* plain text on accent fills (Classic: same as ink) */
  'ink-fill': ['31,26,23', 'dark-b'], /* solid dark buttons and toasts on glass (Boost, Clear, OK) */
  tag: ['31,26,23', 'dark-b'], /* dark power tags on the house drawing */
  pill: ['91,77,67', 'dark-a'], /* people initials in the header */
  off: ['154,144,136', 'ink'], /* "off" dots and LEDs */
  'off-2': ['184,175,164', 'off'], /* room label dot when nobody is there */
  'shadow-glass': ['52,36,24', 'shadow'], /* shadow under glass panels */
  'shadow-dark': ['20,12,8', 'shadow-deep'], /* shadow under dark panels */
  'shadow-black': ['10,6,4', 'shadow-dark'], /* shadow under black panels */
  'accent-shadow': ['60,80,30', 'accent-lo'], /* shadow under the Nova panel on Home */
  'bad-ink': ['138,42,18', 'bad'], /* alert text on alert fills */
  'bad-line': ['243,165,143', 'bad-bg'], /* alert borders */
  'bad-line-2': ['242,181,163', 'bad-line'],
  'bad-glow': ['255,80,60', 'bad-strong'],
  'bad-mark': ['200,87,58', 'bad-strong'], /* bad dots and high bars */
  'bad-dot': ['168,69,42', 'bad-strong'], /* Nova pill lockdown dot */
  'bad-bg-2': ['240,196,184', 'bad-bg'], /* System red pill */
  'bad-ink-2': ['106,31,15', 'bad'],
  'bad-on-dark': ['255,176,143', 'bad-bg'], /* low values on a dark panel */
  'warn-line': ['240,207,133', 'warn-bg'],
  'warn-mark': ['217,164,65', 'warn'], /* amber dots and medium bars */
  'warn-bg-2': ['243,220,166', 'warn-bg'], /* System amber pill */
  'warn-ink': ['90,61,6', 'warn'],
  'good-2': ['74,107,36', 'good'], /* "someone here" on Security */
  'good-mark': ['125,162,74', 'good'], /* green status dots */
  'good-bar': ['143,181,90', 'good-mark'], /* normal-level bars */
  'ok-fill': ['185,220,138', 'good-bg'], /* "all OK" chips (Classic: the sage accent) */
  'good-bg': ['220,235,196', 'accent'], /* System green pill */
  'good-ink': ['47,74,20', 'good'],
  /* Navigation (0.6.0). Classic holds the approved mockup values; the others derive from the roles named here. */
  'nav-fill': ['255,255,255', 'glass'], /* phone tab bar glass tint (its opacity is the extra nav-a, set per theme so labels read over any card) */
  'nav-line': ['255,255,255', 'glass'], /* phone tab bar border and top highlight */
  'nav-shadow': ['60,40,28', 'shadow'], /* shadow under the phone tab bar and its bubble */
  bubble: ['255,255,255', 'raised'], /* the bubble that slides to the active phone tab */
  rail: ['31,26,23', 'dark-b'], /* tablet rail fill */
  'rail-line': ['255,255,255', 'on-dark'], /* tablet rail border */
  'rail-ink': ['247,242,235', 'on-dark-text'], /* inactive rail labels and icons (at .74) */
  'rail-shadow': ['26,21,19', 'shadow-dark'], /* shadow under the rail */
  chip: ['255,255,255', 'raised'], /* the chip that slides to the active rail item */
  'chip-ink': ['31,26,23', 'ink'], /* the active rail label and icon, on the chip */
  'chip-shadow': ['26,21,19', 'shadow-dark'], /* shadow under the chip */
};

/* The Classic page background, written with the tokens it is not made of (it is one fixed picture). */
export const CLASSIC_PAGE = 'radial-gradient(900px 600px at 46% 46%,rgba(255,248,238,.55),transparent 62%),radial-gradient(700px 500px at 90% 100%,rgba(122,108,97,.65),transparent 70%),linear-gradient(160deg,#cbbdae 0%,#a99a8c 55%,#8a7b6e 100%)';

/* CSS for one theme: a full set of role values (missing ones fall back to Classic) and optional variant values. */
export function themeCss(t = {}) {
  const role = Object.assign({}, ROLE, { page: CLASSIC_PAGE }, t.role || {});
  const out = [];
  for (const k in role) out.push(`--oriel-${k}:${role[k]}`);
  for (const k in VARIANT) {
    const own = t.variant && t.variant[k];
    out.push(`--oriel-${k}:${own || (t.classic ? VARIANT[k][0] : `var(--oriel-${VARIANT[k][1]})`)}`);
  }
  for (const k in t.extra || {}) out.push(`--oriel-${k}:${t.extra[k]}`);
  return `:host{${out.join(';')}}`;
}
