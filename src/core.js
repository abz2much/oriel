/* Oriel core: the custom element, header, rail, page switcher and the Home page.
   Renders a fixed 1280x800 canvas, widened up to 1700 and scaled to fit the panel view.
   Pages register themselves with registerPage(); a page shows in the rail only when it is configured. */
import { VERSION } from './version.js';
import { S, t } from './strings.js';
import { normalise } from './config.js';
import { clamp, cap, tidy, hm, hhmm, bad, isEnt, esc, el, icon, parseHistory, energySummary } from './util.js';
import fontUrl from './fonts/Outfit-VariableFont_wght.ttf';
import { ENERGY, LIGHT, CAM, STATE_ON_DARK } from './theme/fixed.js';
import { themeStyle, isDarkTheme } from './theme/themes.js';

const CSS = `
:host{display:block;position:relative;width:100%;overflow:hidden;background:rgb(var(--oriel-frame));font-family:'Outfit','Avenir Next','Segoe UI',system-ui,sans-serif}
*{box-sizing:border-box}
#wrap{position:absolute;left:0;top:0;width:1280px;height:800px;transform-origin:0 0}
#screen{width:100%;height:800px;position:relative;overflow:hidden;color:rgb(var(--oriel-ink));
  background:var(--oriel-page)}
#screen::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.16;mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .9 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>")}
.abs{position:absolute} svg{display:block}
.hide{display:none!important}
.ic{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.glass{background:linear-gradient(140deg,rgba(var(--oriel-glass),.42),rgba(var(--oriel-glass),.14));backdrop-filter:blur(22px) saturate(1.15);-webkit-backdrop-filter:blur(22px) saturate(1.15);border:1px solid rgba(var(--oriel-glass),.45);box-shadow:0 22px 44px rgba(var(--oriel-shadow-glass),.22),inset 0 1px 0 rgba(var(--oriel-glass),.55);border-radius:28px}
.glass.mid{background:linear-gradient(140deg,rgba(var(--oriel-glass),.3),rgba(var(--oriel-glass),.08))}
.dark{background:linear-gradient(150deg,rgba(var(--oriel-dark-a),.82),rgba(var(--oriel-dark-b),.92));border:1px solid rgba(var(--oriel-on-dark),.12);color:rgb(var(--oriel-on-dark-text));box-shadow:0 22px 44px rgba(var(--oriel-shadow-dark),.4),inset 0 1px 0 rgba(var(--oriel-on-dark),.1);border-radius:28px;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.black{background:rgb(var(--oriel-black));color:rgb(var(--oriel-on-dark));border-radius:28px;box-shadow:0 26px 50px rgba(var(--oriel-shadow-black),.5),inset 0 1px 0 rgba(var(--oriel-on-dark),.08)}
.nova{background:linear-gradient(150deg,rgba(var(--oriel-nova-a),.78),rgba(var(--oriel-nova-b),.5));border:1px solid rgba(var(--oriel-glass),.5);border-radius:24px;color:rgb(var(--oriel-on-nova));box-shadow:0 14px 30px rgba(var(--oriel-accent-shadow),.25),inset 0 1px 0 rgba(var(--oriel-glass),.6)}
button{font-family:inherit}
button:focus-visible,a:focus-visible,[role=button]:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid rgb(var(--oriel-accent-ink));outline-offset:2px}
.round{width:44px;height:44px;border-radius:50%;border:0;display:grid;place-items:center;cursor:pointer;color:rgb(var(--oriel-ink));padding:0;background:linear-gradient(145deg,rgb(var(--oriel-raised)),rgb(var(--oriel-raised-lo)));box-shadow:0 8px 16px rgba(var(--oriel-shadow),.25),inset 0 -2px 4px rgba(var(--oriel-shadow-deep),.06)}
.round:active{transform:scale(.94)} .round.sm{width:34px;height:34px} .round.ghost{background:rgba(var(--oriel-glass),.35);box-shadow:none;border:1px solid rgba(var(--oriel-glass),.5)}
.round.alert{background:rgb(var(--oriel-bad-bg));color:rgb(var(--oriel-bad-ink))}
.chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:15px;font-size:13px;background:rgba(var(--oriel-glass),.35);border:1px solid rgba(var(--oriel-glass),.5);color:rgb(var(--oriel-ink))}
.chip .ic{width:15px;height:15px} .chip.on{background:rgb(var(--oriel-accent-fill));color:rgb(var(--oriel-ink-on-accent));border-color:rgba(var(--oriel-glass),.6)}
#hchips{left:100px;top:22px;display:flex;gap:8px;align-items:center}
#hchips .chip{height:40px;border-radius:20px;padding:0 14px 0 8px;font-size:14px;gap:8px;cursor:pointer}
#hchips .chip.wx{padding-left:12px}
#hchips #clk{padding:0 14px;cursor:default;font-variant-numeric:tabular-nums}
#hchips .pf{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:500;background:rgb(var(--oriel-pill));color:rgb(var(--oriel-on-dark))}
#hchips .pf.away{background:rgba(var(--oriel-ink),.25);color:rgb(var(--oriel-ink))}
#hchips .chip .ic{width:18px;height:18px}
#hdr-r{right:24px;top:20px;display:flex;gap:10px;align-items:center}
#rail{left:20px;top:96px;width:56px;max-height:620px;border-radius:28px;display:flex;flex-direction:column;align-items:center;padding:12px 0;gap:6px}
#rail .pl{display:flex;flex-direction:column;align-items:center;gap:6px;min-height:0;align-self:stretch} #rail .pl.scroll{overflow-y:auto;scrollbar-width:none} #rail .pl.scroll::-webkit-scrollbar{display:none} #rail .end{margin-top:6px}
#rail a{width:40px;height:40px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;color:rgb(var(--oriel-ink));opacity:.7;cursor:pointer}
#rail a.on{background:rgb(var(--oriel-raised));opacity:1;box-shadow:0 8px 16px rgba(var(--oriel-shadow),.25)}
#pages{display:contents}
.page{position:absolute;inset:0;pointer-events:none}
.page>*{pointer-events:auto}
.page.off{display:none}
.page.off>*{pointer-events:none}
#greet{left:100px;top:84px;width:330px} #greet .d{font-size:14px;color:rgba(var(--oriel-ink),.62);margin-bottom:4px}
#greet h1{margin:0;font-size:38px;line-height:1.05;font-weight:200;letter-spacing:-.01em} #greet h1 b{font-weight:400}
#energy{left:100px;top:200px;width:300px;height:304px;padding:18px 20px;z-index:3}
#energy .t{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:rgba(var(--oriel-on-dark),.7)}
#energy .now{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}
#energy .now div{display:flex;flex-direction:column;gap:2px;cursor:pointer}
#energy .now small{font-size:11px;color:rgba(var(--oriel-on-dark),.5);display:flex;align-items:center;gap:5px}
#energy .now small i{width:6px;height:6px;border-radius:50%;display:block}
#energy .now b{font-weight:200;font-size:22px;font-variant-numeric:tabular-nums;white-space:nowrap} #energy .now b em{font-style:normal;font-size:12px;color:rgba(var(--oriel-on-dark),.55);margin-left:2px}
#energy .bat{height:5px;border-radius:3px;background:rgba(var(--oriel-on-dark),.14);margin-top:6px;overflow:hidden} #energy .bat i{display:block;height:100%;width:0;background:rgb(var(--oriel-accent));border-radius:3px;transition:width .6s}
#energy .big{font-size:36px;font-weight:200;line-height:1;margin-top:16px;font-variant-numeric:tabular-nums} #energy .big small{font-size:14px;color:rgba(var(--oriel-on-dark),.6);margin-left:4px;font-weight:300}
#energy .up{display:flex;gap:6px;align-items:center;margin-top:4px;font-size:12.5px;color:rgb(var(--oriel-accent));min-height:18px}
#energy .ax{display:flex;justify-content:space-between;font-size:10.5px;color:rgba(var(--oriel-on-dark),.45);padding:0 2px;margin-top:3px}
#today{left:100px;top:520px;width:300px;height:256px;padding:16px 16px 14px;z-index:3}
#today .h{display:flex;justify-content:space-between;align-items:center;padding:0 4px;margin-bottom:8px;font-size:14px;font-weight:500}
#today .g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
.cell{border-radius:16px;background:rgba(var(--oriel-glass),.34);border:1px solid rgba(var(--oriel-glass),.5);padding:8px 9px;height:62px;min-width:0;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer}
.cell small{font-size:10.5px;color:rgba(var(--oriel-ink),.62);display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden}
.cell small .ic{width:13px;height:13px}
.cell b{font-weight:300;font-size:17px;font-variant-numeric:tabular-nums;white-space:nowrap} .cell b em{font-style:normal;font-size:10px;color:rgba(var(--oriel-ink),.62);margin-left:2px}
.cell.good b{color:rgb(var(--oriel-good))} .cell.bad b{color:rgb(var(--oriel-bad))}
#stage{left:calc(355px + var(--dx,0px));top:44px;width:620px;height:650px} #stage .pill{cursor:pointer} #stage .pill:hover rect{fill:rgb(var(--oriel-raised)) !important}
#qa{left:calc(416px + var(--dx,0px));top:652px;width:472px;height:124px;padding:12px 14px;display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr;gap:10px;z-index:3}
#qa .hd{position:absolute;left:22px;top:-26px;font-size:13px;color:rgb(var(--oriel-ink));font-weight:500}
.qa{border-radius:20px;background:rgba(var(--oriel-on-dark),.1);border:1px solid rgba(var(--oriel-on-dark),.14);color:rgb(var(--oriel-on-dark-text));display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;padding:12px;text-align:left;cursor:pointer;min-width:0}
.qa .ic{width:22px;height:22px} .qa b{font-weight:500;font-size:14px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%} .qa span.s{font-size:11.5px;color:rgba(var(--oriel-on-dark),.6);white-space:nowrap}
.qa div{min-width:0;max-width:100%}
.qa.primary{background:linear-gradient(150deg,rgba(var(--oriel-accent-hi),.95),rgba(var(--oriel-accent-lo),.8));color:rgb(var(--oriel-on-accent));border-color:rgba(var(--oriel-on-dark),.5)} .qa.primary span.s{color:rgba(var(--oriel-on-accent),.7)}
#room{right:24px;top:84px;width:344px;height:692px;padding:16px 16px 14px;display:flex;flex-direction:column;gap:8px;z-index:3}
#room.fit{height:auto;max-height:692px}
#room .h{display:flex;justify-content:space-between;align-items:center;padding:0 4px;min-height:30px} #room .h b{font-size:22px;font-weight:400}
.sec{font-size:11.5px;color:rgba(var(--oriel-ink),.62);padding:0 4px;margin-bottom:-4px;display:flex;justify-content:space-between}
#lights{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.tl{text-align:left;cursor:pointer;border-radius:18px;padding:7px 10px;height:46px;display:flex;flex-direction:column;justify-content:space-between;background:rgba(var(--oriel-glass),.3);border:1px solid rgba(var(--oriel-glass),.5);color:rgb(var(--oriel-ink));min-width:0}
.tl .r{display:flex;justify-content:space-between;align-items:center} .tl .ic{width:18px;height:18px} .tl .nm{font-size:12.5px}
.tg{width:28px;height:16px;border-radius:8px;background:rgba(var(--oriel-ink),.25);position:relative;transition:background .2s}
.tg::after{content:"";position:absolute;left:2px;top:2px;width:12px;height:12px;border-radius:50%;background:rgb(var(--oriel-raised));transition:left .2s}
.tl.on{background:rgba(var(--oriel-glass),.65)} .tl.on .tg{background:rgb(var(--oriel-accent-strong))} .tl.on .tg::after{left:14px}
#heat{border-radius:20px;background:rgba(var(--oriel-glass),.28);border:1px solid rgba(var(--oriel-glass),.5);padding:8px 10px;display:flex;flex-direction:column;gap:4px}
.hr{display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:center;height:38px}
.hr .l{display:flex;flex-direction:column;line-height:1.15;cursor:pointer;min-width:0} .hr .l b{font-weight:400;font-size:13.5px} .hr .l span{font-size:11px;color:rgba(var(--oriel-ink),.62)}
.hr .v{font-size:24px;font-weight:200;font-variant-numeric:tabular-nums;min-width:62px;text-align:right}
.boost{height:36px;border-radius:18px;border:0;background:rgb(var(--oriel-ink-fill));color:rgb(var(--oriel-on-dark));display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;cursor:pointer}
.boost .ic{width:16px;height:16px;color:${ENERGY.heat}} .boost.on{background:${ENERGY.heatOn}}
#apps{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.ap{border-radius:18px;padding:8px 10px;height:72px;display:flex;flex-direction:column;justify-content:space-between;background:rgba(var(--oriel-glass),.2);border:1px solid rgba(var(--oriel-glass),.4);color:rgba(var(--oriel-ink),.62);transition:box-shadow .2s;cursor:pointer;min-width:0}
.ap .r{display:flex;justify-content:space-between;align-items:center} .ap .ic{width:20px;height:20px}
.ap .nm{font-size:12.5px;color:rgb(var(--oriel-ink));white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .ap .st{line-height:1.3;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ap.run{background:rgba(var(--oriel-glass),.62);color:rgb(var(--oriel-ink));box-shadow:0 0 0 1.5px var(--c),0 0 18px 2px var(--c)}
.ap.run .st{color:rgb(var(--oriel-ink))} .ap i{width:7px;height:7px;border-radius:50%;background:var(--c);display:none} .ap.run i{display:block}
.ap.warn .st{color:rgb(var(--oriel-bad));font-weight:500}
.fr{height:38px;border-radius:16px;background:rgba(var(--oriel-glass),.28);border:1px solid rgba(var(--oriel-glass),.5);display:flex;align-items:center;gap:10px;padding:0 12px;font-size:13px;cursor:pointer}
.fr small{color:rgba(var(--oriel-ink),.62);margin-left:auto;font-size:12px} .fr .ic{width:20px;height:20px}
.fr.alert{background:rgb(var(--oriel-bad-bg));border-color:rgb(var(--oriel-bad-line));box-shadow:0 0 16px 2px rgba(var(--oriel-bad-glow),.45)} .fr.alert small{color:rgb(var(--oriel-bad-ink));font-weight:500}
#nova{flex:1;min-height:150px;padding:12px;display:flex;flex-direction:column;gap:8px}
#nova .hd{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:500}
#nova .hd i{width:22px;height:22px;border-radius:50%;background:rgb(var(--oriel-raised));display:grid;place-items:center} #nova .hd i .ic{width:13px;height:13px}
#log{display:flex;flex-direction:column;gap:6px;flex:1;min-height:0;overflow:hidden;justify-content:flex-end}
#log .msg{font-size:13px;line-height:1.3;background:rgba(var(--oriel-nova-glass),.5);border-radius:14px 14px 14px 4px;padding:7px 11px;align-self:flex-start;max-width:96%}
#log .me{align-self:flex-end;background:rgba(var(--oriel-my-bubble),.85);color:rgb(var(--oriel-on-dark));border-radius:14px 14px 4px 14px}
#nova form{display:flex;gap:6px;align-items:center;margin:0}
#nova input{flex:1;min-width:0;height:36px;border-radius:18px;border:0;background:rgba(var(--oriel-nova-glass),.55);padding:0 14px;font:inherit;font-size:13px;color:rgb(var(--oriel-on-nova));outline:none}
#nova input::placeholder{color:rgba(var(--oriel-on-nova),.7)} #nova .round{width:36px;height:36px} #nova .mic{background:rgb(var(--oriel-ink-fill));color:rgb(var(--oriel-on-dark))}
#shop{position:absolute;inset:0;z-index:11;background:rgba(var(--oriel-scrim),.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center}
#shop.show{display:flex}
#shop .pn{width:480px;height:640px;padding:22px;display:flex;flex-direction:column;gap:14px;border-radius:28px;background:linear-gradient(150deg,rgba(var(--oriel-sheet-a),.97),rgba(var(--oriel-sheet-b),.97));box-shadow:0 30px 70px rgba(var(--oriel-shadow-deep),.5);color:rgb(var(--oriel-ink))}
#shop .hd{display:flex;align-items:center;justify-content:space-between} #shop .hd b{font-size:24px;font-weight:400} #shop .hd span{font-size:13px;color:rgba(var(--oriel-ink),.6);margin-left:10px}
#shop form{display:flex;gap:8px;margin:0}
#shop input{flex:1;min-width:0;height:46px;border-radius:23px;border:1px solid rgba(var(--oriel-ink),.12);background:rgb(var(--oriel-raised));padding:0 18px;font:inherit;font-size:15px;color:rgb(var(--oriel-ink));outline:none}
#shop ul{list-style:none;margin:0;padding:0;flex:1;overflow-y:auto}
#shop li{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:16px;background:rgba(var(--oriel-glass),.6);margin-bottom:6px;font-size:15px;cursor:pointer}
#shop .ck{width:24px;height:24px;border-radius:50%;border:2px solid rgba(var(--oriel-ink),.3);flex:none;display:grid;place-items:center}
#shop li.done{opacity:.5;text-decoration:line-through} #shop li.done .ck{background:rgb(var(--oriel-accent-strong));border-color:rgb(var(--oriel-accent-strong));color:rgb(var(--oriel-on-dark))} #shop .ck .ic{width:14px;height:14px;stroke-width:2.4}
#shop .empty{text-align:center;color:rgba(var(--oriel-ink),.6);padding:40px 0;font-size:14px}
#shop .clr{height:42px;border-radius:21px;border:0;background:rgb(var(--oriel-ink-fill));color:rgb(var(--oriel-on-dark));font-size:14px;cursor:pointer}
#bell{position:absolute;inset:0;z-index:10;background:rgba(var(--oriel-scrim),.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center}
#bell.show{display:flex}
#bell .cam{width:620px;border-radius:28px;overflow:hidden;background:rgb(var(--oriel-black));color:rgb(var(--oriel-on-dark));box-shadow:0 30px 70px rgba(var(--oriel-shadow-deep),.5)}
#bell .feed{height:349px;background:${CAM.feed};overflow:hidden} #bell .feed > *{display:block;width:100%;height:100%}
#bell .cap{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;font-size:18px;font-weight:300}
#bell .cap button{border:0;height:40px;padding:0 20px;border-radius:20px;font-size:14px;cursor:pointer;background:rgb(var(--oriel-raised));color:rgb(var(--oriel-ink))}
`;

