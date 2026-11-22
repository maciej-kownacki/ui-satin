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
 *   week") at the row's end, never cut. Row two: the value (text/xl semibold, tabular) and the
 *   change as a small Badge with an arrow: green when it moved the way that is good, red when
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
 *   at the same height.
 * - Motion: a number counts up once, the first time it appears (250 ms, ease-out); the
 *   sparkline fades in when it is drawn. Neither under reduced motion. No motion on arrow keys.
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
  /** Writes the change in another unit ("3 pp"). Default: the number in `dateLocale` and "%". */
  format?: (value: number) => string
}

type Labels = ReturnType<typeof useLabels>

const percent = (labels: Labels, change: Pick<StatChange, 'value' | 'format'>) =>
  change.format
    ? change.format(Math.abs(change.value))
    : `${new Intl.NumberFormat(labels.dateLocale, { maximumFractionDigits: 1 }).format(Math.abs(change.value))}%`

const toneOf = (change: Pick<StatChange, 'direction' | 'good'>) =>
  change.direction === 'flat' ? 'neutral' : change.direction === (change.good ?? 'up') ? 'green' : 'red'

/** The change in words: "up 12% vs last week", plus ", good" / ", bad" when down is good. */
function changeWords(labels: Labels, change: Omit<StatChange, 'period'> & { period?: string }) {
  const value = percent(labels, change)
  const period = change.period ?? ''
  const words =
    change.direction === 'up' ? labels.statUp(value, period) : change.direction === 'down' ? labels.statDown(value, period) : labels.statFlat(value, period)
  if (change.good !== 'down' || change.direction === 'flat') return words
  return `${words}, ${change.direction === 'down' ? labels.statGood : labels.statBad}`
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
  /** The values, oldest first. Fewer than two draw nothing. */
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
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  const n = data.length

  // A new set of points draws afresh, with the fade.
  const signature = data.join('|')
  const [redraw, setRedraw] = React.useState({ signature, n: 0 })
  if (redraw.signature !== signature) setRedraw({ signature, n: redraw.n + 1 })

  const fmt = React.useMemo(() => format ?? ((v: number) => new Intl.NumberFormat(labels.dateLocale).format(v)), [format, labels.dateLocale])

  if (n < 2) return null

  const active = (interactive && hovered != null && hovered < n ? hovered : null) ?? (highlight != null && highlight < n ? highlight : null)
  const min = Math.min(...data)
  const max = Math.max(...data)
  const x = (i: number) => (i / (n - 1)) * 100
  const y = (v: number) => (max === min ? SPARK / 2 : SPARK_TOP + (1 - (v - min) / (max - min)) * (SPARK - SPARK_TOP - SPARK_BOTTOM))
  const line = smoothPath(data.map((v, i) => [x(i), y(v)]))
  const first = data[0]
  const last = data[n - 1]
  const trend = last > first ? 'up' : last < first ? 'down' : 'flat'
  const pointName = (i: number) => pointLabels?.[i] ?? labels.statPoint(i + 1, n)

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
        if (interactive && e.target === e.currentTarget) setHovered((h) => h ?? n - 1)
      }}
      onBlur={(e) => {
        onBlur?.(e)
        setHovered(null)
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (!interactive || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
        e.preventDefault()
        // The drawing isn't mirrored right to left, so → is the next point in either direction.
        setHovered((h) => Math.max(0, Math.min(n - 1, (h ?? n - 1) + (e.key === 'ArrowRight' ? 1 : -1))))
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
            style={{ left: `${x(active)}%`, top: y(data[active]) }}
          />
          <ChartTooltip
            anchor={anchor}
            sideOffset={6}
            // Without a title the value stands alone: the empty title span takes no room.
            className="[&_span:empty]:hidden"
            label={pointLabels?.[active] ?? ''}
            value={fmt(data[active])}
          />
        </>
      )}
      {interactive && (
        <span className="sr-only" aria-live="polite">
          {active != null ? `${pointName(active)}: ${fmt(data[active])}` : ''}
        </span>
      )}
      <span id={descId} className="sr-only">
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

/**
 * The number to show: the first number that appears counts up from 0 over 250 ms; after that
 * (and with `enabled` off or reduced motion) it is the value itself. The server and the first
 * client render show the value, so nothing differs on hydration.
 */
function useCountUp(target: number | null, enabled: boolean) {
  const [shown, setShown] = React.useState(target)
  const counted = React.useRef(false)
  React.useLayoutEffect(() => {
    if (target == null) return
    const reduced = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED).matches
    if (counted.current || !enabled || reduced) {
      counted.current = true
      setShown(target)
      return
    }
    counted.current = true
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS)
      setShown(t === 1 ? target : target * easeOut(t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    setShown(0)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      setShown(target)
    }
  }, [target, enabled])
  return target == null ? null : (shown ?? target)
}

