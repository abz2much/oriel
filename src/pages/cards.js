/* Layout shared by the Climate and Family pages, taken from the approved mockups (reference/mockups):
   a block at x 120, y 96, 1136 × 680, up to three columns 18 px apart, glass cards stacked 18 px apart.
   Each page adds this once (addCss key "cards"). Colours are theme tokens only. */
export const CARDS_CSS = `
.pgc{position:absolute;left:var(--dx,0px);top:0;width:1280px;height:800px;pointer-events:none}
.pgc>*{pointer-events:auto}
.pgc .cols{position:absolute;left:120px;top:96px;width:1136px;height:680px;display:grid;gap:18px;grid-template-columns:var(--cols,1fr);justify-content:start}
.pgc .col{display:flex;flex-direction:column;gap:18px;min-height:0;min-width:0;max-width:600px}
.pgc .col.hide,.pgc .card.hide{display:none}
.pgc .card{border-radius:26px;padding:20px 22px;display:flex;flex-direction:column;min-height:0;flex:0 1 auto;overflow:hidden}
.pgc .ic{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}
.pgc h3{margin:0;font-weight:400;font-size:17px}
.pgc .hd{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:26px}
.pgc .pill{border-radius:14px;padding:3px 10px;font-size:12px;background:rgba(var(--oriel-glass),.5);white-space:nowrap;max-width:60%;overflow:hidden;text-overflow:ellipsis}
.pgc .soft{color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}
.pgc .sm{font-size:12px}
.pgc .row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;border-top:1px solid rgba(var(--oriel-ink),.14);font-size:14px}
.pgc .row>:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pgc .row>:last-child{white-space:nowrap;font-variant-numeric:tabular-nums}
.pgc .sb{width:44px;height:44px;border-radius:50%;border:1px solid rgba(var(--oriel-glass),.6);background:rgba(var(--oriel-glass),.55);color:rgb(var(--oriel-ink));display:grid;place-items:center;padding:0;cursor:pointer;flex:none}
.pgc .sb:active{transform:scale(.94)} .pgc .sb:disabled{opacity:.4;cursor:default}
.pgc .empty,.pgc .nvEmpty{font-size:13px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));padding:8px 0}
.pgc button{font-family:inherit}
.pgc .tap{cursor:pointer}
.pgc .fit{flex:1 1 auto;min-height:0;overflow:hidden}
.pgc .more{font-size:12px;margin-top:8px;display:flex;align-items:center;gap:6px;flex:none}
.pgc .lnk{position:relative;border:0;background:none;color:inherit;font:inherit;text-decoration:underline;padding:0;cursor:pointer}
.pgc .lnk::after{content:"";position:absolute;left:-12px;right:-12px;top:-15px;bottom:-15px}
.pgc .lnk:disabled{opacity:.5;cursor:default;text-decoration:none}
`;

/* Weights are the mockup's column widths, so the block keeps its proportions. Columns with no visible card drop out. */
export function layoutCols(root, weights) {
  const cols = [...root.querySelectorAll('.col')], w = [];
  cols.forEach((c, i) => { const any = [...c.children].some((k) => !k.classList.contains('hide')); c.classList.toggle('hide', !any); if (any) w.push(weights[i]); });
  root.querySelector('.cols').style.setProperty('--cols', (w.length ? w : [1]).map((x) => `minmax(0,${x}fr)`).join(' '));
}

/* Show only the rows that fit. Rows are dropped from the end until the box stops overflowing, and the count is
   returned for a "+ N more" line, so a row is never cut in half. Call it when the page is visible: a hidden
   page has no height to measure. */
export function fitRows(box, rows) {
  rows.forEach((r) => r.classList.remove('hide'));
  let hidden = 0;
  for (let i = rows.length - 1; i >= 0 && box.scrollHeight > box.clientHeight + 1; i--) { rows[i].classList.add('hide'); hidden++; }
  return hidden;
}
