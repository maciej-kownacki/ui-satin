'use client'

import * as React from 'react'
import { HoverCard as HoverCardPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'

/**
 * HoverCard, 1:1 with the uiKit design (🆕 context menu & hover card): a preview of a person,
 * place or file over its link — the Popover surface (bg/popover, border/default, radius-xl, the
 * lg shadow), 320 wide, 16px in. It opens after the pointer rests 400 ms on the trigger (the
 * middle of NN/g's 0.3–0.5 s, so passing over a link doesn't flash it), stays while the pointer
 * moves into it, and closes 150 ms after it leaves both. Keyboard focus on the trigger opens it.
 *
 * Only for extra context the page works without: anything someone needs to act on belongs in a
 * Popover they open on purpose.
 */
export interface HoverCardProps {
  /** The link or name it previews. Rendered with `asChild`. */
  trigger: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /** ms the pointer rests before it opens. */
  openDelay?: number
  /** ms after the pointer leaves before it closes. */
  closeDelay?: number
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  container?: HTMLElement | null
  className?: string
}

export function HoverCard({
  trigger,
  children,
  side = 'bottom',
  align = 'start',
  openDelay = 400,
  closeDelay = 150,
  open,
  defaultOpen,
  onOpenChange,
  container,
  className,
}: HoverCardProps) {
  return (
    <HoverCardPrimitive.Root openDelay={openDelay} closeDelay={closeDelay} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <HoverCardPrimitive.Trigger asChild>{trigger}</HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal container={container}>
        <HoverCardPrimitive.Content side={side} align={align} sideOffset={8} collisionPadding={8} className={cn(hoverCardClass, className)}>
          {children}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  )
}

/** The hover card's surface, for previews you place yourself. */
export const hoverCardClass = cn(
  'z-50 flex w-80 max-w-[calc(100vw-16px)] flex-col gap-3 rounded-xl border border-border-default bg-bg-popover p-4 outline-none',
  '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
  'origin-(--radix-hover-card-content-transform-origin) data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
)
