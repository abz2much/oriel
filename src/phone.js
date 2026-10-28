/* Phone layout (portrait). The same card, pages, themes and config; only the layout changes.
   It turns on when the card is narrower than 700 px (the card's own width, so the editor preview is unaffected),
   or with general.layout: phone. Every rule here sits under `#wrap.phone`, so the tablet layout is not touched.
   In phone mode there is no 1280 x 800 canvas: pages reflow to the real width and scroll, a floating tab bar replaces
   the side rail (the first four pages, then "More" with the rest), and the header chips scroll sideways. */
import { addMethods } from './core.js';
import { S } from './strings.js';
import { icon } from './util.js';

export const PHONE_MAX = 700;
const HOUSE_VB = '-320 -300 800 840', PHONE_VB = [-225, -125, 640, 585]; /* the whole house and its power tags fit this box; labels are sized apart from the drawing */
const LABEL_PX = 12.4; /* the smallest label text on the phone, in screen pixels */
/* Pop-ups that live inside a page on the tablet; the phone moves them to the screen level so they are sheets over the whole screen. */
const OVERLAYS = ['lrPanel', 'vcConf', 'vcMenu', 'vcToast', 'nvConf', 'nvToast', 'syToast'];
/* Every pop-up on the phone: its element, the part that moves with a swipe down, where a swipe may start, and how to close it. */
const SHEETS = [
  { id: 'more', panel: '.pn', close: (s) => s._phoneMore(false), own: true },
  { id: 'shop', panel: '.pn', handle: '.hd', close: (s) => s._closeShop() },
  { id: 'bell', panel: '.cam', handle: '.cap', close: (s) => s.$('bellX').click() },
  { id: 'vcConf', panel: '.pn', handle: '.pn', close: (s) => s._vcClose() },
  { id: 'vcMenu', panel: null, handle: null, close: (s) => s._vcMenuClose() },
  { id: 'nvConf', panel: '.pn', handle: '.pn', close: (s) => s._nvConfirmClose() },
  { id: 'lrPanel', panel: null, handle: '.ph', close: (s) => s._lvPanel(false), outside: true },
];

