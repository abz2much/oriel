/* Energy page: live flow, battery, today, house use chart, solar forecast, big consumers and a health strip.
   Read-only: it never calls a service. Everything comes from config.energy. */
import { registerPage } from '../core.js';
import { S, t } from '../strings.js';
import { hasEntities } from '../config.js';
import { isEnt, cap, pad, hm, esc, el, parseHistory, binsOf, wattHours } from '../util.js';
import { ENERGY, STRING_COL } from '../theme/fixed.js';

const P = {
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  down: 'M12 4v12M7 11l5 5 5-5M5 20h14', up: 'M12 20V8M7 13l5-5 5 5M5 4h14', eur: 'M17 6a6 6 0 100 12M5 10h9M5 14h9',
  heatp: 'M4 6h16v12H4zM8 12a3 3 0 106 0 3 3 0 00-6 0M17 9v6',
  dryer: 'M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zM12 9a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM10 14c1-2 3-2 4 0M7.5 6h.01',
  washer: 'M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zM12 9a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM7.5 6h.01M10.5 6h.01',
  dish: 'M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zM4 8h16M12 12a3.5 3.5 0 100 7 3.5 3.5 0 000-7z',
  oven: 'M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM3 9h18M7 13h10v4H7z',
  micro: 'M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zM15 9v6M7 9h5v6H7z',
  cook: 'M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zM6 9a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0M13.6 9a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0M9.8 15a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2', lock: 'M6 11h12v9H6zM9 11V8a3 3 0 016 0v3',
  leaf: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19c3-5 6-8 9-10', bat: 'M3 8h15a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1zM21 11v2M6 11v2',
  home2: 'M4 11l8-7 8 7v9H4z',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || P.bolt}"/></svg>`;
const sv = el;
const k2 = (v) => v.toFixed(2);
/* an amount that shows as zero (0.00 kW, £0.00) gets the class z: dimmed on the phone */
const zero = (el) => el.classList.toggle('z', /\d/.test(el.textContent) && !/[1-9]/.test(el.textContent));
const nice = (s) => cap(String(s).replace(/_/g, ' '));

