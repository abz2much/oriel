# Oriel

A wall-tablet dashboard for Home Assistant, in one custom card. Frosted glass in twelve colour themes (taupe and sage by default), and a 3D glass house on the home screen that shows who is in which room and where your power is flowing.

Every page and every section is optional. You set it up with a visual editor; YAML still works.

![Oriel home screen with example data](docs/screenshots/full-home.jpg)

## What you get

| Page | What it shows |
|---|---|
| **Home** | Greeting, weather, clock, people, an energy card with today vs yesterday, Today tiles, quick actions, a room panel (lights, heating, appliances, fridge), a shopping list, camera pop-ups, and the glass house with room temperatures, presence and live power flow. |
| **Living room** | Room status, doors and windows, blinds, speaker, scenes, lights with brightness/white/colour, streamer selector, now playing, TV inputs, movie mode, apps and a remote. |
| **Energy** | Live flow between solar, house, battery and grid, battery card with packs, today's totals, a house-use chart, solar forecast, big consumers and an inverter health strip. Read-only. |
| **Security** | Alarm status, doors and windows, presence by floor, camera snapshots with live view on tap, recent events and device health. Read-only: it never arms, disarms or unlocks anything. |
| **Vacuum** | One or more robot vacuums: status, controls with confirm steps, cleaning settings, schedule, and for Dreame vacuums the room map, parts and base station. |
| **Nova** | Chat and controls for the separate Nova assistant integration. Off unless you turn it on. |
| **System** | Home Assistant and host status, backups, connections, low batteries, unavailable entities, tablet buttons, the Oriel version and an optional debug panel. Always shown. |

A page appears in the side rail only once at least one of its entities is set.

<table>
<tr><td><img src="docs/screenshots/full-living.jpg" alt="Living room page"></td><td><img src="docs/screenshots/full-energy.jpg" alt="Energy page"></td></tr>
<tr><td><img src="docs/screenshots/full-security.jpg" alt="Security page"></td><td><img src="docs/screenshots/full-vacuum.jpg" alt="Vacuum page"></td></tr>
<tr><td><img src="docs/screenshots/full-system.jpg" alt="System page with the debug panel"></td><td><img src="docs/screenshots/empty-home.jpg" alt="Home with nothing configured"></td></tr>
</table>

All screenshots use made-up example data from the dev harness.

## Themes

Twelve colour themes. **Classic** is the default and is Oriel's original look. Pick one in the editor (**General › Theme**), or in YAML:

```yaml
general:
  theme: ember        # a theme id from the table
  accent: "#2457ff"   # optional: your own accent colour
```

| Theme | `theme` | Style | Colours |
|---|---|---|---|
| Classic | `classic` | Light | default: taupe glass, sage accent |
| Midnight Signal | `midnight-signal` | Dark | navy, neon green |
| Plum Dusk | `plum-dusk` | Dark | inkberry, peach |
| Cocoa Bark | `cocoa-bark` | Dark, warm | deep cocoa, soft tan |
| Forest Mint | `forest-mint` | Dark | forest graphite, acid mint |
| Deep Teal | `deep-teal` | Dark | cyber teal, aqua foam |
| Slate Harbour | `slate-harbour` | Dark | charcoal blue-grey, soft slate |
| Violet Mist | `violet-mist` | Light | mist grey, signal violet |
| Berry Sky | `berry-sky` | Light | pale sky, raspberry |
| Quantum Ice | `quantum-ice` | Light | ice glass, quantum blue |
| Pine Mist | `pine-mist` | Light | pale mint, deep pine |
| Ember | `ember` | Light | porcelain, neon orange |

