import type { APIRoute } from 'astro'
import { existsSync } from 'node:fs'
import { nav, pagesOf, type NavItem } from '../nav'
import pkg from '../../../packages/ui/package.json'

/**
 * llms.txt (llmstxt.org): what Satin is, how to install it, the rules an agent should follow, and
 * every docs page with its one-line description. A component page links its markdown twin
 * (props, example, accessibility) and its registry JSON, which carries the full source.
 * llms-full.txt is this plus every component page in markdown. Satin Pro pages are marked (Pro).
 */
export const GET: APIRoute = ({ site }) =>
  new Response(llmsText(site), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export function llmsText(site: URL | undefined) {
  const url = (path: string) => new URL(path, site).toString()
  const markdown = (href: string) => (/^\/(components|ai-patterns)\//.test(href) ? ` ([markdown](${url(`${href}.md`)}))` : '')
  const registry = (href: string) => {
    const name = href.split('/').pop()
    return name && existsSync(`public/r/${name}.json`) ? ` ([source](${url(`/r/${name}.json`)}))` : ''
  }
  const groups = nav.map((g) => {
    const pages = [...new Map(pagesOf(g.items).map((p) => [p.href, p])).values()]
    const pro = (p: NavItem) => (p.edition === 'pro' ? ' (Pro)' : '')
    return `## ${g.title}\n\n${pages.map((p) => `- [${p.title}](${url(p.href)})${pro(p)}: ${p.description}${markdown(p.href)}${registry(p.href)}`).join('\n')}`
  })
  const text = `# Satin

> Satin is a React design system for calm product interfaces, with patterns for AI agents. The free edition is the open-source npm package ${pkg.name} (MIT, version ${pkg.version}): shadcn-style components built on Radix, themed with CSS tokens, shipped with one precompiled stylesheet, so the app doesn't need Tailwind.

## Install

\`\`\`sh
npm i ${pkg.name}
\`\`\`

\`\`\`tsx
import '${pkg.name}/styles.css' // once, at the root of the app
import { Button } from '${pkg.name}/button'
\`\`\`

Entries marked (Pro) are Satin Pro, the licensed edition: the package \`@uisatin/pro\` on top of ${pkg.name} at the same version, its stylesheet \`@uisatin/pro/styles.css\` imported after ${pkg.name}'s, each component from \`@uisatin/pro/<name>\`. Satin Pro isn't on npm yet; its registry items carry \`meta.edition: "pro"\`.

Or copy a component's source with the shadcn CLI: \`npx shadcn@latest add ${url('/r/button.json')}\`, or \`npx shadcn@latest add @satin/button\` with \`"registries": { "@satin": "https://uisatin.dev/r/{name}.json" }\` in components.json.

## Rules for agents

- Import each component from its own entry, \`${pkg.name}/<name>\` (kebab-case file name, e.g. \`${pkg.name}/segmented-control\`).
- Import \`${pkg.name}/styles.css\` once. Don't add Tailwind for Satin's sake; if the app has Tailwind or shadcn/ui already, they coexist (Satin's classes are \`sa:*\`, its variables \`--sa-*\`).
- Tailwind classes in \`className\` override Satin's only when the app has its own Tailwind; otherwise use the app's CSS.
- Style with the components' props (variant, size, tone, shape) and the Satin tokens (CSS variables), not raw colours.
- Every Satin CSS variable is \`--sa-*\` (\`--sa-bg-card\`, \`--sa-action-primary-bg\`). Set them after styles.css to change a token; the theme (brand, corners) comes from \`themeCss()\` in \`${pkg.name}/theme\`, which Server Components can call.
- Dark mode: the \`dark\` class or \`data-theme="dark"\` on \`<html>\` or any parent; \`data-theme="system"\` follows the OS.
- Overlays and groups have a props API and parts (\`Dialog\` or \`DialogRoot\` › \`DialogTrigger\` › \`DialogContent\`…); \`trigger\` props are rendered asChild, so pass a Button.
- Words the components say on their own (aria-labels, defaults) come from \`SatinLabels\` (\`${pkg.name}/labels\`), English by default.
- React 19 or newer only (refs are plain props). The package is ESM only.
- Accessibility: the components support WCAG 2.2 AA; the app still names icon-only buttons and unlabelled fields, sets \`lang\`, landmarks and headings, and tests with its own content. Known gaps and their workarounds: ${url('/accessibility')}.
- Every component page has a markdown twin at \`<page>.md\` with the props from the TypeScript types, an example and accessibility notes; [llms-full.txt](${url('/llms-full.txt')}) has them all.

${groups.join('\n\n')}

## Optional

- [npm package](https://www.npmjs.com/package/${pkg.name})
- [shadcn registry index](${url('/r/registry.json')})
`
  return text
}
