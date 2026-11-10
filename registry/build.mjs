/**
 * Builds the Satin shadcn registry into satin-lab/public/r/ (served at https://uisatin.dev/r/).
 *
 *   npm run registry                                   # https://uisatin.dev/r
 *   REGISTRY_URL=http://localhost:4380/r OUT=/tmp/r npm run registry   # a local copy to test
 *
 * One `registry:ui` item per file in packages/ui/src/components, plus `utils` (cn) and
 * `satin-styles` (the precompiled dist/styles.css, so installed components need no Tailwind).
 * Imports are rewritten to shadcn's conventions: `../lib/utils` → `@/lib/utils`,
 * `./badge` → `@/registry/satin/ui/badge`; the CLI then maps them onto the app's aliases.
 * Run `npm run build -w @satin/ui` first, the styles item reads dist/styles.css.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nav, pagesOf } from '../satin-lab/src/nav.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ui = join(root, 'packages/ui')
const base = (process.env.REGISTRY_URL ?? 'https://uisatin.dev/r').replace(/\/$/, '')
const out = resolve(process.env.OUT ?? join(root, 'satin-lab/public/r'))
const url = (name) => `${base}/${name}.json`

const pkg = JSON.parse(readFileSync(join(ui, 'package.json'), 'utf8'))
const versions = { ...pkg.dependencies }
const pages = Object.fromEntries(nav.flatMap((g) => pagesOf(g.items).map((i) => [i.id, i])))

const css = join(ui, 'dist/styles.css')
if (!existsSync(css)) throw new Error('packages/ui/dist/styles.css is missing: run `npm run build -w @satin/ui` first')

/** npm packages a source imports (not react / react-dom, which every app has), with the range we build against. */
function npmDeps(src) {
  const names = new Set()
  for (const [, spec] of src.matchAll(/from\s+'([^'.][^']*)'/g)) {
    const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]
    if (name === 'react' || name === 'react-dom') continue
    names.add(name)
  }
  return [...names].sort().map((n) => (versions[n] ? `${n}@${versions[n]}` : n))
}

const titleOf = (name) => name.split('-').map((w, i) => (i ? w : w[0].toUpperCase() + w.slice(1))).join(' ')

const items = []

items.push({
  name: 'satin-styles',
  type: 'registry:item',
  title: 'Satin styles',
  description:
    'Satin tokens, motion and every class the components use, precompiled. Import it once (for example in main.tsx); wrap a subtree in `.dark` for dark mode. No Tailwind needed.',
  files: [
    {
      path: 'registry/satin/styles/satin.css',
      type: 'registry:file',
      target: '~/src/styles/satin.css',
      content: readFileSync(css, 'utf8'),
    },
  ],
})

items.push({
  name: 'utils',
  type: 'registry:lib',
  title: 'Utils',
  description: 'The `cn` helper: joins class names and lets the later class win.',
  dependencies: npmDeps(readFileSync(join(ui, 'src/lib/utils.ts'), 'utf8')),
  files: [
    {
      path: 'registry/satin/lib/utils.ts',
      type: 'registry:lib',
      content: readFileSync(join(ui, 'src/lib/utils.ts'), 'utf8'),
    },
  ],
})

const components = readdirSync(join(ui, 'src/components'))
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => f.replace(/\.tsx$/, ''))
  .sort()

for (const name of components) {
  const raw = readFileSync(join(ui, 'src/components', `${name}.tsx`), 'utf8')
  const local = [...raw.matchAll(/from\s+'\.\/([^']+)'/g)].map((m) => m[1])
  for (const dep of local) if (!components.includes(dep)) throw new Error(`${name} imports ./${dep}, which is not a component`)
  const others = [...raw.matchAll(/from\s+'(\.\.?\/[^']+)'/g)].map((m) => m[1]).filter((s) => s !== '../lib/utils' && !s.startsWith('./'))
  if (others.length) throw new Error(`${name} imports ${others.join(', ')}; the registry only knows ../lib/utils and ./<component>`)

  const content = raw
    .replace(/from\s+'\.\.\/lib\/utils'/g, "from '@/lib/utils'")
    .replace(/from\s+'\.\/([^']+)'/g, "from '@/registry/satin/ui/$1'")
  const page = pages[name]
  items.push({
    name,
    type: 'registry:ui',
    title: page?.title ?? titleOf(name),
    description: page?.description ?? `The Satin ${titleOf(name)} component.`,
    dependencies: npmDeps(raw),
    registryDependencies: [url('satin-styles'), url('utils'), ...[...new Set(local)].sort().map(url)],
    files: [{ path: `registry/satin/ui/${name}.tsx`, type: 'registry:ui', content }],
    ...(page ? { docs: `${page.title} docs: https://uisatin.dev${page.href}` } : {}),
  })
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
for (const item of items) {
  writeFileSync(
    join(out, `${item.name}.json`),
    JSON.stringify({ $schema: 'https://ui.shadcn.com/schema/registry-item.json', ...item }, null, 2) + '\n',
  )
}
// The index, in shadcn's registry.json format (files listed without their content).
writeFileSync(
  join(out, 'registry.json'),
  JSON.stringify(
    {
      $schema: 'https://ui.shadcn.com/schema/registry.json',
      name: 'satin',
      homepage: 'https://uisatin.dev',
      items: items.map(({ files, ...item }) => ({ ...item, files: files.map(({ content, ...f }) => f) })),
    },
    null,
    2,
  ) + '\n',
)
console.log(`${items.length} registry items → ${out} (${base})`)