const CSS = `
#pgEnergy .abs{position:absolute}
#enWrap{position:absolute;left:var(--dx,0px);top:0;width:1280px;height:800px;pointer-events:none}
#enWrap>*{pointer-events:auto}
#pgEnergy .ic{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
#pgEnergy .hd{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500}
#pgEnergy .hd small{font-size:12px;font-weight:400;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}
#pgEnergy .dark .hd small,#pgEnergy .black .hd small{color:rgba(var(--oriel-on-dark),.6)}
#pgEnergy .chip{white-space:nowrap}
#pgEnergy .chip.sm{height:26px;font-size:12px;padding:0 10px}
#pgEnergy .chip.dk{background:rgba(var(--oriel-on-dark),.1);border-color:rgba(var(--oriel-on-dark),.16);color:rgb(var(--oriel-on-dark))}
#pgEnergy .chip.tp{position:relative;cursor:pointer}
#pgEnergy .chip.tp::after{content:"";position:absolute;left:-4px;right:-4px;top:min(0px,calc(50% - 23px));bottom:min(0px,calc(50% - 23px))}
#enBBig{position:relative} #enBBig::after{content:"";position:absolute;top:min(0px,calc(50% - 23px));bottom:min(0px,calc(50% - 23px));left:min(0px,calc(50% - 23px));right:min(0px,calc(50% - 23px))}
#pgEnergy .tap{cursor:pointer}
#enFlow{left:100px;top:84px;width:560px;height:350px;overflow:hidden}
#enFlow .hd{position:absolute;left:18px;right:18px;top:14px}
#enSvg{position:absolute;left:-1px;top:-1px;pointer-events:none}
#enFlow .ln{fill:none;stroke:rgba(var(--oriel-ink),.16);stroke-width:2.5;stroke-linecap:round}
#enFlow .fl{fill:none;stroke-width:3.5;stroke-linecap:round;stroke-dasharray:6 8;opacity:0;animation:enmv 1s linear infinite}
#enFlow .fl.on{opacity:1}
@keyframes enmv{to{stroke-dashoffset:-14}}
@media (prefers-reduced-motion:reduce){#enFlow .fl{animation:none}}
#enFlow .fp{position:absolute;transform:translate(-50%,-50%);height:24px;padding:0 10px;border-radius:12px;background:rgba(var(--oriel-glass),.88);font-size:12.5px;font-weight:500;display:none;align-items:center;white-space:nowrap;box-shadow:0 4px 10px rgba(var(--oriel-shadow),.16);font-variant-numeric:tabular-nums;pointer-events:none}
#enFlow .fp.on{display:flex}
#enFlow .nd{position:absolute;border-radius:22px;background:rgba(var(--oriel-glass),.62);border:1px solid rgba(var(--oriel-glass),.75);box-shadow:0 10px 22px rgba(var(--oriel-shadow),.16);padding:10px 12px;cursor:pointer;color:rgb(var(--oriel-ink))}
#enFlow .nd .l{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));display:flex;align-items:center;gap:6px}
#enFlow .nd .l i{width:7px;height:7px;border-radius:50%;display:block}
#enFlow .nd .v{font-size:26px;font-weight:200;line-height:1.1;margin-top:2px;font-variant-numeric:tabular-nums;white-space:nowrap}
#enFlow .nd .v em{font-style:normal;font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));margin-left:3px}
#enFlow .nd .s{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#enSol{left:170px;top:10px;width:220px;height:130px;padding:8px 12px;text-align:center}
#enSol .l{justify-content:center}#enSol .v{font-size:28px;margin-top:0}
#enSol svg{margin:3px auto 2px}
#enSol .s b{font-weight:500;color:rgb(var(--oriel-ink))}
#enBat{left:14px;top:222px;width:120px;height:96px}
#enHouse{left:220px;top:222px;width:120px;height:96px}
#enGrid{left:426px;top:222px;width:120px;height:96px}
#enBat .bar2{height:5px;border-radius:3px;background:rgba(var(--oriel-ink),.14);margin-top:6px;overflow:hidden}
#enBat .bar2 i{display:block;height:100%;background:rgb(var(--oriel-accent-strong));border-radius:3px}
#enNote{position:absolute;left:18px;right:18px;bottom:12px;font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));text-align:center;pointer-events:none}
#enBatC{left:676px;top:84px;width:280px;height:350px;padding:14px 16px;display:flex;flex-direction:column;overflow:hidden}
#enBatC .big{font-size:42px;font-weight:200;line-height:1;margin-top:2px;font-variant-numeric:tabular-nums}
#enBatC .big em{font-style:normal;font-size:20px;color:rgba(var(--oriel-on-dark),.6);margin-left:2px}
#enBatC .sbar{position:relative;height:8px;border-radius:4px;background:rgba(var(--oriel-on-dark),.14);margin-top:8px}
#enBatC .sbar i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:rgb(var(--oriel-accent))}
#enBatC .sbar u{position:absolute;top:-3px;bottom:-3px;width:2px;background:rgba(var(--oriel-on-dark),.7);border-radius:1px}
#enBatC .sbl{display:flex;justify-content:space-between;font-size:12px;color:rgba(var(--oriel-on-dark),.6);margin-top:4px}
#enEst{font-size:12.5px;line-height:1.3;margin-top:5px;color:rgb(var(--oriel-accent));min-height:32px}
#enPacks{flex:1;min-height:0;display:flex;flex-direction:column}
#enBatC .pk{display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center;border-radius:16px;background:rgba(var(--oriel-on-dark),.07);border:1px solid rgba(var(--oriel-on-dark),.1);padding:5px 12px;margin-top:5px;cursor:pointer;flex:1 1 0;min-height:38px;max-height:56px;overflow:hidden}
#enBatC .pk b{font-weight:400;font-size:13.5px}
#enBatC .pk .p{font-size:20px;font-weight:200;text-align:right;font-variant-numeric:tabular-nums}
#enBatC .pk small{grid-column:1/-1;font-size:12px;color:rgba(var(--oriel-on-dark),.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#enToday{left:972px;top:84px;width:284px;height:350px;padding:16px}
#enTg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}
#enTg .tl{border-radius:18px;background:rgba(var(--oriel-glass),.34);border:1px solid rgba(var(--oriel-glass),.5);padding:9px 11px;height:84px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;min-width:0;color:rgb(var(--oriel-ink))}
#enTg .tl small{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));display:flex;align-items:center;gap:5px;white-space:nowrap}
#enTg .tl small .ic{width:14px;height:14px}
#enTg .tl b{font-weight:300;font-size:25px;font-variant-numeric:tabular-nums;white-space:nowrap}
#enTg .tl b em{font-style:normal;font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));margin-left:2px}
#enTg .tl .n{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));white-space:nowrap}
#enTg .tl.good b{color:rgb(var(--oriel-good))}#enTg .tl.bad b{color:rgb(var(--oriel-bad))}
#enChart{left:100px;top:450px;width:400px;height:272px;padding:16px}
#enChart .k{font-size:30px;font-weight:200;margin-top:6px;font-variant-numeric:tabular-nums}
#enChart .k small{font-size:13px;color:rgba(var(--oriel-on-dark),.6);margin-left:4px;font-weight:300}
#enChart .u{font-size:12px;color:rgb(var(--oriel-accent));margin-top:2px;min-height:15px}
#enChart .lg{display:flex;gap:10px;font-size:12px;color:rgba(var(--oriel-on-dark),.6);margin-top:2px}
#enChart .lg span{display:flex;align-items:center;gap:5px}#enChart .lg i{width:10px;height:10px;border-radius:3px;display:block}
#enFc{left:516px;top:450px;width:404px;height:272px;padding:16px}
#enFc .ch{display:flex;gap:6px;margin-top:8px;flex-wrap:nowrap}
#enFc .bands{display:flex;gap:10px;font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));margin-top:6px}
#enFc .bands span{display:flex;align-items:center;gap:5px}#enFc .bands i{width:9px;height:9px;border-radius:50%;display:block}
#enCons{left:936px;top:450px;width:320px;height:272px;padding:14px}
#enCons .hp{border-radius:20px;margin-top:8px;padding:10px 14px;height:96px;display:grid;grid-template-columns:1fr auto;align-content:space-between;cursor:pointer}
#enCons .hp .a{font-size:13px;display:flex;align-items:center;gap:8px}#enCons .hp .a .ic{color:${ENERGY.heat}}
#enCons .hp .w{font-size:32px;font-weight:200;text-align:right;font-variant-numeric:tabular-nums}
#enCons .hp .w em{font-style:normal;font-size:13px;color:rgba(var(--oriel-on-dark),.6);margin-left:3px}
#enCons .hp .m{grid-column:1/-1;font-size:12px;color:rgba(var(--oriel-on-dark),.65);display:flex;justify-content:space-between;gap:8px;white-space:nowrap}
#enCons .ap2{height:46px;border-radius:16px;margin-top:6px;display:flex;align-items:center;gap:10px;padding:0 12px;font-size:13px;background:rgba(var(--oriel-glass),.28);border:1px solid rgba(var(--oriel-glass),.5);cursor:pointer;color:rgb(var(--oriel-ink))}
#enCons .ap2 small{margin-left:auto;font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));white-space:nowrap}
#enCons .ap2.run{background:rgba(var(--oriel-glass),.66);box-shadow:0 0 0 1.5px ${ENERGY.running},0 0 16px 2px ${ENERGY.running}}
#enCons .ap2.run small{color:rgb(var(--oriel-ink))}
#enHealth{left:100px;top:734px;width:1156px;height:42px;border-radius:21px;display:flex;align-items:center;gap:6px;padding:0 8px 0 10px}
#enHealth .chip{height:28px;font-size:12px;padding:0 10px;gap:6px}
#enHealth .sp{flex:1}
#enHealth .dot{width:8px;height:8px;border-radius:50%;background:rgb(var(--oriel-good-mark));display:block}
#enHealth .dot.bad{background:rgb(var(--oriel-bad-mark))}
`;

