/* Generic mock Home Assistant states for the dev harness. Made-up entities only. */
const now = Date.now();
const iso = (min) => new Date(now + min * 60000).toISOString();

export const STATES = {
  // header
  'weather.home': ['cloudy', { temperature: 9, friendly_name: 'Home' }],
  'person.alex': ['home', { friendly_name: 'Alex' }],
  'person.sam': ['not_home', { friendly_name: 'Sam' }],
  'alarm_control_panel.house': ['disarmed', { friendly_name: 'House alarm' }],
  'binary_sensor.front_door': ['off', { device_class: 'door', friendly_name: 'Front door' }],
  // energy
  'sensor.solar_power': ['3400', { unit_of_measurement: 'W', device_class: 'power', state_class: 'measurement', friendly_name: 'Solar power' }],
  'sensor.house_power': ['600', { unit_of_measurement: 'W', device_class: 'power', state_class: 'measurement', friendly_name: 'House power' }],
  'sensor.battery_power': ['1500', { unit_of_measurement: 'W', device_class: 'power', state_class: 'measurement', friendly_name: 'Battery power' }],
  'sensor.grid_power': ['-1300', { unit_of_measurement: 'W', device_class: 'power', state_class: 'measurement', friendly_name: 'Grid power' }],
  'sensor.battery_level': ['62', { unit_of_measurement: '%', device_class: 'battery', friendly_name: 'Home battery' }],
  'sensor.solar_energy_today': ['14.8', { unit_of_measurement: 'kWh', device_class: 'energy', friendly_name: 'Solar today' }],
  'sensor.grid_import_today': ['1.2', { unit_of_measurement: 'kWh', device_class: 'energy', friendly_name: 'Grid import today' }],
  'sensor.grid_export_today': ['6.1', { unit_of_measurement: 'kWh', device_class: 'energy', friendly_name: 'Grid export today' }],
  'sensor.energy_cost_today': ['-0.84', { unit_of_measurement: 'GBP', friendly_name: 'Energy cost today' }],
  'sensor.forecast_remaining_today': ['6.4', { unit_of_measurement: 'kWh', device_class: 'energy', friendly_name: 'Forecast left today' }],
  'sensor.forecast_tomorrow': ['16.2', { unit_of_measurement: 'kWh', device_class: 'energy', friendly_name: 'Forecast tomorrow' }],
  'sensor.water_today': ['67', { unit_of_measurement: 'L', friendly_name: 'Water today' }],
  'input_number.electricity_price': ['0.24', { friendly_name: 'Electricity price' }],
  'sensor.pv_east_power': ['2400', { unit_of_measurement: 'W', device_class: 'power', state_class: 'measurement', friendly_name: 'PV east' }],
  'sensor.pv_west_power': ['1000', { unit_of_measurement: 'W', device_class: 'power', state_class: 'measurement', friendly_name: 'PV west' }],
  'sensor.forecast_today': ['19.8', { unit_of_measurement: 'kWh', device_class: 'energy', friendly_name: 'Forecast today' }],
  'sensor.forecast_day_3': ['9.1', { unit_of_measurement: 'kWh', device_class: 'energy', friendly_name: 'Forecast day 3' }],
  'sensor.forecast_day_4': ['22.4', { unit_of_measurement: 'kWh', device_class: 'energy', friendly_name: 'Forecast day 4' }],
  'sensor.heatpump_power': ['420', { unit_of_measurement: 'W', device_class: 'power', state_class: 'measurement', friendly_name: 'Heat pump' }],
  'sensor.heat_pump_energy_today': ['3.6', { unit_of_measurement: 'kWh', device_class: 'energy', friendly_name: 'Heat pump today' }],
  'sensor.grid_frequency': ['50.02', { unit_of_measurement: 'Hz', friendly_name: 'Grid frequency' }],
  // home room panel
  'binary_sensor.kitchen_occupancy': ['on', { device_class: 'motion', friendly_name: 'Kitchen motion' }],
  'light.kitchen': ['on', { friendly_name: 'Kitchen ceiling', brightness: 200 }],
  'light.kitchen_counter': ['off', { friendly_name: 'Counter' }],
  'switch.kitchen_hood': ['off', { friendly_name: 'Hood' }],
  'climate.home': ['heat', { friendly_name: 'Heating', temperature: 20, current_temperature: 20.5, hvac_action: 'idle', min_temp: 5, max_temp: 30 }],
  'climate.upstairs': ['heat', { friendly_name: 'Upstairs', temperature: 19, current_temperature: 19.5, hvac_action: 'heating', min_temp: 5, max_temp: 30 }],
  'script.heating_boost': ['off', { friendly_name: 'Heating boost' }],
  'script.heating_boost_cancel': ['off', { friendly_name: 'Cancel boost' }],
  'timer.heating_boost': ['idle', { friendly_name: 'Boost timer' }],
  'sensor.washer_state': ['run', { friendly_name: 'Washer' }],
  'sensor.washer_finish': [iso(42), { device_class: 'timestamp', friendly_name: 'Washer finish' }],
  'sensor.dishwasher_state': ['idle', { friendly_name: 'Dishwasher' }],
  'sensor.oven_state': ['running', { friendly_name: 'Oven' }],
  'sensor.oven_current_temp': ['120', { unit_of_measurement: '°C', friendly_name: 'Oven temperature' }],
  'sensor.oven_target_temp': ['180', { unit_of_measurement: '°C', friendly_name: 'Oven setpoint' }],
  'binary_sensor.fridge_door': ['off', { device_class: 'door', friendly_name: 'Fridge door' }],
  'sensor.fridge_temperature': ['4', { unit_of_measurement: '°C', friendly_name: 'Fridge' }],
  'sensor.freezer_temperature': ['-18', { unit_of_measurement: '°C', friendly_name: 'Freezer' }],
  'script.dinner_ready': ['off', { friendly_name: 'Dinner is ready' }],
  'todo.shopping': ['4', { friendly_name: 'Shopping list' }],
  'vacuum.robot': ['docked', { friendly_name: 'Robot vacuum', battery_level: 100 }],
  // living room
  'sensor.living_room_humidity': ['47', { unit_of_measurement: '%', friendly_name: 'Living room humidity' }],
  'binary_sensor.living_room_window': ['off', { device_class: 'window', friendly_name: 'Living room window' }],
  'binary_sensor.patio_door': ['on', { device_class: 'door', friendly_name: 'Patio door' }],
  'cover.lounge_blinds': ['open', { friendly_name: 'Blinds' }],
  'media_player.living_room_speaker': ['playing', { friendly_name: 'Speaker', volume_level: 0.3, source: 'TV' }],
  'media_player.tv': ['on', { friendly_name: 'TV', source: 'HDMI 1' }],
  'media_player.streamer': ['playing', { friendly_name: 'Streamer', app_id: 'com.example.video', app_name: 'Video' }],
  'remote.streamer': ['on', { friendly_name: 'Streamer remote', current_activity: 'com.example.video' }],
  'scene.relax': ['2026-10-25T18:00:00+00:00', { friendly_name: 'Relax' }],
  'scene.bright': ['2026-10-25T18:00:00+00:00', { friendly_name: 'Bright' }],
  'light.living_room_ceiling': ['on', { friendly_name: 'Ceiling', brightness: 180, color_mode: 'color_temp', color_temp_kelvin: 2700 }],
  'light.living_room_lamp': ['off', { friendly_name: 'Floor lamp' }],
  'script.tv_hdmi_1': ['off', {}], 'script.tv_hdmi_2': ['off', {}],
  // security
  'binary_sensor.landing_motion': ['off', { device_class: 'motion', friendly_name: 'Landing motion' }],
  'camera.front': ['idle', { friendly_name: 'Front' }],
  'camera.garden': ['unavailable', { friendly_name: 'Garden' }],
  'binary_sensor.front_motion': ['on', { device_class: 'motion' }],
  'binary_sensor.front_person': ['off', { device_class: 'occupancy' }],
  'binary_sensor.garden_motion': ['off', { device_class: 'motion' }],
  'binary_sensor.doorbell': ['off', {}],
  'sensor.front_door_battery': ['84', { unit_of_measurement: '%', device_class: 'battery' }],
  'sensor.landing_motion_battery': ['22', { unit_of_measurement: '%', device_class: 'battery' }],
  'binary_sensor.alarm_hub_connected': ['on', { device_class: 'connectivity' }],
  // vacuum
  'vacuum.upstairs': ['cleaning', { friendly_name: 'Upstairs vacuum', battery_level: 64, fan_speed: 'standard' }],
  'select.robot_suction': ['standard', { friendly_name: 'Suction', options: ['quiet', 'standard', 'strong', 'max'] }],
  'automation.vacuum_weekdays': ['on', { friendly_name: 'Vacuum on weekdays', last_triggered: iso(-60 * 30) }],
  'sensor.robot_last_clean': [iso(-60 * 30), { device_class: 'timestamp' }],
  // system
  'sensor.uptime': [iso(-60 * 24 * 3 - 200), { device_class: 'timestamp' }],
  'sensor.processor_use': ['18', { unit_of_measurement: '%' }],
  'sensor.memory_use': ['41', { unit_of_measurement: '%' }],
  'sensor.disk_use': ['77', { unit_of_measurement: '%' }],
  'sensor.processor_temperature': ['52', { unit_of_measurement: '°C' }],
  'update.home_assistant_core_update': ['off', { installed_version: '2026.10.4' }],
  'update.some_addon': ['on', { friendly_name: 'Some add-on' }],
  'sensor.backup_last': [iso(-600), { device_class: 'timestamp' }],
  'sensor.backup_next': [iso(500), { device_class: 'timestamp' }],
  'sensor.remote_battery': ['12', { unit_of_measurement: '%', device_class: 'battery', friendly_name: 'TV remote battery' }],
  'light.garage': ['unavailable', { friendly_name: 'Garage light' }],
  // house rooms
  'sensor.living_room_temperature': ['21.2', { unit_of_measurement: '°C', friendly_name: 'Living room temperature' }],
  'sensor.kitchen_temperature': ['20.4', { unit_of_measurement: '°C', friendly_name: 'Kitchen temperature' }],
  'sensor.bedroom_temperature': ['18.9', { unit_of_measurement: '°C', friendly_name: 'Bedroom temperature' }],
  'binary_sensor.living_room_presence': ['off', { device_class: 'occupancy', friendly_name: 'Living room presence' }],
  'binary_sensor.kitchen_presence': ['on', { device_class: 'occupancy', friendly_name: 'Kitchen presence' }],
  'binary_sensor.bedroom_presence': ['off', { device_class: 'occupancy', friendly_name: 'Bedroom presence' }],
};

