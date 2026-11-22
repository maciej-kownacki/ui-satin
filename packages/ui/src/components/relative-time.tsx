'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { useSatinLabels } from './labels'

/* ---------- one clock for every time on the page ---------- */

/** How often relative times are worked out again. They count in minutes, so twice a minute is enough. */
const TICK_MS = 30_000

const clock = { now: Date.now() }
const ticks = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function subscribeClock(listener: () => void) {
  if (!ticks.size) {
    clock.now = Date.now()
    timer = setInterval(() => {
      clock.now = Date.now()
      for (const tick of ticks) tick()
    }, TICK_MS)
  }
  ticks.add(listener)
  return () => {
    ticks.delete(listener)
    if (!ticks.size) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

/**
 * A text worked out from the page's one clock, which ticks every 30 seconds while anything
 * listens and stops when nothing does. Each caller's snapshot is its own string, so a tick
 * renders only the components whose text changed: fifty times on a page cost fifty string
 * compares, not fifty renders. `text` gets the clock's time in ms; keep it cheap and pure.
 */
export function useRelativeClock(text: (now: number) => string): string {
  return React.useSyncExternalStore(
    subscribeClock,
    () => text(clock.now),
    // Server and hydration: the time now. The client's first tick puts it right if it differs.
    () => text(Date.now()),
  )
}

/* ---------- formatters ---------- */

// Formatters are slow to build and every time on the page asks for the same few: one each.
const formatters = new Map<string, Intl.DateTimeFormat | Intl.RelativeTimeFormat>()

/** An `Intl.DateTimeFormat`, built once per locale and options and shared. */
export function dateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `d|${locale}|${JSON.stringify(options)}`
  let f = formatters.get(key) as Intl.DateTimeFormat | undefined
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat(locale, options)))
  return f
}

/** An `Intl.RelativeTimeFormat`, built once per locale and options and shared. */
export function relativeTimeFormat(locale: string, options: Intl.RelativeTimeFormatOptions): Intl.RelativeTimeFormat {
  const key = `r|${locale}|${JSON.stringify(options)}`
  let f = formatters.get(key) as Intl.RelativeTimeFormat | undefined
  if (!f) formatters.set(key, (f = new Intl.RelativeTimeFormat(locale, options)))
  return f
}

/** Whole days from `a` to `b`, by the calendar (not 24-hour spans). */
const daysBetween = (a: Date, b: Date) => {
  const start = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((start(b) - start(a)) / 86_400_000)
}

/*
 * English short units end in a dot ("5 min. ago", "1 hr. ago"); Satin writes them without, as en-GB
 * does. Only English: elsewhere the dot can be the language's own spelling ("1 godz. temu",
 * "vor 1 Std."). The narrow style isn't the fix: in English it says "5m ago".
 */
const isEnglish = (locale: string) => /^en(?:-|$)/i.test(locale)
const undot = (text: string) => text.replace(/\.(?=\s|$)/g, '')

/** Today's times relative ("5 min ago"), older ones as the clock time, with the date when `withDate`. */
function shortTime(at: Date, now: number, locale: string, withDate: boolean) {
  const nowDate = new Date(now)
  if (daysBetween(at, nowDate) === 0) {
    const rtf = relativeTimeFormat(locale, { style: 'short', numeric: 'auto' })
    const minutes = Math.floor(Math.max(0, now - at.getTime()) / 60_000)
    const text =
      minutes < 1
        ? rtf.format(0, 'second')
        : minutes < 60
          ? rtf.format(-minutes, 'minute')
          : rtf.format(-Math.floor(minutes / 60), 'hour')
    return isEnglish(locale) ? undot(text) : text
  }
  const sameYear = at.getFullYear() === nowDate.getFullYear()
  return dateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    ...(withDate && { month: 'short', day: 'numeric', ...(!sameYear && { year: 'numeric' }) }),
  }).format(at)
}

/* ---------- the time ---------- */

export interface RelativeTimeProps extends Omit<React.ComponentProps<'time'>, 'children' | 'dateTime'> {
  /** When: a Date, an ISO string or a timestamp. */
  at: Date | string | number
  /** Past today, show the date before the clock time ("Nov 16, 9:40 AM"), for a list not grouped by day. */
  withDate?: boolean
}

/**
 * A moment as people read it in a feed: relative today ("now", "5 min ago", "2 hr ago"), the
 * clock time before that ("9:40 AM"), with the date too under `withDate` (and the year when it
 * isn't this one). It stays current on one clock shared by every time on the page, which renders
 * only the times whose text changed. English short units lose their dot ("5 min ago"); other
 * languages keep their own spelling. Words and formats follow `dateLocale` in SatinLabels.
 *
 * A `<time dateTime>` in muted 13px with tabular figures. Screen readers hear the full date and
 * time ("Monday, November 16, 2026 at 9:40 AM") from a visually hidden span; the short text is
 * `aria-hidden`. Other props, `ref` included, go to the `time` element.
 */
export function RelativeTime({ at, withDate = false, className, ...props }: RelativeTimeProps) {
  const locale = useSatinLabels().dateLocale
  const date = at instanceof Date ? at : new Date(at)
  const time = date.getTime()
  const text = useRelativeClock((now) => shortTime(new Date(time), now, locale, withDate))
  const full = React.useMemo(() => dateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(time), [locale, time])
  return (
    <time
      data-slot="relative-time"
      dateTime={date.toISOString()}
      className={cn('shrink-0 text-sm leading-5 whitespace-nowrap text-text-muted tabular-nums', className)}
      {...props}
    >
      <span aria-hidden suppressHydrationWarning>
        {text}
      </span>
      <span className="sr-only" suppressHydrationWarning>
        {full}
      </span>
    </time>
  )
}
