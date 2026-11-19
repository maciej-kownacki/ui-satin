/**
 * Writes dist/package.json, the manifest that gets published (`npm publish dist`).
 * The workspace package.json keeps pointing at src so satin-lab builds from source with
 * its own Tailwind; this one points consumers at the compiled JS, types and styles.css.
 */
import { copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { addDeclarationExtensions, dropFigmaIds, markUseClient } from './dist.mjs'

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
    // The design tokens (W3C format, Light and Dark), the source theme.css is generated from.
    './tokens.json': './tokens.json',
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
copyFileSync('../../tokens/tokens.json', 'dist/tokens.json')
// The agents' guide for apps, without its sections for work on the repo ("## Testing (repo only)").
if (existsSync('AGENTS.md')) writeFileSync('dist/AGENTS.md', readFileSync('AGENTS.md', 'utf8').replace(/\n## [^\n]*\(repo only\)[\s\S]*?(?=\n## |$)/g, '').trimEnd() + '\n')
console.log('dist/package.json written')

// The .d.ts imports with their extensions, no Figma node ids in the types, 'use client' back on
// every entry (build/dist.mjs, shared with Satin Pro). Not on theme/ (themeCss, themeVars) or
// lib/utils (cn): plain functions a Server Component calls, e.g. themeCss() in a root layout.
console.log(`.d.ts imports with extensions: ${addDeclarationExtensions('dist')}`)
console.log(`Figma node ids dropped from the types: ${dropFigmaIds('dist')}`)
console.log(`'use client' on ${markUseClient('dist')} entries`)
