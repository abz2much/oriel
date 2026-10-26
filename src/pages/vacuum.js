/* Vacuum page. The first vacuum in config.vacuum.vacuums gets the full layout (hero, settings, schedule, and with
   integration: dreame also the room map, maintenance and base station). Any others get a compact card each.
   Starting a clean, cleaning rooms, resuming and resetting the base counter always ask first; pause, stop and dock do not.
   Timers only run while the page is showing. */
import { registerPage } from '../core.js';
import { S, t } from '../strings.js';
import { isEnt, bad, tidy, hm, sameDay, esc, el } from '../util.js';
import { STATE, VAC } from '../theme/fixed.js';

// state sensor values (Dreame) -> page state
const VC_MAP = {
  charging_completed: ['docked', 'vs_charged'], charging: ['docked', 'vs_charging'], idle: ['idle', 'vs_idle'],
  sweeping: ['cleaning', 'vs_sweeping'], sweeping_and_mopping: ['cleaning', 'vs_sweep_mop'], mopping: ['cleaning', 'vs_mopping'],
  returning: ['returning', 'vs_returning'], returning_to_wash: ['towash', 'vs_to_wash'], washing: ['washing', 'vs_washing'],
  clean_add_water: ['filling', 'vs_filling'], drying: ['drying', 'vs_drying'], auto_emptying: ['emptying', 'vs_emptying'],
  waiting_for_task: ['waiting', 'vs_waiting'], washing_paused: ['paused', 'paused'], paused: ['paused', 'paused'], error: ['error', 'vs_error'],
};
const VC_FALL = { docked: 'docked', cleaning: 'cleaning', returning: 'returning', paused: 'paused', idle: 'idle', error: 'error' };
const [G, GT] = STATE.green, [TL, TT] = STATE.teal, [AM, AT] = STATE.amber, [RD, RT] = STATE.red, [GR, GRT] = STATE.grey;
const VC_ST = {
  docked: { l: 'vl_docked', c: G, t: GT, an: 'vcBreathe 4s', ctl: ['clean'], start: true },
  idle: { l: 'vl_idle', c: G, t: GT, an: 'vcBreathe 4s', ctl: ['clean'], start: true },
  waiting: { l: 'vl_waiting', c: AM, t: AT, an: 'none', ctl: ['clean'], start: true },
  cleaning: { l: 'vl_cleaning', c: TL, t: TT, an: 'vcPulse 3s', ctl: ['pause', 'stop', 'dock'], run: true },
  returning: { l: 'vl_returning', c: TL, t: TT, an: 'vcPulse 3s', ctl: ['stop'], run: true },
  towash: { l: 'vl_towash', c: AM, t: AT, an: 'vcPulse 4s', ctl: ['stop'], run: true, st: true },
  washing: { l: 'vl_washing', c: AM, t: AT, an: 'vcPulse 4s', ctl: ['stop'], run: true, st: true },
  filling: { l: 'vl_filling', c: AM, t: AT, an: 'vcPulse 4s', ctl: ['stop'], run: true, st: true },
  drying: { l: 'vl_drying', c: AM, t: AT, an: 'vcBreathe 5s', ctl: ['stop'], run: true, st: true },
  emptying: { l: 'vl_emptying', c: AM, t: AT, an: 'vcPulse 4s', ctl: ['stop'], run: true, st: true },
  paused: { l: 'vl_paused', c: AM, t: AT, an: 'none', ctl: ['resume', 'stop', 'dock'], run: true },
  error: { l: 'vl_error', c: RD, t: RT, an: 'none', ctl: ['dock', 'stop'], bad: true },
  unavail: { l: 'vl_unavail', c: GR, t: GRT, an: 'none', ctl: [] },
};
const VC_ICONS = { play: 'M8 5l11 7-11 7z', pause: 'M9 5v14M15 5v14', stop: 'M7 7h10v10H7z', dock: 'M4 12l8-7 8 7M6 11v9h12v-9M10 20v-5h4v5', spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z' };
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${VC_ICONS[n] || ''}"/></svg>`;
const MODE = { sweeping: 'mode_sweep', mopping: 'mode_mop', sweeping_and_mopping: 'mode_sweep_mop', mopping_after_sweeping: 'mode_sweep_then_mop' };
const SW = { idle: 'idle', washing: 'vs_washing', clean_add_water: 'sw_filling', drying: 'vs_drying', returning: 'vs_returning_short', paused: 'paused' };
const F1_BUTTONS = { docked: ['start'], idle: ['start', 'dock'], cleaning: ['pause', 'stop', 'dock'], paused: ['start', 'stop', 'dock'], returning: ['stop'], error: ['dock', 'stop'] };

const CSS = `
#pgVacuum .abs{position:absolute}
#vcWrap{position:absolute;left:var(--dx,0px);top:0;width:1280px;height:800px;pointer-events:none}
#vcWrap>*{pointer-events:auto}
#pgVacuum .ic{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}
#pgVacuum .vcHd{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500;gap:8px}
#pgVacuum .vcHd>span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pgVacuum .vcHd small{font-size:11.5px;font-weight:400;color:rgba(var(--oriel-ink),.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pgVacuum .dark .vcHd small{color:rgba(var(--oriel-on-dark),.6)}
#pgVacuum .chip{height:26px;font-size:12px;padding:0 10px;white-space:nowrap;position:relative;cursor:pointer}
#pgVacuum .chip::after{content:"";position:absolute;left:-3px;right:-3px;top:-9px;bottom:-9px}
#pgVacuum .chip.bad{background:rgb(var(--oriel-bad-bg));color:rgb(var(--oriel-bad));border-color:rgb(var(--oriel-bad-line-2))}
#pgVacuum .chip.warn{background:rgb(var(--oriel-warn-bg));color:rgb(var(--oriel-warn));border-color:rgb(var(--oriel-warn-line))}
#pgVacuum .chip.ok{background:rgba(var(--oriel-ok-fill),.55);color:rgb(var(--oriel-ink))}
#pgVacuum .chip.dk{background:rgba(var(--oriel-on-dark),.1);border-color:rgba(var(--oriel-on-dark),.18);color:rgb(var(--oriel-on-dark))}
#pgVacuum .chip.dk.bad{background:rgb(var(--oriel-bad-bg));color:rgb(var(--oriel-bad))}
#vcHero{left:100px;top:84px;width:330px;height:318px;padding:16px 20px;overflow:hidden;transition:background .6s}
#vcHero::before{content:"";position:absolute;inset:0;border-radius:28px;pointer-events:none;animation:var(--an,none) ease-in-out infinite}
@keyframes vcBreathe{0%,100%{box-shadow:inset 0 0 22px color-mix(in srgb,var(--gc) 20%,transparent)}50%{box-shadow:inset 0 0 70px color-mix(in srgb,var(--gc) 55%,transparent)}}
@keyframes vcPulse{0%,100%{box-shadow:inset 0 0 22px color-mix(in srgb,var(--gc) 25%,transparent)}50%{box-shadow:inset 0 0 60px color-mix(in srgb,var(--gc) 65%,transparent)}}
@keyframes vcRing{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.4);opacity:0}}
@media (prefers-reduced-motion:reduce){#vcHero::before{animation:none!important;box-shadow:inset 0 0 0 4px var(--gc)}#vcMap .rbring{animation:none!important;opacity:.5}}
#vcHero.alert{background:rgb(var(--oriel-bad-bg))}
#vcState{font-size:46px;font-weight:200;line-height:1.05;margin-top:12px;white-space:nowrap;cursor:pointer}
#vcSub{font-size:14px;margin-top:6px;font-weight:300;line-height:1.3;height:46px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
#vcProg{height:8px;border-radius:4px;background:rgba(var(--oriel-ink),.12);margin-top:4px;overflow:hidden;visibility:hidden}
#vcProg i{display:block;height:100%;background:${TL};border-radius:4px;width:0;transition:width .6s}
#vcLast{font-size:12.5px;color:rgba(var(--oriel-ink),.62);margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vcChips{position:absolute;left:20px;right:20px;bottom:76px;display:flex;gap:6px}
#vcChips .chip{min-width:0;overflow:hidden;text-overflow:ellipsis;display:inline-block;line-height:24px}
#vcCtl{position:absolute;left:14px;right:14px;bottom:14px;height:50px;display:flex;gap:8px}
.vcB{flex:1;height:50px;border-radius:25px;border:1px solid rgba(var(--oriel-glass),.7);background:rgba(var(--oriel-glass),.55);display:flex;align-items:center;justify-content:center;gap:7px;font:inherit;font-size:13.5px;color:rgb(var(--oriel-ink));cursor:pointer;padding:0 8px;white-space:nowrap}
.vcB:active{background:rgb(var(--oriel-raised))}
.vcB.pri{background:linear-gradient(150deg,rgb(var(--oriel-accent-hi)),rgb(var(--oriel-accent-lo)));color:rgb(var(--oriel-on-accent));font-weight:500;border-color:rgba(var(--oriel-glass),.6)}
.vcB .ic{width:18px;height:18px}
#vcSet{left:100px;top:414px;width:330px;height:152px;padding:14px 16px}
#vcSg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
.vcT{position:relative;border-radius:16px;background:rgba(var(--oriel-glass),.34);border:1px solid rgba(var(--oriel-glass),.5);height:46px;padding:5px 8px;display:flex;flex-direction:column;justify-content:center;cursor:pointer;min-width:0}
#vcSg .vcT:last-child:nth-child(odd){grid-column:1/-1}
.vcT.dd b{padding-right:10px}
.vcT.dd::after{content:"";position:absolute;right:9px;top:55%;border:4px solid transparent;border-top-color:rgba(var(--oriel-ink),.5)}
#vcMenu{position:absolute;z-index:18;display:none;min-width:150px;padding:6px;border-radius:20px;background:linear-gradient(150deg,rgba(var(--oriel-sheet-a),.98),rgba(var(--oriel-sheet-b),.98));box-shadow:0 18px 40px rgba(var(--oriel-shadow-deep),.35);color:rgb(var(--oriel-ink))}
#vcMenu.show{display:block}
#vcMenu button{display:block;width:100%;height:44px;border:0;border-radius:14px;background:none;font:inherit;font-size:14px;text-align:left;padding:0 14px;color:rgb(var(--oriel-ink));cursor:pointer;white-space:nowrap}
#vcMenu button.on{background:rgba(var(--oriel-accent-fill),.7);color:rgb(var(--oriel-ink-on-accent));font-weight:500}
#vcMenu .stp{display:flex;align-items:center;gap:6px}
#vcMenu .stp button{width:52px;text-align:center;padding:0;font-size:22px}
#vcMenu .stp span{flex:1;text-align:center;font-size:14px;min-width:70px}
.vcT small{font-size:10.5px;color:rgba(var(--oriel-ink),.62);white-space:nowrap}
.vcT b{font-weight:400;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vcSch{left:100px;top:578px;width:330px;height:198px;padding:14px 16px;overflow:hidden}
.vcS{border-radius:16px;background:rgba(var(--oriel-glass),.34);border:1px solid rgba(var(--oriel-glass),.5);padding:8px 12px;margin-top:6px;cursor:pointer}
.vcS b{display:block;font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vcS span{display:block;font-size:12px;color:rgba(var(--oriel-ink),.62);margin-top:1px;line-height:1.3}
.vcS.off b{color:rgb(var(--oriel-bad))}
#vcMapP{left:446px;top:84px;width:350px;height:692px;padding:14px 16px}
#vcMap{display:block;margin:6px auto 0}
#vcMap .rm{cursor:pointer}
#vcMap .rm rect{fill:rgba(var(--oriel-glass),.55);stroke:rgba(var(--oriel-glass),.9);stroke-width:1.2}
#vcMap .rm.sel rect{fill:rgba(var(--oriel-accent-fill),.85);stroke:rgb(var(--oriel-accent-strong));stroke-width:2}
#vcMap .rm.act rect{fill:${VAC.activeRoom};stroke:${TL};stroke-width:2}
#vcMap .rm text{font-family:inherit;font-size:11.5px;fill:rgb(var(--oriel-ink));pointer-events:none;font-weight:400}
#vcMap .rm.sel text{fill:rgb(var(--oriel-ink-on-accent))}
#vcMap .rb{fill:rgb(var(--oriel-ink))}
#vcMap .rbring{fill:none;stroke:${TL};stroke-width:2;transform-box:fill-box;transform-origin:center;animation:vcRing 2s ease-out infinite}
#vcMapMsg{position:absolute;left:16px;right:16px;top:240px;text-align:center;font-size:13px;color:rgba(var(--oriel-ink),.62);display:none}
#vcRooms{display:grid;grid-template-columns:1fr 1fr;gap:6px;position:absolute;left:16px;right:16px;bottom:14px}
.vcR{height:50px;border-radius:18px;border:1px solid rgba(var(--oriel-glass),.55);background:rgba(var(--oriel-glass),.34);display:flex;align-items:center;justify-content:space-between;padding:0 12px;font:inherit;font-size:13px;color:rgb(var(--oriel-ink));cursor:pointer;min-width:0}
.vcR span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vcR small{font-size:11px;color:rgba(var(--oriel-ink),.62);white-space:nowrap}
.vcR.sel{background:rgba(var(--oriel-accent-fill),.8);color:rgb(var(--oriel-ink-on-accent));box-shadow:0 0 0 1.5px rgb(var(--oriel-accent-strong))}
.vcR.sel small{color:rgba(var(--oriel-ink-on-accent),var(--oriel-soft-on-accent,.62))}
.vcR.act{background:rgba(var(--oriel-glass),.7);box-shadow:0 0 0 1.5px ${TL},0 0 14px 2px ${TL}}
.vcR.off{opacity:.5;cursor:default}
.vcR.go{background:rgb(var(--oriel-ink-fill));color:rgb(var(--oriel-on-dark));justify-content:center;gap:8px;border:0}
.vcR.go.dim{opacity:.35;cursor:default}
#vcMaint{left:812px;top:84px;width:444px;height:240px;padding:14px 16px}
#vcCons{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin-top:12px}
.vcC{cursor:pointer;min-width:0}
.vcC .t{display:flex;justify-content:space-between;font-size:13px;gap:6px}
.vcC .t span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vcC .t em{font-style:normal;color:rgba(var(--oriel-on-dark),.6);font-size:11.5px}
.vcC .b{height:8px;border-radius:4px;background:rgba(var(--oriel-on-dark),.14);margin-top:5px;overflow:hidden}
.vcC .b i{display:block;height:100%;border-radius:4px;background:${G}}
.vcC.o .b i{background:${AM}}.vcC.r .b i{background:${VAC.worn}}
.vcC .h{font-size:11px;color:rgba(var(--oriel-on-dark),.6);margin-top:3px;white-space:nowrap}
#vcSta{left:812px;top:336px;width:444px;height:236px;padding:14px 16px}
#vcWg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
.vcW{border-radius:16px;background:rgba(var(--oriel-glass),.34);border:1px solid rgba(var(--oriel-glass),.5);height:48px;padding:5px 10px;display:flex;flex-direction:column;justify-content:center;cursor:pointer;min-width:0}
.vcW small{font-size:10.5px;color:rgba(var(--oriel-ink),.62);white-space:nowrap}
.vcW b{font-weight:400;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vcW.bad{background:rgb(var(--oriel-bad-bg));border-color:rgb(var(--oriel-bad-line))}.vcW.bad b{color:rgb(var(--oriel-bad))}
#vcBase{margin-top:8px;height:50px;border-radius:18px;background:rgba(var(--oriel-glass),.34);border:1px solid rgba(var(--oriel-glass),.5);display:flex;align-items:center;gap:10px;padding:0 14px;font-size:13px;cursor:pointer}
#vcBase>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#vcBase small{margin-left:auto;color:rgba(var(--oriel-ink),.62);font-size:12px;white-space:nowrap}
#vcBase.bad{background:rgb(var(--oriel-bad-bg));border-color:rgb(var(--oriel-bad-line))}
#vcBase button{margin-left:auto;height:36px;border-radius:18px;border:0;background:rgb(var(--oriel-ink-fill));color:rgb(var(--oriel-on-dark));font:inherit;font-size:12.5px;padding:0 14px;cursor:pointer;display:none;white-space:nowrap}
#vcBase.bad button{display:block}#vcBase.bad small{display:none}
.vcF1{left:812px;top:584px;width:444px;height:192px;padding:14px 16px}
.vcF1 .row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px}
.vcF1 .f1c{display:flex;gap:6px}
.vcF1 .f1c .vcB{flex:none;height:44px;padding:0 12px;font-size:12.5px;gap:5px}
.vcF1 .big{font-size:30px;font-weight:200;line-height:1}
.vcF1 .kv{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px}
#vcConf{position:absolute;left:0;top:0;width:1280px;height:800px;background:rgba(var(--oriel-scrim),.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:20}
#vcConf.show{display:flex}
#vcConf .pn{width:460px;padding:24px;border-radius:28px;background:linear-gradient(150deg,rgba(var(--oriel-sheet-a),.97),rgba(var(--oriel-sheet-b),.97));box-shadow:0 30px 70px rgba(var(--oriel-shadow-deep),.5);color:rgb(var(--oriel-ink))}
#vcConf h3{margin:0 0 6px;font-weight:400;font-size:22px}
#vcConf p{margin:0 0 6px;font-size:14px;line-height:1.4;color:rgba(var(--oriel-ink),.8)}
#vcConf p.nt{color:rgb(var(--oriel-bad));font-weight:500}
#vcConf .btns{display:flex;gap:8px;margin-top:16px}
#vcConf .btns button{flex:1;height:50px;border-radius:25px;border:0;font:inherit;font-size:15px;cursor:pointer;background:rgba(var(--oriel-ink),.1);color:rgb(var(--oriel-ink))}
#vcConf .btns button.go{background:linear-gradient(150deg,rgb(var(--oriel-accent-hi)),rgb(var(--oriel-accent-lo)));font-weight:500;color:rgb(var(--oriel-on-accent))}
#vcToast{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);background:rgb(var(--oriel-ink-fill));color:rgb(var(--oriel-on-dark));border-radius:20px;padding:10px 18px;font-size:12.5px;display:none;z-index:30;max-width:760px}
`;

const F1_HTML = (sfx) => `<div id="vcF1${sfx}" class="abs glass mid vcF1"><div class="vcHd"><span id="vcF1N${sfx}"></span><span class="chip" id="vcF1S${sfx}">–</span></div>
    <div class="row"><div class="big"><span id="vcF1B${sfx}">–</span><span style="font-size:14px;color:rgba(var(--oriel-ink),.62)">%</span></div><div id="vcF1C${sfx}" class="f1c"></div></div>
    <div class="kv" id="vcF1K${sfx}"></div></div>`;
const HTML = (extra) => `<div id="vcWrap">
  <div id="vcHero" class="abs glass mid">
    <div class="vcHd"><span id="vcName"></span><span class="chip" id="vcBat">–</span></div>
    <div id="vcState">–</div><div id="vcSub"></div>
    <div id="vcProg"><i></i></div>
    <div id="vcLast"></div>
    <div id="vcChips"><span class="chip" id="vcCMode">–</span><span class="chip" id="vcCMt">–</span></div>
    <div id="vcCtl"></div>
  </div>
  <div id="vcSet" class="abs glass"><div class="vcHd"><span>${esc(S.cleaning_settings)}</span><small>${esc(S.tap_to_change)}</small></div><div id="vcSg"></div></div>
  <div id="vcSch" class="abs glass"><div class="vcHd"><span>${esc(S.schedule)}</span><small>${esc(S.read_only_lc)}</small></div><div id="vcSl"></div></div>
  <div id="vcMapP" class="abs glass">
    <div class="vcHd"><span id="vcMapT"></span><span class="chip" id="vcMapChip">–</span></div>
    <svg id="vcMap" width="318" height="440" viewBox="0 0 318 440"></svg>
    <div id="vcMapMsg">${esc(S.map_not_available)}</div>
    <div id="vcRooms"></div>
  </div>
  <div id="vcMaint" class="abs dark"><div class="vcHd"><span>${esc(S.maintenance)}</span><span class="chip dk" id="vcMChip">–</span></div><div id="vcCons"></div></div>
  <div id="vcSta" class="abs glass"><div class="vcHd"><span>${esc(S.base_station)}</span><small id="vcStaS">–</small></div><div id="vcWg"></div>
    <div id="vcBase"><span id="vcBaseT">–</span><small>${esc(S.read_only_lc)}</small><button type="button" id="vcBaseB">${esc(S.mark_cleaned)}</button></div></div>
  ${extra}
  <div id="vcConf"><div class="pn" role="dialog" aria-modal="true"><h3 id="vcCT">–</h3><p id="vcCP"></p><p class="nt" id="vcCN"></p>
    <div class="btns"><button type="button" id="vcCX">${esc(S.cancel)}</button><button type="button" class="go" id="vcCG">OK</button></div></div></div>
  <div id="vcMenu"></div>
  <div id="vcToast" role="status"></div>
</div>`;

const VacuumExt = {
  _vcInitPage() {
    const list = (this._c.vacuum.vacuums || []).filter((v) => v && isEnt(v.entity));
    const main = list[0], rest = list.slice(1, 4);
    const pg = document.createElement('div');
    pg.id = 'pgVacuum'; pg.innerHTML = HTML(rest.map((v, i) => F1_HTML(i ? '_' + (i + 1) : '')).join(''));
    const $ = (id) => pg.querySelector('#' + id);
    const th = Object.assign({ warn_pct: 50, low_pct: 20, low_battery: 20 }, main.thresholds || {});
    this._vcc = Object.assign({ settings: [], schedule: [], consumables: [], station: [], base_clean: {}, clean_script: {} }, main, { th, night_from: this._c.vacuum.night_from, night_to: this._c.vacuum.night_to });
    this._vc = { pg, $, rest, vis: false, tm: null, sig: null, ver: 0, sel: new Set(), rm: {}, mapSig: '', unSince: 0, lastCls: null, pend: null, toastT: null, guard: 0, f1Key: {} };
    this._vcBuild();
    this._vc.obs = new MutationObserver(() => this._vcVis()); this._vc.obs.observe(pg, { attributes: true, attributeFilter: ['class'] });
    this._vc.onVis = () => this._vcVis();
    document.addEventListener('visibilitychange', this._vc.onVis);
    return pg;
  },
  _vcTap(node, id) { if (!node || !isEnt(id)) return; this.tap(node, (e) => { e.stopPropagation(); this.moreInfo(id); }); },
  _vcName() { return this._vcc.name || this.name(this._vcc.entity); },
  _vcDreame() { return this._vcc.integration === 'dreame'; },

  _vcBuild() {
    const c = this._vcc, S0 = this._vc, $ = S0.$, B = c.base_clean || {};
    $('vcName').textContent = this._vcName();
    this._vcTap($('vcState'), c.entity); this._vcTap($('vcBat'), c.battery || c.entity);
    $('vcCMode').addEventListener('click', (e) => { e.stopPropagation(); if (S0.set[0]) this._vcMenu(S0.set[0], $('vcCMode')); });
    this._vcTap($('vcMapChip'), c.map_camera); this._vcTap($('vcLast'), c.last_run); this._vcTap($('vcStaS'), c.station_status); this._vcTap($('vcBase'), B.date || B.days);
    // settings tiles: label, select (or number) entity, kind (mode | opt | wet | raw)
    S0.set = (c.settings || []).filter((s) => s && isEnt(s.entity)).map((s) => {
      const d = document.createElement('div'); d.className = 'vcT'; d.innerHTML = '<small></small><b>–</b>'; d.firstChild.textContent = s.label || this.name(s.entity);
      const o = { s, v: d.lastChild, d };
      if (s.kind !== 'raw') { d.classList.add('dd'); this.tap(d, (e) => { e.stopPropagation(); this._vcMenu(o); }); } else d.style.cursor = 'default';
      $('vcSg').appendChild(d); return o;
    });
    $('vcSet').classList.toggle('hide', !S0.set.length);
    $('vcCMode').classList.toggle('hide', !S0.set.length || S0.set[0].s.kind !== 'mode');
    // schedule: this vacuum's automations, then the others'
    S0.sch = [c].concat(S0.rest).reduce((a, v) => a.concat((v.schedule || []).filter((x) => x && isEnt(x.automation))), []).slice(0, 3).map((x) => {
      const d = document.createElement('div'); d.className = 'vcS'; d.innerHTML = '<b></b><span></span>'; this._vcTap(d, x.automation); $('vcSl').appendChild(d); return { x, d };
    });
    $('vcSch').classList.toggle('hide', !S0.sch.length);
    // maintenance
    S0.cons = (c.consumables || []).filter((x) => x && isEnt(x.percent)).map((x) => {
      const d = document.createElement('div'); d.className = 'vcC'; d.innerHTML = '<div class="t"><span></span><em>–</em></div><div class="b"><i></i></div><div class="h"></div>';
      d.querySelector('span').textContent = x.name || this.name(x.percent); this._vcTap(d, x.percent); $('vcCons').appendChild(d);
      return { x, d, em: d.querySelector('em'), bar: d.querySelector('i'), h: d.querySelector('.h') };
    });
    // base station
    S0.sta = (c.station || []).filter((x) => x && isEnt(x.entity)).map((x) => {
      const d = document.createElement('div'); d.className = 'vcW'; d.innerHTML = '<small></small><b>–</b>'; d.firstChild.textContent = x.name || this.name(x.entity);
      this._vcTap(d, x.entity); $('vcWg').appendChild(d); return { x, d, v: d.lastChild };
    });
    $('vcBase').classList.toggle('hide', !isEnt(B.days));
    $('vcBaseB').classList.toggle('hide', !isEnt(B.reset_script));
    $('vcBaseB').addEventListener('click', (e) => {
      e.stopPropagation();
      this._vcAsk({ title: S.mark_cleaned_q, text: S.mark_cleaned_text, label: S.mark_cleaned, day: true, calls: [['script', 'turn_on', { entity_id: B.reset_script }]], msg: S.counter_reset });
    });
    // map and rooms (Dreame), panel visibility
    $('vcMapT').textContent = c.map_title || S.map;
    $('vcMapP').classList.toggle('hide', !(this._vcDreame() && isEnt(c.map_camera)));
    $('vcMaint').classList.toggle('hide', !S0.cons.length);
    $('vcSta').classList.toggle('hide', !S0.sta.length && !isEnt(B.days));
    // compact cards for the other vacuums
    S0.f1 = S0.rest.map((v, i) => {
      const sfx = i ? '_' + (i + 1) : '';
      const q = (id) => $(id + sfx);
      q('vcF1N').textContent = v.name || this.name(v.entity);
      this._vcTap(q('vcF1S'), v.entity); this._vcTap(q('vcF1B').parentNode, v.battery || v.entity);
      const mode = (v.settings || []).find((s) => s && isEnt(s.entity));
      [[S.last_run_area, v.last_area], [S.last_run_time, v.last_time], [S.mode_fan, mode && mode.entity]].forEach((x) => {
        const d = document.createElement('div'); d.className = 'vcT'; d.innerHTML = '<small></small><b>–</b>'; d.firstChild.textContent = x[0];
        this._vcTap(d, x[1]); q('vcF1K').appendChild(d);
        if (!isEnt(x[1]) && x[0] !== S.mode_fan) d.style.visibility = 'hidden';
      });
      return { v, i, q, mode, k: [].slice.call(q('vcF1K').children).map((d) => d.lastChild) };
    });
    this._vcLayout();
    S0.pg.addEventListener('click', (e) => { if (S0.menu && !(e.target.closest && e.target.closest('#vcMenu'))) this._vcMenuClose(); });
    $('vcCX').addEventListener('click', () => this._vcClose());
    $('vcCG').addEventListener('click', () => this._vcGo());
    $('vcConf').addEventListener('click', (e) => { if (e.target === $('vcConf')) this._vcClose(); });
    const ids = [c.entity, c.state_sensor, c.error, c.problem, c.battery, c.progress, c.current_room, c.last_run, c.last_area, c.last_time, c.station_status, B.days, B.date];
    S0.sch.forEach((x) => ids.push(x.x.automation));
    S0.rest.forEach((v) => ids.push(v.entity, v.battery, v.last_area, v.last_time));
    S0.f1.forEach((f) => { if (f.mode) ids.push(f.mode.entity); });
    S0.set.forEach((s) => ids.push(s.s.entity)); S0.cons.forEach((x) => ids.push(x.x.percent, x.x.hours_left)); S0.sta.forEach((x) => ids.push(x.x.entity));
    S0.ids = ids.filter(isEnt);
  },

  /* right column: maintenance, base station, then the compact cards, top-down; left column likewise */
  _vcLayout() {
    const S0 = this._vc, $ = S0.$;
    let y = 84;
    const put = (n, h) => { if (!n || n.classList.contains('hide')) return; if (y + h > 776) { n.classList.add('hide'); return; } n.style.top = y + 'px'; y += h + 12; };
    put($('vcMaint'), 240); put($('vcSta'), 236);
    S0.f1.forEach((f) => put(f.q('vcF1'), 192));
    // with only compact cards and no map, the cards may as well sit at the bottom as before
    if ($('vcMaint').classList.contains('hide') && $('vcSta').classList.contains('hide') && S0.f1.length === 1) S0.f1[0].q('vcF1').style.top = '584px';
    let yl = 414;
    const putL = (n, h) => { if (n.classList.contains('hide')) return; n.style.top = yl + 'px'; yl += h + 12; };
    putL($('vcSet'), 152); putL($('vcSch'), 198);
  },

  _vcVis() {
    const S0 = this._vc; if (!S0) return;
    const on = !S0.pg.classList.contains('off') && !document.hidden;
    if (on === S0.vis) return; S0.vis = on;
    if (on) {
      S0.sig = null; this._updateVacuum();
      S0.tm = setInterval(() => { if (!S0.vis) return; S0.sig = null; try { this._updateVacuum(); } catch (e) { console.warn('[oriel] vacuum tick', e); } }, 30000);
    } else {
      clearInterval(S0.tm); S0.tm = null; clearTimeout(this._timers && this._timers.vcUn); clearTimeout(this._timers && this._timers.vcRef);
      this._vcClose(); this._vcMenuClose(); S0.sel.clear();
    }
  },
  _vcStop() {
    const S0 = this._vc; if (!S0) return;
    clearInterval(S0.tm); S0.tm = null; clearTimeout(S0.toastT);
    if (this._timers) { clearTimeout(this._timers.vcUn); clearTimeout(this._timers.vcRef); clearTimeout(this._timers.vcWet); }
    if (S0.obs) S0.obs.disconnect();
    if (S0.onVis) document.removeEventListener('visibilitychange', S0.onVis);
    S0.vis = false;
  },

  /* ---------- state ---------- */
  _vcStateNow() {
    const c = this._vcc, S0 = this._vc, vs = this.sv(c.entity), raw = this.sv(c.state_sensor);
    const gone = bad(vs) && (!isEnt(c.state_sensor) || bad(raw));
    if (gone) {
      if (!S0.unSince) S0.unSince = Date.now();
      if (!S0.lastCls || Date.now() - S0.unSince >= 90000) return { key: 'unavail', sub: t('not_reported_for_while', { name: this._vcName() }) };
      if (S0.vis) this.debounce('vcUn', 91000, () => { S0.sig = null; this._updateVacuum(); });
      return S0.lastCls;
    }
    S0.unSince = 0;
    let key = null, sub = '';
    if (!bad(raw) && VC_MAP[raw]) { key = VC_MAP[raw][0]; sub = S[VC_MAP[raw][1]]; if (raw === 'charging') { const b = this._vcBatt(); sub = S.vs_charging + (b !== null ? ' · ' + Math.round(b) + '%' : ''); } }
    else if (!bad(vs) && VC_FALL[vs]) { key = VC_FALL[vs]; sub = S[VC_ST[key].l]; }
    else { key = 'idle'; sub = bad(raw) ? S.state_unknown : tidy(raw); }
    const cls = { key, sub }; S0.lastCls = cls; return cls;
  },
  _vcBatt(v) {
    v = v || this._vcc;
    const b = this.num(v.battery); if (b !== null) return b;
    const s = this.st(v.entity), a = s && s.attributes && s.attributes.battery_level;
    return Number.isFinite(+a) && a !== null && a !== '' ? +a : null;
  },
  _vcStaBad(x, s) {
    const ok = x.ok_state !== undefined && x.ok_state !== '' ? String(x.ok_state) : 'installed';
    return s !== ok;
  },
  _vcStaText(x, s) {
    if (!this._vcStaBad(x, s)) return x.ok_label || tidy(s);
    return s === 'not_installed' || s === 'missing' ? S.missing : tidy(s);
  },
  _vcAttn() {
    const c = this._vcc, th = c.th, badL = [], warn = [];
    this._vc.cons.forEach(({ x }) => {
      const v = this.num(x.percent); if (v === null) return;
      if (v < th.low_pct) badL.push((x.name || '') + ' ' + Math.round(v) + '%'); else if (v < th.warn_pct) warn.push(x.name || '');
    });
    const stBad = [];
    this._vc.sta.forEach(({ x }) => {
      const s = this.sv(x.entity); if (bad(s) || !this._vcStaBad(x, s)) return;
      stBad.push((x.name || '') + ': ' + (s === 'not_installed' || s === 'missing' ? S.missing_lc : tidy(s).toLowerCase()));
    });
    const B = c.base_clean || {}, days = this.num(B.days), over = days !== null && days > (Number(B.limit_days) || 13);
    return { cons: badL, warn, stBad, over, days };
  },
  _vcErr() {
    const c = this._vcc, e = this.sv(c.error), vs = this.st(c.entity), a = vs && vs.attributes && vs.attributes.error;
    if (!bad(e) && e !== 'no_error') return tidy(e);
    if (a && a !== 'No error' && !bad(a)) return String(a);
    if (this.sv(c.problem) === 'on') return S.problem_reported;
    const lw = vs && vs.attributes && vs.attributes.low_water_warning;
    if (lw && lw !== 'No warning') return String(lw);
    return '';
  },

  /* ---------- update ---------- */
  _updateVacuum() {
    const S0 = this._vc; if (!S0 || !this._h) return;
    const c = this._vcc, cam = this.st(c.map_camera), at = (cam && cam.attributes) || {};
    const un = bad(this.sv(c.entity)) && bad(this.sv(c.state_sensor));
    const sig = S0.ids.map((id) => { const s = this.st(id); return s ? s.state : '-'; }).join('|') + '#' + (cam ? cam.state : '-') + JSON.stringify(at.vacuum_position || 0) + JSON.stringify(at.active_segments || 0) + JSON.stringify(Object.keys(at.rooms || {})) +
      '#' + this._vcErr() + '#' + (this.st(c.entity) ? JSON.stringify((this.st(c.entity).attributes || {}).fan_speed) + JSON.stringify((this.st(c.entity).attributes || {}).battery_level) : '') + '#' + S0.ver + '#' + un + '#' + (S0.vis ? new Date().getMinutes() : '');
    if (sig === S0.sig) return; S0.sig = sig;
    S0.cls = this._vcStateNow(); S0.at = this._vcAttn();
    [this._vcHero, this._vcMapDraw, this._vcRoomsDraw, this._vcSettings, this._vcSchedule, this._vcMaintDraw, this._vcStation, this._vcF1Draw].forEach((fn) => {
      try { fn.call(this); } catch (e) { console.warn('[oriel] vacuum section', e); }
    });
  },

  _vcWhen(d) {
    const now = new Date();
    if (sameDay(d, now)) return t('when_today', { t: hm(d) });
    if (sameDay(d, new Date(now.getTime() - 86400000))) return t('when_yesterday', { t: hm(d) });
    return this._vcDay(d) + ' ' + hm(d);
  },
  _vcDay(d) { try { return d.toLocaleDateString(this.lang(), { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d.toDateString(); } },

  _vcHero() {
    const c = this._vcc, S0 = this._vc, $ = S0.$, cls = S0.cls, d = VC_ST[cls.key] || VC_ST.idle, A = S0.at, err = this._vcErr();
    const alert = !!(d.bad || err || A.stBad.length || A.over);
    const col = alert && cls.key !== 'unavail' ? RD : d.c, tc = alert && cls.key !== 'unavail' ? RT : d.t;
    const h = $('vcHero'); h.style.setProperty('--gc', col); h.style.setProperty('--an', alert && !d.run ? 'none' : d.an); h.classList.toggle('alert', alert && cls.key !== 'unavail');
    const word = $('vcState'), wl = S[d.l]; word.textContent = wl; word.style.color = this._stateText(tc); word.style.fontSize = wl.length > 11 ? '38px' : '';
    const room = this.sv(c.current_room), prog = this.num(c.progress), active = !!d.run;
    let sub = cls.sub;
    if (cls.key === 'unavail') sub = cls.sub;
    else if (d.bad || err) sub = (err ? t('error_x', { e: err }) : t('reports_error', { name: this._vcName() })) + (d.bad ? S.check_then_dock : '');
    else if (cls.key === 'cleaning' && !bad(room) && room !== undefined) sub = cls.sub + ' · ' + room;
    else if (cls.key === 'paused' && !bad(room) && room !== undefined) sub = t('paused_in', { room });
    else if (!active && (A.stBad.length || A.over)) sub = A.stBad.slice(0, 2).map((x) => x.replace(': ' + S.missing_lc, ' ' + S.missing_lc)).concat(A.over ? [t('base_cleaned_ago', { n: A.days })] : []).slice(0, 2).join(' · ');
    $('vcSub').textContent = sub;
    const pr = $('vcProg'), showP = prog !== null && active; pr.style.visibility = showP ? 'visible' : 'hidden'; pr.firstChild.style.width = showP ? Math.max(0, Math.min(100, prog)) + '%' : '0';
    let last;
    if (showP) last = t('progress_pct', { n: Math.round(prog) }) + (!bad(room) && room !== undefined && !d.st ? t('now_in', { room }) : '');
    else if (active) last = S.run_in_progress;
    else {
      const hs = this.sv(c.last_run), dt = bad(hs) ? null : new Date(hs), ar = this.num(c.last_area), tm = this.num(c.last_time);
      last = dt && !isNaN(dt) ? t('last_run', { when: this._vcWhen(dt) }) + (ar !== null ? ' · ' + Math.round(ar) + ' m²' : '') + (tm !== null ? ' · ' + t('min_cleaning', { n: Math.round(tm) }) : '') : S.no_run_recorded;
    }
    $('vcLast').textContent = last;
    const b = this._vcBatt(), bc = $('vcBat'); bc.textContent = b === null ? '–' : Math.round(b) + '%'; bc.className = 'chip' + (b !== null && b < c.th.low_battery ? ' warn' : '');
    const m0 = S0.set[0];
    if (m0) { const m = this.ov('vc:' + m0.s.entity, this.sv(m0.s.entity)); $('vcCMode').textContent = bad(m) ? '–' : (MODE[m] ? S[MODE[m]] : tidy(m)) + ' ▾'; }
    const nb = A.cons.length + A.stBad.length + (A.over ? 1 : 0), nw = A.warn.length, mt = $('vcCMt');
    mt.style.display = cls.key === 'unavail' || (!S0.cons.length && !S0.sta.length && !isEnt((c.base_clean || {}).days)) ? 'none' : '';
    mt.className = 'chip ' + (nb ? 'bad' : nw ? 'warn' : 'ok'); mt.textContent = nb ? t('attention_n', { n: nb }) : nw ? t('to_check_n', { n: nw }) : S.all_good;
    // controls
    const key = cls.key + '|' + (showP ? 1 : 0), ctl = $('vcCtl');
    if (S0.ctlKey !== key) {
      S0.ctlKey = key; ctl.innerHTML = '';
      let list = d.ctl.slice();
      if (d.st && !showP) list = ['clean'];
      list.forEach((k) => {
        const bt = { clean: ['pri', 'spark', (c.clean_script && c.clean_script.label) || S.start_cleaning], pause: ['', 'pause', S.pause], stop: ['', 'stop', S.stop], dock: ['', 'dock', S.dock], resume: ['pri', 'play', S.resume] }[k];
        const e = document.createElement('button'); e.type = 'button'; e.className = 'vcB ' + bt[0]; e.innerHTML = ic(bt[1]) + '<span></span>'; e.lastChild.textContent = bt[2];
        e.addEventListener('click', () => this._vcAct(k)); ctl.appendChild(e);
      });
    }
    S0.canStart = !!d.start || (!!d.st && !showP);
  },

  /* ---------- map (Dreame map camera attributes: rooms, charger_position, vacuum_position) ---------- */
  _vcMapDraw() {
    const c = this._vcc, S0 = this._vc, $ = S0.$;
    if (!this._vcDreame() || !isEnt(c.map_camera)) return;
    const cam = this.st(c.map_camera), at = (cam && cam.attributes) || {}, rooms = at.rooms || {};
    const ids = Object.keys(rooms).filter((k) => rooms[k] && ['x0', 'y0', 'x1', 'y1'].every((f) => Number.isFinite(rooms[k][f])));
    const svg = $('vcMap'); $('vcMapMsg').style.display = ids.length ? 'none' : 'block';
    const room = this.sv(c.current_room), run = S0.cls && (VC_ST[S0.cls.key] || {}).run;
    const msig = ids.map((k) => k + ':' + rooms[k].x0 + ',' + rooms[k].y0 + ',' + rooms[k].x1 + ',' + rooms[k].y1 + (rooms[k].custom_name || rooms[k].name)).join(';');
    const mk = (tg, a, p) => el(tg, a, p || svg);
    if (msig !== S0.mapSig) {
      S0.mapSig = msig; svg.innerHTML = ''; S0.rm = {}; S0.dot = null;
      if (ids.length) {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        ids.forEach((k) => { const r = rooms[k]; x0 = Math.min(x0, r.x0); x1 = Math.max(x1, r.x1); y0 = Math.min(y0, r.y0); y1 = Math.max(y1, r.y1); });
        const ch = at.charger_position; if (ch && Number.isFinite(ch.x)) { x0 = Math.min(x0, ch.x - 200); x1 = Math.max(x1, ch.x + 200); y0 = Math.min(y0, ch.y - 200); y1 = Math.max(y1, ch.y + 200); }
        const pd = 14, sc = Math.min((318 - 2 * pd) / (x1 - x0), (440 - 2 * pd) / (y1 - y0)), ox = (318 - (x1 - x0) * sc) / 2, oy = pd;
        S0.tf = { X: (x) => ox + (x - x0) * sc, Y: (y) => oy + (y1 - y) * sc, sc };
        ids.slice().sort((a, b) => (rooms[b].x1 - rooms[b].x0) * (rooms[b].y1 - rooms[b].y0) - (rooms[a].x1 - rooms[a].x0) * (rooms[a].y1 - rooms[a].y0)).forEach((k) => {
          const r = rooms[k], g = mk('g', { class: 'rm' }), w = (r.x1 - r.x0) * sc;
          mk('rect', { x: S0.tf.X(r.x0), y: S0.tf.Y(r.y1), width: w, height: (r.y1 - r.y0) * sc, rx: 10 }, g);
          const lx = Number.isFinite(r.x) ? r.x : (r.x0 + r.x1) / 2, ly = Number.isFinite(r.y) ? r.y : (r.y0 + r.y1) / 2;
          const tx = mk('text', { x: S0.tf.X(lx), y: S0.tf.Y(ly) + 4, 'text-anchor': 'middle' }, g);
          let nm = String(r.custom_name || r.name || t('room_n', { n: k })); if (nm.length * 6.6 > w) nm = nm.split(' ')[0]; tx.textContent = nm;
          g.addEventListener('click', () => this._vcPick(+k)); S0.rm[k] = g;
        });
        if (ch && Number.isFinite(ch.x)) mk('rect', { x: S0.tf.X(ch.x) - 9, y: S0.tf.Y(ch.y) - 9, width: 18, height: 18, rx: 5, fill: 'rgb(var(--oriel-accent-strong))', stroke: 'rgb(var(--oriel-on-dark))', 'stroke-width': 1.5 });
        S0.ring = mk('circle', { class: 'rbring', cx: 0, cy: 0, r: 8 }); S0.dot = mk('circle', { class: 'rb', cx: 0, cy: 0, r: 6.5, stroke: 'rgb(var(--oriel-on-dark))', 'stroke-width': 2 });
      }
    }
    const lbl = (k) => S[(VC_ST[k] || {}).l] || S.state_unknown;
    let txt = S.state_unknown;
    if (S0.cls.key === 'unavail') txt = S.vl_unavail;
    else if (!run && !bad(room) && room !== undefined && S0.cls.key !== 'error') txt = t('docked_in', { room });
    else if (!bad(room) && room !== undefined) txt = lbl(S0.cls.key) + ' · ' + room;
    else txt = lbl(S0.cls.key);
    if (['washing', 'filling', 'drying', 'emptying', 'towash'].includes(S0.cls.key)) txt = S.at_base_station;
    $('vcMapChip').textContent = txt;
    if (!ids.length) return;
    const p = at.vacuum_position, ok = p && Number.isFinite(p.x) && S0.tf && S0.cls.key !== 'unavail';
    if (S0.dot) { S0.dot.style.display = ok ? '' : 'none'; S0.ring.style.display = ok && S0.cls.key === 'cleaning' ? '' : 'none'; if (ok) { const x = S0.tf.X(p.x), y = S0.tf.Y(p.y); S0.dot.setAttribute('cx', x); S0.dot.setAttribute('cy', y); S0.ring.setAttribute('cx', x); S0.ring.setAttribute('cy', y); } }
    Object.keys(S0.rm).forEach((k) => {
      const nm = rooms[k] && (rooms[k].custom_name || rooms[k].name);
      S0.rm[k].classList.toggle('sel', S0.sel.has(+k)); S0.rm[k].classList.toggle('act', !!(run && !bad(room) && nm === room));
    });
  },
  _vcRoomList() {
    const cam = this.st(this._vcc.map_camera), rooms = (cam && cam.attributes && cam.attributes.rooms) || {};
    return Object.keys(rooms).filter((k) => rooms[k]).map((k) => ({ id: +k, n: String(rooms[k].custom_name || rooms[k].name || t('room_n', { n: k })), o: Number.isFinite(rooms[k].order) ? rooms[k].order : 99 })).sort((a, b) => a.o - b.o || a.id - b.id).slice(0, 7);
  },
  _vcRoomsDraw() {
    if (!this._vcDreame() || !isEnt(this._vcc.map_camera)) return;
    const S0 = this._vc, $ = S0.$, rg = $('vcRooms'), room = this.sv(this._vcc.current_room), run = S0.cls && (VC_ST[S0.cls.key] || {}).run;
    const can = !!S0.canStart && S0.cls.key !== 'unavail'; if (!can) S0.sel.clear();
    rg.innerHTML = '';
    this._vcRoomList().forEach((r) => {
      const b = document.createElement('button'); b.type = 'button'; const a = !!(run && !bad(room) && r.n === room);
      b.className = 'vcR' + (S0.sel.has(r.id) ? ' sel' : '') + (a ? ' act' : '') + (can ? '' : ' off');
      b.setAttribute('aria-pressed', String(S0.sel.has(r.id)));
      const s1 = document.createElement('span'); s1.textContent = r.n; const s2 = document.createElement('small'); s2.textContent = a ? S.cleaning_lc : (S0.sel.has(r.id) ? S.selected : '');
      b.appendChild(s1); b.appendChild(s2); b.addEventListener('click', () => this._vcPick(r.id)); rg.appendChild(b);
    });
    const n = S0.sel.size, g = document.createElement('button'); g.type = 'button'; g.className = 'vcR go' + (n && can ? '' : ' dim');
    g.innerHTML = ic('spark') + '<span></span>'; g.lastChild.textContent = n ? t(n > 1 ? 'clean_n_rooms' : 'clean_one_room', { n }) : S.pick_rooms;
    g.addEventListener('click', () => { if (n && can) this._vcAct('sel'); }); if (n && can) rg.appendChild(g);
  },
  _vcPick(id) {
    const S0 = this._vc; if (!S0 || !S0.canStart || !S0.cls || S0.cls.key === 'unavail') return;
    if (S0.sel.has(id)) S0.sel.delete(id); else S0.sel.add(id);
    S0.ver++; this._updateVacuum();
  },

  /* ---------- panels ---------- */
  _vcSettings() {
    this._vc.set.forEach((o) => {
      const s = this.st(o.s.entity); let v = s ? s.state : undefined; let tx = '–'; v = this.ov('vc:' + o.s.entity, v);
      if (!bad(v)) tx = o.s.kind === 'mode' ? (MODE[v] ? S[MODE[v]] : tidy(v)) : o.s.kind === 'wet' ? t('n_of', { n: Math.round(parseFloat(v)), max: (s && s.attributes && s.attributes.max) || 32 }) : o.s.kind === 'opt' ? tidy(v) : String(v).replace(/ floor$/i, '');
      o.v.textContent = tx;
    });
  },
  _vcNext(x, now) {
    if (!x.at || !/^\d{1,2}:\d{2}$/.test(x.at)) return null;
    const [h, m] = x.at.split(':').map(Number), days = (x.weekdays || []).map(Number).filter((d) => d >= 0 && d <= 6);
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m, 0);
      if (d > now && (!days.length || days.includes(d.getDay()))) return d;
    }
    return null;
  },
  _vcSchedule() {
    const now = new Date();
    this._vc.sch.forEach(({ x, d }) => {
      const a = this.st(x.automation), on = a && a.state === 'on', lt = a && a.attributes && a.attributes.last_triggered ? new Date(a.attributes.last_triggered) : null;
      const nm = x.label || (a && a.attributes.friendly_name) || x.automation, nx = on ? this._vcNext(x, now) : null;
      d.classList.toggle('off', !on);
      d.children[0].textContent = !a ? t('automation_not_found', { name: x.label || x.automation }) : on ? nm : t('automation_off', { name: nm });
      const parts = [];
      if (nx) parts.push(t('next_on', { d: this._vcDay(nx) }));
      if (on && x.detail) parts.push(x.detail);
      d.children[1].textContent = parts.join(' · ') + (parts.length ? '.' : '') + (lt ? (parts.length ? ' ' : '') + t('ran_when', { when: this._vcWhen(lt) }) : (a ? '' : ''));
      if (!lt && !parts.length && a) d.children[1].textContent = S.no_run_recorded;
    });
  },
  _vcMaintDraw() {
    const c = this._vcc, S0 = this._vc, A = S0.at, $ = S0.$;
    S0.cons.forEach((o) => {
      const v = this.num(o.x.percent), h = this.num(o.x.hours_left);
      const cl = v === null ? '' : v < c.th.low_pct ? 'r' : v < c.th.warn_pct ? 'o' : '';
      o.d.className = 'vcC ' + cl; o.em.textContent = v === null ? '–' : Math.round(v) + '%'; o.bar.style.width = v === null ? '0' : Math.max(0, Math.min(100, v)) + '%';
      o.h.textContent = h === null ? '' : t('h_left', { n: Math.round(h) });
    });
    const nb = A.cons.length + A.stBad.length + (A.over ? 1 : 0), nw = A.warn.length, ch = $('vcMChip');
    ch.className = 'chip dk' + (nb ? ' bad' : ''); ch.textContent = nb ? t('n_need_attention', { n: nb }) : nw ? t('n_to_check', { n: nw }) : S.all_good;
  },
  _vcStation() {
    const c = this._vcc, S0 = this._vc, A = S0.at, $ = S0.$;
    S0.sta.forEach((o) => {
      const s = this.sv(o.x.entity); let tx = '–', bd = false;
      if (!bad(s)) { bd = this._vcStaBad(o.x, s); tx = this._vcStaText(o.x, s); }
      o.d.classList.toggle('bad', bd); o.v.textContent = tx;
    });
    const ss = this.sv(c.station_status); $('vcStaS').textContent = bad(ss) ? '–' : (SW[ss] ? S[SW[ss]] : tidy(ss));
    const bs = $('vcBase'), d = A.days; bs.classList.toggle('bad', !!A.over);
    $('vcBaseT').textContent = d === null ? S.base_date_unknown : d < 1 ? S.base_cleaned_today : t(Math.round(d) === 1 ? 'base_cleaned_1' : 'base_cleaned_n', { n: Math.round(d) });
  },
  _vcF1Draw() {
    const S0 = this._vc;
    S0.f1.forEach((f) => {
      const v = f.v, s = this.st(v.entity), st = s ? s.state : undefined, q = f.q;
      const chip = q('vcF1S'); chip.textContent = bad(st) ? S.not_reporting_cap : tidy(st); chip.className = 'chip' + (bad(st) || st === 'error' ? ' warn' : '');
      const b = this._vcBatt(v); q('vcF1B').textContent = b === null ? '–' : Math.round(b);
      const a = this.num(v.last_area), tm = this.num(v.last_time), m = f.mode ? this.sv(f.mode.entity) : undefined, fan = s && s.attributes && s.attributes.fan_speed;
      f.k[0].textContent = a === null ? '–' : Math.round(a) + ' m²'; f.k[1].textContent = tm === null ? '–' : Math.round(tm) + ' min';
      f.k[2].textContent = f.mode ? (bad(m) ? '–' : tidy(m)) + (fan ? ' · ' + fan : '') : (fan ? tidy(fan) : '–');
      const L = F1_BUTTONS[st] || [], key = String(st), box = q('vcF1C');
      if (S0.f1Key[f.i] !== key) {
        S0.f1Key[f.i] = key; box.innerHTML = '';
        L.forEach((n) => {
          const bt = { start: ['pri', 'play', S.start], pause: ['', 'pause', S.pause], stop: ['', 'stop', S.stop], dock: ['', 'dock', S.dock] }[n], e = document.createElement('button');
          e.type = 'button'; e.className = 'vcB ' + bt[0]; e.innerHTML = ic(bt[1]) + '<span></span>'; e.lastChild.textContent = bt[2]; e.addEventListener('click', () => this._vcF1Act(f, n)); box.appendChild(e);
        });
      }
    });
  },

  /* ---------- settings dropdown ---------- */
  _vcMenu(o, anchor) {
    const S0 = this._vc, $ = S0.$, id = o.s.entity, st = this.st(id), menu = $('vcMenu'); anchor = anchor || o.d;
    if (S0.menu === id) { this._vcMenuClose(); return; }
    if (!st || bad(st.state)) return;
    menu.innerHTML = '';
    if (o.s.kind === 'wet') {
      const a = st.attributes || {}, mn = Number.isFinite(+a.min) ? +a.min : 1, mx = Number.isFinite(+a.max) ? +a.max : 32, stp = Number.isFinite(+a.step) && +a.step > 0 ? +a.step : 1;
      const row = document.createElement('div'); row.className = 'stp';
      const minus = document.createElement('button'), plus = document.createElement('button'), val = document.createElement('span');
      minus.type = plus.type = 'button'; minus.textContent = '−'; plus.textContent = '+'; minus.setAttribute('aria-label', S.lower); plus.setAttribute('aria-label', S.raise);
      let cur = this.ov('vc:' + id, parseFloat(st.state)); val.textContent = t('n_of', { n: Math.round(cur), max: mx });
      const bump = (dir) => {
        cur = Math.max(mn, Math.min(mx, cur + dir * stp)); val.textContent = t('n_of', { n: Math.round(cur), max: mx });
        this.override('vc:' + id, cur, 6000); S0.ver++; this._updateVacuum();
        this.debounce('vcWet', 700, () => this.call('number', 'set_value', { entity_id: id, value: cur }));
      };
      minus.addEventListener('click', (e) => { e.stopPropagation(); bump(-1); }); plus.addEventListener('click', (e) => { e.stopPropagation(); bump(1); });
      row.appendChild(minus); row.appendChild(val); row.appendChild(plus); menu.appendChild(row);
    } else {
      const cur = this.ov('vc:' + id, st.state), opts = (st.attributes && st.attributes.options) || [];
      opts.forEach((op) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = op === cur ? 'on' : '';
        b.textContent = o.s.kind === 'mode' ? (MODE[op] ? S[MODE[op]] : tidy(op)) : tidy(op);
        b.addEventListener('click', (e) => {
          e.stopPropagation(); this._vcMenuClose();
          if (op === cur) return;
          this.call('select', 'select_option', { entity_id: id, option: op });
          this.override('vc:' + id, op, 6000); S0.ver++; this._updateVacuum(); this._vcLater();
        });
        menu.appendChild(b);
      });
      if (!opts.length) return;
    }
    menu.classList.add('show'); S0.menu = id;
    let ax = 0, ay = 0, n = anchor; const wrap = $('vcWrap');
    while (n && n !== wrap) { ax += n.offsetLeft; ay += n.offsetTop; n = n.offsetParent; }
    const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(ax, 1280 - w - 8)) + 'px';
    menu.style.top = (ay + anchor.offsetHeight + 4 + h > 790 ? Math.max(8, ay - h - 4) : ay + anchor.offsetHeight + 4) + 'px';
  },
  _vcMenuClose() { const S0 = this._vc; if (!S0) return; S0.menu = null; const m = S0.$('vcMenu'); if (m) m.classList.remove('show'); },

  /* ---------- controls ---------- */
  _vcAct(k) {
    const c = this._vcc, S0 = this._vc, e = { entity_id: c.entity }, name = this._vcName();
    if (k === 'pause' || k === 'stop' || k === 'dock') {
      const svc = { pause: 'pause', stop: 'stop', dock: 'return_to_base' }[k];
      this.call('vacuum', svc, e); this._vcToast({ pause: S.pausing, stop: S.stopping, dock: t('sending_to_dock', { name }) }[k]); this._vcLater(); return;
    }
    if (k === 'resume') { this._vcAsk({ title: S.resume_q, text: t('resume_text', { name }), label: S.resume, calls: [['vacuum', 'start', e]], msg: S.resuming }); return; }
    if (k === 'clean') {
      const cs = c.clean_script || {};
      if (isEnt(cs.entity)) this._vcAsk({ title: cs.confirm_title || S.start_cleaning_q, text: cs.description || t('clean_text', { name }), label: S.clean, calls: [['script', 'turn_on', { entity_id: cs.entity }]], msg: cs.toast || S.starting_clean });
      else this._vcAsk({ title: S.start_cleaning_q, text: t('clean_text', { name }), label: S.clean, calls: [['vacuum', 'start', e]], msg: S.starting_clean });
      return;
    }
    if (k === 'sel') {
      const ids = [...S0.sel].sort((a, b) => a - b); if (!ids.length) return;
      const names = this._vcRoomList().filter((r) => S0.sel.has(r.id)).map((r) => r.n).join(', ');
      this._vcAsk({ title: t('clean_q', { label: names }), text: t(ids.length > 1 ? 'clean_rooms_text' : 'clean_room_text', { name }), label: S.clean, calls: [['dreame_vacuum', 'vacuum_clean_segment', { entity_id: c.entity, segments: ids }]], msg: t('starting_x', { x: names }) });
    }
  },
  _vcF1Act(f, k) {
    const e = { entity_id: f.v.entity }, name = f.v.name || this.name(f.v.entity);
    if (k === 'start') { this._vcAsk({ title: t('start_x_q', { name: name.charAt(0).toLowerCase() + name.slice(1) }), text: S.start_text, label: S.start, calls: [['vacuum', 'start', e]], msg: t('starting_the', { x: name.charAt(0).toLowerCase() + name.slice(1) }) }); return; }
    const svc = { pause: 'pause', stop: 'stop', dock: 'return_to_base' }[k];
    this.call('vacuum', svc, e); this._vcToast({ pause: S.pausing, stop: S.stopping, dock: S.sending_it_to_dock }[k]); this._vcLater();
  },
  _vcAsk(spec) {
    const S0 = this._vc, $ = S0.$, h = new Date().getHours(), c = this._vcc;
    S0.pend = spec; S0.guard = Date.now() + 400;
    $('vcCT').textContent = spec.title; $('vcCP').textContent = spec.text;
    const night = !spec.day && (h >= c.night_from || h < c.night_to);
    $('vcCN').textContent = night ? S.night_sure : ''; $('vcCN').style.display = night ? '' : 'none';
    $('vcCG').textContent = spec.label; $('vcConf').classList.add('show');
    setTimeout(() => { try { $('vcCX').focus({ preventScroll: true }); } catch (e) { /* not shown */ } }, 30);
  },
  _vcClose() { const S0 = this._vc; if (!S0) return; S0.pend = null; const n = S0.$('vcConf'); if (n) n.classList.remove('show'); },
  _vcGo() {
    const S0 = this._vc; if (!S0 || !S0.pend || Date.now() < S0.guard) return;
    const p = S0.pend; this._vcClose();
    p.calls.forEach((x) => this.call(x[0], x[1], x[2]));
    S0.sel.clear(); S0.ver++; this._vcToast(p.msg); this._vcLater();
  },
  _vcLater() { this.debounce('vcRef', 2500, () => { const S0 = this._vc; if (S0 && S0.vis) { S0.ver++; this._updateVacuum(); } }); },
  _vcToast(tx) {
    const S0 = this._vc, e = S0.$('vcToast'); if (!e) return; e.textContent = tx; e.style.display = 'block';
    clearTimeout(S0.toastT); S0.toastT = setTimeout(() => { e.style.display = 'none'; }, 2600);
  },
};

registerPage({
  key: 'vacuum', icon: 'vacuum',
  label() { return S.page_vacuum; },
  css: CSS,
  enabled(c) { return (c.vacuum.vacuums || []).some((v) => v && isEnt(v.entity)); },
  init() { return this._vcInitPage(); },
  update() { this._updateVacuum(); },
  stop() { this._vcStop(); },
  methods: VacuumExt,
});
