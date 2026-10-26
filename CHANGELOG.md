# Changelog

All notable changes are listed here. Versions follow [semantic versioning](https://semver.org/).

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
