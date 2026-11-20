/**
 * The docs, the registry and the package must agree, so an agent that follows one never lands
 * on a 404 in another:
 *
 * - every component file (an npm entry, `@uisatin/ui/<file>`) has a docs page in nav.ts, unless
 *   it's a shared part listed in INTERNAL below;
 * - every component and AI-pattern page has its .astro file, a registry item and a component file
 *   (or an alias to the file it lives in);
 * - every registry item is a component file, an alias, or one of the shared items;
 * - every id in nav.ts's `unreleased` (left out of the public build) is a page;
 * - a page says it's Pro (`edition: 'pro'` in nav.ts) exactly when its file is in Satin Pro
 *   (packages/ui-pro), and its registry item says the same edition.
 *
 *   node --no-warnings scripts/check-docs.mjs   (after `npm run registry`)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allNav as nav, pagesOf, unreleased } from '../satin-lab/src/nav.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Entries (Free's or Pro's) that are parts of other components, documented on their pages.
const INTERNAL = {
  'banner-mesh': 'the Banner and Announcement bar glows',
  chart: 'ChartCard, the frame every chart page uses',
  floating: 'positioning shared by the overlays',
  labels: 'SatinLabels, documented in the README and on Installation',
  'selectable-card': 'what Selectable radio and Selectable checkbox share',
  'sliding-indicator': 'the sliding pill of Tabs, Pagination and Segmented control',
  'step-slide': 'the step slide of Decision card, shared with Command pages (Satin Pro)',
  'pointer-modality': 'how Tabs and the menus tell a mouse press from a key, for the focus ring',
  'rolling-number': 'the rolling count of Bulk action bar (Satin Pro)',
  'rolling-number': 'the rolling digits of the Satin Pro counts (Bulk action bar, Filter bar)',
  'rolling-number': 'the rolling count of Bulk action bar (Satin Pro)',
}
// Pages whose component lives in another file (as in registry/build.mjs).
const ALIASES = { 'area-chart': 'line-chart' }
const SHARED_ITEMS = ['satin-styles', 'satin-pro-styles', 'utils', 'registry']

const componentFiles = (dir) =>
  existsSync(join(root, dir))
    ? readdirSync(join(root, dir))
        .filter((f) => f.endsWith('.tsx'))
        .map((f) => f.replace(/\.tsx$/, ''))
    : []
const freeFiles = componentFiles('packages/ui/src/components')
const proFiles = componentFiles('packages/ui-pro/src/components')
const files = [...freeFiles, ...proFiles]
const pages = nav.filter((g) => g.id === 'components' || g.id === 'ai-patterns').flatMap((g) => pagesOf(g.items))
const pageIds = new Set(pages.map((p) => p.id))
const items = readdirSync(join(root, 'satin-lab/public/r'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))

const problems = []
for (const f of freeFiles) if (!pageIds.has(f) && !INTERNAL[f]) problems.push(`@uisatin/ui/${f} has no docs page in nav.ts`)
for (const f of proFiles) if (!pageIds.has(f) && !INTERNAL[f]) problems.push(`@uisatin/pro/${f} has no docs page in nav.ts`)
for (const id of Object.keys(INTERNAL)) if (!files.includes(id)) problems.push(`INTERNAL lists ${id}, which is no longer a component file`)
for (const p of pages) {
  if (!existsSync(join(root, 'satin-lab/src/pages', `${p.href}.astro`))) problems.push(`${p.href}: no page file`)
  if (!items.includes(p.id)) problems.push(`${p.href}: no registry item r/${p.id}.json`)
  if (!files.includes(ALIASES[p.id] ?? p.id)) problems.push(`${p.href}: no component file ${ALIASES[p.id] ?? p.id}.tsx`)
  const isPro = proFiles.includes(ALIASES[p.id] ?? p.id)
  if (isPro !== (p.edition === 'pro')) problems.push(`${p.href}: ${isPro ? "its file is in packages/ui-pro, so nav.ts needs edition: 'pro'" : "nav.ts says edition: 'pro', but its file is in packages/ui"}`)
  const item = join(root, 'satin-lab/public/r', `${p.id}.json`)
  const edition = existsSync(item) ? JSON.parse(readFileSync(item, 'utf8')).meta?.edition : undefined
  if (edition && edition !== (isPro ? 'pro' : 'free')) problems.push(`r/${p.id}.json: meta.edition is ${edition}, the file is in Satin ${isPro ? 'Pro' : 'Free'}`)
}
for (const id of unreleased) if (!pageIds.has(id)) problems.push(`nav.ts unreleased lists ${id}, which is no component or AI-pattern page`)
for (const i of items) if (!files.includes(i) && !ALIASES[i] && !SHARED_ITEMS.includes(i)) problems.push(`r/${i}.json matches no component file`)

if (problems.length) {
  console.error(`Docs, registry and package disagree:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`docs, registry and package agree: ${freeFiles.length} Free and ${proFiles.length} Pro entries, ${pages.length} pages, ${items.length} registry files`)
