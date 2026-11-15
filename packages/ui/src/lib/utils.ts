import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge, told about Satin's own theme names. Out of the box it only knows Tailwind's
 * scales, so it took `text-body` for a text colour (and dropped it next to `text-text-muted`),
 * and never saw that `rounded-lg` replaces `rounded-pill` or `h-8` replaces `h-control-height`.
 * These are the names theme.css adds to Tailwind's text, radius, spacing and shadow scales.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['body', 'body-lg', 'title', 'heading', 'display'],
      radius: ['pill'],
      spacing: [
        'control-height',
        'control-height-xs',
        'control-height-lg',
        'control-height-xl',
        'icon-size',
        'icon-size-sm',
        'menu-row',
        'toast-height',
      ],
      shadow: ['primary', 'primary-focus', 'destructive', 'destructive-focus', 'border-focus', 'xs-focus'],
    },
  },
})

/** Satin's class prefix in the npm build (`sa:flex`); the source and the docs site use none. */
const PREFIX = 'sa:'

/**
 * Joins class names and lets the later Tailwind class win, like shadcn's `cn`.
 *
 * In the npm package Satin's own classes carry the `sa:` prefix, while an app's `className`
 * holds its own Tailwind classes without it. They are merged as if neither had a prefix, so
 * `cn('sa:px-2.5', 'px-4')` keeps only `px-4`: an app's class still replaces the Satin class
 * it overrides, prefixed or not.
 */
export function cn(...inputs: ClassValue[]) {
  const joined = clsx(inputs)
  if (!joined.includes(PREFIX)) return twMerge(joined)
  const tokens = joined.split(/\s+/).filter(Boolean)
  const bare = tokens.map((t) => (t.startsWith(PREFIX) ? t.slice(PREFIX.length) : t))
  // twMerge keeps the last of each conflicting group, in order; take those back with the
  // prefix they came with, matching from the end so the surviving occurrence is the last one.
  const kept = twMerge(bare.join(' ')).split(' ')
  const left = new Map<string, number>()
  for (const k of kept) left.set(k, (left.get(k) ?? 0) + 1)
  const out: string[] = []
  for (let i = tokens.length - 1; i >= 0; i--) {
    const n = left.get(bare[i]) ?? 0
    if (n > 0) {
      left.set(bare[i], n - 1)
      out.push(tokens[i])
    }
  }
  return out.reverse().join(' ')
}
