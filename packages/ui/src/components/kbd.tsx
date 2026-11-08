import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Kbd, 1:1 with the uiKit `Kbd` set (4021:3415): one keyboard key. sm is 18px high with 4px
 * sides, md 20px with 6px; a single character or glyph makes it an exact square, radius-sm, a 0.75px border/default edge on
 * component/kbd/bg (bg/card in Light, bg/muted in Dark), the 11px medium Keycap glyph in
 * text/muted. Put keys of one shortcut 2px apart, or pass `keys` and let `KbdGroup` do it.
 *
 * `tone="inverse"` is for keys on an inverse surface (a tooltip): a darker key on the dark pill
 * in Light, a lighter one on the light pill in Dark.
 */
export interface KbdProps extends React.ComponentProps<'kbd'> {
  size?: 'sm' | 'md'
  tone?: 'default' | 'inverse'
}

/** One character or one glyph icon: the key is a square. */
const isSingle = (children: React.ReactNode) =>
  typeof children === 'string' ? [...children.trim()].length === 1 : React.isValidElement(children)

export function Kbd({ size = 'sm', tone = 'default', className, children, ...props }: KbdProps) {
  const square = isSingle(children)
  return (
    <kbd
      data-slot="kbd"
      data-square={square || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-sm border-[0.75px] font-sans text-2xs leading-none font-medium tracking-normal whitespace-nowrap',
        size === 'sm' ? 'h-[18px] min-w-[18px]' : 'h-5 min-w-5',
        // A single key is exactly square with nothing on the sides, so the glyph sits in the middle.
        square ? (size === 'sm' ? 'w-[18px] px-0' : 'w-5 px-0') : size === 'sm' ? 'px-1' : 'px-1.5',
        tone === 'default'
          ? 'border-border-default bg-component-kbd-bg text-text-muted'
          : 'border-action-inverse-border bg-action-inverse-bg-hover text-bg-canvas/72 dark:border-action-inverse-bg-pressed dark:bg-text-default',
        // Glyph icons (arrows, return) take the key's colour at 10px.
        '[&>svg]:size-2.5 [&>svg]:shrink-0',
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}

/**
 * Splits a shortcut into keys: modifier glyphs one by one, the rest as one key ("Esc", "K").
 * Spaces or "+" split it explicitly ("Ctrl + K").
 */
export function keysOf(shortcut: string) {
  if (/[\s+]/.test(shortcut.trim())) return shortcut.split(/[\s+]+/).filter(Boolean)
  const keys: string[] = []
  let rest = ''
  for (const ch of shortcut) {
    if ('⌘⌃⇧⌥'.includes(ch)) keys.push(ch)
    else rest += ch
  }
  if (rest.trim()) keys.push(rest.trim())
  return keys
}

export interface KbdGroupProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** A shortcut such as "⌘K" or "⌃⇧V", split into keys, or the keys themselves. */
  keys: string | React.ReactNode[]
  size?: KbdProps['size']
  tone?: KbdProps['tone']
}

/** The keys of one shortcut, 2px apart. */
export function KbdGroup({ keys, size, tone, className, ...props }: KbdGroupProps) {
  const list = typeof keys === 'string' ? keysOf(keys) : keys
  return (
    <span data-slot="kbd-group" className={cn('inline-flex shrink-0 items-center gap-0.5', className)} {...props}>
      {list.map((k, i) => (
        <Kbd key={i} size={size} tone={tone}>
          {k}
        </Kbd>
      ))}
    </span>
  )
}

/* ---------- glyphs for keys that have no character ---------- */

const glyph = { viewBox: '0 0 10 10', fill: 'none', stroke: 'currentColor', strokeWidth: 0.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const KbdArrowUp = () => (
  <svg {...glyph}>
    <path d="M5.00018 8.17963L5.00018 1.82037M8.00316 4.82335L5.00018 1.82037L1.9972 4.82335" />
  </svg>
)
export const KbdArrowDown = () => (
  <svg {...glyph}>
    <path d="M4.99982 1.82037L4.99982 8.17963M1.99684 5.17665L4.99982 8.17963L8.0028 5.17665" />
  </svg>
)
export const KbdReturn = () => (
  <svg {...glyph}>
    <path d="M4.27083 8.02083L2.8125 6.5625L4.27083 5.10417" />
    <path d="M2.8125 6.5625H5.3125C6.23296 6.5625 6.97917 5.81629 6.97917 4.89583V1.97917" />
  </svg>
)

export interface KbdHintProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  keys: React.ReactNode[]
  label: React.ReactNode
}

/** A key hint for a menu footer: keys, then what they do in 12px text/muted, 6px apart. */
export function KbdHint({ keys, label, className, ...props }: KbdHintProps) {
  return (
    <span data-slot="kbd-hint" className={cn('flex items-center gap-1.5', className)} {...props}>
      <KbdGroup keys={keys} />
      <span className="text-xs leading-4 tracking-normal whitespace-nowrap text-text-muted">{label}</span>
    </span>
  )
}
