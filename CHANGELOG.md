# Changelog

All notable changes are listed here. Versions follow [semantic versioning](https://semver.org/).

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
