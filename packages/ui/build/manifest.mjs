/**
 * Writes dist/package.json, the manifest that gets published (`npm publish dist`).
 * The workspace package.json keeps pointing at src so satin-lab builds from source with
 * its own Tailwind; this one points consumers at the compiled JS, types and styles.css.
 */
import { copyFileSync, readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

const manifest = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: 'module',
  license: pkg.license,
  author: pkg.author,
  repository: pkg.repository,
  homepage: pkg.homepage,
  bugs: pkg.bugs,
  keywords: pkg.keywords,
  // Satin Free (this package) or Satin Pro (a separate, licensed package later).
  satin: pkg.satin,
  sideEffects: ['*.css'],
  main: './index.js',
  module: './index.js',
  types: './index.d.ts',
  exports: {
    '.': { types: './index.d.ts', import: './index.js', default: './index.js' },
    './styles.css': './styles.css',
    './package.json': './package.json',
    // themeCss / themeVars on their own, and the cn helper, for apps that compose their own parts.
    './theme': { types: './theme/index.d.ts', import: './theme/index.js', default: './theme/index.js' },
    './lib/utils': { types: './lib/utils.d.ts', import: './lib/utils.js', default: './lib/utils.js' },
    './*': { types: './components/*.d.ts', import: './components/*.js', default: './components/*.js' },
  },
  // ESM only: Node 20.19+ can also require() it.
  engines: pkg.engines,
  peerDependencies: pkg.peerDependencies,
  dependencies: pkg.dependencies,
  publishConfig: { access: 'public' },
}
for (const k of Object.keys(manifest)) if (manifest[k] === undefined) delete manifest[k]

writeFileSync('dist/package.json', JSON.stringify(manifest, null, 2) + '\n')
if (existsSync('README.md')) copyFileSync('README.md', 'dist/README.md')
if (existsSync('LICENSE')) copyFileSync('LICENSE', 'dist/LICENSE')
if (existsSync('CHANGELOG.md')) copyFileSync('CHANGELOG.md', 'dist/CHANGELOG.md')
console.log('dist/package.json written')

// tsc writes relative imports in the .d.ts files as they are in the source ('./button'). Under
// moduleResolution node16 / nodenext an ES module's imports need their extension, so point each
// one at the file it means: './button' → './button.js', a folder like './theme' → './theme/index.js'.
// Bundler resolution reads the same files and keeps working.
const declarations = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const path = join(dir, f)
    return statSync(path).isDirectory() ? declarations(path) : f.endsWith('.d.ts') ? [path] : []
  })
let rewritten = 0
for (const file of declarations('dist')) {
  const src = readFileSync(file, 'utf8')
  const out = src.replace(/((?:from|import)\s*\(?\s*)(['"])(\.{1,2}\/[^'"]+)\2/g, (match, lead, quote, spec) => {
    if (/\.(js|mjs|cjs|json|css)$/.test(spec)) return match
    const target = join(dirname(file), spec)
    const resolved = existsSync(`${target}.d.ts`) ? `${spec}.js` : existsSync(join(target, 'index.d.ts')) ? `${spec}/index.js` : null
    if (!resolved) throw new Error(`${relative('dist', file)}: can't resolve ${spec}`)
    rewritten++
    return `${lead}${quote}${resolved}${quote}`
  })
  if (out !== src) writeFileSync(file, out)
}
console.log(`.d.ts imports with extensions: ${rewritten}`)

// esbuild drops 'use client' when it bundles, so put it back on every entry a React Server
// Components app can import: the barrel and each component. Same line as the first statement,
// so the source maps stay aligned.
const entries = ['dist/index.js', 'dist/theme/index.js', ...readdirSync('dist/components').filter((f) => f.endsWith('.js')).map((f) => `dist/components/${f}`)]
for (const f of entries) {
  const js = readFileSync(f, 'utf8')
  if (!js.startsWith("'use client'")) writeFileSync(f, `'use client';${js}`)
}
console.log(`'use client' on ${entries.length} entries`)
