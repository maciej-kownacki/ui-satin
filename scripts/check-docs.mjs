/**
 * The docs, the registry and the package must agree, so an agent that follows one never lands
 * on a 404 in another:
 *
 * - every component file (an npm entry, `@uisatin/ui/<file>`) has a docs page in nav.ts, unless
 *   it's a shared part listed in INTERNAL below;
 * - every component and AI-pattern page has its .astro file, a registry item and a component file
 *   (or an alias to the file it lives in);
 * - every registry item is a component file, an alias, or one of the shared items.
 *
 *   node --no-warnings scripts/check-docs.mjs   (after `npm run registry`)
 */
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nav, pagesOf } from '../satin-lab/src/nav.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Entries that are parts of other components, documented on their pages.
const INTERNAL = {
  'banner-mesh': 'the Banner and Announcement bar glows',
  chart: 'ChartCard, the frame every chart page uses',
  floating: 'positioning shared by the overlays',
  labels: 'SatinLabels, documented in the README and on Installation',
  'selectable-card': 'what Selectable radio and Selectable checkbox share',
  'sliding-indicator': 'the sliding pill of Tabs, Pagination and Segmented control',
  'pointer-modality': 'how Tabs and the menus tell a mouse press from a key, for the focus ring',
}
// Pages whose component lives in another file (as in registry/build.mjs).
const ALIASES = { 'area-chart': 'line-chart' }
const SHARED_ITEMS = ['satin-styles', 'utils', 'registry']

const files = readdirSync(join(root, 'packages/ui/src/components'))
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => f.replace(/\.tsx$/, ''))
const pages = nav.filter((g) => g.id === 'components' || g.id === 'ai-patterns').flatMap((g) => pagesOf(g.items))
const pageIds = new Set(pages.map((p) => p.id))
const items = readdirSync(join(root, 'satin-lab/public/r'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))

const problems = []
for (const f of files) if (!pageIds.has(f) && !INTERNAL[f]) problems.push(`@uisatin/ui/${f} has no docs page in nav.ts`)
for (const id of Object.keys(INTERNAL)) if (!files.includes(id)) problems.push(`INTERNAL lists ${id}, which is no longer a component file`)
for (const p of pages) {
  if (!existsSync(join(root, 'satin-lab/src/pages', `${p.href}.astro`))) problems.push(`${p.href}: no page file`)
  if (!items.includes(p.id)) problems.push(`${p.href}: no registry item r/${p.id}.json`)
  if (!files.includes(ALIASES[p.id] ?? p.id)) problems.push(`${p.href}: no component file ${ALIASES[p.id] ?? p.id}.tsx`)
}
for (const i of items) if (!files.includes(i) && !ALIASES[i] && !SHARED_ITEMS.includes(i)) problems.push(`r/${i}.json matches no component file`)

if (problems.length) {
  console.error(`Docs, registry and package disagree:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`docs, registry and package agree: ${files.length} entries, ${pages.length} pages, ${items.length} registry files`)
