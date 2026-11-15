/**
 * A component's docs page as markdown, for agents: /components/<name>.md, /ai-patterns/<name>.md
 * and, all together, /llms-full.txt. Everything comes from the same data as the HTML page: the
 * sidebar entry (nav.ts), the API description (api.ts), the props read from the TypeScript
 * source (props.json), the accessibility notes (a11y.ts), the shortest example (the demo) and
 * the bundle size (sizes.json).
 */
import { api } from '../api'
import { a11y } from '../a11y'
import { nav, pagesOf, type NavItem } from '../nav'
import props from '../props.json'
import sizes from '../sizes.json'
import { ALIASES, shortestExample } from './examples'

type Prop = { name: string; type?: string; required: boolean; default?: string; description?: string }
type Component = { description?: string; type?: string; extends: string[]; props: Prop[] }

const SITE = 'https://uisatin.dev'
const allProps = props as unknown as Record<string, Record<string, Component>>
const allSizes = sizes as Record<string, number>

/** Docs pages that document one component (or a family) and have a markdown twin. */
export const componentPages: NavItem[] = [
  ...new Map(
    nav
      .filter((g) => g.id === 'components' || g.id === 'ai-patterns')
      .flatMap((g) => pagesOf(g.items))
      .map((p) => [p.id, p]),
  ).values(),
]

const pascal = (id: string) => id.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())
const cell = (s: string | undefined) => (s ? s.replace(/\|/g, '\\|').replace(/\n/g, ' ') : '')
const code = (s: string | undefined) => (s ? `\`${s.replace(/`/g, "'")}\`` : '')

/** Where a component's other props go, in words, from what its props type extends. */
export function passthrough(extendsList: string[]) {
  const html = extendsList.map((e) => e.match(/ComponentProps(?:WithoutRef)?<'(\w+)'>/)?.[1]).find(Boolean)
  const part = extendsList.map((e) => e.match(/ComponentProps(?:WithoutRef)?<typeof ([\w.]+)>/)?.[1]).find(Boolean)
  if (html) return { element: `<${html}>`, type: `React.ComponentProps<'${html}'>` }
  // Radix parts by their public name: DialogPrimitive.Content is Radix's Dialog.Content.
  const radix = part?.replace(/Primitive\b/, '')
  // These Radix roots hold state and render no element, so nothing lands anywhere.
  if (radix && /^(Dialog|AlertDialog|Popover|DropdownMenu|ContextMenu|HoverCard|Tooltip|Select)\.Root$/.test(radix))
    return { element: '', type: `React.ComponentProps<typeof ${radix}>`, stateOnly: true }
  if (part) return { element: `the Radix ${radix} part`, type: `React.ComponentProps<typeof ${radix}>` }
  return undefined
}

function propsTable(c: Component) {
  const rows = c.props.map(
    (p) => `| ${code(p.name)}${p.required ? ' (required)' : ''} | ${code(p.type)} | ${p.default ? code(p.default) : ''} | ${cell(p.description)} |`,
  )
  const through = passthrough(c.extends)
  const named = c.props.some((p) => p.name === 'className') ? '`ref`, other attributes' : '`className`, `ref`, other attributes'
  if (through?.stateOnly) rows.push(`| other props | ${code(through.type)} | | Radix's state props; it renders no element. |`)
  else if (through) rows.push(`| ${named} | ${code(through.type)} | | Go to ${through.element}. |`)
  else if (c.extends.length) rows.push(`| other props | ${c.extends.map(code).join(', ')} | | |`)
  if (!rows.length) return ''
  return ['| Prop | Type | Default | Description |', '| --- | --- | --- | --- |', ...rows].join('\n')
}

export async function componentMarkdown(page: NavItem) {
  const file = ALIASES[page.id] ?? page.id
  const components = allProps[file] ?? {}
  const main = pascal(page.id)
  const names = Object.keys(components)
  // The page's own component first, then the rest of the file's public parts.
  const ordered = [...names.filter((n) => n === main || n === `${main}Card`), ...names.filter((n) => n !== main && n !== `${main}Card`)]
  const example = await shortestExample(page.id)
  const doc = api[page.id]
  const access = a11y[page.id]
  const size = allSizes[file]

  const out: string[] = [
    `# ${page.title}`,
    '',
    `> ${page.description}`,
    '',
    `Docs: ${SITE}${page.href} · Registry item (full source): ${SITE}/r/${page.id}.json`,
    '',
    '## Install',
    '',
    '```sh',
    'npm i @uisatin/ui',
    '```',
    '',
    `Import \`@uisatin/ui/styles.css\` once at the root of the app, then the component from \`@uisatin/ui/${file}\`. Or copy its source: \`npx shadcn@latest add ${SITE}/r/${page.id}.json\`.`,
  ]
  if (size) out.push('', `Size: about ${(size / 1000).toFixed(1)} kB of JavaScript, minified and gzipped, with its dependencies (React aside). The stylesheet is shared by every component.`)
  if (example) out.push('', '## Example', '', '```tsx', example.trim(), '```')
  out.push('', '## API')
  if (doc?.description) out.push('', doc.description)
  for (const name of ordered) {
    const c = components[name]
    const table = propsTable(c)
    out.push('', `### ${name}`)
    if (c.description) out.push('', c.description)
    if (table) out.push('', table)
  }
  if (access) {
    out.push('', '## Accessibility', '', access.summary)
    if (access.keyboard?.length) {
      out.push('', '| Key | Action |', '| --- | --- |', ...access.keyboard.map((k) => `| ${k.keys.map(code).join(' / ')} | ${cell(k.action)} |`))
    }
  }
  return out.join('\n') + '\n'
}
