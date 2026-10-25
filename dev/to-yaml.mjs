/* Writes a JSON config as YAML. Usage: node dev/to-yaml.mjs in.json > out.yaml */
import fs from 'node:fs';
const scalar = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v);
  return /^[\w.\/-]+$/.test(s) && !/^(true|false|null|yes|no|on|off|\d.*)$/i.test(s) ? s : JSON.stringify(s);
};
function yaml(v, ind) {
  const pad = '  '.repeat(ind);
  if (Array.isArray(v)) {
    if (!v.length) return ' []';
    if (v.every((x) => typeof x !== 'object' || x === null)) return ' [' + v.map(scalar).join(', ') + ']';
    return '\n' + v.map((x) => pad + '- ' + yaml(x, ind + 1).replace(/^\n/, '').trimStart()).join('\n');
  }
  if (v && typeof v === 'object') {
    const keys = Object.keys(v); if (!keys.length) return ' {}';
    return '\n' + keys.map((k) => pad + k + ':' + (v[k] && typeof v[k] === 'object' ? yaml(v[k], ind + 1) : ' ' + scalar(v[k]))).join('\n');
  }
  return ' ' + scalar(v);
}
const cfg = Object.assign({ type: 'custom:oriel-shell' }, JSON.parse(fs.readFileSync(process.argv[2], 'utf8')));
process.stdout.write(yaml(cfg, 0).replace(/^\n/, '') + '\n');
