'use client'

import * as React from 'react'
import { flushSync } from 'react-dom'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Calendar as CalendarIcon, Clock, NavArrowDown } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Calendar } from './date-picker'
import { MenuItemContent, menuItemClass, menuSurfaceClass } from './dropdown'
import { FieldSizeContext, useFormField } from './form-field'
import { useSatinLabels } from './labels'
import { FieldChrome, useFieldChrome } from './select'

/**
 * TimePicker, TimeList, DateTimePicker and DateTimePickerPanel: a time of day, alone or with a day.
 *
 * TimePicker is a text field with Input's skin, a clock before the value and a chevron after it,
 * that opens a list of times under it (Select's list: the menu surface, inline rows, the picked
 * time on bg/selected with the check). It follows the APG combobox pattern: focus stays in the
 * field, the arrows move through the list, Enter picks. What you type is read when you press
 * Enter or leave the field: `930`, `9:30`, `9.30`, `9h30`, `1430`, `9:30pm`, `9 p.m.`, and the
 * locale's own AM and PM words. While you type, the list jumps to the nearest time (type-ahead).
 * Text that isn't a time, or a time outside `min`/`max` or `isTimeDisabled`, marks the field
 * invalid and says why under it; the value becomes `null`, as a native time field's does.
 *
 * Times are listed every `step` minutes from midnight; those outside `min`/`max` or for which
 * `isTimeDisabled` returns true stay in the list, dimmed and skipped by the arrows. Times are
 * written by Intl in the `dateLocale` label, 12- or 24-hour as that locale writes them unless
 * `format` says otherwise.
 *
 * TimeList is the list on its own: a focusable `listbox` (arrows, Home/End, Page Up/Down by an
 * hour, type-ahead), for a popover or panel of your own. DateTimePicker is DatePicker's field
 * opening the Calendar with a column of times beside it: a day and a time pick a date, and the
 * popover closes on the time. DateTimePickerPanel is that panel in place.
 *
 * The list opens like Popover (it fades and settles 4px). The picked time is in view as the
 * list opens, with no scroll to watch; a type-ahead jump scrolls smoothly, and at once under
 * reduced motion. Arrow keys never animate.
 *
 * With `name`, a hidden input submits the value as a native field would: `HH:mm` for a time,
 * `YYYY-MM-DDTHH:mm` for a date and time, empty while there's none. Inside a FormField, leave
 * out `label`, `hint` and `error`: the field supplies them, and a Form's `errors[name]`.
 *
 * Other props, `ref` included, go to: TimePicker's text input, TimeList's listbox,
 * DateTimePicker's trigger button (`className` styles the field in both pickers) and the
 * panel's surface.
 */

/** A time of day: `hours` 0–23, `minutes` 0–59. */
export type TimeValue = { hours: number; minutes: number }
export type TimeFormat = '12h' | '24h'

