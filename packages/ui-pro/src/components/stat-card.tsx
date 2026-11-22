'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, Minus, WarningCircle } from 'iconoir-react'
import { Badge } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { ChartTooltip } from '@uisatin/ui/chart'
import { useSatinLabels } from '@uisatin/ui/labels'
import { smoothPath } from '@uisatin/ui/line-chart'
import { cn } from '@uisatin/ui/lib/utils'
import { Skeleton } from '@uisatin/ui/skeleton'
import { useReducedMotion } from './rolling-number'

/**
 * StatCard: the first tile on a dashboard, 1:1 with the uiKit `stat` card (4093:4955). A label,
 * a value, its change against the previous period and a sparkline, in a 4-up row at 240px.
 *
 * - The shell is the chart card's (bg/card, a border-default edge, radius-2xl, 16px in, 12
 *   between rows), drawn here: Card and ChartCard carry a title row the tile has no room for.
 * - Row one: the label in text/muted, cut with an ellipsis, and the change's period ("vs last
 *   week") at the row's end, cut only after the label. Row two: the value (text/xl semibold,
 *   tabular, never cut) and the change as a small Badge with an arrow, which wraps under a long
 *   value: green when it moved the way that is good, red when
 *   not, grey when flat. `good: 'down'` is for CAC, refund rate, time to hire. Row three: the
 *   sparkline, a 2px chart/3 line over a chart/3 gradient (28% to nothing), 48px tall.
 * - The accessible name says it all in words: "Signups, 1,284, up 12% vs last week"; for a
 *   metric where down is good it adds ", good" or ", bad". Colour is never the only signal: the
 *   arrow and the words carry the direction.
 * - Without `href` the card is a `group` and the sparkline one tab stop: arrow keys move along
 *   its points, the dot and a tooltip show the value, a polite live region reads it. With
 *   `href` the whole card is one link (focus ring on the card) and the sparkline only a picture
 *   with its text summary.
 * - `loading` shows Skeletons in boxes of the loaded rows' heights, so a row of tiles never
 *   jumps; the sparkline's row is kept when `sparkline` is given, even empty. `error` keeps the
 *   label and puts the reason (and Retry, with `onRetry`) where the value and sparkline were,
 *   at the same height; the reason is a polite `status`, and Retry is described by the label.
 * - Motion: a number counts up once, the first time it appears on the client (250 ms,
 *   ease-out), not when it was on the server's page; the sparkline fades in when it is drawn.
 *   Neither under reduced motion. No motion on arrow keys.
 *
 * Parts: `StatCardChange` (the badge with its words) and `StatCardSparkline`, for tiles of your
 * own. Other props, `ref` included, go to the card's root `div`.
 */

/** The words the Stat card says on its own. They join SatinLabels, so the app translates them there. */
export const statCardLabels = {
  /** The change in words: "up 12% vs last week". `value` is the change as shown, `period` as given. */
  statUp: (value: string, period: string) => `up ${value} ${period}`.trim(),
  statDown: (value: string, period: string) => `down ${value} ${period}`.trim(),
  /** A flat change: "unchanged vs last week". */
  statFlat: (_value: string, period: string) => `unchanged ${period}`.trim(),
  /** Added after the change when down is the good way (`good: 'down'`). */
  statGood: 'good',
  statBad: 'bad',
  /**
   * The card's name: "Signups, 1,284, up 12% vs last week". `value` is the value as shown (or
   * the loading word), `change` the change in words when there is one. When `label` isn't a
   * string it is read from the card itself, before this, and `label` here is empty.
   */
  statName: (label: string, value: string, change?: string) => [label, value, change].filter(Boolean).join(', '),
  /** A change and whether it is good, when down is good: "down 4% vs last week, good". */
  statVerdict: (change: string, verdict: string) => `${change}, ${verdict}`,
  /** A sparkline point read out: "Week 3: 1,040". `point` is its label or `statPoint`. */
  statPointValue: (point: string, value: string) => `${point}: ${value}`,
  /** Read for a `null` value, shown as "—". */
  statNoValue: 'No data',
  /** Read after the label while the card loads. */
  statLoading: 'Loading',
  /** Shown for `error={true}`. */
  statError: "Couldn't load",
  statRetry: 'Retry',
  /**
   * The sparkline's summary: "Upward trend over 12 points, from 980 to 1,284". `from` and `to`
   * are the first and last values as shown.
   */
  statTrend: (trend: 'up' | 'down' | 'flat', count: number, from: string, to: string) =>
    `${trend === 'up' ? 'Upward' : trend === 'down' ? 'Downward' : 'Flat'} trend over ${count} points, from ${from} to ${to}`,
  /** The sparkline's name when it has no `title`: "12 points". */
  statPoints: (count: number) => `${count} ${count === 1 ? 'point' : 'points'}`,
  /** A point read out when the sparkline has no `labels`: "3 of 12". */
  statPoint: (index: number, count: number) => `${index} of ${count}`,
}

