/* Small colour maths for building themes and checking contrast. Colours are [r, g, b] arrays (0–255). */
export const hex = (h) => { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, (c) => c + c); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
export const toHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const trip = (c) => c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',');
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t); /* t = share of b */
export const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/* Step colour c towards `to` until it reaches `ratio` against bg (or stops at `to`). */
export function reach(c, bg, ratio, to) {
  if (contrast(c, bg) >= ratio) return c;
  for (let t = 0.02; t <= 1; t += 0.02) { const x = mix(c, to, t); if (contrast(x, bg) >= ratio) return x; }
  return to;
}
/* What backdrop-filter contrast(c) brightness(k) does to a colour behind the phone bar (CSS filter functions work on sRGB values, in that order). */
export const navFilter = (col, c, k) => col.map((v) => Math.max(0, Math.min(255, (((v / 255 - 0.5) * c + 0.5) * k) * 255)));
export const isHex = (s) => typeof s === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim());
