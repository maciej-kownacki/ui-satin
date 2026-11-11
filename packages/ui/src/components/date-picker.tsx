'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Calendar as CalendarIcon, NavArrowDown, NavArrowLeft, NavArrowRight } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { FieldChrome, Select, useFieldChrome } from './select'

/**
 * Calendar, DatePicker and DateRangePicker, 1:1 with the uiKit design (🆕 date picker).
 *
 * Calendar: one month (or two side by side), Monday first, weekdays as one letter in text/xs muted.
 * Days are 36px in 40px cells, their numbers text/sm (13px) medium. A picked day is a primary circle; the two ends of a range are
 * primary squares rounded radius-md, with a band in status/brand/bg — a tint of the brand —
 * from the middle of the first to the middle of the last. While the end is being picked the day
 * under the pointer gets a bg/hover circle and the band runs up to it. Today is a 12×2 primary
 * dash under its number; days of other months are text/subtle.
 *
 * Header: "November 2026" in text/sm (13px) medium, with arrows, or (`header="picker"`) "‹ November ›" on the left and the
 * year as a small Select on the right, newest first, the shown year checked. Always six weeks, so
 * the height never jumps between months.
 *
 * Keyboard: the grid is one tab stop; arrows move a day or a week, Page Up / Down a month, Home /
 * End the week, Enter or Space picks.
 */

export type DateRange = { from: Date | null; to: Date | null }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DOW_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (a?: Date | null, b?: Date | null) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const fullDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
export const formatDate = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
export const formatRange = ({ from, to }: DateRange) => {
  if (!from) return ''
  if (!to || sameDay(from, to)) return formatDate(from)
  const sameYear = from.getFullYear() === to.getFullYear()
  const f = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) }).format(from)
  return `${f} – ${formatDate(to)}`
}

/**
 * Always six weeks, Monday first, filled with the end of the month before and the start of the
 * one after, so the calendar keeps its height from month to month.
 */
function weeksOf(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = addDays(first, -((first.getDay() + 6) % 7))
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)))
}

export interface CalendarProps {
  mode?: 'single' | 'range'
  /** single: the picked day. */
  value?: Date | null
  onValueChange?: (value: Date) => void
  /** range: the picked range. */
  range?: DateRange
  onRangeChange?: (range: DateRange) => void
  /** The first month shown. Defaults to the value's month, or today's. */
  month?: Date
  onMonthChange?: (month: Date) => void
  /** Two months side by side (the range picker). */
  months?: 1 | 2
  header?: 'title' | 'picker'
  min?: Date
  max?: Date
  /** Today, for the dash. Defaults to now. */
  today?: Date
  className?: string
}

