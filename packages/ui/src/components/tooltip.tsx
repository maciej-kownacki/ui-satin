import * as React from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'

/**
 * Tooltip, 1:1 with the uiKit `tooltip/shortcut` set (3306:17555): an inverse pill
 * (text/default fill, bg/canvas text, medium 13/19.5) with the action name and an optional
 * keycap chip (text/muted fill, 6px side padding, 2px between keys). Padding 4 / 4 / 4 / 10,
 * 8px between label and keys. Shape default is radius-lg with a radius-sm keycap; rounded is
 * a pill with a pill keycap. Shadow md (0 8 12 shadow-md, 0 1 1.5 shadow-ambient) and the
 * 1px top highlight. Without a shortcut the right padding matches the left (10).
 *
 * Built on the Radix tooltip: it opens on hover after `delay` and at once on keyboard focus,
 * closes on Escape, and links itself to the trigger with aria-describedby. It sits 8px from
 * the trigger and fades in from 4px towards it (`@starting-style`, ease-out, 150 ms).
 */

/** Splits a shortcut into keycaps: modifier glyphs one by one, the rest as one key ("Esc", "K"). */
function keysOf(shortcut: string) {
  if (/[\s+]/.test(shortcut.trim())) return shortcut.split(/[\s+]+/).filter(Boolean)
  const keys: string[] = []
  let rest = ''
  for (const ch of shortcut) {
    if ('⌘⌃⇧⌥'.includes(ch)) keys.push(ch)
    else rest += ch
  }
  if (rest) keys.push(rest)
  return keys
}

export interface TooltipProps {
  /** The action, in one or two words. */
  label: React.ReactNode
  /** Keys that run the action, e.g. "⌘K" or "⌃⇧V". */
  shortcut?: string
  shape?: 'default' | 'rounded'
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Hover delay in ms before it opens. */
  delay?: number
  /** The trigger. It must be focusable (a button, a link). */
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function TooltipBubble({
  label,
  shortcut,
  shape = 'default',
  className,
  ...props
}: Pick<TooltipProps, 'label' | 'shortcut' | 'shape' | 'className'> & React.ComponentProps<'div'>) {
  const keys = shortcut ? keysOf(shortcut) : []
  return (
    <div
      data-slot="tooltip"
      className={cn(
        'flex items-center gap-2 bg-text-default py-1 pl-2.5 text-sm leading-(--text-sm--line-height) font-medium whitespace-nowrap text-bg-canvas',
        '[box-shadow:0_8px_12px_0_var(--effect-shadow-md),0_1px_1.5px_0_var(--effect-shadow-ambient),inset_0_1px_0_0_var(--effect-highlight-top)]',
        shape === 'rounded' ? 'rounded-full' : 'rounded-lg',
        keys.length ? 'pr-1' : 'pr-2.5',
        className,
      )}
      {...props}
    >
      <span>{label}</span>
      {keys.length > 0 && (
        <kbd
          className={cn(
            'flex items-center gap-0.5 bg-text-muted px-1.5 font-sans text-sm leading-(--text-sm--line-height) font-medium text-bg-canvas',
            shape === 'rounded' ? 'rounded-full' : 'rounded-sm',
          )}
        >
          {keys.map((k, i) => (
            <span key={i}>{k}</span>
          ))}
        </kbd>
      )}
    </div>
  )
}

export function Tooltip({
  label,
  shortcut,
  shape = 'default',
  side = 'top',
  delay = 300,
  children,
  open,
  defaultOpen,
  onOpenChange,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delay}>
      <TooltipPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={8}
            collisionPadding={8}
            className={cn(
              'z-50 transition-[opacity,translate] duration-(--duration-fast) ease-(--ease-out)',
              'starting:opacity-0',
              'data-[side=top]:starting:translate-y-1 data-[side=bottom]:starting:-translate-y-1',
              'data-[side=left]:starting:translate-x-1 data-[side=right]:starting:-translate-x-1',
            )}
          >
            <TooltipBubble label={label} shortcut={shortcut} shape={shape} className={className} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
