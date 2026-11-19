/**
 * The shortest example on each component's docs page, as a file an app can keep: the registry's
 * `<name>-demo` items (pages/r/[name]-demo.json.ts) and the markdown pages read it. Imports point
 * at the app's components/ui, like the Installation section's shadcn example; a snippet that is
 * only JSX gets wrapped in a component so the file compiles on its own.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const demos = import.meta.glob<{ options?: { code: string }[] }>('../demos/*.tsx')

/** Docs pages whose component lives in another file (Area chart is line-chart.tsx's AreaCard). */
export const ALIASES: Record<string, string> = { 'area-chart': 'line-chart' }

/** The registry folder, from the site's own folder or the repo's. */
export const registryDir = [join(process.cwd(), 'public/r'), join(process.cwd(), 'satin-lab/public/r')].find((d) => existsSync(d))

export function registryItem(name: string): { name: string; dependencies?: string[]; registryDependencies?: string[]; meta?: { props?: Record<string, unknown> } } | undefined {
  const file = registryDir && join(registryDir, `${name}.json`)
  return file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined
}

/** Names of the components with a docs demo. */
export const demoNames = Object.keys(demos).map((p) => p.replace('../demos/', '').replace(/\.tsx$/, ''))

/** The shortest code sample of a demo, as written for the npm package. */
export async function shortestExample(id: string): Promise<string | undefined> {
  const load = demos[`../demos/${id}.tsx`]
  if (!load) return undefined
  const mod = await load()
  return [...(mod.options ?? [])].sort((a, b) => a.code.length - b.code.length)[0]?.code
}

const pascal = (id: string) => id.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())

/** The example as a standalone file for an app with the registry's components in components/ui. */
export function asAppFile(id: string, code: string) {
  const local = code
    .replaceAll("'@uisatin/ui/", "'@/components/ui/")
    .replaceAll("'@uisatin/pro/", "'@/components/ui/")
    .replaceAll("'@uisatin/ui'", `'@/components/ui/${id}'`)
  if (/^export (default )?function/m.test(local)) return local
  const lines = local.split('\n')
  const imports = lines.filter((l) => /^import /.test(l))
  const body = lines.filter((l) => !/^import /.test(l)).join('\n').trim()
  return `${imports.join('\n')}

export default function ${pascal(id)}Demo() {
  return (
    <>
${body
  .split('\n')
  .map((l) => `      ${l}`)
  .join('\n')}
    </>
  )
}
`
}

/** The other Satin components and the npm packages an example file imports. */
export function importsOf(file: string) {
  const ui = [...new Set([...file.matchAll(/from '@\/components\/ui\/([\w-]+)'/g)].map((m) => m[1]))]
  const npm = [...new Set([...file.matchAll(/from '([^'.@/][^']*|@(?!\/)[^']+)'/g)].map((m) => m[1]))]
    .map((s) => (s.startsWith('@') ? s.split('/').slice(0, 2).join('/') : s.split('/')[0]))
    .filter((n) => n !== 'react' && n !== 'react-dom')
  return { ui, npm: [...new Set(npm)] }
}
