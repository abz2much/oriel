/* The isometric glass house on Home, drawn from config (home.house), plus the energy kit
   (inverter, home box, battery cabinet, grid pole) with animated flow along its cables.
   Plan units: each room is rect [x, y, width, depth]; x runs left to right, y runs back to front.
   The plan is scaled to fit the drawing box unless house.scale is set. */
import { addMethods } from './core.js';
import { S } from './strings.js';
import { NS, el, paint, isEnt, bad } from './util.js';
import { ENERGY } from './theme/fixed.js';

const SC = 0.7, CO = 0.866, X0 = 237, Y0 = 603;      // projection: origin of the plan and the iso factors
const BOX_W = 573, BOX_D = 352;                      // drawing box in plan px (the plan is fitted into this)
const H = 52, T = 10, Z1 = H + T, ROOF = 58;         // wall height, slab, first floor level, roof rise
const TINTS = ['rgb(var(--oriel-room))', 'rgb(var(--oriel-room-2))', 'rgb(var(--oriel-room-3))', 'rgb(var(--oriel-room-4))', 'rgb(var(--oriel-room-5))', 'rgb(var(--oriel-room-6))'];
const SOLAR_TAG = [-35.66, -156.15];                 // solar tag offset from the roof's right ridge point

const pt = (x, y, z) => { const a = x - X0, b = y - Y0; return [(a - b) * CO * SC, (a + b) * 0.5 * SC - z]; };

/* Used when no floor plan is configured: one plain two-storey volume with no rooms. */
const OUTLINE = [{ rooms: [{ name: '', rect: [0, 0, BOX_W, BOX_D], pill: false }] }, { rooms: [{ name: '', rect: [0, 0, BOX_W, BOX_D], pill: false }] }];

function solarId(c) { return c.home.energy_card.solar_power || c.energy.solar_power; }
function houseId(c) { return c.home.energy_card.house_power || c.energy.house_power; }
function socId(c) { return c.home.energy_card.battery_soc || (c.energy.battery.soc || [])[0] || ''; }
function gridOn(c) { const g = c.energy.grid; return g.mode === 'derived' ? isEnt(g.inverter_ac) && isEnt(houseId(c)) : isEnt(g.entity); }