const HTML = `
<div id="wrap"><div id="screen">
  <div id="hchips" class="abs"></div>
  <div id="hdr-r" class="abs"><button class="round ghost" id="bAlarm" aria-label="${esc(S.alarm)}">${icon('shield')}</button><button class="round ghost" id="bDoor" aria-label="${esc(S.front_door)}">${icon('door')}</button><button class="round ghost" id="bWin" aria-label="${esc(S.windows)}" title="${esc(S.windows)}">${icon('win')}</button></div>
  <nav id="rail" class="abs glass mid"></nav>
  <div id="pages">
  <div id="pgHome" class="page">
    <div id="greet" class="abs"><div class="d" id="gDate"></div><h1 id="gHi"></h1></div>
    <svg id="stage" class="abs" viewBox="-320 -300 800 840"></svg>
    <div id="energy" class="abs black">
      <div class="t"><span>${esc(S.energy)}</span><span style="color:rgb(var(--oriel-accent))">${icon('bolt')}</span></div>
      <div class="now">
        <div id="nSolar" role="button" tabindex="0"><small><i style="background:${ENERGY.solarDot}"></i>${esc(S.solar)}</small><b><span id="vSolar">–</span><em>kW</em></b></div>
        <div id="nHome" role="button" tabindex="0"><small><i style="background:${ENERGY.house}"></i>${esc(S.home_load)}</small><b><span id="vHome">–</span><em>kW</em></b></div>
        <div id="nBat" role="button" tabindex="0"><small><i style="background:rgb(var(--oriel-accent))"></i>${esc(S.battery)}</small><b><span id="vBat">–</span><em>%</em></b><span class="bat"><i id="batBar"></i></span></div>
      </div>
      <div class="big"><span id="eKwh">–</span><small>${esc(S.kwh_used_today)}</small></div>
      <div class="up" id="eUp"></div>
      <svg id="echart" viewBox="0 0 260 74" width="260" height="74" style="margin-top:6px"></svg>
      <div class="ax"><span>0</span><span>3</span><span>6</span><span>9</span><span>12</span><span>15</span><span>18</span><span>21</span></div>
    </div>
    <div id="today" class="abs glass"><div class="h"><span>${esc(S.today)}</span><span class="chip" style="height:24px;font-size:11.5px" id="price">–</span></div><div class="g" id="cells"></div></div>
    <div id="qa" class="abs dark"><div class="hd">${esc(S.quick_actions)}</div></div>
    <div id="room" class="abs glass mid">
      <div class="h" id="roomH"><b id="roomT"></b><span class="chip" id="mot">${icon('user')}<span id="motT">–</span></span></div>
      <div id="lights"></div>
      <div id="heat"></div>
      <div class="sec" id="appsH"><span>${esc(S.appliances)}</span></div>
      <div id="apps"></div>
      <div class="fr" id="fridge" role="button" tabindex="0">${icon('fridge')}${esc(S.fridge)}<small id="fridgeT">–</small></div>
      <div id="nova" class="nova hide">
        <div class="hd"><i>${icon('spark')}</i>Nova</div>
        <div id="log" aria-live="polite"><div class="msg">${esc(S.chat_hello)}</div></div>
        <form id="nf" autocomplete="off"><input id="ni" placeholder="${esc(S.chat_placeholder)}" aria-label="${esc(S.chat_placeholder)}" enterkeyhint="send"><button type="submit" class="round" aria-label="${esc(S.send)}">${icon('send')}</button><button type="button" class="round mic" id="bMic" aria-label="${esc(S.talk_to_nova)}">${icon('mic')}</button></form>
      </div>
    </div>
  </div>
  </div>
  <div id="shop"><div class="pn" role="dialog" aria-label="${esc(S.shopping_list)}"><div class="hd"><div><b>${esc(S.shopping_list)}</b><span id="shopCount"></span></div><button type="button" class="round sm" id="shopX" aria-label="${esc(S.close)}">${icon('close')}</button></div>
    <form id="shopForm" autocomplete="off"><input id="shopIn" placeholder="${esc(S.add_item)}" aria-label="${esc(S.add_item)}" enterkeyhint="done"><button type="submit" class="round" aria-label="${esc(S.add)}">${icon('plus')}</button></form>
    <ul id="shopList"></ul><button type="button" class="clr" id="shopClear">${esc(S.clear_completed)}</button></div></div>
  <div id="bell"><div class="cam" role="dialog"><div class="feed" id="feed"></div><div class="cap"><span id="bellT"></span><button type="button" id="bellX">${esc(S.dismiss)}</button></div></div></div>
</div></div>`;

