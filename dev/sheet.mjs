/* Contact sheet: one row per page, one column per theme, from dev/theme-shots.mjs output.
   Usage: node dev/sheet.mjs <theme ...>   (Classic comes from dev/out/themes/default, or classic if shot by name)
   Writes dev/out/themes/index.html. */
import fs from 'node:fs';
const D = 'dev/out/themes';
const themes = process.argv.slice(2);
const shots = fs.readdirSync(`${D}/${themes[0]}`).filter((f) => f.endsWith('.png')).sort();
const rows = shots.map((f) => `<tr><th>${f.replace('.png', '')}</th>${themes.map((t) => `<td>${fs.existsSync(`${D}/${t}/${f}`) ? `<a href="${t}/${f}"><img src="${t}/${f}" loading="lazy"></a>` : '–'}</td>`).join('')}</tr>`).join('');
fs.writeFileSync(`${D}/index.html`, `<!doctype html><meta charset="utf-8"><title>Oriel themes</title><style>body{font:14px system-ui;margin:16px;background:#1b1b1b;color:#eee}table{border-collapse:collapse;width:100%}td,th{padding:4px;vertical-align:top}th{text-align:left;font-weight:500}img{width:100%;display:block;border-radius:6px}</style><h1>Oriel themes</h1><table><tr><th></th>${themes.map((t) => `<th>${t}</th>`).join('')}</tr>${rows}</table>`);
console.log(`${D}/index.html: ${shots.length} rows × ${themes.length} themes`);
