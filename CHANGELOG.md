# Changelog

All notable changes are listed here. Versions follow [semantic versioning](https://semver.org/).

## Unreleased

### Added
- A Buy Me a Coffee link in the README and a Sponsor button on GitHub (`.github/FUNDING.yml`).
- HACS validation (`.github/workflows/validate.yml`) on every push, pull request and weekly, as HACS requires for its default list.

### Changed
- The README is shorter and reordered (what Oriel is, install, quick start, pages, looks, support). The full option reference, feature details and development notes moved to `docs/configuration.md`, `docs/features.md` and `docs/development.md`. It also corrects two things that were out of date: there are thirteen themes, and the scene style's cards fit without scrolling.
- `LICENSE` is the plain MIT text again so GitHub and HACS recognise it; the note about the bundled Outfit font stays in the README's Licence section and `src/fonts/OFL.txt`.

## [0.7.2] - 2026-11-13

### Fixed
- **Vacuum (scene style): room cleaning was unreachable.** A **Clean a room** card now lists the rooms from the map and opens the map card with its room buttons, for Dreame vacuums with a map camera.
- **Home, Living room and Nova kept the theme's colours** while the scene style was on. The scene look now covers every page; their layouts are unchanged.
- Home in the scene look: the room names on the glass house are dark pills (they were white text on white), and the Boost heating button is dark so its text reads.

### Tests
- `dev/scene.mjs`: the scene look is on for Home, Living room and Energy with the scene style and off with classic; a Dreame vacuum with a room map gets a Clean a room card that opens the map with all its room buttons.

## [0.7.1] - 2026-11-11

### Changed
- **The scene style now matches the approved mockups.** On Energy, Climate, Household, Security, Vacuum and System:
  - **Compact cards** replace the full cards in the bottom row, sized to fit without sideways scrolling. Tapping one opens the page's full card in a pop-up, with every control and confirm step; × , a tap outside or Escape closes it. The full cards stay in place, hidden, so their code is unchanged.
  - **The line above the title and status chips** come from your entities (Energy: live time and price; Climate: the weather; Household: today's events; Security: read-only and the last event; Vacuum: the last clean; System: the version and uptime).
  - **Live labels on the drawings** (solar, house, battery, grid; thermostat, outside, heating; calendar, list, bins; front door, open door or window, camera motion, alarm; vacuum and dock; Home Assistant, connections, backups). A label whose entity is not set is left out.
  - **The scene look** (warm dusk light, frosted glass, white text) is part of the style and no longer depends on the theme. Home, Living room and Nova keep your theme.
- Climate's compact − and + call the same code as the full card.

### Tests
- `dev/scene.mjs` now checks the line, chips, labels and compact cards on every scene page, no sideways scrolling with the full test config, the full cards hidden and not tappable, every compact card opening its full card in a pop-up inside the screen and closing again, and the compact + making one `climate.set_temperature` call.

## [0.7.0] - 2026-11-11

### Added
- **Scene style** (`general.page_style: scene`, tablet only, off by default). Energy, Climate, Household, Security, Vacuum and System get a big title with today's date, a drawing of what the page is about, and their cards in one row along the bottom that scrolls sideways. The cards are the classic ones, moved, not rebuilt: same controls, pop-ups and confirm steps. Home, Living room and Nova keep their layouts; the phone layout ignores the style and gets every card back where it was. The drawings are in `src/scenes/art.js`, decorative only (they read no state).
- **Dusk theme** (`dusk`): warm umber with a candlelight accent, built by the same rules as the other dark themes and checked by the contrast test.
- Editor: **General › Page style on the tablet**.

### Changed
- **The Family page is called Household** on screen (rail, tab, title, editor section). The config key stays `family`, so existing configs keep working.

### Tests
- New `dev/scene.mjs` (part of `npm test`): with the scene style each scene page has a title, a drawing and all its cards in one row, inside the canvas, below the title, none overlapping; Home and Living room keep their layouts; no page errors or service calls; switching back to classic puts every card back; the phone ignores the style; a card that turns from tablet to phone and back puts the cards back on the phone and into the row again on the tablet.
- The editor test counts themes from `src/theme/themes.js` instead of a fixed 12, and looks for the Household section.
- The classic tablet layout still matches the 0.6.4 baseline (unchanged on purpose).

## [0.6.4] - 2026-11-07

### Added
- **Full screen button** at the right of the header (tablet layout only). A tap hides Home Assistant's header and sidebar and asks the browser for full screen (its bars and the system bars, where the app allows it); another tap brings everything back. No add-on is needed.
  - The choice is kept on each device, so after a reload the header and sidebar stay hidden until the button is tapped. The browser's own full screen needs a tap, so its bars come back after a reload.
  - Oriel adds one small style to Home Assistant's page, with the rules the kiosk-mode project uses, and removes it when the button is tapped off, in the phone layout, in the card editor's preview, and when you leave the dashboard.
  - A browser that refuses full screen, or has none, still gets the header and sidebar hidden, with no error.

### Removed
- **System: "Show header and sidebar"**, and the `general.kiosk_path` option that only it used. The full screen button replaces it. With the kiosk-mode add-on, `?disable_km` on the dashboard URL still gets you out.

### Changed
- **Tablet baseline replaced on purpose** (now `dev/baseline/oriel-0.6.4.js`): the header's round buttons and the Nova pill move 54 px left for the new button, and System's Tablet card is one button shorter (its Debug card grows to fill the column). Nothing else moves.

### Tests
- New `dev/fullscreen.mjs` (part of `npm test`), in a fake Home Assistant page with the real nesting: the button hides and shows the header, sidebar and drawer shell; the choice is stored per device and survives a reload without asking the browser for full screen; a refusing or missing browser full screen gives no error; no button and nothing hidden in the phone layout or the card editor's preview; turning between layouts follows the choice; the card leaving the page puts everything back; outside Home Assistant a tap does not throw; System has no kiosk button.
- `dev/phone.mjs`: the 44 px check on header buttons measures only the buttons that show.

## [0.6.3] - 2026-11-07

### Fixed
- **Energy: Big consumers covered the bottom of the Today card** when the tablet shows larger text (Android text scaling, a minimum font size). Since 0.6.1 the Today tiles grow to fit larger text, but Big consumers stayed at a fixed place below, so with six tiles and a standing charge the last row slid under it.
  - The Today tiles no longer keep an empty second line. Rows are 82 px (were 84 px) and the side padding is 9 px (was 11 px), so the card stays 350 px at normal text.
  - The standing charge moved out of the Net cost tile to a line under the tiles: “Net cost includes €0.97 standing charge”. It shows only with a standing charge and the Net cost tile, and wraps when the text is larger.
  - A tile label with no room ends in “…”. “Battery charged” is now “Charged”, so it fits.
  - If Today still grows, Big consumers moves down under it (never higher than before) and keeps its bottom edge. Appliance rows that do not fit are left out instead of spilling past the card. This also fixes three or more appliances spilling past the card at normal text. The phone layout is unchanged.

### Changed
- **Tablet baseline replaced on purpose** (now `dev/baseline/oriel-0.6.3.js`): only the Today tiles change (2 px shorter, 2 px less side padding). The Today card and Big consumers are where they were at normal text.

### Tests
- `dev/overflow.mjs` now uses all six Today tiles, a standing charge and three appliances. On Energy, at five tablet sizes, at normal and 25% larger text: no two cards overlap, every Big consumers row stays inside its card, the standing charge shows in full, and at normal text every Today label shows in full.

## [0.6.2] - 2026-10-28

- The idle clock no longer shows the small “Empty for N minutes · walk in or tap to go back” line at the bottom. Nothing else on it changes.

## [0.6.1] - 2026-10-28

Fixes after 0.6.0, and two new controls on the System page. Each item is its own commit, so any one can be reverted alone.

### Fixed
- **Phone tab bar looked like a solid cream pill.** To keep labels readable over a black card, 0.6.0 tinted the bar 0.6 to 0.7. The glass now flattens what is under it (contrast and brightness in its backdrop filter) before the tint, so the tint drops to 0.28 to 0.64 (Classic 0.46), the page shows through, and there is a soft sheen along the top. It is still worked out per theme, and `dev/contrast.mjs` models the filter. A new check measures label contrast on the real rendered pixels over a black card and a light card (at least 4.5:1 in five themes). Without `backdrop-filter` support the bar is still the solid bar. The built file, the tokens and the ancestors were checked: nothing was lost in the build.
- **The bubble and the rail chip stand out in every theme.** The bubble has an outline in the theme's accent text colour. In the dark themes the rail chip is the accent fill (it was about 2:1 against the rail). New contrast checks: both must be at least 3:1 as shapes. (These two changes were made after the 0.6.0 pull request was checked, but were not in it.)
- **A square flashed round tabs and rail items when tapped.** It was the browser's default tap highlight. Tabs, rail items and the More tiles now have a transparent tap highlight, no selectable label and no focus box after a pointer tap. Keyboard focus rings stay.
- **Text overflowing its box on the tablet** (Energy: the PV line under the Solar box, "incl. … standing" under Net cost; Vacuum: the settings values; System: the Home Assistant, Host and Tablet cards). These boxes had a fixed height and 3 to 10 px to spare, so any larger text (Android text scaling, a minimum font size) pushed lines past the edge. They now have a minimum height and grow; Net cost can wrap to two lines; System stacks each column by the cards' real heights. Text size adjustment is switched off on the card. These problems were already in 0.5.2 and 0.6.0; none is new in 0.6.0. At normal size the Solar box grows 7.6 px, the Today tiles 2 px, and System's Host card 4 px.

### Added
- **System: the Update chip is a button.** While updates are waiting, the chip next to “n updates waiting” opens Home Assistant's updates page (`/config/updates`) without a page reload. Nothing is installed from the card. It has a 44 px tap area, a pressed state and a label, and works with Enter and Space.
- **System: an Auto rotate switch**, per device (also on the phone). The choice is kept in the browser's local storage, wins over `general.auto_rotate.enabled` on that device, and takes effect at once. Flipping it counts as a touch. If storage is blocked the page uses the config. The config and editor fields stay.

### Changed
- **Tablet baseline replaced on purpose** (now `dev/baseline/oriel-0.6.1.js`): the boxes above grow by a few pixels and the Tablet card on System gains a row. The guard itself is unchanged.

### Tests
- `dev/overflow.mjs` (part of `npm test`): on Energy, Vacuum and System, at 1024×768, 1180×820, 1280×800, 1366×1024 and 1920×1200, at normal text and with every text 25% larger, no text outside its box and nothing clipped; the Update chip and the Auto rotate row are there.
- `dev/nav-motion.mjs`: no tap highlight, no focus box and no pressed box on a tap; label contrast on real pixels over a black and a light card.
- `dev/pages.mjs`: the Update chip is hidden with no updates; with updates a tap pushes `/config/updates` and fires `location-changed` once; Enter and Space work; a state update does not rebuild it.
- `dev/auto-rotate.mjs`: default off; the switch turns it on and off with no reload, counts as a touch, survives a re-render, falls back to the config when storage fails, and a stored choice beats the config both ways.

### Rolling back
In HACS use **Redownload** and pick v0.6.0, or revert the commit for the one item that caused a problem (`git revert <sha>`).

## [0.6.0] - 2026-10-28

The navigation looks and moves differently, on the tablet and on the phone. Auto rotation is new and is off by default.

### Changed
- **Phone tab bar:** a frosted glass pill. A bubble slides to the selected tab, and it takes the theme's accent as a tint at its far corner. The solid white chip on the selected tab is gone. The bar keeps its size and position. Without `backdrop-filter` support it stays the solid bar it was.
- **Glass tint, per theme:** the bar is tinted between 0.60 and 0.74 (Classic 0.64), not the 0.26 of the first mockup. At 0.26 a black card scrolling under the bar left the labels at about 1.3:1. Each theme gets the least tint that keeps the labels at 4.5:1 over the lightest and darkest cards it has; the bubble's accent tint is lowered in themes where the selected label would not read on it.
- **Tablet rail:** dark glass with a chip that slides to the active page, in every theme. Classic holds the approved values; the other themes build the rail from their own dark panel colour, and the chip from their own raised colour, so each keeps its character. The rail keeps its size and position.
- **Page change:** the cards of the new page fade in and rise 16 px, 70 ms apart (the last no later than 500 ms). It runs on a tap, from auto rotation and from anything else that changes the page, never on a state update. The animation ends with no transform left behind.
- **Reduced motion:** with it switched on, the bubble and the chip jump, and the cards just appear.
- **Tablet baseline replaced on purpose:** `dev/baseline/oriel-0.4.0.js` is now `dev/baseline/oriel-0.6.0.js`, because this release deliberately changes how the tablet rail looks. The guard compares the position and size of every block, and it found no difference against 0.4.0 (the rail's colours and motion are not geometry), but from now on it holds the 0.6.0 rail as the reference. The guard itself is unchanged.

### Added
- **Auto rotation** (`general.auto_rotate`, off by default): moves through the pages in rail order every `idle_seconds` (default 60), wraps after the last, and waits `after_touch_seconds` (default 300) after a person changed the page or touched the card. It waits while the idle clock shows, a pop-up, sheet, More menu or dialog is open, a text field has focus, or the tab is hidden. On the phone it steps through the pages under More too. In the editor under General › Auto rotation. See the README.

### Tests
- `dev/nav-motion.mjs` (part of `npm test`): the indicator is non-interactive, hidden from assistive tech and behind the links; it lines up with the active item after a page change, a resize, a layout flip and a rebuild; no transition on first paint; the phone bar with four pages and with more than five; reduced motion; the fade ends clean and does not run on a state update; Nova's own classes are untouched.
- `dev/auto-rotate.mjs` (part of `npm test`, fake clock): off by default; rotates, wraps, waits after a tap, a touch restarts the wait; paused for the idle clock, a pop-up, a focused field and a hidden tab; one timer, cleared on disconnect; a config change applies with no reload.
- `dev/contrast.mjs` (now part of `npm test`, so CI guards the per-theme glass tint): the rail labels, and the phone bar's inactive labels and the selected label on the bubble, over every surface a card can have, in all 12 themes.

### Rolling back
This release is one commit. To go back: in HACS use **Redownload** and pick v0.5.2, or revert the single commit (`git revert <sha>`), which undoes the rail, the bar, the fade, auto rotation and the baseline together. There is no setting to switch the new look off.

## [0.5.2] - 2026-10-27

Phone layout only. The tablet is unchanged.

### Changed
- Nova: the chat card is never taller than 60% of the screen (460 px at most), so it fits short phones.
- Energy: an amount that shows as zero (0.00 kW, 0.0 kWh, £0.00) is drawn in the soft text colour, the same colour as its unit, so it doesn't draw the eye. This covers the live flow values, the Today tiles, the heat pump and the house use total. It passes contrast in all 12 themes.

### Fixed
- Some invisible tap areas reached into the control next to them: Home's heating rows and their − and + buttons, the Security "open" and "Tamper" chips, and Nova's status chip. They no longer overlap. Nothing looks different.

### Tests
- `dev/phone-taps.mjs` (part of `npm test`): on every phone page at 360, 390 and 412 wide, no two tappable controls have overlapping tap areas, counting the invisible area round small controls.
- `dev/phone.mjs`: Nova's chat height at four phone sizes; zero amounts on Energy are dimmed on the phone and unchanged on the tablet.
- `dev/contrast.mjs`: the dimmed zero amounts on every surface they sit on (81 pairs per theme).

## [0.5.1] - 2026-10-27

### Fixed
- Fixed: the sidebar stopped responding while on the Living room page on the tablet.

### Tests
- `dev/rail.mjs` (part of `npm test`): the rail (1280×800) and the phone's tab bar (390×844) must be on top at the centre of every item, on every page and in every state (scrolled, light panel open, an app or streamer chosen, after a page switch), and a tap must switch the page. The full-screen pop-ups must still cover the rail, and scrolling on Living must still work, including under the shortest column.

## [0.5.0] - 2026-10-27

### Added
- Phone layout (portrait), inside the same card with the same config. It turns on by itself when the card is narrower than 700 px (the card's own width, so the editor preview is unaffected) or with `general.layout: phone`; `tablet` forces the tablet layout. Landscape phones wider than 700 px keep the tablet layout.
- Every page has a phone layout: Home (energy, the whole house, Coming up, room panel, Today, quick actions), Living room, Energy, Climate, Family, Security, Vacuum, Nova and System. One column of full-width cards that scrolls, no canvas scaling, safe-area insets respected, text 12 px or more and tap targets 44 px or more.
- Header: the chips scroll sideways in one row; a chip either fits whole in the row or is hidden, never cut off (the weather and clock chips fit whole at 360 wide); the alarm, door and window buttons stay fixed on the right.
- Navigation: a floating tab bar (the first four pages in rail order, then More with the rest, System always reachable). The selected tab is a raised pill with a heavier label and `aria-current`, not colour alone.
- Pop-ups are bottom sheets: shopping list, camera, light tune panel, vacuum settings menu, vacuum and Nova confirm steps, and More. The page behind is locked, the back button or gesture closes the sheet instead of leaving the page, each has a visible close button and closes with a swipe down, and they stay above the on-screen keyboard.
- Confirm steps on the phone: Cancel, then a large (64 px) Confirm button set well apart from it; for the first 0.4 s after a confirm opens, a stray tap cannot press Confirm (Vacuum had this already; Nova has it on the phone now).
- Phone details: the whole Home house with labels sized apart from the drawing (only the labels that fit without overlapping are shown, power first); Energy charts and the Climate graph drawn at the card's real width; Family lists show every item and the page scrolls; the Calendar's "+ N more" expands and collapses; the System page's Tablet card is "This device"; Nova "not detected" stays one centred message.
- `general.layout` in the editor (General), strings, `docs/example.yaml` and the README, which now explains phone mode and the 700 px rule. Five phone pictures in the README.

### Changed
- The idle clock is skipped in the phone layout (one check, `_idlePhone()`).
- Contrast report: 77 checks per theme (the phone tab bar and the More tiles).

### Tests
- `dev/phone.mjs`: layout switching by the card's own width, the tab bar and More, and every page at 390×844, 360×740 and 412×915 (no sideways scrolling, nothing past the edge, text 12 px or more, tap targets 44 px or more including their invisible tap areas), the house labels, the header, Family's full lists and the Calendar's expand, Vacuum's compact card, Nova not detected.
- `dev/phone-sheets.mjs`: every pop-up at 360×740 (fits, controls 44 px or more, page locked, back button, close button, swipe down, the keyboard open, confirm steps).
- `dev/tablet-geometry.mjs` and `dev/baseline/oriel-0.4.0.js`: the 0.4.0 bundle and the current one are rendered in the same run, and the tablet layout must match (2,941 blocks and controls across the pages and pop-ups); new elements must take no room on the tablet.
- Dev tools: `npm run shots:phone`, `dev/layout-shots.mjs`, `dev/tablet-diff.mjs`, `dev/freeze-time.mjs`.

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
