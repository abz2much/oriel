/* Living Room page: room status, doors and windows, blinds, speaker, scenes, lights with a tune panel,
   streamer selector, now playing, movie mode, TV inputs, apps and a remote. Everything comes from config.living. */
import { registerPage } from '../core.js';
import { S, t } from '../strings.js';
import { hasEntities } from '../config.js';
import { clamp, isEnt, esc, el } from '../util.js';
import { LIGHT, WHITES, COLOURS, SCENE } from '../theme/fixed.js';

const P = {
  alloff: 'M12 3v8M7 6.5a7 7 0 1010 0', back: 'M9 7L4 12l5 5M4 12h10a6 6 0 016 6',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0012 3z',
  close: 'M6 6l12 12M18 6L6 18', door: 'M6 21V4a1 1 0 011-1h10a1 1 0 011 1v17M4 21h16M14 12h.01',
  down2: 'M12 5v14M6 13l6 6 6-6', drop: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4',
  fire: 'M12 3c1 3 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z', home: 'M3 11l9-8 9 8M5 10v10h14V10',
  lamp: 'M9 3h6l2 8H7zM12 11v8M8 21h8', left: 'M19 12H5M11 6l-6 6 6 6', minus: 'M5 12h14',
  moon: 'M20 14A8 8 0 0110 4a8 8 0 1010 10z', music: 'M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z',
  mute: 'M4 10v4h4l5 4V6L8 10zM17 9l5 6M22 9l-5 6', pause: 'M8 5v14M16 5v14', play: 'M8 5l11 7-11 7z', plus: 'M12 5v14M5 12h14',
  right: 'M5 12h14M13 6l6 6-6 6', sliders: 'M4 8h10M18 8h2M4 16h2M10 16h10M14 6v4M6 14v4',
  sofa: 'M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3M3 13a2 2 0 014 0v2h10v-2a2 2 0 014 0v5H3zM5 18v2M19 18v2',
  stop: 'M7 7h10v10H7z', sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  target: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3', tree: 'M12 3l5 7h-3l4 6H6l4-6H7zM12 16v5',
  tv: 'M3 6h18v12H3zM8 21h8', up2: 'M12 19V5M6 11l6-6 6 6', user: 'M12 4a4 4 0 100 8 4 4 0 000-8zM4 21c1-4 4.5-6 8-6s7 2 8 6',
  vdn: 'M4 10v4h4l5 4V6L8 10zM17 10a3 3 0 010 4', vup: 'M4 10v4h4l5 4V6L8 10zM17 9a4 4 0 010 6', win: 'M5 3h14v18H5zM12 3v18M5 12h14',
};
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || P.bulb}"/></svg>`;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const colourTag = (a) => {
  if (!a) return '';
  if (a.color_mode === 'color_temp' && a.color_temp_kelvin) return WHITES.reduce((b, w) => (Math.abs(w[1] - a.color_temp_kelvin) < Math.abs(b[1] - a.color_temp_kelvin) ? w : b))[0];
  if (a.rgb_color) {
    const d = (h) => hexRgb(h).reduce((s, v, i) => s + (v - a.rgb_color[i]) ** 2, 0);
    return COLOURS.reduce((b, c) => (d(c[1]) < d(b[1]) ? c : b))[0];
  }
  return '';
};