/* Page registry. Home is built in; the others come from src/pages/*.js. */
export const PAGES = [];
const DEFAULT_ORDER = ['home', 'living', 'energy', 'security', 'vacuum', 'nova'];

function loadFont() {
  if (document.getElementById('oriel-font')) return;
  const s = document.createElement('style');
  s.id = 'oriel-font';
  s.textContent = `@font-face{font-family:'Outfit';src:url(${fontUrl}) format('truetype');font-weight:100 900;font-style:normal;font-display:swap}`;
  document.head.appendChild(s);
}

const APPLIANCE_DEFAULTS = { icon: 'washer', colour: LIGHT.appliance, kind: 'machine', run_states: ['run', 'running'], pause_states: ['pause', 'paused'], burners: [] };

export class OrielShell extends HTMLElement {
  setConfig(config) {
    this._raw = config || {};
    this._c = normalise(this._raw);
    if (this._built) { this._teardown(); this._build(); }
  }
  getCardSize() { return 12; }
  /* State text (alarm, vacuum) keeps its hue but gets a light shade on dark themes. */
  _stateText(t) { return this._dark ? STATE_ON_DARK[t] || t : t; }
  static getStubConfig() { return {}; }
  static getConfigElement() { return document.createElement('oriel-shell-editor'); }

