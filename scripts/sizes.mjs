/**
 * What each component adds to an app's JavaScript: its npm entry bundled with everything it
 * imports (Radix, cva, tailwind-merge, icons) except React, minified and gzipped, the way
 * size-limit measures the budgets in .size-limit.json. The docs print it under Installation and
 * in the markdown pages; styles.css is one shared file, so it isn't counted per component.
 * Satin Pro's components are measured the same way with Satin Free left out: it's their peer
 * dependency, so the number is what a Pro component adds on top of @uisatin/ui.
 * Run after the package builds: satin-lab/src/sizes.json.
 *
 *   node scripts/sizes.mjs
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dists = [join(root, 'packages/ui/dist/components'), join(root, 'packages/ui-pro/dist/components')].filter((d) => existsSync(d))
const files = dists.flatMap((dist) => readdirSync(dist).filter((f) => f.endsWith('.js')).map((file) => ({ dist, file })))
const sizes = {}
for (const { dist, file } of files.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))) {
  const result = await build({
    entryPoints: [join(dist, file)],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    // An app's production build: Lexical (and anything else that ships a dev and a prod build
    // behind NODE_ENV) counts its prod build only, as a bundler would ship it.
    define: { 'process.env.NODE_ENV': '"production"' },
    conditions: ['production'],
    write: false,
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client', '@uisatin/ui', '@uisatin/ui/*'],
    logLevel: 'silent',
  })
  sizes[file.replace(/\.js$/, '')] = gzipSync(result.outputFiles[0].contents).length
}
writeFileSync(join(root, 'satin-lab/src/sizes.json'), JSON.stringify(sizes, null, 2) + '\n')
console.log(`sizes.json: ${Object.keys(sizes).length} components, Button ${(sizes.button / 1000).toFixed(1)} kB gzip`)