const PHONE_CSS = `
#hdr{display:contents}
#tabs,#more{display:none}
#wrap.phone{--hh:calc(env(safe-area-inset-top,0px) + 62px);--tb:calc(env(safe-area-inset-bottom,0px) + 88px)}
#wrap.phone #screen{height:100%}
#wrap.phone #rail{display:none}
#wrap.phone #hdr{display:flex;position:absolute;left:0;right:0;top:0;z-index:20;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top,0px) + 10px) calc(env(safe-area-inset-right,0px) + 12px) 8px calc(env(safe-area-inset-left,0px) + 12px)}
#wrap.phone #hchips{position:static;flex:1;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;padding:7px 6px 3px 2px;margin:-7px 0 -3px -2px;-webkit-overflow-scrolling:touch}
#wrap.phone #hchips{gap:6px} #wrap.phone #hchips .chip{padding:0 10px 0 8px;gap:6px} #wrap.phone #hchips #clk{padding:0 10px} #wrap.phone #hchips .chip.wx{padding-left:10px} /* tighter, so the weather and clock chips fit whole at 360 */
#wrap.phone #hchips #nvPill{position:static;visibility:visible!important;left:auto;top:auto}
#wrap.phone #hchips::-webkit-scrollbar{display:none}
#wrap.phone #hchips>*{flex:none}
#wrap.phone #hdr-r{position:static;flex:none;gap:6px}
#wrap.phone #pages{display:block;position:absolute;left:0;right:0;top:var(--hh);bottom:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:none;padding:6px calc(env(safe-area-inset-right,0px) + 14px) calc(var(--tb) + 12px) calc(env(safe-area-inset-left,0px) + 14px)}
#wrap.phone #pages::-webkit-scrollbar{display:none}
#wrap.phone .page:not(.off){position:relative;inset:auto;display:flex;flex-direction:column;gap:12px;pointer-events:auto}
/* floating tab bar */
#wrap.phone #tabs{display:flex;position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px);right:calc(env(safe-area-inset-right,0px) + 12px);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);height:64px;z-index:40;border-radius:32px;padding:6px;gap:2px;align-items:stretch;background:linear-gradient(150deg,rgba(var(--oriel-sheet-a),.96),rgba(var(--oriel-sheet-b),.96))}
#wrap.phone #tabs a{position:relative;flex:1 1 0;min-width:0;border-radius:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px 2px;color:rgba(var(--oriel-ink),var(--oriel-nav-soft,.66));cursor:pointer}
#wrap.phone #tabs a .ic{width:22px;height:22px}
#wrap.phone #tabs a .lb{font-size:12px;line-height:1.1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#wrap.phone #tabs a.on{color:rgb(var(--oriel-ink));font-weight:500}
#wrap.phone #tabs:not(.nv) a.on{background:rgb(var(--oriel-raised));box-shadow:0 8px 16px rgba(var(--oriel-shadow),.25)} /* until the bubble exists */
/* the glass bar and its bubble (0.6.0). Without backdrop-filter the bar stays the solid gradient above. The bubble slides behind the links and never takes a tap. */
@supports (backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px)){
#wrap.phone #tabs{background:rgba(var(--oriel-nav-fill),var(--oriel-nav-a));backdrop-filter:blur(26px) saturate(1.35);-webkit-backdrop-filter:blur(26px) saturate(1.35);border:1px solid rgba(var(--oriel-nav-line),.55);box-shadow:0 18px 36px rgba(var(--oriel-nav-shadow),.25),inset 0 1px 0 rgba(var(--oriel-nav-line),.6)}
}
#wrap.phone #tabs .navI{border-radius:26px;background:linear-gradient(160deg,rgba(var(--oriel-bubble),.88),rgba(var(--oriel-bubble),.46) 55%,rgba(var(--oriel-accent),var(--oriel-nav-tint,.6)));border:1.5px solid rgba(var(--oriel-accent-ink),.9);box-shadow:0 10px 22px rgba(var(--oriel-nav-shadow),.22),inset 0 1px 0 rgba(var(--oriel-bubble),.95)} /* the outline is the theme's accent text colour, so the bubble reads as a shape on any card (3:1 and more) */
#wrap.phone #tabs .navI.go{transition:transform .38s cubic-bezier(.3,1.3,.45,1),width .38s ease,height .38s ease,opacity .2s ease}
/* the More sheet: floats above the tab bar, closes by its button, a tap outside, or a swipe down */
#wrap.phone #more{position:absolute;inset:0;z-index:35;background:rgba(var(--oriel-scrim),.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:flex-end;padding:0 calc(env(safe-area-inset-right,0px) + 12px) calc(var(--tb) - 8px) calc(env(safe-area-inset-left,0px) + 12px)}
#wrap.phone #more.show{display:flex}
#more .pn{width:100%;border-radius:28px;padding:14px 16px 16px;touch-action:none;background:linear-gradient(150deg,rgba(var(--oriel-sheet-a),.97),rgba(var(--oriel-sheet-b),.97));box-shadow:0 30px 70px rgba(var(--oriel-shadow-deep),.4);color:rgb(var(--oriel-ink))}
#more .mh{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
#more .mh b{display:block;font-size:20px;font-weight:400} #more .mh span{display:block;font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}
#more .mg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
#more .mt{min-height:64px;border-radius:18px;border:1px solid rgba(var(--oriel-glass),.7);background:rgba(var(--oriel-glass),.55);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:13px;color:rgb(var(--oriel-ink));cursor:pointer;padding:6px 4px;min-width:0}
#more .mt .ic{width:22px;height:22px} #more .mt span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#more .mt.on{background:rgb(var(--oriel-raised));box-shadow:0 0 0 2px rgb(var(--oriel-ink))}
/* Home */
#wrap.phone #pgHome>*{position:relative;left:auto;right:auto;top:auto;bottom:auto;width:auto;height:auto;margin:0;z-index:auto}
#wrap.phone #greet{order:1;padding:2px 6px 0} #wrap.phone #greet h1{font-size:36px}
#wrap.phone #energy{order:2;padding:16px 18px;border-radius:28px}
#wrap.phone #energy .now b{font-size:28px}
#wrap.phone #energy .big{font-size:14px;font-weight:300;margin-top:12px;line-height:1.3} #wrap.phone #energy .big small{font-size:14px;margin-left:4px}
#wrap.phone #energy #echart,#wrap.phone #energy .ax{display:none}
#wrap.phone #stage{order:3;height:auto;aspect-ratio:640/585;border-radius:28px;overflow:hidden;background:linear-gradient(140deg,rgba(var(--oriel-glass),.3),rgba(var(--oriel-glass),.08));border:1px solid rgba(var(--oriel-glass),.5);flex:none}
#wrap.phone #cu{order:4;padding-bottom:6px}
#wrap.phone #room{order:5;max-height:none;display:flex}
#wrap.phone #today{order:6;padding:14px 14px 14px}
#wrap.phone #qa{order:7;display:grid;grid-template-columns:1fr 1fr!important;gap:10px;padding:14px;margin-top:0}
#wrap.phone #qa.hide{display:none}
#wrap.phone #qa .hd{position:static;grid-column:1/-1;color:rgb(var(--oriel-on-dark));padding:0 2px}
#wrap.phone #qa .qa{min-height:84px}
/* page headings and the shared card pages (Climate, Family) */
.ptitle{display:none}
#wrap.phone .ptitle{display:block;margin:2px 6px 0;font-size:30px;font-weight:300;letter-spacing:-.01em;line-height:1.15;color:rgb(var(--oriel-ink))}
#wrap.phone .pgc{position:static;left:auto;width:auto;height:auto;pointer-events:auto}
#wrap.phone .pgc .cols{position:static;width:auto;height:auto;display:flex;flex-direction:column;gap:12px}
#wrap.phone .pgc .col{display:contents}
#wrap.phone .pgc .card{padding:16px 18px;overflow:visible;flex:none;border-radius:26px}
#wrap.phone .pgc .fit{overflow:visible;flex:none}
/* Climate */
#wrap.phone #clWx{padding:16px 18px} #wrap.phone #clWx .hd h3{display:none} #wrap.phone #clWx .hd{justify-content:flex-end}
#wrap.phone #clWx .cur{margin:4px 0 4px} #wrap.phone #clWx .big{font-size:52px}
#wrap.phone #clDays{margin-top:16px;gap:6px} #wrap.phone #clDays .d{padding:8px 2px} #wrap.phone #clDays .d .h{font-size:18px}
#wrap.phone #clWx .cap{margin:18px 0 6px} #wrap.phone #clHours{height:120px;gap:4px;padding:10px}
#wrap.phone #clTh,#wrap.phone #clHist{padding:16px 18px}
#wrap.phone #clTh .tv{width:78px;font-size:30px} #wrap.phone #clTh .ctl{gap:6px}
#wrap.phone #clRooms .rr .nm{width:96px} #wrap.phone #clRooms .rr .bar{margin:0 10px}
/* Family */
#wrap.phone #fmCal .ch,#wrap.phone #fmCal .cs .none{display:none}
#wrap.phone #fmBinRows{gap:8px} #wrap.phone #fmBinRows .bn{min-width:0;flex:1 1 0;padding:10px 8px} #wrap.phone #fmBinRows .bn .dy{font-size:17px;overflow-wrap:normal;white-space:nowrap}
/* Living room */
#lrOpenChip2{display:none}
#wrap.phone #lrScroll{position:static;display:flex;flex-direction:column;flex-wrap:nowrap;align-items:stretch;gap:12px;padding:0;overflow:visible;justify-content:flex-start}
#wrap.phone #lrScroll .lrc{display:contents}
#wrap.phone #lrScroll .lrc>.abs{width:auto;height:auto;margin:0}
#wrap.phone #lrHero{order:1;display:flex;flex-direction:row;gap:8px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;background:none;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;border-radius:0;padding:0;min-height:0}
#wrap.phone #lrHero::-webkit-scrollbar{display:none}
#wrap.phone #lrHero .img,#wrap.phone #lrHero #lrRm,#wrap.phone #lrHero #lrTitle{display:none}
#wrap.phone #lrHero .t,#wrap.phone #lrHero .b{position:static;display:contents}
#wrap.phone #lrHero .chip{flex:none;height:40px;padding:0 14px;font-size:14px;background:rgba(var(--oriel-glass),.35);color:rgb(var(--oriel-ink));cursor:pointer}
#wrap.phone #lrHero .chip.on{background:rgb(var(--oriel-accent-fill));color:rgb(var(--oriel-ink-on-accent))}
#wrap.phone #lrPres{order:1} #wrap.phone #lrT{order:2} #wrap.phone #lrH{order:3} #wrap.phone #lrL{order:4}
#wrap.phone #lrOpenChip2{order:5;display:inline-flex;flex:none;height:40px;padding:0 14px;font-size:14px;align-items:center}
#wrap.phone #lrOpenChip2.hide{display:none}
#wrap.phone #lrScenes{order:2} #wrap.phone #lrLights{order:3} #wrap.phone #lrNow{order:4} #wrap.phone #lrDv{order:5} #wrap.phone #lrApps{order:6}
#wrap.phone #lrRemote{order:7} #wrap.phone #lrOpen{order:8} #wrap.phone #lrBlinds{order:9} #wrap.phone #lrSound{order:10}
#wrap.phone #lrSg{grid-template-columns:repeat(3,1fr)!important} #wrap.phone .sc{height:76px}
#wrap.phone #lrPw{flex-wrap:wrap} #wrap.phone #lrPw button{flex:1 1 calc(50% - 3px)}
#wrap.phone .swr{flex-wrap:wrap;justify-content:flex-start;gap:6px 8px}
#wrap.phone #lrAg{grid-template-columns:repeat(3,1fr)}
#wrap.phone #lrNow .hdmi{flex-wrap:wrap} #wrap.phone #lrNow .hdmi>span:first-child{display:none} #wrap.phone #lrNow .hdmi button{flex:1 1 22%;min-width:64px}
#wrap.phone #lrRemote{grid-template-columns:1fr;justify-items:center} #wrap.phone #lrRbtn{width:100%}
/* Energy, Security, Vacuum, Nova, System: the fixed 1280 x 800 blocks become one column of full-width cards */
#wrap.phone :is(#enWrap,#scWrap,#vcWrap,#nvWrap,#syWrap){position:static;left:auto;width:auto;height:auto;pointer-events:auto;display:flex;flex-direction:column;gap:12px}
#wrap.phone :is(#enWrap,#scWrap,#vcWrap,#syWrap)>.abs,#wrap.phone #nvWrap>:is(#nvChat,#nvQuiet,#nvLock,#nvBrief,#nvRem,#nvSug){position:relative;left:auto;top:auto;right:auto;bottom:auto;width:auto;height:auto;margin:0;z-index:auto}
/* Energy */
#wrap.phone #enFlow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:14px;overflow:visible;align-items:stretch}
#wrap.phone #enFlow .hd{position:static;grid-column:1/-1}
#wrap.phone #enFlow #enSvg{display:none}
#wrap.phone #enFlow .fp{position:static;transform:none;left:auto!important;top:auto!important;grid-row:3;justify-self:center}
#wrap.phone #enPSB,#wrap.phone #enPBH{grid-column:1} #wrap.phone #enPSH{grid-column:2} #wrap.phone #enPSG,#wrap.phone #enPGH{grid-column:3}
#wrap.phone #enFlow .nd{position:static;width:auto;height:auto;min-height:92px;left:auto;top:auto}
#wrap.phone #enFlow #enSol{grid-column:1/-1;grid-row:2;justify-self:center;width:220px;max-width:100%}
#wrap.phone #enBat{grid-column:1;grid-row:4} #wrap.phone #enHouse{grid-column:2;grid-row:4} #wrap.phone #enGrid{grid-column:3;grid-row:4}
#wrap.phone #enFlow .nd .v{font-size:24px;white-space:normal;line-height:1.15}
#wrap.phone #enFlow #enNote{position:static;grid-column:1/-1;grid-row:5;left:auto;right:auto;bottom:auto;padding:0}
#wrap.phone #enBatC{padding:14px 16px;overflow:visible} #wrap.phone #enBatC .pk{flex:none;min-height:46px;max-height:none}
#wrap.phone #enToday{padding:14px 16px}
#wrap.phone #enChart,#wrap.phone #enFc,#wrap.phone #enCons{padding:14px 16px}
#wrap.phone #enCh,#wrap.phone #enFcS{width:100%;height:auto;max-width:none}
#wrap.phone #pgEnergy .z,#wrap.phone #enTg .tl b.z{color:rgba(var(--oriel-ink),var(--oriel-soft,.62))} #wrap.phone :is(#enHpW,#enCTot).z{color:rgba(var(--oriel-on-dark),.6)} /* zero amounts: the soft colour of their unit */
/* invisible tap areas that reached into the next control: Home's heating rows meet halfway (their rows are 42 px apart);
   the Security header chips and Nova's status chip keep their 46 px area, moved up clear of the row below */
#wrap.phone #heat :is(.l,.round.sm)::after{top:-4px;bottom:-4px} #wrap.phone #heat .boost::after{top:-2px}
#wrap.phone :is(#scOpenChip,#scTamper)::after{top:calc(min(0px,calc(50% - 23px)) - 5px);bottom:calc(min(0px,calc(50% - 23px)) + 5px)}
#wrap.phone #nvQs::after{top:calc(min(0px,calc(50% - 23px)) - 3px);bottom:calc(min(0px,calc(50% - 23px)) + 3px)}
#wrap.phone #enFc .ch{flex-wrap:wrap}
#wrap.phone #enCons .hp{height:auto;min-height:96px;gap:6px}
#wrap.phone #enHealth{height:auto;flex-wrap:wrap;padding:10px 12px;border-radius:24px;gap:8px} #wrap.phone #enHealth .sp{display:none}
/* Security */
#wrap.phone #scHero{height:auto;padding:16px 18px;overflow:hidden} #wrap.phone #scState{font-size:50px;margin-top:12px}
#wrap.phone #scSub{max-height:none;min-height:0;height:auto} #wrap.phone #scPanels{position:static;margin-top:12px;left:auto;right:auto;bottom:auto}
#wrap.phone #scDoors,#wrap.phone #scMotion,#wrap.phone #scHealth{padding:16px 18px} #wrap.phone #scAreas,#wrap.phone #scMoBody{flex:none}
#wrap.phone .scAr{grid-template-columns:96px 1fr;min-height:48px;flex:none;max-height:none;padding:4px 0}
#wrap.phone .scAr .scS{flex-wrap:wrap;justify-content:flex-end}
#wrap.phone .scMr{min-height:44px;flex:none;max-height:none}
#wrap.phone #scCams{height:auto;padding:14px 16px} #wrap.phone #scCamRow{grid-template-columns:1fr!important}
#wrap.phone .scCam{height:auto;aspect-ratio:16/9}
#wrap.phone #scEv{height:auto;padding:14px 18px;overflow:visible} #wrap.phone .scEvr{height:auto;min-height:44px}
#wrap.phone #scHg{grid-template-columns:1fr;grid-auto-rows:auto;flex:none} #wrap.phone .scHb{min-height:44px} #wrap.phone .scHb[style*="visibility: hidden"]{display:none} /* unused slots of the tablet's fixed grid */
#wrap.phone #scCams .scHd{flex-wrap:wrap;row-gap:2px} #wrap.phone #scCams .scHd small{white-space:normal;flex-basis:100%}
/* Vacuum */
#wrap.phone #vcWrap>.abs{top:auto!important;left:auto!important;width:auto!important;height:auto!important} /* the page positions its cards with inline styles on the tablet */
#wrap.phone #vcHero{order:1;height:auto;padding:16px 18px;overflow:hidden} #wrap.phone .vcF1{order:2;height:auto;padding:14px 16px} #wrap.phone #vcSet{order:3;height:auto} #wrap.phone #vcSch{order:4;height:auto;overflow:visible}
#wrap.phone #vcMapP{order:5;height:auto;padding:12px} #wrap.phone #vcMaint{order:6;height:auto} #wrap.phone #vcSta{order:7;height:auto}
#wrap.phone #vcSub{height:auto;min-height:36px} #wrap.phone #vcLast{margin:0;padding:0;min-height:44px;display:flex;align-items:center}
#wrap.phone #vcChips{position:static;margin-top:10px;left:auto;right:auto;bottom:auto}
#wrap.phone #vcCtl{position:static;margin-top:12px;left:auto;right:auto;bottom:auto}
#wrap.phone #vcSg{grid-template-columns:1fr} #wrap.phone .vcT{height:auto;min-height:56px}
#wrap.phone #vcMap{width:100%;height:auto} #wrap.phone #vcMap .rm text{font-size:12.6px}
#wrap.phone #vcMapMsg{position:static;margin:12px 0 0;left:auto;right:auto;top:auto}
#wrap.phone #vcRooms{position:static;margin-top:10px;left:auto;right:auto;bottom:auto}
#wrap.phone .vcF1 .row{flex-wrap:wrap} #wrap.phone .vcF1 .f1c{width:100%} #wrap.phone .vcF1 .f1c .vcB{flex:1} #wrap.phone .vcF1 .kv{grid-template-columns:1fr} #wrap.phone .vcF1 .kv .vcT[style*="visibility: hidden"]{display:none} /* unused slots of the tablet's three-column row */
#wrap.phone #vcWg{grid-template-columns:repeat(2,1fr)} #wrap.phone .vcW{height:auto;min-height:48px}
/* Nova */
#wrap.phone #nvWrap>#nvChat{order:1;height:460px;height:min(460px,60dvh)} #wrap.phone #nvQuiet{order:2;height:auto} #wrap.phone #nvLock{order:3;height:auto;padding-bottom:16px}
#wrap.phone #nvBrief{order:4;height:auto} #wrap.phone #nvRem{order:5;height:auto} #wrap.phone #nvSug{order:6;height:auto}
#wrap.phone #nvBt,#wrap.phone #nvRl,#wrap.phone #nvSl{flex:none;overflow:visible}
#wrap.phone #nvRf{grid-template-columns:1fr auto} #wrap.phone #nvRf .round{width:44px;height:44px}
#wrap.phone #nvNo{position:relative;left:auto;top:auto;width:auto;height:auto;min-height:420px;padding:32px 24px}
#wrap.phone #nvOff{position:relative;left:auto;top:auto;width:auto;height:auto;min-height:120px}
/* Pop-ups: every one is a sheet from the bottom edge (safe-area aware, above the tab bar), the page behind does not scroll */
#lrPx{display:none}
#wrap.phone.sheet #pages{overflow:hidden}
#wrap.phone #shop,#wrap.phone #bell,#wrap.phone #vcConf,#wrap.phone #nvConf{position:absolute;left:0;top:0;right:0;bottom:var(--kb,0px);width:auto;height:auto;z-index:50;align-items:flex-end;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 12px) calc(env(safe-area-inset-right,0px) + 12px) calc(env(safe-area-inset-bottom,0px) + 12px) calc(env(safe-area-inset-left,0px) + 12px)}
#wrap.phone #shop .pn,#wrap.phone #vcConf .pn,#wrap.phone #nvConf .pn{width:100%;height:auto;max-height:100%;overflow-y:auto;border-radius:28px;padding:20px 20px 20px}
#wrap.phone #shop .pn{display:flex;overflow:hidden} #wrap.phone #shop .hd,#wrap.phone #shop form,#wrap.phone #shop .clr{flex:none} #wrap.phone #shop ul{flex:1 1 0;min-height:64px;overflow-y:auto;-webkit-overflow-scrolling:touch} /* the list gives way when the keyboard is up; the buttons keep their size */ #wrap.phone #shop .hd,#wrap.phone #bell .cap,#wrap.phone #vcConf .pn,#wrap.phone #nvConf .pn,#wrap.phone .ph{touch-action:none}
#wrap.phone #shop li{min-height:48px} #wrap.phone #shop .clr{height:48px;min-height:48px} #wrap.phone #shop input{height:48px}
#wrap.phone #bell .cam{width:100%;border-radius:28px;max-height:100%;overflow-y:auto;padding-top:16px} #wrap.phone #bell .feed{height:auto;aspect-ratio:16/9;max-height:56vh;margin:0 16px;border-radius:20px;overflow:hidden} #wrap.phone #bell .feed.msg{display:flex;align-items:center;justify-content:center;text-align:center;padding:18px 20px;font-size:14px} /* inset like the other sheets, so a name drawn at the corner is not cut by the rounded edge */ #wrap.phone #bell .cap{padding:12px 18px;gap:10px} #wrap.phone #bell .cap button{height:44px}
/* confirm steps: Cancel, then a large Confirm button set well apart from it */
#wrap.phone #vcConf .btns,#wrap.phone #nvConf .r{display:flex;flex-direction:column;gap:0;margin-top:18px}
#wrap.phone #vcConf .btns button,#wrap.phone #nvConf .nvB{height:52px;flex:none;font-size:16px}
#wrap.phone #vcConf .btns button.go,#wrap.phone #nvConf .nvB.go{height:64px;margin-top:28px;font-size:17px;border-radius:32px}
#wrap.phone #nvConf .pn{gap:6px} #wrap.phone #nvConf b{font-size:22px}
#wrap.phone #vcMenu{position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px)!important;right:calc(env(safe-area-inset-right,0px) + 12px);top:auto!important;bottom:calc(var(--kb,0px) + env(safe-area-inset-bottom,0px) + 12px);width:auto;min-width:0;z-index:50;padding:10px;border-radius:28px;max-height:70%;overflow-y:auto;box-shadow:0 0 0 200vmax rgba(var(--oriel-scrim),.5)}
#wrap.phone #vcMenu button{height:52px;font-size:16px} #wrap.phone #vcMenu .stp button{height:52px;width:64px} #wrap.phone #vcMenu .mx{margin-top:8px;text-align:center;background:rgba(var(--oriel-ink),.1);border-radius:26px}
#wrap.phone #screen>#lrPanel{display:none;position:absolute;left:calc(env(safe-area-inset-left,0px) + 12px);right:calc(env(safe-area-inset-right,0px) + 12px);bottom:calc(var(--kb,0px) + env(safe-area-inset-bottom,0px) + 12px);margin:0;z-index:50;max-height:calc(100% - 90px);overflow-y:auto;border-radius:28px;padding:14px 16px 16px;gap:12px;background:linear-gradient(150deg,rgba(var(--oriel-sheet-a),.98),rgba(var(--oriel-sheet-b),.98));box-shadow:0 0 0 200vmax rgba(var(--oriel-scrim),.5)}
#wrap.phone #screen>#lrPanel.show{display:flex} #wrap.phone #lrPx{display:grid;margin-left:8px;flex:none} #wrap.phone #screen>#lrPanel .ph{gap:6px}
#wrap.phone #screen>#lrPanel .pr button{height:48px}
#wrap.phone #vcToast,#wrap.phone #nvToast,#wrap.phone #syToast{position:absolute;left:50%;top:auto;bottom:calc(var(--tb) + 10px);transform:translateX(-50%);z-index:60;max-width:calc(100% - 24px)}
/* System */
#wrap.phone #syHA{order:1} #wrap.phone #syAtt{order:2} #wrap.phone #syNova{order:3} #wrap.phone #syHost{order:4} #wrap.phone #syConn{order:5} #wrap.phone #syTab{order:6} #wrap.phone #syDbg{order:7}
#wrap.phone #syWrap>.abs{top:auto!important;left:auto!important;width:auto!important;height:auto!important} /* the page packs its columns with inline styles on the tablet */
#wrap.phone #pgSystem .card{overflow:visible} #wrap.phone #pgSystem .row{min-height:44px} #wrap.phone #pgSystem .big{min-height:44px}
#wrap.phone #syDbg{display:flex} #wrap.phone #syDbgL{flex:none;overflow:visible}
`;