  connectedCallback() {
    if (!this._c) this._c = normalise({});
    if (!this._built) this._build();
  }
  disconnectedCallback() { this._teardown(); }
  set hass(h) {
    this._h = h;
    if (this._camCard) this._camCard.hass = h;
    if (this._built) this._update();
  }
  get hass() { return this._h; }

  /* ---------- build and teardown ---------- */
  _build() {
    loadFont();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style id="theme">${themeStyle(this._c.general.theme, this._c.general.accent)}</style><style>${CSS}</style>${HTML}`;
    this.$ = (id) => this.shadowRoot.getElementById(id);
    this._dark = isDarkTheme(this._c.general.theme);
    this._built = true;
    this._ov = {}; this._timers = {}; this._dismissed = {};
    this._pages = { home: { el: this.$('pgHome'), def: { key: 'home' } } };
    this._page = 'home'; this._pageSig = null; this._css = {};
    this._camKey = null; this._camCard = null; this._energy = null; this._shopItems = null;
    try { this._buildStatic(); } catch (e) { console.error('[oriel] build failed', e); }
    this._fit();
    this._ro = new ResizeObserver(() => this._fit());
    this._ro.observe(this);
    this._onWin = () => this._fit();
    window.addEventListener('resize', this._onWin);
    this._tick = setInterval(() => { this._clock(); if (this._h) this._renderBoost(); }, 15000);
    if (this._h) this._update();
  }
  _teardown() {
    if (!this._built) return;
    Object.keys(this._pages || {}).forEach((k) => { const p = this._pages[k]; if (p.def.stop) { try { p.def.stop.call(this); } catch (e) { /* nothing to stop */ } } });
    if (this._ro) this._ro.disconnect();
    window.removeEventListener('resize', this._onWin);
    clearInterval(this._tick); clearInterval(this._etick); this._etick = null;
    Object.keys(this._timers || {}).forEach((k) => clearTimeout(this._timers[k]));
    this._built = false;
  }

  _fit() {
    const w = this.clientWidth || window.innerWidth;
    const top = this.getBoundingClientRect().top;
    const h = Math.max(300, window.innerHeight - Math.max(0, top));
    this.style.height = h + 'px';
    const k = Math.min(w / 1280, h / 800), W = clamp(w / k, 1280, 1700), wrap = this.$('wrap');
    wrap.style.width = W + 'px'; wrap.style.setProperty('--dx', ((W - 1280) / 2) + 'px');
    wrap.style.transform = `translate(${(w - W * k) / 2}px,${(h - 800 * k) / 2}px) scale(${k})`;
  }

  /* ---------- helpers shared by every page ---------- */
  st(id) { return isEnt(id) && this._h && this._h.states ? this._h.states[id] : undefined; }
  sv(id) { const s = this.st(id); return s ? s.state : undefined; }
  num(id) { const s = this.st(id); const v = s ? parseFloat(s.state) : NaN; return Number.isFinite(v) ? v : null; }
  name(id) { const s = this.st(id); return (s && s.attributes && s.attributes.friendly_name) || id || ''; }
  call(domain, service, data) { if (this._h) return this._h.callService(domain, service, data || {}); }
  runScript(id) { if (isEnt(id)) this.call('script', id.split('.')[1]); }
  moreInfo(id) { if (!isEnt(id)) return; this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: id } })); }
  navigate(path) { history.pushState(null, '', path); window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } })); }
  debounce(key, ms, fn) { clearTimeout(this._timers[key]); this._timers[key] = setTimeout(fn, ms); }
  override(key, val, ms = 2000) { this._ov[key] = { val, until: Date.now() + ms }; }
  ov(key, real) { const o = this._ov[key]; return o && o.until > Date.now() ? o.val : real; }
  lang() { const h = this._h; return (h && ((h.locale && h.locale.language) || h.language)) || 'en-GB'; }
  currency() { const c = this._c.general.currency; return c && c !== 'auto' ? c : (this._h && this._h.config && this._h.config.currency) || ''; }
  money(v, digits = 2) {
    const cur = this.currency();
    if (!cur) return v.toFixed(digits);
    try { return new Intl.NumberFormat(this.lang(), { style: 'currency', currency: cur, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v); }
    catch (e) { return v.toFixed(digits); }
  }
  fmt(id) {
    const s = this.st(id); if (!s) return { n: '–', u: '' };
    const v = parseFloat(s.state); if (!Number.isFinite(v)) return { n: '–', u: '' };
    const u = s.attributes.unit_of_measurement || '';
    if (u === 'W') return { n: (v / 1000).toFixed(2), u: 'kW' };
    if (u === 'kWh') return { n: v < 10 ? v.toFixed(2) : v.toFixed(1), u };
    if (/^[€$£¥₹]$|^[A-Z]{3}$/.test(u)) return { n: this.money(v), u: '' };
    if (u === 'L') return { n: String(Math.round(v)), u };
    return { n: Math.abs(v) < 10 ? v.toFixed(1) : String(Math.round(v)), u };
  }
  /* tap and keyboard (Enter/Space) on a non-button element */
  tap(node, fn) {
    if (!node) return;
    node.addEventListener('click', fn);
    if (node.tagName !== 'BUTTON' && node.tagName !== 'A') {
      if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
      if (!node.hasAttribute('role')) node.setAttribute('role', 'button');
    }
    node.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === node) { e.preventDefault(); fn(e); } });
  }
  addCss(key, css) {
    if (this._css[key]) return;
    const st = document.createElement('style'); st.textContent = css; this.shadowRoot.appendChild(st); this._css[key] = true;
  }

  /* ---------- pages and rail ---------- */
  _pageDefs() {
    const c = this._c, order = Array.isArray(c.general.pages_order) && c.general.pages_order.length ? c.general.pages_order : DEFAULT_ORDER;
    const rank = (k) => { const i = order.indexOf(k); return i < 0 ? 99 : i; };
    const defs = PAGES.filter((d) => { try { return d.enabled.call(this, c); } catch (e) { return false; } });
    return [{ key: 'home', icon: 'home', label: S.page_home }].concat(defs.sort((a, b) => rank(a.key) - rank(b.key)));
  }
  _syncPages() {
    const defs = this._pageDefs(), sig = defs.map((d) => d.key).join();
    if (sig === this._pageSig) return;
    this._pageSig = sig;
    const host = this.$('pages');
    defs.forEach((d) => {
      if (this._pages[d.key]) return;
      try {
        if (d.css) this.addCss(d.key, d.css);
        const pg = d.init.call(this);
        pg.classList.add('page'); if (d.key !== this._page) pg.classList.add('off');
        host.appendChild(pg);
        this._pages[d.key] = { el: pg, def: d };
      } catch (e) { console.error('[oriel] ' + d.key + ' page failed to start', e); }
    });
    Object.keys(this._pages).forEach((k) => {
      if (defs.find((d) => d.key === k)) return;
      const p = this._pages[k];
      if (p.def.stop) { try { p.def.stop.call(this); } catch (e) { /* nothing to stop */ } }
      p.el.remove(); delete this._pages[k];
    });
    const rail = this.$('rail'); rail.innerHTML = '';
    const pl = document.createElement('div'); pl.className = 'pl'; rail.appendChild(pl);
    const mk = (d, box) => {
      const a = document.createElement('a'); a.innerHTML = icon(d.icon); a.dataset.k = d.key;
      const lab = typeof d.label === 'function' ? d.label.call(this, this._c) : d.label; a.setAttribute('aria-label', lab); a.title = lab;
      a.classList.toggle('on', d.key === this._page);
      this.tap(a, () => this._setPage(d.key)); a.setAttribute('role', 'button'); a.setAttribute('tabindex', '0');
      box.appendChild(a); return a;
    };
    defs.filter((d) => this._pages[d.key] && !d.bottom).forEach((d) => mk(d, pl));
    defs.filter((d) => this._pages[d.key] && d.bottom).forEach((d) => mk(d, rail).classList.add('end'));
    // page icons scroll only when they do not fit; until then nothing clips the "on" shadow
    requestAnimationFrame(() => pl.classList.toggle('scroll', pl.scrollHeight > pl.clientHeight + 1));
    if (!this._pages[this._page]) this._setPage('home');
  }
  _setPage(key) {
    const pg = this._pages && this._pages[key]; if (!pg) return;
    this._page = key;
    Object.keys(this._pages).forEach((k) => this._pages[k].el.classList.toggle('off', k !== key));
    this.$('rail').querySelectorAll('a[data-k]').forEach((a) => { const on = a.dataset.k === key; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (pg.def.update && this._h) { try { pg.def.update.call(this); } catch (e) { console.warn('[oriel] ' + key + ' update', e); } }
  }

  /* ---------- Home: static build ---------- */
  _buildStatic() {
    const c = this._c, g = c.general, H = c.home, $ = this.$;
    // header
    const hc = $('hchips');
    this._wx = document.createElement('span'); this._wx.className = 'chip glass mid wx';
    this.tap(this._wx, () => this.moreInfo(g.weather)); hc.appendChild(this._wx);
    if (!isEnt(g.weather)) this._wx.classList.add('hide');
    this._clk = document.createElement('span'); this._clk.id = 'clk'; this._clk.className = 'chip glass mid'; hc.appendChild(this._clk);
    if (!g.clock) this._clk.classList.add('hide');
    const people = g.people_display === 'hidden' ? [] : (g.people || []).filter(isEnt);
    this._pp = people.map((id) => { const s = document.createElement('span'); s.className = 'chip glass mid'; this.tap(s, () => this.moreInfo(id)); hc.appendChild(s); return { id, el: s }; });
    $('bAlarm').classList.toggle('hide', !isEnt(g.alarm)); $('bAlarm').addEventListener('click', () => this.moreInfo(g.alarm));
    $('bDoor').classList.toggle('hide', !isEnt(g.front_door)); $('bDoor').addEventListener('click', () => this.moreInfo(g.front_door));
    const wins = (g.windows || []).filter(isEnt);
    $('bWin').classList.toggle('hide', !wins.length); $('bWin').addEventListener('click', () => this.moreInfo(wins.find((id) => this.sv(id) === 'on') || wins[0]));
    // energy card
    const E = H.energy_card;
    $('energy').classList.toggle('hide', ![E.solar_power, E.house_power, E.battery_soc].some(isEnt));
    this.tap($('nSolar'), () => this.moreInfo(E.solar_power));
    this.tap($('nHome'), () => this.moreInfo(E.house_power));
    this.tap($('nBat'), () => this.moreInfo(E.battery_soc));
    // today
    const cw = $('cells'); this._cells = [];
    (H.today || []).slice(0, 9).forEach((d) => {
      const div = document.createElement('div'); div.className = 'cell ' + (d.tone === 'good' || d.tone === 'bad' ? d.tone : '');
      div.innerHTML = `<small>${icon(d.icon || 'grid')}<span></span></small><b>–</b>`; div.querySelector('small span').textContent = d.label || '';
      this.tap(div, () => this.moreInfo(d.entity));
      cw.appendChild(div); this._cells.push({ d, b: div.querySelector('b'), lab: div.querySelector('small span') });
    });
    $('price').classList.toggle('hide', !isEnt(H.price));
    $('today').classList.toggle('hide', !this._cells.length && !isEnt(H.price));
    // quick actions
    const qa = $('qa'); this._qa = [];
    const acts = (H.quick_actions || []).filter((a) => a && (a.type === 'shopping' ? isEnt(H.shopping) : isEnt(a.entity))).slice(0, 4);
    acts.forEach((a, i) => {
      const dom = a.type === 'shopping' ? 'todo' : a.entity.split('.')[0];
      const ic = a.icon || { todo: 'cart', script: 'dish', vacuum: 'vacuum', alarm_control_panel: 'shield' }[dom] || 'spark';
      const primary = a.primary !== undefined ? !!a.primary : (i === 0 && a.type === 'script');
      const b = document.createElement('button'); b.className = 'qa' + (primary ? ' primary' : '');
      b.innerHTML = `${icon(ic)}<div><b></b><span class="s">–</span></div>`;
      b.addEventListener('click', () => {
        if (a.type === 'shopping') this._openShop();
        else if (a.type === 'script' || dom === 'script') this.runScript(a.entity);
        else this.moreInfo(a.entity);
      });
      qa.appendChild(b); this._qa.push({ a, dom, primary, b: b.querySelector('b'), s: b.querySelector('.s') });
    });
    qa.style.gridTemplateColumns = this._qa.map((q) => (q.primary ? '1.25fr' : '1fr')).join(' ');
    qa.classList.toggle('hide', !this._qa.length);
    // room panel
    this._buildRoomPanel();
    // shopping and popups
    $('nf').addEventListener('submit', (e) => { e.preventDefault(); const tx = $('ni').value.trim(); if (tx && this._homeAsk) { $('ni').value = ''; this._homeAsk(tx); } });
    $('bMic').addEventListener('click', () => { if (this._homeMic) this._homeMic(); });
    $('bellX').addEventListener('click', () => { if (this._camKey) this._dismissed[this._camKey] = true; this._hideCam(); });
    $('shopX').addEventListener('click', () => this._closeShop());
    $('shop').addEventListener('click', (e) => { if (e.target === $('shop')) this._closeShop(); });
    $('shopForm').addEventListener('submit', (e) => { e.preventDefault(); const tx = $('shopIn').value.trim(); if (tx) { $('shopIn').value = ''; this._shopAdd(tx); } });
    $('shopClear').addEventListener('click', () => this._shopClear());
    if (this._buildHouse) { try { this._buildHouse(); } catch (e) { console.error('[oriel] house failed', e); } }
    this._clock();
  }

  _buildRoomPanel() {
    const R = this._c.home.room_panel, $ = this.$;
    $('roomT').textContent = R.title || '';
    $('mot').classList.toggle('hide', !isEnt(R.motion));
    $('roomH').classList.toggle('hide', !R.title && !isEnt(R.motion));
    const lw = $('lights'); this._lightEls = [];
    const lights = (R.lights || []).filter((l) => l && isEnt(l.entity));
    lights.forEach((l) => {
      const b = document.createElement('button'); b.className = 'tl';
      b.innerHTML = `<div class="r">${icon(l.icon || 'bulb')}<span class="tg"></span></div><span class="nm"></span>`; b.querySelector('.nm').textContent = l.name || this.name(l.entity);
      b.addEventListener('click', () => this.call('homeassistant', 'toggle', { entity_id: l.entity }));
      lw.appendChild(b); this._lightEls.push({ l, b });
    });
    if (lights.length) {
      const off = document.createElement('button'); off.className = 'tl';
      off.innerHTML = `<div class="r">${icon('alloff')}</div><span class="nm">${esc(S.all_lights_off)}</span>`;
      off.addEventListener('click', () => this.call('homeassistant', 'turn_off', { entity_id: lights.filter((l) => l.all_off !== false).map((l) => l.entity) }));
      lw.appendChild(off);
    }
    lw.classList.toggle('hide', !lights.length);
    const hw = $('heat'); this._heat = [];
    (R.heating || []).filter((h) => h && isEnt(h.entity)).forEach((h) => {
      const step = Number(h.step) > 0 ? Number(h.step) : 0.5;
      const row = document.createElement('div'); row.className = 'hr';
      row.innerHTML = `<div class="l"><b></b><span>–</span></div><span class="v">–</span><button class="round sm" aria-label="${esc(S.lower)}">${icon('minus')}</button><button class="round sm" aria-label="${esc(S.raise)}">${icon('plus')}</button>`;
      row.querySelector('.l b').textContent = h.name || this.name(h.entity);
      const [bm, bp] = row.querySelectorAll('button');
      bm.addEventListener('click', () => this._bump(h.entity, -step, step));
      bp.addEventListener('click', () => this._bump(h.entity, step, step));
      this.tap(row.querySelector('.l'), () => this.moreInfo(h.entity));
      hw.appendChild(row); this._heat.push({ h, sub: row.querySelector('.l span'), v: row.querySelector('.v') });
    });
    const B = R.boost || {};
    this._boost = null;
    if (isEnt(B.start) || isEnt(B.timer) || isEnt(B.switch)) {
      this._boost = document.createElement('button'); this._boost.className = 'boost';
      this._boost.addEventListener('click', () => this._toggleBoost());
      hw.appendChild(this._boost);
    }
    hw.classList.toggle('hide', !this._heat.length && !this._boost);
    const aw = $('apps'); this._apps = [];
    (R.appliances || []).filter((a) => a && isEnt(a.state)).forEach((a0) => {
      const a = Object.assign({}, APPLIANCE_DEFAULTS, a0);
      const d = document.createElement('div'); d.className = 'ap'; d.style.setProperty('--c', a.colour);
      d.innerHTML = `<div class="r">${icon(a.icon)}<i></i></div><div><div class="nm"></div><div class="st">–</div></div>`; d.querySelector('.nm').textContent = a.name || this.name(a.state);
      this.tap(d, () => { if (isEnt(a.tap_script)) this.runScript(a.tap_script); else this.moreInfo(a.state); });
      aw.appendChild(d); this._apps.push({ a, d, st: d.querySelector('.st') });
    });
    aw.classList.toggle('hide', !this._apps.length); $('appsH').classList.toggle('hide', !this._apps.length);
    const F = R.fridge || {};
    const hasFridge = [F.door, F.fridge_temp, F.freezer_temp].some(isEnt);
    $('fridge').classList.toggle('hide', !hasFridge);
    this.tap($('fridge'), () => this.moreInfo(F.door || F.fridge_temp));
    this._roomHasContent = !!(R.title || isEnt(R.motion) || lights.length || this._heat.length || this._boost || this._apps.length || hasFridge);
    this._syncRoomPanel();
  }
  /* the room panel shows when it has content, or when another module (Nova chat) puts something in it */
  _syncRoomPanel() { const noChat = this.$('nova').classList.contains('hide'), r = this.$('room'); r.classList.toggle('hide', !this._roomHasContent && noChat); r.classList.toggle('fit', noChat); }
  appliances() { return (this._c.home.room_panel.appliances || []).filter((a) => a && isEnt(a.state)).map((a) => Object.assign({}, APPLIANCE_DEFAULTS, a)); }

  /* ---------- shopping overlay ---------- */
  _openShop() { this._shopOpen = true; this.$('shop').classList.add('show'); this._loadShop(); setTimeout(() => this.$('shopIn').focus({ preventScroll: true }), 50); }
  _closeShop() { this._shopOpen = false; this.$('shop').classList.remove('show'); }
  async _loadShop() {
    const id = this._c.home.shopping; if (!isEnt(id) || !this._h) return;
    try { const r = await this._h.callWS({ type: 'todo/item/list', entity_id: id }); this._shopItems = (r && r.items) || []; }
    catch (e) { console.warn('[oriel] shopping load failed', e); this._shopItems = this._shopItems || []; }
    this._renderShop();
  }
  _renderShop() {
    const items = (this._shopItems || []).slice().sort((a, b) => (a.status === 'completed') - (b.status === 'completed'));
    const ul = this.$('shopList'); ul.innerHTML = '';
    const left = items.filter((i) => i.status !== 'completed').length;
    this.$('shopCount').textContent = left ? t('to_buy', { n: left }) : '';
    if (!items.length) { ul.innerHTML = `<div class="empty">${esc(S.nothing_on_list)}</div>`; }
    items.forEach((it) => {
      const li = document.createElement('li'); li.className = it.status === 'completed' ? 'done' : '';
      li.innerHTML = `<span class="ck">${it.status === 'completed' ? icon('check') : ''}</span><span></span>`;
      li.lastChild.textContent = it.summary;
      this.tap(li, () => this._shopToggle(it)); li.setAttribute('role', 'checkbox'); li.setAttribute('aria-checked', String(it.status === 'completed'));
      ul.appendChild(li);
    });
  }
  _shopAdd(text) {
    const id = this._c.home.shopping;
    this._shopItems = this._shopItems || [];
    this._shopItems.unshift({ uid: 'tmp' + Date.now(), summary: text, status: 'needs_action' });
    this._renderShop();
    this.call('todo', 'add_item', { entity_id: id, item: text });
    setTimeout(() => this._loadShop(), 700);
  }
  _shopToggle(it) {
    it.status = it.status === 'completed' ? 'needs_action' : 'completed';
    this._renderShop();
    this.call('todo', 'update_item', { entity_id: this._c.home.shopping, item: it.uid, status: it.status });
    setTimeout(() => this._loadShop(), 800);
  }
  _shopClear() {
    this._shopItems = (this._shopItems || []).filter((i) => i.status !== 'completed'); this._renderShop();
    this.call('todo', 'remove_completed_items', { entity_id: this._c.home.shopping });
    setTimeout(() => this._loadShop(), 800);
  }

  /* ---------- greeting and clock ---------- */
  _clock() {
    if (!this._built) return;
    const d = new Date(), hr = d.getHours();
    this.$('gHi').textContent = hr < 5 ? S.good_night : hr < 12 ? S.good_morning : hr < 18 ? S.good_afternoon : S.good_evening;
    try { this.$('gDate').textContent = d.toLocaleDateString(this.lang(), { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch (e) { this.$('gDate').textContent = d.toDateString(); }
    if (this._clk) this._clk.textContent = hm(d);
  }

  /* ---------- heating ---------- */
  _bump(id, delta, step) {
    const s = this.st(id); if (!s) return;
    const cur = this.ov('t:' + id, s.attributes.temperature);
    if (cur == null) return;
    const v = clamp(Math.round((cur + delta) / step) * step, s.attributes.min_temp || 5, s.attributes.max_temp || 30);
    this.override('t:' + id, v); this._renderHeat();
    this.debounce('t:' + id, 500, () => this.call('climate', 'set_temperature', { entity_id: id, temperature: v }));
  }
  _renderHeat() {
    (this._heat || []).forEach(({ h, sub, v }) => {
      const s = this.st(h.entity); if (!s) { v.textContent = '–'; sub.textContent = '–'; return; }
      const tt = this.ov('t:' + h.entity, s.attributes.temperature), cur = s.attributes.current_temperature, act = s.attributes.hvac_action;
      v.textContent = tt != null ? Number(tt).toFixed(1) + '°' : '–';
      sub.textContent = (act ? cap(act) : cap(s.state)) + (cur != null ? ' · ' + t('now_temp', { t: Number(cur).toFixed(1) }) : '');
    });
  }
  _boostActive() {
    const B = this._c.home.room_panel.boost, tm = this.st(B.timer), sw = this.st(B.switch);
    return (tm && tm.state === 'active') || (sw && sw.state === 'on');
  }
  _toggleBoost() {
    const B = this._c.home.room_panel.boost;
    this.runScript(this._boostActive() ? B.cancel : B.start);
  }
  _renderBoost() {
    if (!this._boost) return;
    const B = this._c.home.room_panel.boost, tm = this.st(B.timer), on = this._boostActive();
    let txt = B.label ? t('boost_idle_label', { label: B.label }) : S.boost_idle;
    if (on) {
      txt = S.boost_running;
      if (tm && tm.attributes.finishes_at) txt = t('boost_running_min', { m: Math.max(0, Math.round((new Date(tm.attributes.finishes_at) - Date.now()) / 60000)) });
    }
    this._boost.className = 'boost' + (on ? ' on' : '');
    this._boost.innerHTML = `${icon('fire')}${esc(txt)}`;
  }

  /* ---------- appliances (also used by the Energy page) ---------- */
  _appState(a) {
    const s = this.sv(a.state);
    if (s === undefined) return { run: false, text: '–' };
    if (a.kind === 'cooktop') {
      if (s === 'unavailable' || s === 'unknown') return { run: false, text: S.off };
      if (s === 'run') {
        const parts = (a.burners || []).map((id, i) => { const l = this.sv(id); return l && !['unavailable', 'unknown', '0'].includes(l) ? `B${i + 1}:${l}` : null; }).filter(Boolean);
        return { run: true, text: parts.length ? parts.join(' ') : S.on };
      }
      return { run: false, text: S.idle };
    }
    if (isEnt(a.door) && this.sv(a.door) === 'on') return { run: false, text: S.door_open, warn: true };
    const run = a.run_states || [], pause = a.pause_states || [];
    if (run.includes(s) || pause.includes(s)) {
      const paused = pause.includes(s);
      let text = paused ? S.paused : S.running;
      if (isEnt(a.temperature) && isEnt(a.setpoint) && !paused) {
        const tt = parseFloat(this.sv(a.temperature)), sp = parseFloat(this.sv(a.setpoint));
        if (tt > 0 && sp > 0) text = `${Math.round(tt)}°→${Math.round(sp)}°`;
      }
      if (text === S.running || text === S.paused) { const f = isEnt(a.finish) ? hhmm(this.sv(a.finish)) : ''; if (f && !paused) text = t('finish_at', { t: f }); }
      return { run: true, text };
    }
    return { run: false, text: S.idle };
  }

  /* ---------- Home energy card and history ---------- */
  async _loadEnergy() {
    const id = this._c.home.energy_card.house_power;
    if (!this._h || this._eBusy || !isEnt(id)) return; this._eBusy = true;
    try {
      const now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate()), y0 = new Date(mid.getTime() - 86400000);
      const res = await this._h.callWS({ type: 'history/history_during_period', start_time: y0.toISOString(), end_time: now.toISOString(), entity_ids: [id], minimal_response: true, no_attributes: true, significant_changes_only: false });
      const pts = parseHistory(res && (res[id] || Object.values(res)[0]));
      this._energy = energySummary(pts, mid.getTime() / 1000, now.getTime() / 1000);
      this._renderEnergy();
    } catch (e) { console.warn('[oriel] energy history failed', e); }
    this._eBusy = false;
  }
  _renderEnergy() {
    const e = this._energy; if (!e || !this._built) return;
    this.$('eKwh').textContent = e.todayTotal.toFixed(1);
    const up = this.$('eUp');
    if (e.yesterdaySoFar > 0.05) {
      const pct = Math.round((e.todayTotal / e.yesterdaySoFar - 1) * 100);
      up.innerHTML = `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" style="width:14px;height:14px;transform:${pct < 0 ? 'rotate(90deg)' : 'none'}"><path d="M7 17L17 7M9 7h8v8"/></svg><span></span>`;
      up.lastChild.textContent = t(pct < 0 ? 'vs_yesterday_less' : 'vs_yesterday_more', { pct: Math.abs(pct) });
    } else up.textContent = '';
    const s = this.$('echart'); s.innerHTML = '';
    const d = el('defs', {}, s), pa = el('pattern', { id: 'hat', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d);
    el('rect', { width: 6, height: 6, fill: 'rgb(var(--oriel-accent))', opacity: .25 }, pa); el('rect', { width: 2.4, height: 6, fill: 'rgb(var(--oriel-accent))' }, pa);
    const max = Math.max(1, ...e.today, ...e.yesterday) * 1.1, H = 66, bw = 27, gap = 6.3, pts = [];
    const nowBin = Math.floor((new Date().getHours() * 60 + new Date().getMinutes()) / 180);
    const order = e.today.map((v, i) => [v, i]).filter(([, i]) => i <= nowBin).sort((a, b) => b[0] - a[0]).slice(0, 2).map(([, i]) => i);
    e.today.forEach((v, i) => {
      const x = 2 + i * (bw + gap), yh = e.yesterday[i] / max * H;
      if (yh > 1) el('rect', { x, y: H - yh, width: bw, height: yh, rx: 5, fill: 'none', stroke: 'rgba(var(--oriel-on-dark),.22)', 'stroke-dasharray': '2 3' }, s);
      if (i <= nowBin && v > 0.005) { const h = Math.max(3, v / max * H), top = order.includes(i); el('rect', { x, y: H - h, width: bw, height: h, rx: 5, fill: top ? 'url(#hat)' : 'rgb(var(--oriel-on-dark))', opacity: top ? 1 : .92 }, s); pts.push([x + bw / 2, H - h]); }
    });
    if (pts.length > 1) el('path', { d: 'M' + pts.map((p) => p.join(',')).join(' L'), fill: 'none', stroke: 'rgb(var(--oriel-on-dark))', 'stroke-width': 1.5, 'stroke-dasharray': '1 4', 'stroke-linecap': 'round' }, s);
    if (pts.length) { const l = pts[pts.length - 1]; el('circle', { cx: l[0], cy: l[1], r: 4, fill: 'rgb(var(--oriel-accent))', stroke: 'rgb(var(--oriel-black))', 'stroke-width': 2 }, s); }
  }