<table>
<tr><td><img src="docs/screenshots/themes/classic.jpg" alt="Classic theme"><br>Classic</td><td><img src="docs/screenshots/themes/midnight-signal.jpg" alt="Midnight Signal theme"><br>Midnight Signal</td><td><img src="docs/screenshots/themes/plum-dusk.jpg" alt="Plum Dusk theme"><br>Plum Dusk</td></tr>
<tr><td><img src="docs/screenshots/themes/cocoa-bark.jpg" alt="Cocoa Bark theme"><br>Cocoa Bark</td><td><img src="docs/screenshots/themes/forest-mint.jpg" alt="Forest Mint theme"><br>Forest Mint</td><td><img src="docs/screenshots/themes/deep-teal.jpg" alt="Deep Teal theme"><br>Deep Teal</td></tr>
<tr><td><img src="docs/screenshots/themes/slate-harbour.jpg" alt="Slate Harbour theme"><br>Slate Harbour</td><td><img src="docs/screenshots/themes/violet-mist.jpg" alt="Violet Mist theme"><br>Violet Mist</td><td><img src="docs/screenshots/themes/berry-sky.jpg" alt="Berry Sky theme"><br>Berry Sky</td></tr>
<tr><td><img src="docs/screenshots/themes/quantum-ice.jpg" alt="Quantum Ice theme"><br>Quantum Ice</td><td><img src="docs/screenshots/themes/pine-mist.jpg" alt="Pine Mist theme"><br>Pine Mist</td><td><img src="docs/screenshots/themes/ember.jpg" alt="Ember theme"><br>Ember</td></tr>
</table>

- **Accent override:** `general.accent` takes any hex colour. Oriel rebuilds the accent family from it (fills, toggles, accent text, and text on accent fills) so it stays readable.
- **Fixed colours:** some colours stay the same in every theme because they carry meaning or are part of a picture. These are the alarm and vacuum state colours, energy sources (solar yellow, grid blue and so on), light colour swatches, camera overlays and the Living room illustration.
- **Contrast:** every theme except Classic is checked by script for 4.5:1 on body text and 3:1 on large text and icons (`node dev/contrast.mjs`). Classic keeps its original look, so some of its soft and coloured text is lower contrast than in the other themes.
- **An unknown theme id** shows Classic on the tablet, and the editor warns you. An accent that is not a hex colour is ignored, with a warning.
- **Future idea:** a dim mode for night. Neon accents (Midnight Signal, Forest Mint) can glare on a wall tablet in a dark room.

## Requirements

- Home Assistant 2024.1 or newer (set as the minimum; older versions have not been tested).
- A landscape screen. Oriel draws a 1280 × 800 canvas and widens it up to 1700 wide to fill the screen, then scales it to fit. It is built for wall tablets from about 1280 × 800 up to 1700 wide. It is not designed for phones.

## Install

### HACS (custom repository)

1. In Home Assistant open **HACS**, then the three-dot menu, then **Custom repositories**.
2. Add `https://github.com/abz2much/oriel` with the type **Dashboard**.
3. Find **Oriel** in HACS, download it, and reload your browser when asked.

HACS adds the resource for you.

### Manual

1. Download `oriel.js` from the latest release (or `dist/oriel.js` in this repository).
2. Copy it to `/config/www/oriel/oriel.js`.
3. In **Settings › Dashboards › ⋮ › Resources**, add `/local/oriel/oriel.js?v=0.2.3` as a **JavaScript module**. Raise the `?v=` number each time you update the file, then hard-refresh the tablet.

## Quick start

1. Create a new dashboard (**Settings › Dashboards › Add dashboard**), open it, choose **Edit dashboard**, and switch the view type to **Panel (single card)**.
2. Add a card and choose **Oriel** (or type `type: custom:oriel-shell` in a manual card).
3. In the editor, open a section and press **Auto-detect**, tick the suggestions you want, then fill in the rest. Save.

With nothing set you get the greeting, the clock, a plain glass house and the System page. Add things one section at a time.

## The editor