export function Calendar({
  mode = 'single',
  value,
  onValueChange,
  range,
  onRangeChange,
  month: monthProp,
  onMonthChange,
  months = 1,
  header = 'title',
  min,
  max,
  today: todayProp,
  className,
}: CalendarProps) {
  const today = startOfDay(todayProp ?? new Date())
  const anchor = mode === 'range' ? range?.from : value
  const [innerMonth, setInnerMonth] = React.useState(() => addMonths(anchor ?? today, 0))
  const month = monthProp ? addMonths(monthProp, 0) : innerMonth
  const setMonth = (m: Date) => {
    if (!monthProp) setInnerMonth(m)
    onMonthChange?.(m)
  }
  const [focus, setFocus] = React.useState<Date>(() => startOfDay(anchor ?? today))
  const [hover, setHover] = React.useState<Date | null>(null)
  const gridRef = React.useRef<HTMLDivElement>(null)

  const disabled = (d: Date) => (min && d < startOfDay(min)) || (max && d > startOfDay(max)) || false
  const picking = mode === 'range' && !!range?.from && !range?.to

  const pick = (d: Date) => {
    if (disabled(d)) return
    if (mode === 'single') return onValueChange?.(d)
    if (!range?.from || range.to) return onRangeChange?.({ from: d, to: null })
    onRangeChange?.(d < range.from ? { from: d, to: range.from } : { from: range.from, to: d })
  }

  const moveFocus = (d: Date) => {
    setFocus(d)
    const last = addMonths(month, months - 1)
    if (d < month) setMonth(addMonths(d, 0))
    else if (d >= addMonths(last, 1)) setMonth(addMonths(d, -(months - 1)))
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>('[data-focus]')?.focus())
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => new Date(focus.getFullYear(), focus.getMonth() - 1, focus.getDate()),
      PageDown: () => new Date(focus.getFullYear(), focus.getMonth() + 1, focus.getDate()),
      Home: () => addDays(focus, -((focus.getDay() + 6) % 7)),
      End: () => addDays(focus, 6 - ((focus.getDay() + 6) % 7)),
    }
    if (map[e.key]) {
      e.preventDefault()
      const next = map[e.key]()
      moveFocus(next)
      if (picking) setHover(next)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(focus)
    }
  }

  const navBtn = (dir: -1 | 1, label: string, onClick: () => void) => (
    <Button variant="tertiary" size="xs" iconOnly aria-label={label} onClick={onClick}>
      {dir < 0 ? <NavArrowLeft aria-hidden /> : <NavArrowRight aria-hidden />}
    </Button>
  )

  const renderMonth = (m: Date, i: number) => {
    const end = range?.to ?? (picking ? hover : null)
    const lo = range?.from && end ? (end < range.from ? end : range.from) : null
    const hi = range?.from && end ? (end < range.from ? range.from : end) : null
    const titleId = `cal-${m.getFullYear()}-${m.getMonth()}`
    return (
      <div key={i} className="flex w-[280px] shrink-0 flex-col gap-2">
        {/* Header */}
        {header === 'picker' && months === 1 ? (
          <div className="flex h-8 items-center gap-1">
            <div className="flex items-center gap-1">
              {navBtn(-1, 'Previous month', () => setMonth(addMonths(month, -1)))}
              <span id={titleId} className="min-w-[72px] text-center text-sm leading-5 font-medium text-text-default">
                {MONTHS[m.getMonth()]}
              </span>
              {navBtn(1, 'Next month', () => setMonth(addMonths(month, 1)))}
            </div>
            <span className="flex-1" />
            {/* The year: a plain Select, the shown year checked. */}
            <Select
              size="sm"
              aria-label="Year"
              value={String(m.getFullYear())}
              onValueChange={(y) => setMonth(new Date(Number(y), m.getMonth(), 1))}
              options={yearOptions(m.getFullYear(), today.getFullYear(), min, max)}
              wrapperClassName="w-auto shrink-0"
              className="w-[92px]"
            />
          </div>
        ) : (
          <div className="flex h-8 items-center gap-1">
            {/* Two months: each title centred over its own month, an empty slot the arrow's size
                balancing the arrow on the other side. */}
            {months === 2 && (i === 0 ? navBtn(-1, 'Previous month', () => setMonth(addMonths(month, -1))) : <span aria-hidden className="size-6 shrink-0" />)}
            <span id={titleId} className={cn('flex-1 text-sm leading-5 font-medium text-text-default', months === 2 && 'text-center')}>
              {MONTHS[m.getMonth()]} {m.getFullYear()}
            </span>
            {months === 1 && navBtn(-1, 'Previous month', () => setMonth(addMonths(month, -1)))}
            {months === 2 && i === 0 && <span aria-hidden className="size-6 shrink-0" />}
            {(months === 1 || i === 1) && navBtn(1, 'Next month', () => setMonth(addMonths(month, 1)))}
          </div>
        )}

        {(
          <div role="grid" aria-labelledby={titleId} className="flex flex-col gap-1" onKeyDown={onKeyDown}>
            <div role="row" className="flex">
              {DOW.map((d, k) => (
                <span key={k} role="columnheader" aria-label={DOW_FULL[k]} className="grid h-6 w-10 place-items-center text-xs text-text-muted">
                  {d}
                </span>
              ))}
            </div>
            {weeksOf(m).map((week, w) => (
              <div key={w} role="row" className="flex">
                {week.map((d) => {
                  const out = d.getMonth() !== m.getMonth()
                  const isSingle = mode === 'single' && sameDay(d, value)
                  const isEnd = mode === 'range' && !out && (sameDay(d, range?.from) || sameDay(d, range?.to))
                  const inBand = mode === 'range' && !out && lo && hi && !sameDay(lo, hi) && d >= lo && d <= hi
                  const bandFrom = inBand && sameDay(d, lo) ? 'left-1/2' : 'left-0'
                  const bandTo = inBand && sameDay(d, hi) ? 'right-1/2' : 'right-0'
                  const isHoverEnd = picking && !out && sameDay(d, hover) && !isEnd
                  const isToday = sameDay(d, today)
                  const off = disabled(d)
                  const focused = sameDay(d, focus) && !out
                  return (
                    <div
                      key={d.toISOString()}
                      role="gridcell"
                      aria-selected={isSingle || isEnd || undefined}
                      // The whole 40px cell tracks the pointer, so the preview never stalls in the
                      // gaps between the 36px days.
                      onPointerEnter={() => picking && !out && !off && setHover(d)}
                      className="relative grid size-10 place-items-center"
                    >
                      {inBand && <span aria-hidden className={cn('absolute inset-y-0.5 bg-status-brand-bg', bandFrom, bandTo)} />}
                      <button
                        type="button"
                        tabIndex={focused ? 0 : -1}
                        data-focus={focused || undefined}
                        disabled={off}
                        aria-label={fullDate.format(d)}
                        aria-current={isToday ? 'date' : undefined}
                        onClick={() => {
                          setFocus(d)
                          pick(d)
                        }}
                        onFocus={() => setFocus(d)}
                        className={cn(
                          'relative grid size-9 place-items-center text-sm leading-5 font-medium outline-none',
                          // While the end is being picked the band and the end circle move together,
                          // so neither fades: a fade here would trail the pointer.
                          !picking && 'transition-[background-color,color] duration-(--duration-fast) ease-(--ease-out)',
                          'focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)] disabled:pointer-events-none disabled:opacity-40',
                          isEnd ? 'rounded-md' : 'rounded-full',
                          isSingle || isEnd
                            ? 'bg-action-primary-bg text-text-on-solid'
                            : cn(out ? 'text-text-subtle' : 'text-text-default', isHoverEnd ? 'bg-bg-hover' : !inBand && 'hover:bg-bg-hover'),
                        )}
                      >
                        {d.getDate()}
                        {isToday && !isSingle && !isEnd && (
                          <span aria-hidden className="absolute bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-action-primary-bg" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={gridRef} data-slot="calendar" className={cn('flex gap-6', className)} onPointerLeave={() => setHover(null)}>
      {Array.from({ length: months }, (_, i) => renderMonth(addMonths(month, i), i))}
    </div>
  )
}

/** Years for the dropdown: within min/max, or 100 back and 20 ahead of today. */
function yearOptions(shown: number, thisYear: number, min?: Date, max?: Date) {
  const from = min ? min.getFullYear() : Math.min(shown, thisYear - 100)
  const to = max ? max.getFullYear() : Math.max(shown, thisYear + 20)
  return Array.from({ length: to - from + 1 }, (_, i) => {
    const y = String(to - i)
    return { value: y, label: y }
  })
}

/* ---------- pickers ---------- */

/** The panels' surface: Popover's bg, border, radius and lg shadow. */
const surfaceClass = cn(
  'rounded-xl border border-border-default bg-bg-popover',
  '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
)
const popClass = cn(
  'z-50 outline-none',
  'origin-(--radix-popover-content-transform-origin) data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
)

interface FieldBits {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode | boolean
  placeholder?: string
  disabled?: boolean
  id?: string
  size?: 'sm' | 'md' | 'lg'
  /** Classes for the outer wrapper (label + field + hint). `className` styles the field. */
  wrapperClassName?: string
  className?: string
}

function Trigger({ text, placeholder, chrome, size, open, className, ...props }: { text: string; placeholder: string; chrome: ReturnType<typeof useFieldChrome>; size: 'sm' | 'md' | 'lg'; open: boolean; className?: string } & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      id={chrome.controlId}
      data-slot="date-picker-trigger"
      data-size={size}
      data-filled={text ? true : undefined}
      data-invalid={chrome.invalid || undefined}
      data-disabled={chrome.disabled || undefined}
      data-state={open ? 'open' : 'closed'}
      disabled={chrome.disabled}
      aria-invalid={chrome.invalid || undefined}
      aria-describedby={chrome.describedBy}
      className={cn('satin-field cursor-pointer text-left', className)}
      {...props}
    >
      <span className="satin-field-icon" aria-hidden>
        <CalendarIcon />
      </span>
      <span className={cn('min-w-0 flex-1 truncate', text ? 'text-text-default' : 'text-text-placeholder')}>{text || placeholder}</span>
      <span className="satin-field-icon" aria-hidden>
        <NavArrowDown className={cn('transition-transform duration-(--duration-fast) ease-(--ease-out)', open && 'rotate-180')} />
      </span>
    </button>
  )
}

export interface DatePickerPanelProps {
  value?: Date | null
  onValueChange?: (value: Date) => void
  min?: Date
  max?: Date
  today?: Date
  className?: string
}

/** The date picker's panel on its own, in place: the popover surface with the Calendar, month and year to pick. */
export function DatePickerPanel({ value, onValueChange, min, max, today, className }: DatePickerPanelProps) {
  return (
    <div data-slot="date-picker-panel" className={cn(surfaceClass, 'w-fit p-3', className)}>
      <Calendar header="picker" value={value} onValueChange={onValueChange} min={min} max={max} today={today} />
    </div>
  )
}

export interface DatePickerProps extends FieldBits {
  value?: Date | null
  defaultValue?: Date | null
  onValueChange?: (value: Date) => void
  min?: Date
  max?: Date
  today?: Date
  /** Portal target. */
  container?: HTMLElement | null
}

/** A date field: the kit Input's skin with a calendar icon; the Calendar opens 4px below, with month and year to pick. */
export function DatePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  min,
  max,
  today,
  label,
  hint,
  error,
  placeholder = 'Pick a date',
  disabled,
  id,
  size = 'md',
  container,
  wrapperClassName,
  className,
}: DatePickerProps) {
  const chrome = useFieldChrome({ id, disabled, error, hint })
  const [inner, setInner] = React.useState<Date | null>(defaultValue)
  const value = valueProp !== undefined ? valueProp : inner
  const [open, setOpen] = React.useState(false)
  return (
    <FieldChrome label={label} chrome={chrome} className={wrapperClassName}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <Trigger text={value ? formatDate(value) : ''} placeholder={placeholder} chrome={chrome} size={size} open={open} className={className} />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal container={container}>
          <PopoverPrimitive.Content data-slot="date-picker" align="start" sideOffset={4} collisionPadding={8} className={popClass}>
            <DatePickerPanel
              value={value}
              min={min}
              max={max}
              today={today}
              onValueChange={(d) => {
                if (valueProp === undefined) setInner(d)
                onValueChange?.(d)
                setOpen(false)
              }}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </FieldChrome>
  )
}

const todayDate = () => startOfDay(new Date())

export interface DateRangePickerProps extends FieldBits {
  value?: DateRange
  defaultValue?: DateRange
  /** Called on Apply. */
  onValueChange?: (value: DateRange) => void
  min?: Date
  max?: Date
  today?: Date
  applyLabel?: string
  cancelLabel?: string
  container?: HTMLElement | null
}

/**
 * A range field: two months, Cancel and Apply in the footer. Picks wait for Apply. Picking an
 * end before the start swaps them.
 */
export function DateRangePicker({
  value: valueProp,
  defaultValue = { from: null, to: null },
  onValueChange,
  min,
  max,
  today,
  label,
  hint,
  error,
  placeholder = 'Pick dates',
  disabled,
  id,
  size = 'md',
  applyLabel = 'Apply',
  cancelLabel = 'Cancel',
  container,
  wrapperClassName,
  className,
}: DateRangePickerProps) {
  const chrome = useFieldChrome({ id, disabled, error, hint })
  const [inner, setInner] = React.useState<DateRange>(defaultValue)
  const value = valueProp ?? inner
  const [open, setOpen] = React.useState(false)
  const commit = (r: DateRange) => {
    if (!valueProp) setInner(r)
    onValueChange?.(r)
    setOpen(false)
  }
  return (
    <FieldChrome label={label} chrome={chrome} className={wrapperClassName}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <Trigger text={formatRange(value)} placeholder={placeholder} chrome={chrome} size={size} open={open} className={className} />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal container={container}>
          <PopoverPrimitive.Content data-slot="date-range-picker" align="start" sideOffset={4} collisionPadding={8} className={popClass}>
            <DateRangePickerPanel
              value={value}
              min={min}
              max={max}
              today={today}
              applyLabel={applyLabel}
              cancelLabel={cancelLabel}
              onApply={commit}
              onCancel={() => setOpen(false)}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </FieldChrome>
  )
}

export interface DateRangePickerPanelProps {
  /** The range the panel starts from; picks stay in the panel until Apply. */
  value?: DateRange
  /** Apply. */
  onApply?: (value: DateRange) => void
  onCancel?: () => void
  min?: Date
  max?: Date
  today?: Date
  applyLabel?: string
  cancelLabel?: string
  className?: string
}

/** The range picker's panel on its own, in place: two months, Cancel and Apply. */
export function DateRangePickerPanel({
  value = { from: null, to: null },
  onApply,
  onCancel,
  min,
  max,
  today,
  applyLabel = 'Apply',
  cancelLabel = 'Cancel',
  className,
}: DateRangePickerPanelProps) {
  const [draft, setDraft] = React.useState<DateRange>(value)
  const [month, setMonth] = React.useState(() => addMonths(value.from ?? today ?? todayDate(), 0))
  return (
    <div data-slot="date-range-picker-panel" className={cn(surfaceClass, 'flex w-fit shrink-0 flex-col overflow-hidden', className)}>
      <div className="p-3">
        <Calendar mode="range" months={2} range={draft} onRangeChange={setDraft} month={month} onMonthChange={setMonth} min={min} max={max} today={today} />
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-3 py-2">
        <Button variant="secondary" onClick={() => { setDraft(value); onCancel?.() }}>
          {cancelLabel}
        </Button>
        <Button disabled={!draft.from || !draft.to} onClick={() => onApply?.(draft)}>
          {applyLabel}
        </Button>
      </div>
    </div>
  )
}
