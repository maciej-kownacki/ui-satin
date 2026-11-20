/**
 * cn must know Satin's own theme names, or tailwind-merge drops real classes: it once read
 * `text-body` as a colour and removed it next to `text-text-muted`, so Banner descriptions,
 * StreamingText and table cells lost the theme's body size. Runs against the built package.
 *
 *   npm run build:ui && node scripts/check-cn.mjs
 */
import { cn } from '../packages/ui/dist/lib/utils.js'

const cases = [
  ['text-body text-text-muted', 'text-body text-text-muted'],
  ['text-body-lg text-text-default', 'text-body-lg text-text-default'],
  ['text-title text-text-default', 'text-title text-text-default'],
  ['text-heading text-text-default', 'text-heading text-text-default'],
  ['text-display text-text-default', 'text-display text-text-default'],
  ['text-sm text-body', 'text-body'],
  ['rounded-pill rounded-l-none', 'rounded-pill rounded-l-none'],
  ['rounded-pill rounded-lg', 'rounded-lg'],
  ['h-control-height h-8', 'h-8'],
  ['size-icon-size size-4', 'size-4'],
  ['shadow-primary shadow-none', 'shadow-none'],
  ['sa:text-body sa:text-text-muted', 'sa:text-body sa:text-text-muted'],
  ['sa:rounded-pill rounded-lg', 'rounded-lg'],
  ['sa:px-2.5 px-4', 'px-4'],
  // border-strong is a width (border-width/strong), not a colour: it replaces border and stays next to a colour.
  ['border border-strong border-border-default', 'border-strong border-border-default'],
  ['sa:border sa:border-strong sa:border-action-primary-border', 'sa:border-strong sa:border-action-primary-border'],
  ['border-b border-b-strong border-border-subtle', 'border-b-strong border-border-subtle'],
  ['border-strong border', 'border'],
]

let failed = 0
for (const [input, want] of cases) {
  const got = cn(input)
  if (got !== want) {
    failed++
    console.error(`cn('${input}') → '${got}', expected '${want}'`)
  }
}
if (failed) process.exit(1)
console.log(`cn: ${cases.length} merges as expected`)