addMethods({
  _buildHouse() {
    const svg = this.$('stage'), c = this._c, Hc = c.home.house || {};
    svg.innerHTML = '';
    let floors = (Hc.floors || []).filter((f) => f && Array.isArray(f.rooms) && f.rooms.some((r) => Array.isArray(r.rect) && r.rect.length === 4)).slice(0, 2);
    const outline = !floors.length;
    if (outline) floors = OUTLINE;
    // plan scale and mirror
    let maxX = 0, maxY = 0;
    floors.forEach((f) => f.rooms.forEach((r) => { if (Array.isArray(r.rect)) { maxX = Math.max(maxX, r.rect[0] + r.rect[2]); maxY = Math.max(maxY, r.rect[1] + r.rect[3]); } }));
    const s = Number(Hc.scale) > 0 ? Number(Hc.scale) : Math.min(BOX_W / (maxX || 1), BOX_D / (maxY || 1));
    const mirror = !!Hc.mirror;
    const toPlan = (rect) => {
      const [x, y, w, d] = rect, x0 = mirror ? maxX - x - w : x;
      return [X0 + x0 * s, Y0 + y * s, X0 + (x0 + w) * s, Y0 + (y + d) * s];
    };
    const poly = (pts, attrs, p) => el('polygon', Object.assign({ points: pts.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ') }, attrs), p || svg);
    const d = el('defs', {}, svg);
    let g = el('radialGradient', { id: 'glow', cx: .5, cy: .5, r: .5 }, d); el('stop', { offset: 0, 'stop-color': 'rgb(var(--oriel-house-wall))', 'stop-opacity': .9 }, g); el('stop', { offset: 1, 'stop-color': 'rgb(var(--oriel-house-wall))', 'stop-opacity': 0 }, g);
    g = el('linearGradient', { id: 'wall', x1: 0, y1: 0, x2: 0, y2: 1 }, d); el('stop', { offset: 0, 'stop-color': 'rgb(var(--oriel-glass))', 'stop-opacity': .55 }, g); el('stop', { offset: 1, 'stop-color': 'rgb(var(--oriel-glass))', 'stop-opacity': .12 }, g);
    g = el('radialGradient', { id: 'act', cx: .5, cy: .5, r: .6 }, d); el('stop', { offset: 0, 'stop-color': 'rgb(var(--oriel-accent-glow))', 'stop-opacity': .95 }, g); el('stop', { offset: 1, 'stop-color': 'rgb(var(--oriel-accent))', 'stop-opacity': .55 }, g);
    const sh = el('filter', { id: 'hsh', x: '-20%', y: '-20%', width: '140%', height: '150%' }, d); el('feGaussianBlur', { stdDeviation: 10 }, sh);
    el('ellipse', { cx: 70, cy: 190, rx: 330, ry: 150, fill: 'url(#glow)' }, svg);
    // plan rectangles per floor
    let tintI = 0;
    const F = floors.map((f) => f.rooms.filter((r) => Array.isArray(r.rect) && r.rect.length === 4).map((r) => {
      const [x0, y0, x1, y1] = toPlan(r.rect);
      return { r, x0, y0, x1, y1, tint: r.colour || TINTS[tintI++ % TINTS.length] };
    }));
    const ext = (rooms) => ({ xl: Math.min(...rooms.map((q) => q.x0)), xr: Math.max(...rooms.map((q) => q.x1)), yb: Math.min(...rooms.map((q) => q.y0)), yf: Math.max(...rooms.map((q) => q.y1)) });
    const g0 = ext(F[0]);
    el('polygon', { points: [[g0.xl - 14, g0.yb + 14], [g0.xr - 14, g0.yb + 14], [g0.xr - 14, g0.yf + 14], [g0.xl - 14, g0.yf + 14]].map((q) => pt(q[0], q[1], -6).join(',')).join(' '), fill: 'rgb(var(--oriel-house-shadow))', opacity: .35, filter: 'url(#hsh)' }, svg);
    this._rooms = [];
    const drawFloor = (rooms, z) => {
      const { xl, xr, yb, yf } = ext(rooms), z0 = z > 0 ? z - T : z;
      if (z === 0) {
        poly([pt(xl, yf, z), pt(xr, yf, z), pt(xr, yf, z - T), pt(xl, yf, z - T)], { fill: 'rgb(var(--oriel-slab))' });
        poly([pt(xr, yb, z), pt(xr, yf, z), pt(xr, yf, z - T), pt(xr, yb, z - T)], { fill: 'rgb(var(--oriel-house-side))' });
      }
      rooms.slice().sort((a, b) => (a.x0 + a.y0) - (b.x0 + b.y0)).forEach((q) => {
        const i = 1.5, fp = poly([pt(q.x0 + i, q.y0 + i, z), pt(q.x1 - i, q.y0 + i, z), pt(q.x1 - i, q.y1 - i, z), pt(q.x0 + i, q.y1 - i, z)], { fill: q.tint, stroke: 'rgba(var(--oriel-glass),.7)', 'stroke-width': 1 });
        this._rooms.push({ el: fp, base: q.tint, presence: q.r.presence });
        if (outline) return;
        poly([pt(q.x0, q.y0, z), pt(q.x1, q.y0, z), pt(q.x1, q.y0, z + H), pt(q.x0, q.y0, z + H)], { fill: 'url(#wall)', stroke: 'rgba(var(--oriel-glass),.75)', 'stroke-width': 1 });
        poly([pt(q.x0, q.y0, z), pt(q.x0, q.y1, z), pt(q.x0, q.y1, z + H), pt(q.x0, q.y0, z + H)], { fill: 'url(#wall)', stroke: 'rgba(var(--oriel-glass),.75)', 'stroke-width': 1 });
      });
      if (outline) {
        poly([pt(xl, yb, z), pt(xr, yb, z), pt(xr, yb, z + H), pt(xl, yb, z + H)], { fill: 'url(#wall)', stroke: 'rgba(var(--oriel-glass),.75)', 'stroke-width': 1 });
        poly([pt(xl, yb, z), pt(xl, yf, z), pt(xl, yf, z + H), pt(xl, yb, z + H)], { fill: 'url(#wall)', stroke: 'rgba(var(--oriel-glass),.75)', 'stroke-width': 1 });
      }
      poly([pt(xl, yf, z0), pt(xr, yf, z0), pt(xr, yf, z + H), pt(xl, yf, z + H)], { fill: 'rgba(var(--oriel-glass),.2)', stroke: 'rgba(var(--oriel-glass),.85)', 'stroke-width': 1 });
      poly([pt(xr, yb, z0), pt(xr, yf, z0), pt(xr, yf, z + H), pt(xr, yb, z + H)], { fill: 'rgba(var(--oriel-glass),.13)', stroke: 'rgba(var(--oriel-glass),.75)', 'stroke-width': 1 });
    };
    // furniture boxes and stairs (optional, in plan units)
    const fT = 'rgb(var(--oriel-house-wall))', fS = 'rgb(var(--oriel-floor-side))';
    const box = (x0, y0, x1, y1, z, h) => {
      poly([pt(x0, y1, z), pt(x1, y1, z), pt(x1, y1, z + h), pt(x0, y1, z + h)], { fill: fS });
      poly([pt(x1, y0, z), pt(x1, y1, z), pt(x1, y1, z + h), pt(x1, y0, z + h)], { fill: fS, opacity: .8 });
      poly([pt(x0, y0, z + h), pt(x1, y0, z + h), pt(x1, y1, z + h), pt(x0, y1, z + h)], { fill: fT });
    };
    const furniture = (floor, stairs) => (outline ? [] : (Hc.furniture || [])).filter((f) => f && Array.isArray(f.rect) && (f.floor || 0) === floor && (f.type === 'stairs') === stairs).forEach((f) => {
      const [x0, y0, x1, y1] = toPlan(f.rect), z = floor ? Z1 : 0;
      if (f.type === 'stairs') {
        const n = Math.max(1, f.steps || 7), pitch = (y1 - y0) / n;
        for (let k = 0; k < n; k++) { const y = y0 + k * pitch; poly([pt(x1, y, z + .5), pt(x0, y, z + .5), pt(x0, y + 3, z + .5), pt(x1, y + 3, z + .5)], { fill: 'rgba(var(--oriel-house-line),.35)' }); }
      } else box(x0, y0, x1, y1, z, Number(f.height) || 10);
    });
    // same layering as the original drawing: stairs between the floors, boxes on top after the roof
    drawFloor(F[0], 0); furniture(0, true);
    if (F.length > 1) { drawFloor(F[1], Z1); furniture(1, true); }
    const top = ext(F[F.length - 1]), zr = (F.length > 1 ? Z1 : 0) + H, zp = zr + ROOF, ym = (top.yb + top.yf) / 2, xl = top.xl, xr = top.xr;
    if (Hc.roof !== false) {
      poly([pt(xl, top.yb, zr), pt(xr, top.yb, zr), pt(xr, ym, zp), pt(xl, ym, zp)], { fill: 'rgba(var(--oriel-glass),.07)', stroke: 'rgba(var(--oriel-glass),.8)', 'stroke-width': 1.2, 'stroke-dasharray': '5 4' });
      poly([pt(xl, ym, zp), pt(xr, ym, zp), pt(xr, top.yf, zr), pt(xl, top.yf, zr)], { fill: 'rgba(var(--oriel-glass),.12)', stroke: 'rgba(var(--oriel-glass),.85)', 'stroke-width': 1.2, 'stroke-dasharray': '5 4' });
    }
    // solar panels on the rear roof slope
    const rp = (u, v) => pt(xl + u * (xr - xl), top.yb + v * (ym - top.yb), zr + v * (zp - zr));
    this._panels = [];
    const showPanels = Hc.roof !== false && (Hc.solar_panels === true || (Hc.solar_panels !== false && isEnt(solarId(c))));
    if (showPanels) {
      const P = c.energy.panels || {}, cols = Math.max(1, P.columns || 5), rows = Math.max(1, P.rows || 3);
      const gu = 0.012, gv = 0.04, u0 = 0.1, u1 = 0.9, v0 = 0.14, v1 = 0.86, cw = (u1 - u0) / cols, ch = (v1 - v0) / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const a = u0 + i * cw + gu, b = u0 + (i + 1) * cw - gu, c0 = v0 + j * ch + gv, c1 = v0 + (j + 1) * ch - gv;
        this._panels.push(poly([rp(a, c0), rp(b, c0), rp(b, c1), rp(a, c1)], { fill: ENERGY.pvOff, stroke: 'rgba(var(--oriel-glass),.55)', 'stroke-width': 0.8 }));
      }
    }
    furniture(0, false); furniture(1, false);
    // room pills: room name and temperature, dot green while someone is there
    this._pk = 1.16;
    this._pills = [];
    F.forEach((rooms, fi) => rooms.forEach((q) => {
      const r = q.r;
      if (outline || r.pill === false || !r.name || (!isEnt(r.temperature) && !isEnt(r.presence))) return;
      const z = fi ? Z1 + H + 8 : 8, base = pt((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, z), off = Array.isArray(r.pill_offset) ? r.pill_offset : [0, 0];
      const g0 = el('g', { class: 'pill', role: 'button', tabindex: 0 }, svg);
      const hit = el('rect', { y: -10, height: 50, fill: 'transparent' }, g0); // invisible, makes the tap area at least 44px tall on screen
      const rect = el('rect', { height: 30, rx: 15, fill: 'rgba(var(--oriel-glass),.78)', stroke: 'rgba(var(--oriel-glass),.9)' }, g0);
      const dot = el('circle', { cx: 16, cy: 15, r: 4, fill: 'rgb(var(--oriel-off-2))' }, g0);
      const tx = el('text', { x: 28, y: 19.5, 'font-size': 12.5, 'font-family': 'Outfit,sans-serif', 'font-weight': 500, fill: 'rgb(var(--oriel-ink))' }, g0);
      const sx = el('text', { y: 19.5, 'font-size': 12.5, 'font-family': 'Outfit,sans-serif', 'font-weight': 300, fill: 'rgb(var(--oriel-house-label))' }, g0);
      tx.textContent = r.name;
      const obj = { r, g: g0, rect, hit, s: sx, dot, p: [base[0] + (+off[0] || 0), base[1] + (+off[1] || 0)] };
      this.tap(g0, () => this.moreInfo(isEnt(r.temperature) ? r.temperature : r.presence));
      this._layoutPill(obj, '');
      this._pills.push(obj);
    }));
    // energy kit on the right-hand wall
    this._flow = null;
    const kitWanted = Hc.energy_kit === true || (Hc.energy_kit !== false && (isEnt(solarId(c)) || isEnt(houseId(c))));
    if (kitWanted) this._buildEnergyKit(svg, { rp, xr, yb: top.yb, yf: top.yf, zr, zp, ym, ground: g0 });
  },

  _buildEnergyKit(svg, G) {
    const c = this._c, { rp, xr, zr } = G;
    const dy = (v) => G.yb + (v - 603) * (G.yf - G.yb) / 352;     // positions were drawn for a 352-deep plan
    const f = el('g', { id: 'kit' }, svg);
    const poly = (pts, attrs) => el('polygon', Object.assign({ points: pts.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ') }, attrs), f);
    const cub = (x0, y0, x1, y1, z0, z1, top, front, right, stroke) => {
      const st = { stroke: stroke || 'rgba(var(--oriel-ink),.28)', 'stroke-width': .8, 'stroke-linejoin': 'round' };
      poly([pt(x0, y1, z0), pt(x1, y1, z0), pt(x1, y1, z1), pt(x0, y1, z1)], Object.assign({ fill: front }, st));
      poly([pt(x1, y0, z0), pt(x1, y1, z0), pt(x1, y1, z1), pt(x1, y0, z1)], Object.assign({ fill: right }, st));
      poly([pt(x0, y0, z1), pt(x1, y0, z1), pt(x1, y1, z1), pt(x0, y1, z1)], Object.assign({ fill: top }, st));
    };
    const line = (pts, attrs) => el('polyline', Object.assign({ points: pts.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' '), fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, attrs), f);
    const X = xr, K = {};
    const hasSolar = isEnt(solarId(c)), hasBatt = isEnt(c.energy.battery_power) || isEnt(socId(c)), hasGrid = gridOn(c);
    const INV = { y0: dy(620), y1: dy(672), z0: 28, z1: 66 }, HOME = { y0: dy(690), y1: dy(726), z0: 30, z1: 60 };
    const B1 = { y0: dy(790), y1: dy(832) }, BH = 52, BX0 = X + 8, BX1 = X + 44;
    const _c0 = pt(X, G.yf, 0), _tp = [_c0[0] + 71, _c0[1] + 99], _df = _tp[0] / (CO * SC), _sm = _tp[1] / (0.5 * SC);
    const POLE = [X0 + (_sm + _df) / 2, Y0 + (_sm - _df) / 2];
    const GX = X + 58;
    if (hasGrid) {
      K.grid = [pt(POLE[0], POLE[1], 1.5), pt(GX, POLE[1], 1.5), pt(GX, dy(646), 1.5), pt(X + 12, dy(646), 1.5), pt(X + 12, dy(646), INV.z0)];
      line(K.grid, { stroke: 'rgba(var(--oriel-ink),.55)', 'stroke-width': 2.4, 'stroke-dasharray': '1 0' });
    }
    cub(X, INV.y0, X + 12, INV.y1, INV.z0, INV.z1, 'rgb(var(--oriel-kit-top))', 'rgb(var(--oriel-kit-left))', 'rgb(var(--oriel-kit-side))');
    const led = el('circle', { r: 2.6, fill: 'rgb(var(--oriel-off))', stroke: 'rgba(var(--oriel-glass),.9)', 'stroke-width': .8 }, f);
    { const q = pt(X + 12, INV.y1 - 8, INV.z1 - 9); led.setAttribute('cx', q[0].toFixed(1)); led.setAttribute('cy', q[1].toFixed(1)); }
    for (let i = 0; i < 3; i++) { const z = INV.z0 + 9 + i * 7; poly([pt(X + 12, INV.y0 + 8, z), pt(X + 12, INV.y1 - 18, z), pt(X + 12, INV.y1 - 18, z + 2), pt(X + 12, INV.y0 + 8, z + 2)], { fill: 'rgba(var(--oriel-ink),.2)' }); }
    K.led = led;
    cub(X, HOME.y0, X + 9, HOME.y1, HOME.z0, HOME.z1, 'rgb(var(--oriel-kit-top-3))', 'rgb(var(--oriel-kit-left-2))', 'rgb(var(--oriel-kit-shade))');
    for (let i = 0; i < 3; i++) poly([pt(X + 9, HOME.y0 + 6 + i * 10, HOME.z1 - 6), pt(X + 9, HOME.y0 + 10 + i * 10, HOME.z1 - 6), pt(X + 9, HOME.y0 + 10 + i * 10, HOME.z0 + 6), pt(X + 9, HOME.y0 + 6 + i * 10, HOME.z0 + 6)], { fill: 'rgba(var(--oriel-ink),.3)' });
    if (hasSolar && this._panels.length) {
      K.solar = [rp(.94, .5), pt(X + 6, dy(660), zr + 14), pt(X + 6, dy(652), INV.z1 + 14), pt(X + 6, dy(652), INV.z1)];
      line(K.solar, { stroke: 'rgba(var(--oriel-ink),.55)', 'stroke-width': 2.4 });
    }
    K.home = [pt(X + 12, dy(660), 56), pt(X + 12, dy(680), 56), pt(X + 9, dy(694), 54)];
    line(K.home, { stroke: 'rgba(var(--oriel-ink),.55)', 'stroke-width': 2.4 });
    K.cells = [];
    if (hasBatt) {
      K.batt = [pt(X + 10, dy(636), INV.z0), pt(X + 10, dy(636), 4), pt(X + 22, dy(700), 3), pt(X + 22, B1.y0 + 4, 3)];
      line(K.batt, { stroke: 'rgba(var(--oriel-ink),.55)', 'stroke-width': 2.4 });
      cub(BX0, B1.y0, BX1, B1.y1, 0, BH, 'rgb(var(--oriel-kit-top-2))', 'rgb(var(--oriel-kit-left-3))', 'rgb(var(--oriel-kit-right))');
      const inset = 3, zBase = 4, zSpan = BH - 8;
      const bar = poly([pt(BX1, B1.y0 + inset, zBase), pt(BX1, B1.y1 - inset, zBase), pt(BX1, B1.y1 - inset, zBase + zSpan), pt(BX1, B1.y0 + inset, zBase + zSpan)], { fill: ENERGY.battCharge, opacity: .95 });
      K.cells.push({ bar, pts: [B1.y0 + inset, B1.y1 - inset, BX1, zBase, zSpan] });
    }
    if (hasGrid) {
      const base = pt(POLE[0], POLE[1], 0), top = pt(POLE[0], POLE[1], 80);
      line([base, top], { stroke: 'rgb(var(--oriel-house-pole))', 'stroke-width': 4.2 });
      line([pt(POLE[0] - 22, POLE[1] + 8, 70), pt(POLE[0] + 22, POLE[1] - 8, 70)], { stroke: 'rgb(var(--oriel-house-pole))', 'stroke-width': 3 });
      [[-18, 6], [0, 0], [18, -6]].forEach(([ddx, ddy]) => { const q = pt(POLE[0] + ddx, POLE[1] + ddy, 74); el('circle', { cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: 2.4, fill: 'rgb(var(--oriel-raised))', stroke: 'rgb(var(--oriel-house-pole))', 'stroke-width': 1 }, f); });
      line([pt(POLE[0] + 18, POLE[1] - 6, 70), pt(POLE[0] + 90, POLE[1] - 22, 76)], { stroke: 'rgba(var(--oriel-ink),.35)', 'stroke-width': 1.2 });
      line([pt(POLE[0] - 18, POLE[1] + 6, 70), pt(POLE[0] + 80, POLE[1] + 14, 74)], { stroke: 'rgba(var(--oriel-ink),.35)', 'stroke-width': 1.2 });
    }
    this._kit = K;
    const COL = { solar: ENERGY.solarHouse, grid: ENERGY.gridHouse, batt: ENERGY.battHouse, home: ENERGY.houseFlow };
    this._flow = { links: {}, tags: {}, COL };
    ['solar', 'home', 'batt', 'grid'].forEach((key) => {
      if (!K[key]) return;
      const dots = [0, 1, 2, 3].map(() => {
        const cc = el('circle', { r: 4.4, fill: COL[key], stroke: 'rgba(var(--oriel-ink),.55)', 'stroke-width': 1.1, visibility: 'hidden' }, f);
        const am = document.createElementNS(NS, 'animateMotion'); am.setAttribute('repeatCount', 'indefinite'); cc.appendChild(am);
        return { cc, am };
      });
      this._flow.links[key] = { dots, pts: K[key], dir: 99, dur: 0 };
    });
    const sa = pt(X, G.ym, G.zp);
    const anchor = {
      solar: [sa[0] + SOLAR_TAG[0], sa[1] + SOLAR_TAG[1]],
      home: pt(X + 9, dy(708), 0).map((v, i) => v + [-32, -165][i]),
      batt: pt(BX1, dy(811), 0).map((v, i) => v + [66, 36][i]),
      grid: pt(POLE[0], POLE[1], 0).map((v, i) => v + [-92, 6][i]),
    };
    const tag = (key, name, ent) => {
      const w = 132, h = 40, g0 = el('g', { class: 'ftag', style: 'cursor:pointer' }, f), P = anchor[key];
      el('rect', { y: -4, width: w, height: h + 8, fill: 'transparent' }, g0); // invisible, makes the tap area at least 44px tall on screen
      el('rect', { width: w, height: h, rx: 15, fill: 'rgba(var(--oriel-tag),.9)', stroke: 'rgba(var(--oriel-on-dark),.18)' }, g0);
      el('circle', { cx: 12, cy: 12, r: 3.6, fill: COL[key] }, g0);
      const tx = el('text', { x: 21, y: 16, 'font-size': 12, 'font-family': 'Outfit,sans-serif', 'font-weight': 400, fill: 'rgba(var(--oriel-on-dark),.72)' }, g0); tx.textContent = name;
      const s2 = el('text', { x: w - 9, y: 16, 'text-anchor': 'end', 'font-size': 12, 'font-family': 'Outfit,sans-serif', 'font-weight': 400, fill: COL[key] }, g0);
      const v = el('text', { x: 11, y: 34, 'font-size': 16, 'font-family': 'Outfit,sans-serif', 'font-weight': 400, fill: 'rgb(var(--oriel-on-dark))' }, g0);
      const p = el('text', { x: w - 9, y: 34, 'text-anchor': 'end', 'font-size': 12, 'font-family': 'Outfit,sans-serif', 'font-weight': 400, fill: 'rgba(var(--oriel-on-dark),.72)' }, g0);
      g0.setAttribute('role', 'button'); g0.setAttribute('tabindex', '0'); g0.setAttribute('aria-label', name);
      this.tap(g0, () => this.moreInfo(ent));
      const o = this._flow.tags[key] = { g: g0, s: s2, v, t: tx, p, rect: g0.children[1], P, w, h, nx: 0, ny: 0 };
      this._tagPlace(o);
    };
    if (isEnt(houseId(c))) {
      const hb = pt(X + 5, dy(708), HOME.z1 + 2);
      line([hb, [anchor.home[0], anchor.home[1] + 30]], { stroke: 'rgba(var(--oriel-ink),.45)', 'stroke-width': 1.3, 'stroke-dasharray': '2 3' });
    }
    const gr = c.energy.grid;
    if (K.solar) tag('solar', S.solar, solarId(c));
    if (isEnt(houseId(c))) tag('home', S.flow_home, houseId(c));
    if (hasBatt) tag('batt', S.battery, isEnt(socId(c)) ? socId(c) : c.energy.battery_power);
    if (hasGrid) tag('grid', S.flow_grid, gr.mode === 'derived' ? gr.inverter_ac : gr.entity);
  },

  _updateFlow() {
    if (!this._flow) return;
    const c = this._c, F = this._flow, T = F.tags, K = this._kit, gr = c.energy.grid;
    const solar = this.num(solarId(c)), home = this.num(houseId(c)), soc = this.num(socId(c));
    let batt = this.num(c.energy.battery_power); if (batt != null && c.energy.battery_power_positive === 'discharging') batt = -batt;
    let grid = null;
    if (gr.mode === 'derived') { const inv = this.num(gr.inverter_ac); grid = home != null && inv != null ? home + inv : null; }
    else { grid = this.num(gr.entity); if (grid != null && gr.positive === 'export') grid = -grid; }
    const kw = (w) => (Math.abs(w) / 1000).toFixed(Math.abs(w) < 100 ? 2 : 1) + ' kW';
    const TH = 30;
    const pathD = (pts, dir) => { const p = dir < 0 ? pts.slice().reverse() : pts; return 'M' + p.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L'); };
    const set = (k, val, word, dir, w) => {
      if (!T[k]) return;
      T[k].v.textContent = val; T[k].s.textContent = word;
      const L = F.links[k]; if (!L) return;
      const bucket = w == null ? 0 : w < 300 ? 5 : w < 1200 ? 4 : w < 3000 ? 3 : 2.2;
      if (L.dir === dir && L.dur === bucket) return;
      L.dir = dir; L.dur = bucket;
      const d = pathD(L.pts, dir || 1);
      // with reduced motion asked for, the dots stay hidden; the tags still show direction in words
      const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      L.dots.forEach((x, i) => {
        x.cc.setAttribute('visibility', dir && !still ? 'visible' : 'hidden');
        x.am.setAttribute('path', d); x.am.setAttribute('dur', (bucket || 4) + 's'); x.am.setAttribute('begin', (-(bucket || 4) * i / 4) + 's');
      });
    };
    set('solar', solar != null ? kw(solar) : '–', solar > TH ? S.flow_generating : S.flow_idle, solar > TH ? 1 : 0, solar);
    set('home', home != null ? kw(home) : '–', home > TH ? S.flow_using : S.flow_idle, home > TH ? 1 : 0, home);
    if (T.batt) T.batt.p.textContent = soc != null ? Math.round(soc) + '%' : '';
    set('batt', batt != null ? kw(batt) : '–', batt > TH ? S.flow_charging : batt < -TH ? S.flow_powering : S.flow_idle, batt > TH ? 1 : batt < -TH ? -1 : 0, batt != null ? Math.abs(batt) : null);
    set('grid', grid != null ? kw(grid) : '–', grid > TH ? S.flow_importing : grid < -TH ? S.flow_exporting : S.flow_idle, grid > TH ? 1 : grid < -TH ? -1 : 0, grid != null ? Math.abs(grid) : null);
    K.cells.forEach((cell) => {
      const [y0, y1, bx, zb, zs] = cell.pts, h = soc != null ? Math.max(0, Math.min(100, soc)) / 100 * zs : 0;
      const P = [[bx, y0, zb], [bx, y1, zb], [bx, y1, zb + h], [bx, y0, zb + h]].map((q) => pt(q[0], q[1], q[2]));
      cell.bar.setAttribute('points', P.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' '));
      cell.bar.setAttribute('fill', batt > TH ? ENERGY.battCharge : batt < -TH ? ENERGY.battDischarge : ENERGY.battIdle);
    });
    paint(K.led, 'fill', (solar > TH || home > TH) ? 'rgb(var(--oriel-accent-strong))' : 'rgb(var(--oriel-off))');
  },

  /* a power tag's place: its anchor (plus the phone layout's nudge, 0 on the tablet), scaled about its centre */
  _tagPlace(o) {
    o.g.setAttribute('transform', `translate(${(o.P[0] + o.nx).toFixed(1)},${(o.P[1] + o.ny).toFixed(1)}) scale(${this._tagK || 1.3}) translate(${-o.w / 2},${-o.h / 2})`);
  },
  _layoutPill(o, sub) {
    const n = o.r.name, w = n.length * 7.4 + (sub ? sub.length * 7 + 14 : 0) + 38, k = this._pk || 1;
    o.g.setAttribute('transform', `translate(${(o.p[0] + (o.nx || 0)).toFixed(1)},${(o.p[1] + (o.ny || 0)).toFixed(1)}) scale(${k}) translate(${(-w / 2).toFixed(1)},-15)`);
    o.rect.setAttribute('width', w.toFixed(1)); o.hit.setAttribute('width', w.toFixed(1));
    o.s.setAttribute('x', (28 + n.length * 7.4 + 8).toFixed(1));
    o.s.textContent = sub; o.sub = sub;
  },

  _updateHouse() {
    const c = this._c;
    (this._pills || []).forEach((o) => {
      const tt = this.st(o.r.temperature);
      const sub = tt && !bad(tt.state) && Number.isFinite(parseFloat(tt.state)) ? parseFloat(tt.state).toFixed(0) + '°' : '';
      const on = this.sv(o.r.presence) === 'on';
      paint(o.dot, 'fill', on ? 'rgb(var(--oriel-accent-strong))' : 'rgb(var(--oriel-off-2))');
      o.g.setAttribute('aria-label', o.r.name + (sub ? ' ' + sub : ''));
      if (sub !== o.sub) this._layoutPill(o, sub);
    });
    (this._rooms || []).forEach((rm) => { if (isEnt(rm.presence)) paint(rm.el, 'fill', this.sv(rm.presence) === 'on' ? 'url(#act)' : rm.base); });
    if (this._panels && this._panels.length) { const v = this.num(solarId(c)); this._panels.forEach((q) => q.setAttribute('fill', v != null && v > 50 ? ENERGY.pvOn : ENERGY.pvOff)); }
    try { this._updateFlow(); } catch (e) { console.warn('[oriel] flow', e); }
    if (this._phone) this._phoneFitLabels(); /* labels change width with their values; the phone layout re-fits them */
  },
});
