/* Shared helpers. No Home Assistant specifics live here. */
export const NS = 'http://www.w3.org/2000/svg';

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');
export const tidy = (s) => cap(String(s).replace(/_/g, ' ').trim());
export const pad = (n) => ('0' + n).slice(-2);
export const hm = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
export const hhmm = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : hm(d); };
export const bad = (s) => s === undefined || s === null || s === 'unavailable' || s === 'unknown';
export const isEnt = (id) => typeof id === 'string' && /^[a-z_]+\.[a-z0-9_]+$/.test(id);
export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* SVG paint can't read CSS variables from an attribute, so themed paint goes on the inline style instead. */
const PAINT = { fill: 1, stroke: 1, 'stop-color': 1 };
export function paint(e, k, v) { e.style.setProperty(k, v); }
export function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) { const v = attrs[k]; if (PAINT[k] && typeof v === 'string' && v.includes('var(')) paint(e, k, v); else e.setAttribute(k, v); }
  if (parent) parent.appendChild(e);
  return e;
}

/* Inline SVG icon paths used by the core and Home. Page modules keep their own sets where a path differs. */
export const P = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  door: 'M6 21V4a1 1 0 011-1h10a1 1 0 011 1v17M4 21h16M14 12h.01', win: 'M5 3h14v18H5zM12 3v18M5 12h14', offline: 'M2 8.5a15 15 0 0120 0M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0M12 19h.01M3 3l18 18', mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM6 11a6 6 0 0012 0M12 17v4',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', vacuum: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 9a3 3 0 100 6 3 3 0 000-6z',
  sliders: 'M4 8h10M18 8h2M4 16h2M10 16h10M14 6v4M6 14v4', spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  drop: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z', user: 'M12 4a4 4 0 100 8 4 4 0 000-8zM4 21c1-4 4.5-6 8-6s7 2 8 6',
  sofa: 'M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3M3 13a2 2 0 014 0v2h10v-2a2 2 0 014 0v5H3zM5 18v2M19 18v2',
  rain: 'M7 15a4 4 0 01.5-7.9A5 5 0 0117 9a3 3 0 010 6H7zM9 19l-1 2M13 19l-1 2M17 19l-1 2',
  cloud: 'M7 18a4 4 0 01.5-7.9A5 5 0 0117 11a3.5 3.5 0 010 7H7z',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0012 3z',
  hood: 'M4 14h16l-3-8H7zM9 14v4M15 14v4', fire: 'M12 3c1 3 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  washer: 'M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zM12 9a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM7.5 6h.01M10.5 6h.01',
  dryer: 'M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zM12 9a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM10 14c1-2 3-2 4 0M7.5 6h.01',
  dish: 'M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zM4 8h16M12 12a3.5 3.5 0 100 7 3.5 3.5 0 000-7z',
  oven: 'M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM3 9h18M7 13h10v4H7z',
  micro: 'M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zM15 9v6M7 9h5v6H7z',
  cook: 'M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zM6 9a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0M13.6 9a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0M9.8 15a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0',
  fridge: 'M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zM6 10h12M9 6v1M9 13v3',
  cart: 'M3 4h2l2.5 11h10l2-8H6M9 20h.01M17 20h.01',
  down: 'M12 4v12M7 11l5 5 5-5M5 20h14', up: 'M12 20V8M7 13l5-5 5 5M5 4h14', eur: 'M17 6a6 6 0 100 12M5 10h9M5 14h9',
  heatp: 'M4 6h16v12H4zM8 12a3 3 0 106 0 3 3 0 00-6 0M17 9v6', grid: 'M12 3v18M5 7h14M7 13h10M9 18h6',
  send: 'M5 12h14M13 6l6 6-6 6', close: 'M6 6l12 12M18 6L6 18', check: 'M5 12l5 5 9-10', alloff: 'M12 3v8M7 6.5a7 7 0 1010 0',
  thermo: 'M10 14.5V5a2 2 0 014 0v9.5a4 4 0 11-4 0zM12 9v7', family: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c.5-3.5 3-5 6-5s5.5 1.5 6 5M17 10a2.5 2.5 0 100-5M17.5 15c2.2.3 3.5 1.7 3.8 4.5',
  calendar: 'M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM4 10h16M8 3v4M16 3v4', bin: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01', bell: 'M6 16v-5a6 6 0 0112 0v5l1.5 2h-15zM10 21h4', wind: 'M3 9h10a3 3 0 10-3-3M3 14h14a3 3 0 11-3 3M3 19h6',
};
export const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;

/* ---------- energy history maths (watt-seconds per 3-hour bin) ---------- */
export function wattHours(points, a, b) {
  if (!points.length || b <= a) return 0;
  let wh = 0;
  for (let i = 0; i < points.length; i++) {
    const s = Math.max(points[i].t, a);
    const e = Math.min(i + 1 < points.length ? points[i + 1].t : b, b);
    if (e > s) wh += (points[i].w * (e - s)) / 3600;
  }
  return wh;
}
export function parseHistory(arr) {
  const out = [];
  for (const e of arr || []) {
    const raw = e.s !== undefined ? e.s : e.state;
    const w = parseFloat(raw);
    const t = e.lu !== undefined ? e.lu : e.lc !== undefined ? e.lc : Date.parse(e.last_updated || e.last_changed) / 1000;
    if (Number.isFinite(w) && Number.isFinite(t)) out.push({ t, w });
  }
  return out.sort((x, y) => x.t - y.t);
}
export function binsOf(points, start) { return Array.from({ length: 8 }, (_, i) => wattHours(points, start + i * 10800, start + (i + 1) * 10800) / 1000); }
export function energySummary(points, midnightToday, now) {
  const D = 86400, y0 = midnightToday - D;
  return {
    today: binsOf(points, midnightToday), yesterday: binsOf(points, y0),
    todayTotal: wattHours(points, midnightToday, now) / 1000,
    yesterdaySoFar: wattHours(points, y0, y0 + (now - midnightToday)) / 1000,
  };
}
