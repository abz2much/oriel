/* Nova page, header pill and the Home chat panel. Nova is a separate Home Assistant integration (a general AI
   assistant); Oriel only talks to it when nova.enabled is true AND the integration is detected (its `nova` services
   exist). Off or not installed: no page, no pill, no chat panel, no websocket calls.
   Backend calls used (from the original Oriel module): websocket nova/chat {text} -> {ok, reply} | {ok:false, error},
   websocket nova/chat_new, services nova.nap / shush / unshush / lockdown / briefing / add_reminder /
   suggestion_accept / suggestion_dismiss. */
import { registerPage } from '../core.js';
import { S, t } from '../strings.js';
import { isEnt, pad, hm, bad, sameDay, esc } from '../util.js';

// PLACEHOLDER: link to Nova's documentation. Nova lives in its own repository; the owner will supply this link.
export const NOVA_DOCS_URL = '';

const P = {
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', send: 'M5 12h14M13 6l6 6-6 6',
  mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM6 11a6 6 0 0012 0M12 17v4', play: 'M8 5l11 7-11 7z',
  plus: 'M12 5v14M5 12h14', lock: 'M6 11h12v10H6zM8 11V8a4 4 0 018 0v3', moon: 'M20 14A8 8 0 0110 4a8 8 0 1010 10z',
  mute: 'M4 10v4h4l5 4V6L8 10zM17 9l5 6M22 9l-5 6', vup: 'M4 10v4h4l5 4V6L8 10zM17 9a4 4 0 010 6', new: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;
const errText = (e) => (e && (e.message || e.error || (e.body && e.body.message))) || String(e || S.something_wrong);
const isAuth = (e) => /unauthori[sz]ed|admin/i.test(((e && e.code) || '') + ' ' + errText(e));

const CSS = `
#nvWrap{position:absolute;left:var(--dx,0px);top:0;width:1280px;height:800px;pointer-events:none}
#nvWrap>*{pointer-events:auto}
#pgNova .ic{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}
#pgNova .nvHd{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500;gap:8px}
#pgNova .nvHd small{font-size:11.5px;font-weight:400;color:rgba(31,26,23,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pgNova .dark .nvHd small{color:rgba(255,255,255,.6)}
#pgNova button{font-family:inherit;cursor:pointer}
#pgNova button:disabled,#pgNova input:disabled,#pgNova select:disabled{opacity:.45;cursor:default}
#pgNova .nvB{height:40px;border-radius:16px;border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.34);display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;color:#1f1a17;padding:0 10px;white-space:nowrap}
#pgNova .nvB:active{background:#fff}
#pgNova .nvB .ic{width:17px;height:17px}
#pgNova .nvIn{height:34px;border-radius:17px;border:0;background:rgba(255,255,255,.6);padding:0 12px;font:inherit;font-size:12.5px;color:#1f1a17;outline:none;min-width:0}
#pgNova .nvEmpty{font-size:12.5px;color:rgba(31,26,23,.62);padding-top:6px}
#nvChat,#nvQuiet,#nvLock,#nvBrief,#nvRem,#nvSug{position:absolute}
#nvChat{left:100px;top:84px;width:560px;height:692px;padding:16px;display:flex;flex-direction:column;gap:10px;border-radius:28px}
#nvChat .nvHd i{width:26px;height:26px;border-radius:50%;background:#fff;display:grid;place-items:center}
#nvChat .nvHd i .ic{width:15px;height:15px}
#nvChat .nvHd b{font-weight:500;font-size:16px;margin-right:auto;margin-left:8px}
#nvChat .chip{height:28px;font-size:12px;background:rgba(255,255,255,.5)}
#nvLog{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:2px}
#nvLog .m{font-size:14px;line-height:1.35;background:rgba(255,255,255,.55);border-radius:16px 16px 16px 4px;padding:9px 13px;align-self:flex-start;max-width:86%;white-space:pre-wrap;word-wrap:break-word}
#nvLog .m.me{align-self:flex-end;background:rgba(28,42,15,.85);color:#fff;border-radius:16px 16px 4px 16px}
#nvLog .m.err{background:#ffd9cf;color:#8a2a12}
#nvForm{display:flex;gap:8px;align-items:center;margin:0}
#nvForm input{flex:1;height:44px;border-radius:22px;font-size:14px;color:#1c2a0f;background:rgba(255,255,255,.6)}
#nvForm .round{width:44px;height:44px}
#nvForm .mic{background:#1f1a17;color:#fff}
#nvQuiet{left:676px;top:84px;width:400px;height:168px;padding:14px 16px}
#nvQb{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:12px}
#nvQb .nvB{padding:0 6px;gap:5px;font-size:12px}
#nvQuiet .chip{height:26px;font-size:12px;padding:0 10px;white-space:nowrap}
#nvQuiet .chip.on{background:#b9dc8a}
#nvLock{left:1088px;top:84px;width:168px;height:168px;padding:14px 16px;display:flex;flex-direction:column;align-items:center}
#nvLock .nvHd{align-self:stretch}
#nvLk{width:76px;height:76px;border-radius:50%;margin-top:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;padding:0}
#nvLk .ic{width:30px;height:30px}
#nvLk.on{background:#ffd9cf;color:#8a2a12;box-shadow:0 0 0 2px #c0392b,0 0 22px 3px rgba(192,57,43,.55)}
#nvLkT{font-size:13px;margin-top:8px}
#nvBrief{left:676px;top:264px;width:284px;height:244px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
#nvBrief .nvB{height:34px;border-radius:17px}
#nvBt{flex:1;min-height:0;overflow-y:auto;font-size:13px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}
#nvRem{left:972px;top:264px;width:284px;height:244px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
#nvRl{flex:1;min-height:0;overflow-y:auto}
.nvRr{display:grid;grid-template-columns:1fr auto;gap:2px 8px;font-size:12.5px;padding:4px 0;border-bottom:1px solid rgba(31,26,23,.07)}
.nvRr:last-child{border:0}
.nvRr span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nvRr small{color:rgba(31,26,23,.62);font-size:11.5px;white-space:nowrap}
#nvRf{display:grid;grid-template-columns:1fr auto;gap:6px;margin:0}
#nvRf .nvIn[type=datetime-local]{padding:0 8px;font-size:11.5px}
#nvRf select.nvIn{padding:0 8px}
#nvRf .round{width:34px;height:34px}
#nvSug{left:676px;top:520px;width:580px;height:256px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
#nvSl{flex:1;min-height:0;overflow-y:auto}
.nvSr{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(31,26,23,.07);font-size:13px}
.nvSr:last-child{border:0}
.nvSr .tx{line-height:1.3}
.nvSr .tx small{display:block;color:#8a2a12;font-size:11.5px;margin-top:2px}
.nvSr .nvB{height:34px;padding:0 14px}
.nvSr .nvB.yes{background:linear-gradient(150deg,#c4e594,#96bc62);color:#1c2a0f;font-weight:500}
#nvOff{left:100px;top:84px;width:1156px;height:692px;border-radius:28px;display:none;align-items:center;justify-content:center;z-index:5;background:rgba(42,36,32,.35);color:#fff;font-size:22px;font-weight:300;pointer-events:none}
#nvWrap.offline #nvOff{display:flex}
#nvNo{left:100px;top:84px;width:1156px;height:692px;border-radius:28px;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:6;text-align:center;padding:40px}
#nvWrap.nodetect #nvNo{display:flex}
#nvWrap.nodetect>*:not(#nvNo):not(#nvToast){display:none!important}
#nvNo b{font-size:30px;font-weight:200}
#nvNo p{margin:0;max-width:560px;font-size:14.5px;line-height:1.45;color:rgba(31,26,23,.75)}
#nvNo a{color:#3f6a1c;font-weight:500}
#nvToast{left:966px;top:26px;transform:translateX(-50%);z-index:13;height:40px;padding:0 18px;border-radius:20px;display:none;align-items:center;font-size:13.5px;background:#1f1a17;color:#fff;box-shadow:0 12px 26px rgba(0,0,0,.35);max-width:420px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#nvToast.show{display:flex}
#nvToast.err{background:#8a2a12}
#nvPill{top:22px;height:40px;border-radius:20px;padding:0 14px 0 12px;display:flex;align-items:center;gap:8px;font-size:14px;color:#1f1a17;cursor:pointer;white-space:nowrap;z-index:4;visibility:hidden}
#nvPill .ic{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}
#nvPill i{width:8px;height:8px;border-radius:50%;flex:none;background:rgba(31,26,23,.35)}
#nvPill i.ok{background:#7da24a} #nvPill i.amb{background:#d9a441} #nvPill i.red{background:#a8452a}
#nvPill b{position:absolute;top:-5px;right:-5px;min-width:20px;height:20px;border-radius:10px;padding:0 5px;background:#1f1a17;color:#fff;font-size:11px;font-weight:600;display:none;align-items:center;justify-content:center}
#nvPill b.on{display:flex}
#nvEn{border-top:1px solid rgba(31,26,23,.09);padding-top:8px;font-size:12.5px;line-height:1.35;display:none;cursor:pointer}
#nvEn.on{display:block}
#nvEn small{display:block;font-size:11.5px;color:rgba(31,26,23,.62);margin-bottom:2px}
#nvEn span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#nvConf{left:calc(0px - var(--dx,0px));top:0;width:calc(1280px + 2 * var(--dx,0px));height:800px;z-index:12;background:rgba(26,21,18,.5);display:none;align-items:center;justify-content:center}
#nvConf.show{display:flex}
#nvConf .pn{width:380px;padding:24px;border-radius:28px;background:linear-gradient(150deg,rgba(248,243,236,.97),rgba(226,217,206,.97));box-shadow:0 30px 70px rgba(0,0,0,.5);color:#1f1a17;display:flex;flex-direction:column;gap:18px}
#nvConf b{font-size:22px;font-weight:400}
#nvConf .r{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#nvConf .nvB{height:48px;font-size:14px;background:#fff;border-color:rgba(31,26,23,.12)}
#nvConf .nvB.go{background:#1f1a17;color:#fff}
`;
const HTML = () => `<div id="nvWrap">
  <div id="nvChat" class="nova">
    <div class="nvHd"><i>${ic('spark')}</i><b>Nova</b><span class="chip" id="nvSt">–</span><button type="button" class="nvB" id="nvNew" style="height:32px">${ic('new')}${esc(S.new_chat)}</button></div>
    <div id="nvLog" aria-live="polite"></div>
    <form id="nvForm" autocomplete="off"><input id="nvIn" class="nvIn" placeholder="${esc(S.chat_placeholder)}" aria-label="${esc(S.chat_placeholder)}" enterkeyhint="send" maxlength="2000"><button type="submit" class="round" id="nvSend" aria-label="${esc(S.send)}">${ic('send')}</button><button type="button" class="round mic" id="nvMic" aria-label="${esc(S.talk_to_nova)}">${ic('mic')}</button></form>
  </div>
  <div id="nvQuiet" class="glass"><div class="nvHd"><span>${esc(S.quiet)}</span><span class="chip" id="nvQs">–</span></div><div id="nvQb"></div></div>
  <div id="nvLock" class="dark"><div class="nvHd"><span>${esc(S.lockdown)}</span></div><button type="button" id="nvLk" aria-label="${esc(S.lockdown)}">${ic('lock')}</button><div id="nvLkT">–</div></div>
  <div id="nvBrief" class="glass"><div class="nvHd"><span>${esc(S.briefing)}</span><button type="button" class="nvB" id="nvBp">${ic('play')}${esc(S.play)}</button></div><small id="nvBw" style="font-size:11.5px;color:rgba(31,26,23,.62)"></small><div id="nvBt"></div></div>
  <div id="nvRem" class="glass"><div class="nvHd"><span>${esc(S.reminders)}</span><small id="nvRc">${esc(S.next_24h)}</small></div><div id="nvRl"></div>
    <form id="nvRf" autocomplete="off"><input class="nvIn" id="nvRlab" placeholder="${esc(S.remind_me_to)}" aria-label="${esc(S.remind_me_to)}" maxlength="200"><button type="submit" class="round" id="nvRadd" aria-label="${esc(S.add_reminder)}">${ic('plus')}</button>
      <input class="nvIn" id="nvRat" type="datetime-local" aria-label="${esc(S.reminder_time)}"><select class="nvIn" id="nvRrep" aria-label="${esc(S.repeat)}"><option value="">${esc(S.once)}</option><option value="daily">${esc(S.daily)}</option><option value="weekly">${esc(S.weekly)}</option></select></form></div>
  <div id="nvSug" class="glass"><div class="nvHd"><span>${esc(S.suggestions)}</span><small id="nvSc"></small></div><div id="nvSl"></div><div id="nvEn"><small>${esc(S.energy_today)}</small><span></span></div></div>
  <div id="nvOff" class="abs">${esc(S.nova_offline)}</div>
  <div id="nvNo" class="abs glass mid"><b>${esc(S.nova_not_detected)}</b><p>${esc(S.nova_not_detected_text)}</p><p id="nvDocs"></p></div>
  <div id="nvToast" class="abs" role="status"></div>
  <div id="nvConf" class="abs"><div class="pn" role="dialog" aria-modal="true"><b id="nvCq">–</b><div class="r"><button type="button" class="nvB" id="nvCx">${esc(S.cancel)}</button><button type="button" class="nvB go" id="nvCok">${esc(S.confirm)}</button></div></div></div>
</div>`;

const NovaExt = {
  _nvDetected() { const h = this._h; return !!(h && h.services && h.services.nova); },
  _nvInitPage() {
    const pg = document.createElement('div');
    pg.id = 'pgNova'; pg.innerHTML = HTML();
    const $ = (id) => pg.querySelector('#' + id);
    this._nvc = this._c.nova;
    this._nv = { pg, $, log: [], busy: false, sig: {}, err: {}, toastT: null, conf: null, off: null, det: null };
    // header pill, its own element in the screen, placed in the gap between the header chips and the buttons
    if (this._nvc.header_pill !== false) {
      const pill = document.createElement('div'); pill.id = 'nvPill'; pill.className = 'abs glass mid';
      pill.innerHTML = ic('spark') + '<i></i><span>Nova</span><b></b>'; pill.setAttribute('role', 'button'); pill.setAttribute('tabindex', '0');
      this.tap(pill, () => this._setPage('nova'));
      this.$('screen').appendChild(pill); this._nv.pill = pill;
      // the pill is placed by measuring the header, so measure again once the font is in and every 15 s
      this._nv.clk = setInterval(() => { try { this._nvPill(); } catch (e) { /* next tick */ } }, 15000);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { try { this._nvPill(); } catch (e) { /* not built */ } });
    }
    const url = this._nvc.docs_url || NOVA_DOCS_URL, docs = $('nvDocs');
    if (url) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = S.nova_docs_link; docs.appendChild(a); }
    else docs.textContent = S.nova_docs_soon;
    this._nvBuild();
    return pg;
  },

  _nvBuild() {
    const $ = this._nv.$, c = this._nvc, N = this._nv, E = c.entities;
    $('nvForm').addEventListener('submit', (e) => { e.preventDefault(); this._nvSend(); });
    $('nvMic').addEventListener('click', () => this._nvAssist());
    $('nvNew').addEventListener('click', () => this._nvNewChat());
    this._nvSay(S.chat_hello, 'nova');
    [['moon', S.nap_30, 'nap', { duration_minutes: 30 }, S.napping_30],
      ['moon', S.nap_60, 'nap', { duration_minutes: 60 }, S.napping_60],
      ['mute', S.shush_1h, 'shush', { all: true, minutes: 60 }, S.quiet_1h],
      ['mute', S.shush_until, 'shush', { all: true }, S.quiet_until_unshush],
      ['vup', S.unshush, 'unshush', {}, S.can_talk_again]].forEach(([i, tx, svc, data, ok]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'nvB'; b.innerHTML = ic(i) + '<span></span>'; b.lastChild.textContent = tx;
      b.addEventListener('click', () => this._nvCall(svc, data, ok)); $('nvQb').appendChild(b);
    });
    this.tap($('nvQs'), () => this.moreInfo(E.status));
    $('nvLk').addEventListener('click', () => this._nvConfirm(this.sv(E.lockdown) !== 'on'));
    $('nvCx').addEventListener('click', () => this._nvConfirmClose());
    $('nvCok').addEventListener('click', () => {
      const on = N.conf; this._nvConfirmClose(); if (on === null) return;
      this._nvCall('lockdown', { state: on ? 'on' : 'off' }, on ? S.lockdown_on : S.lockdown_off);
    });
    $('nvConf').addEventListener('click', (e) => { if (e.target === $('nvConf')) this._nvConfirmClose(); });
    $('nvBp').addEventListener('click', () => this._nvCall('briefing', {}, S.briefing_started));
    $('nvRat').value = this._nvLocal(new Date(Date.now() + 3600000));
    $('nvRf').addEventListener('submit', (e) => { e.preventDefault(); this._nvAddReminder(); });
    this.tap($('nvEn'), () => this.moreInfo(E.energy_note));
  },

  /* ---------- helpers ---------- */
  _nvLocal(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(Math.floor(d.getMinutes() / 5) * 5); },
  _nvWhen(v) {
    if (!v) return ''; const d = new Date(v); if (isNaN(d)) return '';
    const now = new Date(); if (sameDay(d, now)) return hm(d);
    if (sameDay(d, new Date(now.getTime() + 86400000))) return t('when_tomorrow', { t: hm(d) });
    let wd = '', dm = '';
    try { wd = d.toLocaleDateString(this.lang(), { weekday: 'short' }); dm = d.toLocaleDateString(this.lang(), { day: 'numeric', month: 'short' }); } catch (e) { /* plain */ }
    if (Math.abs(d - now) < 6 * 86400000) return wd + ' ' + hm(d);
    return dm + ' ' + hm(d);
  },
  _nvToast(text, err) {
    const N = this._nv, tt = N.$('nvToast'); if (!tt) return;
    tt.textContent = text; tt.classList.toggle('err', !!err); tt.classList.add('show');
    clearTimeout(N.toastT); N.toastT = setTimeout(() => tt.classList.remove('show'), 3000);
  },
  async _nvCall(svc, data, ok) {
    if (!this._h || this._nv.off || !this._nvDetected()) return false;
    try { await this._h.callService('nova', svc, data || {}); if (ok) this._nvToast(ok); return true; }
    catch (e) { console.warn('[oriel] nova ' + svc, e); this._nvToast(errText(e), true); return e; }
  },
  _nvAssist() {
    const pipe = this._nvc.assist_pipeline;
    const tap = { action: 'assist', start_listening: true }; if (pipe) tap.pipeline_id = pipe;
    this.dispatchEvent(new CustomEvent('hass-action', { bubbles: true, composed: true, detail: { action: 'tap', config: { tap_action: tap } } }));
  },

  /* ---------- chat (page) ---------- */
  _nvSay(text, who) {
    const N = this._nv, item = { text: String(text), who };
    N.log.push(item); while (N.log.length > 50) N.log.shift();
    this._nvDrawLog(); return item;
  },
  _nvDrawLog() {
    const box = this._nv.$('nvLog'); if (!box) return; box.innerHTML = '';
    this._nv.log.forEach((m) => { const d = document.createElement('div'); d.className = 'm' + (m.who === 'me' ? ' me' : m.who === 'err' ? ' err' : ''); d.textContent = m.text; box.appendChild(d); });
    box.scrollTop = box.scrollHeight;
  },
  async _nvSend() {
    const N = this._nv, inp = N.$('nvIn'), text = inp.value.trim();
    if (!text || N.busy || N.off || !this._h || !this._nvDetected()) return;
    inp.value = ''; N.busy = true; this._nvBusy();
    this._nvSay(text, 'me'); const pend = this._nvSay('…', 'nova');
    try {
      const r = await this._h.callWS({ type: 'nova/chat', text });
      if (r && r.ok) pend.text = String(r.reply || S.done);
      else { pend.text = String((r && r.error) || S.nova_could_not_answer); pend.who = 'err'; }
    } catch (e) { console.warn('[oriel] nova chat', e); pend.text = errText(e); pend.who = 'err'; }
    N.busy = false; this._nvBusy(); this._nvDrawLog();
  },
  async _nvNewChat() {
    const N = this._nv; if (N.busy || N.off || !this._h || !this._nvDetected()) return;
    try {
      const r = await this._h.callWS({ type: 'nova/chat_new' });
      if (r && r.ok === false) { this._nvToast(String(r.error || S.new_chat_failed), true); return; }
      N.log = []; this._nvSay(S.new_chat_hello, 'nova'); this._nvToast(S.new_chat_started);
    } catch (e) { console.warn('[oriel] nova chat_new', e); this._nvToast(errText(e), true); }
  },
  _nvBusy() { const N = this._nv; N.$('nvSend').disabled = N.busy || !!N.off; N.$('nvNew').disabled = N.busy || !!N.off; },

  /* ---------- chat (Home panel) ---------- */
  _nvHomeSync() {
    const on = !!(this._nvc.home_chat !== false && this._nvDetected());
    const panel = this.$('nova'); if (!panel) return;
    if (panel.classList.contains('hide') === !on) return;
    panel.classList.toggle('hide', !on);
    this._homeAsk = on ? (tx) => this._nvHomeAsk(tx) : null;
    this._homeMic = on ? () => this._nvAssist() : null;
    if (this._syncRoomPanel) this._syncRoomPanel();
  },
  _nvHomeSay(text, me) {
    const log = this.$('log'), m = document.createElement('div'); m.className = 'msg' + (me ? ' me' : ''); m.textContent = text; log.appendChild(m);
    while (log.children.length > 6) log.removeChild(log.firstChild);
    return m;
  },
  async _nvHomeAsk(text) {
    this._nvHomeSay(text, true); const pending = this._nvHomeSay('…');
    try {
      const r = await this._h.callWS({ type: 'nova/chat', text });
      pending.textContent = r && r.ok ? String(r.reply || S.done) : String((r && r.error) || S.chat_failed);
    } catch (e) { pending.textContent = S.chat_failed; console.warn('[oriel] nova', e); }
  },

  /* ---------- lockdown confirm ---------- */
  _nvConfirm(on) {
    if (this._nv.off) return;
    this._nv.conf = on; this._nv.$('nvCq').textContent = on ? S.lockdown_on_q : S.lockdown_off_q;
    this._nv.$('nvConf').classList.add('show');
    setTimeout(() => { try { this._nv.$('nvCx').focus({ preventScroll: true }); } catch (e) { /* not shown */ } }, 30);
  },
  _nvConfirmClose() { this._nv.conf = null; this._nv.$('nvConf').classList.remove('show'); },

  /* ---------- reminders ---------- */
  async _nvAddReminder() {
    const $ = this._nv.$, lab = $('nvRlab').value.trim(), at = $('nvRat').value, rep = $('nvRrep').value;
    if (!lab) { this._nvToast(S.reminder_need_text, true); return; }
    const d = new Date(at);
    if (!at || isNaN(d)) { this._nvToast(S.reminder_need_time, true); return; }
    if (d < new Date()) { this._nvToast(S.reminder_future, true); return; }
    const data = { label: lab, trigger_at: at.length === 16 ? at + ':00' : at }; if (rep) data.repeat = rep;
    const r = await this._nvCall('add_reminder', data, S.reminder_saved);
    if (r === true) { $('nvRlab').value = ''; $('nvRrep').value = ''; }
  },

  /* ---------- suggestions ---------- */
  async _nvSuggest(id, yes) {
    const N = this._nv; if (!this._h || N.off) return;
    try {
      await this._h.callService('nova', yes ? 'suggestion_accept' : 'suggestion_dismiss', { suggestion_id: id });
      delete N.err[id]; this._nvToast(yes ? S.suggestion_approved : S.suggestion_dismissed);
    } catch (e) {
      console.warn('[oriel] nova suggestion', e);
      if (isAuth(e)) { N.err[id] = S.ask_admin; this._nvToast(S.ask_admin, true); }
      else { N.err[id] = errText(e); this._nvToast(errText(e), true); }
      N.sig.sug = null; this._nvSug();
    }
  },

  /* ---------- update ---------- */
  _updateNova() {
    if (!this._nv) return;
    const det = this._nvDetected();
    this._nv.$('nvWrap').classList.toggle('nodetect', !det);
    if (!det) return;
    const run = (name, fn) => { try { fn.call(this); } catch (e) { console.warn('[oriel] nova ' + name, e); } };
    run('status', this._nvStatus); run('lockdown', this._nvLock); run('briefing', this._nvBrief);
    run('reminders', this._nvRem); run('suggestions', this._nvSug); run('energy', this._nvEnergy);
  },
  _nvAlways() {
    if (!this._nv) return;
    this._nvHomeSync();
    this._nvPill();
  },
  _nvStatus() {
    const E = this._nvc.entities, N = this._nv, $ = N.$, s = this.sv(E.status), off = bad(s);
    if (off !== N.off) {
      N.off = off; $('nvWrap').classList.toggle('offline', off);
      $('nvWrap').querySelectorAll('button,input,select').forEach((b) => { if (b.id !== 'nvCx') b.disabled = off; });
      if (off) this._nvConfirmClose();
      this._nvBusy();
    }
    const txt = this._nvState().txt;
    $('nvSt').textContent = txt; $('nvQs').textContent = txt;
    $('nvQs').classList.toggle('on', !off && txt === S.ready);
  },
  _nvState() {
    if (!this._nvDetected()) return { txt: S.not_detected, dot: '' };
    const E = this._nvc.entities, s = this.sv(E.status), q = this.st(E.quiet), qa = (q && q.attributes) || {}, nap = this.sv(E.nap_ends);
    if (bad(s)) return { txt: S.offline, dot: '' };
    if (s === 'lockdown') return { txt: S.lockdown, dot: 'red' };
    if (s === 'napping') return { txt: bad(nap) ? S.napping : t('napping_until', { t: this._nvWhen(nap) }), dot: 'amb' };
    if (s === 'quiet' || (q && q.state === 'on')) return { txt: qa.until ? t('quiet_until', { t: this._nvWhen(qa.until) }) : S.quiet, dot: 'amb' };
    if (s === 'observer_off') return { txt: S.not_watching, dot: '' };
    return { txt: S.ready, dot: 'ok' };
  },
  _nvPill() {
    const p = this._nv.pill, hc = this.$('hchips'), hr = this.$('hdr-r'); if (!p || !hc || !hr) return;
    const st = this._nvState(), n = parseInt(this.sv(this._nvc.entities.suggestions), 10) || 0, b = p.querySelector('b');
    p.querySelector('span').textContent = 'Nova · ' + st.txt; p.querySelector('i').className = st.dot;
    b.textContent = n > 99 ? '99+' : String(n); b.classList.toggle('on', n > 0 && this._nvDetected());
    p.setAttribute('aria-label', 'Nova · ' + st.txt);
    // just left of the header buttons, same 10px gap as between them; hidden rather than overlapping the chips
    const L = hc.offsetLeft + hc.offsetWidth, R = hr.offsetLeft, w = p.offsetWidth, fit = R - L - w >= 24;
    if (fit) p.style.left = (R - 10 - w) + 'px';
    p.style.visibility = fit ? 'visible' : 'hidden';
  },
  _nvEnergy() {
    const id = this._nvc.entities.energy_note, v = this.sv(id), box = this._nv.$('nvEn'), on = isEnt(id) && !bad(v) && String(v).trim() !== '';
    box.classList.toggle('on', on); box.lastChild.textContent = on ? String(v) : '';
  },
  _nvLock() {
    const v = this.sv(this._nvc.entities.lockdown), on = v === 'on', $ = this._nv.$;
    $('nvLk').classList.toggle('on', on);
    $('nvLkT').textContent = bad(v) ? '–' : on ? S.on : S.off;
  },
  _nvBrief() {
    const s = this.st(this._nvc.entities.briefing), $ = this._nv.$, a = (s && s.attributes) || {};
    const sig = s ? s.state + '|' + a.text : ''; if (this._nv.sig.brief === sig) return; this._nv.sig.brief = sig;
    $('nvBw').textContent = s && !bad(s.state) ? t('latest_at', { t: this._nvWhen(s.state) }) : '';
    $('nvBt').textContent = a.text ? String(a.text) : S.no_briefing;
  },
  _nvRem() {
    const s = this.st(this._nvc.entities.reminders), $ = this._nv.$, list = (s && Array.isArray(s.attributes.reminders)) ? s.attributes.reminders : [];
    const sig = JSON.stringify(list); if (this._nv.sig.rem === sig) return; this._nv.sig.rem = sig;
    const REP = { daily: S.daily_lc, weekly: S.weekly_lc, hourly: S.hourly_lc };
    $('nvRc').textContent = list.length ? t('n_in_24h', { n: list.length }) : S.next_24h;
    const box = $('nvRl'); box.innerHTML = '';
    if (!list.length) { box.innerHTML = `<div class="nvEmpty">${esc(S.nothing_due)}</div>`; return; }
    list.forEach((r) => {
      const d = document.createElement('div'); d.className = 'nvRr'; d.innerHTML = '<span></span><small></small>';
      d.firstChild.textContent = String(r.label || '');
      d.lastChild.textContent = this._nvWhen(r.time) + (r.repeat ? ' · ' + (REP[r.repeat] || String(r.repeat)) : '');
      box.appendChild(d);
    });
  },
  _nvSug() {
    const N = this._nv, s = this.st(this._nvc.entities.suggestions), $ = N.$, list = (s && Array.isArray(s.attributes.suggestions)) ? s.attributes.suggestions : [];
    const sig = JSON.stringify(list) + JSON.stringify(N.err) + N.off; if (N.sig.sug === sig) return; N.sig.sug = sig;
    $('nvSc').textContent = list.length ? t('n_waiting', { n: list.length }) : '';
    const box = $('nvSl'); box.innerHTML = '';
    if (!list.length) { box.innerHTML = `<div class="nvEmpty">${esc(S.no_suggestions)}</div>`; return; }
    list.forEach((x) => {
      const d = document.createElement('div'); d.className = 'nvSr';
      d.innerHTML = `<div class="tx"><span></span><small></small></div><button type="button" class="nvB yes">${esc(S.yes)}</button><button type="button" class="nvB">${esc(S.no)}</button>`;
      d.querySelector('.tx span').textContent = String(x.text || '');
      const note = d.querySelector('.tx small'); if (N.err[x.id]) note.textContent = N.err[x.id]; else note.remove();
      const [yes, no] = d.querySelectorAll('button');
      yes.disabled = no.disabled = !!N.off;
      yes.addEventListener('click', () => this._nvSuggest(x.id, true)); no.addEventListener('click', () => this._nvSuggest(x.id, false));
      box.appendChild(d);
    });
  },
  _nvStop() {
    if (!this._nv) return;
    clearTimeout(this._nv.toastT); clearInterval(this._nv.clk);
    if (this._nv.pill) this._nv.pill.remove();
    const panel = this.$ && this.$('nova'); if (panel) panel.classList.add('hide');
    this._homeAsk = null; this._homeMic = null;
    if (this._syncRoomPanel) this._syncRoomPanel();
  },
};

registerPage({
  key: 'nova', icon: 'spark',
  label() { return S.page_nova; },
  css: CSS,
  enabled(c) { return c.nova && c.nova.enabled === true; },
  init() { return this._nvInitPage(); },
  update() { this._updateNova(); },
  always() { this._nvAlways(); },
  stop() { this._nvStop(); },
  methods: NovaExt,
});