- **Sections** fold open and closed: General, Home, Living room, Energy, Security, Vacuum, System, Nova. Big sections have tabs.
- **Lists** (lights, tiles, cameras, rooms…) take any number of items: add, remove, drag to reorder, or use the up and down buttons.
- **Auto-detect** looks at your entities (domain, device class, unit and words in the name) and suggests matches. Strong matches are ticked, weak ones are not. Nothing changes until you press **Apply**, and fields you have already filled are never touched.
- **Warnings** appear as you type when an entity does not exist, is the wrong type for the field, or is not a valid entity ID. They never stop you saving; a missing entity just shows “–” on the tablet.
- **Theme** (in General) is a dropdown of the themes with small colour previews, plus an accent colour. Changes show at once in the preview.
- **Show code editor** (Home Assistant's own button) switches to YAML at any time.

## Configuration reference

Every key is optional. Entity fields take an entity ID; the expected domain is in brackets. A full example with made-up entities is in [`docs/example.yaml`](docs/example.yaml).

```yaml
type: custom:oriel-shell
general: { ... }
home: { ... }
living: { ... }
energy: { ... }
security: { ... }
vacuum: { ... }
system: { ... }
nova: { ... }
```

### general

| Key | Type | Default | What it does |
|---|---|---|---|
| `weather` | entity (weather) | – | Weather chip in the header. |
| `weather_label` | text | “Outside” | Text before the temperature. |
| `people` | list of entities (person) | `[]` | One chip per person. Hidden when empty. |
| `people_display` | `initial` \| `name` \| `hidden` | `initial` | How people chips are labelled. |
| `alarm` | entity (alarm_control_panel) | – | Header button; also the Security page's panel unless `security.alarm` is set. |
| `front_door` | entity (binary_sensor) | – | Header door button; turns red when open. |
| `clock` | true/false | `true` | Clock chip. |
| `currency` | text | `auto` | `auto` uses Home Assistant's currency; or a code such as `GBP`. |
| `settings_path` | text | `/config` | Where the System page's settings button goes. |
| `kiosk_path` | text | current page | Dashboard path used by “Show header and sidebar”. |
| `theme` | theme id | `classic` | Colour theme; see [Themes](#themes). An unknown id falls back to Classic. |
| `accent` | hex colour | – | Optional accent colour that replaces the theme's own, such as `"#2457ff"`. |
| `pages_order` | list | home, living, energy, security, vacuum, nova | Order of pages in the rail (YAML only). System always sits at the bottom. |

### home

| Key | Type | What it does |
|---|---|---|
| `energy_card.solar_power` | entity (sensor, W or kW) | Solar now. |
| `energy_card.house_power` | entity (sensor, W or kW) | House use now; also feeds the “kWh used today” chart (from history). |
| `energy_card.battery_soc` | entity (sensor, %) | Battery charge. |
| `price` | entity (sensor or input_number) | Price chip on the Today card. |
| `today` | list, up to 9 | Tiles: `label`, `icon`, `entity`, `tone` (`neutral`, `good`, `bad`). |
| `quick_actions` | list, up to 4 | `type` (`script`, `shopping`, `more_info`), `label`, `icon`, `entity`, `subtitle`, `primary` (green). |
| `shopping` | entity (todo) | Shopping list opened by a `shopping` quick action. |
| `room_panel.title` | text | Right-hand panel title, e.g. your kitchen. |
| `room_panel.motion` | entity (binary_sensor) | Motion chip. |
| `room_panel.lights` | list | `name`, `entity` (light or switch), `icon`, `all_off` (include in “All lights off”, default true). |
| `room_panel.heating` | list | `name`, `entity` (climate), `step` (default 0.5). |
| `room_panel.boost` | object | Heating boost button: `start` and `cancel` (script), `timer` (timer), `switch`, `label`. |
| `room_panel.appliances` | list | `name`, `icon`, `colour`, `kind` (`machine` or `cooktop`), `state`, `finish` (timestamp sensor), `run_states`, `pause_states`, `door`, `temperature`, `setpoint`, `burners` (cooktop), `tap_script`. Glows in its colour while running. |
| `room_panel.fridge` | object | `door`, `fridge_temp`, `freezer_temp`. |
| `camera_popups` | list | `flag` (input_boolean or binary_sensor), `camera`, `title`. When the flag turns on, a live view pops up. |
| `house` | object | The glass house. See [The house](#the-house). |

### living

| Key | Type | What it does |
|---|---|---|
| `title` | text | Page title (default “Living room”). |
| `presence`, `temperature`, `humidity`, `illuminance` | entities | Room status chips. |
| `room_render` | true/false | The small room drawing (default true). |
| `openings` | list | `name`, `entity` (binary_sensor), `icon` (`window` or `door`). |
| `blinds` | object | `cover`, `my_position` (button), `subtitle`. |
| `speaker` | object | `media_player`, `label`, `night_sound` (switch), `audio_format` (sensor). |
| `tv` | object | `media_player`, `inputs` (list of `label`, `script`, `source`), `source_labels` (map of TV source value to a friendly name). |
| `streamers` | object | `selector` (input_select, needed for two or more), `devices` (list of `name`, `option`, `icon`, `media_player`, `remote`, `launch`: `script` or `android`). |
| `movie_mode` | object | `start`, `stop` (scripts), `flag`, `on_text`. |
| `lights` | list | `name`, `entity`, `icon`, `colour` (shows the tune panel), `render` (`uplighter`, `floor_lamp`, `ceiling`, `wall` or `none`: where it glows in the drawing). |
| `scenes` | list | `name`, `icon`, `colour`, and either `helper` (input_boolean, toggled) or `scene`. |
| `scene_off_lights` | list of entities | Lights a scene turns off on a second tap (default: all lights above). |
| `apps` | list | `name`, `icon`, `colour`, `script` (for `script` streamers), `package` (Android app, for `android` streamers), `app_id` (to spot it running), `close_all`, `send_home`. |

### energy

| Key | Type | What it does |
|---|---|---|
| `solar_power`, `house_power` | entity (sensor, W or kW) | Live flow. Falls back to the Home energy card's entities. |
| `battery_power` | entity (sensor) | Battery flow; `battery_power_positive`: `charging` (default) or `discharging`. |
| `grid.mode` | `entity` \| `derived` | `entity`: one grid sensor (`grid.entity`, with `grid.positive`: `import` or `export`). `derived`: grid = house power + `grid.inverter_ac`. |
| `pv_strings` | list | `name`, `entity`, `panels` (how many panels belong to this string). |
| `panels` | object | `rows` (default 3) and `columns` (default 5) of the drawn array. |
| `battery` | object | `soc` (list, averaged), `capacity` (sensor) or `capacity_kwh`, `reserve_pct` (default 10), `warranty_cycles`, `packs` (list of `name`, `soc`, `health`, `cycles`, `temperature`). |
| `today` | object | `solar_yield`, `house_use`, `grid_import`, `grid_export`, `battery_charged`, `net_cost`, `standing_charge` (number). |
| `price` | entity | Price per kWh. |
| `forecast` | object | `days` (list, today first, up to 8), `remaining_today`, `peak_today`, `peak_tomorrow`, `bands` (default `[10, 20]` kWh). |
| `consumers` | object | `heat_pump` (`power`, `today`, `month`) and `appliances` (names from `home.room_panel.appliances`). |
| `health` | object | `inverter_online_from` (list), `fault_count`, `operating_mode`, `grid_mode`, `feed_in_mode`, `frequency`, `voltage`, `inverter_temperature`, `fossil_share`. Each chip shows only when set. |

### security

| Key | Type | What it does |
|---|---|---|
| `alarm` | entity (alarm_control_panel) | Main panel (default: `general.alarm`). |
| `linked_panels` | list | Small chips for other panels: `name`, `entities`, `suffix`, `compare` (amber if it disagrees with the alarm for over a minute). |
| `hubs` | list | Status lines: `name`, `entity`, `ok_state`, `ok_label`. |
| `openings` | list | Areas: `area`, `sensors` (list of `name`, `label` used in sentences, `entity`). |
| `presence` | list | Floors: `floor`, `rooms` (list of `name`, `entities`, `wording`: `presence` or `motion`). |
| `cameras` | list, up to 6 | `name`, `camera`, `motion`, `person`, `pet`. |
| `doorbell` | entity (binary_sensor) | Shown in recent events. |
| `batteries` | list | `name`, `entity`. The five lowest are shown. |
| `low_battery_pct` | number | Default 30. |
| `snapshot_seconds`, `live_seconds` | numbers | Snapshot refresh (30) and live view limit (120). |
| `events_hours`, `event_rows` | numbers | Event window (12) and rows shown (4). |

### vacuum

| Key | Type | What it does |
|---|---|---|
| `night_from`, `night_to` | hours | The confirm step warns “It is night” between these (22 and 8). |
| `vacuums` | list, up to 4 | The first gets the full page, the others a small card each. |

Each vacuum: `name`, `entity` (vacuum), `integration` (`generic` or `dreame`), `battery`, `state_sensor`, `map_camera`, `map_title`, `error`, `problem`, `progress`, `current_room`, `last_run`, `last_area`, `last_time`, `settings` (list of `label`, `entity`, `kind`: `mode`, `opt`, `wet`, `raw`), `clean_script` (`entity`, `label`, `confirm_title`, `description`, `toast`), `schedule` (list of `automation`, `label`, `at`, `weekdays`, `detail`), `consumables` (list of `name`, `percent`, `hours_left`), `station` (list of `name`, `entity`, `ok_state`, `ok_label`), `station_status`, `base_clean` (`days`, `date`, `reset_script`, `limit_days`), `thresholds` (`warn_pct`, `low_pct`, `low_battery`).

`integration: dreame` turns on the room map and room cleaning (it reads the map camera's `rooms` attribute and calls `dreame_vacuum.vacuum_clean_segment`). Starting, resuming and room cleaning always ask first.

### system

| Key | Type | What it does |
|---|---|---|
| `host` | object | `uptime`, `cpu`, `memory`, `disk`, `cpu_temperature`. |
| `updates` | object | `core`, `os`, `supervisor` (update entities, for version numbers). Pending updates are counted automatically. |
| `backups` | object | `last`, `next`, `stale`. |
| `connections` | list | `name`, `entity`, `ok_state`, `ok_label`, `other_label`. |
| `low_battery_pct` | number | Default 20. |
| `debug_panel` | true/false | Lists every configured entity that is missing, unavailable or unknown. |

### nova

| Key | Type | What it does |
|---|---|---|
| `enabled` | true/false | Default `false`. When off there is no Nova page, header pill, Home chat or call to Nova. |
| `header_pill`, `home_chat` | true/false | Default `true` (only when enabled and detected). |
| `assist_pipeline` | Assist pipeline | Used by the microphone button. |
| `docs_url` | text | Link shown when Nova is not detected. |
| `entities` | object | `status`, `quiet`, `nap_ends`, `lockdown`, `reminders`, `briefing`, `suggestions`, `energy_note`, `camera_summary`. |

## The house

The house on Home is drawn from `home.house`. Rooms are rectangles on a grid you choose: `rect: [x, y, width, depth]`, where x runs left to right and y runs from the back of the house to the front. Up to two floors are drawn. The plan is scaled to fit, so any unit works.

```yaml
home:
  house:
    floors:
      - name: Ground floor
        rooms:
          - name: Living room
            rect: [0, 0, 5, 6]
            temperature: sensor.living_room_temperature
            presence: binary_sensor.living_room_presence
          - name: Kitchen
            rect: [5, 0, 5, 3.5]
            temperature: sensor.kitchen_temperature
            presence: binary_sensor.kitchen_presence
          - { name: Hall, rect: [5, 3.5, 5, 2.5] }
      - name: First floor
        rooms:
          - { name: Bedroom 1, rect: [0, 0, 5, 6] }
          - { name: Bedroom 2, rect: [5, 0, 5, 3.2] }
          - { name: Bathroom, rect: [5, 3.2, 5, 2.8] }
```

- A room with a temperature or presence sensor gets a name pill; its floor turns sage while someone is there. `pill: false` hides it, `pill_offset: [x, y]` nudges it in screen pixels.
- Two rooms may share a presence sensor (for example kitchen and dining) to light up together.
- `colour` sets a room's floor shade. `mirror: true` flips the plan left to right. `roof: false` hides the roof.
- Solar panels appear on the roof when a solar power entity is set (`solar_panels: false` hides them). The inverter, battery and grid pole appear when the matching energy entities are set (`energy_kit: false` hides them).
- `furniture` (optional) is a list of boxes, `{ rect: [...], floor: 0, height: 10 }`, or stairs, `{ type: stairs, rect: [...], steps: 7 }`.
- No plan at all gives a plain two-storey glass outline. The editor has **Start from example** to begin from the layout above.

## Nova

Nova is a separate Home Assistant integration: a general AI assistant that answers anything, not only questions about the house. It lives in its own repository and is not part of Oriel. Documentation: [NOVA DOCS LINK].

Oriel uses Nova only when `nova.enabled: true` **and** Nova is found in Home Assistant (its `nova` services exist). Then it adds the Nova page, a status pill in the header and a chat panel on Home. If Nova is turned on but not installed, the Nova page says “Nova not detected” and nothing is sent to it.

![Nova page when Nova is turned on but not installed](docs/screenshots/nova-not-installed-nova.jpg)

What Oriel uses from Nova: the websocket commands `nova/chat` and `nova/chat_new`, the services `nova.nap`, `nova.shush`, `nova.unshush`, `nova.lockdown`, `nova.briefing`, `nova.add_reminder`, `nova.suggestion_accept`, `nova.suggestion_dismiss`, and the sensors you list under `nova.entities`.

## Wall tablet setup

- **Hide Home Assistant's header and sidebar** with [kiosk-mode](https://github.com/NemesisRE/kiosk-mode) from HACS. Add `kiosk_mode: { kiosk: true }` to the dashboard's raw config (**Edit dashboard › ⋮ › Raw configuration editor**).
- **Get them back** by adding `?disable_km` to the dashboard URL, or press **Show header and sidebar** on Oriel's System page.
- **Panel view**: Oriel is meant to be the only card on a panel view, so it can fill the screen.
- **Screen size**: designed for landscape tablets from about 1280 × 800 up to 1700 wide. Larger screens scale up; very tall or narrow screens get bands at the edges.
- Keep the screen awake and the browser full screen with your tablet's own kiosk browser or settings.

## Privacy and safety

- No remote requests: the Outfit font is bundled in the file, icons are inline SVG, and nothing is loaded from the internet.
- The Security and Energy pages are read-only. Oriel never arms, disarms, unlocks or opens anything.
- Vacuum starts, room cleaning and resets always ask for confirmation, with an extra warning at night.
- No names are shown for who changed the alarm, only whether it was automatic.

## Troubleshooting

| Problem | What to try |
|---|---|
| A value shows “–” | The entity is missing, unavailable or not a number. Turn on `system.debug_panel` to list every configured entity with a problem. |
| A page is missing from the rail | It has no entities set. Set at least one in its section. |
| The card does not appear in the card picker | The resource is not loaded. Check **Settings › Dashboards › Resources**, then hard-refresh. |
| An update does not show | Raise the `?v=` number on the resource (manual install) and hard-refresh the tablet. |
| The visual editor says its form components did not load | Use **Show code editor**; every option is listed above. |
| Nova page says “Nova not detected” | Install the Nova integration, or turn `nova.enabled` off. |
| Live camera view does not start | Oriel uses `webrtc-camera` if installed, otherwise Home Assistant's own live view. Check the camera works in Home Assistant first. |
| The house pills overlap | Nudge them with `pill_offset`. |

Open the browser console and look for lines starting with `[oriel]` for details.

## Accessibility

All controls are real buttons with labels, there is a visible focus ring for keyboard use, list items can be reordered with buttons as well as by dragging, and animations stop when the system asks for reduced motion.

## Development

```bash
npm install
npx playwright install chromium   # once, for the harness
npm run build                     # dist/oriel.js (minified); npm run dev for a readable build
npm test                          # version check, card in every dev config, editor checks
npm run shots                     # screenshots of every page to dev/out/
```

- `dev/mock.mjs` holds made-up states; `dev/configs/` holds the test configs (empty, minimal, full, Nova not installed).
- `dev/fake-ha-form.js` is a plain stand-in for Home Assistant's `ha-form`, so the editor can be tested without Home Assistant. It does not look like the real thing.
- Colours live in `src/theme/`: `tokens.js` (the CSS variables and Classic's values), `themes.js` (the themes and the rules that build them from two seed colours) and `fixed.js` (colours that never change). No other file holds a colour.
- `node dev/theme-shots.mjs <theme ...>` screenshots every page and pop-up per theme with a frozen clock; `node dev/sheet.mjs <theme ...>` makes a contact sheet; `node dev/themediff.mjs <before> <after>` compares two runs pixel by pixel; `node dev/contrast.mjs` writes the contrast report.
- User-facing text lives in `src/strings.js` (UK English). Pages live in `src/pages/`, the editor in `src/editor/`.
- `dist/oriel.js` is committed, because HACS installs from it. CI fails if it is out of date.

Releases are made by the release workflow: bump the version in `package.json`, `src/version.js` and `CHANGELOG.md`, merge to `main`, and the workflow builds, tests, tags and publishes the release.

## Licence

MIT, see [LICENSE](LICENSE). The bundled Outfit font is © The Outfit Project Authors under the SIL Open Font License 1.1 ([src/fonts/OFL.txt](src/fonts/OFL.txt)).
