/* What the visual editor shows: sections -> groups (tabs) -> fields and lists.
   Field names are dotted paths into the section's config (`fridge.door`, `rect.0`), so nested objects and small
   arrays need no special forms. Labels live in strings.js (ED), keyed by section + path; anything without a label
   falls back to the path in plain words. `d` on an entity field is the auto-detect rule:
   dc = device_class(es), unit = units, w = words in the entity ID or name. */
import { P } from '../util.js';

const ICONS = Object.keys(P).sort();

// field builders
const ent = (name, domain, d, extra) => Object.assign({ name, selector: { entity: domain ? { domain: [].concat(domain) } : {} }, domains: domain ? [].concat(domain) : null, d }, extra || {});
const ents = (name, domain, d) => ({ name, selector: { entity: { domain: domain ? [].concat(domain) : undefined, multiple: true } }, domains: domain ? [].concat(domain) : null, multi: true, d });
const txt = (name) => ({ name, selector: { text: {} } });
const csv = (name) => ({ name, selector: { text: {} }, csv: true });
const num = (name, min, max, step) => ({ name, selector: { number: { mode: 'box', min, max, step: step || 1 } } });
const bool = (name) => ({ name, selector: { boolean: {} } });
const sel = (name, options) => ({ name, selector: { select: { mode: 'dropdown', options } } });
const icon = (name, list) => sel(name, list || ICONS);

const POWER = { dc: 'power', unit: ['W', 'kW'] };
const ENERGY = { dc: 'energy', unit: ['kWh', 'Wh'] };
const TEMP = { dc: 'temperature', unit: ['°C', '°F'] };

