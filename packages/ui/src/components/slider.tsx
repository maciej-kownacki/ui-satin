'use client'

import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'
import { Input } from './input'
import { useSatinLabels } from './labels'
import { TooltipBubble } from './tooltip'

/**
 * Slider, 1:1 with the uiKit `Slider` set (4025:3621): a 4px bg/muted track with the picked
 * part in action/primary/bg, and 16px bg/popover thumbs with a border/strong ring and the
 * shadow-sm drop (0 1 3). Hover turns the ring text/subtle, keyboard focus adds a 2px focus
 * ring, disabled fades the whole slider to 50%. 20px tall, so the thumbs have room.
 *
 * One value or a range: pass a number or a `[from, to]` pair as `value` / `defaultValue`.
 *
 * Around it, all optional:
 * - `label` on the left above the track and, on the same line at the right, the picked value
 *   (`showValue`, on by default, "40" or "20 – 80", through `formatValue`).
 * - `inputs`: small number fields beside the track to type a value: the range's from on the
 *   left and to on the right, a single value on the right. They take the readout's place.
 *   A typed value is clamped, snapped to `step` and kept in order on Enter or blur; Escape
 *   puts the current value back.
 * - `tooltip`: the value in a Tooltip bubble over the thumb while it is dragged or moved with
 *   the keys.
 * - `orientation="vertical"`: the track runs bottom to top (160px unless styled), the inputs
 *   go above (to) and below (from or the single value).
 *
 * Built on the Radix Slider: arrow keys, Page Up/Down, Home/End, a native form value (`name`)
 * and a `slider` role per thumb, with `formatValue` as its spoken value.
 *
 * Other props, `ref` included, go to the Radix Slider root (the track and thumbs);
 * `className` styles the wrapper around it with the label and fields.
 */
export interface SliderProps
  extends Omit<
    React.ComponentProps<typeof SliderPrimitive.Root>,
    | 'value'
    | 'defaultValue'
    | 'onValueChange'
    | 'onValueCommit'
    | 'min'
    | 'max'
    | 'step'
    | 'minStepsBetweenThumbs'
    | 'orientation'
    | 'disabled'
    | 'name'
    | 'children'
    | 'asChild'
  > {
  /** A number, or a `[from, to]` pair for a range. */
  value?: number | [number, number]
  defaultValue?: number | [number, number]
  /** Every change while it moves. Gets a number or a pair, as given. */
  onValueChange?: (value: number | [number, number]) => void
  /** Once, when a drag ends or a key or a typed value changes it. */
  onValueCommit?: (value: number | [number, number]) => void
  min?: number
  max?: number
  step?: number
  /** Smallest gap between the range's thumbs, in steps. */
  minStepsBetweenThumbs?: number
  label?: React.ReactNode
  /** The picked value at the right of the label's line. Hidden while `inputs` are on. */
  showValue?: boolean
  /** Small number fields beside the track to type the value. */
  inputs?: boolean
  /** The value in a bubble over the thumb while it moves. */
  tooltip?: boolean
  orientation?: 'horizontal' | 'vertical'
  /** How a value reads in the readout, the bubble, the fields' neighbours and to screen readers. */
  formatValue?: (value: number) => string
  disabled?: boolean
  /** Form field name, for a native form submit. */
  name?: string
  id?: string
  /** Names the slider when there is no `label`. */
  'aria-label'?: string
  /** Classes for the outer wrapper. */
  className?: string
}

const decimals = (n: number) => (String(n).split('.')[1] ?? '').length

