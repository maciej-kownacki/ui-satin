/**
 * Publishes @satin/ui to npm from packages/ui/dist, the built package (compiled ESM, types,
 * styles.css and its own package.json). Run by the Release workflow after Changesets has bumped
 * the version; safe to run by hand too (`npm run release`), it needs `npm login` or NPM_TOKEN.
 *
 * 1. Builds the package (tsup, tsc, the precompiled CSS, dist/package.json).
 * 2. Skips when this version is already on npm, so re-runs do nothing.
 * 3. Publishes dist (public), then tags the commit with Changesets (`@satin/ui@x.y.z`).
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })

// In CI without a token there is nothing to publish with: say so and stop cleanly, so pushes to
// main stay green until the NPM_TOKEN secret is added. Adding it is what turns publishing on.
if (process.env.CI && !process.env.NODE_AUTH_TOKEN) {
  console.log('NPM_TOKEN is not set: skipping the npm publish.')
  process.exit(0)
}
const { name, version } = JSON.parse(readFileSync('packages/ui/package.json', 'utf8'))

run('npm run build:ui')

let published = false
try {
  published = execSync(`npm view ${name}@${version} version`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() === version
} catch {
  // npm view exits non-zero for a version (or package) that isn't published yet.
}
if (published) {
  console.log(`${name}@${version} is already on npm; nothing to publish.`)
  process.exit(0)
}

run('npm publish ./packages/ui/dist --access public')
run('npx changeset tag')
