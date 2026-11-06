import * as React from 'react'
import { ToggleGroup } from 'radix-ui'
import { cva } from 'class-variance-authority'
import { cn } from '../lib/utils'

/**
 * SegmentedControl, from the uiKit `segmented control` page: 2–5 segments that switch
 * views or filters in place. One segment is always selected; the selected pill slides
 * to the new segment (transform, ease-out). Arrow keys move between segments.
 */
type Size = 'xs' | 'default' | 'lg'
type Shape = 'default' | 'rounded'

export interface SegmentedControlItem {
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps {
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
    shape: { default: 'rounded-lg', rounded: 'rounded-full' },
    border: { true: 'border border-border-subtle', false: '' },
    fullWidth: { true: 'flex w-full', false: '' },
  },
})

const segment = cva(
  [
    'relative z-10 inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium text-text-muted select-none',
    'transition-[color,background-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
    'hover:text-text-default active:bg-component-segmented-pressed data-[state=on]:text-text-default',
    'focus-visible:shadow-border-focus focus-visible:outline-none',
    'disabled:pointer-events-none disabled:text-text-subtle',
    '[&_svg]:pointer-events-none [&_svg]:size-icon-size [&_svg]:shrink-0',
  ],
  {
    variants: {
      size: {
        xs: 'h-control-height-xs gap-1 px-2.5 text-sm [&_svg]:size-icon-size-sm',
        default: 'h-control-height px-3 text-sm',
        lg: 'h-control-height-lg px-4 text-base',
      },
      shape: { default: 'rounded-sm', rounded: 'rounded-full' },
      fullWidth: { true: 'flex-1', false: '' },
    },
  },
)

export function SegmentedControl({
  items,
  value: valueProp,
  defaultValue,
  onValueChange,
  size = 'default',
  shape = 'default',
  border = false,
  fullWidth = false,
  className,
  ...aria
}: SegmentedControlProps) {
  const [inner, setInner] = React.useState(defaultValue ?? items[0]?.value ?? '')
  const value = valueProp ?? inner
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [pill, setPill] = React.useState<{ x: number; width: number } | null>(null)
  const [animate, setAnimate] = React.useState(false)

  const measure = React.useCallback(() => {
    const el = trackRef.current?.querySelector<HTMLElement>('[data-state="on"]')
    if (el) setPill({ x: el.offsetLeft, width: el.offsetWidth })
  }, [])

  React.useLayoutEffect(measure, [measure, value, size, fullWidth, items.length])
  React.useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure])

  return (
    <ToggleGroup.Root
      ref={trackRef}
      type="single"
      value={value}
      onValueChange={(next) => {
        // A segmented control never ends up with nothing selected.
        if (!next) return
        setAnimate(true)
        setInner(next)
        onValueChange?.(next)
      }}
      data-slot="segmented-control"
      className={cn(track({ shape, border, fullWidth }), className)}
      {...aria}
    >
      {pill && (
        <span
          aria-hidden
          className={cn(
            'absolute top-1 bottom-1 left-0 z-0 bg-component-segmented-selected shadow-[0_1px_1px_var(--effect-shadow-xs)]',
            shape === 'rounded' ? 'rounded-full' : 'rounded-sm',
            animate && 'transition-[transform,width] duration-(--duration-base) ease-(--ease-out)',
          )}
          style={{ width: pill.width, transform: `translateX(${pill.x}px)` }}
        />
      )}
      {items.map((item) => (
        <ToggleGroup.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className={cn(
            segment({ size, shape, fullWidth }),
            // Before the pill is measured (server render), the selected segment paints its own fill.
            !pill && 'data-[state=on]:bg-component-segmented-selected data-[state=on]:shadow-[0_1px_1px_var(--effect-shadow-xs)]',
          )}
        >
          {item.icon}
          {item.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