const CSS = `
#pgLiving .hd{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500;padding:0 4px}
#pgLiving .hd small{font-size:12px;font-weight:400;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}
#pgLiving .g{display:grid;gap:6px;margin-top:8px}
#lrHero{left:100px;top:84px;width:330px;height:230px;overflow:hidden}
#lrHero .img{position:absolute;inset:0;background:radial-gradient(220px 160px at 50% 55%,${SCENE.panelGlow},transparent 75%),linear-gradient(160deg,${SCENE.panelA},${SCENE.panelB})}
#lrRm{position:absolute;left:0;top:0;transform:translate(-10px,6px) scale(.8);transform-origin:50% 50%}
#lrHero .t{position:absolute;left:18px;top:14px;right:16px;display:flex;justify-content:space-between;align-items:center;color:rgb(var(--oriel-on-dark));gap:8px}#lrHero .t b{font-size:20px;font-weight:300;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#lrHero .b{position:absolute;left:12px;right:12px;bottom:12px;display:flex;gap:6px}#lrHero .b .chip{flex:1;justify-content:center;padding:0 6px;background:rgba(var(--oriel-on-dark),.55);cursor:pointer}
#lrOpen{left:100px;top:326px;width:330px;height:104px;padding:12px 14px}
#lrOg{grid-template-columns:repeat(4,1fr)}
.ot{height:58px;border-radius:16px;background:rgba(var(--oriel-glass),.34);border:1px solid rgba(var(--oriel-glass),.5);display:flex;flex-direction:column;justify-content:space-between;padding:7px 5px;font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));cursor:pointer;min-width:0}
.ot .ic{width:18px;height:18px;color:rgb(var(--oriel-ink))}.ot b{font-weight:500;color:rgb(var(--oriel-ink));font-size:12px;display:block;white-space:nowrap}
.ot span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.ot.open{background:rgb(var(--oriel-bad-bg));border-color:rgb(var(--oriel-bad-line))}.ot.open b{color:rgb(var(--oriel-bad-ink))}
#lrBlinds{left:100px;top:442px;width:330px;height:98px;padding:12px 14px}
#lrBg{grid-template-columns:repeat(4,1fr)}
.bt{height:46px;border-radius:16px;border:1px solid rgba(var(--oriel-glass),.5);background:rgba(var(--oriel-glass),.34);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-size:12px;cursor:pointer;color:rgb(var(--oriel-ink));padding:0 2px}.bt .ic{width:17px;height:17px}.bt:active{background:rgb(var(--oriel-raised))}
#lrSound{left:100px;top:552px;width:330px;height:224px;padding:14px;display:flex;flex-direction:column;gap:10px}
.vol{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center}
.vol .v{text-align:center}.vol .v b{display:block;font-size:40px;font-weight:200;line-height:1;font-variant-numeric:tabular-nums}.vol .v span{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}
.seg{display:flex;gap:3px;height:8px;margin-top:6px}.seg i{flex:1;border-radius:3px;background:rgba(var(--oriel-ink),.16)}.seg i.f{background:rgb(var(--oriel-accent-strong))}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.pillb{height:46px;border-radius:16px;border:1px solid rgba(var(--oriel-glass),.5);background:rgba(var(--oriel-glass),.34);display:flex;align-items:center;gap:8px;padding:0 12px;font-size:12.5px;cursor:pointer;text-align:left;color:rgb(var(--oriel-ink))}
.pillb .ic{width:18px;height:18px}.pillb small{display:block;font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}.pillb.on{background:rgba(var(--oriel-glass),.7);box-shadow:0 0 0 1.5px rgb(var(--oriel-accent-strong))}
#lrScenes{left:calc(444px + var(--dx,0px));top:84px;width:410px;height:150px;padding:14px}
#lrSg{grid-template-columns:repeat(5,1fr);margin-top:10px}
.sc{height:84px;border-radius:18px;border:1px solid rgba(var(--oriel-glass),.5);background:rgba(var(--oriel-glass),.3);display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;padding:10px;font-size:12px;cursor:pointer;text-align:left;color:rgb(var(--oriel-ink));transition:box-shadow .2s;min-width:0}
.sc .ic{width:22px;height:22px}.sc.on{background:rgba(var(--oriel-glass),.7);box-shadow:0 0 0 1.5px var(--c),0 0 16px 2px var(--c)}.sc.on .ic{color:var(--c);filter:saturate(1.4) brightness(.8)}
#lrLights{left:calc(444px + var(--dx,0px));top:246px;width:410px;height:530px;padding:14px}
#lrLgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}
.lt{height:62px;border-radius:18px;border:1px solid rgba(var(--oriel-glass),.5);background:rgba(var(--oriel-glass),.3);padding:8px 10px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;position:relative;transition:box-shadow .2s;text-align:left;color:rgb(var(--oriel-ink));min-width:0}
.lt .r{display:flex;justify-content:space-between;align-items:center}.lt .ic{width:20px;height:20px}.lt .nm{font-size:13px;white-space:nowrap}.lt .nm small{color:rgba(var(--oriel-ink),var(--oriel-soft,.62));font-size:12px;margin-left:6px}
.lt.on{background:rgba(var(--oriel-glass),.66);box-shadow:0 0 0 1.5px var(--c),0 0 16px 2px var(--c)}.lt.on .tg{background:rgb(var(--oriel-accent-strong))}.lt.on .tg::after{left:14px}.lt.on .bi{color:var(--c);filter:brightness(.8) saturate(1.5)}
.lt.sel::before{content:"";position:absolute;right:10px;bottom:-5px;width:10px;height:10px;background:rgb(var(--oriel-raised));transform:rotate(45deg);border-radius:2px;z-index:2}
.tune{width:30px;height:30px;border-radius:50%;border:0;display:grid;place-items:center;background:rgba(var(--oriel-glass),.7);cursor:pointer;margin-right:6px;color:rgb(var(--oriel-ink));padding:0}.tune .ic{width:15px;height:15px}.lt.sel .tune{background:rgb(var(--oriel-ink-fill));color:rgb(var(--oriel-on-dark))}
.rr{display:flex;align-items:center;gap:6px}
#lrPanel{margin-top:10px;border-radius:22px;background:rgba(var(--oriel-glass),.62);border:1px solid rgba(var(--oriel-glass),.7);padding:10px 12px 12px;display:flex;flex-direction:column;gap:8px}
#lrPanel .ph{display:flex;justify-content:space-between;align-items:center;font-size:13.5px;font-weight:500}#lrPanel .ph small{font-weight:400;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));font-size:12px}
.lab{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));margin-bottom:4px}
.pr{display:flex;gap:6px}.pr button{flex:1;height:42px;border-radius:14px;border:1px solid rgba(var(--oriel-ink),.1);background:rgba(var(--oriel-glass),.7);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;color:rgb(var(--oriel-ink));padding:0 2px}
.pr button.on{background:rgb(var(--oriel-ink-fill));color:rgb(var(--oriel-on-dark))}.pr button i{width:14px;height:14px;border-radius:50%;display:block;border:1px solid ${LIGHT.swatchEdge}}
.swr{display:flex;justify-content:space-between}
:is(#lrHero .chip,#lrAllOff,.tune,.pr button,.swr button,.hdmi button){position:relative}
:is(#lrHero .chip,#lrAllOff,.tune,.pr button,.swr button,.hdmi button)::after{content:"";position:absolute;top:min(0px,calc(50% - 23px));bottom:min(0px,calc(50% - 23px));left:min(0px,calc(50% - 23px));right:min(0px,calc(50% - 23px))}.swr button{width:40px;height:40px;border-radius:50%;border:3px solid rgba(var(--oriel-glass),.9);cursor:pointer;box-shadow:0 3px 8px rgba(var(--oriel-shadow),.3);padding:0}.swr button.on{box-shadow:0 0 0 2px rgb(var(--oriel-ink)),0 3px 8px rgba(var(--oriel-shadow),.3)}
#lrNow{right:24px;top:84px;width:388px;height:196px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
#lrNow .top{display:flex;align-items:center;gap:12px}
.lrap{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;flex:none;background:rgba(var(--oriel-on-dark),.1);border:1px solid rgba(var(--oriel-on-dark),.14)}.lrap .ic{width:26px;height:26px}
.lrap.run{background:rgba(var(--oriel-on-dark),.12);background:color-mix(in srgb,var(--c) 28%,transparent);box-shadow:0 0 0 1.5px var(--c),0 0 18px 2px var(--c)}
#lrNow .tx{flex:1;min-width:0}#lrNow .tx b{font-size:20px;font-weight:300;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#lrNow .tx span{font-size:12px;color:rgba(var(--oriel-on-dark),.6);white-space:nowrap;display:block;overflow:hidden;text-overflow:ellipsis}
#lrNow .round{background:rgba(var(--oriel-on-dark),.14);color:rgb(var(--oriel-on-dark));box-shadow:none;border:1px solid rgba(var(--oriel-on-dark),.2)}#lrNow .round.act{background:rgb(var(--oriel-raised));color:rgb(var(--oriel-ink))}
.mm{display:flex;align-items:center;gap:8px;background:rgba(var(--oriel-on-dark),.08);border-radius:18px;padding:6px 6px 6px 14px;border:1px solid rgba(var(--oriel-on-dark),.1)}.mm .l{flex:1;font-size:13px}.mm .l small{display:block;font-size:12px;color:rgba(var(--oriel-on-dark),.6)}
.mm button{height:38px;padding:0 18px;border-radius:19px;border:0;font-size:13px;cursor:pointer;background:rgba(var(--oriel-on-dark),.14);color:rgb(var(--oriel-on-dark))}.mm button.go{background:linear-gradient(150deg,rgb(var(--oriel-accent-hi)),rgb(var(--oriel-accent-lo)));color:rgb(var(--oriel-on-accent));font-weight:500}.mm button.go.dim{opacity:.5}
.hdmi{display:flex;gap:6px;align-items:center;font-size:12px;color:rgba(var(--oriel-on-dark),.6)}.hdmi button{flex:1;height:30px;border-radius:15px;border:1px solid rgba(var(--oriel-on-dark),.16);background:transparent;font-size:12px;cursor:pointer;color:rgb(var(--oriel-on-dark-text));padding:0;white-space:nowrap}.hdmi button span{display:block;overflow:hidden;text-overflow:ellipsis}.hdmi button.on{background:rgb(var(--oriel-raised));color:rgb(var(--oriel-ink))}
#lrApps{right:24px;top:292px;width:388px;height:216px;padding:12px 14px}
#lrAg{grid-template-columns:repeat(4,1fr)}
.at{height:54px;border-radius:16px;border:1px solid rgba(var(--oriel-glass),.5);background:rgba(var(--oriel-glass),.3);display:flex;flex-direction:column;justify-content:space-between;padding:7px 8px;font-size:12px;cursor:pointer;text-align:left;color:rgb(var(--oriel-ink));transition:box-shadow .2s;min-width:0}
.at span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;max-width:100%}
.at .ic{width:18px;height:18px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}.at.on{background:rgba(var(--oriel-glass),.7);box-shadow:0 0 0 1.5px var(--c),0 0 14px 2px var(--c)}.at.on .ic{color:rgb(var(--oriel-ink))}.at.stop{background:rgb(var(--oriel-bad-bg))}.at.stop .ic{color:rgb(var(--oriel-bad-ink))}
#lrRemote{right:24px;top:520px;width:388px;height:256px;padding:14px;display:grid;grid-template-columns:auto 1fr;gap:16px}
#lrDpad{display:grid;grid-template-columns:repeat(3,50px);grid-template-rows:repeat(3,50px);gap:4px;align-self:center;justify-self:center}
#lrDpad .round{width:50px;height:50px}#lrDpad .ok{background:rgb(var(--oriel-ink-fill));color:rgb(var(--oriel-on-dark));font-size:13px;font-weight:500}
#lrRbtn{display:grid;grid-template-columns:1fr 1fr;gap:6px;align-content:center}
#lrRbtn button{height:50px;border-radius:16px;border:1px solid rgba(var(--oriel-glass),.5);background:rgba(var(--oriel-glass),.34);display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;cursor:pointer;color:rgb(var(--oriel-ink));padding:0}#lrRbtn button:active{background:rgb(var(--oriel-raised))}
`;