export function Slider({
  value: valueProp,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  minStepsBetweenThumbs = 0,
  label,
  showValue = true,
  inputs = false,
  tooltip = false,
  orientation = 'horizontal',
  formatValue = String,
  disabled = false,
  name,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': labelledBy,
  className,
  onPointerDown,
  ...props
}: SliderProps) {
  const labels = useSatinLabels()
  const autoId = React.useId()
  const sliderId = id ?? autoId
  const labelId = `${sliderId}-label`
  const vertical = orientation === 'vertical'

  const range = Array.isArray(valueProp ?? defaultValue)
  const toArray = (v: number | [number, number] | undefined) => (v == null ? (range ? [min, max] : [min]) : Array.isArray(v) ? [...v] : [v])
  const toOut = (a: number[]) => (range ? ([a[0], a[1]] as [number, number]) : a[0])

  const [uncontrolled, setUncontrolled] = React.useState(() => toArray(defaultValue))
  const values = valueProp != null ? toArray(valueProp) : uncontrolled
  const change = (next: number[]) => {
    if (valueProp == null) setUncontrolled(next)
    onValueChange?.(toOut(next))
  }

  // The bubble shows on the thumb that moves: while a pointer drags it, or for a moment after a key.
  const [dragging, setDragging] = React.useState(false)
  const [keying, setKeying] = React.useState(false)
  const [focused, setFocused] = React.useState<number | null>(null)
  const keyTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => {
    if (!dragging) return
    const end = () => setDragging(false)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [dragging])
  React.useEffect(() => () => clearTimeout(keyTimer.current), [])

  const readout = range ? `${formatValue(values[0])} – ${formatValue(values[1])}` : formatValue(values[0])
  const thumbLabel = (i: number) => (range ? (i === 0 ? labels.from : labels.to) : undefined)
  const fieldLabel = (i: number) => (range ? (i === 0 ? labels.from : labels.to) : labels.value)

  // A typed value: clamped, snapped to the step and kept on its side of the other thumb.
  const commitTyped = (i: number, typed: number) => {
    const places = decimals(step)
    let v = Math.round((typed - min) / step) * step + min
    v = Number(Math.min(max, Math.max(min, v)).toFixed(places))
    const gap = minStepsBetweenThumbs * step
    if (range) v = i === 0 ? Math.min(v, values[1] - gap) : Math.max(v, values[0] + gap)
    const next = values.map((x, j) => (j === i ? v : x))
    change(next)
    onValueCommit?.(toOut(next))
  }

  const field = (i: number) => (
    <SliderInput
      key={i}
      value={values[i]}
      disabled={disabled}
      aria-label={fieldLabel(i)}
      onCommit={(v) => commitTyped(i, v)}
    />
  )

  const slider = (
    <SliderPrimitive.Root
      {...props}
      id={sliderId}
      data-slot="slider"
      value={values}
      onValueChange={change}
      onValueCommit={(v) => onValueCommit?.(toOut(v))}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={minStepsBetweenThumbs}
      orientation={orientation}
      disabled={disabled}
      name={name}
      aria-labelledby={label ? labelId : labelledBy}
      onPointerDown={(e) => {
        onPointerDown?.(e)
        if (!disabled) setDragging(true)
      }}
      className={cn(
        'relative flex shrink-0 touch-none items-center select-none data-[disabled]:cursor-not-allowed',
        vertical ? 'h-40 w-5 flex-col' : 'h-5 w-full min-w-0 flex-1',
      )}
    >
      <SliderPrimitive.Track
        className={cn('relative grow cursor-pointer overflow-hidden rounded-full bg-bg-muted', vertical ? 'w-1' : 'h-1')}
      >
        <SliderPrimitive.Range className={cn('absolute rounded-full bg-action-primary-bg', vertical ? 'w-full' : 'h-full')} />
      </SliderPrimitive.Track>
      {values.map((v, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={thumbLabel(i) ?? (label ? undefined : ariaLabel)}
          aria-labelledby={!range && label ? labelId : undefined}
          aria-valuetext={formatValue(v)}
          onFocus={() => setFocused(i)}
          onBlur={() => {
            setFocused(null)
            setKeying(false)
          }}
          onKeyDown={(e) => {
            if (!/^(Arrow|Page|Home|End)/.test(e.key)) return
            setKeying(true)
            clearTimeout(keyTimer.current)
            keyTimer.current = setTimeout(() => setKeying(false), 1000)
          }}
          className={cn(
            'relative block size-4 cursor-grab rounded-full border border-border-strong bg-bg-popover outline-none active:cursor-grabbing',
            '[box-shadow:0_1px_3px_0_var(--effect-shadow-sm)]',
            'transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
            'hover:border-text-subtle focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
            'data-[disabled]:cursor-not-allowed data-[disabled]:hover:border-border-strong',
          )}
        >
          {tooltip && (
            <TooltipBubble
              aria-hidden
              label={formatValue(v)}
              data-visible={(dragging || keying) && focused === i ? '' : undefined}
              className={cn(
                'pointer-events-none absolute tabular-nums opacity-0 transition-[opacity,translate] duration-(--duration-fast) ease-(--ease-out) data-[visible]:opacity-100',
                vertical
                  ? // Beside the thumb on the end side; it eases out away from the thumb either way.
                    'start-full top-1/2 ms-2 -translate-x-0.5 -translate-y-1/2 rtl:translate-x-0.5 data-[visible]:translate-x-0'
                  : 'bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-0.5 data-[visible]:translate-y-0',
              )}
            />
          )}
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  )

  const head = (label || (showValue && !inputs)) && (
    <div className={cn('flex h-[18px] items-center justify-between gap-3 whitespace-nowrap', vertical && 'min-w-full')}>
      {label ? (
        <span id={labelId} className="text-sm leading-[18px] font-medium text-text-default">
          {label}
        </span>
      ) : (
        <span />
      )}
      {showValue && !inputs && (
        <span aria-hidden className="text-sm leading-[18px] text-text-muted tabular-nums">
          {readout}
        </span>
      )}
    </div>
  )

  return (
    <div
      data-slot="slider-field"
      data-orientation={orientation}
      data-disabled={disabled || undefined}
      className={cn('flex flex-col gap-2', vertical ? 'w-max items-center' : 'w-full', className)}
    >
      {head}
      {vertical ? (
        <div className={cn('flex flex-col items-center gap-2', disabled && 'opacity-50')}>
          {inputs && range && field(1)}
          {slider}
          {inputs && field(0)}
        </div>
      ) : (
        <div className={cn('flex items-center gap-3', disabled && 'opacity-50')}>
          {inputs && range && field(0)}
          {slider}
          {inputs && field(range ? 1 : 0)}
        </div>
      )}
    </div>
  )
}

/** A small Input for one value: free typing, then committed on Enter or blur; Escape undoes. */
function SliderInput({
  value,
  disabled,
  onCommit,
  'aria-label': ariaLabel,
}: {
  value: number
  disabled?: boolean
  onCommit: (value: number) => void
  'aria-label': string
}) {
  const [draft, setDraft] = React.useState<string | null>(null)
  const commit = () => {
    if (draft == null) return
    const n = Number(draft.replace(',', '.'))
    setDraft(null)
    if (draft.trim() !== '' && Number.isFinite(n) && n !== value) onCommit(n)
  }
  return (
    <Input
      size="sm"
      inputMode="decimal"
      aria-label={ariaLabel}
      disabled={disabled}
      value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(null)
      }}
      wrapperClassName="w-16 shrink-0"
      className="[&_input]:text-center [&_input]:tabular-nums"
    />
  )
}
