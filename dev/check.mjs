/* npm test: the checks CI runs. Fails (exit 1) on the first problem.
   1. version in package.json, src/version.js and CHANGELOG.md agree, README's manual install uses it, README images are absolute raw GitHub URLs (HACS strips relative ones) to files that exist
   2. dist/oriel.js parses
   3. the card renders every page in every dev config with no page errors and no service calls
   4. the editor checks pass
   5. the Climate and Family page checks pass */
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
