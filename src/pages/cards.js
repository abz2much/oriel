/* Layout shared by the Climate and Family pages: a canvas of up to three columns of glass cards.
   Each page adds this once (addCss key "cards"). Colours are theme tokens only. */
export const CARDS_CSS = `
.pgc{position:absolute;left:var(--dx,0px);top:0;width:1280px;height:800px;pointer-events:none}
.pgc>*{pointer-events:auto}
.pgc .cols{position:absolute;left:100px;top:84px;height:692px;display:grid;gap:20px;grid-template-columns:repeat(var(--n,3),minmax(0,var(--cw,372px)))}
.pgc .col{display:flex;flex-direction:column;gap:14px;min-height:0;min-width:0}
.pgc .card{padding:16px 18px;overflow:hidden;min-height:0;display:flex;flex-direction:column;gap:10px}
.pgc .card.grow{flex:1}
.pgc .ic{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}
.pgc .hd{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px;font-weight:500;min-height:24px}
.pgc .hd small{font-size:12px;font-weight:400;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));white-space:nowrap}
.pgc .soft{font-size:12px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62))}
.pgc .empty,.pgc .nvEmpty{font-size:13px;color:rgba(var(--oriel-ink),var(--oriel-soft,.62));padding:8px 0}
.pgc button{font-family:inherit}
.pgc .tap{cursor:pointer}
.pgc .col>.hide{display:none}
`;

/* Show only the columns that hold a visible card, and size them to the count. */
export function layoutCols(root) {
  const cols = [...root.querySelectorAll('.col')];
  let n = 0;
  cols.forEach((c) => { const any = [...c.children].some((k) => !k.classList.contains('hide')); c.classList.toggle('hide', !any); if (any) n++; });
  const box = root.querySelector('.cols');
  box.style.setProperty('--n', String(Math.max(1, n))); box.style.setProperty('--cw', n >= 3 ? '372px' : n === 2 ? '480px' : '560px');
}
