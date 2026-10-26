/* Fixed colours: the same in every theme because they carry meaning (states, energy sources, real light
   colours, camera overlays) or are part of a picture (the Living Room illustration). Themes never change these. */

/* State hues shared by the alarm and the vacuum: [fill or ring, text]. */
export const STATE = {
  green: ['#b9dc8a', '#4a6b24'], teal: ['#4fa8b8', '#1d6672'], away: ['#b5503a', '#8a3322'],
  amber: ['#ffc247', '#8a5f00'], red: ['#c0392b', '#8a1f12'], grey: ['#9a9088', '#5f5750'],
};

/* The same state hues as text on dark themes (the dark text shades above don't read on dark glass). */
export const STATE_ON_DARK = { '#4a6b24': '#b9dc8a', '#1d6672': '#86d3df', '#8a3322': '#f2a08c', '#8a5f00': '#ffc247', '#8a1f12': '#ff8a7a', '#5f5750': '#c4bcb4' };

/* Energy sources and flows. */
export const ENERGY = {
  solar: '#e8a21f', solarDot: '#ffc247', solarHouse: '#f2cc2f',
  grid: '#4f8fd6', gridDot: '#8b6fd6', gridHouse: '#7fb2e6',
  house: '#6fb3ff', houseFlow: '#ffffff',
  batt: '#7da24a', battHouse: '#b9dc8a', battCharge: '#8fcf5a', battDischarge: '#e8b64a', battIdle: '#a8cf86',
  heat: '#ffb26b', heatOn: '#a8461f', running: '#ff8a4a',
  bandHigh: '#7da24a', bandMid: '#e0a02e', bandLow: '#c8573a', /* solar forecast: high, medium, low */
  trendDown: '#b9dc8a', trendUp: '#f0b36b',
  pvOn: '#6f98c8', pvOff: '#34465c',
};
/* PV strings: [generating, idle]. */
export const STRING_COL = [['#6f98c8', '#34465c'], ['#d9a441', '#5a4a2c'], ['#5fb3a2', '#2c4f48'], ['#b58ad6', '#4a3a5a']];

/* Lights and user-coloured items. */
export const LIGHT = { default: '#ffc247', wall: '#ffc98a', scene: '#e0a02e', appliance: '#4aa3ff', swatchEdge: 'rgba(0,0,0,.15)' };
export const WHITES = [['white_candle', 2200, '#ffb347'], ['white_warm', 2700, '#ffc98a'], ['white_neutral', 4000, '#fff0d8'], ['white_day', 6000, '#eaf3ff']];
export const COLOURS = [['col_red', '#e5483d'], ['col_orange', '#f08a2c'], ['col_yellow', '#f2cc2f'], ['col_green', '#6fbf4a'], ['col_teal', '#2fb5a8'], ['col_blue', '#3f7fe0'], ['col_violet', '#7a5ce0'], ['col_pink', '#e65fa6']];

/* Camera tiles, the doorbell feed and their overlays. */
export const CAM = {
  tileA: '#4a423b', tileB: '#2a2420', video: '#0c0b0a', feed: '#1b1816', live: '#c0392b',
  text: '#fff', soft: 'rgba(255,255,255,.75)', chip: 'rgba(255,255,255,.18)', btn: 'rgba(255,255,255,.2)', btnLine: 'rgba(255,255,255,.35)',
  btnLive: 'rgba(0,0,0,.55)', shadow: 'rgba(0,0,0,.6)',
};

/* Vacuum extras that are not state hues. */
export const VAC = { worn: '#e0604a', activeRoom: 'rgba(79,168,184,.55)' };

/* The Living Room illustration: a picture, so it keeps its own palette in every theme. */
export const SCENE = {
  panelGlow: 'rgba(110,95,120,.55)', panelA: '#463d4c', panelB: '#221d24',
  shadow: '#14101a', floor: '#cdbd9f', rug: '#8f89a3', edge: 'rgba(255,255,255,.5)', wallEdge: 'rgba(255,255,255,.7)',
  white: '#fff', window: 'rgba(175,210,240,.4)', blind: 'rgba(255,255,255,.55)',
  wallGlow: '#ffc98a', lampOff: '#ffb26b', mood: '#7a5ce0', tvGlow: '#ff8a2a',
  sofa: ['#f1e8d8', '#d6c8b2', '#c3b49d'], back: ['#f4ecdd', '#d9ccb8', '#c7b8a2'], screen: ['#4b4242', '#3a3333', '#332d2d'],
  seam: 'rgba(120,100,80,.45)', seam2: 'rgba(120,100,80,.4)',
  tableShadow: 'rgba(0,0,0,.18)', tableTop: 'rgba(255,255,255,.4)', tableRim: '#c9a06a',
  stem: '#6b4f3a', pot: '#4a4545', leaves: ['#4f7d4a', '#5d8e55', '#3f6a3d'],
  lamp: '#2a2420', unit: ['#2a2420', '#1d1917', '#171412'], tv: ['#1a1614', '#0f0d0c', '#0a0908'],
};

/* Fallbacks for Home Assistant's own theme variables, used only by the card editor (it follows HA's theme). */
export const HA = {
  primary: '#03a9f4', primaryTint: 'rgba(3,169,244,.12)', text: '#212121', secondary: '#5f6368', disabled: '#9e9e9e',
  divider: '#e0e0e0', divider2: '#eee', divider3: '#f0f0f0', divider4: '#bdbdbd', bg2: '#eee', card: '#fff', onPrimary: '#fff',
  noteBg: 'rgba(240,180,41,.16)', noteBg2: 'rgba(240,180,41,.14)', noteText: '#8a5a00', badLine: '#f0b429',
  ok: 'rgba(67,160,71,.14)', no: 'rgba(219,68,55,.12)', overlay: 'rgba(0,0,0,.35)',
};

/* Browser console banner. */
export const BANNER = ['background:#b9dc8a;color:#1f1a17;font-weight:600', 'background:#2a2420;color:#fff'];