export function mkStates(over) {
  const o = {};
  for (const [k, v] of Object.entries(Object.assign({}, STATES, over || {}))) {
    o[k] = { entity_id: k, state: v[0], attributes: v[1] || {}, last_changed: new Date().toISOString(), last_updated: new Date().toISOString() };
  }
  return o;
}

/* Browser-side callWS mock, as source text: history for power sensors, a small shopping list. */
export const CALLWS_SRC = `async (m) => {
  window.__ws.push(m && m.type);
  if (m && m.type === 'history/history_during_period') {
    const out = {}, t1 = Date.parse(m.end_time) / 1000, t0 = Date.parse(m.start_time) / 1000;
    (m.entity_ids || []).forEach((id) => {
      const sol = /solar/.test(id), a = [];
      for (let t = t0; t <= t1; t += 900) {
        const h = ((t % 86400) / 3600 + 1) % 24;
        const w = sol ? Math.max(0, Math.sin((h - 6.5) / 12.5 * Math.PI)) * 3800
          : (300 + Math.max(0, Math.sin((h - 6) / 3 * Math.PI)) * (h < 9.5 ? 900 : 0) + (h > 16 && h < 22 ? 1300 * Math.sin((h - 16) / 6 * Math.PI) : 0) + (h > 11 && h < 14 ? 400 : 0));
        a.push({ s: String(Math.round(w)), lu: t });
      }
      out[id] = a;
    });
    return out;
  }
  if (m && m.type === 'todo/item/list') return { items: [ { uid: '1', summary: 'Milk', status: 'needs_action' }, { uid: '2', summary: 'Bread', status: 'needs_action' }, { uid: '3', summary: 'Eggs', status: 'completed' } ] };
  if (m && m.type === 'logbook/get_events') return [];
  return {};
}`;
