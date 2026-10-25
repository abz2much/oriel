/* Editor helpers: dotted-path get/set, validation (missing or wrong-domain entities) and auto-detect suggestions.
   Nothing here changes the config by itself: the editor applies suggestions only after the user accepts them. */
import { SECTIONS } from './schema.js';

export const isEntId = (v) => typeof v === 'string' && /^[a-z_]+\.[a-z0-9_]+$/.test(v);

export function getPath(obj, path) {
  return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function setPath(obj, path, val) {
  const ks = String(path).split('.');
  let o = obj;
  ks.forEach((k, i) => {
    if (i === ks.length - 1) {
      if (val === undefined || val === '' || val === null) { if (Array.isArray(o)) o[k] = null; else delete o[k]; }
      else o[k] = val;
      return;
    }
    if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    o = o[k];
  });
  return obj;
}

/* ---------- validation ---------- */
function checkValue(v, field, hass, where, out) {
  const vals = [].concat(v == null ? [] : v).filter((x) => typeof x === 'string' && x !== '');
  vals.forEach((id) => {
    if (!isEntId(id)) { out.push({ where, field: field.name, id, kind: 'format' }); return; }
    if (hass && hass.states && !hass.states[id]) { out.push({ where, field: field.name, id, kind: 'missing' }); return; }
    if (field.domains && !field.domains.includes(id.split('.')[0])) out.push({ where, field: field.name, id, kind: 'domain', domains: field.domains });
  });
}
function walkNode(node, obj, hass, where, out) {
  if (!obj || typeof obj !== 'object') return;
  (node.fields || []).forEach((f) => { if (f.selector && f.selector.entity) checkValue(getPath(obj, f.name), f, hass, where, out); });
  (node.lists || []).forEach((l) => {
    const arr = getPath(obj, l.key);
    if (Array.isArray(arr)) arr.forEach((item, i) => walkNode(l.item, item, hass, where.concat([l.key, i]), out));
  });
}
/* Returns [{ where: [section, ...path to the object], field, id, kind: missing | domain | format, domains }] */
export function validate(config, hass) {
  const out = [];
  SECTIONS.forEach((s) => {
    const obj = (config || {})[s.key];
    if (!obj) return;
    s.groups.forEach((g) => walkNode(g, obj, hass, [s.key], out));
  });
  return out;
}

/* ---------- auto-detect ---------- */
function score(st, rule) {
  const a = st.attributes || {}, text = (st.entity_id + ' ' + (a.friendly_name || '')).toLowerCase().replace(/\s+/g, '_');
  let s = 0;
  if (rule.dc) { const dcs = [].concat(rule.dc); if (dcs.includes(a.device_class)) s += 2; else if (a.device_class) s -= 1; }
  if (rule.unit && rule.unit.includes(a.unit_of_measurement)) s += 1;
  if (rule.w) s += Math.min(2, rule.w.filter((w) => text.includes(w)).length);
  return s;
}
function candidates(hass, field) {
  return Object.keys(hass.states || {}).filter((id) => !field.domains || field.domains.includes(id.split('.')[0])).map((id) => hass.states[id]);
}
const used = (config) => new Set(JSON.stringify(config || {}).match(/[a-z_]+\.[a-z0-9_]+/g) || []);

/* Suggestions for one section: [{ kind: 'field' | 'items', path, field, value, items, why, strong, alts }] */
export function detect(sectionKey, config, hass) {
  const sec = SECTIONS.find((s) => s.key === sectionKey); if (!sec || !hass) return [];
  const obj = (config && config[sectionKey]) || {}, inUse = used(config), out = [];
  sec.groups.forEach((g) => {
    (g.fields || []).forEach((f) => {
      if (!f.d || !f.selector.entity) return;
      const cur = getPath(obj, f.name);
      if (cur !== undefined && cur !== '' && !(Array.isArray(cur) && !cur.length)) return;
      const own = f.name.split('.').pop();
      const ranked = candidates(hass, f).map((st) => ({ id: st.entity_id, s: score(st, f.d) + (st.entity_id.split('.')[1].includes(own) ? 1 : 0) })).filter((x) => x.s >= 1 || (!f.d.dc && !f.d.w && !f.d.unit)).sort((a, b) => b.s - a.s);
      if (!ranked.length) return;
      if (f.multi) {
        const picks = ranked.filter((x) => x.s >= Math.max(2, ranked[0].s - 1)).slice(0, 8).map((x) => x.id).sort();
        if (picks.length) out.push({ kind: 'field', path: f.name, field: f, value: picks, why: whyOf(f.d), strong: false, alts: [] });
        return;
      }
      const top = ranked[0], second = ranked[1];
      const domainOnly = !f.d.dc && !f.d.w && !f.d.unit;
      const strong = domainOnly ? ranked.length === 1 : top.s >= 3 && (!second || second.s < top.s);
      out.push({ kind: 'field', path: f.name, field: f, value: top.id, why: whyOf(f.d, top.s), strong: strong && !inUse.has(top.id), alts: ranked.slice(1, 3).filter((x) => x.s === top.s || x.s >= top.s - 1).map((x) => x.id) });
    });
    (g.detectLists || []).forEach((dl) => {
      if (dl.mode !== 'multi') return;
      const cur = getPath(obj, dl.key);
      if (Array.isArray(cur) && cur.length) return;
      const ids = Object.keys(hass.states).filter((id) => id.startsWith(dl.domain + '.')).sort();
      if (ids.length) out.push({ kind: 'field', path: dl.key, field: (g.fields || []).find((f) => f.name === dl.key), value: ids, why: dl.domain, strong: true, alts: [] });
    });
    (g.lists || []).forEach((l) => { if (l.detect) { const s = listDetect(l, obj, hass, inUse); if (s) out.push(s); } });
  });
  return out;
}
function whyOf(d, sc) {
  const p = [];
  if (d.dc) p.push([].concat(d.dc).join(' / '));
  if (d.unit) p.push(d.unit.join(' / '));
  if (d.w) p.push('“' + d.w.slice(0, 2).join('”, “') + '”');
  if (sc !== undefined && sc < 3) p.push('weak');
  return p.join(' · ');
}
const fname = (st) => (st.attributes && st.attributes.friendly_name) || st.entity_id.split('.')[1].replace(/_/g, ' ');
function listDetect(l, obj, hass, inUse) {
  const S = hass.states, ids = Object.keys(S).filter((id) => !inUse.has(id)).sort(), dc = (id) => (S[id].attributes || {}).device_class;
  const find = (prefix, word) => ids.find((x) => x.startsWith('binary_sensor.' + prefix) && x.includes(word));
  let items = [];
  if (l.detect === 'cameras') {
    items = ids.filter((id) => id.startsWith('camera.')).slice(0, 6).map((id) => {
      const o = id.split('.')[1], it = { name: fname(S[id]), camera: id }, m = find(o, 'motion'), p = find(o, 'person');
      if (m) it.motion = m; if (p) it.person = p; return it;
    });
  } else if (l.detect === 'openings') {
    const sens = ids.filter((id) => id.startsWith('binary_sensor.') && ['door', 'window', 'garage_door', 'opening'].includes(dc(id)));
    if (sens.length) items = [{ area: '', sensors: sens.map((id) => ({ name: fname(S[id]), label: fname(S[id]), entity: id })) }];
  } else if (l.detect === 'presence') {
    const sens = ids.filter((id) => id.startsWith('binary_sensor.') && ['occupancy', 'presence', 'motion'].includes(dc(id)));
    if (sens.length) items = [{ floor: '', rooms: sens.map((id) => ({ name: fname(S[id]), entities: [id], wording: dc(id) === 'motion' ? 'motion' : 'presence' })) }];
  } else if (l.detect === 'batteries') {
    items = ids.filter((id) => id.startsWith('sensor.') && dc(id) === 'battery').map((id) => ({ name: fname(S[id]), entity: id }));
  } else if (l.detect === 'vacuums') {
    items = ids.filter((id) => id.startsWith('vacuum.')).slice(0, 4).map((id) => ({ name: fname(S[id]), entity: id }));
  }
  if (!items.length) return null;
  return { kind: 'items', path: l.key, list: l, items, why: l.detect, strong: true, alts: [] };
}
