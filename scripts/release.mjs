/**
 * Publishes @uisatin/ui to npm from packages/ui/dist, the built package (compiled ESM, types,
 * styles.css and its own package.json). Run by the Release workflow after Changesets has bumped
 * the version (it publishes through npm Trusted Publishing); by hand it needs `npm login`.
 *
 * 1. Builds the package (tsup, tsc, the precompiled CSS, dist/package.json).
 * 2. Skips when this version is already on npm, so re-runs do nothing.
 * 3. Publishes dist (public), then tags the commit with Changesets (`@uisatin/ui@x.y.z`).
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })

// In CI, npm publishes through Trusted Publishing (OIDC): the workflow needs `id-token: write`.
// Without it (or a token) there is nothing to publish with, so stop cleanly instead of failing.
if (process.env.CI && !process.env.ACTIONS_ID_TOKEN_REQUEST_URL && !process.env.NODE_AUTH_TOKEN) {
  console.log('No OIDC token or npm token in this CI run: skipping the npm publish.')
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