addMethods({
  /* auto: phone layout when the card is narrower than 700 px; general.layout can force either */
  _isPhone(w) { const l = this._c.general.layout; return l === 'phone' ? true : l === 'tablet' ? false : w < PHONE_MAX; },

  _phoneInit() {
    this.addCss('phone', PHONE_CSS);
    this._sheetsInit();
    const $ = this.$, close = () => this._phoneMore(false), pn = $('more').querySelector('.pn');
    $('moreX').addEventListener('click', close);
    $('more').addEventListener('click', (e) => { if (e.target === $('more')) close(); });
    let y0 = null; /* swipe down to close */
    pn.addEventListener('pointerdown', (e) => { y0 = e.clientY; try { pn.setPointerCapture(e.pointerId); } catch (x) { /* not capturable */ } });
    pn.addEventListener('pointermove', (e) => { if (y0 != null && e.clientY - y0 > 6) pn.style.transform = `translateY(${e.clientY - y0}px)`; });
    pn.addEventListener('pointerup', (e) => { if (y0 == null) return; const dy = e.clientY - y0; y0 = null; pn.style.transform = ''; if (dy > 70) close(); });
    pn.addEventListener('pointercancel', () => { y0 = null; pn.style.transform = ''; });
  },
  /* ---------- pop-ups as sheets ---------- */
  /* move the page-level pop-ups to the screen (phone) or back into their page (tablet) */
  _phoneOverlays() {
    const screen = this.$('screen'); if (!screen) return;
    OVERLAYS.forEach((id) => {
      const el = this.shadowRoot.getElementById(id); if (!el) return;
      if (el.__home && !el.__home.isConnected) { el.remove(); return; } /* its page is gone */
      if (this._phone) { if (!el.__home) { el.__home = el.parentNode; el.__next = el.nextSibling; } if (el.parentNode !== screen) screen.appendChild(el); }
      else if (el.__home && el.parentNode !== el.__home) el.__home.insertBefore(el, el.__next && el.__next.parentNode === el.__home ? el.__next : null);
    });
  },
  _sheetIsOpen(s) { const el = this.shadowRoot.getElementById(s.id); return !!el && this._phone && el.classList.contains('show'); },
  _sheetsInit() {
    this._sheetStack = []; this._sheetDepth = 0; this._swallow = 0; this._byPop = false;
    const root = this.shadowRoot;
    this._sheetObs = new MutationObserver(() => this._sheetsChanged());
    this._sheetObs.observe(root, { attributes: true, subtree: true, attributeFilter: ['class'] });
    this._onPop = () => { /* the back gesture or button: close the top sheet instead of leaving the page */
      if (this._swallow > 0) { this._swallow--; return; }
      if (this._sheetDepth > 0 && this._sheetStack.length) { this._sheetDepth--; this._byPop = true; const top = SHEETS.find((s) => s.id === this._sheetStack[this._sheetStack.length - 1]); if (top) top.close(this); }
    };
    window.addEventListener('popstate', this._onPop);
    this._onKey = (e) => { if (e.key === 'Escape' && this._sheetStack.length) { const top = SHEETS.find((s) => s.id === this._sheetStack[this._sheetStack.length - 1]); if (top) top.close(this); } };
    root.addEventListener('keydown', this._onKey);
    this._onOut = (e) => { /* a tap outside a sheet that has no scrim of its own */
      const p = e.composedPath ? e.composedPath() : [];
      SHEETS.filter((s) => s.outside && this._sheetIsOpen(s)).forEach((s) => { const el = root.getElementById(s.id); if (!p.includes(el)) s.close(this); });
    };
    root.addEventListener('pointerdown', this._onOut, true);
    const vv = window.visualViewport; /* the on-screen keyboard: sheets stay above it */
    if (vv) { this._onVV = () => { const w = this.$('wrap'); if (w) w.style.setProperty('--kb', Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) + 'px'); }; vv.addEventListener('resize', this._onVV); vv.addEventListener('scroll', this._onVV); this._onVV(); }
  },
  _sheetsStop() {
    if (this._sheetObs) this._sheetObs.disconnect();
    if (this._onPop) window.removeEventListener('popstate', this._onPop);
    if (this.shadowRoot) { if (this._onKey) this.shadowRoot.removeEventListener('keydown', this._onKey); if (this._onOut) this.shadowRoot.removeEventListener('pointerdown', this._onOut, true); }
    const vv = window.visualViewport; if (vv && this._onVV) { vv.removeEventListener('resize', this._onVV); vv.removeEventListener('scroll', this._onVV); }
    this._sheetObs = this._onPop = this._onVV = null;
  },
  _sheetsChanged() {
    const now = SHEETS.filter((s) => this._sheetIsOpen(s)).map((s) => s.id), prev = this._sheetStack || [];
    const added = now.filter((id) => !prev.includes(id)), removed = prev.filter((id) => !now.includes(id));
    if (!added.length && !removed.length) return;
    this._sheetStack = prev.filter((id) => now.includes(id)).concat(added);
    this.$('wrap').classList.toggle('sheet', now.length > 0); /* the page behind does not scroll */
    added.forEach((id) => { const s = SHEETS.find((x) => x.id === id); this._sheetSwipe(s); try { history.pushState({ oriel: 'sheet' }, ''); this._sheetDepth++; } catch (e) { /* no history here */ } });
    if (removed.length) {
      let k = removed.length; if (this._byPop) { this._byPop = false; k--; }
      k = Math.min(k, this._sheetDepth);
      if (k > 0) { this._sheetDepth -= k; this._swallow++; try { history.go(-k); } catch (e) { this._swallow--; } }
    }
  },
  /* swipe down on a sheet's handle to close it */
  _sheetSwipe(s) {
    const el = this.shadowRoot.getElementById(s.id); if (!el || el.__sw || s.own) return; el.__sw = 1;
    const panel = s.panel ? el.querySelector(s.panel) : el, handle = s.handle ? (s.handle === s.panel ? panel : el.querySelector(s.handle)) : null; if (!panel || !handle) return;
    let y0 = null;
    handle.addEventListener('pointerdown', (e) => { y0 = e.clientY; try { handle.setPointerCapture(e.pointerId); } catch (x) { /* not capturable */ } });
    handle.addEventListener('pointermove', (e) => { if (y0 != null && e.clientY - y0 > 6) panel.style.transform = `translateY(${e.clientY - y0}px)`; });
    const end = (e) => { if (y0 == null) return; const dy = e.clientY - y0; y0 = null; panel.style.transform = ''; if (dy > 70) s.close(this); };
    handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', () => { y0 = null; panel.style.transform = ''; });
  },

  /* the sideways chip rows: a chip is either whole inside the row or hidden, never cut off (the row still scrolls with a swipe) */
  _phoneChips() {
    if (!this._phone) return;
    ['hchips', 'lrHero'].forEach((id) => {
      const row = this.shadowRoot.getElementById(id); if (!row || !row.clientWidth) return;
      if (!row.__ph) { row.__ph = 1; row.addEventListener('scroll', () => this._phoneChips(), { passive: true }); }
      const rr = row.getBoundingClientRect();
      row.querySelectorAll(id === 'hchips' ? ':scope>*' : '.chip').forEach((c) => {
        const q = c.getBoundingClientRect(); if (!q.width) return;
        const cut = q.right > rr.right + 0.5 || q.left < rr.left - 0.5, seen = Math.min(q.right, rr.right) - Math.max(q.left, rr.left) > 0;
        c.style.opacity = cut && seen ? '0' : ''; c.style.pointerEvents = cut && seen ? 'none' : '';
      });
    });
  },

  /* the layout just flipped between phone and tablet */
  _phoneChanged() {
    this._phoneHouse(); this._phoneMore(false); this._phoneMark(); this._phonePill(); this._phoneTitles(); this._phoneChips(); this._phoneOverlays(); this._sheetsChanged(); this._navPlace(false); /* the rail or the tab bar just appeared: measure it */
    if (this._idle) this._idleSync();
    requestAnimationFrame(() => { if (this._built && this._h) this._update(); }); /* pages re-measure at the new size */
  },

  /* tab bar: the first four pages in rail order, then More with the rest; five or fewer: no More (System stays a tab) */
  _phoneTabs(defs) {
    const nav = this.$('tabs'), grid = this.$('moreG'); if (!nav) return;
    const order = defs.filter((d) => !d.bottom).concat(defs.filter((d) => d.bottom)).filter((d) => this._pages[d.key]);
    const few = order.length <= 5, main = few ? order : order.slice(0, 4), rest = few ? [] : order.slice(4);
    const lab = (d) => (typeof d.tab === 'function' ? d.tab.call(this, this._c) : typeof d.label === 'function' ? d.label.call(this, this._c) : d.label);
    nav.innerHTML = ''; grid.innerHTML = ''; this._tabRest = rest.map((d) => d.key);
    this._phoneTitles(order);
    main.forEach((d) => {
      const a = document.createElement('a'); a.dataset.t = d.key; a.innerHTML = `${icon(d.icon)}<span class="lb"></span>`; a.lastChild.textContent = lab(d);
      a.setAttribute('aria-label', typeof d.label === 'function' ? d.label.call(this, this._c) : d.label);
      this.tap(a, () => this._setPage(d.key)); nav.appendChild(a);
    });
    if (rest.length) {
      const a = document.createElement('a'); a.dataset.more = '1'; a.setAttribute('aria-haspopup', 'dialog'); a.setAttribute('aria-expanded', 'false'); a.innerHTML = `${icon('more')}<span class="lb"></span>`; a.lastChild.textContent = S.more;
      this.tap(a, () => this._phoneMore(!this.$('more').classList.contains('show'))); nav.appendChild(a);
    }
    rest.forEach((d) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mt'; b.dataset.t = d.key; b.innerHTML = `${icon(d.icon)}<span></span>`; b.lastChild.textContent = lab(d);
      b.addEventListener('click', () => this._setPage(d.key)); grid.appendChild(b);
    });
    this._phoneMark(); this._phonePill(); this._phoneOverlays();
  },
  /* each page's heading exists only while the phone layout is on (so the tablet's page markup is untouched) */
  _phoneTitles(order) {
    order = order || this._pageDefs().filter((d) => this._pages[d.key]);
    const tt = this.shadowRoot.querySelector('#syTab [data-t="tab"]'); if (tt) tt.textContent = this._phone ? S.this_device : S.tablet; /* the System page's tablet card is "This device" on a phone */
    order.forEach((d) => {
      if (d.key === 'home') return;
      const pg = this._pages[d.key].el; let h = pg.querySelector(':scope>.ptitle');
      if (!this._phone) { if (h) h.remove(); return; }
      if (!h) { h = document.createElement('h2'); h.className = 'ptitle'; pg.insertBefore(h, pg.firstChild); }
      h.textContent = typeof d.label === 'function' ? d.label.call(this, this._c) : d.label;
    });
  },
  /* Nova's header pill is placed by measuring the tablet header; on the phone it sits at the end of the scrolling chip row */
  _phonePill() {
    const p = this._nv && this._nv.pill; if (!p) return;
    const to = this._phone ? this.$('hchips') : this.$('screen'); if (to && p.parentNode !== to) to.appendChild(p);
  },
  /* the selected tab: a raised pill and heavier label (not colour alone) plus aria-current; More is selected while a page from its sheet shows */
  _phoneMark() {
    const nav = this.$('tabs'); if (!nav) return;
    const inRest = (this._tabRest || []).includes(this._page);
    nav.querySelectorAll('a[data-t]').forEach((a) => { const on = a.dataset.t === this._page; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const more = nav.querySelector('[data-more]'); if (more) { more.classList.toggle('on', inRest); if (inRest) more.setAttribute('aria-current', 'page'); else more.removeAttribute('aria-current'); }
    this.$('moreG').querySelectorAll('.mt').forEach((b) => { const on = b.dataset.t === this._page; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (this._phone && this._lastPage !== this._page) { this._phoneMore(false); const p = this.$('pages'); if (p) p.scrollTop = 0; }
    this._lastPage = this._page;
  },
  _phoneMore(open) {
    const m = this.$('more'); if (!m) return;
    m.classList.toggle('show', !!open && !!this._phone);
    const t = this.$('tabs') && this.$('tabs').querySelector('[data-more]'); if (t) t.setAttribute('aria-expanded', String(m.classList.contains('show')));
  },

  /* Home's whole house, scaled to the card width. The room and power labels are sized apart from the drawing so their text
     stays at 12 px or more, then only the labels that fit inside the card without overlapping are shown (power labels first). */
  _phoneHouse() {
    const svg = this.$('stage'); if (!svg) return;
    if (!this._phone) {
      if (svg.getAttribute('viewBox') !== HOUSE_VB) svg.setAttribute('viewBox', HOUSE_VB);
      if (this._phoneLab) { this._phoneLab = false; this._pk = 1.16; this._tagK = 1.3; this._phoneLabelsOff(); }
      return;
    }
    svg.setAttribute('viewBox', PHONE_VB.join(' '));
    this._phoneFitLabels(true);
  },
  _phoneLabelsOff() {
    const T = this._flow ? Object.values(this._flow.tags) : [];
    T.forEach((o) => { o.nx = o.ny = 0; o.g.style.display = ''; this._tagPlace(o); });
    (this._pills || []).forEach((o) => { o.nx = o.ny = 0; o.g.style.display = ''; this._layoutPill(o, o.sub || ''); });
  },
  _phoneFitLabels(force) {
    const svg = this.$('stage'); if (!svg || !this._phone) return;
    const sr = svg.getBoundingClientRect(); if (!sr.width || !svg.getClientRects().length) { this._phoneHousePending = true; return; } /* Home is not showing: fit it when it is */
    this._phoneHousePending = false;
    const k = sr.width / PHONE_VB[2], T = ['solar', 'home', 'batt', 'grid'].map((key) => this._flow && this._flow.tags[key]).filter(Boolean), pills = this._pills || [];
    const sig = JSON.stringify([Math.round(sr.width), pills.map((o) => o.sub || ''), pills.length, T.length]);
    if (!force && sig === this._phoneSig) return; this._phoneSig = sig;
    this._phoneLab = true;
    this._pk = LABEL_PX / (12.5 * k); this._tagK = LABEL_PX / (12 * k); /* label text = LABEL_PX on screen */
    this._phoneLabelsOff();
    const taken = [], gap = 6, m = 3;
    T.map((o) => [o, o.rect]).concat(pills.map((o) => [o, o.rect])).forEach(([o, box]) => {
      const place = () => (o.rect === box && o.P ? this._tagPlace(o) : this._layoutPill(o, o.sub || ''));
      let r = box.getBoundingClientRect(), dx = 0, dy = 0;
      if (r.left < sr.left + m) dx = sr.left + m - r.left; else if (r.right > sr.right - m) dx = sr.right - m - r.right;
      if (r.top < sr.top + m) dy = sr.top + m - r.top; else if (r.bottom > sr.bottom - m) dy = sr.bottom - m - r.bottom;
      if (dx || dy) { o.nx = dx / k; o.ny = dy / k; place(); r = box.getBoundingClientRect(); }
      const inside = r.left >= sr.left + m - .5 && r.right <= sr.right - m + .5 && r.top >= sr.top + m - .5 && r.bottom <= sr.bottom - m + .5;
      const clash = taken.some((q) => r.left < q.right + gap && r.right > q.left - gap && r.top < q.bottom + gap && r.bottom > q.top - gap);
      if (!inside || clash) o.g.style.display = 'none'; else taken.push(r);
    });
  },
});