const HTML = () => `
    <div id="lrHero" class="abs glass mid"><div class="img"></div><svg id="lrRm" viewBox="0 0 330 230" width="330" height="230" aria-hidden="true"></svg>
      <div class="t"><b id="lrTitle"></b><span class="chip" id="lrPres">${icon('user')}<span>–</span></span></div>
      <div class="b" id="lrChips"><span class="chip" id="lrT">${icon('sun')}<span>–</span></span><span class="chip" id="lrH">${icon('drop')}<span>–</span></span><span class="chip" id="lrL">${icon('bulb')}<span>–</span></span></div></div>
    <div id="lrOpen" class="abs glass"><div class="hd"><span>${esc(S.doors_windows)}</span><span class="chip" id="lrOpenChip" style="height:24px;font-size:12px">–</span></div><div class="g" id="lrOg"></div></div>
    <div id="lrBlinds" class="abs glass"><div class="hd"><span>${esc(S.blinds)}</span><small id="lrBsub"></small></div><div class="g" id="lrBg"></div></div>
    <div id="lrSound" class="abs glass"><div class="hd"><span>${esc(S.sound)}</span><span class="chip" id="lrFmt" style="height:24px;font-size:12px">–</span></div>
      <div class="vol"><button type="button" class="round" id="lrVm" aria-label="${esc(S.volume_down)}">${icon('minus')}</button><div class="v"><b id="lrVv">–</b><span id="lrVs"></span><div class="seg" id="lrSeg"></div></div><button type="button" class="round" id="lrVp" aria-label="${esc(S.volume_up)}">${icon('plus')}</button></div>
      <div class="row2"><button type="button" class="pillb" id="lrMute">${icon('mute')}<div>${esc(S.mute)}<small id="lrMuteS"></small></div></button><button type="button" class="pillb" id="lrNight">${icon('moon')}<div>${esc(S.night_sound)}<small>${esc(S.off)}</small></div></button></div></div>
    <div id="lrScenes" class="abs glass"><div class="hd"><span>${esc(S.scenes)}</span><small>${esc(S.tap_again_off)}</small></div><div class="g" id="lrSg"></div></div>
    <div id="lrLights" class="abs glass"><div class="hd"><span>${esc(S.lights)}</span><button type="button" class="chip" id="lrAllOff" style="cursor:pointer;height:28px">${icon('alloff')}${esc(S.all_off)}</button></div><div id="lrLgrid"></div><div id="lrPanel"></div></div>
    <div id="lrNow" class="abs dark"><div class="top"><div class="lrap" id="lrAp">${icon('play')}</div><div class="tx"><b id="lrNowT">–</b><span id="lrNowSub">–</span></div><button type="button" class="round sm" id="lrTvP" aria-label="${esc(S.tv_power)}">${icon('alloff')}</button><button type="button" class="round" id="lrPp" aria-label="${esc(S.play_pause)}">${icon('pause')}</button></div>
      <div class="mm" id="lrMm"><div class="l">${esc(S.movie_mode)}<small id="lrMmS">${esc(S.off)}</small></div><button type="button" id="lrMmStart" class="go">${esc(S.start)}</button><button type="button" id="lrMmEnd">${esc(S.end)}</button></div>
      <div class="hdmi" id="lrHdRow"><span>${esc(S.tv_input)}</span><span id="lrHd" style="display:contents"></span></div></div>
    <div id="lrApps" class="abs glass"><div class="hd"><span>${esc(S.apps)}</span><small>${esc(S.apps_hint)}</small></div><div class="g" id="lrAg"></div></div>
    <div id="lrRemote" class="abs glass mid"><div id="lrDpad"></div><div id="lrRbtn"></div></div>`;

