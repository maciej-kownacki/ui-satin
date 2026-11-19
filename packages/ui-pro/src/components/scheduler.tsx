'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Avatar, AvatarGroup, type AvatarTone } from '@uisatin/ui/avatar'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { DatePickerPanel, type WeekDay } from '@uisatin/ui/date-picker'
import { Dot } from '@uisatin/ui/dot'
import { HoverCard } from '@uisatin/ui/hover-card'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { PopoverPanel } from '@uisatin/ui/popover'
import { SegmentedControl } from '@uisatin/ui/segmented-control'
import { Tooltip } from '@uisatin/ui/tooltip'

/**
 * Scheduler: a day, week or month of events over a grid of time slots, for interviews, sales
 * calls and bookings. A card (bg/card, border/subtle, radius-xl) with a toolbar (Today, ‹ ›, the
 * period, which opens a DatePickerPanel, and a SegmentedControl for the view) over the grid.
 *
 * - Day and week: a column per day, a row per slot (`slotMinutes`, 30 by default, 32px), a line
 *   on each hour, and an all-day row on top. Hours outside `workingHours` and the locale's weekend
 *   are bg/canvas; `availability` marks slots free (a green tint) or busy (grey, hatched). Events
 *   are tone blocks side by side where they overlap; the now line crosses today in the brand
 *   colour and moves with the clock, without animation.
 * - Month: six weeks of day cells, three events each (or two and "3 more", whose HoverCard lists
 *   the rest and whose click opens that day).
 * - Drag an event to move it: it follows the pointer, its new slot is outlined with the new time,
 *   and on drop it settles into that slot (transform, --duration-base, --ease-out). Drag its
 *   bottom edge to change the end, a slot at a time. Read-only events stay where they are.
 * - Press and drag across empty slots (or click one) to pick a time: `onSlotSelect`, and the
 *   `slotPopover` if given. Clicking an event calls `onEventOpen` and opens the `eventPopover`.
 * - Switching views crossfades (--duration-base); paging through weeks and every keyboard step
 *   happen at once.
 *
 * Time zones: everything is drawn in `timeZone` (an IANA name, the browser's by default), with
 * its short name over the time column and its long name in the grid's accessible name. Days are
 * calendar days in that zone, built from its own rules, so the grid, moves and new slots stay on
 * the wall clock across a daylight-saving change (a 10:00 call moved a day keeps 10:00; a dragged
 * event keeps its length). `zonedDate()` and `zonedParts()` do the same conversions for the app.
 * The week starts where `dateLocale` says (Sunday in en-US, Monday in pl-PL), or at `weekStartsOn`.
 *
 * Keyboard: the grid is one tab stop. Arrows move between slots (or days), Home / End to the
 * week's ends, Page Up / Down a period; Enter on an empty slot picks it, on an event's slot moves
 * to the event; Shift and ↑ ↓ stretch the pick first. On an event: Enter opens it, Alt and arrows
 * move it (a slot or a day; a week in Month), Alt, Shift and ↑ ↓ change its end, ↑ ↓ go to the
 * day's other events, Escape goes back to the grid. Each change is read out.
 *
 * Every date, time, weekday and month is written by `Intl` in the `dateLocale` label.
 *
 * Parts, for a toolbar of your own: `SchedulerRoot` (the state and the card) › `SchedulerToolbar`
 * (its children go before the view switch) and `SchedulerGrid` (the current view). Other props on
 * Scheduler and SchedulerRoot, `ref` included, go to the card's root `div`.
 */

/* ---------- words ---------- */

export type SchedulerView = 'day' | 'week' | 'month'

/** The words the Scheduler says on its own. They join SatinLabels, so the app translates them there. */
export const schedulerLabels = {
  /** The view switch's name. */
  schedulerView: 'View',
  schedulerDay: 'Day',
  schedulerWeek: 'Week',
  schedulerMonth: 'Month',
  schedulerToday: 'Today',
  /** The ‹ button: "Previous week". */
  schedulerPrevious: (view: SchedulerView): string => (view === 'day' ? 'Previous day' : view === 'week' ? 'Previous week' : 'Previous month'),
  /** The › button: "Next week". */
  schedulerNext: (view: SchedulerView): string => (view === 'day' ? 'Next day' : view === 'week' ? 'Next week' : 'Next month'),
  schedulerAllDay: 'All day',
  schedulerBusy: 'Busy',
  schedulerFree: 'Free',
  schedulerReadOnly: 'Read-only',
  /** The popover's title over a picked slot. */
  schedulerNewEvent: 'New event',
  /** The grid's accessible name: the period shown and the time zone's long name. */
  schedulerGrid: (period: string, timeZone: string) => `${period}, ${timeZone}`,
  /** An event's accessible name: its title and full time. */
  schedulerEvent: (title: string, when: string) => `${title}, ${when}`,
  /** Who's in an event. `names` is already a list ("Tara Mendes, Ada Novak, and Jon Park"). */
  schedulerWith: (names: string) => `With ${names}`,
  /** Month: the button for the events that don't fit in a day. */
  schedulerMore: (count: number) => `${count} more`,
  /** Month: a day's events, read after its date. */
  schedulerEventCount: (count: number): string => (count === 1 ? '1 event' : `${count} events`),
  /** How to move a timed event from the keyboard, read after its name. */
  schedulerMoveHint: 'Alt and arrow keys to move, Alt, Shift and Up or Down to change the end',
  /** Read out after a move: "Interview moved to Thursday, November 19, 11:30 AM – 12:15 PM". */
  schedulerMoved: (title: string, when: string) => `${title} moved to ${when}`,
  /** Read out after the end changes. */
  schedulerResized: (title: string, when: string) => `${title} now ${when}`,
  /** Read out when a read-only event is asked to move. */
  schedulerLocked: (title: string) => `${title} is read-only`,
  /** Read out when slots are picked. */
  schedulerSelected: (when: string) => `Selected ${when}`,
}

type SchedulerLabelSet = typeof schedulerLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends SchedulerLabelSet {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...schedulerLabels, ...labels }), [labels])
}
type Labels = ReturnType<typeof useLabels>

/* ---------- types ---------- */

export type SchedulerTone = BadgeTone

export interface SchedulerAttendee {
  name: string
  /** One or two letters. Defaults to the first letters of the first two words of `name`. */
  initials?: string
  tone?: AvatarTone
}

export interface SchedulerEvent {
  id: string
  start: Date
  /** Exclusive: an event 10:00–10:45 leaves 10:45 free. */
  end: Date
  title: string
  /** Badge's tones. Defaults to `brand`. */
  tone?: SchedulerTone
  /** Shown as an AvatarGroup in the event (when it has room), its HoverCard and its popover. */
  attendees?: SchedulerAttendee[]
  /** It can't be dragged, resized or moved from the keyboard. It still opens. */
  readOnly?: boolean
  /** In the all-day row, covering every day from `start`'s to the day before `end` (or `start`'s). */
  allDay?: boolean
}

export interface SchedulerAvailability {
  start: Date
  end: Date
  /** `busy` is grey and hatched; `free` a light green. Events can still go there: the app decides. */
  status: 'free' | 'busy'
}

/** What `onSlotSelect` gets: the picked time, or a whole day from the all-day row or Month. */
export interface SchedulerSlot {
  start: Date
  end: Date
  allDay: boolean
}

/* ---------- time zones ---------- */

/** A wall-clock date and time; `month` runs 1–12. */
export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

const DAY_MS = 86_400_000
const MINUTE_MS = 60_000

const wallFormats = new Map<string, Intl.DateTimeFormat>()
const wallFormat = (timeZone: string) => {
  let f = wallFormats.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
    wallFormats.set(timeZone, f)
  }
  return f
}

/** The browser's time zone. */
const localZone = () => new Intl.DateTimeFormat().resolvedOptions().timeZone

/** The wall-clock time of `date` in `timeZone` (the browser's by default). */
export function zonedParts(date: Date, timeZone: string = localZone()): ZonedParts {
  const parts = wallFormat(timeZone).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') }
}

/** The wall clock as if it were UTC, in ms, so two of them subtract to the zone's offset. */
const wallMs = (ms: number, timeZone: string) => {
  const p = zonedParts(new Date(ms), timeZone)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
}
const offsetAt = (ms: number, timeZone: string) => wallMs(ms, timeZone) - Math.floor(ms / MINUTE_MS) * MINUTE_MS

/**
 * The moment the wall clock in `timeZone` shows these parts: `zonedDate({ year: 2026, month: 11,
 * day: 19, hour: 10 }, 'Europe/Warsaw')`. The zone's own rules decide the offset, so it's right on
 * either side of a daylight-saving change. A time the change skips (02:30 the night clocks go
 * forward) moves forward by the gap; a time that happens twice is the first. Minutes past 59 roll
 * into the hours and hours past 23 into the days.
 */
export function zonedDate({ year, month, day, hour = 0, minute = 0 }: Pick<ZonedParts, 'year' | 'month' | 'day'> & Partial<ZonedParts>, timeZone: string = localZone()): Date {
  const local = Date.UTC(year, month - 1, day, hour, minute)
  // The offsets a day either side: at most one change sits between them.
  const before = local - offsetAt(local - DAY_MS, timeZone)
  const after = local - offsetAt(local + DAY_MS, timeZone)
  const beforeFits = wallMs(before, timeZone) === local
  const afterFits = wallMs(after, timeZone) === local
  if (beforeFits && afterFits) return new Date(Math.min(before, after))
  // Neither fits in a gap: the offset from before the change carries it forward.
  return new Date(afterFits && !beforeFits ? after : before)
}

/** A calendar day, whatever the zone: the UTC midnight of that date, in ms. */
type Day = number

const dayOfDate = (date: Date, tz: string): Day => {
  const p = zonedParts(date, tz)
  return Date.UTC(p.year, p.month - 1, p.day)
}
const minutesOf = (date: Date, tz: string) => {
  const p = zonedParts(date, tz)
  return p.hour * 60 + p.minute
}
/** The moment `minutes` past midnight (wall clock) on `day` in `tz`. */
const at = (day: Day, minutes: number, tz: string) => {
  const d = new Date(day)
  return zonedDate({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), minute: minutes }, tz)
}
/** The same wall-clock time `n` days later. */
const shiftDays = (date: Date, n: number, tz: string) => at(dayOfDate(date, tz) + n * DAY_MS, minutesOf(date, tz), tz)
const weekdayOf = (day: Day) => new Date(day).getUTCDay()
/** A local Date on the same calendar day, for Calendar, which works in local time. */
const toLocal = (day: Day) => {
  const d = new Date(day)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}
