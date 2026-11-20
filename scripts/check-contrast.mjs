/**
 * Holds Satin's colour pairs to WCAG 2.2 contrast minimums, in Light and Dark, from the tokens
 * themselves (packages/ui/src/styles/theme.css, generated from tokens/tokens.json), so a token
 * change that breaks one fails CI. axe can't do this: it has no rule for focus indicators or
 * other non-text contrast (1.4.11), and in jsdom it checks no contrast at all.
 *
 * - text (1.4.3, 4.5:1): the text tokens on every surface, labels on button fills, tone text on
 *   its tone, error text;
 * - focus (1.4.11, 3:1): action/focus-ring and border/focus against every surface;
 * - error edge (1.4.11, 3:1): the destructive border on the surfaces fields sit on;
 * - themes: themeCss() for a spread of brands keeps the button label at 4.5:1 and the focus
 *   colour at 3:1 (needs the package build, packages/ui/dist).
 *
 * Pairs known to fall short are listed as known issues on https://uisatin.dev/accessibility
 * and reported here without failing (KNOWN below); fix one, and move it into the checks.
 *
 *   node scripts/check-contrast.mjs            # check
 *   node scripts/check-contrast.mjs --table    # print every pair as a markdown table
 *
 * The docs' Accessibility page imports contrastRows() and prints the same table.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// The repo root, from this file; callers bundled elsewhere (the docs) pass their own.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ---------- Tokens ----------
/** theme.css's Light and Dark variables, and a resolver that follows var() to a colour. */
function tokens(root) {
  const css = readFileSync(join(root, 'packages/ui/src/styles/theme.css'), 'utf8')
  const primitives = {}
  for (const m of css.matchAll(/--(color-[\w-]+):\s*(#[0-9A-Fa-f]{6,8})\s*;/g)) primitives[m[1]] = m[2]
  const block = (selector) => {
    const start = css.indexOf(`${selector} {`)
    if (start < 0) throw new Error(`theme.css: no ${selector} block`)
    const vars = {}
    for (const m of css.slice(start, css.indexOf('\n}', start)).matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim()
    return vars
  }
  const light = block(':root')
  const themes = { Light: light, Dark: { ...light, ...block('.dark, [data-theme="dark"]') } }
  const value = (theme, name, depth = 0) => {
    if (depth > 20) throw new Error(`${name}: var() loop`)
    const v = themes[theme][name] ?? primitives[name]
    if (v === undefined) throw new Error(`${theme}: --${name} doesn't resolve`)
    const ref = /^var\(--([\w-]+)\)$/.exec(v)
    return ref ? value(theme, ref[1], depth + 1) : v
  }
  return { themes, value }
}

// ---------- WCAG 2.x ----------
const rgba = (hex) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1)
}
// A translucent colour as it shows on the surface under it.
const over = ([r, g, b, a], [R, G, B]) => [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a), 1]
const channel = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// ---------- Pairs ----------
const SURFACES = ['bg-canvas', 'bg-card', 'bg-field', 'bg-popover', 'bg-muted', 'bg-hover', 'bg-selected']
const FIELD_SURFACES = ['bg-canvas', 'bg-card', 'bg-field', 'bg-popover']
const TONES = ['neutral', 'brand', 'sky', 'green', 'amber', 'red', 'fuchsia', 'plum']
const pairs = [
  ...['text-default', 'text-muted', 'text-destructive'].flatMap((fg) => SURFACES.map((bg) => ['text', fg, bg])),
  ...['action-primary-bg', 'action-primary-bg-hover', 'action-primary-bg-pressed'].map((bg) => ['text', 'action-primary-fg', bg]),
  ...['action-destructive-bg', 'action-destructive-bg-hover', 'action-destructive-bg-pressed'].map((bg) => ['text', 'text-on-solid', bg]),
  ...['action-inverse-bg', 'action-inverse-bg-hover', 'action-inverse-bg-pressed'].map((bg) => ['text', 'text-on-inverse', bg]),
  ...TONES.map((tone) => ['text', `status-${tone}-fg`, `status-${tone}-bg`]),
  ['text', 'text-destructive', 'status-red-bg'],
  // PromptBar's tokens: the field's text over a mention's and a command's fill.
  ['text', 'text-default', 'status-brand-bg'],
  ['text', 'text-default', 'action-secondary-bg'],
  // Counts in a neutral Badge on a popover: the Notification badge and the Bulk action bar's count (Satin Pro).
  ['text', 'status-neutral-fg', 'component-notification-badge-bg'],
  ['text', 'status-neutral-fg', 'component-bulk-action-bar-count-bg'],
  ...['action-focus-ring', 'border-focus'].flatMap((fg) => SURFACES.map((bg) => ['focus', fg, bg])),
  ...FIELD_SURFACES.map((bg) => ['edge', 'action-destructive-bg', bg]),
  // Agent presence's edge (Satin Pro) in each tone, over the rows and cards it outlines.
  ...TONES.flatMap((tone) => ['bg-canvas', 'bg-card', 'bg-popover', 'bg-hover'].map((bg) => ['edge', `status-${tone}-fg`, bg])),
  // Reviewable changes (Pro): its change card and the source preview inside it.
  ...['component-changes-review-card-bg', 'component-changes-review-source-bg'].flatMap((bg) => [
    ['text', 'text-default', bg],
    ['text', 'text-muted', bg],
    ['focus', 'action-focus-ring', bg],
  ]),
  ['text', 'status-green-fg', 'component-changes-review-card-bg'],
]
const MIN = { text: 4.5, focus: 3, edge: 3 }

// Short of the minimum today, listed as known issues on the Accessibility page.
const KNOWN = [
  ['edge', 'border-default', 'bg-field', 'Control borders: 1.3:1; a checkbox, radio or switch has no other edge'],
  ['edge', 'border-input', 'bg-field', 'Control borders: 1.5:1'],
  ['edge', 'border-strong', 'bg-card', 'Control borders: 1.5:1'],
]

/** Every checked pair: { theme, kind, fg, bg, r (ratio), ok (true, false, or null for a known issue) }. */
export async function contrastRows({ root = ROOT, brands = true } = {}) {
  const { themes, value } = tokens(root)
  const color = (theme, name, under) => {
    const c = rgba(value(theme, name))
    return c[3] < 1 ? over(c, rgba(value(theme, under))) : c
  }
  const rows = []
  for (const theme of Object.keys(themes)) {
    for (const [kind, fg, bg] of pairs) {
      const r = ratio(color(theme, fg, bg), color(theme, bg))
      rows.push({ theme, kind, fg, bg, r, ok: r >= MIN[kind] })
    }
    for (const [kind, fg, bg] of KNOWN)
      rows.push({
        theme,
        kind,
        fg,
        bg,
        r: ratio(color(theme, fg, bg), color(theme, bg)),
        ok: null,
      })
  }

  // themeCss(): the label on the brand fill and the focus colour hold for any brand.
  const themeEntry = join(root, 'packages/ui/dist/theme/index.js')
  if (!brands) return rows
  if (existsSync(themeEntry)) {
    const { themeVars, contrast } = await import(pathToFileURL(themeEntry).href)
    const DARK = SURFACES.map((s) => value('Dark', s))
    const LIGHT = SURFACES.map((s) => value('Light', s))
    for (const brand of ['#4633D7', '#E5533D', '#0F766E', '#2563EB', '#D97706', '#111111', '#9333EA', '#16A34A', '#F5D90A']) {
      const v = themeVars({ brand, radius: 1 }).root
      const get = (name) => v[`--sa-color-${name}`] ?? v[`--color-${name}`]
      const checks = [
        ['label on rest', contrast('#FFFFFF', get('blue-600')), 4.5],
        ['label on hover', contrast('#FFFFFF', get('blue-500')), 4.5],
        ['focus, Light', Math.min(...LIGHT.map((s) => contrast(get('blue-600'), s))), 3],
        ['focus, Dark', Math.min(...DARK.map((s) => contrast(get('primary-focus-dark'), s))), 3],
      ]
      for (const [what, r, min] of checks)
        rows.push({
          theme: `themeCss ${brand}`,
          kind: what,
          fg: '',
          bg: '',
          r,
          ok: r >= min,
        })
    }
  } else {
    console.warn('packages/ui/dist is missing: themeCss() brands not checked (run npm run build:ui first)')
  }
  return rows
}

/** The minimum each kind of pair is held to. */
export const minimums = MIN

// Run from the command line: check, and print the table with --table.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = await contrastRows()
  if (process.argv.includes('--table')) {
    console.log('| Theme | Check | Colour | On | Ratio | |\n|---|---|---|---|---|---|')
    for (const r of rows)
      console.log(`| ${r.theme} | ${r.kind} | ${r.fg} | ${r.bg} | ${r.r.toFixed(2)}:1 | ${r.ok === null ? 'known issue' : r.ok ? 'pass' : 'FAIL'} |`)
  }
  const bad = rows.filter((r) => r.ok === false)
  if (bad.length) {
    console.error(
      `Contrast below the WCAG minimum:\n  ${bad.map((r) => `${r.theme} ${r.kind}: ${r.fg} on ${r.bg} ${r.r.toFixed(2)}:1`).join('\n  ')}`,
    )
    process.exit(1)
  }
  const known = rows.filter((r) => r.ok === null)
  console.log(
    `contrast: ${rows.length - known.length} pairs pass (text 4.5:1, focus and edges 3:1, themeCss brands); ${known.length} known issues reported, not failed`,
  )
}
