# Changelog

All notable changes are listed here. Versions follow [semantic versioning](https://semver.org/).

## [0.4.0] - 2026-10-27

### Added
- Idle clock: an optional screen that covers the card when a presence sensor has been off for a while (`general.idle_clock: { presence, minutes }`, default 5 minutes, 1 to 60). It shows a large light time, the date and up to three chips (weather, the next calendar event with its colour bar, and "Bin today" or "Bin tomorrow" with the bin names), plus a small hint line. It goes away when the sensor turns on or on any touch, back to the page that was open, and the waking tap presses nothing underneath. A touch anywhere restarts the count.
- It never goes idle on bad data (`unavailable`, `unknown`, a missing entity), never covers a camera pop-up, the doorbell, or an alarm that is pending or triggered, and does not run in the card editor preview. Off, with no element and no timer, unless `presence` is set.
- Always dark and warm, in every theme (the colours are fixed, in `src/theme/fixed.js`). The content drifts a few pixels in a slow loop each minute, and stays still when reduced motion is requested.
- Editor: General has an Idle clock tab (presence sensor, minutes), with a warning if the sensor does not exist.

### Changed
- The calendar events are now fetched once into one store shared by the Home "Coming up" card and the idle clock (the store exists whenever calendars are set, even with `home.calendar: false`).
- Contrast report: 74 checks per theme (the idle clock's time, date, hint, chip text and calendar bars on its dark page).

### Tests
- `dev/pages.mjs` (fake clock): not shown at 4 min 56 s and shown after 5; content; presence on; a tap (returns to the same page, presses nothing underneath); a touch resets the count; camera pop-up, doorbell, alarm pending and alarm triggered each block and remove it; unavailable, unknown and missing never show it; unset does nothing; editor preview; minutes clamped 1 to 60; reduced motion; dark in a light theme. The editor harness checks the new tab and warning. The "Coming up" check now runs at a fixed time of day.
- `dev/idle-shots.mjs` takes screenshots of the clock.

## [0.3.3] - 2026-10-26

### Changed
- Living room: the streamer tiles (Google TV, Shield, or whatever is in `living.streamers.devices`) moved out of the Lights card into the right column, as a row directly under the TV panel and above Apps. They do the same as before (tap to choose the active remote; "Off", "Active" and the selected tick). One device gives one wide tile, three give three across, none hides the row. A single device now shows its tile too (it used to need two or more).
- Living room lights: when the number of lights is odd, the last tile spans both columns, so five lights fill the grid. Four stay as they were.
- The page still fits without clipping at 1280x800, 1024x768, 1366x1024 and 1920x1080. Text stays at 12 px or more and tap targets at 44 px or more.

### Added
- Any light can be a colour light in the Lights card, for example an HDMI sync box (`light.*` with `colour: true`). It uses the same tile, tune panel (brightness, white, colour) and on/off behaviour as the other colour lights. Effect lists are not shown.

### Tests
- `dev/pages.mjs` checks the streamer row with 0, 1, 2 and 3 devices, the odd-count lights grid, and a sync box light without `render` (off with empty attributes, tune panel, brightness and colour calls, on state).

## [0.3.2] - 2026-10-26

### Added
- Home: a "Coming up" card under the room panel, in place of the Nova card. It shows the next three events from `family.calendars`, soonest first, today's first, with events already finished today left out. Each row has a bar in its calendar's colour, the title (one line, ending in "…" if long), Today / Tomorrow / the weekday, and the time ("All day" for all-day events). With nothing in the next 7 days it says "Nothing coming up" and the date of the next event within 14 days. Tap it to open the Family page. It refreshes every 5 minutes and when the day changes. It is hidden when no calendars are set. Rows are never cut: when the room panel is tall the card shows fewer rows, or hides if not even one fits.
- `home.calendar` (default `true`) switches the card off; it is in the card editor under Home.

### Changed
- Living room: the three columns are now flexible, so every card is as tall as its contents. Nothing runs onto a card's edge any more (the Apps card with 13 buttons, and Doors & windows, did), and the page scrolls if the columns are taller than the screen. Text sizes and tap targets are unchanged.
- Climate: the last-12-hours graph has two solid lines in blue and orange (a pair people with red-green colour blindness can tell apart) instead of green and a dashed red. The circle and square end markers and the legend markers stay. All 12 themes pass contrast.
- The streamer tile on the Living room page now has two states: **Selected** (the remote follows it) and **On** (the device is running). Only an "On" streamer gets the green fill, the toggle and "Active". A selected streamer that is off shows "Off" with a neutral outline and a tick.
- The TV power button follows the TV's real state: any state except off, unavailable or unknown counts as on.

### Tests
- `dev/pages.mjs` now checks the Living room off states (app tiles, streamer tile, TV inputs, Now Playing), a 13-app Living room for clipping, solid graph lines, and the Coming up card (order, finished events, empty states, long titles, a tall room panel, no calendars, Nova on).

### Removed
- The Nova chat box on Home. The Nova page, the header pill and everything else Nova stay. The `nova.home_chat` option is gone (an old value in a config is ignored).

### Fixed
- Living room: Stremio (or any app) and the Shield stayed highlighted when everything was off, because a stale package on the remote and a stale `app_id` or `app_name` on the media player were still being read. An app now counts as running only while its remote or media player is on.
- Living room: the TV input buttons no longer stay highlighted from a stale source while the TV is off.

## [0.3.1] - 2026-10-26

### Changed
- Climate and Family now follow the approved mockups: same column positions and widths, card order, card titles and pills, type sizes (17 px titles, 56 px weather number, 34 px thermostat target), row heights and spacing.
- Family: Shopping list on the left; Calendar with Bins under it in the middle; To-do with Reminders under it on the right. Bins are coloured tiles side by side (they wrap to two rows for four bins). Today's and tomorrow's tile also gets a ring and a bell, and says "Today" or "Tomorrow" instead of a date. The Family rail icon is the mockup's list icon.
- Thermostats show the target large with − and + at its sides, and "action · now 20.5°" under the name. The weather card shows the condition in a pill and one line each for feels like, wind, high, low, rain chance and humidity. Rooms bars run 12 to 24 °C.
- Cards are as tall as their contents, so a card with few rows no longer leaves a large empty glass area.
- A list never shows a half row: rows that do not fit are left out and a "+ N more" line says how many (Shopping, To-do, Calendar, Reminders).
- The To-do card ticks items only (no add box or Clear done), as in the mockup.

### Documentation
- All README pictures are regenerated from the dev harness (the rail now shows Climate and Family), with new Climate and Family pictures, and the gallery is four rows of two.
- README fixes: the manual install `?v=` now matches the version, the contrast note says Classic passes, the editor lists Climate and Family, and the Development section lists the new test configs and page checks.
- README images use absolute `raw.githubusercontent.com` URLs, because HACS strips relative image paths. `npm test` now fails if the README `?v=` is not the current version or a README image is not such a URL to a file that exists.
- New dev config `full-nova` (the full config with Nova on) for the Family and Climate pictures.

### Fixed
- A last row cut off above "Clear done" on a long list.
- Contrast: bin tile text, the hour bars and the chart lines are checked in all 12 themes (64 checks each).

## [0.3.0] - 2026-10-26

### Added
- **Climate page** (thermometer in the rail). Weather card with feels like, wind, humidity, high and low, a 5-day row and a next-12-hours chart, read with `weather.get_forecasts` and hidden row by row when the entity does not support daily or hourly forecasts. Thermostats card with − and + in the thermostat's own step, hvac action and target, and the heating boost. A last-12-hours line graph of each thermostat's current temperature (hourly averages, gaps for unavailable readings, a legend, and a different dash and marker per line so colour is never the only cue). A Rooms card with a bar per room and the coldest and warmest named. New `climate` config section.
- **Family page** (people icon in the rail). Shopping list card (tick, add, “Clear done”, count), a merged calendar for today, tomorrow and this week with all-day events marked, bin collections with the next date and a highlighted “Tomorrow” (the word as well as the colour), an optional second to-do list, and Nova's reminders when Nova is on. New `family` config section.
- Visual editor: Climate and Family sections with entity pickers, warnings for missing or wrong-type entities and Auto-detect that applies only when accepted. Both sections feed the debug panel.
- Dev harness: made-up data for both pages, a `partial` config with a card missing, theme screenshots of both pages, and `dev/pages.mjs` (run by `npm test`), which checks the history request, the forecast calls, the thermostat step, boost, the to-do lists, the calendar requests and Nova gating.

### Changed
- Rail order is now Home, Living room, Energy, Climate, Family, Security, Vacuum, Nova, with System last.
- The shopping pop-up, the Family lists, the heating boost, the thermostat step and the Nova reminder rows now share one implementation each. The Home shopping pop-up and room panel work as before. The heating step now falls back to the thermostat's `target_temp_step` before 0.5 when `step` is not set.
- Contrast checks cover the new text, the add boxes and the chart lines in all 12 themes.

## [0.2.9] - 2026-10-26

### Added
- An amber "Offline · since 10:24" chip appears in the header when the connection to Home Assistant drops, and goes away when it is back. It uses Home Assistant's own connection events.

### Changed
- The side rail shows each page's name under its icon. It is a little wider (72 px); long names wrap onto two lines.
- Vacuum page: with no map panel, the right-hand cards move into the middle column and widen, so the page no longer has an empty middle. The cards stack from the top. The state is no longer repeated as its own subtitle ("Docked / Docked").
- Classic soft text is a touch stronger (78%) so it also passes on the lighter glass the rail uses.

## [0.2.8] - 2026-10-26

### Changed
- Easier to read: no text on the tablet is smaller than 12 px (labels, hints, chart axes, chips and house tags were 10 to 11.5 px). The house energy tags are a little wider to fit.
- Classic now passes every contrast check (it failed 20 of 54). Soft grey text is stronger, accent, good, warning and bad text is darker, toggles and green dots are a darker olive, and state words are slightly darker. The other themes are unchanged.
- Alerts no longer rely on red alone: the header alarm, door and window buttons show a "!" badge when they alert, and open doors and windows on the Security page say "open".

## [0.2.7] - 2026-10-26

### Changed
- Easier to tap: small controls get an invisible tap area of at least 44×44 px, without changing how they look. This covers the rail, header chips, heating rows and −/+ buttons, light presets and colours, HDMI buttons, room pills on the house, energy tags and more.
- The Nova chat box, send and mic buttons, and the Nova page reminder boxes are 44 px tall.
- Security lists (doors and windows, presence, device health) spread out to fill their card, up to 44 px a row. With many rows they keep today's spacing.
- A little more space between the heating − and + buttons.
- Battery and progress bars animate smoothly with a transform instead of their width.

### Fixed
- A negative cost (money earned) now shows in green, not red, on the Energy page and in Home "Today" tiles.
- The shopping list and Nova text boxes show the focus ring again.

## [0.2.6] - 2026-10-26

### Changed
- The side rail is centred vertically in the space below the header and stays centred as pages are added. Settings is still last. If there are more pages than fit, the rail starts at the usual top and the page icons scroll inside it.

## [0.2.5] - 2026-10-26

### Changed
- The side rail is only as tall as its icons, instead of a fixed 620 px with an empty middle. The System icon comes straight after the other pages, with a small extra gap. If there are ever more pages than fit, the page icons scroll inside the rail and System stays visible.

### Added
- Window button in the header, after the door button. Set `general.windows` to a list of window sensors. The button turns red when any of them is open, and a tap opens the first open window (or the first in the list). It is hidden when the list is empty. The editor has a "Window sensors" field in General, and auto-detect can suggest window and opening sensors.

## [0.2.4] - 2026-10-26

### Fixed
- Living Room card: the 3D room no longer runs into the bottom chips or the presence chip. It is a little smaller and sits further up and to the left. The title is slightly smaller so a longer name such as "Living Room" clears the back wall.

### Changed
- Presence wording reads "Someone is here" instead of "Someone here", on the Living Room card and the Security page.

## [0.2.3] - 2026-10-26

### Added
- Pine Mist (`pine-mist`), a light theme: pale mint with a deep pine accent. Its page is shaded a little deeper than the other light themes so the white lines on cards and the house stand out more, as far as the contrast checks allow. Twelve themes in total.

## [0.2.2] - 2026-10-26

### Changed
- Slate Harbour (`slate-harbour`) replaces Blueberry Cream, for the same reason Cocoa Bark replaced Hearth: Blueberry Cream's mid-tone blue base made card edges and the house's wall lines hard to see. Slate Harbour is a charcoal blue-grey with a soft slate accent. A config that still says `theme: blueberry-cream` shows Classic, and the editor warns.

## [0.2.1] - 2026-10-26

### Changed
- Cocoa Bark (`cocoa-bark`) replaces Hearth. Hearth's mid-tone base forced its glass so close to the background that card edges and the house's wall lines were hard to see. Cocoa Bark is a deeper brown with a soft tan accent, and its edges stand out. A config that still says `theme: hearth` shows Classic, and the editor warns.

## [0.2.0] - 2026-10-26

### Added
- Eleven colour themes, set with `general.theme`: Classic (the default, unchanged), Midnight Signal, Plum Dusk, Hearth, Forest Mint, Deep Teal, Blueberry Cream, Violet Mist, Berry Sky, Quantum Ice and Ember.
- `general.accent` to use your own accent colour with any theme. The accent family (fills, toggles, accent text and the text on them) is rebuilt from it so it stays readable.
- Theme picker with colour previews and an accent colour in the editor's General section.
- Editor warnings for an unknown theme id or an accent that is not a hex colour. The tablet falls back to Classic, or to the theme's own accent, and never shows an error.
- Contrast check for every theme (4.5:1 body text, 3:1 large text and icons) and theme screenshots in the dev harness.

### Changed
- Every colour is now a CSS variable (`--oriel-*`) set by the theme; colours that carry meaning (alarm and vacuum states, energy sources, light swatches, camera overlays) and the Living room illustration stay fixed. Classic renders pixel for pixel as in 0.1.0.
- `dist/oriel.js` grows by about 30 KB (452,569 to 482,146 bytes).

## [0.1.0] - 2026-10-25

First public version.

### Added
- One card, `custom:oriel-shell`, with seven pages: Home, Living room, Energy, Security, Vacuum, Nova and System.
- Visual editor with sections, add/remove/reorder lists, live warnings for missing or wrong-type entities, and Auto-detect suggestions that apply only when accepted.
- Every page and section is optional; a page with nothing set stays out of the side rail.
- The house on Home is drawn from a floor plan in the config, with a plain outline when there is none.
- Nova support, off by default, with a "Nova not detected" state.
- Debug panel on the System page listing configured entities that are missing or unavailable.
- Outfit font bundled in the file; no remote requests.
- Dev harness with mock states (`npm test`).
