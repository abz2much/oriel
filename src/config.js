/* Config schema defaults. Everything is empty or generic: nothing here only works on one system.
   User config is deep-merged over this; arrays replace, they never merge. */
import { isEnt } from './util.js';

export const DEFAULT_CONFIG = {
  general: {
    weather: '', weather_label: '', people: [], people_display: 'initial',
    alarm: '', front_door: '', clock: true, currency: 'auto',
    settings_path: '/config', kiosk_path: '', pages_order: null,
  },
  home: {
    energy_card: { solar_power: '', house_power: '', battery_soc: '' },
    today: [], price: '', quick_actions: [], shopping: '',
    room_panel: {
      title: '', motion: '', lights: [], heating: [],
      boost: { start: '', cancel: '', timer: '', switch: '', label: '' },
      appliances: [], fridge: { door: '', fridge_temp: '', freezer_temp: '' },
    },
    camera_popups: [],
    house: { mirror: false, floors: [], roof: true, solar_panels: 'auto', energy_kit: 'auto', furniture: [] },
  },
  living: {
    title: '', presence: '', temperature: '', humidity: '', illuminance: '', openings: [],
    blinds: { cover: '', my_position: '', subtitle: '' },
    speaker: { media_player: '', label: '', night_sound: '', audio_format: '' },
    tv: { media_player: '', inputs: [], source_labels: {} },
    streamers: { selector: '', devices: [] },
    movie_mode: { start: '', stop: '', flag: '', on_text: '' },
    scenes: [], lights: [], scene_off_lights: [], apps: [], room_render: true,
  },
  energy: {
    solar_power: '', pv_strings: [], panels: { rows: 3, columns: 5 }, house_power: '',
    battery_power: '', battery_power_positive: 'charging',
    grid: { mode: 'entity', entity: '', positive: 'import', inverter_ac: '' },
    battery: { soc: [], capacity: '', capacity_kwh: null, reserve_pct: 10, warranty_cycles: null, packs: [] },
    today: { solar_yield: '', house_use: '', grid_import: '', grid_export: '', battery_charged: '', net_cost: '', standing_charge: null },
    price: '',
    forecast: { days: [], remaining_today: '', peak_today: '', peak_tomorrow: '', bands: [10, 20] },
    consumers: { heat_pump: { power: '', today: '', month: '' }, appliances: [] },
    health: { inverter_online_from: [], fault_count: '', operating_mode: '', grid_mode: '', feed_in_mode: '', frequency: '', voltage: '', inverter_temperature: '', fossil_share: '' },
  },
  security: {
    alarm: '', linked_panels: [], hubs: [], openings: [], presence: [], presence_subtitle: '',
    cameras: [], doorbell: '', batteries: [], low_battery_pct: 30, live_seconds: 120,
    snapshot_seconds: 30, events_hours: 12, event_rows: 4,
  },
  vacuum: { night_from: 22, night_to: 8, vacuums: [] },
  system: {
    host: { uptime: '', cpu: '', memory: '', disk: '', cpu_temperature: '' },
    updates: { core: '', os: '', supervisor: '' },
    backups: { last: '', next: '', stale: '' },
    connections: [], low_battery_pct: 20, debug_panel: false,
  },
  nova: {
    enabled: false, assist_pipeline: '', home_chat: true, header_pill: true,
    entities: { status: '', quiet: '', nap_ends: '', lockdown: '', reminders: '', briefing: '', suggestions: '', energy_note: '', camera_summary: '' },
    docs_url: '',
  },
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function merge(base, over) {
  if (!isObj(over)) return base;
  const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  for (const k of Object.keys(over)) {
    const b = out[k], o = over[k];
    out[k] = isObj(b) && isObj(o) ? merge(b, o) : o;
  }
  return out;
}

export function normalise(user) {
  const u = Object.assign({}, user || {});
  delete u.type;
  return merge(DEFAULT_CONFIG, u);
}

/* Every entity ID anywhere in a config subtree (for "is this page configured?" and the debug panel). */
export function entitiesIn(obj, out) {
  out = out || [];
  if (typeof obj === 'string') { if (isEnt(obj)) out.push(obj); }
  else if (Array.isArray(obj)) obj.forEach((v) => entitiesIn(v, out));
  else if (isObj(obj)) Object.keys(obj).forEach((k) => entitiesIn(obj[k], out));
  return out;
}
export const hasEntities = (obj) => entitiesIn(obj).length > 0;
