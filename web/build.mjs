import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, '../Jellyfin.Plugin.CatScreensaver/Web/cat-screensaver.js');

mkdirSync(dirname(output), { recursive: true });

await build({
    entryPoints: [resolve(here, 'src/main.js')],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    minify: true,
    legalComments: 'none',
    outfile: output,
    banner: {
        js: '/* Cat Screensaver - original procedural art - GPL-3.0 */'
    }
});

console.log(`built ${output}`);
