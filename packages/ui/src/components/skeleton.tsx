import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Skeleton, 1:1 with the uiKit `Skeleton` set (4025:3862): a bg/muted placeholder in three
 * shapes. text is a 12px line at radius-sm (240 wide by default), circle 32px round, rect
 * 240 × 120 at radius-lg. Size it with `width` / `height` or classes.
 *
 * `animated` runs a soft band across the block (a 6% wash of text/default, so it lightens in
 * Dark and darkens in Light), 1.6 s a pass on ease-in-out; with reduced motion it stays still.
 *
 * The blocks are aria-hidden: put `aria-busy` on the region that is loading.
 */
export interface SkeletonProps extends React.ComponentProps<'div'> {
  shape?: 'text' | 'circle' | 'rect'
  animated?: boolean
  width?: number | string
  height?: number | string
}

export function Skeleton({ shape = 'text', animated = false, width, height, className, style, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      data-shape={shape}
      data-animated={animated || undefined}
      className={cn(
        'satin-skeleton relative shrink-0 overflow-hidden bg-bg-muted',
        shape === 'text' && 'h-3 w-60 max-w-full rounded-sm',
        shape === 'circle' && 'size-8 rounded-full',
        shape === 'rect' && 'h-30 w-60 max-w-full rounded-lg',
        className,
      )}
      style={{ width, height, ...style }}
      {...props}
    />
  )
}
