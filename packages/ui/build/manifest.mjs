/**
 * Writes dist/package.json, the manifest that gets published (`npm publish dist`).
 * The workspace package.json keeps pointing at src so satin-lab builds from source with
 * its own Tailwind; this one points consumers at the compiled JS, types and styles.css.
 */
import { copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

const manifest = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: 'module',
  license: pkg.license,
  repository: pkg.repository,
  homepage: pkg.homepage,
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
  peerDependencies: pkg.peerDependencies,
  dependencies: pkg.dependencies,
}
for (const k of Object.keys(manifest)) if (manifest[k] === undefined) delete manifest[k]

writeFileSync('dist/package.json', JSON.stringify(manifest, null, 2) + '\n')
if (existsSync('README.md')) copyFileSync('README.md', 'dist/README.md')
console.log('dist/package.json written')