const fromLocal = (d: Date): Day => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())

/* ---------- the locale's week ---------- */

type WeekInfo = { firstDay: WeekDay; weekend: number[] }
/** Intl's own: 1 (Monday) to 7 (Sunday). */
type IntlWeekInfo = { firstDay: number; weekend: number[] }
// Browsers without Intl.Locale weekInfo (Firefox): CLDR's first day by region; Monday elsewhere.
const SUNDAY_FIRST = new Set('AG AS BD BR BS BT BW BZ CA CN CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW'.split(' '))
const SATURDAY_FIRST = new Set('AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY'.split(' '))

function localeWeek(locale: string): WeekInfo {
  try {
    const l = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => IntlWeekInfo; weekInfo?: IntlWeekInfo }
    const info = l.getWeekInfo?.() ?? l.weekInfo
    // Intl counts 1 (Monday) to 7 (Sunday); Date counts 0 (Sunday) to 6.
    if (info) return { firstDay: (info.firstDay % 7) as WeekDay, weekend: info.weekend.map((d) => d % 7) }
    const region = l.maximize().region ?? ''
    if (SUNDAY_FIRST.has(region)) return { firstDay: 0, weekend: [6, 0] }
    if (SATURDAY_FIRST.has(region)) return { firstDay: 6, weekend: [5, 6] }
  } catch {
    // An unknown locale falls through to Monday.
  }
  return { firstDay: 1, weekend: [6, 0] }
}

/* ---------- periods ---------- */

const startOfWeek = (day: Day, weekStart: WeekDay) => day - ((weekdayOf(day) - weekStart + 7) % 7) * DAY_MS
const firstOfMonth = (day: Day) => {
  const d = new Date(day)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
}
/** The same day of the month `n` months on, kept inside the shorter months. */
const addMonths = (day: Day, n: number) => {
  const d = new Date(day)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n + 1, 0)).getUTCDate()
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, Math.min(d.getUTCDate(), last))
}

function daysOf(view: SchedulerView, day: Day, weekStart: WeekDay): Day[] {
  if (view === 'day') return [day]
  if (view === 'week') {
    const start = startOfWeek(day, weekStart)
    return Array.from({ length: 7 }, (_, i) => start + i * DAY_MS)
  }
  // Always six weeks, so the month keeps its height.
  const start = startOfWeek(firstOfMonth(day), weekStart)
  return Array.from({ length: 42 }, (_, i) => start + i * DAY_MS)
}

const step = (view: SchedulerView, day: Day, n: number) => (view === 'month' ? addMonths(day, n) : day + n * (view === 'week' ? 7 : 1) * DAY_MS)

/* ---------- layout ---------- */

/** An event's part on one day of the time grid, in wall-clock minutes. */
interface Segment {
  event: SchedulerEvent
  day: Day
  startMin: number
  endMin: number
  /** Began on an earlier day / goes on past midnight. */
  before: boolean
  after: boolean
  col: number
  cols: number
}

/** The first and last calendar day an event covers. */
function spanOf(event: SchedulerEvent, tz: string): [Day, Day] {
  const first = dayOfDate(event.start, tz)
  const last = event.end > event.start ? dayOfDate(new Date(+event.end - 1), tz) : first
  return [first, Math.max(first, last)]
}

function segmentsOf(events: SchedulerEvent[], day: Day, tz: string): Segment[] {
  const from = at(day, 0, tz)
  const to = at(day + DAY_MS, 0, tz)
  const segments: Segment[] = []
  for (const event of events) {
    if (event.allDay || event.end <= from || event.start >= to) continue
    if (event.end <= event.start && !(event.start >= from && event.start < to)) continue
    const before = event.start < from
    const after = event.end > to
    const startMin = before ? 0 : minutesOf(event.start, tz)
    let endMin = after ? 1440 : minutesOf(event.end, tz)
    // A day the clocks go back, or an event with no length: never shorter than a sliver.
    if (endMin <= startMin) endMin = Math.min(1440, startMin + 15)
    segments.push({ event, day, startMin, endMin, before, after, col: 0, cols: 1 })
  }
  // Events that overlap share the width: each in the first column free at its start, as many
  // columns as the busiest moment of its cluster needs.
  segments.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)
  let cluster: Segment[] = []
  let clusterEnd = -1
  const columnEnds: number[] = []
  const close = () => {
    for (const s of cluster) s.cols = columnEnds.length
    cluster = []
    columnEnds.length = 0
  }
  for (const s of segments) {
    if (s.startMin >= clusterEnd) close()
    let col = columnEnds.findIndex((end) => end <= s.startMin)
    if (col < 0) col = columnEnds.push(0) - 1
    columnEnds[col] = s.endMin
    s.col = col
    cluster.push(s)
    clusterEnd = Math.max(clusterEnd, s.endMin)
  }
  close()
  return segments
}

/** All-day events across the days shown, each on the first lane free for all its days. */
interface Span {
  event: SchedulerEvent
  first: number
  last: number
  lane: number
}
function spansOf(events: SchedulerEvent[], days: Day[], tz: string): Span[] {
  const spans: Span[] = []
  const lanes: number[] = []
  const firstDay = days[0]
  const lastDay = days[days.length - 1]
  const all = events
    .filter((e) => e.allDay)
    .map((event) => ({ event, span: spanOf(event, tz) }))
    .filter(({ span }) => span[1] >= firstDay && span[0] <= lastDay)
    .sort((a, b) => a.span[0] - b.span[0] || b.span[1] - a.span[1])
  for (const { event, span } of all) {
    const first = Math.max(0, Math.round((span[0] - firstDay) / DAY_MS))
    const last = Math.min(days.length - 1, Math.round((span[1] - firstDay) / DAY_MS))
    let lane = lanes.findIndex((end) => end < first)
    if (lane < 0) lane = lanes.push(-1) - 1
    lanes[lane] = last
    spans.push({ event, first, last, lane })
  }
  return spans
}

/** Free or busy minutes of a day, from `availability`. */
function availabilityOf(availability: SchedulerAvailability[], day: Day, tz: string) {
  const from = at(day, 0, tz)
  const to = at(day + DAY_MS, 0, tz)
  return availability
    .filter((a) => a.end > from && a.start < to)
    .map((a) => ({ status: a.status, startMin: a.start <= from ? 0 : minutesOf(a.start, tz), endMin: a.end >= to ? 1440 : minutesOf(a.end, tz) }))
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

/** Slots this tall per hour: 32px for 30 minutes, never under 20px. */
const HOUR_PX = 64
const slotHeightOf = (slotMinutes: number) => Math.max(20, Math.round((HOUR_PX * slotMinutes) / 60))
const ALL_DAY_LANE = 24
const MONTH_ROWS = 3

/* ---------- formats ---------- */

function formatsOf(locale: string, tz: string) {
  const f = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options)
  const utc = 'UTC'
  const zoneShort = f({ timeZone: tz, timeZoneName: 'short' })
  const zoneLong = f({ timeZone: tz, timeZoneName: 'long' })
  const zoneName = (format: Intl.DateTimeFormat, date: Date) => format.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? tz
  const range = (fmt: Intl.DateTimeFormat, a: Date, b: Date) => {
    try {
      return fmt.formatRange(a, b)
    } catch {
      return `${fmt.format(a)} – ${fmt.format(b)}`
    }
  }
  const dayLong = f({ weekday: 'long', month: 'long', day: 'numeric', timeZone: utc })
  const dayFull = f({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: utc })
  const monthYear = f({ month: 'long', year: 'numeric', timeZone: utc })
  const dayMonthYear = f({ month: 'long', day: 'numeric', year: 'numeric', timeZone: utc })
  const weekdayShort = f({ weekday: 'short', timeZone: utc })
  const dayNumber = f({ day: 'numeric', timeZone: utc })
  const hour = f({ hour: 'numeric', timeZone: utc })
  const wallTime = f({ hour: 'numeric', minute: '2-digit', timeZone: utc })
  const time = f({ hour: 'numeric', minute: '2-digit', timeZone: tz })
  const full = f({ weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz })
  const list = (() => {
    try {
      return new Intl.ListFormat(locale, { type: 'conjunction' })
    } catch {
      return { format: (items: string[]) => items.join(', ') }
    }
  })()
  const weekdayLong = f({ weekday: 'long', timeZone: utc })
  return {
    /** "GMT+1", "EST": the zone's short name on that date (it changes with daylight saving). */
    zoneShort: (date: Date) => zoneName(zoneShort, date),
    /** "Central European Standard Time". */
    zoneLong: (date: Date) => zoneName(zoneLong, date),
    weekdayLong: (day: Day) => weekdayLong.format(day),
    dayLong: (day: Day) => dayLong.format(day),
    weekdayShort: (day: Day) => weekdayShort.format(day),
    dayNumber: (day: Day) => dayNumber.format(day),
    /** "9 AM" over the hour line. */
    hour: (minutes: number) => hour.format(Date.UTC(2000, 0, 1, 0, minutes)),
    /** "10:00 – 10:30 AM": a slot's wall-clock range. */
    wallRange: (from: number, to: number) => range(wallTime, new Date(Date.UTC(2000, 0, 1, 0, from)), new Date(Date.UTC(2000, 0, 1, 0, to))),
    wallTime: (minutes: number) => wallTime.format(Date.UTC(2000, 0, 1, 0, minutes)),
    /** "10:00 – 10:45 AM", in the zone. */
    time: (a: Date, b: Date) => range(time, a, b),
    startTime: (a: Date) => time.format(a),
    /** "Thursday, November 19, 10:00 – 10:45 AM", in the zone. */
    full: (a: Date, b: Date) => range(full, a, b),
    days: (a: Day, b: Day) => (a === b ? dayLong.format(a) : range(dayLong, new Date(a), new Date(b))),
    names: (names: string[]) => list.format(names),
    title: (view: SchedulerView, days: Day[], anchor: Day) =>
      view === 'day'
        ? dayFull.format(anchor)
        : view === 'week'
          ? range(dayMonthYear, new Date(days[0]), new Date(days[days.length - 1]))
          : monthYear.format(anchor),
  }
}
type Formats = ReturnType<typeof formatsOf>