const HTML = () => `<div id="enWrap">
  <div id="enFlow" class="abs glass mid">
    <div class="hd"><span>${esc(S.live_flow)}</span><span class="chip sm" id="enClock">${ic('clock')}<span>--:--</span></span></div>
    <svg id="enSvg" width="560" height="350" viewBox="0 0 560 350" aria-hidden="true">
      <path class="ln" d="M280 140V222"/><path class="ln" d="M232 140C232 184 74 176 74 222"/><path class="ln" d="M328 140C328 184 486 176 486 222"/>
      <path class="ln" d="M134 270H220"/><path class="ln" d="M340 270H426"/>
      <path id="enFSH" class="fl" stroke="${ENERGY.solar}" d="M280 140V222"/>
      <path id="enFSB" class="fl" stroke="${ENERGY.solar}" d="M232 140C232 184 74 176 74 222"/>
      <path id="enFSG" class="fl" stroke="${ENERGY.solar}" d="M328 140C328 184 486 176 486 222"/>
      <path id="enFBH" class="fl" stroke="${ENERGY.batt}" d="M134 270H220"/>
      <path id="enFHB" class="fl" stroke="${ENERGY.grid}" d="M220 270H134"/>
      <path id="enFGH" class="fl" stroke="${ENERGY.grid}" d="M426 270H340"/>
      <path id="enFHG" class="fl" stroke="${ENERGY.solar}" d="M340 270H426"/>
    </svg>
    <span class="fp" id="enPSH" style="left:280px;top:181px"></span>
    <span class="fp" id="enPSB" style="left:153px;top:181px"></span>
    <span class="fp" id="enPSG" style="left:407px;top:181px"></span>
    <span class="fp" id="enPBH" style="left:177px;top:270px"></span>
    <span class="fp" id="enPGH" style="left:383px;top:270px"></span>
    <div class="nd" id="enSol"><div class="l"><i style="background:${ENERGY.solarDot}"></i>${esc(S.solar)}</div><div class="v" id="enVSol">–</div><svg id="enArr" width="124" height="50" viewBox="0 0 124 50" aria-hidden="true"></svg><div class="s" id="enSPV"></div></div>
    <div class="nd" id="enBat"><div class="l"><i style="background:${ENERGY.batt}"></i>${esc(S.battery)}</div><div class="v" id="enVBat">–</div><div class="s" id="enSBat"></div><div class="bar2"><i id="enBBat"></i></div></div>
    <div class="nd" id="enHouse"><div class="l"><i style="background:${ENERGY.house}"></i>${esc(S.house)}</div><div class="v" id="enVHouse">–</div><div class="s">${esc(S.home_load)}</div></div>
    <div class="nd" id="enGrid"><div class="l"><i style="background:${ENERGY.gridDot}"></i>${esc(S.flow_grid)}</div><div class="v" id="enVGrid">–</div><div class="s" id="enSGrid"></div></div>
    <div id="enNote">${esc(S.grid_derived_note)}</div>
  </div>
  <div id="enBatC" class="abs dark">
    <div class="hd"><span>${esc(S.battery)}</span><span class="chip sm dk" id="enBState"></span></div>
    <div class="big tap" id="enBBig"><span id="enBSoc">–</span><em>%</em></div>
    <div class="sbar"><i id="enBFill"></i><u id="enBRes"></u></div>
    <div class="sbl"><span id="enBResT"></span><span id="enBKwh"></span></div>
    <div id="enEst"></div>
    <div id="enPacks"></div>
    <div class="sbl" style="margin-top:6px" id="enBWarR"><span>${esc(S.warranty_cycles)}</span><span id="enBWar">–</span></div>
  </div>
  <div id="enToday" class="abs glass">
    <div class="hd"><span>${esc(S.today)}</span><span class="chip sm tp" id="enPrice">–</span></div>
    <div id="enTg"></div>
  </div>
  <div id="enChart" class="abs black tap">
    <div class="hd"><span>${esc(S.house_use_vs)}</span></div>
    <div class="k"><span id="enCTot">–</span><small>${esc(S.kwh_used_so_far)}</small></div>
    <div class="u" id="enCUp"></div>
    <svg id="enCh" viewBox="0 0 368 126" width="368" height="126" style="margin-top:8px" aria-hidden="true"></svg>
    <div class="lg"><span><i style="background:rgb(var(--oriel-on-dark))"></i>${esc(S.today)}</span><span><i style="border:1px dashed rgba(var(--oriel-on-dark),.5)"></i>${esc(S.yesterday)}</span><span id="enLgSol"><i style="background:rgb(var(--oriel-accent))"></i>${esc(S.solar_today)}</span></div>
  </div>
  <div id="enFc" class="abs glass">
    <div class="hd"><span>${esc(S.solar_forecast)}</span><span class="chip sm on tp" id="enFPeak">${ic('sun')}<span></span></span></div>
    <div class="ch"><span class="chip sm tp" id="enFLeft">–</span><span class="chip sm tp" id="enFTom">–</span></div>
    <svg id="enFcS" viewBox="0 0 372 142" width="372" height="142" style="margin-top:6px"></svg>
    <div class="bands"><span><i style="background:${ENERGY.bandHigh}"></i><b id="enBand2" style="font-weight:400"></b></span><span><i style="background:${ENERGY.bandMid}"></i><b id="enBand1" style="font-weight:400"></b></span><span><i style="background:${ENERGY.bandLow}"></i><b id="enBand0" style="font-weight:400"></b></span></div>
  </div>
  <div id="enCons" class="abs glass mid">
    <div class="hd"><span>${esc(S.big_consumers)}</span><small>${esc(S.energy_used)}</small></div>
    <div class="hp dark" id="enHpBox"><div class="a">${ic('heatp')}${esc(S.heat_pump)}</div><div class="w"><span id="enHpW">–</span><em>kW</em></div><div class="m"><span id="enHpD"></span><span id="enHpM"></span></div></div>
    <div id="enMach"></div>
  </div>
  <div id="enHealth" class="abs glass mid"></div>
</div>`;