type StatCardLabels = typeof statCardLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends StatCardLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...statCardLabels, ...labels }), [labels])
}

/* ---------- change ---------- */

export type StatDirection = 'up' | 'down' | 'flat'

export type StatChange = {
  /** The change in percent, 12 for "12%". Shown without a sign: the arrow carries it. */
  value: number
  /** "vs last week", already in the app's words. */
  period: string
  direction: StatDirection
  /** Which way is desirable. Default 'up'. CAC, refund rate and time to hire pass 'down'. */
  good?: 'up' | 'down'
  /** Writes the change in another unit ("3 pp"). Default: a percent in `dateLocale` ("12%", "12 %"). */
  format?: (value: number) => string
}

type Labels = ReturnType<typeof useLabels>

const percent = (labels: Labels, change: Pick<StatChange, 'value' | 'format'>) =>
  change.format
    ? change.format(Math.abs(change.value))
    : // The locale places the sign and its space ("12 %" in French).
      new Intl.NumberFormat(labels.dateLocale, { style: 'percent', maximumFractionDigits: 1 }).format(Math.abs(change.value) / 100)

const toneOf = (change: Pick<StatChange, 'direction' | 'good'>) =>
  change.direction === 'flat' ? 'neutral' : change.direction === (change.good ?? 'up') ? 'green' : 'red'

/** The change in words: "up 12% vs last week", plus ", good" / ", bad" when down is good. */
function changeWords(labels: Labels, change: Omit<StatChange, 'period'> & { period?: string }) {
  const value = percent(labels, change)
  const period = change.period ?? ''
  const words =
    change.direction === 'up' ? labels.statUp(value, period) : change.direction === 'down' ? labels.statDown(value, period) : labels.statFlat(value, period)
  if (change.good !== 'down' || change.direction === 'flat') return words
  return labels.statVerdict(words, change.direction === 'down' ? labels.statGood : labels.statBad)
}

export interface StatCardChangeProps extends Omit<React.ComponentProps<'span'>, 'children'>, Omit<StatChange, 'period'> {
  /** Read with the change ("up 12% vs last week"); not shown. The card shows it in its label row. */
  period?: string
}

/**
 * The change as a small Badge: an arrow (a dash when flat) and the value, green when it moved
 * the good way, red when not, grey when flat (`data-tone`). Screen readers get it in words.
 * Other props, `ref` included, go to its `span`.
 */
export function StatCardChange({ value, direction, good, format, period, className, ...props }: StatCardChangeProps) {
  const labels = useLabels()
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus
  return (
    <span data-slot="stat-card-change" className={cn('inline-flex shrink-0', className)} {...props}>
      <Badge
        aria-hidden
        tone={toneOf({ direction, good })}
        size="sm"
        className="[box-shadow:inset_0_0_0_var(--border-width-default)_var(--tone-border)]"
      >
        <Icon />
        {percent(labels, { value, format })}
      </Badge>
      <span className="sr-only">{changeWords(labels, { value, direction, good, format, period })}</span>
    </span>
  )
}

/* ---------- sparkline ---------- */

const SPARK = 48
// Room above the highest point and under the lowest, so the 2px stroke isn't cut.
const SPARK_TOP = 4
const SPARK_BOTTOM = 1