/* ---------- reduced motion, now ---------- */

const REDUCED = '(prefers-reduced-motion: reduce)'
const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED).matches

/** The clock, a tick a minute; null until mounted, so the server and the first render agree. */
function useNow(fixed?: Date) {
  const [now, setNow] = React.useState<Date | null>(fixed ?? null)
  React.useEffect(() => {
    if (fixed) return setNow(fixed)
    setNow(new Date())
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      setNow(new Date())
      timer = setTimeout(tick, MINUTE_MS - (Date.now() % MINUTE_MS))
    }
    timer = setTimeout(tick, MINUTE_MS - (Date.now() % MINUTE_MS))
    return () => clearTimeout(timer)
  }, [fixed ? +fixed : undefined])
  return now
}

/* ---------- state ---------- */

type Selection = { day: Day; from: number; to: number; anchor: number; allDay: boolean; draft: boolean }
type Focus = { day: Day; slot: number }
type PopoverState = { kind: 'event'; id: string } | { kind: 'slot' } | null
type Drag = {
  event: SchedulerEvent
  kind: 'move' | 'resize'
  /** Move along the time grid, or by whole days (all-day row, Month). */
  mode: 'time' | 'day'
  segment?: Segment
  el: HTMLElement
  pointerId: number
  x0: number
  y0: number
  scroll0: number
  grabDay: Day
  moved: boolean
  target: { start: Date; end: Date } | null
}

interface SchedulerContextValue {
  labels: Labels
  fmt: Formats
  tz: string
  view: SchedulerView
  views: SchedulerView[]
  setView: (view: SchedulerView) => void
  anchor: Day
  setAnchor: (day: Day) => void
  weekStart: WeekDay
  weekend: number[]
  today: Day | null
  now: Date | null
  events: SchedulerEvent[]
  availability: SchedulerAvailability[]
  slotMinutes: number
  slotHeight: number
  workingHours: [number, number]
  focus: Focus
  setFocus: (focus: Focus, move?: boolean) => void
  selection: Selection | null
  setSelection: (selection: Selection | null) => void
  pickSlot: (selection: Omit<Selection, 'draft' | 'anchor'>) => void
  dragId: string | null
  dragKind: 'move' | 'resize' | null
  dropTarget: { day: Day; startMin: number; endMin: number; event: SchedulerEvent } | null
  dropDay: Day | null
  resizeEnd: { id: string; end: Date } | null
  beginDrag: (e: React.PointerEvent<HTMLElement>, init: Pick<Drag, 'event' | 'kind' | 'mode' | 'segment'>) => void
  clickSuppressed: () => boolean
  openEvent: (event: SchedulerEvent) => void
  keyOnEvent: (e: React.KeyboardEvent<HTMLElement>, event: SchedulerEvent, day: Day, inTimeGrid: boolean) => void
  flips: React.RefObject<Map<string, DOMRect>>
  gridRef: React.RefObject<HTMLDivElement | null>
  scrollerRef: React.RefObject<HTMLDivElement | null>
  popover: PopoverState
  hintId: string
  dayHintId: string
  container?: HTMLElement | null
  goToDay: (day: Day) => void
  announce: (text: string) => void
}

const SchedulerContext = React.createContext<SchedulerContextValue | null>(null)
function useScheduler(part: string) {
  const s = React.useContext(SchedulerContext)
  if (!s) throw new Error(`${part} must be inside SchedulerRoot`)
  return s
}

/* ---------- root ---------- */

export interface SchedulerRootProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  /** The view shown. */
  view?: SchedulerView
  defaultView?: SchedulerView
  onViewChange?: (view: SchedulerView) => void
  /** The views the switch offers, in order. */
  views?: SchedulerView[]
  /** Any moment in the day, week or month shown. Defaults to today. */
  date?: Date
  defaultDate?: Date
  /** Called with midnight (in `timeZone`) of the new day as the period changes. */
  onDateChange?: (date: Date) => void
  /** The events. Leave it out and pass `defaultEvents` to let the Scheduler keep them. */
  events?: SchedulerEvent[]
  defaultEvents?: SchedulerEvent[]
  /** After a drag, a resize or a keyboard move: the event with its new times, then as it was. */
  onEventChange?: (event: SchedulerEvent, previous: SchedulerEvent) => void
  /** A click, Enter or Space on an event. */
  onEventOpen?: (event: SchedulerEvent) => void
  /** Slots picked with the pointer or Enter: their start and end, or a whole day. */
  onSlotSelect?: (slot: SchedulerSlot) => void
  /** Free or busy times, drawn under the events. */
  availability?: SchedulerAvailability[]
  /** Minutes per slot: the rows, the drag steps and the keyboard steps. */
  slotMinutes?: number
  /** From and to, in hours (`[9, 18]`); outside them the grid is bg/canvas. */
  workingHours?: [number, number]
  /** An IANA time zone ("Europe/Warsaw"). Defaults to the browser's. */
  timeZone?: string
  /** The week's first day, 0 (Sunday) to 6. Defaults to `dateLocale`'s. */
  weekStartsOn?: WeekDay
  /** Now, for the now line and today. Defaults to the clock, updated every minute. */
  now?: Date
  /** The body of a popover that opens on an event, under its title and time (and attendees). */
  eventPopover?: (event: SchedulerEvent, close: () => void) => React.ReactNode
  /** The body of a popover that opens on picked slots, under "New event" and the time. */
  slotPopover?: (slot: SchedulerSlot, close: () => void) => React.ReactNode
  /** Portal target for the popovers and hover cards. */
  container?: HTMLElement | null
}

