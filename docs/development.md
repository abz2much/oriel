# Development

```bash
npm install
npx playwright install chromium   # once, for the test harness
npm run build                     # dist/oriel.js (minified); npm run dev for a readable build
npm test                          # every check CI runs
npm run shots                     # screenshots of every page into dev/out/
```

`dist/oriel.js` is committed, because HACS installs from it. CI fails if it is out of date.

## Where things live

- Pages are in `src/pages/`, the editor in `src/editor/`, and the scene style in `src/scene.js` with its drawings in `src/scenes/art.js`.
- User-facing text is in `src/strings.js`, in UK English.
- Colours are in `src/theme/`: `tokens.js` holds the CSS variables and Classic's values, `themes.js` the themes and the rules that build them from two seed colours, and `fixed.js` the colours that never change. No other file holds a colour.

## The test harness

`npm test` runs `dev/check.mjs`, which covers versions and the README, the card in every dev config, the editor, the Climate and Household pages, the phone layout and its pop-ups and tap areas, the rail, navigation motion, auto rotation, the full screen button, theme contrast, text overflow, the scene style, and the tablet layout against a saved baseline.

- `dev/mock.mjs` holds made-up states, forecasts, history and calendars. `dev/configs/` holds the test configs: empty, minimal, full, full with Nova, Nova not installed, and partial (some cards missing).
- `node dev/pages.mjs` checks the Climate and Household pages: the history and forecast requests, thermostat steps, the to-do lists, the calendar calls, and that no list shows a cut row.
- `dev/fake-ha-form.js` is a plain stand-in for Home Assistant's `ha-form`, so the editor can be tested without Home Assistant. It does not look like the real thing.
- `node dev/theme-shots.mjs <theme ...>` screenshots every page and pop-up per theme with a frozen clock. `node dev/sheet.mjs <theme ...>` makes a contact sheet, `node dev/themediff.mjs <before> <after>` compares two runs pixel by pixel, and `node dev/contrast.mjs` writes the contrast report.
- Phone layout: `npm run shots:phone` takes every page at 390×844, 360×740 and 412×915 (plus a full scrolled page) into `dev/out/phone/`. `node dev/phone.mjs` checks every page at those sizes (no sideways scrolling, nothing past the edge, text and tap targets), and `node dev/phone-sheets.mjs` opens every pop-up.
- `node dev/tablet-geometry.mjs` renders the current bundle and the baseline in `dev/baseline/` in the same run, and checks that every block and control on the tablet sits in the same place. After a deliberate tablet change, replace the baseline in the same pull request and say why in the changelog. `node dev/layout-shots.mjs` and `node dev/tablet-diff.mjs <before> <after>` compare tablet screenshots.
- `node dev/scene.mjs` checks the scene style, and `node dev/scene-shots.mjs [theme]` takes every page in it into `dev/out/scene/`.

## Releases

The release workflow makes releases. Bump the version in `package.json`, `src/version.js` and `CHANGELOG.md`, merge to `main`, and the workflow builds, tests, tags and publishes the release. Never tag by hand.
