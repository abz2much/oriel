/* Page drawings for the scene style (general.page_style: scene): one isometric picture per page, drawn in code in the
   same projection as the glass house on Home. Each returns an <svg> string with a fixed viewBox; ids carry the page key
   so several drawings can share the card's shadow root. Decorative only: they read no state and call nothing. */
const S = 2.4, CO = 0.866, OX = 400, OY = 140;

function draw(key, body) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const P = (x, y, z) => { const a = OX + (x - y) * CO * S, b = OY + (x + y) * 0.5 * S - z * S; if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; return [a, b]; };
  const f = (n) => n.toFixed(1);
  const pts = (a) => a.map((p) => P(...p).map(f).join(',')).join(' ');
  const o = [], defs = [];
  const stops = (st) => st.map(([of, c, a = 1]) => `<stop offset="${of}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
  const h = {
    S, CO, P, f, pts, o, defs,
    poly: (a, fill, stroke = 'none', sw = 0.8, ex = '') => o.push(`<polygon points="${pts(a)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${ex}/>`),
    line: (a, c, sw = 1, ex = '') => o.push(`<polyline points="${pts(a)}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${ex}/>`),
    lg: (id, x1, y1, x2, y2, st) => defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(st)}</linearGradient>`),
    rg: (id, st) => defs.push(`<radialGradient id="${id}">${stops(st)}</radialGradient>`),
    glow: (x, y, z, r, id) => { const [a, b] = P(x, y, z); o.push(`<circle cx="${f(a)}" cy="${f(b)}" r="${r}" fill="url(#${id})"/>`); },
  };
  h.box = (x, y, z, w, d, hh, top, left, right, st = 'rgba(0,0,0,.22)') => {
    h.poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + hh], [x, y + d, z + hh]], left, st);
    h.poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + hh], [x + w, y, z + hh]], right, st);
    h.poly([[x, y, z + hh], [x + w, y, z + hh], [x + w, y + d, z + hh], [x, y + d, z + hh]], top, st);
  };
  /* faces on the two back walls: the y wall (y = 0, along x) and the x wall (x = 0, along y) */
  h.onY = (x, z, w, hh, fill, st = 'none', k = 0.2) => h.poly([[x, k, z], [x + w, k, z], [x + w, k, z + hh], [x, k, z + hh]], fill, st);
  h.onX = (y, z, w, hh, fill, st = 'none', k = 0.2) => h.poly([[k, y, z], [k, y + w, z], [k, y + w, z + hh], [k, y, z + hh]], fill, st);
  body(h);
  const pad = 24, vb = [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].map(f).join(' ');
  const svg = `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><defs>${defs.join('')}</defs>${o.join('')}</svg>`;
  return svg.replace(/id="([\w-]+)"/g, `id="sc-${key}-$1"`).replace(/url\(#([\w-]+)\)/g, `url(#sc-${key}-$1)`);
}

