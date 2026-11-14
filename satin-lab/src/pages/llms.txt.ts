import type { APIRoute } from 'astro'
import { existsSync } from 'node:fs'
import { nav, pagesOf } from '../nav'
import pkg from '../../../packages/ui/package.json'

/**
 * llms.txt (llmstxt.org): what Satin is, how to install it, the rules an agent should follow, and
 * every docs page with its one-line description. A component with a shadcn registry item also
 * links its JSON, which carries the full source.
 */
export const GET: APIRoute = ({ site }) => {
  const url = (path: string) => new URL(path, site).toString()
  const registry = (href: string) => {
    const name = href.split('/').pop()
    return name && existsSync(`public/r/${name}.json`) ? ` ([source](${url(`/r/${name}.json`)}))` : ''
  }
  const groups = nav.map((g) => {
    const pages = [...new Map(pagesOf(g.items).map((p) => [p.href, p])).values()]
    return `## ${g.title}\n\n${pages.map((p) => `- [${p.title}](${url(p.href)}): ${p.description}${registry(p.href)}`).join('\n')}`
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

Or copy a component's source with the shadcn CLI: \`npx shadcn@latest add ${url('/r/button.json')}\`, or \`npx shadcn@latest add @satin/button\` with \`"registries": { "@satin": "https://uisatin.dev/r/{name}.json" }\` in components.json.

## Rules for agents

- Import each component from its own entry, \`${pkg.name}/<name>\` (kebab-case file name, e.g. \`${pkg.name}/segmented-control\`).
- Import \`${pkg.name}/styles.css\` once. Don't add Tailwind for Satin's sake; if the app has Tailwind or shadcn/ui already, they coexist (Satin's classes are \`sa:*\`, its variables \`--sa-*\`).
- Tailwind classes in \`className\` override Satin's only when the app has its own Tailwind; otherwise use the app's CSS.
- Style with the components' props (variant, size, tone, shape) and the Satin tokens (CSS variables), not raw colours.
- Dark mode: the \`dark\` class on \`<html>\` or any parent.
- React 19 or newer. The package is ESM only.

${groups.join('\n\n')}

## Optional

- [npm package](https://www.npmjs.com/package/${pkg.name})
- [shadcn registry index](${url('/r/registry.json')})
`
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
