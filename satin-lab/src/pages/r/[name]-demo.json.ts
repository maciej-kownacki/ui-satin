import type { APIRoute, GetStaticPaths } from 'astro'
import { nav, pagesOf } from '../../nav'
import { ALIASES, asAppFile, demoNames, importsOf, registryItem, shortestExample } from '../../lib/examples'

/**
 * /r/<name>-demo.json: a registry:example item per component with a docs demo, the shortest use
 * from its page as a file (lib/examples.ts). `npx shadcn add @satin/button-demo` installs it
 * with the component it shows. registry/build.mjs lists these in registry.json.
 */
const pages = Object.fromEntries(nav.flatMap((g) => pagesOf(g.items)).map((p) => [p.id, p]))

export const getStaticPaths: GetStaticPaths = () =>
  demoNames.filter((name) => pages[name] && registryItem(name)).map((name) => ({ params: { name } }))

export const GET: APIRoute = async ({ params }) => {
  const name = params.name!
  const code = await shortestExample(name)
  const page = pages[name]
  if (!code || !page) return new Response('Not found', { status: 404 })
  const file = asAppFile(name, code)
  const { ui, npm } = importsOf(file)
  const versions = Object.fromEntries((registryItem(ALIASES[name] ?? name)?.dependencies ?? []).map((d) => [d.replace(/(.)@.*$/, '$1'), d]))
  const item = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: `${name}-demo`,
    type: 'registry:example',
    title: `${page.title} example`,
    description: `The shortest use of ${page.title}, from its docs page.`,
    ...(npm.length ? { dependencies: npm.map((n) => versions[n] ?? n) } : {}),
    registryDependencies: [...new Set([name, ...ui])].map((n) => `https://uisatin.dev/r/${n}.json`),
    files: [{ path: `registry/satin/examples/${name}-demo.tsx`, type: 'registry:example', content: file }],
    docs: `${page.title} docs: https://uisatin.dev${page.href}`,
  }
  return new Response(JSON.stringify(item, null, 2) + '\n', { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}