const decimals = (v: number) => Math.min(4, (String(v).split('.')[1] ?? '').length)

/* ---------- card ---------- */

export interface StatCardProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** What is measured: "Signups". */
  label: React.ReactNode
  /** The value. A number goes through `format`; a string shows as given; `null` shows "—" (read "No data"). */
  value: number | string | null
  /** Writes a number value, and the sparkline's points ("38 €"). Default: the number in `dateLocale`. */
  format?: (value: number) => string
  /** The change against the previous period. Left out or `null` (no previous period): no badge, no period. */
  change?: StatChange | null
  /** The values for the sparkline, oldest first. Fewer than two draw nothing. */
  sparkline?: number[]
  /** The tooltip's title per sparkline point ("Week 3"). */
  sparklineLabels?: string[]
  /** Makes the whole card one link. */
  href?: string
  /** Skeletons at the loaded card's height. Give `sparkline` (even `[]`) to keep its row. */
  loading?: boolean
  /** Shows the reason in place of the value and sparkline; `true` says "Couldn't load". */
  error?: React.ReactNode | boolean
  /** Adds Retry to the error. */
  onRetry?: () => void
  /** Fades the content; a link loses its `href`, the sparkline its tab stop. */
  disabled?: boolean
  /** Counts a number up the first time it appears. Default true; never under reduced motion. */
  countUp?: boolean
}

/**
 * The stat tile. See the block comment above for the anatomy, states and keys. Other props,
 * `ref` included, go to the root `div`.
 */
export function StatCard({
  label,
  value,
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
  const summaryId = React.useId()
  const failed = !loading && error != null && error !== false
  const ready = !loading && !failed

  const numeric = ready && typeof value === 'number' ? value : null
  const counting = useCountUp(numeric, countUp)
  const fmt = React.useCallback(
    (v: number) => (format ? format(v) : new Intl.NumberFormat(labels.dateLocale).format(v)),
    [format, labels.dateLocale],
  )
  const finalText = value == null ? null : typeof value === 'number' ? fmt(value) : value
  const shownText =
    value == null ? '—' : typeof value === 'number' ? fmt(counting == null ? value : Number(counting.toFixed(decimals(value)))) : value

  const spark = sparkline && sparkline.length >= 2 ? sparkline : null
  const link = ready && href != null
  const title = typeof label === 'string' ? label : undefined

  const name = loading ? (
    <>
      {label}, {labels.statLoading}
    </>
  ) : failed ? (
    <>
      {label}, {error === true ? labels.statError : error}
    </>
  ) : (
    <>
      {label}, {finalText ?? labels.statNoValue}
      {change && `, ${changeWords(labels, change)}`}
    </>
  )

  return (
    <div
      data-slot="stat-card"
      data-state={loading ? 'loading' : failed ? 'error' : undefined}
      data-disabled={disabled || undefined}
      role={link ? undefined : 'group'}
      aria-labelledby={link ? undefined : nameId}
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
      {!link && (
        <span id={nameId} className="sr-only">
          {name}
        </span>
      )}

      {loading ? (
        <>
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
            <p className="min-w-0 flex-1 truncate text-sm leading-(--text-sm--line-height) text-text-muted">{label}</p>
            {ready && change && (
              <span className="shrink-0 text-sm leading-(--text-sm--line-height) whitespace-nowrap text-text-muted">{change.period}</span>
            )}
          </div>
          {failed ? (
            <div className={cn('flex flex-wrap content-start items-center gap-2', sparkline !== undefined ? 'min-h-[90px]' : 'min-h-7.5')}>
              <p aria-hidden className="flex min-h-7.5 min-w-0 items-center gap-1.5 text-sm leading-(--text-sm--line-height) text-text-muted">
                <WarningCircle className="size-icon-size-sm shrink-0" />
                <span className="min-w-0">{error === true ? labels.statError : error}</span>
              </p>
              {onRetry && (
                <Button size="xs" variant="secondary" disabled={disabled} onClick={onRetry}>
                  {labels.statRetry}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div aria-hidden className="flex h-7.5 min-w-0 items-center gap-2">
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
              {spark && (
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
              )}
            </>
          )}
        </>
      )}

      {link && (
        <a
          href={disabled ? undefined : href}
          role={disabled ? 'link' : undefined}
          aria-disabled={disabled || undefined}
          aria-describedby={spark ? summaryId : undefined}
          className="absolute inset-0 rounded-2xl outline-none"
        >
          <span className="sr-only">{name}</span>
        </a>
      )}
    </div>
  )
}