const minutesOf = (t: TimeValue) => t.hours * 60 + t.minutes
const timeAt = (m: number): TimeValue => ({ hours: Math.floor(m / 60) % 24, minutes: m % 60 })
const keyOf = (t?: TimeValue | null) => (t ? minutesOf(t) : null)
const timeOfDate = (d: Date): TimeValue => ({ hours: d.getHours(), minutes: d.getMinutes() })
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const atTime = (day: Date, t: TimeValue) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), t.hours, t.minutes)
const pad = (n: number) => String(n).padStart(2, '0')
/** As `<input type="time">` submits it. */
const isoTime = (t: TimeValue) => `${pad(t.hours)}:${pad(t.minutes)}`
/** As `<input type="datetime-local">` submits it. */
const isoDateTime = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${isoTime(timeOfDate(d))}`

/* ---------- reading and writing times ---------- */

const memo = <T,>(make: (key: string) => T) => {
  const cache = new Map<string, T>()
  return (key: string) => {
    let v = cache.get(key)
    if (v === undefined) cache.set(key, (v = make(key)))
    return v
  }
}

const hourCycleOf = memo((locale) => (new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 ? '12h' : '24h') as TimeFormat)

/** 12 or 24 hours, as `locale` writes times. */
export function localeTimeFormat(locale: string): TimeFormat {
  return hourCycleOf(locale)
}

const timeFormatter = memo((key) => {
  const [locale, format] = key.split('|')
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hourCycle: format === '12h' ? 'h12' : 'h23' })
})

/** `time` written in `locale` (en-US: "2:30 PM"; pl-PL: "14:30"), 12- or 24-hour as the locale writes it unless `format` says. */
export function formatTime(time: TimeValue, locale = 'en-US', format: TimeFormat = localeTimeFormat(locale)) {
  return timeFormatter(`${locale}|${format}`).format(new Date(2024, 0, 1, time.hours, time.minutes))
}

const dateTimeFormatter = memo((key) => {
  const [locale, format] = key.split('|')
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: format === '12h' ? 'h12' : 'h23',
  })
})

/** Lower case without dots and spaces: "P.M." and "pm" read the same. */
const squash = (s: string) => s.toLowerCase().replace(/[.\s\u00a0\u202f]/g, '')

/** The words for before and after noon: a/am, p/pm, and the locale's own (pl "AM", ko "오전", zh "上午"). */
const periodWords = memo((locale) => {
  const f = new Intl.DateTimeFormat(locale, { hour: 'numeric', hourCycle: 'h12' })
  const word = (h: number) => squash(f.formatToParts(new Date(2024, 0, 1, h)).find((p) => p.type === 'dayPeriod')?.value ?? '')
  return { am: new Set(['a', 'am', word(9)].filter(Boolean)), pm: new Set(['p', 'pm', word(21)].filter(Boolean)) }
})

type Reading = { hours: number; minutes: number; period?: 'am' | 'pm' }

/** What the text says: hours and minutes, and AM or PM if it names one. */
function readTime(text: string, locale: string): Reading | null {
  const t = text.toLowerCase().replace(/[\u00a0\u202f]/g, ' ').trim()
  // Words before (zh, ko) or after the digits; the digits run with : . h or spaces between them.
  const m = /^(\D*?)(\d(?:[\d\s:.h]*\d)?)(\D*)$/.exec(t)
  if (!m) return null
  const words = periodWords(locale)
  let period: Reading['period']
  // "9:" and "9h" are 9 o'clock: a trailing separator is no period.
  for (const w of [squash(m[1]), squash(m[3]).replace(/^[:h]+/, '')]) {
    if (!w) continue
    if (period) return null
    if (words.am.has(w)) period = 'am'
    else if (words.pm.has(w)) period = 'pm'
    else return null
  }
  const parts = m[2].split(/[\s:.h]+/)
  let hours: number
  let minutes: number
  if (parts.length === 1) {
    // 9 or 14: hours. 930 and 0930: hours and minutes.
    const d = parts[0]
    if (d.length > 4) return null
    hours = Number(d.length <= 2 ? d : d.slice(0, -2))
    minutes = d.length <= 2 ? 0 : Number(d.slice(-2))
  } else if (parts.length <= 3 && parts.every((p) => p.length <= 2)) {
    // Seconds, if any, are dropped.
    hours = Number(parts[0])
    minutes = Number(parts[1])
  } else return null
  if (minutes > 59) return null
  if (period) return hours > 12 || (hours === 0 && period === 'pm') ? null : { hours, minutes, period }
  return hours > 23 ? null : { hours, minutes }
}

const toTime = (r: Reading): TimeValue => (r.period ? { hours: (r.hours % 12) + (r.period === 'pm' ? 12 : 0), minutes: r.minutes } : { hours: r.hours, minutes: r.minutes })

/**
 * The time `text` names, or null: "930", "9:30", "9.30", "9h30", "1430", "9:30pm", "9 p.m.",
 * and the AM and PM words of `locale`. Without AM or PM it reads the hours as 24-hour.
 */
export function parseTime(text: string, locale = 'en-US'): TimeValue | null {
  const r = readTime(text, locale)
  return r ? toTime(r) : null
}

/**
 * The times a reading may mean. On a 12-hour clock "2" without AM or PM is 2:00 AM or 2:00 PM,
 * and "12" noon before midnight; the pickers take the first that's available.
 */
function meanings(r: Reading, format: TimeFormat): TimeValue[] {
  if (r.period || format === '24h' || r.hours === 0 || r.hours > 12) return [toTime(r)]
  const h = r.hours % 12
  return r.hours === 12 ? [{ hours: 12, minutes: r.minutes }, { hours: 0, minutes: r.minutes }] : [{ hours: h, minutes: r.minutes }, { hours: h + 12, minutes: r.minutes }]
}

/* ---------- the list ---------- */

interface Bounds {
  min?: TimeValue
  max?: TimeValue
  isTimeDisabled?: (time: TimeValue) => boolean
}

const unavailable = (t: TimeValue, { min, max, isTimeDisabled }: Bounds) =>
  (min ? minutesOf(t) < minutesOf(min) : false) || (max ? minutesOf(t) > minutesOf(max) : false) || !!isTimeDisabled?.(t)

/** The first meaning that's available, or the first meaning. */
const choose = (options: TimeValue[], bounds: Bounds) => options.find((t) => !unavailable(t, bounds)) ?? options[0]

type Slot = { time: TimeValue; key: number; label: string; disabled: boolean }

/** Every `step` minutes from midnight, each written in the locale and marked if it can't be picked. */
const clampStep = (step: number) => Math.min(720, Math.max(1, Math.round(step) || 15))

function makeSlots(step: number, bounds: Bounds, locale: string, format: TimeFormat): Slot[] {
  const s = clampStep(step)
  return Array.from({ length: Math.ceil(1440 / s) }, (_, i) => {
    const time = timeAt(i * s)
    return { time, key: i * s, label: formatTime(time, locale, format), disabled: unavailable(time, bounds) }
  })
}

/** The available slot nearest to `minute`, or -1 when none is. */
function nearest(slots: Slot[], minute: number) {
  let best = -1
  let gap = Infinity
  slots.forEach((s, i) => {
    const d = Math.abs(s.key - minute)
    if (!s.disabled && d < gap) {
      best = i
      gap = d
    }
  })
  return best
}

/** Where the highlight starts: the picked time, else the time now. */
function startIndex(slots: Slot[], key: number | null) {
  if (key != null) return nearest(slots, key)
  const now = new Date()
  return nearest(slots, now.getHours() * 60 + now.getMinutes())
}

/** The next available slot after `from` in `dir`, staying put at either end. */
function stepFrom(slots: Slot[], from: number, dir: 1 | -1) {
  for (let i = from + dir; i >= 0 && i < slots.length; i += dir) if (!slots[i].disabled) return i
  return from
}

/** An hour on (Page Down) or back, then the nearest available slot that way, or back the other way. */
function pageFrom(slots: Slot[], from: number, dir: 1 | -1, step: number) {
  const target = Math.min(slots.length - 1, Math.max(0, from + dir * Math.max(1, Math.round(60 / step))))
  if (!slots[target].disabled) return target
  const on = stepFrom(slots, target, dir)
  if (on !== target) return on
  const back = stepFrom(slots, target, dir === 1 ? -1 : 1)
  return back === target ? from : back
}

const edge = (slots: Slot[], dir: 1 | -1) => stepFrom(slots, dir === 1 ? -1 : slots.length, dir)

/**
 * Brings option `index` into the list's view: to the middle (as the list opens, or a type-ahead
 * jump), or just inside the nearest edge (the arrows). Only a type-ahead jump scrolls smoothly,
 * and not under reduced motion. Sets the list's own scroll, so the page never moves.
 */
function scrollToOption(list: HTMLElement | null, index: number, how: 'center' | 'nearest', smooth = false) {
  const el = list?.querySelectorAll<HTMLElement>('[role="option"]')[index]
  if (!list || !el) return
  const inset = 4
  let top: number
  if (how === 'center') top = el.offsetTop - (list.clientHeight - el.offsetHeight) / 2
  else if (el.offsetTop - inset < list.scrollTop) top = el.offsetTop - inset
  else if (el.offsetTop + el.offsetHeight + inset > list.scrollTop + list.clientHeight) top = el.offsetTop + el.offsetHeight + inset - list.clientHeight
  else return
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const behavior: ScrollBehavior = smooth && !reduce ? 'smooth' : 'auto'
  if (typeof list.scrollTo === 'function') list.scrollTo({ top: Math.max(0, top), behavior })
  else list.scrollTop = Math.max(0, top)
}

/** The rows of a time list: Select's rows, the times in tabular figures so they line up. */
function TimeRows({
  slots,
  listId,
  selected,
  active,
  ring,
  onHover,
  onPick,
}: {
  slots: Slot[]
  listId: string
  selected: number | null
  active: number
  /** The highlight came from the keys: it shows the focus ring. */
  ring: boolean
  onHover: (index: number) => void
  onPick: (slot: Slot, index: number) => void
}) {
  return slots.map((s, i) => (
    <div
      key={s.key}
      id={`${listId}-${s.key}`}
      role="option"
      aria-selected={s.key === selected}
      aria-disabled={s.disabled || undefined}
      data-highlighted={i === active ? '' : undefined}
      data-keyboard={i === active && ring ? '' : undefined}
      data-disabled={s.disabled ? '' : undefined}
      onPointerMove={() => i !== active && onHover(i)}
      onClick={() => !s.disabled && onPick(s, i)}
      className={cn(menuItemClass, 'shrink-0 tabular-nums', s.key === selected && 'bg-bg-selected')}
    >
      <MenuItemContent label={s.label} layout="inline" selected={s.key === selected} />
    </div>
  ))
}

export interface TimeListProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'children'> {
  /** The picked time. */
  value?: TimeValue | null
  defaultValue?: TimeValue | null
  /** Called when a time is picked (click, Enter or Space). */
  onValueChange?: (value: TimeValue) => void
  /** Minutes between the listed times, from midnight. */
  step?: number
  /** Times before this are dimmed and can't be picked. */
  min?: TimeValue
  /** Times after this are dimmed and can't be picked. */
  max?: TimeValue
  /** Dims a time and keeps it from being picked: a booked slot, a lunch break. */
  isTimeDisabled?: (time: TimeValue) => boolean
  /** 12- or 24-hour. Defaults to how the `dateLocale` label's locale writes times. */
  format?: TimeFormat
  className?: string
}

/**
 * The list of times on its own: a focusable `listbox`, named "Time" (the `time` label) unless you
 * name it. Arrows move the highlight, Home and End go to the first and last time, Page Up and
 * Down an hour, typing jumps to the time typed, Enter or Space picks. Give it a height (or a
 * flex parent) and it scrolls. Other props, `ref` included, go to the listbox.
 */
export function TimeList({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  step = 15,
  min,
  max,
  isTimeDisabled,
  format: formatProp,
  className,
  ref,
  id,
  onKeyDown,
  onFocus,
  onBlur,
  onPointerDown,
  ...props
}: TimeListProps) {
  const labels = useSatinLabels()
  const locale = labels.dateLocale
  const format = formatProp ?? localeTimeFormat(locale)
  const bounds = { min, max, isTimeDisabled }
  const slots = makeSlots(step, bounds, locale, format)
  const [inner, setInner] = React.useState<TimeValue | null>(defaultValue)
  const value = valueProp !== undefined ? valueProp : inner
  const selected = keyOf(value)
  const [active, setActive] = React.useState(() => startIndex(slots, selected))
  const [focused, setFocused] = React.useState(false)
  const [viaKeys, setViaKeys] = React.useState(true)
  const pressed = React.useRef(false)
  const typed = React.useRef({ text: '', at: 0 })
  const autoId = React.useId()
  const listId = id ?? autoId
  const listRef = React.useRef<HTMLDivElement | null>(null)

  // The app's ref and ours; the picked time sits in the middle as the list appears.
  const activeRef = React.useRef(active)
  activeRef.current = active
  const setRoot = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node
      if (node) scrollToOption(node, activeRef.current, 'center')
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  // A time picked from outside (another field, a reset) takes the highlight along.
  const shown = React.useRef(selected)
  React.useEffect(() => {
    if (shown.current === selected) return
    shown.current = selected
    if (selected == null) return
    const i = nearest(slots, selected)
    setActive(i)
    scrollToOption(listRef.current, i, 'nearest')
  })

  const move = (i: number, how: 'center' | 'nearest' = 'nearest', smooth = false) => {
    if (i < 0) return
    setActive(i)
    setViaKeys(true)
    scrollToOption(listRef.current, i, how, smooth)
  }

  const pick = (s: Slot, i: number) => {
    if (s.disabled) return
    setActive(i)
    if (valueProp === undefined) setInner(s.time)
    onValueChange?.(s.time)
  }

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    const from = active < 0 ? edge(slots, 1) : active
    const keys: Record<string, () => number> = {
      ArrowDown: () => (active < 0 ? from : stepFrom(slots, from, 1)),
      ArrowUp: () => (active < 0 ? from : stepFrom(slots, from, -1)),
      Home: () => edge(slots, 1),
      End: () => edge(slots, -1),
      PageDown: () => pageFrom(slots, from, 1, clampStep(step)),
      PageUp: () => pageFrom(slots, from, -1, clampStep(step)),
    }
    const now = Date.now()
    const buffer = now - typed.current.at > 1000 ? '' : typed.current.text
    if (keys[e.key]) {
      e.preventDefault()
      typed.current.text = ''
      move(keys[e.key]())
    } else if (e.key === 'Enter' || (e.key === ' ' && !buffer)) {
      e.preventDefault()
      if (slots[active]) pick(slots[active], active)
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Type-ahead: "2" then "3" then "0" reads as 2:30; a second's pause starts over.
      e.preventDefault()
      typed.current = { text: buffer + e.key, at: now }
      const r = readTime(typed.current.text, locale)
      if (r) move(nearest(slots, minutesOf(choose(meanings(r, format), bounds))), 'center', true)
    }
  }

  return (
    <div
      {...props}
      ref={setRoot}
      id={listId}
      role="listbox"
      tabIndex={0}
      aria-label={props['aria-labelledby'] ? props['aria-label'] : (props['aria-label'] ?? labels.time)}
      aria-activedescendant={slots[active] ? `${listId}-${slots[active].key}` : undefined}
      data-slot="time-list"
      onKeyDown={onKey}
      onPointerDown={(e) => {
        pressed.current = true
        onPointerDown?.(e)
      }}
      onFocus={(e) => {
        // From Tab the highlight shows the ring at once; from a click it waits for a key.
        setFocused(true)
        setViaKeys(!pressed.current)
        pressed.current = false
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      className={cn('relative flex flex-col gap-0.5 overflow-y-auto p-1 outline-none focus-visible:ring-0', className)}
    >
      <TimeRows
        slots={slots}
        listId={listId}
        selected={selected}
        active={active}
        ring={focused && viaKeys}
        onHover={(i) => {
          setViaKeys(false)
          setActive(i)
        }}
        onPick={pick}
      />
    </div>
  )
}

/* ---------- TimePicker ---------- */

const listClass = cn(
  'pointer-events-auto z-50 w-(--radix-popover-trigger-width) min-w-40 max-w-[320px] overflow-hidden',
  menuSurfaceClass,
  'origin-(--radix-popover-content-transform-origin) outline-none',
  'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
)

/** The format example in the placeholder, the hint and the error: half past two in the afternoon. */
const EXAMPLE: TimeValue = { hours: 14, minutes: 30 }

type Problem = { kind: 'invalid' } | { kind: 'unavailable'; time: string }

export interface TimePickerProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'defaultValue' | 'size' | 'type' | 'min' | 'max' | 'step' | 'children'> {
  value?: TimeValue | null
  defaultValue?: TimeValue | null
  /** A picked or typed time; `null` when the field is cleared or what was typed can't be picked. */
  onValueChange?: (value: TimeValue | null) => void
  /** Minutes between the listed times, from midnight. Typed times needn't fall on a step. */
  step?: number
  /** Times before this are dimmed in the list, and typing one marks the field invalid. */
  min?: TimeValue
  /** Times after this are dimmed in the list, and typing one marks the field invalid. */
  max?: TimeValue
  /** Dims a time and keeps it from being picked or typed: a booked slot, a lunch break. */
  isTimeDisabled?: (time: TimeValue) => boolean
  /** 12- or 24-hour. Defaults to how the `dateLocale` label's locale writes times. */
  format?: TimeFormat
  /** The list of times. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  label?: React.ReactNode
  hint?: React.ReactNode
  /** An error message (replaces the hint), or `true` to mark the field invalid without one. */
  error?: React.ReactNode | boolean
  size?: 'sm' | 'md' | 'lg'
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null
  /** A press outside the field and the list; `preventDefault()` keeps the list open. */
  onInteractOutside?: (event: Event) => void
  /** Classes for the outer wrapper (label + field + hint). `className` styles the field. */
  wrapperClassName?: string
  /** Show a state without interacting, for state sheets. */
  'data-force'?: 'hover' | 'focus'
}

/**
 * A time field: type a time or pick one from the list under it. Other props, `ref` included,
 * go to the text input; `className` styles the field around it.
 */
export function TimePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  step = 15,
  min,
  max,
  isTimeDisabled,
  format: formatProp,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  label,
  hint,
  error,
  size: ownSize,
  container,
  onInteractOutside,
  wrapperClassName,
  className,
  id,
  name,
  disabled,
  required,
  placeholder,
  onChange,
  onKeyDown,
  onBlur,
  ref,
  'aria-describedby': describedBy,
  'aria-label': ariaLabel,
  'data-force': force,
  ...props
}: TimePickerProps) {
  const labels = useSatinLabels()
  const field = useFormField()
  const locale = labels.dateLocale
  const format = formatProp ?? localeTimeFormat(locale)
  const groupSize = React.useContext(FieldSizeContext)
  const size = ownSize ?? groupSize ?? 'md'
  const bounds = { min, max, isTimeDisabled }
  const slots = makeSlots(step, bounds, locale, format)
  const example = formatTime(EXAMPLE, locale, format)

  const [inner, setInner] = React.useState<TimeValue | null>(defaultValue)
  const value = valueProp !== undefined ? valueProp : inner
  const valueKey = keyOf(value)
  const written = value ? formatTime(value, locale, format) : ''
  const [text, setText] = React.useState(written)
  const [problem, setProblem] = React.useState<Problem | null>(null)

  // The value this field last set. Anything else arriving from outside rewrites the text.
  const committed = React.useRef(valueKey)
  React.useEffect(() => {
    if (committed.current === valueKey) return
    committed.current = valueKey
    setText(written)
    setProblem(null)
  }, [valueKey, written])
  // A new locale or format rewrites the time it shows.
  const lastWritten = React.useRef(written)
  React.useEffect(() => {
    if (lastWritten.current !== written && text === lastWritten.current) setText(written)
    lastWritten.current = written
  }, [written, text])

  const emit = (next: TimeValue | null) => {
    const k = keyOf(next)
    if (k === committed.current) return
    committed.current = k
    if (valueProp === undefined) setInner(next)
    onValueChange?.(next)
  }

  /** Reads what was typed: a time, nothing, or a problem to show. */
  const commitText = (raw: string) => {
    const t = raw.trim()
    if (!t) {
      setText('')
      setProblem(null)
      return emit(null)
    }
    const r = readTime(t, locale)
    if (!r) {
      setProblem({ kind: 'invalid' })
      return emit(null)
    }
    const time = choose(meanings(r, format), bounds)
    if (unavailable(time, bounds)) {
      setProblem({ kind: 'unavailable', time: formatTime(time, locale, format) })
      return emit(null)
    }
    setText(formatTime(time, locale, format))
    setProblem(null)
    emit(time)
  }

  // The list.
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen)
  const open = openProp ?? innerOpen
  // Blur and the popover may both close it in one go; the app hears it once.
  const openRef = React.useRef(open)
  openRef.current = open
  const setOpen = (next: boolean) => {
    if (next === openRef.current) return
    openRef.current = next
    if (openProp === undefined) setInnerOpen(next)
    onOpenChange?.(next)
  }
  const [active, setActive] = React.useState(() => startIndex(slots, valueKey))
  // The highlight moved by the arrows or the pointer since the last keystroke: Enter picks it.
  const [navigated, setNavigated] = React.useState(false)
  const [viaKeys, setViaKeys] = React.useState(false)
  const openedHere = React.useRef(false)
  const openList = (at?: number) => {
    openedHere.current = true
    setActive(at ?? startIndex(slots, valueKey))
    setNavigated(false)
    setViaKeys(false)
    setOpen(true)
  }
  // Opened from outside (`open`): start on the picked time.
  React.useEffect(() => {
    if (open && !openedHere.current) setActive(startIndex(slots, valueKey))
    openedHere.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const autoListId = React.useId()
  const listId = `${autoListId}-times`
  const fieldRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const activeRef = React.useRef(active)
  activeRef.current = active
  const setList = React.useCallback((node: HTMLDivElement | null) => {
    listRef.current = node
    if (node) scrollToOption(node, activeRef.current, 'center')
  }, [])
  const setInput = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  const pickSlot = (s: Slot) => {
    if (s.disabled) return
    setText(s.label)
    setProblem(null)
    emit(s.time)
    setOpen(false)
  }

  const move = (i: number) => {
    if (i < 0) return
    setActive(i)
    setNavigated(true)
    setViaKeys(true)
    scrollToOption(listRef.current, i, 'nearest')
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    const from = active < 0 ? edge(slots, 1) : active
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault()
        if (!open) return openList()
        if (e.altKey) return e.key === 'ArrowUp' ? setOpen(false) : undefined
        return move(active < 0 ? from : stepFrom(slots, from, e.key === 'ArrowDown' ? 1 : -1))
      }
      case 'PageDown':
      case 'PageUp': {
        if (!open) return
        e.preventDefault()
        return move(pageFrom(slots, from, e.key === 'PageDown' ? 1 : -1, step))
      }
      case 'Enter': {
        if (open && navigated && slots[active] && !slots[active].disabled) {
          e.preventDefault()
          return pickSlot(slots[active])
        }
        if (open) {
          e.preventDefault()
          setOpen(false)
        }
        // At once, so a form submitted by this Enter reads the new value.
        return flushSync(() => commitText(text))
      }
      case 'Escape': {
        // An open list is closed by the popover; a closed one puts back what the field showed.
        if (open || (text === written && !problem)) return
        e.preventDefault()
        e.stopPropagation()
        setText(written)
        setProblem(null)
        return
      }
    }
  }

  // What the field says when the typed text can't be picked, unless the app says something.
  const own = problem && !error && !field?.invalid ? (problem.kind === 'invalid' ? labels.timeInvalid(example) : labels.timeUnavailable(problem.time)) : undefined
  const chrome = useFieldChrome({ id, disabled, error: error ?? own ?? (problem ? true : undefined), hint })
  const formatId = `${chrome.controlId}-format`
  const fieldName = name ?? chrome.name
  // The list is named after the field: its label (ours or a FormField's), or its aria-label.
  const listName = () => ariaLabel ?? (label ? undefined : inputRef.current?.labels?.[0]?.textContent?.trim()) ?? labels.time
  const listLabelling = label ? { 'aria-labelledby': `${chrome.controlId}-label` } : { 'aria-label': open ? listName() : labels.time }
  const activeSlot = open ? slots[active] : undefined

  return (
    <FieldChrome label={label} chrome={chrome} className={wrapperClassName}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Anchor asChild>
          <div
            ref={fieldRef}
            data-slot="time-picker-field"
            data-size={size}
            data-filled={text ? true : undefined}
            data-invalid={chrome.invalid || undefined}
            data-disabled={chrome.disabled || undefined}
            data-state={open ? 'open' : 'closed'}
            data-force={force}
            className={cn('satin-field', className)}
            // As in Input: a press on the padding or the clock focuses the text; any press but the chevron's opens the list.
            onMouseDown={(e) => {
              const target = e.target as HTMLElement
              if (target !== inputRef.current && !chrome.disabled && !target.closest('button')) {
                e.preventDefault()
                inputRef.current?.focus()
              }
            }}
            onClick={(e) => {
              if (!chrome.disabled && !open && !(e.target as HTMLElement).closest('button')) openList()
            }}
          >
            <span className="satin-field-icon" aria-hidden>
              <Clock />
            </span>
            <input
              {...props}
              ref={setInput}
              id={chrome.controlId}
              type="text"
              role="combobox"
              autoComplete="off"
              spellCheck={false}
              data-slot="time-picker-input"
              aria-label={ariaLabel}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-activedescendant={activeSlot ? `${listId}-${activeSlot.key}` : undefined}
              aria-invalid={chrome.invalid || undefined}
              aria-required={(required ?? chrome.required) || undefined}
              aria-describedby={[describedBy, formatId, chrome.describedBy].filter(Boolean).join(' ')}
              disabled={chrome.disabled}
              placeholder={placeholder ?? example}
              value={text}
              onChange={(e) => {
                onChange?.(e)
                const t = e.target.value
                setText(t)
                setProblem(null)
                // Type-ahead: the list opens on the nearest time to what's typed so far.
                const r = readTime(t, locale)
                const at = r ? nearest(slots, minutesOf(choose(meanings(r, format), bounds))) : -1
                if (!open) openList(at >= 0 ? at : undefined)
                else {
                  setNavigated(false)
                  setViaKeys(false)
                  if (at >= 0) {
                    setActive(at)
                    scrollToOption(listRef.current, at, 'center', true)
                  }
                }
              }}
              onKeyDown={onKey}
              onBlur={(e) => {
                onBlur?.(e)
                if (text !== written || problem) commitText(text)
                setOpen(false)
              }}
              className="satin-field-input tabular-nums"
            />
            <span id={formatId} hidden>
              {labels.timeHint(example)}
            </span>
            {/* Out of the tab order, as in the APG combobox: the arrows open the list from the field. */}
            <button
              type="button"
              tabIndex={-1}
              disabled={chrome.disabled}
              aria-label={labels.showTimes}
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              onMouseDown={(e) => {
                e.preventDefault()
                inputRef.current?.focus()
              }}
              onClick={() => (open ? setOpen(false) : openList())}
              className="-me-1 grid size-6 shrink-0 cursor-pointer place-items-center rounded-md disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:[stroke-width:1.875]"
            >
              <NavArrowDown aria-hidden className={cn('transition-transform duration-(--duration-fast) ease-(--ease-out)', open && 'rotate-180')} />
            </button>
          </div>
        </PopoverPrimitive.Anchor>
        <PopoverPrimitive.Portal container={container}>
          <PopoverPrimitive.Content
            data-slot="time-picker"
            side="bottom"
            align="start"
            sideOffset={4}
            collisionPadding={8}
            {...listLabelling}
            // Focus stays in the field; the list follows it with aria-activedescendant.
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              if (fieldRef.current?.contains(e.target as Node)) e.preventDefault()
              onInteractOutside?.(e)
            }}
            className={listClass}
          >
            <div
              ref={setList}
              id={listId}
              role="listbox"
              {...listLabelling}
              // A press in the list keeps the focus in the field.
              onMouseDown={(e) => e.preventDefault()}
              className="relative flex max-h-60 flex-col gap-0.5 overflow-y-auto p-1"
            >
              <TimeRows
                slots={slots}
                listId={listId}
                selected={valueKey}
                active={active}
                ring={viaKeys}
                onHover={(i) => {
                  setActive(i)
                  setNavigated(true)
                  setViaKeys(false)
                }}
                onPick={pickSlot}
              />
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {fieldName && <input type="hidden" name={fieldName} value={value ? isoTime(value) : ''} disabled={chrome.disabled} />}
    </FieldChrome>
  )
}

/* ---------- DateTimePicker ---------- */

/** Popover's surface, as DatePickerPanel draws it. */
const surfaceClass = cn(
  'rounded-xl border border-border-subtle bg-bg-popover',
  '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
)

const later = (a?: TimeValue, b?: TimeValue) => (!a ? b : !b ? a : minutesOf(a) >= minutesOf(b) ? a : b)
const earlier = (a?: TimeValue, b?: TimeValue) => (!a ? b : !b ? a : minutesOf(a) <= minutesOf(b) ? a : b)

interface DateTimeOptions {
  /** The first moment that can be picked: days before it are disabled, and times before it on its day. */
  min?: Date
  /** The last moment that can be picked. */
  max?: Date
  /** The earliest time on any day (opening hours). */
  minTime?: TimeValue
  /** The latest time on any day. */
  maxTime?: TimeValue
  /** Minutes between the listed times, from midnight. */
  step?: number
  /** 12- or 24-hour. Defaults to how the `dateLocale` label's locale writes times. */
  format?: TimeFormat
  /** Dims a time on a day (`null` before a day is picked): a booked slot. */
  isTimeDisabled?: (time: TimeValue, day: Date | null) => boolean
  /** Today, for the calendar's dash. Defaults to now. */
  today?: Date
}

/** The calendar and the column of times, side by side; under each other on a narrow screen. */
function DateTimeBody({
  value,
  onValueChange,
  onTimePicked,
  min,
  max,
  minTime,
  maxTime,
  step = 15,
  format,
  isTimeDisabled,
  today,
}: DateTimeOptions & { value?: Date | null; onValueChange?: (value: Date) => void; onTimePicked?: () => void }) {
  const labels = useSatinLabels()
  const headId = React.useId()
  const listRef = React.useRef<HTMLDivElement>(null)
  // The day and the time picked so far; a date is picked once both are.
  const [day, setDay] = React.useState<Date | null>(() => (value ? startOfDay(value) : null))
  const [time, setTime] = React.useState<TimeValue | null>(() => (value ? timeOfDate(value) : null))
  const stamp = value?.getTime() ?? null
  const shown = React.useRef(stamp)
  React.useEffect(() => {
    if (shown.current === stamp) return
    shown.current = stamp
    setDay(value ? startOfDay(value) : null)
    setTime(value ? timeOfDate(value) : null)
  })

  const boundsOn = (d: Date | null): Bounds => ({
    min: d && min && sameDay(d, min) ? later(minTime, timeOfDate(min)) : minTime,
    max: d && max && sameDay(d, max) ? earlier(maxTime, timeOfDate(max)) : maxTime,
    isTimeDisabled: isTimeDisabled ? (t) => isTimeDisabled(t, d) : undefined,
  })
  const bounds = boundsOn(day)

  const emit = (d: Date, t: TimeValue) => {
    const next = atTime(d, t)
    shown.current = next.getTime()
    onValueChange?.(next)
  }

  return (
    <div className="flex max-[480px]:flex-col">
      <div className="p-3">
        <Calendar
          header="picker"
          value={day}
          min={min}
          max={max}
          today={today}
          onValueChange={(d) => {
            setDay(d)
            // The time stays if the new day has it; otherwise the times are next.
            if (time && !unavailable(time, boundsOn(d))) return emit(d, time)
            setTime(null)
            requestAnimationFrame(() => listRef.current?.focus())
          }}
        />
      </div>
      {/* The column is as tall as the calendar: the list fills it and scrolls, instead of making it grow. */}
      <div className="relative w-34 shrink-0 border-s border-border-subtle max-[480px]:h-56 max-[480px]:w-auto max-[480px]:border-s-0 max-[480px]:border-t">
        <p id={headId} className="mx-3 mt-3 flex h-8 items-center text-sm leading-5 font-medium text-text-default">
          {labels.time}
        </p>
        <TimeList
          ref={listRef}
          aria-labelledby={headId}
          value={time}
          step={step}
          format={format}
          {...bounds}
          onValueChange={(t) => {
            setTime(t)
            if (day) {
              emit(day, t)
              onTimePicked?.()
            }
          }}
          className="absolute inset-x-0 top-13 bottom-0 pt-0"
        />
      </div>
    </div>
  )
}

export interface DateTimePickerPanelProps extends DateTimeOptions, Omit<React.ComponentProps<'div'>, 'defaultValue' | 'children' | 'onChange'> {
  /** The picked date and time. */
  value?: Date | null
  /** Called once a day and a time are both picked, and on every change after. */
  onValueChange?: (value: Date) => void
  className?: string
}

/**
 * The date-and-time panel on its own, in place: DatePickerPanel's calendar with a column of
 * times beside it. Picking a day moves focus to the times. Other props, `ref` included, go to
 * the surface.
 */
export function DateTimePickerPanel({ value, onValueChange, min, max, minTime, maxTime, step, format, isTimeDisabled, today, className, ...props }: DateTimePickerPanelProps) {
  return (
    <div {...props} data-slot="date-time-picker-panel" className={cn(surfaceClass, 'w-fit overflow-hidden', className)}>
      <DateTimeBody
        value={value}
        onValueChange={onValueChange}
        min={min}
        max={max}
        minTime={minTime}
        maxTime={maxTime}
        step={step}
        format={format}
        isTimeDisabled={isTimeDisabled}
        today={today}
      />
    </div>
  )
}

type DateTimeTriggerAttributes = Omit<React.ComponentProps<'button'>, 'value' | 'defaultValue' | 'type' | 'children' | 'disabled' | 'id' | 'className'>

export interface DateTimePickerProps extends DateTimeOptions, DateTimeTriggerAttributes {
  value?: Date | null
  defaultValue?: Date | null
  /** Called once a day and a time are both picked, and on every change after. */
  onValueChange?: (value: Date) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  label?: React.ReactNode
  hint?: React.ReactNode
  /** An error message (replaces the hint), or `true` to mark the field invalid without one. */
  error?: React.ReactNode | boolean
  /** Shown while nothing is picked. Defaults to the `pickDateTime` label. */
  placeholder?: string
  /** Submits `YYYY-MM-DDTHH:mm` with a form, as `<input type="datetime-local">` does. */
  name?: string
  disabled?: boolean
  id?: string
  size?: 'sm' | 'md' | 'lg'
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null
  /** Called as the panel opens and takes focus; `preventDefault()` leaves focus where it was. */
  onOpenAutoFocus?: (event: Event) => void
  /** A press outside the panel; `preventDefault()` keeps it open. */
  onInteractOutside?: (event: Event) => void
  /** Classes for the outer wrapper (label + field + hint). `className` styles the field. */
  wrapperClassName?: string
  className?: string
}

/**
 * A date and time field: DatePicker's field, with a clock's worth of times beside the calendar.
 * Pick a day, then a time; the time closes it. Other props, `ref` included, go to the trigger
 * button.
 */
export function DateTimePicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  min,
  max,
  minTime,
  maxTime,
  step,
  format: formatProp,
  isTimeDisabled,
  today,
  label,
  hint,
  error,
  placeholder,
  name,
  disabled,
  id,
  size: ownSize,
  container,
  onOpenAutoFocus,
  onInteractOutside,
  wrapperClassName,
  className,
  'aria-describedby': describedBy,
  ...props
}: DateTimePickerProps) {
  const chrome = useFieldChrome({ id, disabled, error, hint })
  const labels = useSatinLabels()
  const groupSize = React.useContext(FieldSizeContext)
  const size = ownSize ?? groupSize ?? 'md'
  const format = formatProp ?? localeTimeFormat(labels.dateLocale)
  const [inner, setInner] = React.useState<Date | null>(defaultValue)
  const value = valueProp !== undefined ? valueProp : inner
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen)
  const open = openProp ?? innerOpen
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInnerOpen(next)
    onOpenChange?.(next)
  }
  const text = value ? dateTimeFormatter(`${labels.dateLocale}|${format}`).format(value) : ''
  const fieldName = name ?? chrome.name
  return (
    <FieldChrome label={label} chrome={chrome} className={wrapperClassName}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild {...props}>
          <button
            type="button"
            id={chrome.controlId}
            data-slot="date-time-picker-trigger"
            data-size={size}
            data-filled={text ? true : undefined}
            data-invalid={chrome.invalid || undefined}
            data-disabled={chrome.disabled || undefined}
            data-state={open ? 'open' : 'closed'}
            disabled={chrome.disabled}
            aria-invalid={chrome.invalid || undefined}
            aria-describedby={[describedBy, chrome.describedBy].filter(Boolean).join(' ') || undefined}
            className={cn('satin-field cursor-pointer text-start', className)}
          >
            <span className="satin-field-icon" aria-hidden>
              <CalendarIcon />
            </span>
            <span className={cn('min-w-0 flex-1 truncate', text ? 'text-text-default' : 'text-text-muted')}>{text || (placeholder ?? labels.pickDateTime)}</span>
            <span className="satin-field-icon" aria-hidden>
              <NavArrowDown className={cn('transition-transform duration-(--duration-fast) ease-(--ease-out)', open && 'rotate-180')} />
            </span>
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal container={container}>
          <PopoverPrimitive.Content
            data-slot="date-time-picker"
            align="start"
            sideOffset={4}
            collisionPadding={8}
            aria-labelledby={label ? `${chrome.controlId}-label` : undefined}
            aria-label={label ? undefined : (props['aria-label'] ?? labels.pickDateTime)}
            onOpenAutoFocus={onOpenAutoFocus}
            onInteractOutside={onInteractOutside}
            className={cn(
              'z-50 outline-none',
              'origin-(--radix-popover-content-transform-origin) data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
            )}
          >
            <div data-slot="date-time-picker-panel" className={cn(surfaceClass, 'w-fit overflow-hidden')}>
              <DateTimeBody
                value={value}
                min={min}
                max={max}
                minTime={minTime}
                maxTime={maxTime}
                step={step}
                format={format}
                isTimeDisabled={isTimeDisabled}
                today={today}
                onValueChange={(d) => {
                  if (valueProp === undefined) setInner(d)
                  onValueChange?.(d)
                }}
                onTimePicked={() => setOpen(false)}
              />
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {fieldName && <input type="hidden" name={fieldName} value={value ? isoDateTime(value) : ''} disabled={chrome.disabled} />}
    </FieldChrome>
  )
}
