'use client'

import * as React from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'
import { KbdGroup } from './kbd'

/**
 * Tooltip, 1:1 with the uiKit `tooltip/shortcut` set (3306:17555): an inverse pill
 * (text/default fill, bg/canvas text, medium 13/20) with the action name and optional
 * keys: a KbdGroup of sm keys in the inverse tone, so they read on the dark pill in Light and
 * the light one in Dark. Padding 4 / 6 / 4 / 10, 8px between
 * label and keys. Shape default is radius-lg; rounded is a pill. Shadow md (0 8 12 shadow-md, 0 1 1.5 shadow-ambient) and the
 * 1px top highlight. Without a shortcut the right padding matches the left (10).
 *
 * Built on the Radix tooltip: it opens on hover after `delay` and at once on keyboard focus,
 * waits `closeDelay` after the pointer leaves before closing, closes on Escape, and links itself to the trigger with aria-describedby. It sits 8px from
 * the trigger and fades in from 4px towards it (`@starting-style`, ease-out, 150 ms).
 *
 * Other props, `ref` included, go to the visible bubble (the element `className` styles), not to
 * the Radix Content around it.
 */

export interface TooltipProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** The action, in one or two words. */
  label: React.ReactNode
  /** Keys that run the action, e.g. "⌘K" or "⌃⇧V". */
  shortcut?: string
  shape?: 'default' | 'rounded'
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Hover delay in ms before it opens. */
  delay?: number
  /** How long it stays after the pointer leaves, in ms, so a quick slip off the trigger doesn't flicker it. */
  closeDelay?: number
  /** The trigger. It must be focusable (a button, a link). */
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null
  className?: string
}

export function TooltipBubble({
  label,
  shortcut,
  shape = 'default',
  className,
  ...props
}: Pick<TooltipProps, 'label' | 'shortcut' | 'shape' | 'className'> & React.ComponentProps<'div'>) {
  return (
    <div
      {...props}
      data-slot="tooltip"
      className={cn(
        'flex items-center gap-2 bg-text-default py-1 ps-2.5 text-sm leading-(--text-sm--line-height) font-medium whitespace-nowrap text-bg-canvas',
        '[box-shadow:0_8px_12px_0_var(--effect-shadow-md),0_1px_1.5px_0_var(--effect-shadow-ambient),inset_0_1px_0_0_var(--effect-highlight-top)]',
        shape === 'rounded' ? 'rounded-pill' : 'rounded-lg',
        shortcut ? 'pe-1.5' : 'pe-2.5',
        className,
      )}
    >
      <span>{label}</span>
      {shortcut && <KbdGroup keys={shortcut} tone="inverse" />}
    </div>
  )
}

export function Tooltip({
  label,
  shortcut,
  shape = 'default',
  side = 'top',
  delay = 300,
  closeDelay = 0,
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  container,
  className,
  ...props
}: TooltipProps) {
  // Open state lives here so closing can wait `closeDelay`; opening again cancels the wait.
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  const change = (next: boolean) => {
    clearTimeout(timer.current)
    const apply = () => {
      setInner(next)
      onOpenChange?.(next)
    }
    if (!next && closeDelay > 0) timer.current = setTimeout(apply, closeDelay)
    else apply()
  }
  return (
    <TooltipPrimitive.Provider delayDuration={delay}>
      <TooltipPrimitive.Root open={open} onOpenChange={change}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal container={container}>
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
            <TooltipBubble {...props} label={label} shortcut={shortcut} shape={shape} className={className} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
