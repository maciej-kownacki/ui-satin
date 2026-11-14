/**
 * Checks that @uisatin/ui's stylesheet keeps to itself, so it can sit next to an app's own
 * Tailwind in either order (see packages/ui/build/prefix.mjs):
 *
 * - no custom property an app may already define: Tailwind's default theme (--text-sm,
 *   --spacing, --color-*…) or shadcn/ui's (--radius, --chart-1…) — Satin's are --sa-*;
 * - every utility class carries the `sa:` prefix;
 * - every base rule is scoped to Satin's elements (nothing styles html, body, * or bare tags).
 *
 *   node scripts/check-css.mjs [packages/ui/dist/styles.css]
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import postcss from 'postcss'

const require = createRequire(import.meta.url)
// Names an app may already use: Tailwind's default theme, and shadcn/ui's theme variables.
const tailwindTheme = new Set([...readFileSync(require.resolve('tailwindcss/theme.css'), 'utf8').matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
const SHADCN = /^--(radius|background|foreground|card|card-foreground|popover|popover-foreground|primary|primary-foreground|secondary|secondary-foreground|muted|muted-foreground|accent|accent-foreground|destructive|destructive-foreground|border|input|ring|chart-\d|sidebar(-[\w-]+)?)$/
const SCOPED = /\[class\*=["']?sa\\?:/

const file = process.argv[2] ?? 'packages/ui/dist/styles.css'
const root = postcss.parse(readFileSync(file, 'utf8'))
const problems = []
root.walkDecls((d) => {
  if (tailwindTheme.has(d.prop) || SHADCN.test(d.prop)) problems.push(`variable an app may own: ${d.prop}`)
})
root.walkAtRules('layer', (layer) => {
  if (layer.params === 'utilities') {
    layer.walkRules((r) => {
      for (const m of r.selector.matchAll(/\.((?:\\.|[\w-])+)/g)) if (!m[1].startsWith('sa\\:') && m[1] !== 'dark') problems.push(`utility without the prefix: .${m[1]}`)
    })
  }
  if (layer.params === 'base') {
    layer.walkRules((r) => {
      if (r.parent?.type === 'atrule' && /keyframes/.test(r.parent.name)) return
      for (const sel of r.selectors) if (!SCOPED.test(sel)) problems.push(`base rule not scoped to Satin: ${sel}`)
    })
  }
})

if (problems.length) {
  console.error(`${file}: ${problems.length} problems\n  ${[...new Set(problems)].slice(0, 40).join('\n  ')}`)
  process.exit(1)
}
console.log(`${file}: isolated (prefixed variables and utilities, base rules scoped)`)