  /* ---------- camera popups ---------- */
  _syncCams() {
    const list = (this._c.home.camera_popups || []).filter((c) => c && isEnt(c.flag) && isEnt(c.camera));
    const act = list.find((c) => this.sv(c.flag) === 'on');
    if (!act) { this._dismissed = {}; if (this._camKey) this._hideCam(); return; }
    if (this._dismissed[act.flag] || this._camKey === act.flag) return;
    this._showCam(act);
  }
  async _showCam(a) {
    this._camKey = a.flag; this.$('bellT').textContent = a.title || this.name(a.camera);
    const feed = this.$('feed'); feed.innerHTML = '';
    try {
      const helpers = await window.loadCardHelpers();
      const type = customElements.get('webrtc-camera') ? 'custom:webrtc-camera' : 'picture-entity';
      const cfg = type === 'picture-entity' ? { type, entity: a.camera, camera_view: 'live', show_name: false, show_state: false } : { type, entity: a.camera };
      const card = await helpers.createCardElement(cfg);
      card.hass = this._h; feed.appendChild(card); this._camCard = card;
    } catch (e) { console.warn('[oriel] camera card failed', e); feed.textContent = S.camera_unavailable; }
    this.$('bell').classList.add('show');
  }
  _hideCam() { this.$('bell').classList.remove('show'); this._camKey = null; this._camCard = null; this.$('feed').innerHTML = ''; }

