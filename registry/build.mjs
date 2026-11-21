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
 *
 * Satin Pro (packages/ui-pro) adds one item per file in its src/components, marked with the
 * edition its package.json names (`"satin": { "edition": "pro" }` → `meta.edition: "pro"`), and
 * `satin-pro-styles`, its own precompiled CSS on top of Free's. A Pro file's imports of Satin Free
 * (`@uisatin/ui/button`) become the same `@/registry/satin/ui/button` and a registry dependency.
 *
 * Run `npm run build -w @uisatin/ui` and `npm run build -w @uisatin/pro` first: the styles items
 * read their dist/styles.css.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allNav as nav, pagesOf } from '../satin-lab/src/nav.ts'
import { declaredThemeVars, prefixSource, prefixThemeVars } from '../packages/ui/build/prefix.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ui = join(root, 'packages/ui')
const pro = join(root, 'packages/ui-pro')
const base = (process.env.REGISTRY_URL ?? 'https://uisatin.dev/r').replace(/\/$/, '')
const out = resolve(process.env.OUT ?? join(root, 'satin-lab/public/r'))
const url = (name) => `${base}/${name}.json`

const pkg = JSON.parse(readFileSync(join(ui, 'package.json'), 'utf8'))
const proPkg = JSON.parse(readFileSync(join(pro, 'package.json'), 'utf8'))
const versions = { ...pkg.dependencies, ...proPkg.dependencies }
const pages = Object.fromEntries(nav.flatMap((g) => pagesOf(g.items).map((i) => [i.id, i])))

const css = join(ui, 'dist/styles.css')
if (!existsSync(css)) throw new Error('packages/ui/dist/styles.css is missing: run `npm run build -w @uisatin/ui` first')

// The registry ships the same prefixed classes and variables as the npm build, so the copied
// source matches satin.css (see packages/ui/build/prefix.mjs).
const classes = new Set(JSON.parse(readFileSync(join(ui, 'build/.classes.json'), 'utf8')))
const declared = declaredThemeVars(readFileSync(css, 'utf8'))
const prefixed = (code, file) => prefixThemeVars(prefixSource(code, classes, file).code, declared)

// Satin Pro's components, if it has any; their classes are listed by Pro's own build.
const proComponents = existsSync(join(pro, 'src/components'))
  ? readdirSync(join(pro, 'src/components'))
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => f.replace(/\.tsx$/, ''))
      .sort()
  : []
const proCss = join(pro, 'dist/styles.css')
if (proComponents.length && !existsSync(proCss)) throw new Error('packages/ui-pro/dist/styles.css is missing: run `npm run build -w @uisatin/pro` first')
const proClasses = proComponents.length ? new Set(JSON.parse(readFileSync(join(pro, 'build/.classes.json'), 'utf8'))) : new Set()
const proDeclared = proComponents.length ? new Set([...declared, ...declaredThemeVars(readFileSync(proCss, 'utf8'))]) : declared
const proPrefixed = (code, file) => prefixThemeVars(prefixSource(code, proClasses, file).code, proDeclared)

/** npm packages a source imports (not react / react-dom, which every app has), with the range we build against. */
function npmDeps(src) {
  const names = new Set()
  for (const [, spec] of src.matchAll(/from\s+'([^'.][^']*)'/g)) {
    const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]
    // Satin Free, under a Pro component, comes as registry items, not as the npm package.
    if (name === 'react' || name === 'react-dom' || name === '@uisatin/ui') continue
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
    'Satin tokens, motion and every class the components use, precompiled. Import it once (for example in main.tsx); `.dark` or `data-theme="dark"` on a parent for dark mode, `data-theme="system"` to follow the OS. No Tailwind needed.',
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

// What each file's components take, from the TypeScript source (scripts/props.mjs).
const props = JSON.parse(readFileSync(join(root, 'satin-lab/src/props.json'), 'utf8'))
// Docs pages whose component lives in another file: the Area chart is line-chart.tsx's AreaCard,
// the prompt bar's Notice is PromptBar's `notice` prop.
const ALIASES = { 'area-chart': 'line-chart', 'prompt-bar-notice': 'prompt-bar' }
// The imports, read with the comments taken out: a comment that mentions "from './dialog'" isn't one.
const importsOf = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1')

for (const name of components) {
  const raw = readFileSync(join(ui, 'src/components', `${name}.tsx`), 'utf8')
  const local = [...importsOf(raw).matchAll(/from\s+'\.\/([^']+)'/g)].map((m) => m[1]).filter((d) => d !== name)
  for (const dep of local) if (!components.includes(dep)) throw new Error(`${name} imports ./${dep}, which is not a component`)
  const others = [...importsOf(raw).matchAll(/from\s+'(\.\.?\/[^']+)'/g)].map((m) => m[1]).filter((s) => s !== '../lib/utils' && !s.startsWith('./'))
  if (others.length) throw new Error(`${name} imports ${others.join(', ')}; the registry only knows ../lib/utils and ./<component>`)

  const content = prefixed(raw, name)
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
    // The npm release this source matches, the edition (Free, open source, or Pro), and the
    // props of every component in the file, from its TypeScript types.
    meta: { version: pkg.version, edition: pkg.satin?.edition ?? 'free', ...(props[name] ? { props: props[name] } : {}) },
  })
}