/** The card and its state: put `SchedulerToolbar` and `SchedulerGrid` inside. Other props, `ref` included, go to the card. */
export function SchedulerRoot({
  view: viewProp,
  defaultView = 'week',
  onViewChange,
  views = ['day', 'week', 'month'],
  date,
  defaultDate,
  onDateChange,
  events: eventsProp,
  defaultEvents = [],
  onEventChange,
  onEventOpen,
  onSlotSelect,
  availability = [],
  slotMinutes: slotMinutesProp = 30,
  workingHours = [9, 18],
  timeZone,
  weekStartsOn,
  now: nowProp,
  eventPopover,
  slotPopover,
  container,
  className,
  children,
  ...props
}: SchedulerRootProps) {
  const labels = useLabels()
  const [tz] = React.useState(() => timeZone ?? localZone())
  const zone = timeZone ?? tz
  const locale = labels.dateLocale
  const fmt = React.useMemo(() => formatsOf(locale, zone), [locale, zone])
  const week = React.useMemo(() => localeWeek(locale), [locale])
  // Kept in 0–6 for callers without types.
  const weekStart = weekStartsOn !== undefined ? ((((Math.trunc(weekStartsOn) % 7) + 7) % 7) as WeekDay) : week.firstDay
  const slotMinutes = Math.min(240, Math.max(5, Math.round(slotMinutesProp)))
  const slotHeight = slotHeightOf(slotMinutes)
  const now = useNow(nowProp)
  const today = now ? dayOfDate(now, zone) : null

  // View, date and events: controlled or not.
  const [innerView, setInnerView] = React.useState(defaultView)
  const view = viewProp ?? innerView
  const setView = (next: SchedulerView) => {
    setInnerView(next)
    onViewChange?.(next)
  }
  const [innerAnchor, setInnerAnchor] = React.useState<Day>(() => dayOfDate(defaultDate ?? new Date(), zone))
  const anchor = date ? dayOfDate(date, zone) : innerAnchor
  const setAnchor = (day: Day) => {
    setInnerAnchor(day)
    if (day !== anchor) onDateChange?.(at(day, 0, zone))
  }
  const [innerEvents, setInnerEvents] = React.useState(defaultEvents)
  const events = eventsProp ?? innerEvents

  const days = daysOf(view, anchor, weekStart)
  const [focusState, setFocusState] = React.useState<Focus>(() => ({ day: anchor, slot: Math.floor((workingHours[0] * 60) / slotMinutes) }))
  // Focus stays in the period shown: today when it's there, else the first day.
  const focusDay = days.includes(focusState.day) ? focusState.day : today !== null && days.includes(today) ? today : view === 'month' ? anchor : days[0]
  const rows = Math.ceil(1440 / slotMinutes)
  const focus = { day: focusDay, slot: Math.min(rows - 1, Math.max(-1, focusState.slot)) }
  const pendingFocus = React.useRef<'cell' | { id: string } | null>(null)
  const setFocus = (next: Focus, move = false) => {
    setFocusState(next)
    if (move) {
      pendingFocus.current = 'cell'
      // A step out of the period shown pages to it.
      if (!daysOf(view, anchor, weekStart).includes(next.day)) setAnchor(next.day)
    }
  }

  const [selection, setSelection] = React.useState<Selection | null>(null)
  const [popover, setPopover] = React.useState<PopoverState>(null)
  const [message, setMessage] = React.useState('')
  const announce = (text: string) => setMessage(text)

  const gridRef = React.useRef<HTMLDivElement | null>(null)
  const scrollerRef = React.useRef<HTMLDivElement | null>(null)
  const flips = React.useRef(new Map<string, DOMRect>())
  const hintId = React.useId()
  const dayHintId = React.useId()

  const whenOf = (event: Pick<SchedulerEvent, 'start' | 'end' | 'allDay'>) => {
    if (event.allDay) {
      const [first, last] = spanOf(event as SchedulerEvent, zone)
      return `${fmt.days(first, last)}, ${labels.schedulerAllDay}`
    }
    return fmt.full(event.start, event.end)
  }

  const commit = (previous: SchedulerEvent, next: SchedulerEvent) => {
    if (+previous.start === +next.start && +previous.end === +next.end) return false
    if (eventsProp === undefined) setInnerEvents((all) => all.map((e) => (e.id === next.id ? next : e)))
    onEventChange?.(next, previous)
    return true
  }

  const slotOf = (sel: Pick<Selection, 'day' | 'from' | 'to' | 'allDay'>): SchedulerSlot =>
    sel.allDay
      ? { start: at(sel.day, 0, zone), end: at(sel.day + DAY_MS, 0, zone), allDay: true }
      : { start: at(sel.day, sel.from * slotMinutes, zone), end: at(sel.day, Math.min(1440, (sel.to + 1) * slotMinutes), zone), allDay: false }

  const pickSlot = (sel: Omit<Selection, 'draft' | 'anchor'>) => {
    const next = { ...sel, anchor: sel.from, draft: false }
    setSelection(next)
    const slot = slotOf(next)
    onSlotSelect?.(slot)
    announce(labels.schedulerSelected(slot.allDay ? `${fmt.dayLong(sel.day)}, ${labels.schedulerAllDay}` : fmt.full(slot.start, slot.end)))
    if (slotPopover) setPopover({ kind: 'slot' })
  }

  const openEvent = (event: SchedulerEvent) => {
    onEventOpen?.(event)
    if (eventPopover) setPopover({ kind: 'event', id: event.id })
  }

  const goToDay = (day: Day) => {
    setFocusState({ day, slot: focus.slot })
    setAnchor(day)
    if (views.includes('day')) setView('day')
  }

  /* ----- keyboard on events ----- */

  const keyOnEvent = (e: React.KeyboardEvent<HTMLElement>, event: SchedulerEvent, day: Day, inTimeGrid: boolean) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    if (e.key === 'Escape') {
      e.preventDefault()
      const slot = inTimeGrid && !event.allDay ? Math.floor((event.start < at(day, 0, zone) ? 0 : minutesOf(event.start, zone)) / slotMinutes) : -1
      setFocus({ day, slot }, true)
      return
    }
    if (!arrows.includes(e.key) || e.ctrlKey || e.metaKey) return
    if (!e.altKey) {
      if (e.shiftKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
      // ↑ ↓: the day's other events, in order.
      e.preventDefault()
      const list = [...(gridRef.current?.querySelectorAll<HTMLElement>('[data-nav-day]') ?? [])].filter((el) => el.dataset.navDay === String(day))
      const i = list.indexOf(e.currentTarget)
      list[i + (e.key === 'ArrowDown' ? 1 : -1)]?.focus()
      return
    }
    e.preventDefault()
    if (event.readOnly) return announce(labels.schedulerLocked(event.title))
    const vertical = e.key === 'ArrowUp' || e.key === 'ArrowDown'
    const sign = e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft') ? -1 : 1
    const timed = inTimeGrid && !event.allDay
    if (inTimeGrid && !timed && vertical) return
    let next: SchedulerEvent
    if (e.shiftKey) {
      // Alt Shift ↑ ↓: the end, a slot at a time, never shorter than one.
      if (!timed || !vertical) return
      const endDay = dayOfDate(event.end, zone)
      const end = at(endDay, minutesOf(event.end, zone) + sign * slotMinutes, zone)
      if (+end - +event.start < slotMinutes * MINUTE_MS) return
      next = { ...event, end }
      if (commit(event, next)) announce(labels.schedulerResized(event.title, whenOf(next)))
    } else {
      let start: Date
      if (timed && vertical) start = at(dayOfDate(event.start, zone), minutesOf(event.start, zone) + sign * slotMinutes, zone)
      else start = shiftDays(event.start, sign * (vertical ? 7 : 1), zone)
      const days = Math.round((dayOfDate(start, zone) - dayOfDate(event.start, zone)) / DAY_MS)
      const end = timed ? new Date(+start + (+event.end - +event.start)) : shiftDays(event.end, days, zone)
      next = { ...event, start, end }
      if (commit(event, next)) announce(labels.schedulerMoved(event.title, whenOf(next)))
      const newDay = dayOfDate(start, zone)
      if (!daysOf(view, anchor, weekStart).includes(newDay)) setAnchor(newDay)
    }
    pendingFocus.current = { id: event.id }
  }

  /* ----- pointer: drag and resize ----- */

  const drag = React.useRef<Drag | null>(null)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [dragKind, setDragKind] = React.useState<'move' | 'resize' | null>(null)
  const [dropTarget, setDropTarget] = React.useState<SchedulerContextValue['dropTarget']>(null)
  const [dropDay, setDropDay] = React.useState<Day | null>(null)
  const [resizeEnd, setResizeEnd] = React.useState<{ id: string; end: Date } | null>(null)
  const suppressClick = React.useRef(false)

  // The listeners live on window for the whole drag; they read the latest props through this.
  const latest = React.useRef({ zone, slotMinutes, slotHeight, commit, announce, whenOf, labels })
  latest.current = { zone, slotMinutes, slotHeight, commit, announce, whenOf, labels }

  /** The day under the pointer: a column in the time grid (x only), a cell in Month. */
  const dayAt = (x: number, y: number, mode: 'time' | 'day'): Day | null => {
    const grid = gridRef.current
    if (!grid) return null
    const columns = [...grid.querySelectorAll<HTMLElement>(mode === 'time' || grid.dataset.view !== 'month' ? '[data-column-day]' : '[data-cell]')]
    let best: { day: Day; d: number } | null = null
    for (const el of columns) {
      const r = el.getBoundingClientRect()
      const inX = x >= r.left && x < r.right
      const inY = grid.dataset.view !== 'month' || (y >= r.top && y < r.bottom)
      const day = Number(el.dataset.columnDay ?? el.dataset.day)
      if (inX && inY) return day
      // Off the grid: the nearest column (or cell).
      const d = Math.hypot(Math.max(r.left - x, 0, x - r.right), grid.dataset.view === 'month' ? Math.max(r.top - y, 0, y - r.bottom) : 0)
      if (!best || d < best.d) best = { day, d }
    }
    return best?.day ?? null
  }

  const endDrag = React.useRef<() => void>(() => {})

  const beginDrag: SchedulerContextValue['beginDrag'] = (e, init) => {
    if (e.button !== 0 || init.event.readOnly || drag.current) return
    const scroller = scrollerRef.current
    drag.current = {
      ...init,
      el: e.currentTarget,
      pointerId: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      scroll0: scroller?.scrollTop ?? 0,
      grabDay: dayAt(e.clientX, e.clientY, init.mode) ?? init.segment?.day ?? dayOfDate(init.event.start, zone),
      moved: false,
      target: null,
    }
    if (init.kind === 'resize') e.stopPropagation()

    const onMove = (ev: PointerEvent) => {
      const d = drag.current
      if (!d || ev.pointerId !== d.pointerId) return
      const { zone: tz, slotMinutes: mins, slotHeight: h } = latest.current
      const dx = ev.clientX - d.x0
      if (!d.moved) {
        if (Math.hypot(dx, ev.clientY - d.y0) < 4) return
        d.moved = true
        setDragId(d.event.id)
        setDragKind(d.kind)
        setPopover(null)
      }
      ev.preventDefault()
      // Near the scroller's top or bottom edge, it scrolls along.
      const sc = scrollerRef.current
      if (sc && d.mode === 'time') {
        const r = sc.getBoundingClientRect()
        if (ev.clientY < r.top + 40) sc.scrollTop -= 12
        else if (ev.clientY > r.bottom - 40) sc.scrollTop += 12
      }
      const dy = ev.clientY - d.y0 + ((sc?.scrollTop ?? 0) - d.scroll0)
      const ev0 = d.event
      if (d.kind === 'resize' && d.segment) {
        const s = d.segment
        const endMin = Math.min(1440, Math.max(s.startMin + mins, Math.round((s.endMin + (dy / h) * mins) / mins) * mins))
        const end = at(s.day, endMin, tz)
        if (!d.target || +d.target.end !== +end) {
          d.target = { start: ev0.start, end }
          setResizeEnd({ id: ev0.id, end })
        }
        return
      }
      d.el.style.transform = `translate(${dx}px, ${dy}px)`
      const day = dayAt(ev.clientX, ev.clientY, d.mode)
      if (day === null) return
      let start: Date
      let end: Date
      if (d.mode === 'time' && d.segment) {
        const s = d.segment
        const startMin = Math.min(1440 - mins, Math.max(0, Math.round((s.startMin + (dy / h) * mins) / mins) * mins))
        const days = Math.round((day - s.day) / DAY_MS)
        start = at(dayOfDate(ev0.start, tz) + days * DAY_MS, minutesOf(ev0.start, tz) + (startMin - s.startMin), tz)
        end = new Date(+start + (+ev0.end - +ev0.start))
        if (!d.target || +d.target.start !== +start) {
          d.target = { start, end }
          setDropTarget({ day, startMin, endMin: Math.min(1440, startMin + (s.endMin - s.startMin)), event: ev0 })
        }
      } else {
        const days = Math.round((day - d.grabDay) / DAY_MS)
        start = shiftDays(ev0.start, days, tz)
        end = ev0.allDay ? shiftDays(ev0.end, days, tz) : new Date(+start + (+ev0.end - +ev0.start))
        if (!d.target || +d.target.start !== +start) {
          d.target = { start, end }
          setDropDay(day)
        }
      }
    }

    const finish = (cancel: boolean) => {
      const d = drag.current
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey, true)
      drag.current = null
      if (!d || !d.moved) return
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 0)
      const { commit: save, announce: say, whenOf: when, labels: words } = latest.current
      if (d.kind === 'move') {
        // FLIP: from where the pointer left it to wherever it lands, or back.
        flips.current.set(d.event.id, d.el.getBoundingClientRect())
        d.el.style.transform = ''
      }
      if (!cancel && d.target) {
        const next = { ...d.event, start: d.target.start, end: d.target.end }
        if (save(d.event, next)) say((d.kind === 'move' ? words.schedulerMoved : words.schedulerResized)(d.event.title, when(next)))
      }
      pendingFocus.current = { id: d.event.id }
      setDragId(null)
      setDragKind(null)
      setDropTarget(null)
      setDropDay(null)
      setResizeEnd(null)
    }
    const onUp = (ev: PointerEvent) => ev.pointerId === drag.current?.pointerId && finish(false)
    const onCancel = (ev: PointerEvent) => ev.pointerId === drag.current?.pointerId && finish(true)
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || !drag.current?.moved) return
      ev.preventDefault()
      ev.stopPropagation()
      finish(true)
    }
    endDrag.current = () => finish(true)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKey, true)
  }
  React.useEffect(() => () => endDrag.current(), [])

  const clickSuppressed = () => suppressClick.current

  // Focus goes where the last key (or drop) asked, once the grid has re-rendered.
  React.useLayoutEffect(() => {
    const want = pendingFocus.current
    const grid = gridRef.current
    if (!want || !grid) return
    pendingFocus.current = null
    if (want === 'cell') grid.querySelector<HTMLElement>('[data-cell][tabindex="0"]')?.focus()
    else [...grid.querySelectorAll<HTMLElement>('[data-event-id]')].find((el) => el.dataset.eventId === want.id)?.focus({ preventScroll: drag.current !== null })
  })

  /* ----- popovers ----- */

  const popoverEvent = popover?.kind === 'event' ? events.find((e) => e.id === popover.id) : undefined
  const slot = selection && !selection.draft ? slotOf(selection) : null
  const anchorRef = React.useRef<{ getBoundingClientRect: () => DOMRect }>({
    getBoundingClientRect: () => {
      const grid = gridRef.current
      const p = popoverRef.current
      const el =
        p?.kind === 'event'
          ? [...(grid?.querySelectorAll<HTMLElement>('[data-event-id]') ?? [])].find((n) => n.dataset.eventId === p.id)
          : (grid?.querySelector<HTMLElement>('[data-slot="scheduler-selection"]') ?? grid?.querySelector<HTMLElement>('[aria-selected="true"]'))
      return el?.getBoundingClientRect() ?? ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) } as DOMRect)
    },
  })
  const popoverRef = React.useRef(popover)
  popoverRef.current = popover
  const closePopover = () => {
    const p = popover
    setPopover(null)
    if (p?.kind === 'slot') {
      setSelection(null)
      pendingFocus.current = 'cell'
    } else if (p?.kind === 'event') pendingFocus.current = { id: p.id }
  }
  const popoverOpen = (popover?.kind === 'event' && !!popoverEvent && !!eventPopover) || (popover?.kind === 'slot' && !!slot && !!slotPopover)

  const value: SchedulerContextValue = {
    labels,
    fmt,
    tz: zone,
    view,
    views,
    setView,
    anchor,
    setAnchor,
    weekStart,
    weekend: week.weekend,
    today,
    now,
    events: resizeEnd ? events.map((e) => (e.id === resizeEnd.id ? { ...e, end: resizeEnd.end } : e)) : events,
    availability,
    slotMinutes,
    slotHeight,
    workingHours,
    focus,
    setFocus,
    selection,
    setSelection,
    pickSlot,
    dragId,
    dragKind,
    dropTarget,
    dropDay,
    resizeEnd,
    beginDrag,
    clickSuppressed,
    openEvent,
    keyOnEvent,
    flips,
    gridRef,
    scrollerRef,
    popover,
    hintId,
    dayHintId,
    container,
    goToDay,
    announce,
  }

  return (
    <SchedulerContext.Provider value={value}>
      <div
        {...props}
        data-slot="scheduler"
        data-view={view}
        className={cn('flex h-150 min-h-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-card text-text-default', className)}
      >
        {children}
        <span id={hintId} hidden>
          {labels.schedulerMoveHint}
        </span>
        <span id={dayHintId} hidden>
          {labels.sortableHint}
        </span>
        <span role="status" className="sr-only">
          {message}
        </span>
      </div>
      <PopoverPrimitive.Root open={popoverOpen} onOpenChange={(open) => !open && closePopover()}>
        <PopoverPrimitive.Anchor virtualRef={anchorRef} />
        <PopoverPrimitive.Portal container={container}>
          <PopoverPrimitive.Content
            asChild
            // Beside an event or a pick; under it in Day, where a slot spans the whole width.
            side={view === 'day' ? 'bottom' : 'right'}
            align="start"
            sideOffset={8}
            collisionPadding={8}
            // The panel takes focus, so it's read out by its title and no avatar's tooltip pops up.
            onOpenAutoFocus={(e) => {
              e.preventDefault()
              ;(e.currentTarget as HTMLElement | null)?.focus()
            }}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {popoverEvent && popover?.kind === 'event' ? (
              <PopoverPanel
                data-slot="scheduler-popover"
                title={popoverEvent.title}
                description={whenOf(popoverEvent)}
                onClose={closePopover}
                className={popoverClass}
                body={
                  <>
                    <EventFacts event={popoverEvent} labels={labels} fmt={fmt} />
                    {eventPopover?.(popoverEvent, closePopover)}
                  </>
                }
              />
            ) : slot ? (
              <PopoverPanel
                data-slot="scheduler-popover"
                title={labels.schedulerNewEvent}
                description={slot.allDay ? `${fmt.dayLong(dayOfDate(slot.start, zone))}, ${labels.schedulerAllDay}` : fmt.full(slot.start, slot.end)}
                onClose={closePopover}
                className={popoverClass}
                body={slotPopover?.(slot, closePopover)}
              />
            ) : (
              <span />
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </SchedulerContext.Provider>
  )
}

const popoverClass = cn(
  'pointer-events-auto z-50 origin-(--radix-popover-content-transform-origin) focus-visible:outline-none',
  'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
)

/** Attendees and the read-only mark, for the hover card and the popover. */
function EventFacts({ event, labels, fmt }: { event: SchedulerEvent; labels: Labels; fmt: Formats }) {
  if (!event.attendees?.length && !event.readOnly) return null
  return (
    <div className="flex items-center gap-2">
      {event.attendees?.length ? (
        <AvatarGroup aria-label={labels.schedulerWith(fmt.names(event.attendees.map((a) => a.name)))}>
          {event.attendees.map((a) => (
            <Avatar key={a.name} size={24} name={a.name} initials={a.initials ?? initialsOf(a.name)} tone={a.tone ?? 'neutral'} />
          ))}
        </AvatarGroup>
      ) : null}
      {event.readOnly && (
        <Badge size="sm" className="ms-auto">
          <LockIcon />
          {labels.schedulerReadOnly}
        </Badge>
      )}
    </div>
  )
}

/* ---------- toolbar ---------- */

export interface SchedulerToolbarProps extends React.ComponentProps<'div'> {}

/**
 * Today, ‹ ›, the period (a button that opens a DatePickerPanel) and the view switch. `children`
 * go before the switch (a "New event" button, a filter). Other props, `ref` included, go to its `div`.
 */
export function SchedulerToolbar({ className, children, ...props }: SchedulerToolbarProps) {
  const s = useScheduler('SchedulerToolbar')
  const { labels, view, fmt } = s
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const days = daysOf(view, s.anchor, s.weekStart)
  const title = fmt.title(view, view === 'month' ? days.slice(7, 14) : days, s.anchor)
  const viewLabel: Record<SchedulerView, string> = { day: labels.schedulerDay, week: labels.schedulerWeek, month: labels.schedulerMonth }
  // The new period is read out: focus stays on the button that changed it.
  const go = (day: Day) => {
    s.setAnchor(day)
    s.announce(fmt.title(view, view === 'month' ? daysOf(view, day, s.weekStart).slice(7, 14) : daysOf(view, day, s.weekStart), day))
  }
  const nav = (dir: -1 | 1) => {
    const label = dir < 0 ? labels.schedulerPrevious(view) : labels.schedulerNext(view)
    return (
      <Tooltip label={label}>
        <Button variant="tertiary" iconOnly aria-label={label} onClick={() => go(step(view, s.anchor, dir))}>
          {/* Mirrored right to left, where earlier is to the right. */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="rtl:-scale-x-100">
            <path d={dir < 0 ? 'M15 6L9 12L15 18' : 'M9 6L15 12L9 18'} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      </Tooltip>
    )
  }
  return (
    <div {...props} data-slot="scheduler-toolbar" className={cn('flex flex-wrap items-center gap-2 border-b border-border-subtle px-3 py-2', className)}>
      <Button variant="secondary" onClick={() => s.today !== null && go(s.today)}>
        {labels.schedulerToday}
      </Button>
      <div className="flex items-center gap-0.5">
        {nav(-1)}
        {nav(1)}
      </div>
      <PopoverPrimitive.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <Tooltip label={labels.pickDate}>
          <PopoverPrimitive.Trigger asChild>
            <Button variant="tertiary" className="min-w-0 px-2 text-base">
              <span className="truncate">{title}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="text-text-muted">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </PopoverPrimitive.Trigger>
        </Tooltip>
        <PopoverPrimitive.Portal container={s.container}>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            collisionPadding={8}
            data-slot="scheduler-date-picker"
            aria-label={labels.pickDate}
            className="z-50 origin-(--radix-popover-content-transform-origin) outline-none data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]"
          >
            <DatePickerPanel
              value={toLocal(s.anchor)}
              today={s.today !== null ? toLocal(s.today) : undefined}
              weekStartsOn={s.weekStart}
              onValueChange={(d) => {
                go(fromLocal(d))
                setPickerOpen(false)
              }}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      <span className="flex-1" />
      {children}
      {s.views.length > 1 && (
        <SegmentedControl
          aria-label={labels.schedulerView}
          value={view}
          onValueChange={(v) => s.setView(v as SchedulerView)}
          items={s.views.map((v) => ({ value: v, label: viewLabel[v] }))}
        />
      )}
    </div>
  )
}

/* ---------- the grid ---------- */

export interface SchedulerGridProps extends React.ComponentProps<'div'> {}

/**
 * The current view: day and week as a time grid, month as day cells. A new view crossfades in.
 * Other props, `ref` included, go to the `div` that holds it.
 */
export function SchedulerGrid({ className, ...props }: SchedulerGridProps) {
  const s = useScheduler('SchedulerGrid')
  // The view on show, and the one fading out under it.
  const [shown, setShown] = React.useState({ view: s.view, key: 0 })
  const [leaving, setLeaving] = React.useState<{ view: SchedulerView; key: number } | null>(null)
  if (shown.view !== s.view) {
    setLeaving(prefersReducedMotion() ? null : shown)
    setShown({ view: s.view, key: shown.key + 1 })
  }
  React.useEffect(() => {
    if (!leaving) return
    // animationend clears it; this is for when no animation runs.
    const timer = setTimeout(() => setLeaving(null), 300)
    return () => clearTimeout(timer)
  }, [leaving])

  const render = (view: SchedulerView, live: boolean) => (view === 'month' ? <MonthGrid live={live} /> : <TimeGrid view={view} live={live} />)
  return (
    <div {...props} data-slot="scheduler-grid" className={cn('relative min-h-0 flex-1', className)}>
      {leaving && (
        <div
          key={leaving.key}
          data-leaving=""
          aria-hidden
          inert
          className="satin-scheduler-view absolute inset-0"
          onAnimationEnd={(e) => e.target === e.currentTarget && setLeaving(null)}
        >
          {render(leaving.view, false)}
        </div>
      )}
      <div key={shown.key} data-entering={shown.key > 0 ? '' : undefined} className="satin-scheduler-view absolute inset-0">
        {render(shown.view, true)}
      </div>
    </div>
  )
}

/* ---------- day and week ---------- */

function TimeGrid({ view, live }: { view: SchedulerView; live: boolean }) {
  const s = useScheduler('SchedulerGrid')
  const { fmt, labels, tz, slotMinutes, slotHeight } = s
  const days = daysOf(view, s.anchor, s.weekStart)
  const rows = Math.ceil(1440 / slotMinutes)
  const ownScroller = React.useRef<HTMLDivElement | null>(null)
  const ownGrid = React.useRef<HTMLDivElement | null>(null)
  const bodyRef = React.useRef<HTMLDivElement | null>(null)
  const columns = `56px repeat(${days.length}, minmax(${days.length > 1 ? 72 : 200}px, 1fr))`

  const daysKey = days.join()
  const segments = React.useMemo(() => new Map(days.map((d) => [d, segmentsOf(s.events, d, tz)])), [s.events, daysKey, tz])
  const spans = React.useMemo(() => spansOf(s.events, days, tz), [s.events, daysKey, tz])
  const lanes = spans.reduce((n, sp) => Math.max(n, sp.lane + 1), 0)
  const free = React.useMemo(() => new Map(days.map((d) => [d, availabilityOf(s.availability, d, tz)])), [s.availability, daysKey, tz])
  const slotRanges = React.useMemo(() => Array.from({ length: rows }, (_, i) => fmt.wallRange(i * slotMinutes, Math.min(1440, (i + 1) * slotMinutes))), [fmt, rows, slotMinutes])
  const nowMin = s.now ? minutesOf(s.now, tz) : 0

  // Scroll to the working day (or the first event before it) when the view opens.
  React.useLayoutEffect(() => {
    const sc = ownScroller.current
    if (!sc) return
    let first = s.workingHours[0] * 60
    for (const list of segments.values()) for (const seg of list) first = Math.min(first, seg.startMin)
    sc.scrollTop = Math.max(0, Math.floor(first / slotMinutes) * slotHeight - 8)
  }, [])

  const register = (node: HTMLDivElement | null, ref: React.RefObject<HTMLDivElement | null>, own: React.RefObject<HTMLDivElement | null>) => {
    own.current = node
    if (live) ref.current = node
  }

  /* pointer: press and drag over empty slots to pick them */
  const picking = React.useRef<{ day: Day; anchor: number; pointerId: number } | null>(null)
  const slotAtY = (y: number) => {
    const body = bodyRef.current
    if (!body) return 0
    return Math.min(rows - 1, Math.max(0, Math.floor((y - body.getBoundingClientRect().top) / slotHeight)))
  }
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]')
    if (!cell || e.button !== 0 || e.pointerType === 'touch' || (e.target as HTMLElement).closest('[data-event-id]')) return
    const day = Number(cell.dataset.day)
    const slot = Number(cell.dataset.slotIndex)
    s.setFocus({ day, slot })
    if (slot < 0) return
    e.preventDefault()
    cell.focus({ preventScroll: true })
    picking.current = { day, anchor: slot, pointerId: e.pointerId }
    s.setSelection({ day, from: slot, to: slot, anchor: slot, allDay: false, draft: true })
    const onMove = (ev: PointerEvent) => {
      const p = picking.current
      if (!p || ev.pointerId !== p.pointerId) return
      const cur = slotAtY(ev.clientY)
      s.setSelection({ day: p.day, from: Math.min(p.anchor, cur), to: Math.max(p.anchor, cur), anchor: p.anchor, allDay: false, draft: true })
    }
    const onUp = (ev: PointerEvent) => {
      const p = picking.current
      if (!p || ev.pointerId !== p.pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      picking.current = null
      const cur = slotAtY(ev.clientY)
      s.pickSlot({ day: p.day, from: Math.min(p.anchor, cur), to: Math.max(p.anchor, cur), allDay: false })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  // Touch, and the all-day row: a tap or click picks one.
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]')
    if (!cell || (e.target as HTMLElement).closest('[data-event-id]')) return
    const day = Number(cell.dataset.day)
    const slot = Number(cell.dataset.slotIndex)
    if (slot >= 0 && (e.nativeEvent as PointerEvent).pointerType !== 'touch') return
    s.setFocus({ day, slot })
    s.pickSlot({ day, from: Math.max(0, slot), to: Math.max(0, slot), allDay: slot < 0 })
  }

  /* keyboard on the grid */
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const cell = e.target as HTMLElement
    if (!cell.dataset || cell.dataset.cell === undefined) return
    const { day, slot } = s.focus
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const i = days.indexOf(day)
    const go = (next: Focus) => {
      e.preventDefault()
      s.setFocus(next, true)
    }
    const sel = s.selection
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        const dir = e.key === 'ArrowUp' ? -1 : 1
        const next = Math.min(rows - 1, Math.max(-1, slot + dir))
        if (e.shiftKey && slot >= 0 && next >= 0) {
          // Shift: stretch a pick from where it started.
          const anchor = sel?.draft && sel.day === day ? sel.anchor : slot
          s.setSelection({ day, from: Math.min(anchor, next), to: Math.max(anchor, next), anchor, allDay: false, draft: true })
        } else if (!e.shiftKey && sel?.draft) s.setSelection(null)
        return go({ day, slot: next })
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        const dir = (e.key === 'ArrowLeft' ? -1 : 1) * (rtl ? -1 : 1)
        return go({ day: day + dir * DAY_MS, slot })
      }
      case 'Home':
        return go({ day: days[0], slot: e.ctrlKey ? -1 : slot })
      case 'End':
        return go({ day: days[days.length - 1], slot: e.ctrlKey ? rows - 1 : slot })
      case 'PageUp':
      case 'PageDown': {
        const dir = e.key === 'PageUp' ? -1 : 1
        e.preventDefault()
        const next = view === 'week' ? day + dir * 7 * DAY_MS : day + dir * DAY_MS
        s.setFocus({ day: next, slot }, true)
        return
      }
      case 'Enter':
      case ' ': {
        e.preventDefault()
        if (sel?.draft && sel.day === day && slot >= sel.from && slot <= sel.to) return s.pickSlot({ day, from: sel.from, to: sel.to, allDay: false })
        if (!e.shiftKey) {
          // On an event's slot: to the event.
          const covering = slot < 0 ? spans.filter((sp) => i >= sp.first && i <= sp.last).map((sp) => sp.event) : (segments.get(day) ?? []).filter((g) => g.startMin < (slot + 1) * slotMinutes && g.endMin > slot * slotMinutes).map((g) => g.event)
          const target = covering[0]
          if (target) {
            const el = [...(ownGrid.current?.querySelectorAll<HTMLElement>('[data-event-id]') ?? [])].find((n) => n.dataset.eventId === target.id && n.dataset.navDay === String(day))
            el?.focus()
            return
          }
        }
        return s.pickSlot({ day, from: Math.max(0, slot), to: Math.max(0, slot), allDay: slot < 0 })
      }
      case 'Escape':
        if (sel) {
          e.preventDefault()
          s.setSelection(null)
        }
        return
    }
  }

  const middle = at(s.anchor, 720, tz)
  const gridName = labels.schedulerGrid(fmt.title(view, days, s.anchor), fmt.zoneLong(middle))
  const sel = s.selection && !s.selection.allDay ? s.selection : null
  const drop = s.dropTarget && s.dragKind === 'move' && !s.dropTarget.event.allDay ? s.dropTarget : null
  const isOff = (day: Day, startMin: number) => s.weekend.includes(weekdayOf(day)) || startMin < s.workingHours[0] * 60 || startMin >= s.workingHours[1] * 60

  return (
    <div
      ref={(n) => {
        register(n, s.scrollerRef, ownScroller)
      }}
      className="h-full overflow-auto overscroll-contain"
    >
      <div
        ref={(n) => {
          register(n, s.gridRef, ownGrid)
        }}
        role="grid"
        aria-label={gridName}
        aria-multiselectable
        data-view={view}
        data-dragging={s.dragId && s.dragKind === 'move' ? '' : undefined}
        data-resizing={s.dragId && s.dragKind === 'resize' ? '' : undefined}
        className="satin-scheduler-grid relative min-w-fit text-text-default"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        {/* Day headers and the all-day row stay on top while the hours scroll. */}
        <div role="rowgroup" className="sticky top-0 z-[6] bg-bg-card">
          <div role="row" className="grid border-b border-border-subtle" style={{ gridTemplateColumns: columns }}>
            <div role="columnheader" aria-label={fmt.zoneLong(middle)} className="sticky start-0 z-[1] flex items-end justify-end bg-bg-card pe-2 pb-1 text-2xs text-text-muted">
              {fmt.zoneShort(middle)}
            </div>
            {days.map((day) => {
              const today = day === s.today
              return (
                <div
                  key={day}
                  role="columnheader"
                  aria-current={today ? 'date' : undefined}
                  data-column-day={day}
                  className="flex h-11 items-center justify-center gap-1.5 border-s border-border-subtle text-sm"
                >
                  <span aria-hidden className={cn('text-xs', today ? 'text-text-default' : 'text-text-muted')}>
                    {fmt.weekdayShort(day)}
                  </span>
                  <span
                    aria-hidden
                    className={cn('grid h-6 min-w-6 place-items-center rounded-full px-1 font-medium tabular-nums', today ? 'bg-action-primary-bg text-text-on-solid' : 'text-text-default')}
                  >
                    {fmt.dayNumber(day)}
                  </span>
                  <span className="sr-only">{fmt.dayLong(day)}</span>
                </div>
              )
            })}
          </div>
          <div role="row" className="grid border-b border-border-subtle" style={{ gridTemplateColumns: columns }}>
            <div role="rowheader" className="sticky start-0 z-[1] flex items-start justify-end bg-bg-card pe-2 pt-1.5 text-2xs text-text-muted">
              {labels.schedulerAllDay}
            </div>
            {days.map((day, i) => {
              const here = spans.filter((sp) => sp.first === i)
              const covering = spans.filter((sp) => i >= sp.first && i <= sp.last)
              const focused = live && s.focus.day === day && s.focus.slot === -1
              const selected = s.selection?.allDay && s.selection.day === day && !s.selection.draft
              return (
                <div
                  key={day}
                  role="gridcell"
                  tabIndex={focused ? 0 : -1}
                  data-cell=""
                  data-day={day}
                  data-slot-index={-1}
                  data-off={s.weekend.includes(weekdayOf(day)) ? '' : undefined}
                  data-drop={s.dropDay === day && s.dragKind === 'move' ? '' : undefined}
                  aria-selected={selected || undefined}
                  aria-label={[`${fmt.dayLong(day)}, ${labels.schedulerAllDay}`, ...covering.map((sp) => sp.event.title)].join(', ')}
                  className="satin-scheduler-cell"
                  style={{ height: Math.max(1, lanes) * ALL_DAY_LANE + 6 }}
                  onFocus={() => live && s.setFocus({ day, slot: -1 })}
                >
                  {selected && <span data-slot="scheduler-selection" className="satin-scheduler-selection inset-x-0.5 inset-y-0.5" />}
                  {here.map((sp) => (
                    <EventItem
                      key={sp.event.id}
                      event={sp.event}
                      day={day}
                      inTimeGrid
                      className="absolute start-0.5"
                      style={{ top: sp.lane * ALL_DAY_LANE + 3, width: `calc(${(sp.last - sp.first + 1) * 100}% - 4px)` }}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        <div role="rowgroup" ref={bodyRef}>
          {Array.from({ length: rows }, (_, slot) => {
            const startMin = slot * slotMinutes
            const onHour = startMin % 60 === 0
            return (
              <div key={slot} role="row" className="grid" style={{ gridTemplateColumns: columns, height: slotHeight }}>
                <div role="rowheader" className="sticky start-0 z-[5] bg-bg-card">
                  <span className={onHour && slot > 0 ? 'absolute end-2 -top-2 text-2xs text-text-muted tabular-nums' : 'sr-only'}>{onHour && slot > 0 ? fmt.hour(startMin) : fmt.wallTime(startMin)}</span>
                </div>
                {days.map((day) => {
                  const daySegments = segments.get(day) ?? []
                  const starting = daySegments.filter((g) => Math.min(rows - 1, Math.floor(g.startMin / slotMinutes)) === slot)
                  const endMin = startMin + slotMinutes
                  const covering = daySegments.filter((g) => g.startMin < endMin && g.endMin > startMin)
                  const status = (free.get(day) ?? []).find((a) => a.startMin < endMin && a.endMin > startMin)?.status
                  const focused = live && s.focus.day === day && s.focus.slot === slot
                  const inSel = sel && sel.day === day && slot >= sel.from && slot <= sel.to
                  const isNow = s.now && day === s.today && Math.floor(nowMin / slotMinutes) === slot
                  return (
                    <div
                      key={day}
                      role="gridcell"
                      tabIndex={focused ? 0 : -1}
                      data-cell=""
                      data-day={day}
                      data-slot-index={slot}
                      data-hour={onHour && slot > 0 ? '' : undefined}
                      data-off={isOff(day, startMin) ? '' : undefined}
                      data-availability={status}
                      aria-selected={inSel && !sel.draft ? true : undefined}
                      aria-label={[
                        `${fmt.dayLong(day)}, ${slotRanges[slot]}`,
                        status && (status === 'busy' ? labels.schedulerBusy : labels.schedulerFree),
                        ...covering.map((g) => g.event.title),
                      ]
                        .filter(Boolean)
                        .join(', ')}
                      className="satin-scheduler-cell"
                      onFocus={() => live && s.setFocus({ day, slot })}
                    >
                      {sel && sel.day === day && sel.from === slot && (
                        <span
                          data-slot="scheduler-selection"
                          data-draft={sel.draft ? '' : undefined}
                          className="satin-scheduler-selection start-0.5 end-2"
                          style={{ top: 1, height: (sel.to - sel.from + 1) * slotHeight - 2 }}
                        >
                          {(sel.to - sel.from + 1) * slotHeight >= 20 && fmt.wallRange(sel.from * slotMinutes, Math.min(1440, (sel.to + 1) * slotMinutes))}
                        </span>
                      )}
                      {starting.map((g) => (
                        <TimedEvent key={g.event.id} segment={g} />
                      ))}
                      {drop && drop.day === day && Math.floor(drop.startMin / slotMinutes) === slot && (
                        <span
                          aria-hidden
                          data-tone={drop.event.tone ?? 'brand'}
                          className="satin-scheduler-drop start-0.5 end-2"
                          style={{ top: ((drop.startMin % slotMinutes) / slotMinutes) * slotHeight + 1, height: Math.max(16, ((drop.endMin - drop.startMin) / slotMinutes) * slotHeight - 2) }}
                        >
                          {fmt.wallRange(drop.startMin, drop.endMin)}
                        </span>
                      )}
                      {isNow && <span aria-hidden data-slot="scheduler-now" className="satin-scheduler-now" style={{ top: ((nowMin % slotMinutes) / slotMinutes) * slotHeight }} />}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** A timed event in the day and week grid, laid out in its start slot and running down. */
function TimedEvent({ segment }: { segment: Segment }) {
  const s = useScheduler('SchedulerGrid')
  const { slotMinutes, slotHeight } = s
  const { event, startMin, endMin, col, cols } = segment
  const top = ((startMin % slotMinutes) / slotMinutes) * slotHeight + 1
  const height = Math.max(16, ((endMin - startMin) / slotMinutes) * slotHeight - 2)
  // 8px stays free at the column's end, so the slot under a long event can still be picked.
  const style: React.CSSProperties = {
    top,
    height,
    insetInlineStart: `calc((100% - 8px) * ${col} / ${cols})`,
    width: `calc((100% - 8px) / ${cols} - 2px)`,
  }
  return <EventItem event={event} day={segment.day} segment={segment} inTimeGrid style={style} height={height} />
}

/* ---------- one event ---------- */

function EventItem({
  event,
  day,
  segment,
  inTimeGrid,
  height = 0,
  className,
  style,
}: {
  event: SchedulerEvent
  day: Day
  segment?: Segment
  inTimeGrid: boolean
  height?: number
  className?: string
  style?: React.CSSProperties
}) {
  const s = useScheduler('SchedulerGrid')
  const { labels, fmt } = s
  const ref = React.useRef<HTMLButtonElement>(null)
  const [hover, setHover] = React.useState(false)
  const pointerOver = React.useRef(false)
  const timed = !!segment
  const tone = event.tone ?? 'brand'
  const dragging = s.dragId === event.id
  const descId = React.useId()
  const when = event.allDay ? `${fmt.days(...spanOf(event, s.tz))}, ${labels.schedulerAllDay}` : fmt.full(event.start, event.end)
  const names = event.attendees?.map((a) => a.name) ?? []

  // Settles from where the pointer let go into its slot (or back where it was).
  React.useLayoutEffect(() => {
    const el = ref.current
    const from = s.flips.current.get(event.id)
    if (!el || !from) return
    s.flips.current.delete(event.id)
    const to = el.getBoundingClientRect()
    const dx = from.left - to.left
    const dy = from.top - to.top
    if (!dx && !dy) return
    el.style.transition = 'none'
    el.style.transform = `translate(${dx}px, ${dy}px)`
    el.getBoundingClientRect()
    el.style.transition = 'transform var(--duration-base) var(--ease-out)'
    el.style.transform = ''
    const done = () => (el.style.transition = '')
    el.addEventListener('transitionend', done, { once: true })
  })

  const button = (
    <button
      ref={ref}
      type="button"
      tabIndex={-1}
      data-slot="scheduler-event"
      data-event-id={event.id}
      data-nav-day={day}
      data-tone={tone}
      data-readonly={event.readOnly ? '' : undefined}
      data-allday={timed ? undefined : ''}
      data-dragging={dragging ? '' : undefined}
      aria-label={labels.schedulerEvent(event.title, when)}
      aria-describedby={[names.length ? descId : '', event.readOnly ? '' : timed ? s.hintId : s.dayHintId].filter(Boolean).join(' ') || undefined}
      className={cn(timed ? 'satin-scheduler-event' : 'satin-scheduler-item', className)}
      style={style}
      onPointerEnter={() => (pointerOver.current = true)}
      onPointerLeave={() => {
        pointerOver.current = false
        setHover(false)
      }}
      onPointerDown={(e) => {
        setHover(false)
        s.beginDrag(e, { event, kind: 'move', mode: timed ? 'time' : 'day', segment })
      }}
      onClick={(e) => {
        if (s.clickSuppressed()) return e.preventDefault()
        s.openEvent(event)
      }}
      onKeyDown={(e) => s.keyOnEvent(e, event, day, inTimeGrid)}
    >
      {names.length > 0 && (
        <span id={descId} hidden>
          {labels.schedulerWith(fmt.names(names))}
        </span>
      )}
      {timed ? (
        <>
          <span className="flex min-w-0 items-center gap-1 font-medium">
            {event.readOnly && <LockIcon />}
            <span className={cn('min-w-0', height >= 64 ? 'line-clamp-2' : 'truncate')}>{event.title}</span>
          </span>
          {height >= 36 && <span className="truncate tabular-nums">{fmt.time(event.start, event.end)}</span>}
          {height >= 72 && names.length > 0 && (
            <span aria-hidden className="mt-auto flex pb-1">
              {event.attendees!.map((a, i) => (
                <Avatar key={a.name} size={16} initials={a.initials ?? initialsOf(a.name)} tone={a.tone ?? 'neutral'} className={cn('[box-shadow:0_0_0_1px_var(--bg-card)]', i > 0 && '-ms-1')} />
              ))}
            </span>
          )}
          {!event.readOnly && !segment!.after && (
            <span
              aria-hidden
              className="satin-scheduler-resize"
              onPointerDown={(e) => {
                setHover(false)
                s.beginDrag(e, { event, kind: 'resize', mode: 'time', segment })
              }}
            />
          )}
        </>
      ) : event.allDay ? (
        <>
          {event.readOnly && <LockIcon />}
          <span className="truncate">{event.title}</span>
        </>
      ) : (
        <>
          <Dot data-tone={tone} className="-mx-1" />
          <span data-time="" className="shrink-0 text-text-muted tabular-nums">
            {fmt.startTime(event.start)}
          </span>
          <span className="min-w-0 truncate">{event.title}</span>
          {event.readOnly && <LockIcon />}
        </>
      )}
    </button>
  )

  // A preview on hover (not on focus: the name already says it all, and arrowing through a
  // dense grid would flash a card at every step).
  const blocked = s.dragId !== null || (s.popover?.kind === 'event' && s.popover.id === event.id)
  return (
    <HoverCard
      trigger={button}
      open={hover && !blocked}
      onOpenChange={(open) => setHover(open && pointerOver.current)}
      side={timed ? 'right' : 'bottom'}
      container={s.container}
      className="w-72 gap-2 p-3"
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-sm leading-[18px] font-medium text-text-default">{event.title}</p>
        <p className="text-sm text-text-muted">{when}</p>
      </div>
      <EventFacts event={event} labels={labels} fmt={fmt} />
    </HoverCard>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M16 12H17.4C17.7314 12 18 12.2686 18 12.6V19.4C18 19.7314 17.7314 20 17.4 20H6.6C6.26863 20 6 19.7314 6 19.4V12.6C6 12.2686 6.26863 12 6.6 12H8M16 12V8C16 6.66667 15.2 4 12 4C8.8 4 8 6.66667 8 8V12M16 12H8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ---------- month ---------- */

function MonthGrid({ live }: { live: boolean }) {
  const s = useScheduler('SchedulerGrid')
  const { fmt, labels, tz } = s
  const days = daysOf('month', s.anchor, s.weekStart)
  const month = new Date(s.anchor).getUTCMonth()
  const ownGrid = React.useRef<HTMLDivElement | null>(null)
  const daysKey = days.join()

  // Each day's events: all-day first, then by start.
  const byDay = React.useMemo(() => {
    const map = new Map<Day, SchedulerEvent[]>(days.map((d) => [d, []]))
    for (const event of s.events) {
      const [first, last] = spanOf(event, tz)
      for (let d = Math.max(first, days[0]); d <= Math.min(last, days[days.length - 1]); d += DAY_MS) map.get(d)?.push(event)
    }
    for (const list of map.values()) list.sort((a, b) => Number(!!b.allDay) - Number(!!a.allDay) || +a.start - +b.start)
    return map
  }, [s.events, daysKey, tz])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const cell = e.target as HTMLElement
    if (!cell.dataset || cell.dataset.cell === undefined) return
    const day = s.focus.day
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const go = (next: Day) => {
      e.preventDefault()
      s.setFocus({ day: next, slot: s.focus.slot }, true)
    }
    const offset = (weekdayOf(day) - s.weekStart + 7) % 7
    switch (e.key) {
      case 'ArrowLeft':
        return go(day + (rtl ? 1 : -1) * DAY_MS)
      case 'ArrowRight':
        return go(day + (rtl ? -1 : 1) * DAY_MS)
      case 'ArrowUp':
        return go(day - 7 * DAY_MS)
      case 'ArrowDown':
        return go(day + 7 * DAY_MS)
      case 'Home':
        return go(day - offset * DAY_MS)
      case 'End':
        return go(day + (6 - offset) * DAY_MS)
      case 'PageUp':
        return go(addMonths(day, -1))
      case 'PageDown':
        return go(addMonths(day, 1))
      case 'Enter':
      case ' ': {
        e.preventDefault()
        const first = !e.shiftKey && (byDay.get(day) ?? [])[0]
        if (first) {
          ;[...(ownGrid.current?.querySelectorAll<HTMLElement>('[data-nav-day]') ?? [])].find((n) => n.dataset.navDay === String(day))?.focus()
          return
        }
        return s.pickSlot({ day, from: 0, to: 0, allDay: true })
      }
      case 'Escape':
        if (s.selection) {
          e.preventDefault()
          s.setSelection(null)
        }
        return
    }
  }

  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7))
  return (
    <div
      ref={(n) => {
        if (live) s.scrollerRef.current = n
      }}
      className="h-full overflow-auto overscroll-contain"
    >
      <div
        ref={(n) => {
          ownGrid.current = n
          if (live) s.gridRef.current = n
        }}
        role="grid"
        aria-label={labels.schedulerGrid(fmt.title('month', days, s.anchor), fmt.zoneLong(at(s.anchor, 720, tz)))}
        data-view="month"
        data-dragging={s.dragId ? '' : undefined}
        className="satin-scheduler-grid grid h-full min-w-[560px] grid-rows-[auto_repeat(6,minmax(96px,1fr))] text-text-default"
        onKeyDown={onKeyDown}
        onClick={(e) => {
          const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]')
          if (!cell || (e.target as HTMLElement).closest('button')) return
          const day = Number(cell.dataset.day)
          s.setFocus({ day, slot: s.focus.slot })
          s.pickSlot({ day, from: 0, to: 0, allDay: true })
        }}
      >
        <div role="row" className="grid grid-cols-7">
          {days.slice(0, 7).map((day) => (
            <div key={day} role="columnheader" aria-label={fmt.weekdayLong(day)} className="py-1.5 text-center text-xs text-text-muted">
              {fmt.weekdayShort(day)}
            </div>
          ))}
        </div>
        {weeks.map((week, w) => (
          <div key={w} role="row" className="grid min-h-0 grid-cols-7">
            {week.map((day) => {
              const list = byDay.get(day) ?? []
              const shown = list.length > MONTH_ROWS ? list.slice(0, MONTH_ROWS - 1) : list
              const more = list.length - shown.length
              const today = day === s.today
              const focused = live && s.focus.day === day
              return (
                <div
                  key={day}
                  role="gridcell"
                  tabIndex={focused ? 0 : -1}
                  data-cell=""
                  data-day={day}
                  data-outside={new Date(day).getUTCMonth() !== month ? '' : undefined}
                  data-off={s.weekend.includes(weekdayOf(day)) ? '' : undefined}
                  data-drop={s.dropDay === day ? '' : undefined}
                  aria-current={today ? 'date' : undefined}
                  aria-selected={s.selection?.allDay && s.selection.day === day && !s.selection.draft ? true : undefined}
                  aria-label={[fmt.dayLong(day), list.length ? labels.schedulerEventCount(list.length) : ''].filter(Boolean).join(', ')}
                  className="satin-scheduler-day"
                  onFocus={() => live && s.setFocus({ day, slot: s.focus.slot })}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid h-6 min-w-6 place-items-center self-start rounded-full px-1 text-sm font-medium tabular-nums',
                      today ? 'bg-action-primary-bg text-text-on-solid' : new Date(day).getUTCMonth() !== month ? 'text-text-muted' : 'text-text-default',
                    )}
                  >
                    {fmt.dayNumber(day)}
                  </span>
                  {shown.map((event) => (
                    <EventItem key={event.id} event={event} day={day} inTimeGrid={false} />
                  ))}
                  {more > 0 && (
                    <HoverCard
                      container={s.container}
                      side="bottom"
                      className="w-64 gap-1 p-2"
                      trigger={
                        <button
                          type="button"
                          tabIndex={-1}
                          data-nav-day={day}
                          className="flex h-5 shrink-0 items-center rounded-sm px-1 text-start text-xs font-medium text-text-muted satin-hover:bg-bg-hover satin-hover:text-text-default focus-visible:outline-none satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]"
                          onClick={() => s.goToDay(day)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              s.setFocus({ day, slot: s.focus.slot }, true)
                            } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.altKey) {
                              e.preventDefault()
                              const list = [...(ownGrid.current?.querySelectorAll<HTMLElement>('[data-nav-day]') ?? [])].filter((n) => n.dataset.navDay === String(day))
                              list[list.indexOf(e.currentTarget) + (e.key === 'ArrowDown' ? 1 : -1)]?.focus()
                            }
                          }}
                        >
                          {labels.schedulerMore(more)}
                        </button>
                      }
                    >
                      <p className="px-1 text-sm font-medium text-text-default">{fmt.dayLong(day)}</p>
                      {list.map((event) => (
                        <p key={event.id} className="flex items-center gap-1.5 px-1 text-sm text-text-default">
                          <Dot data-tone={event.tone ?? 'brand'} className="-mx-1" />
                          {!event.allDay && <span className="shrink-0 text-text-muted tabular-nums">{fmt.startTime(event.start)}</span>}
                          <span className="min-w-0 truncate">{event.title}</span>
                        </p>
                      ))}
                    </HoverCard>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- the common case ---------- */

export interface SchedulerProps extends Omit<SchedulerRootProps, 'children'> {}

/**
 * The toolbar over the current view. Other props, `ref` included, go to the card's root `div`.
 *
 *   <Scheduler events={events} onEventChange={(e) => save(e)} onSlotSelect={(slot) => create(slot)} timeZone="Europe/Warsaw" />
 */
export function Scheduler(props: SchedulerProps) {
  return (
    <SchedulerRoot {...props}>
      <SchedulerToolbar />
      <SchedulerGrid />
    </SchedulerRoot>
  )
}