const LivingExt = {
  _lvInitPage() {
    const pg = document.createElement('div');
    pg.id = 'pgLiving'; pg.innerHTML = HTML();
    this._lvPg = pg;
    // build before attaching so getElementById works through the page
    const $ = (id) => pg.querySelector('#' + id);
    this._lvBuild($);
    return pg;
  },

  _lvBuild($) {
    const c = this._lvc = this._c.living;
    const L = this._lv = { sel: -1, sc: null, scAt: 0, $ };
    const lights = c.lights.filter((l) => l && isEnt(l.entity));
    const devices = c.streamers.devices.filter((d) => d && (isEnt(d.media_player) || isEnt(d.remote)));
    const tv = c.tv || {}, sp = c.speaker || {}, mm = c.movie_mode || {};
    L.lights = lights; L.devices = devices;
    // hero
    $('lrTitle').textContent = c.title || S.page_living;
    this.tap($('lrPres'), () => this.moreInfo(c.presence)); $('lrPres').classList.toggle('hide', !isEnt(c.presence));
    [['lrT', c.temperature], ['lrH', c.humidity], ['lrL', c.illuminance]].forEach(([id, e]) => { this.tap($(id), () => this.moreInfo(e)); $(id).classList.toggle('hide', !isEnt(e)); });
    $('lrChips').classList.toggle('hide', ![c.temperature, c.humidity, c.illuminance].some(isEnt));
    // doors and windows
    L.open = c.openings.filter((o) => o && isEnt(o.entity)).map((o) => {
      const d = document.createElement('div'); d.className = 'ot';
      d.innerHTML = `${icon(o.icon === 'door' ? 'door' : 'win')}<div><span></span><b>–</b></div>`; d.querySelector('span').textContent = o.name || this.name(o.entity);
      this.tap(d, () => this.moreInfo(o.entity)); $('lrOg').appendChild(d);
      return { o, d, b: d.querySelector('b') };
    });
    $('lrOpen').classList.toggle('hide', !L.open.length);
    // blinds
    const bl = c.blinds || {};
    $('lrBsub').textContent = bl.subtitle || '';
    const bbtn = [['up2', S.open, () => this.call('cover', 'open_cover', { entity_id: bl.cover })], ['stop', S.stop, () => this.call('cover', 'stop_cover', { entity_id: bl.cover })],
      ['down2', S.close_cover, () => this.call('cover', 'close_cover', { entity_id: bl.cover })]];
    if (isEnt(bl.my_position)) bbtn.push(['target', S.my_position, () => this.call('button', 'press', { entity_id: bl.my_position })]);
    bbtn.forEach(([ic, tx, fn]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'bt'; b.innerHTML = `${icon(ic)}<span></span>`; b.lastChild.textContent = tx; b.addEventListener('click', fn); $('lrBg').appendChild(b); });
    $('lrBg').style.gridTemplateColumns = `repeat(${bbtn.length},1fr)`;
    $('lrBlinds').classList.toggle('hide', !isEnt(bl.cover));
    // sound
    const step = (d) => {
      const s = this.st(sp.media_player); if (!s) return;
      const v = clamp(this.ov('vol', Math.round((s.attributes.volume_level || 0) * 100)) + d, 0, 100);
      this.override('vol', v, 2500); this._lvVol();
      this.debounce('vol', 350, () => this.call('media_player', 'volume_set', { entity_id: sp.media_player, volume_level: v / 100 }));
    };
    L.step = step;
    $('lrVm').addEventListener('click', () => step(-5)); $('lrVp').addEventListener('click', () => step(5));
    $('lrSeg').innerHTML = '<i></i>'.repeat(10);
    $('lrMuteS').textContent = sp.label || '';
    $('lrMute').addEventListener('click', () => {
      const s = this.st(sp.media_player), m = !this.ov('mute', !!(s && s.attributes.is_volume_muted));
      this.override('mute', m, 2500); this.call('media_player', 'volume_mute', { entity_id: sp.media_player, is_volume_muted: m }); this._updateLiving();
    });
    $('lrNight').addEventListener('click', () => {
      const on = !this.ov('night', this.sv(sp.night_sound) === 'on');
      this.override('night', on, 2500); this.call('switch', on ? 'turn_on' : 'turn_off', { entity_id: sp.night_sound }); this._updateLiving();
    });
    $('lrNight').classList.toggle('hide', !isEnt(sp.night_sound));
    if (!isEnt(sp.night_sound)) $('lrMute').parentNode.style.gridTemplateColumns = '1fr';
    $('lrFmt').classList.toggle('hide', !isEnt(sp.audio_format));
    $('lrSound').classList.toggle('hide', !isEnt(sp.media_player));
    // scenes
    L.scenes = c.scenes.filter((s) => s && (isEnt(s.helper) || isEnt(s.scene))).map((s) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sc'; b.style.setProperty('--c', s.colour || LIGHT.scene);
      b.innerHTML = `${icon(s.icon || 'bulb')}<span></span>`; b.lastChild.textContent = s.name || this.name(s.helper || s.scene);
      b.addEventListener('click', () => this._lvScene(s)); $('lrSg').appendChild(b);
      return { s, b };
    });
    $('lrSg').style.gridTemplateColumns = `repeat(${Math.max(5, L.scenes.length)},1fr)`;
    $('lrScenes').classList.toggle('hide', !L.scenes.length);
    L.offIds = (c.scene_off_lights && c.scene_off_lights.length ? c.scene_off_lights : lights.map((l) => l.entity)).filter(isEnt);
    // lights
    L.sel = lights.findIndex((l) => l.colour);
    L.lt = lights.map((l, i) => {
      const d = document.createElement('div'); d.className = 'lt';
      d.innerHTML = `<div class="r"><span class="bi">${icon(l.icon || 'bulb')}</span><span class="rr">${l.colour ? `<button type="button" class="tune" aria-label=""></button>` : ''}<span class="tg"></span></span></div><span class="nm"><span></span><small></small></span>`;
      const nm = l.name || this.name(l.entity); d.querySelector('.nm span').textContent = nm;
      this.tap(d, () => this._lvToggle(l)); d.setAttribute('aria-label', nm);
      const tb = d.querySelector('.tune');
      if (tb) { tb.innerHTML = icon('sliders'); tb.setAttribute('aria-label', t('tune', { name: nm })); tb.addEventListener('click', (e) => { e.stopPropagation(); L.sel = i; this._updateLiving(); }); }
      $('lrLgrid').appendChild(d);
      return { l, d, sub: d.querySelector('small') };
    });
    const useSel = isEnt(c.streamers.selector) && devices.length > 1;
    L.dv = (useSel ? devices : []).map((dv) => {
      const d = document.createElement('div'); d.className = 'lt dv'; d.style.setProperty('--c', 'rgb(var(--oriel-accent-strong))');
      d.innerHTML = `<div class="r"><span class="bi">${icon(dv.icon || 'tv')}</span><span class="rr"><span class="tg"></span></span></div><span class="nm"><span></span><small></small></span>`;
      d.querySelector('.nm span').textContent = dv.name || this.name(dv.media_player);
      this.tap(d, () => { this.override('dev', dv.option, 3000); this.call('input_select', 'select_option', { entity_id: c.streamers.selector, option: dv.option }); this._updateLiving(); });
      $('lrLgrid').appendChild(d);
      return { dv, d, sub: d.querySelector('small') };
    });
    $('lrAllOff').addEventListener('click', () => {
      lights.forEach((l) => this._lvSet(l, { on: false }));
      this.call('homeassistant', 'turn_off', { entity_id: lights.map((l) => l.entity) }); this._updateLiving();
    });
    $('lrAllOff').classList.toggle('hide', !lights.length);
    $('lrLights').classList.toggle('hide', !lights.length && !L.dv.length);
    // tune panel
    const pn = $('lrPanel');
    pn.innerHTML = `<div class="ph"><span id="lrPn">–</span><small>${esc(S.tune_hint)}</small></div><div><div class="lab">${esc(S.brightness)}</div><div class="pr" id="lrPb"></div></div><div><div class="lab">${esc(S.white)}</div><div class="pr" id="lrPw"></div></div><div><div class="lab">${esc(S.colour)}</div><div class="swr" id="lrPc"></div></div>`;
    const mkb = (parent, html, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; if (cls) b.className = cls; b.innerHTML = html; b.addEventListener('click', fn); parent.appendChild(b); return b; };
    L.pb = [10, 25, 50, 75, 100].map((v) => ({ v, b: mkb($('lrPb'), v + '%', '', () => this._lvTune({ br: v }, { brightness_pct: v })) }));
    L.pw = WHITES.map((w) => ({ n: w[0], b: mkb($('lrPw'), `<i style="background:${w[2]}"></i>${esc(S[w[0]])}`, '', () => this._lvTune({ rgb: hexRgb(w[2]), tag: w[0] }, { color_temp_kelvin: w[1] })) }));
    L.pc = COLOURS.map((w) => { const b = mkb($('lrPc'), '', '', () => this._lvTune({ rgb: hexRgb(w[1]), tag: w[0] }, { rgb_color: hexRgb(w[1]) })); b.style.background = w[1]; b.setAttribute('aria-label', S[w[0]]); return { n: w[0], b }; });
    pn.classList.toggle('hide', L.sel < 0);
    // now playing, movie mode, TV inputs
    $('lrTvP').addEventListener('click', () => this.call('media_player', this.sv(tv.media_player) === 'on' ? 'turn_off' : 'turn_on', { entity_id: tv.media_player }));
    $('lrTvP').classList.toggle('hide', !isEnt(tv.media_player));
    $('lrPp').addEventListener('click', () => { const d = this._lvDev(); if (d && isEnt(d.media_player)) this.call('media_player', 'media_play_pause', { entity_id: d.media_player }); });
    $('lrPp').classList.toggle('hide', !devices.some((d) => isEnt(d.media_player)));
    $('lrMmStart').addEventListener('click', () => {
      if (this.ov('mm', this.sv(mm.flag) === 'on')) return;
      this.override('mm', true, 4000); this.runScript(mm.start); this._updateLiving();
    });
    $('lrMmEnd').addEventListener('click', () => { this.override('mm', false, 4000); this.runScript(mm.stop); this._updateLiving(); });
    $('lrMmEnd').classList.toggle('hide', !isEnt(mm.stop));
    $('lrMm').classList.toggle('hide', !isEnt(mm.start));
    L.hd = (tv.inputs || []).filter((x) => x && isEnt(x.script)).map((x, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.appendChild(document.createElement('span')).textContent = x.label || t('input_n', { n: i + 1 });
      b.addEventListener('click', () => { if (x.source) this.override('hdmi', x.source, 3000); this.runScript(x.script); this._updateLiving(); }); $('lrHd').appendChild(b);
      return { x, b };
    });
    $('lrHdRow').classList.toggle('hide', !L.hd.length);
    $('lrNow').classList.toggle('hide', !isEnt(tv.media_player) && !devices.length && !isEnt(mm.start) && !L.hd.length);
    // apps
    L.apps = c.apps.filter((a) => a && (a.close_all || isEnt(a.script) || a.package || a.app_id)).map((a) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'at' + (a.close_all ? ' stop' : ''); b.style.setProperty('--c', a.colour || 'rgb(var(--oriel-accent-strong))');
      b.innerHTML = `${icon(a.icon || (a.close_all ? 'close' : 'play'))}<span></span>`; b.lastChild.textContent = a.name || '';
      b.addEventListener('click', () => { this.override('app', a.close_all ? '' : a.name, 8000); this._lvLaunch(a); this._updateLiving(); }); $('lrAg').appendChild(b);
      return { a, b };
    });
    $('lrApps').classList.toggle('hide', !L.apps.length);
    // remote
    const rc = (cmd) => () => { const d = this._lvDev(); if (d && isEnt(d.remote)) this.call('remote', 'send_command', { entity_id: d.remote, command: cmd }); };
    [null, ['up2', 'DPAD_UP', S.up], null, ['left', 'DPAD_LEFT', S.left], ['OK', 'DPAD_CENTER', 'OK'], ['right', 'DPAD_RIGHT', S.right], null, ['down2', 'DPAD_DOWN', S.down], null].forEach((d) => {
      if (!d) { $('lrDpad').appendChild(document.createElement('span')); return; }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'round' + (d[0] === 'OK' ? ' ok' : ''); b.innerHTML = d[0] === 'OK' ? 'OK' : icon(d[0]); b.setAttribute('aria-label', d[2]);
      b.addEventListener('click', rc(d[1])); $('lrDpad').appendChild(b);
    });
    const rb = [['back', S.back, rc('BACK')], ['home', S.home_button, rc('HOME')]];
    if (isEnt(sp.media_player)) rb.push(['vdn', S.vol_minus, () => step(-5)], ['vup', S.vol_plus, () => step(5)]);
    rb.forEach(([ic, tx, fn]) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = icon(ic) + esc(tx); b.addEventListener('click', fn); $('lrRbtn').appendChild(b); });
    $('lrRemote').classList.toggle('hide', !devices.some((d) => isEnt(d.remote)));
    // room illustration
    if (c.room_render !== false) this._lvBuildRoom($('lrRm')); else $('lrRm').remove();
    this._lvStack($);
  },

  /* Panels stack top-down in their column, so a hidden one leaves no gap. */
  _lvStack($) {
    const H = { lrHero: 230, lrOpen: 104, lrBlinds: 98, lrSound: 224, lrScenes: 150, lrLights: 530, lrNow: 196, lrApps: 216, lrRemote: 256 };
    const stack = (ids) => { let y = 84; ids.forEach((id) => { const n = $(id); if (n.classList.contains('hide')) return; n.style.top = y + 'px'; y += H[id] + 12; }); };
    stack(['lrHero', 'lrOpen', 'lrBlinds', 'lrSound']);
    stack(['lrScenes', 'lrLights']);
    stack(['lrNow', 'lrApps', 'lrRemote']);
  },

  _lvInfo(l) {
    const s = this.st(l.entity), on = !!s && s.state === 'on', a = (s && s.attributes) || {};
    const base = { on };
    if (l.colour) { base.br = a.brightness != null ? Math.round(a.brightness / 2.55) : (on ? 100 : 0); base.rgb = a.rgb_color || null; base.tag = colourTag(a); }
    return this.ov('lx:' + l.entity, base);
  },
  _lvSet(l, patch) { this.override('lx:' + l.entity, Object.assign({}, this._lvInfo(l), patch), 2500); },
  _lvToggle(l) {
    const on = !this._lvInfo(l).on;
    this._lvSet(l, { on });
    this.call('homeassistant', on ? 'turn_on' : 'turn_off', { entity_id: l.entity }); this._updateLiving();
  },
  _lvTune(patch, data) {
    const l = this._lv.lights[this._lv.sel]; if (!l) return;
    this._lvSet(l, Object.assign({ on: true }, patch));
    this.call('light', 'turn_on', Object.assign({ entity_id: l.entity }, data)); this._updateLiving();
  },
  _lvScene(s) {
    const L = this._lv;
    if (isEnt(s.helper)) {
      this.override('sc:' + s.helper, this.sv(s.helper) !== 'on', 3000);
      this.call('input_boolean', 'toggle', { entity_id: s.helper });
    } else if (this._lvSceneOn(s)) {
      L.sc = null;
      L.lights.filter((l) => L.offIds.includes(l.entity)).forEach((l) => this._lvSet(l, { on: false }));
      this.call('light', 'turn_off', { entity_id: L.offIds });
    } else { L.sc = s.scene; L.scAt = Date.now(); this.call('scene', 'turn_on', { entity_id: s.scene }); }
    this._updateLiving();
  },
  _lvSceneOn(s) {
    if (isEnt(s.helper)) return this.ov('sc:' + s.helper, this.sv(s.helper) === 'on');
    const L = this._lv;
    return L.sc === s.scene && (Date.now() - L.scAt < 4000 || L.offIds.some((id) => this.sv(id) === 'on'));
  },
  // the streamer being controlled: whichever the selector helper points at, else the first
  _lvDev() {
    const c = this._lvc, L = this._lv, sel = this.ov('dev', this.sv(c.streamers.selector));
    return L.devices.find((d) => d.option && d.option === sel) || L.devices[0] || null;
  },
  _lvLaunch(a) {
    const d = this._lvDev();
    if (!d || d.launch !== 'android') { if (isEnt(a.script)) this.runScript(a.script); return; }
    if (a.close_all || a.send_home || !a.package) { if (isEnt(d.remote)) this.call('remote', 'send_command', { entity_id: d.remote, command: 'HOME' }); }
    else if (isEnt(d.media_player)) this.call('media_player', 'play_media', { entity_id: d.media_player, media_content_type: 'app', media_content_id: a.package });
  },
  _lvRunning() {
    const L = this._lv, d = this._lvDev(), s = d && this.st(d.media_player), r = d && this.st(d.remote);
    const act = r && r.attributes.current_activity, id = s && s.attributes.app_id;
    const a = L.apps.map((x) => x.a).find((x) => !x.close_all && ((x.package && (x.package === act || x.package === id)) || (x.app_id && x.app_id === id)));
    const n = this.ov('app', a ? a.name : '');
    return L.apps.map((x) => x.a).find((x) => !x.close_all && x.name === n) || null;
  },
  _lvVol() {
    const L = this._lv, s = this.st(this._lvc.speaker.media_player); if (!s || !L) return;
    const v = this.ov('vol', Math.round((s.attributes.volume_level || 0) * 100));
    L.$('lrVv').textContent = v;
    [...L.$('lrSeg').children].forEach((i, n) => i.classList.toggle('f', n < Math.round(v / 10)));
  },

  _updateLiving() {
    const L = this._lv; if (!L || this._page !== 'living') return;
    const c = this._lvc, $ = L.$, css = (rgb) => (rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : LIGHT.default);
    const sp = c.speaker, tvc = c.tv, mmc = c.movie_mode;
    // room status
    const pr = this.sv(c.presence) === 'on'; $('lrPres').classList.toggle('on', pr); $('lrPres').lastChild.textContent = pr ? S.someone_here : S.empty;
    const tt = this.num(c.temperature), h = this.num(c.humidity), lx = this.num(c.illuminance);
    $('lrT').lastChild.textContent = tt != null ? Math.round(tt) + '°' : '–';
    $('lrH').lastChild.textContent = h != null ? Math.round(h) + '%' : '–';
    $('lrL').lastChild.textContent = lx != null ? Math.round(lx) + ' lx' : '–';
    // openings
    let open = 0;
    L.open.forEach(({ o, d, b }) => { const s = this.sv(o.entity), on = s === 'on'; if (on) open++; d.classList.toggle('open', on); b.textContent = s === undefined || s === 'unavailable' || s === 'unknown' ? '–' : (on ? S.is_open : S.closed); });
    const oc = $('lrOpenChip'); oc.textContent = open ? t('n_open', { n: open }) : S.all_closed; oc.style.background = open ? 'rgb(var(--oriel-bad-bg))' : ''; oc.style.borderColor = open ? 'rgb(var(--oriel-bad-line))' : '';
    // sound
    const so = this.st(sp.media_player);
    this._lvVol(); if (!so) $('lrVv').textContent = '–';
    $('lrVs').textContent = (sp.label || this.name(sp.media_player)) + (so && so.attributes.source ? ' · ' + so.attributes.source : '');
    const af = this.sv(sp.audio_format); $('lrFmt').textContent = af && !['unknown', 'unavailable'].includes(af) ? af : '–';
    const mu = this.ov('mute', !!(so && so.attributes.is_volume_muted)); $('lrMute').classList.toggle('on', mu);
    const nt = this.ov('night', this.sv(sp.night_sound) === 'on'); $('lrNight').classList.toggle('on', nt); $('lrNight').querySelector('small').textContent = nt ? S.on : S.off;
    // scenes
    L.scenes.forEach(({ s, b }) => b.classList.toggle('on', !!this._lvSceneOn(s)));
    // lights and streamer tiles
    const dev0 = this._lvDev();
    const info = L.lights.map((l) => this._lvInfo(l));
    L.lt.forEach(({ l, d, sub }, i) => {
      const f = info[i];
      d.classList.toggle('on', !!f.on); d.classList.toggle('sel', !!l.colour && i === L.sel);
      d.style.setProperty('--c', l.colour ? css(f.rgb) : LIGHT.default);
      sub.textContent = l.colour ? (f.on ? `${f.br}%${f.tag ? ' · ' + S[f.tag] : ''}` : S.off) : (f.on ? S.on : S.off);
    });
    L.dv.forEach(({ dv, d, sub }) => {
      const s = this.st(dv.media_player), on = dv === dev0, off = !s || ['off', 'unavailable', 'unknown'].includes(s.state);
      d.classList.toggle('on', on); sub.textContent = on ? S.active : off ? S.off : S.tap_to_use;
    });
    if (L.sel >= 0) {
      const sl = L.lights[L.sel], sf = info[L.sel];
      $('lrPn').textContent = sl.name || this.name(sl.entity);
      L.pb.forEach(({ v, b }) => b.classList.toggle('on', !!sf.on && sf.br === v));
      L.pw.forEach(({ n, b }) => b.classList.toggle('on', !!sf.on && sf.tag === n));
      L.pc.forEach(({ n, b }) => b.classList.toggle('on', !!sf.on && sf.tag === n));
    }
    // now playing
    const run = this._lvRunning(), st = dev0 && this.st(dev0.media_player), tv = this.st(tvc.media_player);
    const ap = $('lrAp'); ap.classList.toggle('run', !!run); if (run) ap.style.setProperty('--c', run.colour || 'rgb(var(--oriel-accent-strong))');
    const ovA = !!this._ov.app && this._ov.app.until > Date.now();
    $('lrNowT').textContent = run ? run.name : (!ovA && st && st.attributes.app_name && !/^com\./.test(st.attributes.app_name) ? st.attributes.app_name : S.nothing_running);
    const ss = st ? st.state : 'off', src = tv && tv.attributes.source, hd = this.ov('hdmi', src);
    const inp = L.hd.find(({ x }) => x.source && x.source === hd), labels = tvc.source_labels || {};
    const tvTxt = !tv || tv.state === 'off' ? S.tv_off : inp ? t('tv_on_input', { input: inp.x.label || '' }) : hd && labels[hd] ? t('tv_on_input', { input: labels[hd] }) : S.tv_on;
    const parts = [];
    if (dev0) parts.push((dev0.name || this.name(dev0.media_player)) + ' · ' + (ss === 'playing' ? S.playing : ss === 'paused' ? S.paused : ss === 'on' ? S.on : ss === 'off' ? S.off : S.idle));
    if (isEnt(tvc.media_player)) parts.push(tvTxt);
    $('lrNowSub').textContent = parts.join(' · ') || '–';
    $('lrPp').innerHTML = icon(ss === 'playing' ? 'pause' : 'play');
    $('lrTvP').classList.toggle('act', !!tv && tv.state === 'on');
    const mm = this.ov('mm', this.sv(mmc.flag) === 'on');
    $('lrMmS').textContent = mm ? (mmc.on_text || S.on) : S.off; $('lrMmStart').classList.toggle('dim', !!mm);
    L.hd.forEach(({ x, b }) => b.classList.toggle('on', !!x.source && hd === x.source));
    L.apps.forEach(({ a, b }) => b.classList.toggle('on', !!run && run.name === a.name));
    this._lvRoom(mm);
  },

  // isometric room illustration; each light can glow in one spot of the drawing (render: uplighter | floor_lamp | ceiling | wall)
  _lvBuildRoom(RM) {
    const RX = 138.5, RY = 44, HH = 41, G = this._lv.g = {};
    const q = (x, y, z) => [RX + (x - y) * 1.126, RY + (x + y) * .65 - z];
    const ne = (tg, a) => el(tg, a, RM);
    const pg = (p, a) => ne('polygon', Object.assign({ points: p.map((v) => v[0].toFixed(1) + ',' + v[1].toFixed(1)).join(' ') }, a));
    const bx = (x0, y0, x1, y1, z, h, tp, sl, sr) => { pg([q(x0, y1, z), q(x1, y1, z), q(x1, y1, z + h), q(x0, y1, z + h)], { fill: sl }); pg([q(x1, y0, z), q(x1, y1, z), q(x1, y1, z + h), q(x1, y0, z + h)], { fill: sr }); pg([q(x0, y0, z + h), q(x1, y0, z + h), q(x1, y1, z + h), q(x0, y1, z + h)], { fill: tp }); };
    const ring = (cx, cy, r, z) => { const p = []; for (let a = 0; a < 24; a++) p.push(q(cx + r * Math.cos(a / 24 * 6.2832), cy + r * Math.sin(a / 24 * 6.2832), z)); return p; };
    const glow = (c3, rx, ry, id) => { const p = q(c3[0], c3[1], c3[2]); G[id] = ne('ellipse', { cx: p[0], cy: p[1], rx, ry, filter: 'url(#lrb9)', opacity: 0, fill: SCENE.white }); };
    const d = ne('defs', {});
    d.innerHTML = '<filter id="lrb5" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.5"/></filter><filter id="lrb9" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8"/></filter><linearGradient id="lrw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + SCENE.white + '" stop-opacity=".5"/><stop offset="1" stop-color="' + SCENE.white + '" stop-opacity=".1"/></linearGradient>';
    pg([q(0, 0, -5), q(134, 0, -5), q(134, 87, -5), q(0, 87, -5)], { fill: SCENE.shadow, opacity: .55, filter: 'url(#lrb5)' });
    pg([q(0, 0, 0), q(134, 0, 0), q(134, 87, 0), q(0, 87, 0)], { fill: SCENE.floor, opacity: .92, stroke: SCENE.edge });
    G.fw = ne('ellipse', { cx: q(67, 45, 0)[0], cy: q(67, 45, 0)[1], rx: 60, ry: 26, filter: 'url(#lrb9)', opacity: 0, fill: SCENE.white });
    pg([q(30, 16, 0), q(105, 16, 0), q(105, 72, 0), q(30, 72, 0)], { fill: SCENE.rug, opacity: .85 });
    pg([q(0, 0, 0), q(0, 87, 0), q(0, 87, HH), q(0, 0, HH)], { fill: 'url(#lrw)', stroke: SCENE.wallEdge });
    pg([q(0, 0, 0), q(134, 0, 0), q(134, 0, HH), q(0, 0, HH)], { fill: 'url(#lrw)', stroke: SCENE.wallEdge });
    pg([q(0, 25, 0), q(0, 65, 0), q(0, 65, 33), q(0, 25, 33)], { fill: SCENE.window, stroke: SCENE.white, 'stroke-width': 1 });
    for (let i = 1; i < 8; i++) { const a = q(0, 25 + i * 5, 1), b = q(0, 25 + i * 5, 32); ne('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: SCENE.blind, 'stroke-width': .8 }); }
    G.cvg = [pg([q(0, 16, 30), q(0, 74, 30), q(0, 74, 41), q(0, 16, 41)], { fill: SCENE.wallGlow, filter: 'url(#lrb9)', opacity: 0 }), pg([q(96, 0, 28), q(134, 0, 28), q(134, 0, 41), q(96, 0, 41)], { fill: SCENE.wallGlow, filter: 'url(#lrb9)', opacity: 0 })];
    G.cvs = [pg([q(0, 20, 35), q(0, 70, 35), q(0, 70, 37.5), q(0, 20, 37.5)], { fill: SCENE.wallGlow, opacity: 0 }), pg([q(100, 0, 33), q(132, 0, 33), q(132, 0, 35.5), q(100, 0, 35.5)], { fill: SCENE.wallGlow, opacity: 0 })];
    const a = q(12, 6, 0), b = q(12, 6, 26); glow([12, 4, 24], 10, 13, 'upg');
    G.up = ne('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: SCENE.lampOff, 'stroke-width': 2.4, 'stroke-linecap': 'round' });
    bx(28, 0, 106, 26, 0, 10, ...SCENE.sofa); bx(28, 0, 106, 8, 10, 12, ...SCENE.back);
    bx(82, 26, 106, 56, 0, 10, ...SCENE.sofa); bx(84, 30, 104, 54, 10, 1.8, ...SCENE.screen);
    for (let i = 1; i < 4; i++) { const x = 28 + i * 19.5, a1 = q(x, 8, 10), a2 = q(x, 26, 10), b1 = q(x, 0, 22), b2 = q(x, 8, 22), b3 = q(x, 8, 10); ne('polyline', { points: [a1, a2].map((v) => v.join(',')).join(' '), stroke: SCENE.seam, 'stroke-width': .9, fill: 'none' }); ne('polyline', { points: [b1, b2, b3].map((v) => v.join(',')).join(' '), stroke: SCENE.seam2, 'stroke-width': .9, fill: 'none' }); }
    pg(ring(58, 46, 11, 0), { fill: SCENE.tableShadow }); pg(ring(58, 46, 11, 9), { fill: SCENE.tableTop, stroke: SCENE.tableRim, 'stroke-width': 2.2 });
    const tp = q(118, 8, 7), t0 = q(118, 8, 18); ne('line', { x1: tp[0], y1: tp[1], x2: t0[0], y2: t0[1], stroke: SCENE.stem, 'stroke-width': 2 });
    pg(ring(118, 8, 6, 7), { fill: SCENE.pot });
    [[118, 8, 22, 11, SCENE.leaves[0]], [114, 6, 29, 9, SCENE.leaves[1]], [122, 10, 31, 8, SCENE.leaves[2]]].forEach((cc) => { const p = q(cc[0], cc[1], cc[2]); ne('circle', { cx: p[0], cy: p[1], r: cc[3], fill: cc[4] }); });
    glow([128, 14, 44], 14, 9, 'flg'); glow([122, 0, 30], 18, 12, 'flw');
    const p0 = q(128, 14, 0), p1 = q(128, 14, 38); ne('line', { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: SCENE.lamp, 'stroke-width': 1.6 }); ne('ellipse', { cx: p1[0], cy: p1[1], rx: 9, ry: 3.5, fill: SCENE.lamp });
    G.sb = pg([q(51, 82, 7), q(81, 82, 7), q(81, 82, 25), q(51, 82, 25)], { fill: 'none', stroke: SCENE.tvGlow, 'stroke-width': 2.6, filter: 'url(#lrb5)', opacity: .25 });
    bx(46, 80, 86, 87, 0, 8, ...SCENE.unit); bx(52, 82, 80, 84, 8, 16, ...SCENE.tv);
    glow([67, 40, HH + 6], 22, 11, 'clg'); const cp = q(67, 40, HH + 6); G.cl = ne('ellipse', { cx: cp[0], cy: cp[1], rx: 9, ry: 4, fill: SCENE.white, opacity: .5 });
  },
  _lvRoom(mm) {
    const L = this._lv, G = L && L.g; if (!G || !G.up) return;
    const slot = (name) => { const l = L.lights.find((x) => x.render === name); return l ? this._lvInfo(l) : { on: false }; };
    const set = (e, col, o) => { e.setAttribute('fill', col); e.setAttribute('opacity', o); };
    const css = (rgb) => (rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : SCENE.wallGlow);
    const o = (f, m) => (f.on ? m * (.3 + .7 * (f.br != null ? f.br : 100) / 100) : 0);
    const dish = slot('uplighter'), thin = slot('floor_lamp'), ce = slot('ceiling'), w = slot('wall');
    const tc = css(thin.rgb), dc = css(dish.rgb), cc = css(ce.rgb), wc = SCENE.wallGlow;
    G.up.setAttribute('stroke', thin.on ? tc : SCENE.lampOff); G.up.setAttribute('opacity', thin.on ? 1 : .18); set(G.upg, tc, o(thin, .7));
    set(G.flg, dc, o(dish, .8)); set(G.flw, dc, o(dish, .55));
    set(G.clg, cc, o(ce, .8)); G.cl.setAttribute('fill', ce.on ? cc : SCENE.white); G.cl.setAttribute('opacity', ce.on ? 1 : .4);
    const top = Math.max(o(ce, 1), o(dish, 1), o(thin, 1));
    set(G.fw, ce.on ? cc : dish.on ? dc : tc, top ? .18 * top : 0);
    G.cvg.forEach((e) => set(e, wc, w.on ? .7 : 0)); G.cvs.forEach((e) => set(e, wc, w.on ? 1 : .15));
    G.sb.setAttribute('opacity', mm ? 1 : .25); G.sb.setAttribute('stroke', mm ? SCENE.mood : SCENE.tvGlow);
  },
};

registerPage({
  key: 'living', icon: 'sofa',
  label(c) { return c.living.title || S.page_living; },
  css: CSS,
  enabled(c) { return hasEntities(c.living); },
  init() { const pg = this._lvInitPage(); return pg; },
  update() { this._updateLiving(); },
  methods: LivingExt,
});