const EnergyExt = {
  _enInitPage() {
    const pg = document.createElement('div');
    pg.id = 'pgEnergy'; pg.innerHTML = HTML();
    const $ = (id) => pg.querySelector('#' + id);
    this._enc = this._c.energy;
    this._en = { hist: null, histAt: 0, busy: false, $ };
    this._enBuild($);
    return pg;
  },
  _enTap(node, id) { if (!node || !isEnt(id)) return; node.style.cursor = 'pointer'; this.tap(node, (e) => { e.stopPropagation(); this.moreInfo(id); }); },
  _enSolar() { return this._enc.solar_power || this._c.home.energy_card.solar_power; },
  _enHouse() { return this._enc.house_power || this._c.home.energy_card.house_power; },
  _enGridEnt() { const g = this._enc.grid; return g.mode === 'derived' ? g.inverter_ac : g.entity; },
  _enSocIds() { return (this._enc.battery.soc || []).filter(isEnt); },
  _enSocFallback() { return this._c.home.energy_card.battery_soc; },

  _enBuild($) {
    const c = this._enc, E = this._en, B = c.battery, TD = c.today, FC = c.forecast, HL = c.health;
    const sol = this._enSolar(), house = this._enHouse(), grid = this._enGridEnt();
    const hasBatt = isEnt(c.battery_power) || this._enSocIds().length > 0 || isEnt(this._enSocFallback());
    // solar array: rows x columns, panels assigned to PV strings in reading order
    const arr = $('enArr'); E.panels = [];
    const rows = Math.max(1, (c.panels || {}).rows || 3), cols = Math.max(1, (c.panels || {}).columns || 5);
    const strings = (c.pv_strings || []).filter((s) => s && isEnt(s.entity));
    const owner = []; strings.forEach((s, si) => { for (let k = 0; k < (Number(s.panels) || 0); k++) owner.push(si); });
    const px = 125 / cols, py = 51 / rows;
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const i = r * cols + q, si = owner[i] !== undefined ? owner[i] : (strings.length ? strings.length - 1 : 0);
      E.panels.push([sv('rect', { x: q * px, y: r * py, width: px - 3, height: py - 3, rx: 2.5, fill: STRING_COL[0][0], stroke: 'rgba(var(--oriel-glass),.7)', 'stroke-width': .8 }, arr), si]);
    }
    E.strings = strings;
    $('enSPV').classList.toggle('hide', !strings.length);
    this._enTap($('enSol'), sol); this._enTap($('enBat'), c.battery_power); this._enTap($('enHouse'), house); this._enTap($('enGrid'), grid);
    this._enTap($('enBBig'), isEnt(this._enSocFallback()) ? this._enSocFallback() : this._enSocIds()[0]); this._enTap($('enPrice'), c.price);
    this._enTap($('enChart'), house); this._enTap($('enFLeft'), FC.remaining_today); this._enTap($('enFTom'), (FC.days || [])[1]); this._enTap($('enFPeak'), FC.peak_today);
    this._enTap($('enHpBox'), c.consumers.heat_pump.power);
    $('enNote').classList.toggle('hide', c.grid.mode !== 'derived');
    $('enFlow').classList.toggle('hide', !isEnt(sol) && !isEnt(house));
    // battery card and packs
    E.packs = (B.packs || []).filter((p) => p && [p.soc, p.health, p.cycles, p.temperature].some(isEnt)).map((p, i) => {
      const d = document.createElement('div'); d.className = 'pk';
      d.innerHTML = '<b></b><span class="p">–</span><small></small>'; d.firstChild.textContent = p.name || t('pack_n', { n: i + 1 });
      $('enPacks').appendChild(d); this._enTap(d, p.soc || p.health);
      return { p, d, v: d.querySelector('.p'), s: d.querySelector('small') };
    });
    $('enBWarR').classList.toggle('hide', !(Number(B.warranty_cycles) > 0) || !E.packs.some((x) => isEnt(x.p.cycles)));
    $('enBatC').classList.toggle('hide', !hasBatt);
    // today tiles
    E.tiles = [['sun', S.solar_yield, TD.solar_yield, ''], ['home2', S.house_use, TD.house_use, ''], ['down', S.grid_import, TD.grid_import, 'bad'], ['up', S.grid_export, TD.grid_export, 'good'], ['eur', S.net_cost, TD.net_cost, 'bad', true], ['bat', S.battery_charged, TD.battery_charged, '']]
      .filter((x) => isEnt(x[2])).map((x) => {
        const d = document.createElement('div'); d.className = 'tl ' + x[3];
        d.innerHTML = `<small>${ic(x[0])}<span></span></small><b>–</b><span class="n">&nbsp;</span>`; d.querySelector('small span').textContent = x[1];
        $('enTg').appendChild(d); this._enTap(d, x[2]);
        return { x, money: !!x[4], d, b: d.querySelector('b'), n: d.querySelector('.n') };
      });
    $('enPrice').classList.toggle('hide', !isEnt(c.price));
    $('enToday').classList.toggle('hide', !E.tiles.length && !isEnt(c.price));
    // chart, forecast
    $('enChart').classList.toggle('hide', !isEnt(house));
    $('enLgSol').classList.toggle('hide', !isEnt(sol));
    const bands = FC.bands && FC.bands.length === 2 ? FC.bands : [10, 20];
    $('enBand2').textContent = t('band_high', { n: bands[1] }); $('enBand1').textContent = t('band_mid', { a: bands[0], b: bands[1] }); $('enBand0').textContent = t('band_low', { n: bands[0] });
    $('enFLeft').classList.toggle('hide', !isEnt(FC.remaining_today)); $('enFTom').classList.toggle('hide', !isEnt((FC.days || [])[1]));
    $('enFPeak').classList.toggle('hide', !isEnt(FC.peak_today) && !isEnt(FC.peak_tomorrow));
    $('enFc').classList.toggle('hide', !(FC.days || []).some(isEnt) && !isEnt(FC.remaining_today));
    // consumers
    const HP = c.consumers.heat_pump;
    $('enHpBox').classList.toggle('hide', !isEnt(HP.power));
    const apps = this.appliances();
    E.mach = (c.consumers.appliances || []).map((nm) => {
      const a = apps.find((x) => x.name === nm); if (!a) return null;
      const d = document.createElement('div'); d.className = 'ap2'; d.innerHTML = `${ic(a.icon)}<span></span><small>–</small>`; d.children[1].textContent = a.name; $('enMach').appendChild(d);
      this._enTap(d, a.state); return { a, d, s: d.querySelector('small') };
    }).filter(Boolean);
    $('enCons').classList.toggle('hide', !isEnt(HP.power) && !E.mach.length);
    // health strip
    const h = $('enHealth'), mk = (id, show) => { const s = document.createElement('span'); s.className = 'chip tp'; if (!show) s.classList.add('hide'); h.appendChild(s); this._enTap(s, id); return s; };
    E.online = (HL.inverter_online_from || []).filter(isEnt);
    E.hl = {
      inv: mk(E.online[0], E.online.length > 0), flt: mk(HL.fault_count, isEnt(HL.fault_count)), mode: mk(HL.operating_mode, isEnt(HL.operating_mode)),
      grid: mk(HL.grid_mode, isEnt(HL.grid_mode)), feed: mk(HL.feed_in_mode, isEnt(HL.feed_in_mode)), hz: mk(HL.frequency || HL.voltage, isEnt(HL.frequency) || isEnt(HL.voltage)),
      tmp: mk(HL.inverter_temperature, isEnt(HL.inverter_temperature)), fos: mk(HL.fossil_share, isEnt(HL.fossil_share)),
    };
    const sp = document.createElement('span'); sp.className = 'sp'; h.appendChild(sp);
    const ro = document.createElement('span'); ro.className = 'chip'; ro.innerHTML = `${ic('lock')}${esc(S.read_only)}`; h.appendChild(ro);
    h.classList.toggle('hide', !Object.keys(E.hl).some((k) => !E.hl[k].classList.contains('hide')));
  },

  /* ---------- helpers ---------- */
  _enKw(id) { const s = this.st(id); if (!s) return null; const v = parseFloat(s.state); if (!Number.isFinite(v)) return null; return s.attributes.unit_of_measurement === 'kW' ? v : v / 1000; },
  _enKwh(id) { const s = this.st(id); if (!s) return null; const v = parseFloat(s.state); if (!Number.isFinite(v)) return null; return s.attributes.unit_of_measurement === 'Wh' ? v / 1000 : v; },
  _enSoc() {
    const a = this._enSocIds().map((id) => this.num(id)).filter((v) => v !== null);
    if (a.length) return a.reduce((x, y) => x + y, 0) / a.length;
    return this.num(this._enSocFallback());
  },
  _enBattKw() { const c = this._enc; let b = this._enKw(c.battery_power); if (b !== null && c.battery_power_positive === 'discharging') b = -b; return b; },
  _enGridKw() {
    const g = this._enc.grid;
    if (g.mode === 'derived') { const H = this._enKw(this._enHouse()), AC = this._enKw(g.inverter_ac); return H !== null && AC !== null ? H + AC : null; }
    const v = this._enKw(g.entity); return v === null ? null : (g.positive === 'export' ? -v : v);
  },

  /* ---------- update ---------- */
  _updateEnergy() {
    const c = this._enc, E = this._en; if (!E) return;
    const $ = E.$, now = new Date(), lang = this.lang();
    const S0 = this._enKw(this._enSolar()), H = this._enKw(this._enHouse()), B = this._enBattKw();
    const s0 = S0 === null ? 0 : Math.max(S0, 0), h0 = H === null ? 0 : Math.max(H, 0), b0 = B === null ? 0 : B;
    const grid = this._enGridKw(), g0 = grid === null ? 0 : grid;
    const s2h = Math.min(s0, h0), s2b = Math.min(Math.max(s0 - s2h, 0), Math.max(b0, 0)), s2g = g0 < 0 ? -g0 : 0;
    const b2h = b0 < 0 ? -b0 : 0, g2h = g0 > 0 ? g0 : 0, h2b = Math.max(b0 - s2b, 0);
    const T = 0.05, show = (f, p, v) => { const on = v > T; $(f).classList.toggle('on', on); if (p) { $(p).classList.toggle('on', on); if (on) $(p).textContent = k2(v) + ' kW'; } };
    show('enFSH', 'enPSH', s2h); show('enFSB', 'enPSB', s2b); show('enFSG', 'enPSG', s2g); show('enFBH', 'enPBH', b2h); show('enFGH', 'enPGH', g2h);
    $('enFHB').classList.toggle('on', h2b > T); $('enFHG').classList.remove('on');
    if (h2b > T && b2h <= T) { $('enPBH').classList.add('on'); $('enPBH').textContent = k2(h2b) + ' kW'; }
    const val = (v) => (v === null ? '–' : k2(v)) + '<em>kW</em>';
    $('enVSol').innerHTML = val(S0); $('enVHouse').innerHTML = val(H); zero($('enVSol')); zero($('enVHouse'));
    const pv = E.strings.map((s) => this._enKw(s.entity));
    $('enSPV').innerHTML = E.strings.map((s, i) => `${esc(s.name || 'PV' + (i + 1))} <b>${pv[i] === null ? '–' : k2(pv[i])}</b>`).join(' · ');
    E.panels.forEach(([r, si]) => {
      const pw = E.strings.length ? pv[si] : null, on = pw !== null && pw !== undefined ? pw > T : s0 > T, col = STRING_COL[si % STRING_COL.length];
      r.setAttribute('fill', on ? col[0] : col[1]);
    });
    const soc = this._enSoc(), socT = soc === null ? '–' : String(Math.round(soc));
    const bs = B === null ? '' : B > T ? t('charging_kw', { kw: k2(B) }) : B < -T ? t('discharging_kw', { kw: k2(-B) }) : S.idle, bsShort = B === null ? '' : B > T ? S.charging : B < -T ? S.discharging : S.idle;
    $('enVBat').innerHTML = socT + '<em>%</em>'; $('enSBat').textContent = bsShort; $('enBBat').style.width = (soc || 0) + '%';
    $('enVGrid').innerHTML = val(grid === null ? null : Math.abs(grid)); zero($('enVGrid'));
    $('enSGrid').textContent = grid === null ? '' : grid > T ? S.importing : grid < -T ? S.exporting : S.balanced;
    $('enClock').lastChild.textContent = hm(now);
    // battery card
    const Bc = c.battery, capk = (this._enKwh(Bc.capacity) || Number(Bc.capacity_kwh) || null), res = Number(Bc.reserve_pct) || 0;
    $('enBSoc').textContent = socT; $('enBFill').style.width = (soc || 0) + '%';
    $('enBRes').style.left = res + '%'; $('enBRes').classList.toggle('hide', !res); $('enBResT').textContent = res ? t('reserve_pct', { n: res }) : '';
    $('enBState').textContent = bs || '–';
    $('enBKwh').textContent = soc === null || !capk ? '' : t('kwh_of', { a: (soc / 100 * capk).toFixed(1), b: Math.round(capk * 10) / 10 });
    let est = '';
    if (capk && soc !== null && B !== null && B > T && soc < 99.5) { const m = Math.round((100 - soc) / 100 * capk / B * 60); est = t('full_in', { h: Math.floor(m / 60), m: pad(m % 60), at: hm(new Date(now.getTime() + m * 60000)) }); }
    else if (capk && soc !== null && B !== null && B < -T && soc > res) { const m = Math.round((soc - res) / 100 * capk / -B * 60); est = t('reserve_in', { h: Math.floor(m / 60), m: pad(m % 60), at: hm(new Date(now.getTime() + m * 60000)) }); }
    $('enEst').textContent = est;
    let cyc = null;
    E.packs.forEach((pk) => {
      const sc = this.num(pk.p.soc), soh = this.num(pk.p.health), cy = this.num(pk.p.cycles), tp = this.num(pk.p.temperature);
      pk.v.textContent = sc === null ? '–' : Math.round(sc) + '%';
      pk.s.textContent = [soh !== null ? t('health_pct', { n: Math.round(soh) }) : '', cy !== null ? t('n_cycles', { n: Math.round(cy) }) : '', tp !== null ? Math.round(tp) + '°C' : ''].filter(Boolean).join(' · ');
      if (cy !== null) cyc = cyc === null ? cy : Math.max(cyc, cy);
    });
    const wc = Number(Bc.warranty_cycles) || 0;
    $('enBWar').textContent = cyc === null || !wc ? '–' : Math.round(cyc).toLocaleString(lang) + ' / ' + wc.toLocaleString(lang);
    // today tiles
    E.tiles.forEach((tl) => {
      const s = this.st(tl.x[2]);
      if (!s || !Number.isFinite(parseFloat(s.state))) { tl.b.innerHTML = '–'; tl.n.innerHTML = '&nbsp;'; zero(tl.b); return; }
      const v = parseFloat(s.state);
      if (tl.x[3]) { tl.d.classList.toggle('good', (tl.x[3] === 'good') !== (v < 0)); tl.d.classList.toggle('bad', (tl.x[3] === 'bad') !== (v < 0)); }
      if (tl.money) { tl.b.textContent = this.money(v); const sc = Number(c.today.standing_charge); tl.n.textContent = sc ? t('incl_standing', { v: this.money(sc) }) : ' '; }
      else { tl.b.innerHTML = v.toFixed(1) + '<em>kWh</em>'; tl.n.innerHTML = '&nbsp;'; }
      zero(tl.b);
    });
    const pr = this.num(c.price); $('enPrice').textContent = pr === null ? '–' : t('price_now', { price: this.money(pr) });
    this._enForecast(now);
    // consumers
    const HP = c.consumers.heat_pump, hp = this._enKw(HP.power); $('enHpW').textContent = hp === null ? '–' : k2(hp); zero($('enHpW'));
    const hk = this.num(HP.today), hmo = this.num(HP.month);
    $('enHpD').textContent = isEnt(HP.today) ? t('kwh_today', { v: hk === null ? '–' : hk.toFixed(1) }) : '';
    $('enHpM').textContent = hmo === null ? '' : t('kwh_month', { v: Math.round(hmo) });
    E.mach.forEach((m) => { const s = this._appState(m.a); m.s.textContent = s.text; m.d.classList.toggle('run', !!s.run); });
    // health
    const HL = c.health, H2 = E.hl, f = this.num(HL.fault_count), hz = this.num(HL.frequency), vt = this.num(HL.voltage), it = this.num(HL.inverter_temperature), fo = this.num(HL.fossil_share);
    const online = E.online.some((id) => this.num(id) !== null), dot = (bad) => `<i class="dot${bad ? ' bad' : ''}"></i>`;
    H2.inv.innerHTML = dot(!online) + esc(online ? S.inverter_online : S.inverter_offline);
    H2.flt.innerHTML = dot(f !== null && f > 0) + esc(f === null ? S.faults_unknown : f > 0 ? t(f === 1 ? 'one_fault' : 'n_faults', { n: f }) : S.no_faults);
    const sm = (id) => { const v = this.sv(id); return v === undefined || v === 'unknown' || v === 'unavailable' ? '–' : v; };
    H2.mode.textContent = nice(sm(HL.operating_mode));
    H2.grid.textContent = sm(HL.grid_mode) === 'grid' ? S.grid_connected : t('grid_mode', { v: sm(HL.grid_mode).replace(/_/g, ' ') });
    H2.feed.textContent = t('feed_in', { v: sm(HL.feed_in_mode).replace(/_/g, ' ') });
    H2.hz.textContent = [isEnt(HL.frequency) ? (hz === null ? '–' : hz.toFixed(2) + ' Hz') : '', isEnt(HL.voltage) ? (vt === null ? '–' : Math.round(vt) + ' V') : ''].filter(Boolean).join(' · ');
    H2.tmp.textContent = t('inverter_temp', { v: it === null ? '–' : Math.round(it) + '°C' });
    H2.fos.innerHTML = ic('leaf') + esc(t('fossil', { v: fo === null ? '–' : Math.round(fo) + '%' }));
    if (!E.busy && isEnt(this._enHouse()) && (!E.hist || now - E.histAt > 300000)) this._enLoad();
    this._enChartDraw(now);
  },

  _enForecast(now) {
    const c = this._enc, E = this._en, $ = E.$, FC = c.forecast, days = (FC.days || []).filter(isEnt).slice(0, 8);
    if (!days.length && !isEnt(FC.remaining_today)) return;
    const solY = c.today.solar_yield;
    const pw = this._phone ? Math.max(260, ($('enFc').clientWidth || 342) - 32) : 0; /* phone: drawn at the card's real width so the labels stay 12 px */
    const vals = days.map((id) => this._enKwh(id)), sig = vals.map((v) => (v === null ? '' : v.toFixed(1))).join() + '|' + (this._enKwh(solY) || 0).toFixed(1) + '|' + now.getDate() + '|' + pw;
    const left = this._enKwh(FC.remaining_today), tom = vals[1];
    $('enFLeft').textContent = t('left_today', { v: left === null ? '–' : left.toFixed(1) });
    $('enFTom').textContent = t('tomorrow_kwh', { v: tom === null || tom === undefined ? '–' : tom.toFixed(1) });
    const p0 = Date.parse(this.sv(FC.peak_today)), p1 = Date.parse(this.sv(FC.peak_tomorrow));
    let txt = '–';
    if (Number.isFinite(p0) && p0 > now.getTime()) txt = t('best_time', { t: hm(new Date(p0)) });
    else if (Number.isFinite(p1)) txt = t('best_tomorrow', { t: hm(new Date(p1)) });
    $('enFPeak').lastChild.textContent = txt;
    if (E.fcSig === sig) return; E.fcSig = sig;
    const s = $('enFcS'); s.innerHTML = '';
    const bands = FC.bands && FC.bands.length === 2 ? FC.bands : [10, 20];
    const W = pw || 372, gap = pw ? 8 : 12, bw = pw ? Math.min(56, (W - 12 - (vals.length - 1) * gap) / Math.max(1, vals.length)) : 34, base = 100, max = Math.max(24, ...vals.map((v) => v || 0)), gen = this._enKwh(solY);
    s.setAttribute('viewBox', `0 0 ${W} 142`); s.setAttribute('width', W); s.setAttribute('height', 142); /* the box keeps the drawing's proportions at any width */
    const col = (v) => (v >= bands[1] ? ENERGY.bandHigh : v >= bands[0] ? ENERGY.bandMid : ENERGY.bandLow);
    vals.forEach((v, i) => {
      const x = i * (bw + gap) + 6, vv = v === null ? 0 : v, h = Math.max(vv / max * 84, v === null ? 0 : 3);
      if (v !== null) {
        sv('rect', { x, y: base - h, width: bw, height: h, rx: 6, fill: col(vv), opacity: .9 }, s);
        if (i === 0 && gen !== null && gen > 0.05) { const h0 = Math.min(gen, vv) / max * 84; sv('rect', { x, y: base - h0, width: bw, height: h0, rx: 6, fill: 'rgba(var(--oriel-glass),.55)' }, s); }
      }
      const tx = sv('text', { x: x + bw / 2, y: base - h - 6, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 500, 'font-family': 'Outfit,sans-serif', fill: 'rgb(var(--oriel-ink))' }, s); tx.textContent = v === null ? '–' : vv.toFixed(1);
      const d = new Date(now.getTime() + i * 86400000), l = sv('text', { x: x + bw / 2, y: base + 20, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'Outfit,sans-serif', fill: 'rgba(var(--oriel-ink),var(--oriel-soft,.62))' }, s);
      let wd; try { wd = d.toLocaleDateString(this.lang(), { weekday: 'short' }); } catch (e) { wd = ''; }
      l.textContent = i === 0 ? S.today : wd;
      const hit = sv('rect', { x: x - 6, y: 0, width: bw + gap, height: 142, fill: 'transparent', style: 'cursor:pointer' }, s);
      hit.addEventListener('click', (e) => { e.stopPropagation(); this.moreInfo(days[i]); });
    });
  },

  async _enLoad() {
    const E = this._en, house = this._enHouse(), sol = this._enSolar(); if (!this._h || E.busy) return; E.busy = true;
    try {
      const now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate()), y0 = new Date(mid.getTime() - 86400000);
      const ids = [house].concat(isEnt(sol) ? [sol] : []);
      const res = await this._h.callWS({ type: 'history/history_during_period', start_time: y0.toISOString(), end_time: now.toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
      const hp = parseHistory(res && res[house]), sp = parseHistory(res && res[sol]), m = mid.getTime() / 1000, n = now.getTime() / 1000;
      E.hist = { today: binsOf(hp, m), yesterday: binsOf(hp, m - 86400), solar: binsOf(sp, m), total: wattHours(hp, m, n) / 1000, ySoFar: wattHours(hp, m - 86400, m - 86400 + (n - m)) / 1000 };
      E.histAt = Date.now(); E.chartSig = '';
      this._enChartDraw(now);
    } catch (e) { console.warn('[oriel] energy history failed', e); E.histAt = Date.now() - 240000; }
    E.busy = false;
  },

  _enChartDraw(now) {
    const E = this._en, h = E.hist, $ = E.$; if (!h) return;
    const pw = this._phone ? Math.max(260, ($('enChart').clientWidth || 342) - 32) : 0; /* phone: drawn at the card's real width so the labels stay 12 px */
    const bin = Math.floor((now.getHours() * 60 + now.getMinutes()) / 180), sig = bin + '|' + h.total.toFixed(1) + '|' + E.histAt + '|' + pw;
    if (E.chartSig === sig) return; E.chartSig = sig;
    $('enCTot').textContent = h.total.toFixed(1); zero($('enCTot'));
    const up = $('enCUp');
    if (h.ySoFar > 0.05) { const pct = Math.round((h.total / h.ySoFar - 1) * 100); up.textContent = t(pct < 0 ? 'vs_yesterday_less' : 'vs_yesterday_more', { pct: Math.abs(pct) }); up.style.color = pct <= 0 ? ENERGY.trendDown : ENERGY.trendUp; } else up.textContent = '';
    const s = $('enCh'); s.innerHTML = '';
    const W = pw || 368, gap = pw ? 8 : 12, bw = pw ? (W - 12 - 7 * gap) / 8 : 34, H = 100;
    s.setAttribute('viewBox', `0 0 ${W} 126`); s.setAttribute('width', W); s.setAttribute('height', 126);
    const max = Math.max(1, ...h.today, ...h.yesterday, ...h.solar) * 1.1, pts = [];
    h.yesterday.forEach((v, i) => { const x = i * (bw + gap) + 6, hh = v / max * H; if (hh > 1) sv('rect', { x, y: H - hh, width: bw, height: hh, rx: 5, fill: 'none', stroke: 'rgba(var(--oriel-on-dark),.28)', 'stroke-dasharray': '2 3' }, s); });
    h.today.forEach((v, i) => { if (i > bin) return; const x = i * (bw + gap) + 6, hh = Math.max(3, v / max * H); sv('rect', { x, y: H - hh, width: bw, height: hh, rx: 5, fill: 'rgb(var(--oriel-on-dark))', opacity: i === bin ? .55 : .92 }, s); });
    if (isEnt(this._enSolar())) h.solar.forEach((v, i) => { if (i > bin) return; pts.push([i * (bw + gap) + 6 + bw / 2, H - v / max * H]); });
    if (pts.length > 1) sv('path', { d: 'M' + pts.map((p) => p.join(',')).join(' L'), fill: 'none', stroke: 'rgb(var(--oriel-accent))', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s);
    pts.forEach((p, i) => sv('circle', { cx: p[0], cy: p[1], r: i === pts.length - 1 ? 4.5 : 3, fill: 'rgb(var(--oriel-accent))', stroke: 'rgb(var(--oriel-black))', 'stroke-width': 2 }, s));
    for (let i = 0; i < 8; i++) { const tx = sv('text', { x: i * (bw + gap) + 6 + bw / 2, y: H + 18, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'Outfit,sans-serif', fill: 'rgba(var(--oriel-on-dark),.6)' }, s); tx.textContent = i * 3; }
  },
};

registerPage({
  key: 'energy', icon: 'bolt',
  label() { return S.page_energy; },
  css: CSS,
  enabled(c) { return hasEntities(c.energy); },
  init() { return this._enInitPage(); },
  update() { this._updateEnergy(); },
  methods: EnergyExt,
});