// A page whose component sits in another file gets an item of its own that installs that file.
for (const [alias, file] of Object.entries(ALIASES)) {
  const target = items.find((i) => i.name === file)
  const page = pages[alias]
  if (!target || !page) throw new Error(`registry alias ${alias} → ${file}: no item or no page`)
  items.push({ ...target, name: alias, title: page.title, description: page.description, docs: `${page.title} docs: https://uisatin.dev${page.href}` })
}

// Satin Pro: its stylesheet, then one item per component, built on Free's items.
if (proComponents.length) {
  items.push({
    name: 'satin-pro-styles',
    type: 'registry:item',
    title: 'Satin Pro styles',
    description:
      "Satin Pro's own classes and component CSS, precompiled: only what Satin styles doesn't already have. Import it after satin.css.",
    registryDependencies: [url('satin-styles')],
    files: [
      {
        path: 'registry/satin/styles/satin-pro.css',
        type: 'registry:file',
        target: '~/src/styles/satin-pro.css',
        content: readFileSync(proCss, 'utf8'),
      },
    ],
    meta: { version: proPkg.version, edition: proPkg.satin?.edition ?? 'pro' },
  })
}
for (const name of proComponents) {
  if (components.includes(name)) throw new Error(`packages/ui-pro/src/components/${name}.tsx has the name of a Satin Free component`)
  const raw = readFileSync(join(pro, 'src/components', `${name}.tsx`), 'utf8')
  const code = importsOf(raw)
  // Pro files import Satin Free by its package entries and other Pro files by ./name.
  const free = [...code.matchAll(/from\s+'@uisatin\/ui\/([^']+)'/g)].map((m) => m[1]).filter((d) => d !== 'lib/utils')
  for (const dep of free) if (!components.includes(dep)) throw new Error(`${name} imports @uisatin/ui/${dep}, which is not a Satin Free component`)
  const local = [...code.matchAll(/from\s+'\.\/([^']+)'/g)].map((m) => m[1]).filter((d) => d !== name)
  for (const dep of local) if (!proComponents.includes(dep)) throw new Error(`${name} imports ./${dep}, which is not a Pro component`)
  const others = [...code.matchAll(/from\s+'(\.\.?\/[^']+)'/g)].map((m) => m[1]).filter((s) => !s.startsWith('./'))
  if (others.length) throw new Error(`${name} imports ${others.join(', ')}; a Pro file imports @uisatin/ui/<name> and ./<pro component> only`)

  const content = proPrefixed(raw, name)
    .replace(/from\s+'@uisatin\/ui\/lib\/utils'/g, "from '@/lib/utils'")
    .replace(/from\s+'@uisatin\/ui\/([^']+)'/g, "from '@/registry/satin/ui/$1'")
    .replace(/from\s+'\.\/([^']+)'/g, "from '@/registry/satin/ui/$1'")
    // Pro's words join Free's SatinLabels by declaration merging. The CLI rewrites imports, not
    // this, so it names shadcn's default alias for components/ui.
    .replace(/declare module\s+'@uisatin\/ui\/labels'/g, "declare module '@/components/ui/labels'")
  const page = pages[name]
  items.push({
    name,
    type: 'registry:ui',
    title: page?.title ?? titleOf(name),
    description: page?.description ?? `The Satin Pro ${titleOf(name)} component.`,
    dependencies: npmDeps(raw),
    registryDependencies: [url('satin-styles'), url('satin-pro-styles'), url('utils'), ...[...new Set([...free, ...local])].sort().map(url)],
    files: [{ path: `registry/satin/ui/${name}.tsx`, type: 'registry:ui', content }],
    ...(page ? { docs: `${page.title} docs: https://uisatin.dev${page.href}` } : {}),
    meta: { version: proPkg.version, edition: proPkg.satin?.edition ?? 'pro', ...(props[name] ? { props: props[name] } : {}) },
  })
}

// Examples: one registry:example per component with a docs demo, its shortest usage, served by
// the docs site (satin-lab/src/pages/r/[name]-demo.json.ts reads the demo). Listed here so the
// index has them.
const examples = components
  .concat(proComponents, Object.keys(ALIASES))
  .filter((name) => existsSync(join(root, 'satin-lab/src/demos', `${name}.tsx`)) && pages[name])
  .map((name) => ({
    name: `${name}-demo`,
    type: 'registry:example',
    title: `${pages[name].title} example`,
    description: `The shortest use of ${pages[name].title}, from its docs page.`,
    registryDependencies: [url(name)],
    files: [{ path: `registry/satin/examples/${name}-demo.tsx`, type: 'registry:example' }],
  }))

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
      items: [...items, ...examples].map(({ files, meta, ...item }) => ({
        ...item,
        ...(meta ? { meta: { version: meta.version, edition: meta.edition } } : {}),
        files: files.map(({ content, ...f }) => f),
      })),
    },
    null,
    2,
  ) + '\n',
)
console.log(`${items.length} registry items and ${examples.length} examples → ${out} (${base})`)
