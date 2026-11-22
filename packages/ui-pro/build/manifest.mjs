/**
 * Writes dist/package.json for Satin Pro, like Satin Free's build/manifest.mjs: the workspace
 * package.json points at src (the docs build from source), this one at the compiled JS, types and
 * styles.css. It stays private until distribution and licensing are decided (see README).
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { addDeclarationExtensions, dropFigmaIds, markUseClient } from '../../ui/build/dist.mjs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

const manifest = {
  name: pkg.name,
  version: pkg.version,
  // TODO(distribution): drop `private` once Satin Pro's distribution and license are decided.
  private: true,
  description: pkg.description,
  type: 'module',
  license: pkg.license,
  author: pkg.author,
  repository: pkg.repository,
  homepage: pkg.homepage,
  bugs: pkg.bugs,
  keywords: pkg.keywords,
  satin: pkg.satin,
  sideEffects: ['*.css'],
  main: './index.js',
  module: './index.js',
  types: './index.d.ts',
  exports: {
    '.': { types: './index.d.ts', import: './index.js', default: './index.js' },
    './styles.css': './styles.css',
    './package.json': './package.json',
    './*': { types: './components/*.d.ts', import: './components/*.js', default: './components/*.js' },
  },
  engines: pkg.engines,
  // Pro's stylesheet leaves out what Free's has, and its JS imports Free's components, so the two
  // go together at one version.
  peerDependencies: pkg.peerDependencies,
  // Lexical is optional: only the rich text editor (`@uisatin/pro/rich-text-editor`) imports it.
  peerDependenciesMeta: pkg.peerDependenciesMeta,
  dependencies: pkg.dependencies,
}
for (const k of Object.keys(manifest)) if (manifest[k] === undefined) delete manifest[k]

writeFileSync('dist/package.json', JSON.stringify(manifest, null, 2) + '\n')
for (const f of ['README.md', 'AGENTS.md', 'CHANGELOG.md']) if (existsSync(f)) copyFileSync(f, `dist/${f}`)
console.log('dist/package.json written')

console.log(`.d.ts imports with extensions: ${addDeclarationExtensions('dist')}`)
console.log(`Figma node ids dropped from the types: ${dropFigmaIds('dist')}`)
console.log(`'use client' on ${markUseClient('dist')} entries`)