export const SECTIONS = [
  {
    key: 'general',
    groups: [{
      key: 'main',
      fields: [
        ent('weather', 'weather', {}), txt('weather_label'),
        ents('people', 'person'), sel('people_display', ['initial', 'name', 'hidden']),
        ent('alarm', 'alarm_control_panel', {}), ent('front_door', 'binary_sensor', { dc: ['door', 'opening'], w: ['front'] }),
        ents('windows', 'binary_sensor', { dc: ['window', 'opening'], w: ['window'] }),
        bool('clock'), txt('currency'), txt('settings_path'), txt('kiosk_path'),
      ],
      detectLists: [{ key: 'people', domain: 'person', mode: 'multi' }],
    }, {
      key: 'idle_clock',
      fields: [ent('idle_clock.presence', ['binary_sensor', 'input_boolean'], { dc: ['occupancy', 'presence', 'motion'], w: ['presence', 'occupancy', 'mmwave'] }), num('idle_clock.minutes', 1, 60)],
    }],
  },
  {
    key: 'home',
    groups: [
      {
        key: 'energy_card',
        fields: [
          ent('energy_card.solar_power', 'sensor', Object.assign({ w: ['solar', 'pv'] }, POWER)),
          ent('energy_card.house_power', 'sensor', Object.assign({ w: ['house', 'home', 'load', 'consumption'] }, POWER)),
          ent('energy_card.battery_soc', 'sensor', { dc: 'battery', unit: ['%'], w: ['battery', 'soc'] }),
          ent('price', ['sensor', 'input_number'], { w: ['price', 'tariff', 'rate'] }),
        ],
      },
      {
        key: 'today',
        lists: [{ key: 'today', label: (i) => i.label, item: { fields: [txt('label'), icon('icon'), ent('entity', ['sensor', 'input_number']), sel('tone', ['neutral', 'good', 'bad'])] } }],
      },
      {
        key: 'quick_actions',
        fields: [ent('shopping', 'todo', { w: ['shopping'] })],
        lists: [{ key: 'quick_actions', max: 4, label: (i) => i.label || i.type, item: { fields: [sel('type', ['script', 'shopping', 'more_info']), txt('label'), icon('icon'), ent('entity', null), txt('subtitle'), bool('primary')] } }],
      },
      { key: 'coming_up', fields: [bool('calendar')] },
      {
        key: 'room_panel',
        fields: [
          txt('room_panel.title'), ent('room_panel.motion', 'binary_sensor', { dc: ['motion', 'occupancy', 'presence'] }),
          ent('room_panel.boost.start', 'script', { w: ['boost'] }), ent('room_panel.boost.cancel', 'script', { w: ['boost', 'cancel'] }),
          ent('room_panel.boost.timer', 'timer', { w: ['boost'] }), ent('room_panel.boost.switch', ['switch', 'input_boolean'], { w: ['boost'] }), txt('room_panel.boost.label'),
          ent('room_panel.fridge.door', 'binary_sensor', { dc: ['door', 'opening'], w: ['fridge'] }),
          ent('room_panel.fridge.fridge_temp', 'sensor', Object.assign({ w: ['fridge'] }, TEMP)), ent('room_panel.fridge.freezer_temp', 'sensor', Object.assign({ w: ['freezer'] }, TEMP)),
        ],
        lists: [
          { key: 'room_panel.lights', label: (i) => i.name || i.entity, item: { fields: [txt('name'), ent('entity', ['light', 'switch']), icon('icon'), bool('all_off')] } },
          { key: 'room_panel.heating', label: (i) => i.name || i.entity, item: { fields: [txt('name'), ent('entity', 'climate'), num('step', 0.1, 5, 0.1)] } },
          {
            key: 'room_panel.appliances', label: (i) => i.name || i.state,
            item: { fields: [txt('name'), icon('icon', ['washer', 'dryer', 'dish', 'oven', 'micro', 'cook', 'fridge', 'hood', 'heatp']), txt('colour'), sel('kind', ['machine', 'cooktop']), ent('state', 'sensor'), ent('finish', 'sensor', { dc: 'timestamp' }), csv('run_states'), csv('pause_states'), ent('door', 'binary_sensor'), ent('temperature', 'sensor'), ent('setpoint', 'sensor'), ents('burners', 'sensor'), ent('tap_script', 'script')] },
          },
        ],
      },
      {
        key: 'camera_popups',
        lists: [{ key: 'camera_popups', label: (i) => i.title || i.camera, item: { fields: [ent('flag', ['input_boolean', 'binary_sensor']), ent('camera', 'camera'), txt('title')] } }],
      },
      {
        key: 'house',
        actions: ['example', 'clear'],
        fields: [bool('house.mirror'), bool('house.roof'), num('house.scale', 1, 200, 1)],
        lists: [{
          key: 'house.floors', max: 2, label: (i) => i.name,
          item: {
            fields: [txt('name')],
            lists: [{
              key: 'rooms', label: (i) => i.name,
              item: { fields: [txt('name'), num('rect.0', 0, 100, 0.5), num('rect.1', 0, 100, 0.5), num('rect.2', 0.5, 100, 0.5), num('rect.3', 0.5, 100, 0.5), ent('temperature', 'sensor', TEMP), ent('presence', 'binary_sensor', { dc: ['occupancy', 'presence', 'motion'] }), bool('pill'), num('pill_offset.0', -400, 400, 1), num('pill_offset.1', -400, 400, 1), txt('colour')] },
            }],
          },
        }],
      },
    ],
  },
  {
    key: 'living',
    groups: [
      {
        key: 'room',
        fields: [
          txt('title'), ent('presence', 'binary_sensor', { dc: ['occupancy', 'presence', 'motion'], w: ['living'] }), ent('temperature', 'sensor', Object.assign({ w: ['living'] }, TEMP)),
          ent('humidity', 'sensor', { dc: 'humidity', w: ['living'] }), ent('illuminance', 'sensor', { dc: 'illuminance', w: ['living'] }), bool('room_render'),
        ],
        lists: [{ key: 'openings', label: (i) => i.name || i.entity, item: { fields: [txt('name'), ent('entity', 'binary_sensor'), sel('icon', ['window', 'door'])] } }],
      },
      {
        key: 'sound',
        fields: [
          ent('blinds.cover', 'cover', { w: ['living', 'blind'] }), ent('blinds.my_position', 'button'), txt('blinds.subtitle'),
          ent('speaker.media_player', 'media_player', { w: ['living', 'speaker', 'soundbar'] }), txt('speaker.label'), ent('speaker.night_sound', 'switch', { w: ['night'] }), ent('speaker.audio_format', 'sensor', { w: ['audio'] }),
        ],
      },
      {
        key: 'tv',
        fields: [
          ent('tv.media_player', 'media_player', { w: ['tv'] }), ent('streamers.selector', ['input_select', 'select']),
          ent('movie_mode.start', 'script', { w: ['movie'] }), ent('movie_mode.stop', 'script', { w: ['movie'] }), ent('movie_mode.flag', ['input_boolean', 'binary_sensor', 'switch'], { w: ['movie'] }), txt('movie_mode.on_text'),
        ],
        lists: [
          { key: 'tv.inputs', label: (i) => i.label || i.script, item: { fields: [txt('label'), ent('script', 'script'), txt('source')] } },
          { key: 'streamers.devices', label: (i) => i.name || i.media_player, item: { fields: [txt('name'), txt('option'), icon('icon', ['tv', 'play', 'film', 'music', 'home']), ent('media_player', 'media_player'), ent('remote', 'remote'), sel('launch', ['script', 'android'])] } },
        ],
      },
      {
        key: 'lights',
        fields: [ents('scene_off_lights', ['light', 'switch'])],
        lists: [
          { key: 'lights', label: (i) => i.name || i.entity, item: { fields: [txt('name'), ent('entity', ['light', 'switch']), icon('icon', ['bulb', 'lamp', 'spots']), bool('colour'), sel('render', ['none', 'uplighter', 'floor_lamp', 'ceiling', 'wall'])] } },
          { key: 'scenes', label: (i) => i.name || i.scene || i.helper, item: { fields: [txt('name'), icon('icon', ['fire', 'bulb', 'tree', 'lamp', 'moon', 'film', 'sun']), txt('colour'), ent('helper', 'input_boolean'), ent('scene', 'scene')] } },
        ],
      },
      {
        key: 'apps',
        lists: [{ key: 'apps', label: (i) => i.name, item: { fields: [txt('name'), icon('icon', ['play', 'tv', 'film', 'music', 'home', 'close']), txt('colour'), ent('script', 'script'), txt('package'), txt('app_id'), bool('close_all'), bool('send_home')] } }],
      },
    ],
  },
  {
    key: 'energy',
    groups: [
      {
        key: 'power',
        fields: [
          ent('solar_power', 'sensor', Object.assign({ w: ['solar', 'pv'] }, POWER)), ent('house_power', 'sensor', Object.assign({ w: ['house', 'home', 'load', 'consumption'] }, POWER)),
          ent('battery_power', 'sensor', Object.assign({ w: ['battery'] }, POWER)), sel('battery_power_positive', ['charging', 'discharging']),
          sel('grid.mode', ['entity', 'derived']), ent('grid.entity', 'sensor', Object.assign({ w: ['grid'] }, POWER)), sel('grid.positive', ['import', 'export']), ent('grid.inverter_ac', 'sensor', Object.assign({ w: ['inverter', 'ac'] }, POWER)),
          num('panels.rows', 1, 6), num('panels.columns', 1, 10),
        ],
        lists: [{ key: 'pv_strings', label: (i) => i.name || i.entity, item: { fields: [txt('name'), ent('entity', 'sensor', POWER), num('panels', 0, 60)] } }],
      },
      {
        key: 'battery',
        fields: [ents('battery.soc', 'sensor', { dc: 'battery', w: ['battery', 'soc'] }), ent('battery.capacity', 'sensor', { w: ['capacity'] }), num('battery.capacity_kwh', 0, 200, 0.1), num('battery.reserve_pct', 0, 100), num('battery.warranty_cycles', 0, 100000)],
        lists: [{ key: 'battery.packs', label: (i) => i.name, item: { fields: [txt('name'), ent('soc', 'sensor'), ent('health', 'sensor'), ent('cycles', 'sensor'), ent('temperature', 'sensor')] } }],
      },
      {
        key: 'today',
        fields: [
          ent('today.solar_yield', 'sensor', Object.assign({ w: ['solar', 'pv', 'yield'] }, ENERGY)), ent('today.house_use', 'sensor', Object.assign({ w: ['house', 'consumption'] }, ENERGY)),
          ent('today.grid_import', 'sensor', Object.assign({ w: ['import'] }, ENERGY)), ent('today.grid_export', 'sensor', Object.assign({ w: ['export'] }, ENERGY)),
          ent('today.battery_charged', 'sensor', Object.assign({ w: ['battery', 'charge'] }, ENERGY)), ent('today.net_cost', 'sensor', { dc: 'monetary', w: ['cost'] }), num('today.standing_charge', 0, 100, 0.01),
          ent('price', ['sensor', 'input_number'], { w: ['price', 'tariff', 'rate'] }),
        ],
      },
      {
        key: 'forecast',
        fields: [ents('forecast.days', 'sensor', { w: ['forecast'] }), ent('forecast.remaining_today', 'sensor', { w: ['forecast', 'remaining'] }), ent('forecast.peak_today', 'sensor', { dc: 'timestamp', w: ['peak'] }), ent('forecast.peak_tomorrow', 'sensor', { dc: 'timestamp', w: ['peak', 'tomorrow'] }), num('forecast.bands.0', 0, 200), num('forecast.bands.1', 0, 200)],
      },
      {
        key: 'consumers',
        fields: [
          ent('consumers.heat_pump.power', 'sensor', Object.assign({ w: ['heat_pump', 'heatpump'] }, POWER)), ent('consumers.heat_pump.today', 'sensor', Object.assign({ w: ['heat_pump', 'heatpump'] }, ENERGY)), ent('consumers.heat_pump.month', 'sensor', Object.assign({ w: ['heat_pump', 'month'] }, ENERGY)),
          csv('consumers.appliances'),
          ents('health.inverter_online_from', 'sensor'), ent('health.fault_count', 'sensor', { w: ['fault'] }), ent('health.operating_mode', ['sensor', 'select'], { w: ['mode'] }), ent('health.grid_mode', ['sensor', 'select'], { w: ['grid_mode'] }),
          ent('health.feed_in_mode', ['sensor', 'select'], { w: ['feed'] }), ent('health.frequency', 'sensor', { dc: 'frequency' }), ent('health.voltage', 'sensor', { dc: 'voltage' }), ent('health.inverter_temperature', 'sensor', Object.assign({ w: ['inverter'] }, TEMP)), ent('health.fossil_share', 'sensor', { w: ['fossil'] }),
        ],
      },
    ],
  },
  {
    key: 'climate',
    groups: [
      { key: 'weather', fields: [ent('weather', 'weather', {})] },
      {
        key: 'thermostats',
        fields: [
          ent('boost.start', 'script', { w: ['boost'] }), ent('boost.cancel', 'script', { w: ['boost', 'cancel'] }),
          ent('boost.timer', 'timer', { w: ['boost'] }), ent('boost.switch', ['switch', 'input_boolean'], { w: ['boost'] }), txt('boost.label'),
        ],
        lists: [{ key: 'thermostats', label: (i) => i.name || i.entity, detect: 'thermostats', item: { fields: [txt('name'), ent('entity', 'climate'), num('step', 0.1, 5, 0.1)] } }],
      },
      { key: 'rooms', lists: [{ key: 'rooms', label: (i) => i.name || i.temperature, detect: 'rooms', item: { fields: [txt('name'), ent('temperature', 'sensor', TEMP)] } }] },
    ],
  },
  {
    key: 'family',
    groups: [
      { key: 'lists', fields: [ent('shopping', 'todo', { w: ['shopping'] }), ent('todo', 'todo', { w: ['todo', 'to_do', 'chores', 'tasks'] }), bool('reminders')] },
      { key: 'calendars', lists: [{ key: 'calendars', max: 8, label: (i) => i.name || i.entity, detect: 'calendars', item: { fields: [txt('name'), ent('entity', 'calendar')] } }] },
      { key: 'bins', lists: [{ key: 'bins', label: (i) => i.label || i.entity, detect: 'bins', item: { fields: [txt('label'), ent('entity', 'calendar'), txt('colour')] } }] },
    ],
  },
  {
    key: 'security',
    groups: [
      {
        key: 'status',
        fields: [ent('alarm', 'alarm_control_panel', {}), ent('doorbell', 'binary_sensor', { w: ['doorbell', 'ring'] }), txt('presence_subtitle'), num('low_battery_pct', 1, 100), num('events_hours', 1, 72), num('event_rows', 1, 6), num('snapshot_seconds', 5, 600), num('live_seconds', 10, 1800)],
        lists: [
          { key: 'linked_panels', label: (i) => i.name, item: { fields: [txt('name'), ents('entities', null), txt('suffix'), bool('compare')] } },
          { key: 'hubs', label: (i) => i.name || i.entity, item: { fields: [txt('name'), ent('entity', null), txt('ok_state'), txt('ok_label')] } },
        ],
      },
      {
        key: 'openings',
        lists: [{ key: 'openings', label: (i) => i.area, detect: 'openings', item: { fields: [txt('area')], lists: [{ key: 'sensors', label: (i) => i.name || i.entity, item: { fields: [txt('name'), txt('label'), ent('entity', 'binary_sensor')] } }] } }],
      },
      {
        key: 'presence',
        lists: [{ key: 'presence', label: (i) => i.floor, detect: 'presence', item: { fields: [txt('floor')], lists: [{ key: 'rooms', label: (i) => i.name, item: { fields: [txt('name'), ents('entities', 'binary_sensor'), sel('wording', ['presence', 'motion'])] } }] } }],
      },
      {
        key: 'cameras',
        lists: [
          { key: 'cameras', max: 6, label: (i) => i.name || i.camera, detect: 'cameras', item: { fields: [txt('name'), ent('camera', 'camera'), ent('motion', 'binary_sensor'), ent('person', 'binary_sensor'), ent('pet', 'binary_sensor')] } },
          { key: 'batteries', label: (i) => i.name || i.entity, detect: 'batteries', item: { fields: [txt('name'), ent('entity', 'sensor')] } },
        ],
      },
    ],
  },
  {
    key: 'vacuum',
    groups: [{
      key: 'main',
      fields: [num('night_from', 0, 23), num('night_to', 0, 23)],
      lists: [{
        key: 'vacuums', max: 4, label: (i) => i.name || i.entity, detect: 'vacuums',
        item: {
          fields: [
            txt('name'), ent('entity', 'vacuum'), sel('integration', ['generic', 'dreame']), ent('battery', 'sensor', { dc: 'battery' }), ent('state_sensor', 'sensor'), ent('map_camera', 'camera'), txt('map_title'),
            ent('error', 'sensor'), ent('problem', 'binary_sensor'), ent('progress', 'sensor'), ent('current_room', 'sensor'), ent('last_run', 'sensor'), ent('last_area', 'sensor'), ent('last_time', 'sensor'),
            ent('clean_script.entity', 'script'), txt('clean_script.label'), txt('clean_script.confirm_title'), txt('clean_script.description'), txt('clean_script.toast'),
            ent('station_status', 'sensor'), ent('base_clean.days', 'sensor'), ent('base_clean.date', ['input_datetime', 'sensor']), ent('base_clean.reset_script', 'script'), num('base_clean.limit_days', 1, 90),
            num('thresholds.warn_pct', 0, 100), num('thresholds.low_pct', 0, 100), num('thresholds.low_battery', 0, 100),
          ],
          lists: [
            { key: 'settings', label: (i) => i.label || i.entity, item: { fields: [txt('label'), ent('entity', ['select', 'number']), sel('kind', ['mode', 'opt', 'wet', 'raw'])] } },
            { key: 'schedule', max: 3, label: (i) => i.label || i.automation, item: { fields: [ent('automation', 'automation'), txt('label'), txt('at'), csv('weekdays'), txt('detail')] } },
            { key: 'consumables', label: (i) => i.name, item: { fields: [txt('name'), ent('percent', 'sensor'), ent('hours_left', 'sensor')] } },
            { key: 'station', label: (i) => i.name, item: { fields: [txt('name'), ent('entity', 'sensor'), txt('ok_state'), txt('ok_label')] } },
          ],
        },
      }],
    }],
  },
  {
    key: 'system',
    groups: [{
      key: 'main',
      fields: [
        ent('host.uptime', 'sensor', { dc: 'timestamp', w: ['uptime', 'last_boot', 'boot'] }), ent('host.cpu', 'sensor', { unit: ['%'], w: ['processor', 'cpu'] }), ent('host.memory', 'sensor', { unit: ['%'], w: ['memory'] }),
        ent('host.disk', 'sensor', { unit: ['%'], w: ['disk'] }), ent('host.cpu_temperature', 'sensor', Object.assign({ w: ['processor', 'cpu'] }, TEMP)),
        ent('updates.core', 'update', { w: ['core'] }), ent('updates.os', 'update', { w: ['operating_system'] }), ent('updates.supervisor', 'update', { w: ['supervisor'] }),
        ent('backups.last', 'sensor', { dc: 'timestamp', w: ['backup', 'last'] }), ent('backups.next', 'sensor', { dc: 'timestamp', w: ['backup', 'next'] }), ent('backups.stale', 'binary_sensor', { w: ['backup', 'stale'] }),
        num('low_battery_pct', 1, 100), bool('debug_panel'),
      ],
      lists: [{ key: 'connections', label: (i) => i.name || i.entity, item: { fields: [txt('name'), ent('entity', null), txt('ok_state'), txt('ok_label'), txt('other_label')] } }],
    }],
  },
  {
    key: 'nova',
    groups: [{
      key: 'main',
      fields: [
        bool('enabled'), bool('header_pill'), { name: 'assist_pipeline', selector: { assist_pipeline: {} } }, txt('docs_url'),
        ent('entities.status', 'sensor', { w: ['nova', 'status'] }), ent('entities.quiet', 'binary_sensor', { w: ['nova', 'quiet'] }), ent('entities.nap_ends', 'sensor', { w: ['nova', 'nap'] }),
        ent('entities.lockdown', 'binary_sensor', { w: ['nova', 'lockdown'] }), ent('entities.reminders', 'sensor', { w: ['nova', 'reminder'] }), ent('entities.briefing', 'sensor', { w: ['nova', 'briefing'] }),
        ent('entities.suggestions', 'sensor', { w: ['nova', 'suggestion'] }), ent('entities.energy_note', 'sensor', { w: ['nova', 'energy'] }), ent('entities.camera_summary', 'sensor', { w: ['nova', 'camera'] }),
      ],
    }],
  },
];

/* Generic two-storey layout for "Start from example". No entities. */
export const EXAMPLE_HOUSE = {
  floors: [
    { name: 'Ground floor', rooms: [{ name: 'Living room', rect: [0, 0, 5, 6] }, { name: 'Kitchen', rect: [5, 0, 5, 3.5] }, { name: 'Hall', rect: [5, 3.5, 5, 2.5] }] },
    { name: 'First floor', rooms: [{ name: 'Bedroom 1', rect: [0, 0, 5, 6] }, { name: 'Bedroom 2', rect: [5, 0, 5, 3.2] }, { name: 'Bathroom', rect: [5, 3.2, 5, 2.8] }] },
  ],
};
