'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { arrow, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom'

/**
 * Anchored positioning for anything that floats next to an element: tooltips, chart
 * tooltips, small hints. Built on Floating UI (the engine Radix uses for Tooltip, Popover and
 * DropdownMenu), so every floating layer in Satin keeps the same rules:
 *
 * - it renders in a portal on `body`, so a card's `overflow: hidden` never cuts it off;
 * - it flips to the other side when there's no room and slides along the edge to stay
 *   8px inside the viewport;
 * - its pointer follows the anchor when it slides;
 * - it follows the anchor on scroll and resize.
 */
export type FloatingSide = 'top' | 'right' | 'bottom' | 'left'

export interface FloatingProps {
  /** The element it points at. Nothing renders while it's null. */
  anchor: Element | null
  side?: FloatingSide
  /** Gap between the anchor and the layer, pointer included. */
  sideOffset?: number
  /** How close to the viewport edge it may go. */
  collisionPadding?: number
  className?: string
  /** Gets the side it ended up on and the pointer's props (ref and position). */
  children: (state: {
    side: FloatingSide
    arrowRef: React.RefObject<HTMLElement | null>
    arrowStyle: React.CSSProperties
  }) => React.ReactNode
}

export function Floating({ anchor, side = 'top', sideOffset = 8, collisionPadding = 8, className, children }: FloatingProps) {
  const arrowRef = React.useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const { refs, floatingStyles, placement, middlewareData, isPositioned } = useFloating({
    strategy: 'fixed',
    placement: side,
    elements: { reference: anchor },
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(sideOffset),
      flip({ padding: collisionPadding }),
      shift({ padding: collisionPadding }),
      arrow({ element: arrowRef, padding: 8 }),
    ],
  })

  if (!mounted || !anchor) return null
  const actual = placement.split('-')[0] as FloatingSide
  const { x, y } = middlewareData.arrow ?? {}
  const arrowStyle: React.CSSProperties = actual === 'top' || actual === 'bottom' ? { left: x ?? undefined } : { top: y ?? undefined }

  return createPortal(
    <div
      ref={refs.setFloating}
      data-side={actual}
      className={className}
      // Hidden until the first position lands, so it never flashes in the corner.
      style={{ ...floatingStyles, zIndex: 60, visibility: isPositioned ? undefined : 'hidden' }}
    >
      {children({ side: actual, arrowRef, arrowStyle })}
    </div>,
    document.body,
  )
}
