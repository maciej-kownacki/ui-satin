'use client'

import * as React from 'react'
import { ToggleGroup } from 'radix-ui'
import { cva } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { useSlidingIndicator } from './sliding-indicator'

/**
 * SegmentedControl, from the uiKit `segmented control` page: 2–5 segments that switch
 * views or filters in place. One segment is always selected; the selected pill slides under
 * the labels to the new segment, as in Tabs and Pagination (sliding-indicator.tsx: 300 ms,
 * the leading edge first): a white card with Shadow/sm in Light. Arrow keys move between segments.
 * Values 1:1 with the uiKit `_segmentedControl/item` (3080:20278) and `SegmentedControl` (3080:21247) sets.
 *
 * Other props, `ref` included, go to the track (the Radix ToggleGroup root, a `group`).
 */
type Size = 'xs' | 'md' | 'lg'
type Shape = 'default' | 'rounded'

export interface SegmentedControlItem {
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'dir' | 'children'> {
  items: SegmentedControlItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  size?: Size
  shape?: Shape
  /** A 1px border-subtle outline around the track. */
  border?: boolean
  fullWidth?: boolean
  /** Required when the segments have no visible text of their own. */
  'aria-label'?: string
  className?: string
}

const track = cva('relative isolate inline-flex items-center gap-0.5 bg-bg-muted p-1', {
  variants: {
    shape: { default: 'rounded-lg', rounded: 'rounded-pill' },
    border: { true: 'border border-border-subtle', false: '' },
    fullWidth: { true: 'flex w-full', false: '' },
  },
})

const segment = cva(
  [
    'relative z-10 inline-flex items-center justify-center font-medium whitespace-nowrap text-text-muted select-none',
    'transition-[color,background-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
    'satin-hover:text-text-default data-[state=on]:text-text-default',
    'satin-pressed:bg-component-segmented-pressed satin-pressed:text-text-default',
    'focus-visible:outline-none satin-focus:text-text-default satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
    'disabled:pointer-events-none disabled:text-text-subtle',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:[stroke-width:1.875]',
  ],
  {
    variants: {
      size: {
        xs: 'h-control-height-xs gap-1 px-2.5 text-sm [&_svg]:size-icon-size-sm',
        md: 'h-control-height gap-1.5 px-3 text-sm [&_svg]:size-icon-size',
        lg: 'h-control-height-lg gap-1.5 px-4 text-base [&_svg]:size-icon-size',
      },
      shape: { default: 'rounded-sm', rounded: 'rounded-pill' },
      fullWidth: { true: 'flex-1', false: '' },
    },
  },
)

export function SegmentedControl({
  items,
  value: valueProp,
  defaultValue,
  onValueChange,
  size = 'md',
  shape = 'default',
  border = false,
  fullWidth = false,
  className,
  ref,
  ...props
}: SegmentedControlProps) {
  const [inner, setInner] = React.useState(defaultValue ?? items[0]?.value ?? '')
  const value = valueProp ?? inner
  const trackRef = React.useRef<HTMLDivElement>(null)
  // The app's ref and ours, on the track.
  const setTrack = React.useCallback(
    (node: HTMLDivElement | null) => {
      trackRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  // The pill slides under the selected segment (sliding-indicator.tsx).
  const pill = useSlidingIndicator(trackRef, '[data-state="on"]', `${value}|${size}|${fullWidth}|${items.length}`)

  return (
    <ToggleGroup.Root
      {...props}
      ref={setTrack}
      type="single"
      value={value}
      onValueChange={(next) => {
        // A segmented control never ends up with nothing selected.
        if (!next) return
        setInner(next)
        onValueChange?.(next)
      }}
      data-slot="segmented-control"
      className={cn(track({ shape, border, fullWidth }), className)}
    >
      <span
        ref={pill.ref}
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1 bottom-1 left-0 z-0 bg-component-segmented-selected opacity-0 [box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
          shape === 'rounded' ? 'rounded-pill' : 'rounded-sm',
        )}
      />
      {items.map((item) => (
        <ToggleGroup.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className={cn(
            segment({ size, shape, fullWidth }),
            // Unselected focus: bg/muted under the ring. Selected focus keeps the pill's fill.
            'data-[state=off]:satin-focus:bg-bg-muted',
            // Before the pill is measured (server render), the selected segment paints its own fill.
            !pill.ready && 'data-[state=on]:bg-component-segmented-selected data-[state=on]:[box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
          )}
        >
          {item.icon}
          {item.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