export interface StatCardSparklineProps extends Omit<React.ComponentProps<'div'>, 'title' | 'children'> {
  /** The values, oldest first. Values that aren't finite are left out; fewer than two finite draw nothing. */
  data: number[]
  /** The tooltip's title per point ("Week 3"). Without it the tooltip shows the value alone. */
  labels?: string[]
  /** Writes a value in the tooltip, the live region and the summary. Default: `dateLocale`. */
  format?: (value: number) => string
  /** Index of the point shown as picked (state sheets, docs). */
  highlight?: number
  /** A tab stop whose arrow keys move along the points, with a tooltip on hover. Default true. */
  interactive?: boolean
  /** Names the points' group: "Signups, 12 points". */
  title?: string
  /** The id of its text summary, for an element to be described by it (a card's link). */
  summaryId?: string
}

/**
 * The sparkline alone: the line and its gradient, no axes. The drawing is hidden; a sentence
 * sums it up ("Upward trend over 12 points, from 980 to 1,284"). Interactive, it is one tab stop:
 * focus picks the last point, ← → move along them, a pointer picks the nearest. The drawing keeps
 * time running left to right in right-to-left pages too, as the Line chart does, so → is always
 * the next point. Other props, `ref` included, go to its `div`.
 */
export function StatCardSparkline({
  data,
  labels: pointLabels,
  format,
  highlight,
  interactive = true,
  title,
  summaryId,
  className,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: StatCardSparklineProps) {
  const labels = useLabels()
  const reduced = useReducedMotion()
  const gradientId = React.useId()
  const ownSummaryId = React.useId()
  const descId = summaryId ?? ownSummaryId
  // The pointer's point, and the keyboard's while the sparkline has focus: the pointer wins,
  // and leaving hands the dot back to the keyboard's.
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [focused, setFocused] = React.useState<number | null>(null)
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)

  // A gap (NaN, Infinity) is left out, with its label, rather than breaking the drawing.
  const { values, names } = React.useMemo(() => {
    const values: number[] = []
    const names: (string | undefined)[] = []
    data.forEach((v, i) => {
      if (!Number.isFinite(v)) return
      values.push(v)
      names.push(pointLabels?.[i])
    })
    return { values, names }
  }, [data, pointLabels])
  const n = values.length

  // A new set of points draws afresh, with the fade.
  const signature = values.join('|')
  const [redraw, setRedraw] = React.useState({ signature, n: 0 })
  if (redraw.signature !== signature) setRedraw({ signature, n: redraw.n + 1 })

  const fmt = React.useMemo(() => format ?? ((v: number) => new Intl.NumberFormat(labels.dateLocale).format(v)), [format, labels.dateLocale])

  if (n < 2) return null

  const pointer = interactive && hovered != null && hovered < n ? hovered : null
  const keyboard = interactive && focused != null && focused < n ? focused : null
  const active = pointer ?? keyboard ?? (highlight != null && highlight < n ? highlight : null)
  const min = Math.min(...values)
  const max = Math.max(...values)
  // A near-flat series keeps a range of at least ±5% of its mean (±1 around 0), so 3.0 to 3.2
  // draws as a calm line, not a wave filling the 48px.
  const mean = values.reduce((sum, v) => sum + v, 0) / n
  const half = Math.max((max - min) / 2, mean === 0 ? 1 : Math.abs(mean) * 0.05)
  const mid = (max + min) / 2
  const lo = mid - half
  const hi = mid + half
  const x = (i: number) => (i / (n - 1)) * 100
  const y = (v: number) => SPARK_TOP + (1 - (v - lo) / (hi - lo)) * (SPARK - SPARK_TOP - SPARK_BOTTOM)
  const line = smoothPath(values.map((v, i) => [x(i), y(v)]))
  const first = values[0]
  const last = values[n - 1]
  const trend = last > first ? 'up' : last < first ? 'down' : 'flat'
  const pointName = (i: number) => names[i] ?? labels.statPoint(i + 1, n)

  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    if (!r.width) return
    const f = (e.clientX - r.left) / r.width
    setHovered(Math.max(0, Math.min(n - 1, Math.round(f * (n - 1)))))
  }

  return (
    <div
      data-slot="stat-card-sparkline"
      role={interactive ? 'group' : undefined}
      aria-label={interactive ? (title ? labels.chartPoints(title, n) : labels.statPoints(n)) : undefined}
      aria-describedby={interactive ? descId : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        'relative h-12 w-full shrink-0 rounded-md',
        interactive && 'outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
        className,
      )}
      onPointerMove={(e) => {
        onPointerMove?.(e)
        if (interactive) pick(e)
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e)
        setHovered(null)
      }}
      onFocus={(e) => {
        onFocus?.(e)
        if (interactive && e.target === e.currentTarget) setFocused((f) => f ?? n - 1)
      }}
      onBlur={(e) => {
        onBlur?.(e)
        setFocused(null)
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (!interactive || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
        e.preventDefault()
        // The keys move on from the point on show, the pointer's too.
        const from = pointer ?? keyboard ?? n - 1
        // The drawing isn't mirrored right to left, so → is the next point in either direction.
        setFocused(Math.max(0, Math.min(n - 1, from + (e.key === 'ArrowRight' ? 1 : -1))))
        setHovered(null)
      }}
      {...props}
    >
      <svg
        key={redraw.n}
        aria-hidden
        viewBox={`0 0 100 ${SPARK}`}
        preserveAspectRatio="none"
        className={cn('absolute inset-0 size-full overflow-visible', !reduced && 'animate-[satin-fade-in_var(--duration-base)_var(--ease-out)]')}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--chart-3)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--chart-3)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L 100 ${SPARK} L 0 ${SPARK} Z`} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--chart-3)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {active != null && (
        <>
          <span
            ref={setAnchor}
            aria-hidden
            data-slot="stat-card-sparkline-dot"
            className="pointer-events-none absolute size-2 -translate-1/2 rounded-full border-2 border-chart-3 bg-bg-card"
            style={{ left: `${x(active)}%`, top: y(values[active]) }}
          />
          <ChartTooltip
            anchor={anchor}
            sideOffset={6}
            // Without a title the value stands alone: the empty title span takes no room.
            className="[&_span:empty]:hidden"
            label={names[active] ?? ''}
            value={fmt(values[active])}
          />
        </>
      )}
      {interactive && (
        <span className="sr-only" aria-live="polite">
          {active != null ? labels.statPointValue(pointName(active), fmt(values[active])) : ''}
        </span>
      )}
      {/* Interactive, the group is described by it: hidden, so it isn't read twice. */}
      <span id={descId} aria-hidden={interactive || undefined} className="sr-only">
        {labels.statTrend(trend, n, fmt(first), fmt(last))}
      </span>
    </div>
  )
}

/* ---------- count-up ---------- */

const COUNT_MS = 250
const REDUCED = '(prefers-reduced-motion: reduce)'
// --ease-out (cubic-bezier(0.23, 1, 0.32, 1)) is close to an ease-out quint.
const easeOut = (t: number) => 1 - (1 - t) ** 5
const subscribeNone = () => () => {}

/**
 * The number to show. The first number that appears on the client counts up from 0 over
 * 250 ms: on a client-only mount, or when loading ends. A number already on the server's page
 * doesn't count: hydration keeps it, so it never jumps 1,284 → 0 → 1,284. After that (and with
 * `enabled` off or reduced motion) it is the value itself.
 */
function useCountUp(target: number | null, enabled: boolean) {
  // false while hydrating, true on a client-only render.
  const client = React.useSyncExternalStore(subscribeNone, () => true, () => false)
  const [shown, setShown] = React.useState(target)
  const done = React.useRef<boolean | null>(null)
  if (done.current === null) done.current = !client && target != null
  React.useLayoutEffect(() => {
    if (target == null) return
    const reduced = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED).matches
    if (done.current || !enabled || reduced) {
      done.current = true
      setShown(target)
      return
    }
    done.current = true
    const start = performance.now()
    let frame = 0
    let ticked = false
    const tick = (now: number) => {
      ticked = true
      const t = Math.min(1, (now - start) / COUNT_MS)
      setShown(t === 1 ? target : target * easeOut(t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    setShown(0)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      // Cleaned up before a single frame: StrictMode's rehearsal, so the next run counts. A new
      // value during the count shows as it is.
      if (!ticked) done.current = false
      setShown(target)
    }
  }, [target, enabled])
  return target == null ? null : (shown ?? target)
}

/** Decimals a number is written with, exponent notation included (1e-7 has 7). */
const decimals = (v: number) => {
  const [mantissa, exponent = '0'] = String(v).split('e')
  return Math.min(20, Math.max(0, (mantissa.split('.')[1] ?? '').length - Number(exponent)))
}

/* ---------- card ---------- */

export interface StatCardProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /**
   * What is measured: "Signups". Text or inline content (no links or buttons: with `href` the
   * whole card is a link). A string is read in the card's name sentence; other content is read
   * from the card, before the rest of the name.
   */
  label: React.ReactNode
  /** The value. A number goes through `format`; a string shows as given; `null`, or a number that isn't finite, shows "—" (read "No data"). */
  value: number | string | null
  /** Writes a number value, and the sparkline's points ("38 €"). Default: the number in `dateLocale`. */
  format?: (value: number) => string
  /** The change against the previous period. Left out or `null` (no previous period): no badge, no period. */
  change?: StatChange | null
  /** The values for the sparkline, oldest first. Values that aren't finite are left out; with fewer than two the row stays, empty. */
  sparkline?: number[]
  /** The tooltip's title per sparkline point ("Week 3"). */
  sparklineLabels?: string[]
  /** Makes the whole card one link. */
  href?: string
  /** Skeletons at the loaded card's height. Give `sparkline` (even `[]`) to keep its row. */
  loading?: boolean
  /** Shows the reason in place of the value and sparkline, read out politely; `true` says "Couldn't load". */
  error?: React.ReactNode | boolean
  /** Adds Retry to the error. */
  onRetry?: () => void
  /** Fades the content; a link loses its `href`, the sparkline its tab stop. */
  disabled?: boolean
  /** Counts a number up the first time it appears on the client. Default true; never under reduced motion or on hydration. */
  countUp?: boolean
}

/**
 * The stat tile. See the block comment above for the anatomy, states and keys. Other props,
 * `ref` included, go to the root `div`.
 */
export function StatCard({
  label,
  value: given,
  format,
  change,
  sparkline,
  sparklineLabels,
  href,
  loading = false,
  error,
  onRetry,
  disabled = false,
  countUp = true,
  className,
  ...props
}: StatCardProps) {
  const labels = useLabels()
  const nameId = React.useId()
  const labelId = React.useId()
  const errorId = React.useId()
  const summaryId = React.useId()
  const failed = !loading && error != null && error !== false
  const ready = !loading && !failed
  // NaN or Infinity is no value to show.
  const value = typeof given === 'number' && !Number.isFinite(given) ? null : given

  const numeric = ready && typeof value === 'number' ? value : null
  const counting = useCountUp(numeric, countUp)
  const fmt = React.useCallback(
    (v: number) => (format ? format(v) : new Intl.NumberFormat(labels.dateLocale).format(v)),
    [format, labels.dateLocale],
  )
  const finalText = value == null ? null : typeof value === 'number' ? fmt(value) : value
  // Rounded to the value's decimals only while counting; the value itself is written as is.
  const shownText =
    value == null
      ? '—'
      : typeof value === 'number'
        ? counting == null || counting === value
          ? fmt(value)
          : fmt(Number(counting.toFixed(decimals(value))))
        : value

  const finiteCount = sparkline ? sparkline.filter(Number.isFinite).length : 0
  const spark = sparkline && finiteCount >= 2 ? sparkline : null
  const link = ready && href != null
  const title = typeof label === 'string' ? label : undefined

  // The name is one plain sentence in `nameId`. A label that isn't a string is read from where
  // it shows (`labelId`), and an error from its row (`errorId`), so nothing is rendered twice.
  const nameText = loading
    ? labels.statName(title ?? '', labels.statLoading)
    : failed
      ? (title ?? '')
      : labels.statName(title ?? '', finalText ?? labels.statNoValue, change ? changeWords(labels, change) : undefined)
  const labelledBy = [title == null && labelId, nameText && nameId, failed && errorId].filter(Boolean).join(' ')
  const labelText = (
    <p id={title == null ? labelId : undefined} className="min-w-16 flex-1 truncate text-sm leading-(--text-sm--line-height) text-text-muted">
      {label}
    </p>
  )

  return (
    <div
      data-slot="stat-card"
      data-state={loading ? 'loading' : failed ? 'error' : undefined}
      data-disabled={disabled || undefined}
      role={link ? undefined : 'group'}
      aria-labelledby={link ? undefined : labelledBy}
      aria-busy={loading || undefined}
      aria-disabled={!link && disabled ? true : undefined}
      className={cn(
        '@container relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-border-default bg-bg-card p-4',
        disabled && '*:opacity-50',
        link &&
          !disabled &&
          'transition-colors duration-(--duration-fast) ease-(--ease-out) has-[a:hover]:bg-bg-hover has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-action-focus-ring has-[a:focus-visible]:outline-solid',
        className,
      )}
      {...props}
    >
      {/* Read only through aria-labelledby, so hidden: the group's content doesn't say it again. */}
      {nameText && (
        <span id={nameId} aria-hidden className="sr-only">
          {nameText}
        </span>
      )}

      {loading ? (
        <>
          {title == null && (
            <span id={labelId} aria-hidden className="sr-only">
              {label}
            </span>
          )}
          <div aria-hidden className="flex h-5 items-center">
            <Skeleton animated width={96} />
          </div>
          <div aria-hidden className="flex h-7.5 items-center">
            <Skeleton animated width={140} height={28} />
          </div>
          {sparkline !== undefined && <Skeleton animated shape="rect" className="h-12 w-full rounded-md" />}
        </>
      ) : (
        <>
          <div aria-hidden className="flex h-5 min-w-0 items-center gap-2">
            {labelText}
            {ready && change && (
              // Cut last, and never to nothing; the name says it in full.
              <span title={change.period} className="min-w-12 truncate text-sm leading-(--text-sm--line-height) text-text-muted">
                {change.period}
              </span>
            )}
          </div>
          {failed ? (
            <div className={cn('flex flex-wrap content-start items-center gap-2', sparkline !== undefined ? 'min-h-[90px]' : 'min-h-7.5')}>
              <p role="status" className="flex min-h-7.5 min-w-0 items-center gap-1.5 text-sm leading-(--text-sm--line-height) text-text-muted">
                <WarningCircle aria-hidden className="size-icon-size-sm shrink-0" />
                <span id={errorId} className="min-w-0">
                  {error === true ? labels.statError : error}
                </span>
              </p>
              {onRetry && (
                <Button size="xs" variant="secondary" disabled={disabled} aria-describedby={title == null ? labelId : nameId} onClick={onRetry}>
                  {labels.statRetry}
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* A long value pushes the Badge to a line of its own; the value is never cut. */}
              <div aria-hidden className="flex min-h-7.5 min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  data-slot="stat-card-value"
                  className={cn(
                    'shrink-0 text-xl leading-(--text-xl--line-height) font-semibold whitespace-nowrap tabular-nums',
                    value == null ? 'text-text-muted' : 'text-text-default',
                  )}
                >
                  {shownText}
                </span>
                {change && <StatCardChange value={change.value} direction={change.direction} good={change.good} format={change.format} />}
              </div>
              {spark ? (
                <StatCardSparkline
                  data={spark}
                  labels={sparklineLabels}
                  format={format}
                  title={title}
                  interactive={!link && !disabled}
                  summaryId={summaryId}
                  aria-hidden={link || undefined}
                  className={link ? 'pointer-events-none' : undefined}
                />
              ) : (
                // Too few points: the row stays, so the tile keeps its loading height.
                sparkline !== undefined && <div aria-hidden data-slot="stat-card-sparkline-empty" className="h-12 shrink-0" />
              )}
            </>
          )}
        </>
      )}

      {link && (
        <a
          href={disabled ? undefined : href}
          role={disabled ? 'link' : undefined}
          aria-labelledby={labelledBy}
          aria-describedby={spark ? summaryId : undefined}
          aria-disabled={disabled || undefined}
          className="absolute inset-0 rounded-2xl outline-none"
        />
      )}
    </div>
  )
}
