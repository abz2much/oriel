# Changelog

All notable changes are listed here. Versions follow [semantic versioning](https://semver.org/).

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
