/* Bundles src/ into dist/oriel.js (minified). Usage: node build.mjs [--watch] [--dev]
   --dev keeps the output readable. */
import * as esbuild from 'esbuild';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const dev = process.argv.includes('--dev') || process.argv.includes('--watch');
const banner = `/*! Oriel v${pkg.version} | MIT licence | Includes the Outfit font, (c) The Outfit Project Authors, SIL Open Font License 1.1 (see src/fonts/OFL.txt) */`;

const opts = {
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  outfile: 'dist/oriel.js',
  loader: { '.ttf': 'dataurl' },
  banner: { js: banner },
  legalComments: 'none',
  minify: !dev,
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
} else {
  await esbuild.build(opts);
}
