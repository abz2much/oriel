/* npm test: the checks CI runs. Fails (exit 1) on the first problem.
   1. version in package.json, src/version.js and CHANGELOG.md agree, README's manual install uses it, README images are absolute raw GitHub URLs (HACS strips relative ones) to files that exist
   2. dist/oriel.js parses
   3. the card renders every page in every dev config with no page errors and no service calls
   4. the editor checks pass
   5. the Climate and Family page checks pass
   6. the phone layout checks pass (every page at three phone sizes), the phone pop-up checks pass, and the tablet layout still matches the 0.6.1 bundle
   7. no two tap areas overlap on any phone page (dev/phone-taps.mjs)
   8. the rail and the phone's tab bar are the topmost element over every item, on every page and state
   9. the sliding indicator and the card fade (dev/nav-motion.mjs), and auto rotation (dev/auto-rotate.mjs)
   10. every theme passes contrast (dev/contrast.mjs), the navigation glass included
   11. no text outside its box or clipped on Energy, Vacuum and System at five tablet sizes, at normal and 25% larger text (dev/overflow.mjs) */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const fail = (m) => { console.error('FAIL ' + m); process.exit(1); };
const ok = (m) => console.log('ok   ' + m);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const src = (fs.readFileSync('src/version.js', 'utf8').match(/VERSION = '([^']+)'/) || [])[1];
const log = (fs.readFileSync('CHANGELOG.md', 'utf8').match(/^## \[?(\d+\.\d+\.\d+)/m) || [])[1];
if (pkg !== src || pkg !== log) fail(`versions differ: package.json ${pkg}, src/version.js ${src}, CHANGELOG.md ${log}`);
ok('version ' + pkg + ' matches in package.json, src/version.js and CHANGELOG.md');

const readme = fs.readFileSync('README.md', 'utf8');
const rv = (readme.match(/oriel\.js\?v=(\d+\.\d+\.\d+)/) || [])[1];
if (rv !== pkg) fail(`README manual install says ?v=${rv}, the version is ${pkg}`);
ok('README manual install uses ?v=' + pkg);
const RAW = 'https://raw.githubusercontent.com/abz2much/oriel/main/'; /* HACS strips relative image paths, so README images are absolute raw URLs */
const imgs = [...readme.matchAll(/(?:src="|\]\()([^")\s]+\.(?:jpg|jpeg|png|gif|svg))/g)].map((m) => m[1]);
const badImg = imgs.filter((u) => !u.startsWith(RAW) || !fs.existsSync(u.slice(RAW.length)));
if (badImg.length) fail('README images must be ' + RAW + '<file that exists in the repo>: ' + badImg.join(', '));
ok('README has ' + imgs.length + ' images, all absolute raw.githubusercontent.com URLs to files that exist');

try { execFileSync(process.execPath, ['--check', 'dist/oriel.js'], { stdio: 'pipe' }); } catch (e) { fail('dist/oriel.js does not parse'); }
ok('dist/oriel.js parses');

const configs = fs.readdirSync('dev/configs').filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
let out;
try { out = execFileSync(process.execPath, ['dev/shots.mjs', ...configs], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('card harness reported page errors'); }
out.trim().split('\n').forEach((l) => { if (/service calls [1-9]|Nova websocket calls [1-9]|PAGEERROR/.test(l)) fail('card harness: ' + l.trim()); });
ok('card renders in ' + configs.length + ' configs: ' + configs.join(', '));

try { execFileSync(process.execPath, ['dev/editor.mjs'], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('editor checks'); }
ok('editor checks pass');

try { execFileSync(process.execPath, ['dev/pages.mjs'], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('Climate and Family page checks'); }
ok('Climate and Family page checks pass');

try { execFileSync(process.execPath, ['dev/phone.mjs'], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('phone layout checks'); }
ok('phone layout checks pass');

try { execFileSync(process.execPath, ['dev/phone-sheets.mjs'], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('phone pop-up checks'); }
ok('phone pop-up checks pass (every sheet at 360x740: fits, 44 px controls, back button, swipe, keyboard, confirm steps)');

try { execFileSync(process.execPath, ['dev/phone-taps.mjs'], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('phone tap-area checks'); }
ok('phone tap areas: no two controls overlap on any page at 360, 390 and 412 wide (invisible tap areas included)');

try { execFileSync(process.execPath, ['dev/rail.mjs'], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('rail and tab bar checks'); }
ok('rail and tab bar are on top on every page and state, and every tap switches the page; the pop-ups still cover the rail');

try { execFileSync(process.execPath, ['dev/nav-motion.mjs'], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('navigation motion checks (dev/nav-motion.mjs)'); }
ok('sliding indicator is behind the links, measured, and in place at every page, resize and rebuild; the card fade ends clean; reduced motion turns both off');

try { execFileSync(process.execPath, ['dev/auto-rotate.mjs'], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('auto rotation checks (dev/auto-rotate.mjs)'); }
ok('auto rotation: off by default; rotates, wraps, waits after a touch, pauses for pop-ups, focus, idle clock and a hidden tab; one timer; config changes apply');

try { execFileSync(process.execPath, ['dev/contrast.mjs'], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('contrast (dev/contrast.mjs): a pair is under target'); }
ok('contrast: every theme passes on every surface, the rail and the phone bar (over any card) included');

try { execFileSync(process.execPath, ['dev/overflow.mjs'], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('text overflow checks (dev/overflow.mjs)'); }
ok('no text outside its box or clipped on Energy, Vacuum and System at 1024x768, 1180x820, 1280x800, 1366x1024 and 1920x1200, at normal and 25% larger text');

try { execFileSync(process.execPath, ['dev/tablet-geometry.mjs'], { encoding: 'utf8' }); } catch (e) { console.error(e.stdout || ''); fail('the tablet layout changed (dev/tablet-geometry.mjs)'); }
ok('tablet layout matches the 0.6.1 bundle (rendered in the same run)');