  /* ---------- update ---------- */
  _update() {
    if (!this._built || !this._h) return;
    try { this._syncPages(); } catch (e) { console.error('[oriel] pages', e); }
    try { this._updateHeader(); } catch (e) { console.warn('[oriel] header', e); }
    try { this._updateHome(); } catch (e) { console.warn('[oriel] home', e); }
    Object.keys(this._pages).forEach((k) => { const d = this._pages[k].def; if (d.always) { try { d.always.call(this); } catch (e) { console.warn('[oriel] ' + k, e); } } });
    const p = this._pages[this._page];
    if (p && p.def.update) { try { p.def.update.call(this); } catch (e) { console.warn('[oriel] ' + this._page + ' update', e); } }
  }
  _updateHeader() {
    const g = this._c.general, $ = this.$;
    const w = this.st(g.weather);
    if (w) {
      const tt = w.attributes.temperature;
      const ic = /rain|pour|lightning|snow/.test(w.state) ? 'rain' : /sunny|clear/.test(w.state) ? 'sun' : 'cloud';
      this._wx.innerHTML = `${icon(ic)}<span></span>`;
      this._wx.lastChild.textContent = (g.weather_label || S.outside) + ' ' + (tt != null ? Math.round(tt) + '°' : '');
    } else if (isEnt(g.weather)) { this._wx.innerHTML = `${icon('cloud')}<span></span>`; this._wx.lastChild.textContent = (g.weather_label || S.outside) + ' –'; }
    this._pp.forEach(({ id, el: chip }) => {
      const p = this.st(id);
      const name = ((p && p.attributes.friendly_name) || '').split(' ')[0] || '?';
      const state = !p || bad(p.state) ? S.dash : p.state === 'home' ? S.person_home : p.state === 'not_home' ? S.person_away : cap(p.state);
      chip.innerHTML = `<span class="pf ${p && p.state === 'home' ? '' : 'away'}"></span><span></span>`;
      chip.firstChild.textContent = name.charAt(0).toUpperCase();
      chip.lastChild.textContent = g.people_display === 'name' ? `${name} · ${state}` : state;
      chip.setAttribute('aria-label', `${name} · ${state}`);
    });
    const al = this.st(g.alarm), dr = this.st(g.front_door);
    $('bAlarm').classList.toggle('alert', !!al && al.state === 'triggered');
    $('bDoor').classList.toggle('alert', !!dr && dr.state === 'on');
    $('bWin').classList.toggle('alert', (g.windows || []).some((id) => isEnt(id) && this.sv(id) === 'on'));
  }
  _updateHome() {
    const H = this._c.home, R = H.room_panel, E = H.energy_card, $ = this.$;
    const sol = this.num(E.solar_power), pw = this.num(E.house_power), bat = this.num(E.battery_soc);
    $('vSolar').textContent = sol != null ? (sol / 1000).toFixed(2) : '–';
    $('vHome').textContent = pw != null ? (pw / 1000).toFixed(2) : '–';
    $('vBat').textContent = bat != null ? Math.round(bat) : '–';
    $('batBar').style.width = (bat != null ? clamp(bat, 0, 100) : 0) + '%';
    const price = this.num(H.price); $('price').textContent = price != null ? t('per_kwh', { price: this.money(price) }) : '–';
    this._cells.forEach(({ d, b, lab }) => {
      const f = this.fmt(d.entity); b.innerHTML = `${esc(f.n)}${f.u ? `<em>${esc(f.u)}</em>` : ''}`;
      if (!d.label) lab.textContent = this.name(d.entity);
    });
    this._qa.forEach((q) => {
      if (q.a.type === 'shopping') {
        q.b.textContent = q.a.label || S.shopping;
        const n = this.sv(H.shopping);
        if (this._shopOpen && n !== this._shopN) this._loadShop(); this._shopN = n;
        q.s.textContent = n !== undefined && !bad(n) ? t(n === '1' ? 'items_one' : 'items_many', { n }) : '–';
      } else {
        q.b.textContent = q.a.label || this.name(q.a.entity);
        const v = this.sv(q.a.entity);
        q.s.textContent = q.a.subtitle != null && q.a.subtitle !== '' ? q.a.subtitle : q.dom === 'script' ? '' : v && !bad(v) ? tidy(v) : '–';
      }
    });
    const m = this.sv(R.motion); $('motT').textContent = m === 'on' ? S.motion : S.clear; $('mot').classList.toggle('on', m === 'on');
    this._lightEls.forEach(({ l, b }) => b.classList.toggle('on', this.sv(l.entity) === 'on'));
    this._renderHeat(); this._renderBoost();
    this._apps.forEach(({ a, d, st }) => { const r = this._appState(a); d.classList.toggle('run', !!r.run); d.classList.toggle('warn', !!r.warn); st.textContent = r.text; });
    const F = R.fridge, fo = this.sv(F.door) === 'on', ft = this.fmt(F.fridge_temp), fz = this.fmt(F.freezer_temp);
    $('fridge').classList.toggle('alert', fo);
    $('fridgeT').textContent = fo ? S.door_open : (ft.n !== '–' ? t('fridge_temps', { f: ft.n, z: fz.n }) : '–');
    if (this._updateHouse) { try { this._updateHouse(); } catch (e) { console.warn('[oriel] house', e); } }
    this._syncCams();
    if (!this._etick && isEnt(E.house_power)) { this._loadEnergy(); this._etick = setInterval(() => this._loadEnergy(), 300000); }
    this._clock();
  }
}

export function registerPage(def) {
  PAGES.push(def);
  if (def.methods) Object.getOwnPropertyNames(def.methods).forEach((n) => { if (n !== 'constructor') OrielShell.prototype[n] = def.methods[n]; });
}
export function addMethods(methods) {
  Object.keys(methods).forEach((n) => { OrielShell.prototype[n] = methods[n]; });
}
export { VERSION };