/* Energy: a house with roof solar, a hybrid inverter and battery unit on the side wall, and the grid pole. */
const energy = (h) => {
  const { S, CO, P, f, pts, o, defs, poly, line, lg, rg, glow, box, onY, onX } = h; // eslint-disable-line no-unused-vars
  /* palette and gradients */
  lg('wallL', 0, 0, 0, 1, [[0, '#efe6da'], [1, '#d9cdbd']]);
  lg('wallR', 0, 0, 0, 1, [[0, '#cbbca9'], [1, '#b3a38f']]);
  lg('roofS', 0, 0, 0, 1, [[0, '#5a504a'], [1, '#3e3632']]);
  lg('pv', 0, 0, 1, 1, [[0, '#4d78c4'], [0.45, '#22417e'], [0.55, '#2c4f93'], [1, '#172f5e']]);
  lg('win', 0, 0, 0, 1, [[0, '#ffd89a'], [1, '#f2a65a']]);
  lg('ground', 0, 0, 1, 1, [[0, '#4a4636'], [1, '#2f2c22']]);
  lg('batL', 0, 0, 0, 1, [[0, '#f4f1ec'], [1, '#dcd6cc']]);
  lg('batR', 0, 0, 0, 1, [[0, '#cfc8bd'], [1, '#b8b0a4']]);
  lg('unitL', 0, 0, 0, 1, [[0, '#4e4e54'], [1, '#3e3e43']]);
  lg('unitR', 0, 0, 0, 1, [[0, '#3a3a3f'], [1, '#2d2d31']]);
  lg('pole', 0, 0, 1, 0, [[0, '#7a6656'], [1, '#4e3f33']]);
  rg('warm', [[0, '#ffc77a', 0.55], [1, '#ffc77a', 0]]);
  rg('sun', [[0, '#ffe2a8', 0.5], [1, '#ffe2a8', 0]]);
  rg('green', [[0, '#8fdc9c', 0.7], [1, '#8fdc9c', 0]]);
  rg('blue', [[0, '#9cc2ff', 0.7], [1, '#9cc2ff', 0]]);
  defs.push('<filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter><filter id="blur2"><feGaussianBlur stdDeviation="1.4"/></filter>');

  /* ground: a rounded plot, a path to the door, a soft shadow */
  poly([[-40, -10, 0], [200, -10, 0], [228, 14, 0], [228, 140, 0], [205, 165, 0], [-40, 165, 0], [-58, 142, 0], [-58, 12, 0]], 'url(#ground)', 'rgba(255,255,255,.08)');
  o.push(`<polygon points="${pts([[4, 6, 0], [150, 6, 0], [160, 110, 0], [4, 110, 0]])}" fill="rgba(0,0,0,.45)" filter="url(#blur8)"/>`);
  poly([[38, 90, 0.2], [56, 90, 0.2], [62, 162, 0.2], [32, 162, 0.2]], 'rgba(214,196,170,.35)');
  for (let i = 0; i < 4; i++) poly([[36 - i * 0.6, 100 + i * 15, 0.3], [58 + i * 0.6, 100 + i * 15, 0.3], [58 + i * 0.6, 110 + i * 15, 0.3], [36 - i * 0.6, 110 + i * 15, 0.3]], 'rgba(230,214,190,.28)');

  /* garden: bushes and a small tree */
  const bush = (x, y, r, c1, c2) => { const [a, b] = P(x, y, 0); const id = 'b' + o.length; rg(id, [[0, c1], [1, c2]]);
    o.push(`<ellipse cx="${f(a)}" cy="${f(b + 2)}" rx="${r * 2.6}" ry="${r * 1.1}" fill="rgba(0,0,0,.4)" filter="url(#blur2)"/>`);
    for (const [dx, dy, k] of [[-r * 1.1, -r * 0.9, 1.1], [r * 1.1, -r * 0.8, 1], [0, -r * 1.7, 1.25]]) o.push(`<circle cx="${f(a + dx)}" cy="${f(b + dy)}" r="${f(r * k)}" fill="url(#${id})"/>`); };
  const [tx, ty] = P(-46, 40, 0); o.push(`<rect x="${f(tx - 2.5)}" y="${f(ty - 60)}" width="5" height="60" fill="#5a4636"/>`); { const [a, b] = P(-46, 40, 0); rg('tr', [[0, '#7a9a55'], [1, '#3f5a2e']]); o.push(`<circle cx="${f(a)}" cy="${f(b - 66)}" r="30" fill="url(#tr)"/><circle cx="${f(a + 14)}" cy="${f(b - 52)}" r="20" fill="url(#tr)"/>`); }
  /* house walls */
  const W = 120, D = 90, H = 55;
  poly([[0, D, 0], [W, D, 0], [W, D, H], [0, D, H]], 'url(#wallL)', 'rgba(0,0,0,.2)');
  poly([[W, 0, 0], [W, D, 0], [W, D, H], [W, 0, H]], 'url(#wallR)', 'rgba(0,0,0,.2)');
  poly([[W, 0, H], [W, D, H], [W, D / 2, H + 33]], 'url(#wallR)', 'rgba(0,0,0,.2)');                // gable end
  line([[0, D, 1.5], [W, D, 1.5], [W, 0, 1.5]], 'rgba(0,0,0,.25)', 3);                             // plinth
  /* front windows (lit) with sills and mullions */
  const winF = (x0) => { poly([[x0, D + 0.2, 20], [x0 + 18, D + 0.2, 20], [x0 + 18, D + 0.2, 42], [x0, D + 0.2, 42]], '#3a2e26');
    poly([[x0 + 1.5, D + 0.4, 21.5], [x0 + 16.5, D + 0.4, 21.5], [x0 + 16.5, D + 0.4, 40.5], [x0 + 1.5, D + 0.4, 40.5]], 'url(#win)');
    line([[x0 + 9, D + 0.5, 21.5], [x0 + 9, D + 0.5, 40.5]], '#3a2e26', 1.4); line([[x0 + 1.5, D + 0.5, 31], [x0 + 16.5, D + 0.5, 31]], '#3a2e26', 1.4);
    box(x0 - 1, D, 18.5, 20, 3, 1.6, '#f6f1ea', '#e2d8ca', '#cfc2b1');
    glow(x0 + 9, D + 6, 30, 46, 'warm'); };
  winF(8); winF(76);
  /* door with canopy, handle, step */
  poly([[42, D + 0.2, 0], [56, D + 0.2, 0], [56, D + 0.2, 36], [42, D + 0.2, 36]], '#2e2520');
  poly([[43.5, D + 0.4, 1], [54.5, D + 0.4, 1], [54.5, D + 0.4, 34.5], [43.5, D + 0.4, 34.5]], '#5a3f2e');
  poly([[45.5, D + 0.5, 26], [52.5, D + 0.5, 26], [52.5, D + 0.5, 32], [45.5, D + 0.5, 32]], 'url(#win)');
  o.push((() => { const [a, b] = P(53.2, D + 0.6, 17); return `<circle cx="${f(a)}" cy="${f(b)}" r="1.6" fill="#e8c88a"/>`; })());
  box(40, D, 36, 18, 6, 2, '#6a5e56', '#544a43', '#463d37');
  box(40, D, 0, 18, 7, 2, '#bfb3a3', '#a99c8b', '#958877');
  /* meter box on the front wall */
  box(64, D, 26, 7, 2, 10, '#f2ede6', '#ddd5ca', '#c9bfb2');
  /* side window on the right wall */
  poly([[W + 0.2, 56, 22], [W + 0.2, 72, 22], [W + 0.2, 72, 40], [W + 0.2, 56, 40]], '#3a2e26');
  poly([[W + 0.4, 57.5, 23.5], [W + 0.4, 70.5, 23.5], [W + 0.4, 70.5, 38.5], [W + 0.4, 57.5, 38.5]], 'url(#win)');

  /* roof: front slope (visible) from eave (y=D+6, z=H-3) to ridge (y=D/2, z=H+33), overhang in x */
  const R = (x, t) => [x, D + 6 - t * (D / 2 + 6), H - 3 + t * 36];
  poly([R(-6, 0), R(W + 6, 0), R(W + 6, 1), R(-6, 1)], 'url(#roofS)', 'rgba(0,0,0,.35)');
  for (let t = 0.08; t < 1; t += 0.08) line([R(-6, t), R(W + 6, t)], 'rgba(255,255,255,.06)', 1);
  poly([[W + 6, D + 6, H - 3], [W + 6, D / 2, H + 33], [W + 6, D / 2, H + 30], [W + 6, D + 6, H - 6]], '#2e2724');   // barge board
  line([R(-6, 1), R(W + 6, 1)], '#2a2421', 3);                                                                      // ridge
  poly([R(-6, 0), R(W + 6, 0), [W + 6, D + 6, H - 6], [-6, D + 6, H - 6]], '#2e2724');                            // fascia
  /* solar array: 5 × 2 framed panels, 6 × 10 cells each, on stand-offs */
  const PV = (x, t, lift = 1.2) => { const [a, b, c] = R(x, t); return [a, b, c + lift]; };
  for (let col = 0; col < 5; col++) for (let row = 0; row < 2; row++) {
    const x0 = 6 + col * 21.6, t0 = 0.12 + row * 0.4, w = 20.4, dt = 0.37;
    poly([PV(x0, t0), PV(x0 + w, t0), PV(x0 + w, t0 + dt), PV(x0, t0 + dt)], '#c9ced6', 'rgba(0,0,0,.4)', 0.6);    // frame
    poly([PV(x0 + 0.8, t0 + 0.015, 1.4), PV(x0 + w - 0.8, t0 + 0.015, 1.4), PV(x0 + w - 0.8, t0 + dt - 0.015, 1.4), PV(x0 + 0.8, t0 + dt - 0.015, 1.4)], 'url(#pv)');
    for (let i = 1; i < 6; i++) line([PV(x0 + 0.8 + i * (w - 1.6) / 6, t0 + 0.015, 1.5), PV(x0 + 0.8 + i * (w - 1.6) / 6, t0 + dt - 0.015, 1.5)], 'rgba(170,200,255,.28)', 0.6);
    for (let j = 1; j < 10; j++) line([PV(x0 + 0.8, t0 + 0.015 + j * (dt - 0.03) / 10, 1.5), PV(x0 + w - 0.8, t0 + 0.015 + j * (dt - 0.03) / 10, 1.5)], 'rgba(170,200,255,.18)', 0.5);
  }
  poly([PV(10, 0.55, 1.6), PV(60, 0.88, 1.6), PV(70, 0.88, 1.6), PV(20, 0.55, 1.6)], 'rgba(255,255,255,.12)');    // sheen
  glow(60, 60, 75, 150, 'sun');
  /* chimney */
  box(84, 30, H + 20, 10, 10, 26, '#9a8676', '#7f6c5e', '#6a594c');
  box(83, 29, H + 46, 12, 12, 2, '#5a4c42', '#4a3e36', '#3e342d');

  /* one hybrid unit against the side wall: inverter section on top (screen, vents), two battery modules below */
  box(W, 29.5, 0, 5.6, 13, 1.6, '#2c2c30', '#232326', '#1b1b1e');
  for (let m = 0; m < 2; m++) box(W, 30, 1.6 + m * 11, 5.2, 12, 10.8, '#55555b', 'url(#unitL)', 'url(#unitR)', 'rgba(0,0,0,.18)');
  box(W, 30, 23.6, 5.2, 12, 9, '#55555b', 'url(#unitL)', 'url(#unitR)', 'rgba(0,0,0,.22)');     // inverter section
  box(W, 29.5, 32.6, 5.6, 13, 1.3, '#606066', '#4c4c52', '#3c3c41');
  poly([[W + 5.3, 31.5, 26.5], [W + 5.3, 40.5, 26.5], [W + 5.3, 40.5, 31], [W + 5.3, 31.5, 31]], '#14191c');
  poly([[W + 5.4, 32.1, 27.1], [W + 5.4, 32.1 + 7.8 * 0.62, 27.1], [W + 5.4, 32.1 + 7.8 * 0.62, 30.4], [W + 5.4, 32.1, 30.4]], '#6fcf7a');
  for (let i = 0; i < 4; i++) line([[W + 5.4, 32.5 + i * 2.6, 24.6], [W + 5.4, 32.5 + i * 2.6, 25.8]], 'rgba(255,255,255,.22)', 1);
  for (let m = 0; m < 2; m++) line([[W + 5.4, 32, 4 + m * 11], [W + 5.4, 40, 4 + m * 11]], '#8fdc9c', 1.2);
  line([[W + 1.5, 36, 33.9], [W + 1.5, 36, H], [W + 1.5, 36, H + 2]], '#3a3a3e', 2.2);       // conduit from the roof
  glow(W + 5.4, 36, 28, 26, 'green');

  bush(-16, 100, 8, '#6f8f4f', '#3d5530'); bush(20, 118, 6, '#7c9a58', '#43602f'); bush(84, 114, 7, '#6a8a4a', '#3b522c'); bush(110, 106, 5, '#7c9a58', '#43602f');
  /* grid pole with insulators and sagging service cable to the house corner */
  const pole = [215, 80];
  const [px, py] = P(pole[0], pole[1], 0), [, pyT] = P(pole[0], pole[1], 120);
  o.push(`<ellipse cx="${f(px)}" cy="${f(py + 2)}" rx="10" ry="4" fill="rgba(0,0,0,.4)"/><rect x="${f(px - 3)}" y="${f(pyT)}" width="6" height="${f(py - pyT)}" fill="url(#pole)"/>`);
  line([[pole[0], pole[1] - 18, 112], [pole[0], pole[1] + 18, 112]], '#5a4636', 4);
  for (const dx of [-14, 0, 14]) { const [ix, iy] = P(pole[0], pole[1] + dx, 112); o.push(`<rect x="${f(ix - 1.6)}" y="${f(iy - 7)}" width="3.2" height="7" rx="1" fill="#cfd8dc"/>`); }
  const [ax, ay] = P(pole[0], pole[1] - 14, 118), [bx, by] = P(W, 2, H - 6);
  const cable = `M${f(ax)},${f(ay)} Q${f((ax + bx) / 2)},${f(Math.max(ay, by) + 34)} ${f(bx)},${f(by)}`;
  o.push(`<path d="${cable}" fill="none" stroke="#1e1a17" stroke-width="1.6"/>`);
  for (const [dx, sag] of [[0, 40], [14, 44]]) { const [cx, cy] = P(pole[0], pole[1] + dx, 118), [ex, ey] = P(pole[0] + 40, pole[1] + dx + 80, 118);
    o.push(`<path d="M${f(cx)},${f(cy)} Q${f((cx + ex) / 2)},${f(cy + sag * 0.4)} ${f(ex)},${f(ey)}" fill="none" stroke="#1e1a17" stroke-width="1.2" opacity=".7"/>`); }

  /* live flow: dashed lines with moving dots (solar → inverter → battery, house → grid) */
  const flow = (d, c, dur) => { o.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="2.2" stroke-dasharray="2 7" stroke-linecap="round" opacity=".9"/>`);
    for (let k = 0; k < 3; k++) o.push(`<circle r="3.2" fill="${c}"><animateMotion dur="${dur}s" begin="${-k * dur / 3}s" repeatCount="indefinite" path="${d}"/></circle>`); };
  const seg = (a) => 'M' + a.map((p) => P(...p).map(f).join(',')).join(' L');
  flow(seg([[W - 10, 44, H + 12], [W + 1.5, 36, H + 2], [W + 1.5, 36, 34]]), '#ffcf87', 2.4);
  flow(cable.replace(/M([^ ]+) Q([^ ]+) ([^ ]+)/, 'M$3 Q$2 $1'), '#9cc2ff', 3);
};

/* Climate: a room corner with a radiator under the window, a wall thermostat and an armchair. */
const climate = (h) => {
  const { S, CO, P, f, pts, o, defs, poly, line, lg, rg, glow, box, onY, onX } = h; // eslint-disable-line no-unused-vars
  lg('wallY', 0, 0, 0, 1, [[0, '#e9dfd2'], [1, '#d6c9b8']]);
  lg('wallX', 0, 0, 0, 1, [[0, '#d8ccbc'], [1, '#c2b4a2']]);
  lg('sky', 0, 0, 0, 1, [[0, '#1f2b4a'], [0.6, '#4a4a6a'], [1, '#c98a5e']]);
  lg('curtain', 0, 0, 1, 0, [[0, '#8a6a52'], [0.5, '#a4826a'], [1, '#7a5c46']]);
  lg('chair', 0, 0, 0, 1, [[0, '#6f8a7a'], [1, '#4f6658']]);
  rg('heat', [[0, '#ff8a3c', 0.6], [1, '#ff8a3c', 0]]);
  rg('stat', [[0, '#ffcf87', 0.8], [1, '#ffcf87', 0]]);
  rg('leaf', [[0, '#86a85e'], [1, '#3f5a2e']]);
  defs.push('<filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter><filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>');

  const RW = 150, RD = 120, RH = 60;
  /* floor: oak planks */
  poly([[0, 0, 0], [RW, 0, 0], [RW, RD, 0], [0, RD, 0]], '#8a6446', 'rgba(0,0,0,.3)');
  for (let i = 1; i < 15; i++) line([[i * 10, 0, 0], [i * 10, RD, 0]], 'rgba(40,24,12,.35)', 0.7);
  for (let i = 0; i < 15; i++) for (let j = 0; j < 4; j++) { const y = ((i * 37 + j * 31) % RD); line([[i * 10, y, 0], [i * 10 + 10, y, 0]], 'rgba(40,24,12,.25)', 0.6); }
  /* slab edge so the cutaway reads as a model */
  poly([[0, RD, 0], [RW, RD, 0], [RW, RD, -5], [0, RD, -5]], '#5a4030'); poly([[RW, 0, 0], [RW, RD, 0], [RW, RD, -5], [RW, 0, -5]], '#4a3426');

  /* walls with thickness on the cut edges, skirting, a dado line */
  poly([[0, 0, 0], [RW, 0, 0], [RW, 0, RH], [0, 0, RH]], 'url(#wallY)', 'rgba(0,0,0,.2)');
  poly([[0, 0, 0], [0, RD, 0], [0, RD, RH], [0, 0, RH]], 'url(#wallX)', 'rgba(0,0,0,.2)');
  box(RW, -6, 0, 3, 6, RH, '#f2ebe2', '#dcd2c4', '#c9bdad'); box(-6, RD, 0, 6, 3, RH, '#f2ebe2', '#dcd2c4', '#c9bdad');
  poly([[-6, -6, RH], [RW + 3, -6, RH], [RW + 3, 0, RH], [0, 0, RH], [0, RD + 3, RH], [-6, RD + 3, RH]], '#f6f0e8', 'rgba(0,0,0,.2)');
  onY(0, 0, RW, 3.2, '#f4eee6', 'rgba(0,0,0,.15)', 0.4); onX(0, 0, RD, 3.2, '#e6ded3', 'rgba(0,0,0,.15)', 0.4);

  /* window on the y wall: deep reveal, frame, glazing bars, dusk sky with clouds, sill */
  const wx = 52, wz = 18, ww = 54, wh = 34;
  onY(wx - 2, wz - 2, ww + 4, wh + 4, '#efe8de', 'rgba(0,0,0,.2)', 0.3);
  onY(wx, wz, ww, wh, 'url(#sky)', 'none', 0.5);
  for (const [cx, cz, w, h] of [[wx + 6, wz + 24, 16, 4], [wx + 10, wz + 27, 10, 3], [wx + 30, wz + 20, 18, 4], [wx + 35, wz + 23, 9, 3]]) onY(cx, cz, w, h, 'rgba(230,226,240,.45)', 'none', 0.6);
  const [mx, my] = P(wx + 44, 0.6, wz + 29); o.push(`<circle cx="${f(mx)}" cy="${f(my)}" r="3.4" fill="#f4ecd8" opacity=".85"/>`);
  line([[wx + ww / 2, 0.8, wz], [wx + ww / 2, 0.8, wz + wh]], '#f6f0e8', 2.2); line([[wx, 0.8, wz + wh * 0.62], [wx + ww, 0.8, wz + wh * 0.62]], '#f6f0e8', 2.2);
  line([[wx, 0.8, wz], [wx + ww, 0.8, wz], [wx + ww, 0.8, wz + wh], [wx, 0.8, wz + wh], [wx, 0.8, wz]], '#f6f0e8', 2.6);
  box(wx - 3, 0, wz - 2.4, ww + 6, 5, 1.6, '#fbf7f1', '#e7dfd3', '#d4c9ba');
  /* rain streaks */
  if (0) for (let i = 0; i < 9; i++) line([[wx + 4 + i * 5.6, 0.7, wz + 14 - (i % 3) * 3], [wx + 3 + i * 5.6, 0.7, wz + 9 - (i % 3) * 3]], 'rgba(200,215,240,.35)', 0.8);
  /* curtains on a pole */
  line([[wx - 10, 3, wz + wh + 5], [wx + ww + 10, 3, wz + wh + 5]], '#4a3a30', 2.4);
  for (const [cx, w] of [[wx - 9, 9], [wx + ww, 9]]) { box(cx, 1.5, wz - 6, w, 3, wh + 10.5, '#a4826a', 'url(#curtain)', '#6a5040', 'rgba(0,0,0,.15)');
    for (let k = 1; k < 4; k++) line([[cx + k * w / 4, 4.6, wz - 6], [cx + k * w / 4, 4.6, wz + wh + 4]], 'rgba(0,0,0,.18)', 0.8); }

  /* radiator under the window: panel with fins, valves, pipes; heating glow */
  o.push(`<polygon points="${pts([[wx - 4, 2, 0], [wx + ww + 4, 2, 0], [wx + ww + 18, 30, 0], [wx - 10, 30, 0]])}" fill="rgba(255,138,60,.25)" filter="url(#blur6)"/>`);
  glow(wx + ww / 2, 6, 10, 130, 'heat');
  box(wx + 2, 1.2, 4, ww - 4, 3.4, 12.5, '#fbf8f3', '#eee8df', '#ddd5c9');
  for (let i = 0; i < 16; i++) line([[wx + 4 + i * 3.1, 4.7, 5], [wx + 4 + i * 3.1, 4.7, 15.8]], 'rgba(150,130,110,.35)', 0.9);
  for (const vx of [wx + 1, wx + ww - 1]) { line([[vx, 3, 4], [vx, 3, 1.2], [vx, 0.5, 1.2]], '#d8d2c8', 1.6); box(vx - 1.2, 2, 4.6, 2.4, 2.4, 3, '#f0ece6', '#d8d1c6', '#c6beb2'); }
  for (let k = 0; k < 4; k++) { const [hx, hy] = P(wx + 10 + k * 11, 4, 22 + k * 2); o.push(`<path d="M${f(hx)},${f(hy)} q4,-6 0,-12 q-4,-6 0,-12" fill="none" stroke="rgba(255,190,130,.35)" stroke-width="1.4"/>`); }

  /* thermostat on the x wall: square backplate, round lit dial, value */
  glow(0.4, 30, 38, 46, 'stat');
  onX(24, 32, 12, 12, '#f8f4ee', 'rgba(0,0,0,.25)', 0.6);
  { const [a, b] = P(0.8, 30, 38); o.push(`<ellipse cx="${f(a)}" cy="${f(b)}" rx="9" ry="11" transform="rotate(-30 ${f(a)} ${f(b)})" fill="#1d1d20"/><ellipse cx="${f(a)}" cy="${f(b)}" rx="8" ry="10" transform="rotate(-30 ${f(a)} ${f(b)})" fill="none" stroke="#ffb35a" stroke-width="1.6" stroke-dasharray="34 60"/><text x="${f(a - 6)}" y="${f(b + 3)}" font-size="7" fill="#ffd9a0" font-family="Outfit" transform="skewY(30) translate(0 ${f(-(a - 6) * 0.577)})">19°</text>`); }

  /* framed picture on the x wall */
  onX(62, 30, 30, 20, '#3a2e26', 'rgba(0,0,0,.3)', 0.4); onX(64, 32, 26, 16, '#c9a77a', 'none', 0.6);
  onX(66, 33, 10, 8, '#8a6a4a', 'none', 0.7); onX(76, 36, 12, 10, '#5c7a6a', 'none', 0.7);

  /* rug */
  poly([[34, 44, 0.3], [118, 44, 0.3], [118, 104, 0.3], [34, 104, 0.3]], '#b9876a', 'rgba(0,0,0,.2)');
  poly([[38, 48, 0.4], [114, 48, 0.4], [114, 100, 0.4], [38, 100, 0.4]], 'none', 'rgba(255,235,210,.4)', 1.2);
  poly([[44, 54, 0.4], [108, 54, 0.4], [108, 94, 0.4], [44, 94, 0.4]], '#a87458', 'none');

  /* armchair facing the radiator: base, seat cushion, back, arms, legs */
  const ax = 60, ay = 58;
  o.push(`<polygon points="${pts([[ax - 2, ay - 2, 0], [ax + 34, ay - 2, 0], [ax + 36, ay + 34, 0], [ax, ay + 34, 0]])}" fill="rgba(0,0,0,.35)" filter="url(#blur6)"/>`);
  for (const [lx, ly] of [[ax + 2, ay + 2], [ax + 28, ay + 2], [ax + 2, ay + 28], [ax + 28, ay + 28]]) box(lx, ly, 0, 2, 2, 4, '#4a3426', '#3a281c', '#2e2016');
  box(ax, ay, 4, 32, 32, 8, '#6f8a7a', 'url(#chair)', '#465a4e');
  box(ax + 5, ay + 4, 12, 22, 22, 3.5, '#83a090', '#6a8676', '#56705f');
  box(ax, ay + 26, 12, 32, 6, 20, '#7a9585', 'url(#chair)', '#465a4e');                  // back (towards the viewer)
  box(ax, ay, 12, 5, 26, 9, '#7a9585', 'url(#chair)', '#465a4e'); box(ax + 27, ay, 12, 5, 26, 9, '#7a9585', 'url(#chair)', '#465a4e');
  box(ax + 8, ay + 22, 15.5, 16, 4, 9, '#d9c7a8', '#c7b393', '#b39e7e');                    // cushion
  /* throw blanket over the arm */
  poly([[ax + 27, ay + 4, 21.2], [ax + 32, ay + 4, 21.2], [ax + 32, ay + 16, 21.2], [ax + 27, ay + 16, 21.2]], '#c9724a');
  poly([[ax + 32, ay + 4, 21.2], [ax + 32, ay + 16, 21.2], [ax + 32, ay + 16, 8], [ax + 32, ay + 4, 8]], '#a85a38');

  /* side table with a mug, and a plant */
  box(110, 30, 0, 3, 3, 18, '#5a4030', '#4a3426', '#3a281c'); box(102, 22, 18, 18, 18, 2.2, '#a07a58', '#8a6648', '#74543a');
  box(108, 28, 20.2, 4, 4, 4, '#f2ece4', '#ddd5c9', '#c9bfb2');
  { const [a, b] = P(110, 30, 26); o.push(`<path d="M${f(a)},${f(b)} q3,-5 0,-10" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/>`); }
  box(12, 92, 0, 16, 16, 14, '#c9b49a', '#b39e84', '#9c876e');
  const [px, py] = P(20, 100, 14);
  for (const [dx, dy, r] of [[-8, -10, 9], [7, -12, 9], [0, -22, 11], [-10, -26, 7], [10, -28, 7], [0, -36, 8]]) o.push(`<circle cx="${f(px + dx)}" cy="${f(py + dy)}" r="${r}" fill="url(#leaf)"/>`);
};

/* Household (config key family): a kitchen with a calendar on the wall, a notepad list and the bins outside. */
const family = (h) => {
  const { S, CO, P, f, pts, o, defs, poly, line, lg, rg, glow, box, onY, onX } = h; // eslint-disable-line no-unused-vars
  lg('wallY', 0, 0, 0, 1, [[0, '#ece3d6'], [1, '#d9ccbb']]);
  lg('wallX', 0, 0, 0, 1, [[0, '#dacebe'], [1, '#c4b6a4']]);
  lg('cab', 0, 0, 0, 1, [[0, '#5d7268'], [1, '#4a5d54']]);
  lg('steel', 0, 0, 1, 1, [[0, '#e9edf0'], [0.5, '#c4cbd1'], [1, '#aeb6bd']]);
  lg('patio', 0, 0, 1, 1, [[0, '#7a746c'], [1, '#5c574f']]);
  rg('due', [[0, '#ffcf87', 0.75], [1, '#ffcf87', 0]]);
  rg('lamp', [[0, '#ffd59a', 0.55], [1, '#ffd59a', 0]]);
  rg('fruitO', [[0, '#ffb35a'], [1, '#d9752a']]); rg('fruitG', [[0, '#b6d36a'], [1, '#6f9a32']]); rg('fruitR', [[0, '#f0705a'], [1, '#b03a2a']]);
  defs.push('<filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter><filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>');

  const RW = 150, RD = 120, RH = 60;
  /* patio strip outside the cut edge, with three wheelie bins */
  poly([[RW + 3, -6, 0], [RW + 44, -6, 0], [RW + 44, RD + 3, 0], [RW + 3, RD + 3, 0]], 'url(#patio)', 'rgba(0,0,0,.3)');
  for (let i = 1; i < 6; i++) line([[RW + 3, -6 + i * 21, 0], [RW + 44, -6 + i * 21, 0]], 'rgba(0,0,0,.25)', 0.8);
  line([[RW + 23, -6, 0], [RW + 23, RD + 3, 0]], 'rgba(0,0,0,.25)', 0.8);
  poly([[RW + 44, -6, 0], [RW + 44, RD + 3, 0], [RW + 44, RD + 3, -5], [RW + 44, -6, -5]], '#3e3a34');

  /* floor: large tiles */
  poly([[0, 0, 0], [RW, 0, 0], [RW, RD, 0], [0, RD, 0]], '#cfc6b8', 'rgba(0,0,0,.3)');
  for (let i = 1; i < 10; i++) line([[i * 15, 0, 0.1], [i * 15, RD, 0.1]], 'rgba(90,80,70,.25)', 0.7);
  for (let j = 1; j < 8; j++) line([[0, j * 15, 0.1], [RW, j * 15, 0.1]], 'rgba(90,80,70,.25)', 0.7);
  poly([[0, RD, 0], [RW, RD, 0], [RW, RD, -5], [0, RD, -5]], '#6a5e52'); poly([[RW, 0, 0], [RW, RD, 0], [RW, RD, -5], [RW, 0, -5]], '#5a4f44');

  /* walls with thickness, skirting */
  poly([[0, 0, 0], [RW, 0, 0], [RW, 0, RH], [0, 0, RH]], 'url(#wallY)', 'rgba(0,0,0,.2)');
  poly([[0, 0, 0], [0, RD, 0], [0, RD, RH], [0, 0, RH]], 'url(#wallX)', 'rgba(0,0,0,.2)');
  box(RW, -6, 0, 3, 6, RH, '#f2ebe2', '#dcd2c4', '#c9bdad'); box(-6, RD, 0, 6, 3, RH, '#f2ebe2', '#dcd2c4', '#c9bdad');
  poly([[-6, -6, RH], [RW + 3, -6, RH], [RW + 3, 0, RH], [0, 0, RH], [0, RD + 3, RH], [-6, RD + 3, RH]], '#f6f0e8', 'rgba(0,0,0,.2)');
  onX(0, 0, RD, 3, '#e6ded3', 'rgba(0,0,0,.15)', 0.4);

  /* back door to the patio, on the y wall at the far right, ajar with a glimpse of dusk */
  onY(RW - 26, 0, 20, 40, '#3a2e26', 'none', 0.3);
  onY(RW - 24.5, 0.5, 17, 38, '#2a3550', 'none', 0.5);
  poly([[RW - 24.5, 0.6, 0.5], [RW - 13, 10, 0.5], [RW - 13, 10, 38.5], [RW - 24.5, 0.6, 38.5]], '#6a4a36', 'rgba(0,0,0,.3)');
  onY(RW - 22, 26, 4, 10, '#9fb4d8', 'none', 0.6);

  /* kitchen run along the y wall: base units, worktop, sink, hob, splashback, wall units */
  onY(0, 22, 108, 14, '#e4ddd2', 'rgba(0,0,0,.1)', 0.25);                                   // splashback tiles
  for (let i = 1; i < 14; i++) line([[i * 8, 0.3, 22], [i * 8, 0.3, 36]], 'rgba(0,0,0,.08)', 0.6);
  for (let j = 1; j < 4; j++) line([[0, 0.3, 22 + j * 3.5], [108, 0.3, 22 + j * 3.5]], 'rgba(0,0,0,.08)', 0.6);
  box(2, 0, 0, 106, 14, 20, '#4a5d54', 'url(#cab)', '#3e4e46');
  for (let i = 0; i < 7; i++) { onY(4 + i * 14.6, 1.5, 13, 17, 'rgba(255,255,255,.05)', 'rgba(0,0,0,.25)', 14.1); line([[10 + i * 14.6, 14.2, 15], [10.6 + i * 14.6, 14.2, 15]], '#d8d2c8', 1.8); }
  box(0, -0.5, 20, 110, 16, 2.4, '#efe9e0', '#ddd5c9', '#c9bfb2');                          // worktop
  box(48, 3, 22.2, 18, 9, 0.4, '#9aa3aa', '#8a929a', '#7a8289');                             // sink
  line([[57, 1.5, 22.4], [57, 1.5, 30], [57, 6, 30], [57, 6, 28]], '#cfd5da', 1.8);           // tap
  box(80, 2, 22.4, 20, 11, 0.6, '#1d1d20', '#161618', '#101012');                            // hob
  for (const [hx, hy] of [[85, 5], [95, 5], [85, 10], [95, 10]]) { const [a, b] = P(hx, hy, 23); o.push(`<ellipse cx="${f(a)}" cy="${f(b)}" rx="4.8" ry="2.6" fill="none" stroke="#4a4a50" stroke-width="1"/>`); }
  { const [a, b] = P(85, 10, 23); o.push(`<ellipse cx="${f(a)}" cy="${f(b)}" rx="4.8" ry="2.6" fill="none" stroke="#ff7a3c" stroke-width="1.4"/>`); }
  box(46, 0, 40, 60, 10, 15, '#4a5d54', 'url(#cab)', '#3e4e46');                            // wall units
  for (let i = 0; i < 4; i++) { onY(47.5 + i * 14.6, 41.2, 13.2, 12.6, 'rgba(255,255,255,.05)', 'rgba(0,0,0,.25)', 10.1); line([[52 + i * 14.6, 10.2, 42.5], [52.6 + i * 14.6, 10.2, 42.5]], '#d8d2c8', 1.8); }
  glow(76, 8, 38, 70, 'lamp');                                                                // under-cabinet light
  poly([[46, 0.3, 39.6], [106, 0.3, 39.6], [106, 10, 39.6], [46, 10, 39.6]], 'rgba(255,220,160,.25)');

  /* notepad (the shopping list) on the worktop */
  box(12, 3, 22.4, 10, 8, 0.8, '#fff6c8', '#ece2b0', '#d9cf9e');
  for (let k = 0; k < 4; k++) line([[13.5, 4.5 + k * 1.6, 23.3], [20.5, 4.5 + k * 1.6, 23.3]], 'rgba(60,50,40,.45)', 0.6);
  line([[22.5, 6, 23.3], [17, 9, 23.3]], '#3a7ae0', 1.2);
  /* x wall: calendar with today marked, a clock, a shelf with jars */
  onX(36, 24, 34, 28, '#fbf8f3', 'rgba(0,0,0,.25)', 0.4); onX(36, 46, 34, 6, '#d0624a', 'none', 0.5);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) onX(37.5 + c * 4.6, 26 + r * 4.8, 3.6, 3.8, (r === 1 && c === 3) ? '#ffcf87' : (r === 2 && c === 5) ? '#9cc2ff' : 'rgba(60,50,40,.14)', 'none', 0.6);
  { const [a, b] = P(0.6, 90, 44); o.push(`<ellipse cx="${f(a)}" cy="${f(b)}" rx="7" ry="8.4" transform="rotate(-30 ${f(a)} ${f(b)})" fill="#fbf8f3" stroke="#3a2e26" stroke-width="1.6"/><line x1="${f(a)}" y1="${f(b)}" x2="${f(a + 1)}" y2="${f(b - 5.5)}" stroke="#3a2e26" stroke-width="1.2"/><line x1="${f(a)}" y1="${f(b)}" x2="${f(a + 4)}" y2="${f(b + 1)}" stroke="#3a2e26" stroke-width="1.2"/>`); }
  box(0, 78, 30, 6, 30, 1.4, '#a07a58', '#8a6648', '#74543a');
  for (let k = 0; k < 4; k++) box(1, 80 + k * 7, 31.4, 4, 4, 5 + (k % 2) * 2, '#e9e2d8', 'rgba(230,220,205,.9)', 'rgba(200,190,175,.9)');

  /* dining table with four chairs and a fruit bowl, warm pendant above */
  glow(82, 74, 28, 110, 'lamp');
  o.push(`<polygon points="${pts([[52, 56, 0], [114, 56, 0], [114, 96, 0], [52, 96, 0]])}" fill="rgba(0,0,0,.3)" filter="url(#blur6)"/>`);
  const chair = (x, y, back) => { for (const [lx, ly] of [[x, y], [x + 11, y], [x, y + 11], [x + 11, y + 11]]) box(lx, ly, 0, 1.4, 1.4, 11, '#4a3426', '#3a281c', '#2e2016');
    box(x, y, 11, 12.4, 12.4, 1.6, '#c9a77a', '#b08e62', '#9a7a52');
    if (back === 'y') box(x, y + 11, 12.6, 12.4, 1.4, 11, '#a07a58', '#8a6648', '#74543a'); else box(x + 11, y, 12.6, 1.4, 12.4, 11, '#a07a58', '#8a6648', '#74543a'); };
  chair(62, 48, 'n'); chair(88, 48, 'n');                                                      // far side, seats tucked
  for (const [lx, ly] of [[58, 60], [104, 60], [58, 88], [104, 88]]) box(lx, ly, 0, 2.2, 2.2, 19, '#5a4030', '#4a3426', '#3a281c');
  box(56, 58, 19, 52, 34, 2.6, '#b08a62', '#9a7650', '#84643f');
  chair(64, 94, 'y'); chair(88, 94, 'y');                                                      // near side
  box(77, 70, 21.6, 12, 12, 2.6, '#f2ece4', '#ddd5c9', '#c9bfb2');
  for (const [dx, dy, id] of [[-3, -5, 'fruitO'], [3, -6, 'fruitG'], [0, -9, 'fruitR'], [5, -3, 'fruitO']]) { const [a, b] = P(83, 76, 24); o.push(`<circle cx="${f(a + dx)}" cy="${f(b + dy)}" r="3.6" fill="url(#${id})"/>`); }
  line([[82, 74, RH], [82, 74, 42]], '#3a2e26', 1);
  { const [a, b] = P(82, 74, 42); o.push(`<path d="M${f(a - 9)},${f(b + 6)} Q${f(a)},${f(b - 6)} ${f(a + 9)},${f(b + 6)} Z" fill="#2f3a36"/><ellipse cx="${f(a)}" cy="${f(b + 6)}" rx="9" ry="2.6" fill="#ffd59a"/>`); }

  /* wheelie bins on the patio: black due tomorrow (glows), brown, green */
  const bin = (x, y, c, due) => { if (due) glow(x + 7, y + 6, 14, 48, 'due');
    o.push(`<polygon points="${pts([[x - 1, y - 1, 0], [x + 15, y - 1, 0], [x + 16, y + 14, 0], [x, y + 14, 0]])}" fill="rgba(0,0,0,.35)" filter="url(#blur2)"/>`);
    box(x, y, 1.5, 13, 12, 22, c, c, c, 'rgba(0,0,0,.35)');
    poly([[x, y + 12, 1.5], [x + 13, y + 12, 1.5], [x + 13, y + 12, 23.5], [x, y + 12, 23.5]], 'rgba(255,255,255,.08)');
    poly([[x + 13, y, 1.5], [x + 13, y + 12, 1.5], [x + 13, y + 12, 23.5], [x + 13, y, 23.5]], 'rgba(0,0,0,.25)');
    box(x - 0.6, y - 0.6, 23.5, 14.2, 13.2, 1.4, c, c, c, 'rgba(0,0,0,.4)');
    poly([[x - 0.6, y - 0.6, 24.9], [x + 13.6, y - 0.6, 24.9], [x + 13.6, y + 12.6, 24.9], [x - 0.6, y + 12.6, 24.9]], 'rgba(255,255,255,.1)');
    const [wx, wy] = P(x + 13, y + 2, 1.6); o.push(`<circle cx="${f(wx)}" cy="${f(wy)}" r="2.6" fill="#1a1a1a"/>`); };
  bin(RW + 14, 8, '#2b2b2e', true); bin(RW + 14, 30, '#6e4a2e'); bin(RW + 14, 52, '#3f6e3f');
};

/* Security: the front of a house with the front door, doorbell camera, a side patio door and a driveway camera. */
const security = (h) => {
  const { S, CO, P, f, pts, o, defs, poly, line, lg, rg, glow, box, onY, onX } = h; // eslint-disable-line no-unused-vars
  lg('wallL', 0, 0, 0, 1, [[0, '#ece3d6'], [1, '#d6c9b8']]);
  lg('wallR', 0, 0, 0, 1, [[0, '#c9baa7'], [1, '#b2a28e']]);
  lg('roofS', 0, 0, 0, 1, [[0, '#5a504a'], [1, '#3e3632']]);
  lg('ground', 0, 0, 1, 1, [[0, '#4a4636'], [1, '#2f2c22']]);
  lg('drive', 0, 0, 1, 1, [[0, '#6e6a64'], [1, '#55514b']]);
  lg('glassR', 0, 0, 0, 1, [[0, '#3a3046'], [1, '#2a2434']]);
  lg('car', 0, 0, 0, 1, [[0, '#5c6e86'], [1, '#3e4c60']]);
  lg('carR', 0, 0, 0, 1, [[0, '#46566c'], [1, '#2f3a4a']]);
  lg('win', 0, 0, 0, 1, [[0, '#ffd89a'], [1, '#f2a65a']]);
  lg('cone', 0, 0, 1, 1, [[0, '#9cc2ff', 0.45], [1, '#9cc2ff', 0.04]]);
  rg('porch', [[0, '#ffd08a', 0.6], [1, '#ffd08a', 0]]);
  rg('ring', [[0, '#7fb7ff', 0.9], [1, '#7fb7ff', 0]]);
  rg('alert', [[0, '#ff6a58', 0.6], [1, '#ff6a58', 0]]);
  rg('ok', [[0, '#8fdc9c', 0.8], [1, '#8fdc9c', 0]]);
  rg('leaf', [[0, '#7c9a58'], [1, '#3f5a2e']]);
  defs.push('<filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter><filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>');

  const W = 110, D = 80, H = 55;
  /* ground, driveway, path */
  poly([[-30, -10, 0], [210, -10, 0], [230, 10, 0], [230, 150, 0], [210, 170, 0], [-30, 170, 0], [-48, 150, 0], [-48, 10, 0]], 'url(#ground)', 'rgba(255,255,255,.08)');
  poly([[W + 8, 10, 0.2], [W + 70, 10, 0.2], [W + 70, 165, 0.2], [W + 8, 165, 0.2]], 'url(#drive)', 'rgba(0,0,0,.25)');
  for (let i = 1; i < 10; i++) line([[W + 8, 10 + i * 15.5, 0.3], [W + 70, 10 + i * 15.5, 0.3]], 'rgba(0,0,0,.18)', 0.7);
  poly([[30, D, 0.2], [46, D, 0.2], [50, 168, 0.2], [26, 168, 0.2]], 'rgba(214,196,170,.35)');
  o.push(`<polygon points="${pts([[4, 6, 0], [W + 30, 6, 0], [W + 40, D + 30, 0], [4, D + 30, 0]])}" fill="rgba(0,0,0,.45)" filter="url(#blur8)"/>`);

  /* camera view on the driveway (drawn under everything else) */
  poly([[W + 2, D - 6, 0.4], [W + 30, 168, 0.4], [W + 76, 150, 0.4]], 'url(#cone)');

  /* walls */
  poly([[0, D, 0], [W, D, 0], [W, D, H], [0, D, H]], 'url(#wallL)', 'rgba(0,0,0,.2)');
  poly([[W, 0, 0], [W, D, 0], [W, D, H], [W, 0, H]], 'url(#wallR)', 'rgba(0,0,0,.2)');
  poly([[W, 0, H], [W, D, H], [W, D / 2, H + 30]], 'url(#wallR)', 'rgba(0,0,0,.2)');
  line([[0, D, 1.5], [W, D, 1.5], [W, 0, 1.5]], 'rgba(0,0,0,.25)', 3);

  /* front door: frame, composite door with glass strip, smart lock (locked = green), step, canopy, porch light */
  glow(38, D + 8, 30, 90, 'porch');
  poly([[30, D + 0.2, 0], [46, D + 0.2, 0], [46, D + 0.2, 38], [30, D + 0.2, 38]], '#2a2420');
  poly([[31.5, D + 0.4, 1], [44.5, D + 0.4, 1], [44.5, D + 0.4, 36.5], [31.5, D + 0.4, 36.5]], '#2f3b4a');
  for (let k = 0; k < 3; k++) poly([[33.5, D + 0.5, 8 + k * 9], [42.5, D + 0.5, 8 + k * 9], [42.5, D + 0.5, 14 + k * 9], [33.5, D + 0.5, 14 + k * 9]], 'rgba(255,255,255,.06)');
  poly([[37.2, D + 0.5, 30], [38.8, D + 0.5, 30], [38.8, D + 0.5, 35], [37.2, D + 0.5, 35]], 'url(#win)');
  box(42, D + 0.4, 15, 2, 1.2, 5, '#1c1c1e', '#232326', '#18181a');
  glow(43, D + 1.8, 16.5, 10, 'ok'); { const [a, b] = P(43, D + 1.7, 16.5); o.push(`<circle cx="${f(a)}" cy="${f(b)}" r="1.3" fill="#8fdc9c"/>`); }
  box(28, D, 38, 20, 8, 2.2, '#4a423c', '#3a332e', '#2e2925');
  box(28, D, 0, 20, 8, 2, '#bfb3a3', '#a99c8b', '#958877');
  box(48.5, D, 30, 3, 2, 4, '#2a2a2a', '#202022', '#18181a');
  { const [a, b] = P(50, D + 2.1, 30); o.push(`<ellipse cx="${f(a)}" cy="${f(b)}" rx="3" ry="1.2" fill="#ffd08a"/>`); }
  /* doorbell camera with a blue ring */
  box(48.5, D, 15, 2.6, 1.2, 6, '#1c1c1e', '#232326', '#18181a');
  glow(49.8, D + 1.3, 18, 22, 'ring'); { const [a, b] = P(49.8, D + 1.3, 18.5); o.push(`<circle cx="${f(a)}" cy="${f(b)}" r="2" fill="none" stroke="#9cc8ff" stroke-width="1.2"/><circle cx="${f(a)}" cy="${f(b)}" r=".9" fill="#111"/>`); }
  /* front windows (lit), sills */
  const winF = (x0) => { poly([[x0, D + 0.2, 20], [x0 + 18, D + 0.2, 20], [x0 + 18, D + 0.2, 42], [x0, D + 0.2, 42]], '#3a2e26');
    poly([[x0 + 1.5, D + 0.4, 21.5], [x0 + 16.5, D + 0.4, 21.5], [x0 + 16.5, D + 0.4, 40.5], [x0 + 1.5, D + 0.4, 40.5]], 'url(#win)');
    line([[x0 + 9, D + 0.5, 21.5], [x0 + 9, D + 0.5, 40.5]], '#3a2e26', 1.4);
    box(x0 - 1, D, 18.5, 20, 3, 1.6, '#f6f1ea', '#e2d8ca', '#cfc2b1');
    box(x0 + 15, D + 0.4, 38, 1.6, 0.8, 2.4, '#f4f4f4', '#e0e0e0', '#c8c8c8'); };          // contact sensor
  winF(6); winF(70);
  /* alarm bell box high on the front wall, blue LED */
  box(88, D, 44, 10, 2.4, 9, '#f2f2f2', '#e2e2e4', '#cacacc');
  poly([[89.5, D + 2.5, 45], [96.5, D + 2.5, 45], [96.5, D + 2.5, 51.5], [89.5, D + 2.5, 51.5]], '#2b5fbf');
  { const [a, b] = P(93, D + 2.6, 48); o.push(`<circle cx="${f(a)}" cy="${f(b)}" r="1.4" fill="#cfe2ff"/>`); }

  /* patio door on the side wall: sliding glass, one panel open (red: open) */
  glow(W + 4, 46, 18, 90, 'alert');
  poly([[W + 0.2, 32, 0], [W + 0.2, 64, 0], [W + 0.2, 64, 38], [W + 0.2, 32, 38]], '#2a2420');
  poly([[W + 0.4, 33.5, 1], [W + 0.4, 47.5, 1], [W + 0.4, 47.5, 36.5], [W + 0.4, 33.5, 36.5]], '#4a2a2a');           // gap: open
  poly([[W + 0.4, 48.5, 1], [W + 0.4, 62.5, 1], [W + 0.4, 62.5, 36.5], [W + 0.4, 48.5, 36.5]], 'url(#glassR)');
  poly([[W + 1.4, 40, 1], [W + 1.4, 54, 1], [W + 1.4, 54, 36.5], [W + 1.4, 40, 36.5]], 'rgba(200,215,240,.18)', 'rgba(255,255,255,.4)'); // slid panel
  line([[W + 0.6, 33, 0.5], [W + 0.6, 63, 0.5]], '#ff6a58', 1.4);
  box(W, 30, 0, 6, 36, 1.2, '#bfb3a3', '#a99c8b', '#958877');

  /* roof (gable along x, front slope visible) */
  const R = (x, t) => [x, D + 6 - t * (D / 2 + 6), H - 3 + t * 33];
  poly([R(-6, 0), R(W + 6, 0), R(W + 6, 1), R(-6, 1)], 'url(#roofS)', 'rgba(0,0,0,.35)');
  for (let t = 0.08; t < 1; t += 0.08) line([R(-6, t), R(W + 6, t)], 'rgba(255,255,255,.06)', 1);
  poly([[W + 6, D + 6, H - 3], [W + 6, D / 2, H + 30], [W + 6, D / 2, H + 27], [W + 6, D + 6, H - 6]], '#2e2724');
  line([R(-6, 1), R(W + 6, 1)], '#2a2421', 3);
  poly([R(-6, 0), R(W + 6, 0), [W + 6, D + 6, H - 6], [-6, D + 6, H - 6]], '#2e2724');
  /* camera under the eave at the front-right corner, aimed at the driveway */
  box(W - 2, D - 6, H - 8, 3, 3, 3, '#e9e9eb', '#d6d6d8', '#c2c2c4');
  box(W + 1, D - 6.5, H - 9.5, 7, 4, 4, '#f2f2f4', '#e0e0e2', '#cbcbcd');
  { const [a, b] = P(W + 8.1, D - 4.5, H - 7.5); o.push(`<circle cx="${f(a)}" cy="${f(b)}" r="1.8" fill="#111"/><circle cx="${f(a + 4)}" cy="${f(b - 3)}" r="1" fill="#ff5a4a"/>`); }

  /* fence along the back of the driveway, plants by the door */
  for (let i = 0; i < 9; i++) box(W + 74, 12 + i * 17, 0, 2, 2, 16, '#6a5240', '#58432f', '#4a3826');
  line([[W + 75, 12, 12], [W + 75, 150, 12]], '#6a5240', 2); line([[W + 75, 12, 6], [W + 75, 150, 6]], '#6a5240', 2);
  const bush = (x, y, r) => { const [a, b] = P(x, y, 0); o.push(`<ellipse cx="${f(a)}" cy="${f(b + 2)}" rx="${r * 2.6}" ry="${r * 1.1}" fill="rgba(0,0,0,.4)" filter="url(#blur2)"/>`);
    for (const [dx, dy, k] of [[-r * 1.1, -r * 0.9, 1.1], [r * 1.1, -r * 0.8, 1], [0, -r * 1.7, 1.25]]) o.push(`<circle cx="${f(a + dx)}" cy="${f(b + dy)}" r="${f(r * k)}" fill="url(#leaf)"/>`); };
  box(18, D + 2, 0, 8, 8, 8, '#4a4440', '#3c3632', '#302b28'); bush(22, D + 6, 6);
  bush(-10, 100, 8); bush(64, 104, 6);
};

/* Vacuum: a living room floor with the robot on its dock and the path it cleaned. */
const vacuum = (h) => {
  const { S, CO, P, f, pts, o, defs, poly, line, lg, rg, glow, box, onY, onX } = h; // eslint-disable-line no-unused-vars
  lg('wallY', 0, 0, 0, 1, [[0, '#e9dfd2'], [1, '#d6c9b8']]);
  lg('wallX', 0, 0, 0, 1, [[0, '#d8ccbc'], [1, '#c2b4a2']]);
  lg('sofa', 0, 0, 0, 1, [[0, '#8a7a9a'], [1, '#6a5c7a']]);
  lg('dock', 0, 0, 0, 1, [[0, '#2f3034'], [1, '#1e1f22']]);
  rg('ok', [[0, '#8fdc9c', 0.75], [1, '#8fdc9c', 0]]);
  rg('lamp', [[0, '#ffd59a', 0.5], [1, '#ffd59a', 0]]);
  rg('leaf', [[0, '#86a85e'], [1, '#3f5a2e']]);
  rg('top', [[0, '#fbfaf8'], [1, '#d9d6d0']]);
  defs.push('<filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter><filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>');

  const RW = 160, RD = 130, RH = 60;
  /* floor: oak planks, slab edge */
  poly([[0, 0, 0], [RW, 0, 0], [RW, RD, 0], [0, RD, 0]], '#8a6446', 'rgba(0,0,0,.3)');
  for (let i = 1; i < 16; i++) line([[i * 10, 0, 0], [i * 10, RD, 0]], 'rgba(40,24,12,.35)', 0.7);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { const y = ((i * 37 + j * 29) % RD); line([[i * 10, y, 0], [i * 10 + 10, y, 0]], 'rgba(40,24,12,.25)', 0.6); }
  poly([[0, RD, 0], [RW, RD, 0], [RW, RD, -5], [0, RD, -5]], '#5a4030'); poly([[RW, 0, 0], [RW, RD, 0], [RW, RD, -5], [RW, 0, -5]], '#4a3426');
  /* walls, wall caps, skirting */
  poly([[0, 0, 0], [RW, 0, 0], [RW, 0, RH], [0, 0, RH]], 'url(#wallY)', 'rgba(0,0,0,.2)');
  poly([[0, 0, 0], [0, RD, 0], [0, RD, RH], [0, 0, RH]], 'url(#wallX)', 'rgba(0,0,0,.2)');
  box(RW, -6, 0, 3, 6, RH, '#f2ebe2', '#dcd2c4', '#c9bdad'); box(-6, RD, 0, 6, 3, RH, '#f2ebe2', '#dcd2c4', '#c9bdad');
  poly([[-6, -6, RH], [RW + 3, -6, RH], [RW + 3, 0, RH], [0, 0, RH], [0, RD + 3, RH], [-6, RD + 3, RH]], '#f6f0e8', 'rgba(0,0,0,.2)');
  onY(0, 0, RW, 3.2, '#f4eee6', 'rgba(0,0,0,.15)', 0.4); onX(0, 0, RD, 3.2, '#e6ded3', 'rgba(0,0,0,.15)', 0.4);

  /* sofa against the x wall: base, seat cushions, back, arms, legs, throw pillows */
  o.push(`<polygon points="${pts([[2, 30, 0], [34, 30, 0], [36, 100, 0], [2, 100, 0]])}" fill="rgba(0,0,0,.3)" filter="url(#blur6)"/>`);
  for (const [lx, ly] of [[4, 32], [28, 32], [4, 94], [28, 94]]) box(lx, ly, 0, 2, 2, 4, '#3a281c', '#2e2016', '#241910');
  box(2, 30, 4, 32, 68, 8, '#8a7a9a', 'url(#sofa)', '#5a4c6a');
  box(2, 30, 12, 8, 68, 16, '#8a7a9a', 'url(#sofa)', '#5a4c6a');
  for (let k = 0; k < 2; k++) box(10, 34 + k * 30, 12, 22, 29, 4, '#9a8aaa', '#8a7a9a', '#76688a');
  box(2, 30, 12, 32, 6, 10, '#8a7a9a', 'url(#sofa)', '#5a4c6a'); box(2, 92, 12, 32, 6, 10, '#8a7a9a', 'url(#sofa)', '#5a4c6a');
  box(11, 40, 16, 4, 12, 10, '#e2b86a', '#cfa458', '#b88f46'); box(11, 76, 16, 4, 12, 10, '#d9e2dc', '#c5cfc8', '#b0bab3');

  /* floor lamp in the corner, glowing */
  glow(8, 12, 50, 70, 'lamp');
  box(6, 10, 0, 6, 6, 1.2, '#2a2a2c', '#202022', '#18181a'); line([[9, 13, 1], [9, 13, 44]], '#2a2a2c', 1.6);
  { const [a, b] = P(9, 13, 46); o.push(`<path d="M${f(a - 8)},${f(b + 4)} L${f(a - 5)},${f(b - 6)} L${f(a + 5)},${f(b - 6)} L${f(a + 8)},${f(b + 4)} Z" fill="#f2e2c4"/><ellipse cx="${f(a)}" cy="${f(b + 4)}" rx="8" ry="2.4" fill="#ffd59a"/>`); }

  /* rug and coffee table */
  poly([[48, 40, 0.3], [128, 40, 0.3], [128, 106, 0.3], [48, 106, 0.3]], '#c8b49a', 'rgba(0,0,0,.2)');
  for (let k = 0; k < 6; k++) line([[52, 46 + k * 10, 0.4], [124, 46 + k * 10, 0.4]], 'rgba(120,90,60,.25)', 1.4);
  for (const [lx, ly] of [[62, 56], [86, 56], [62, 76], [86, 76]]) box(lx, ly, 0, 2, 2, 9, '#4a3426', '#3a281c', '#2e2016');
  box(60, 54, 9, 30, 25, 2.2, '#a07a58', '#8a6648', '#74543a');
  box(68, 60, 11.2, 10, 7, 2.2, '#3f5a2e', '#344a26', '#2a3c1f');                                   // book
  box(80, 66, 11.2, 4, 4, 4, '#f2ece4', '#ddd5c9', '#c9bfb2');                                     // mug

  /* the cleaning path it has done, as a light trail on the floor */
  line([[50, 112, 0.5], [50, 92, 0.5], [134, 92, 0.5], [134, 82, 0.5], [100, 82, 0.5], [100, 30, 0.5], [118, 30, 0.5], [118, 22, 0.5]], 'rgba(255,226,182,.55)', 2.2, 'stroke-dasharray="3 6"');

  /* docking station against the y wall: base plate with ramp, tall body, clean and dirty water tanks, status light */
  o.push(`<polygon points="${pts([[108, 2, 0], [142, 2, 0], [144, 34, 0], [106, 34, 0]])}" fill="rgba(0,0,0,.35)" filter="url(#blur2)"/>`);
  box(110, 2, 0, 30, 30, 1.6, '#2a2b2e', '#232427', '#1c1d20');
  poly([[110, 32, 1.6], [140, 32, 1.6], [140, 38, 0.2], [110, 38, 0.2]], '#35363a');
  box(112, 2, 1.6, 26, 14, 34, '#2f3034', 'url(#dock)', '#18191c');
  box(113, 4, 35.6, 11, 11, 1, '#4a6a8a', '#3e5a76', '#344c64'); box(126, 4, 35.6, 11, 11, 1, '#5a5048', '#4c443d', '#403933');   // tank lids
  poly([[113, 16.2, 22], [124, 16.2, 22], [124, 16.2, 33], [113, 16.2, 33]], 'rgba(120,170,220,.35)');
  poly([[126, 16.2, 22], [137, 16.2, 22], [137, 16.2, 33], [126, 16.2, 33]], 'rgba(150,130,110,.3)');
  glow(125, 16.4, 14, 28, 'ok'); { const [a, b] = P(125, 16.4, 14); o.push(`<circle cx="${f(a)}" cy="${f(b)}" r="2" fill="#8fdc9c"/>`); }

  /* the robot, just docked: body, bumper ring, lidar turret, button and light */
  const disc = (x, y, z, r, h, c1, c2) => { const [cx, cy] = P(x, y, z), rx = r * S * CO * 1.15, ry = rx * 0.5, hh = h * S;
    o.push(`<path d="M${f(cx - rx)},${f(cy)} v${f(-hh)} a${f(rx)},${f(ry)} 0 0 0 ${f(2 * rx)},0 v${f(hh)} a${f(rx)},${f(ry)} 0 0 1 ${f(-2 * rx)},0z" fill="${c2}"/><ellipse cx="${f(cx)}" cy="${f(cy - hh)}" rx="${f(rx)}" ry="${f(ry)}" fill="${c1}" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>`);
    return [cx, cy - hh, rx, ry]; };
  { const [a, b] = P(125, 30, 0); o.push(`<ellipse cx="${f(a)}" cy="${f(b + 2)}" rx="34" ry="14" fill="rgba(0,0,0,.4)" filter="url(#blur2)"/>`); }
  disc(125, 30, 0.6, 14, 3.4, 'url(#top)', '#9c9890');
  disc(125, 30, 4, 13, 0.6, '#e9e6e0', '#b9b5ad');
  disc(125, 30, 4.6, 4.6, 2.4, '#2a2b2e', '#1c1d20');
  { const [a, b] = P(125, 30, 7); o.push(`<ellipse cx="${f(a)}" cy="${f(b)}" rx="5" ry="2.4" fill="none" stroke="#8fdc9c" stroke-width="1"/>`); }
  { const [a, b] = P(129, 38, 4.8); o.push(`<circle cx="${f(a)}" cy="${f(b)}" r="1.6" fill="#8fdc9c"/>`); }

  /* a plant by the dock, and a picture on the y wall */
  box(146, 8, 0, 10, 10, 10, '#c9b49a', '#b39e84', '#9c876e');
  { const [a, b] = P(151, 13, 10); for (const [dx, dy, r] of [[-6, -8, 7], [6, -9, 7], [0, -17, 9], [-8, -20, 5], [8, -22, 5]]) o.push(`<circle cx="${f(a + dx)}" cy="${f(b + dy)}" r="${r}" fill="url(#leaf)"/>`); }
  onY(40, 32, 40, 18, '#3a2e26', 'rgba(0,0,0,.3)', 0.4); onY(42, 34, 36, 14, '#d6b48a', 'none', 0.6); onY(44, 35, 14, 9, '#8a6a4a', 'none', 0.7); onY(60, 36, 16, 10, '#6a8a9a', 'none', 0.7);
};

/* System: network kit on a sideboard (router, switch, hub, NAS, UPS) and a small status screen. */
const system = (h) => {
  const { S, CO, P, f, pts, o, defs, poly, line, lg, rg, glow, box, onY, onX } = h; // eslint-disable-line no-unused-vars
  lg('wallY', 0, 0, 0, 1, [[0, '#e3dbd0'], [1, '#cfc4b5']]);
  lg('wallX', 0, 0, 0, 1, [[0, '#d2c7b8'], [1, '#bcae9c']]);
  lg('dark', 0, 0, 0, 1, [[0, '#34353a'], [1, '#222327']]);
  lg('oak', 0, 0, 0, 1, [[0, '#b08a62'], [1, '#94704c']]);
  lg('screen', 0, 0, 1, 1, [[0, '#1d2a3a'], [1, '#101820']]);
  rg('ok', [[0, '#8fdc9c', 0.7], [1, '#8fdc9c', 0]]);
  rg('warn', [[0, '#f4c860', 0.7], [1, '#f4c860', 0]]);
  rg('blue', [[0, '#7fb7ff', 0.6], [1, '#7fb7ff', 0]]);
  rg('leaf', [[0, '#86a85e'], [1, '#3f5a2e']]);
  defs.push('<filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter><filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>');
  const led = (x, y, z, c, r = 1.3) => { const [a, b] = P(x, y, z); o.push(`<circle cx="${f(a)}" cy="${f(b)}" r="${r}" fill="${c}"/>`); };

  const RW = 140, RD = 110, RH = 60;
  /* floor: grey vinyl tiles, slab edge */
  poly([[0, 0, 0], [RW, 0, 0], [RW, RD, 0], [0, RD, 0]], '#8f8a84', 'rgba(0,0,0,.3)');
  for (let i = 1; i < 7; i++) line([[i * 20, 0, 0.1], [i * 20, RD, 0.1]], 'rgba(0,0,0,.15)', 0.7);
  for (let j = 1; j < 6; j++) line([[0, j * 20, 0.1], [RW, j * 20, 0.1]], 'rgba(0,0,0,.15)', 0.7);
  poly([[0, RD, 0], [RW, RD, 0], [RW, RD, -5], [0, RD, -5]], '#5a5550'); poly([[RW, 0, 0], [RW, RD, 0], [RW, RD, -5], [RW, 0, -5]], '#4a4642');
  /* walls, caps, skirting */
  poly([[0, 0, 0], [RW, 0, 0], [RW, 0, RH], [0, 0, RH]], 'url(#wallY)', 'rgba(0,0,0,.2)');
  poly([[0, 0, 0], [0, RD, 0], [0, RD, RH], [0, 0, RH]], 'url(#wallX)', 'rgba(0,0,0,.2)');
  box(RW, -6, 0, 3, 6, RH, '#f2ebe2', '#dcd2c4', '#c9bdad'); box(-6, RD, 0, 6, 3, RH, '#f2ebe2', '#dcd2c4', '#c9bdad');
  poly([[-6, -6, RH], [RW + 3, -6, RH], [RW + 3, 0, RH], [0, 0, RH], [0, RD + 3, RH], [-6, RD + 3, RH]], '#f6f0e8', 'rgba(0,0,0,.2)');
  onY(0, 0, RW, 3, '#f0eae2', 'rgba(0,0,0,.15)', 0.4); onX(0, 0, RD, 3, '#e2dad0', 'rgba(0,0,0,.15)', 0.4);

  /* low oak sideboard along the y wall, two doors and open shelf */
  o.push(`<polygon points="${pts([[20, 2, 0], [124, 2, 0], [126, 26, 0], [18, 26, 0]])}" fill="rgba(0,0,0,.3)" filter="url(#blur6)"/>`);
  box(20, 0, 0, 104, 22, 22, '#b08a62', 'url(#oak)', '#7c5c3e');
  for (const dx of [22, 48]) { onY(dx, 2, 24, 18, 'rgba(255,255,255,.04)', 'rgba(0,0,0,.28)', 22.1); line([[dx + 21, 22.2, 11], [dx + 21, 22.2, 14]], '#2a2420', 1.6); }
  onY(76, 2, 46, 18, '#5a4030', 'rgba(0,0,0,.3)', 22.1);
  /* router in the open shelf? no: router and hub on top, NAS inside the open shelf */
  box(80, 6, 2, 22, 14, 14, '#2f3034', 'url(#dark)', '#18191c');                                  // NAS
  for (let k = 0; k < 4; k++) { poly([[82 + k * 4.6, 20.1, 4], [85.6 + k * 4.6, 20.1, 4], [85.6 + k * 4.6, 20.1, 14], [82 + k * 4.6, 20.1, 14]], '#1a1b1e', 'rgba(255,255,255,.08)'); led(83.8 + k * 4.6, 20.3, 12.4, k === 2 ? '#f4c860' : '#8fdc9c'); }
  glow(91, 20.4, 12, 24, 'warn');
  box(106, 6, 2, 14, 14, 8, '#e9e6e0', '#d6d2ca', '#bfbab0');                                       // UPS
  led(108, 20.2, 8, '#8fdc9c', 1.1);

  /* on top: router with antennas, network switch, hub puck */
  box(30, 4, 22, 30, 14, 4, '#f2f0ec', '#dedbd5', '#c9c5bd');
  for (const ax of [33, 57]) { line([[ax, 6, 26], [ax - 1, 5, 40]], '#e9e6e0', 2.2); led(ax - 1, 5, 40, '#e9e6e0', 1.4); }
  for (let k = 0; k < 6; k++) led(34 + k * 3.6, 18.3, 24, k < 5 ? '#8fdc9c' : 'rgba(143,220,156,.35)', 1);
  glow(45, 18.4, 24, 30, 'ok');
  box(66, 6, 22, 22, 10, 3, '#2f3034', 'url(#dark)', '#18191c');                                    // switch
  for (let k = 0; k < 8; k++) { poly([[67.5 + k * 2.5, 16.1, 23], [69.2 + k * 2.5, 16.1, 23], [69.2 + k * 2.5, 16.1, 24.6], [67.5 + k * 2.5, 16.1, 24.6]], '#0e0f11'); if (k < 5) led(68.3 + k * 2.5, 16.2, 25.2, '#8fdc9c', 0.7); }
  { const [a, b] = P(104, 12, 22); o.push(`<ellipse cx="${f(a)}" cy="${f(b)}" rx="11" ry="5.2" fill="#d9d6d0"/><rect x="${f(a - 11)}" y="${f(b - 4)}" width="22" height="4" fill="#d9d6d0"/><ellipse cx="${f(a)}" cy="${f(b - 4)}" rx="11" ry="5.2" fill="#f4f2ee" stroke="rgba(0,0,0,.2)" stroke-width=".8"/><circle cx="${f(a)}" cy="${f(b - 4)}" r="2" fill="#7fb7ff"/>`); }
  glow(104, 12, 24, 26, 'blue');
  /* cables down the back */
  for (const [cx, c] of [[40, '#3a7ae0'], [44, '#e0e0e0'], [76, '#3a7ae0'], [80, '#f4c860']]) line([[cx, 1, 22], [cx, 1, 2], [cx + 6, 1, 0.5]], c, 1.2);

  /* wall: a small screen showing the Home Assistant status, a wall clock */
  box(46, 0, 32, 40, 2.4, 22, '#1b1c1f', '#151619', '#0f1012');
  poly([[47.5, 2.5, 33.5], [84.5, 2.5, 33.5], [84.5, 2.5, 52.5], [47.5, 2.5, 52.5]], 'url(#screen)');
  for (let k = 0; k < 3; k++) { poly([[50 + k * 11.4, 2.6, 40], [59 + k * 11.4, 2.6, 40], [59 + k * 11.4, 2.6, 49], [50 + k * 11.4, 2.6, 49]], 'rgba(255,255,255,.08)'); led(52 + k * 11.4, 2.7, 47, k === 1 ? '#f4c860' : '#8fdc9c', 1.2); }
  for (let k = 0; k < 2; k++) line([[50, 2.6, 37.4 - k * 2.2], [70 - k * 8, 2.6, 37.4 - k * 2.2]], 'rgba(255,255,255,.35)', 0.8);
  glow(66, 3, 43, 60, 'blue');
  { const [a, b] = P(0.6, 30, 44); o.push(`<ellipse cx="${f(a)}" cy="${f(b)}" rx="7" ry="8.4" transform="rotate(-30 ${f(a)} ${f(b)})" fill="#fbf8f3" stroke="#3a2e26" stroke-width="1.6"/><line x1="${f(a)}" y1="${f(b)}" x2="${f(a + 1)}" y2="${f(b - 5.5)}" stroke="#3a2e26" stroke-width="1.2"/><line x1="${f(a)}" y1="${f(b)}" x2="${f(a + 4)}" y2="${f(b + 1)}" stroke="#3a2e26" stroke-width="1.2"/>`); }

  /* desk chair and a plant for scale */
  box(8, 60, 0, 14, 14, 14, '#c9b49a', '#b39e84', '#9c876e');
  { const [a, b] = P(15, 67, 14); for (const [dx, dy, r] of [[-8, -10, 9], [7, -12, 9], [0, -22, 11], [-10, -26, 7], [10, -28, 7]]) o.push(`<circle cx="${f(a + dx)}" cy="${f(b + dy)}" r="${r}" fill="url(#leaf)"/>`); }
  o.push(`<polygon points="${pts([[64, 48, 0], [88, 48, 0], [90, 72, 0], [62, 72, 0]])}" fill="rgba(0,0,0,.3)" filter="url(#blur2)"/>`);
  for (const [lx, ly] of [[64, 50], [84, 50], [64, 68], [84, 68], [74, 59]]) box(lx, ly, 0, 2, 2, 1.4, '#2a2a2c', '#202022', '#18181a');
  box(74, 59, 1.4, 2, 2, 12, '#2a2a2c', '#202022', '#18181a');
  box(64, 50, 13.4, 22, 20, 3, '#3e4a5a', '#334050', '#2a3442');
  box(64, 50, 16.4, 22, 4, 16, '#3e4a5a', '#334050', '#2a3442');
};

const DRAW = { energy, climate, family, security, vacuum, system };
const cache = {};
/* The drawing for a page key, or '' when the page has none. Built once, then reused. */
export function sceneArt(key) {
  if (!DRAW[key]) return '';
  if (!cache[key]) cache[key] = draw(key, DRAW[key]);
  return cache[key];
}
