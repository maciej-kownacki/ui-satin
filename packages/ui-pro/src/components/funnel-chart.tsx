'use client'

import * as React from 'react'
import { WarningCircle, WarningTriangle } from 'iconoir-react'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { ChartCard, ChartTooltip, glideAnchor, useGlide, type ChartCardBaseProps, type GlidePoint } from '@uisatin/ui/chart'
import { EmptyState } from '@uisatin/ui/empty-state'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Skeleton } from '@uisatin/ui/skeleton'

/**
 * FunnelChart: a conversion funnel through stages (recruiting, sales, checkout), in the chart
 * card frame (Free's `ChartCard`: title, range, an optional KPI and period Select).
 *
 * - Horizontal (default): one full-width row per stage, the label and the count on top and a
 *   20px track under them whose chart/3 bar is the stage's share of the first stage. Between two
 *   stages a line says the conversion from the previous one and the drop-off ("25% of Applied ·
 *   drop-off 180"); the count row adds the share of the first stage. A drop-off of at least
 *   `dropOffWarning` (default half the previous stage) earns an amber Badge with a warning icon
 *   and the share lost ("−75%"), and the words "big drop-off" in the stage's name: never colour
 *   alone. A stage of 0 keeps its row with an empty track, so nothing jumps.
 * - Vertical: one column per stage, the bars rising from a 160px baseline, the label under and
 *   the conversion and drop-off under that.
 * - Calm bars, no trapezoids. On first appearance they fade in from 95% of their length (opacity
 *   and transform, 250 ms on ease-out, 25 ms apart top to bottom), never from zero; none under
 *   reduced motion or with `reducedMotion`. New values swap in place.
 * - Hover and keyboard focus show the same words in a ChartTooltip at the bar's end; after the
 *   pointer it glides from stage to stage (`useGlide`), under the keyboard it jumps. The funnel
 *   is one tab stop (roving tab index): ↑ ↓ (and ← → in reading order) move between stages,
 *   Home and End jump. With `onStageSelect` every stage is a button (Enter, Space); without, a
 *   focusable list item that only shows the tooltip.
 * - Every stage is named in words: "Interview: 18, 30% of Screening, 7.5% of Applied,
 *   drop-off 42". A table with the same rows (`FunnelTable`) is in the DOM, visually hidden,
 *   and shown with `showTable`.
 * - `loading`, empty `stages`, and `error` keep the height of five stages: Skeleton rows, an
 *   EmptyState, or the reason as a polite status with Retry when `onRetry` is given.
 * - Counts and percentages are written with `Intl.NumberFormat` in the labels' `dateLocale`;
 *   `format` writes counts another way (currency).
 *
 * Parts: `FunnelChartStage` (one stage's drawing), `FunnelTable`, and `funnelRows` (the numbers
 * both read). Other props, `ref` included, go to the card's root `div`.
 */

/** The words the Funnel chart says on its own. They join SatinLabels, so the app translates them there. */
export const funnelChartLabels = {
  /** A conversion: "30% of Screening". */
  funnelOf: (percent: string, stage: string) => `${percent} of ${stage}`,
  /** The people (or deals) lost since the previous stage: "drop-off 42". */
  funnelDropOff: (count: string) => `drop-off ${count}`,
  /** Read after a drop-off of at least `dropOffWarning`. */
  funnelBigDropOff: 'big drop-off',
  /** A stage's name: "Interview: 18, 30% of Screening, 7.5% of Applied, drop-off 42". */
  funnelStageName: (stage: string, value: string, details: string[]) => [`${stage}: ${value}`, ...details].join(', '),
  /** The empty state's title when `empty` isn't given. */
  funnelNoData: 'No data',
  /** Read while the funnel loads. */
  funnelLoading: 'Loading',
  /** Shown for `error={true}`. */
  funnelError: "Couldn't load",
  funnelRetry: 'Retry',
  /** The table's column heads. */
  funnelStage: 'Stage',
  funnelCount: 'Count',
  funnelFromPrevious: 'From previous',
  funnelFromFirst: 'From first',
  funnelDropOffHead: 'Drop-off',
}

type FunnelChartLabels = typeof funnelChartLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends FunnelChartLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...funnelChartLabels, ...labels }), [labels])
}
type Labels = ReturnType<typeof useLabels>

/* ---------- numbers ---------- */

export type FunnelStage = {
  label: string
  value: number
  /** Emphasis for one stage: its bar takes the tone's colour, one of Badge's tones. */
  tone?: BadgeTone
}

export type FunnelConversion = 'previous' | 'first' | 'both'

/** One stage with what the funnel says about it. Shares are 0–1; `null` where there's nothing to divide by. */
export type FunnelRow = FunnelStage & {
  index: number
  /** The bar's length: the stage's share of the first stage, 0–1. */
  share: number
  /** Conversion from the previous stage; `null` for the first stage or after a stage of 0. */
  fromPrevious: number | null
  /** Conversion from the first stage; `null` for the first stage or when it is 0. */
  fromFirst: number | null
  /** How many were lost since the previous stage (never below 0); `null` for the first. */
  dropOff: number | null
  /** The share of the previous stage lost, 0–1; `null` where `fromPrevious` is. */
  dropOffShare: number | null
  /** The drop-off share reached `dropOffWarning`. */
  bigDropOff: boolean
  /** The previous stage's label, for "30% of Screening". */
  previousLabel?: string
  firstLabel: string
}

/**
 * The numbers the bars and the table read: each stage's share of the first, the conversions and
 * the drop-off. A value that isn't finite or is below 0 counts as 0. Exported for funnels of your own.
 */
export function funnelRows(stages: FunnelStage[], dropOffWarning = 0.5): FunnelRow[] {
  const values = stages.map((s) => (Number.isFinite(s.value) && s.value > 0 ? s.value : 0))
  const first = values[0] ?? 0
  return stages.map((stage, i) => {
    const value = values[i]
    const prev = i > 0 ? values[i - 1] : null
    const fromPrevious = prev ? value / prev : null
    const dropOffShare = fromPrevious == null ? null : Math.max(0, 1 - fromPrevious)
    return {
      ...stage,
      value,
      index: i,
      share: first ? Math.min(1, value / first) : 0,
      fromPrevious,
      fromFirst: i > 0 && first ? value / first : null,
      dropOff: prev == null ? null : Math.max(0, prev - value),
      dropOffShare,
      bigDropOff: dropOffShare != null && dropOffShare > 0 && dropOffShare >= dropOffWarning,
      previousLabel: i > 0 ? stages[i - 1].label : undefined,
      firstLabel: stages[0].label,
    }
  })
}

type Formatters = { count: (v: number) => string; percent: (v: number) => string }

function useFormatters(labels: Labels, format?: (value: number) => string): Formatters {
  return React.useMemo(() => {
    const count = new Intl.NumberFormat(labels.dateLocale)
    const percent = new Intl.NumberFormat(labels.dateLocale, { style: 'percent', maximumFractionDigits: 1 })
    return { count: format ?? ((v) => count.format(v)), percent: (v) => percent.format(v) }
  }, [labels.dateLocale, format])
}

const showsPrevious = (c: FunnelConversion) => c !== 'first'
const showsFirst = (c: FunnelConversion) => c !== 'previous'

/** The stage in words, for its name and its tooltip. */
function stageDetails(row: FunnelRow, labels: Labels, fmt: Formatters, conversion: FunnelConversion) {
  const details: string[] = []
  if (showsPrevious(conversion) && row.fromPrevious != null && row.previousLabel != null)
    details.push(labels.funnelOf(fmt.percent(row.fromPrevious), row.previousLabel))
  if (showsFirst(conversion) && row.fromFirst != null && !(row.index === 1 && showsPrevious(conversion))) details.push(labels.funnelOf(fmt.percent(row.fromFirst), row.firstLabel))
  if (row.dropOff != null) details.push(labels.funnelDropOff(fmt.count(row.dropOff)))
  if (row.bigDropOff) details.push(labels.funnelBigDropOff)
  return details
}

/** The amber Badge for a big drop-off: a warning icon and the share lost ("−75%"). */
function DropOffBadge({ row, fmt }: { row: FunnelRow; fmt: Formatters }) {
  if (!row.bigDropOff || row.dropOffShare == null) return null
  return (
    <Badge
      tone="amber"
      size="sm"
      data-slot="funnel-chart-warning"
      className="[box-shadow:inset_0_0_0_var(--border-width-default)_var(--tone-border)]"
    >
      <WarningTriangle />
      {`−${fmt.percent(row.dropOffShare)}`}
    </Badge>
  )
}

/* ---------- one stage ---------- */

export interface FunnelChartStageProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  row: FunnelRow
  orientation?: 'horizontal' | 'vertical'
  showConversion?: FunnelConversion
  /** Writes the count. Default: the number in `dateLocale`. */
  format?: (value: number) => string
  /** Another stage is on show: this one's bar fades back. */
  dimmed?: boolean
  /** Fades the bar in from 95% of its length, once, when it mounts. */
  enter?: boolean
}

/**
 * One stage's drawing, hidden from screen readers (the stage that holds it carries its name).
 * Horizontal: the conversion line (from the second stage on), the label and the count, then the
 * track with its bar. Vertical: the count, the bar rising in its 160px track, the label, then
 * the conversion and drop-off. The tooltip points at `[data-slot="funnel-chart-marker"]`, at the
 * bar's end. Spans only, so it can sit in a button. Other props, `ref` included, go to its root `span`.
 */
export function FunnelChartStage({
  row,
  orientation = 'horizontal',
  showConversion = 'both',
  format,
  dimmed = false,
  enter = false,
  className,
  ...props
}: FunnelChartStageProps) {
  const labels = useLabels()
  const fmt = useFormatters(labels, format)
  const vertical = orientation === 'vertical'
  // The second stage's share of the first is its conversion from the previous: said once.
  const first =
    showsFirst(showConversion) && row.fromFirst != null && !(row.index === 1 && showsPrevious(showConversion)) ? fmt.percent(row.fromFirst) : null
  const previous =
    showsPrevious(showConversion) && row.index > 0
      ? row.fromPrevious != null && row.previousLabel != null
        ? labels.funnelOf(fmt.percent(row.fromPrevious), row.previousLabel)
        : '—'
      : null
  const drop = row.dropOff != null ? labels.funnelDropOff(fmt.count(row.dropOff)) : null

  const count = (
    <span className="flex max-w-full min-w-0 shrink-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap tabular-nums">
      <span className="font-medium text-text-default">{fmt.count(row.value)}</span>
      {/* In a narrow column the share of the first is cut before the count. */}
      {first && <span className="min-w-0 truncate text-text-muted">{first}</span>}
    </span>
  )
  const bar = (
    <span
      data-slot="funnel-chart-bar"
      data-orientation={orientation}
      data-tone={row.tone}
      data-enter={enter || undefined}
      className={cn(
        'absolute rounded-md transition-opacity duration-(--duration-fast) ease-(--ease-out)',
        vertical ? 'inset-x-0 bottom-0' : 'inset-y-0 start-0',
        row.tone ? 'bg-tone-fg' : 'bg-chart-3',
        dimmed && 'opacity-45',
      )}
      style={{
        [vertical ? 'height' : 'width']: `${row.share * 100}%`,
        // Five steps at most, so a long funnel doesn't keep its last bars waiting.
        animationDelay: enter ? `${Math.min(row.index, 4) * 25}ms` : undefined,
      }}
    >
      <span
        data-slot="funnel-chart-marker"
        className={cn('absolute size-0', vertical ? 'start-1/2 top-0' : 'end-0 top-0')}
      />
    </span>
  )

  if (vertical)
    return (
      <span
        aria-hidden
        data-slot="funnel-chart-stage"
        data-orientation="vertical"
        className={cn('flex min-w-0 flex-col gap-2 text-sm leading-(--text-sm--line-height)', className)}
        {...props}
      >
        <span className="flex h-5 justify-center">{count}</span>
        <span className="relative block h-40 rounded-md bg-bg-muted">{bar}</span>
        <span className="block h-5 truncate text-center font-medium text-text-default">{row.label}</span>
        <span className="flex h-10 flex-col items-center gap-0.5 text-text-muted">
          {previous && <span className="max-w-full truncate">{previous}</span>}
          <span className="flex max-w-full min-w-0 items-center justify-center gap-1">
            {drop && <span className="min-w-0 truncate">{drop}</span>}
            <DropOffBadge row={row} fmt={fmt} />
          </span>
        </span>
      </span>
    )

  return (
    <span
      aria-hidden
      data-slot="funnel-chart-stage"
      data-orientation="horizontal"
      className={cn('flex min-w-0 flex-col text-sm leading-(--text-sm--line-height)', className)}
      {...props}
    >
      {/* 28px with the text centred, so it keeps 4px off the track above and reads with the stage below. */}
      {row.index > 0 && (
        <span data-slot="funnel-chart-conversion" className="flex h-7 min-w-0 items-center gap-2 pt-1 text-text-muted">
          <span className="min-w-0 truncate">{[previous, drop].filter(Boolean).join(' · ')}</span>
          <DropOffBadge row={row} fmt={fmt} />
        </span>
      )}
      <span className="flex h-5 min-w-0 items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-text-default">{row.label}</span>
        {count}
      </span>
      <span className="relative mt-1 block h-5 rounded-md bg-bg-muted">{bar}</span>
    </span>
  )
}

/* ---------- table ---------- */

export interface FunnelTableProps extends Omit<React.ComponentProps<'table'>, 'children'> {
  stages: FunnelStage[]
  /** The table's caption, the chart's title. */
  caption?: string
  format?: (value: number) => string
  /** Shown on the page; otherwise only screen readers get it. */
  visible?: boolean
  /** Share of the previous stage lost that marks a big drop-off. Default 0.5. */
  dropOffWarning?: number
}

/**
 * The funnel as a table: stage, count, from previous, from first, drop-off. The Funnel chart
 * renders one, visually hidden unless `showTable`. Other props, `ref` included, go to the `table`.
 */
export function FunnelTable({ stages, caption, format, visible = false, dropOffWarning = 0.5, className, ...props }: FunnelTableProps) {
  const labels = useLabels()
  const fmt = useFormatters(labels, format)
  const rows = React.useMemo(() => funnelRows(stages, dropOffWarning), [stages, dropOffWarning])
  const cell = 'h-9 border-t border-border-default px-2 text-end tabular-nums whitespace-nowrap'
  const pct = (v: number | null) => (v == null ? '—' : fmt.percent(v))
  return (
    <table
      data-slot="funnel-table"
      className={cn(visible ? 'w-full border-collapse text-sm leading-(--text-sm--line-height) text-text-default' : 'sr-only', className)}
      {...props}
    >
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr className="text-text-muted">
          <th scope="col" className="h-8 px-2 text-start font-medium">
            {labels.funnelStage}
          </th>
          {[labels.funnelCount, labels.funnelFromPrevious, labels.funnelFromFirst, labels.funnelDropOffHead].map((head, i) => (
            <th key={i} scope="col" className="h-8 px-2 text-end font-medium whitespace-nowrap">
              {head}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.index}>
            <th scope="row" className={cn(cell, 'text-start font-normal whitespace-normal')}>
              {row.label}
            </th>
            <td className={cell}>{fmt.count(row.value)}</td>
            <td className={cell}>{pct(row.fromPrevious)}</td>
            <td className={cell}>{pct(row.fromFirst)}</td>
            <td className={cell}>
              {row.dropOff == null ? '—' : fmt.count(row.dropOff)}
              {row.bigDropOff && <span className="sr-only">{`, ${labels.funnelBigDropOff}`}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ---------- chart ---------- */

export interface FunnelChartProps extends Omit<ChartCardBaseProps, 'data' | 'formatValue' | 'highlight' | 'range'> {
  stages: FunnelStage[]
  /** The dates the funnel covers, under the title (or the KPI). */
  range?: string
  /** Writes the counts ("€48,000"). Default: the number in `dateLocale`. */
  format?: (value: number) => string
  /** Which conversions to show: from the previous stage, from the first, or both. Default 'both'. */
  showConversion?: FunnelConversion
  /** Rows (default) or columns. */
  orientation?: 'horizontal' | 'vertical'
  /** Share of the previous stage lost (0–1) that earns the warning Badge and "big drop-off". Default 0.5. */
  dropOffWarning?: number
  /** Shows the data table under the bars; it is always in the DOM for screen readers. */
  showTable?: boolean
  /** Skeleton rows at the height of five stages. */
  loading?: boolean
  /** The empty state's title when `stages` is empty. Default "No data". */
  empty?: React.ReactNode
  /** Shows the reason in place of the bars, read out politely; `true` says "Couldn't load". */
  error?: React.ReactNode | boolean
  /** Adds Retry to the error. */
  onRetry?: () => void
  /** Makes every stage a button. */
  onStageSelect?: (index: number, stage: FunnelStage) => void
  /** Index of the stage shown as hovered (state sheets, docs). */
  highlight?: number
  /** No entrance, as under prefers-reduced-motion. */
  reducedMotion?: boolean
}

// Five stages, so loading, empty and error keep the loaded funnel's height: horizontal, a first
// stage of 44px and four of 72 (28 conversion line + 20 label + 4 + 20 track); vertical, the column.
const HORIZONTAL_BODY = 'min-h-[332px]'
const VERTICAL_BODY = 'min-h-[264px]'

/**
 * The funnel in its card. See the block comment above for the anatomy, states and keys. Other
 * props, `ref` included, go to the card's root `div`.
 */
export function FunnelChart({
  stages,
  title,
  range = '',
  format,
  showConversion = 'both',
  orientation = 'horizontal',
  dropOffWarning = 0.5,
  showTable = false,
  loading = false,
  empty,
  error,
  onRetry,
  onStageSelect,
  highlight,
  reducedMotion = false,
  ...props
}: FunnelChartProps) {
  const labels = useLabels()
  const fmt = useFormatters(labels, format)
  const rows = React.useMemo(() => funnelRows(stages, dropOffWarning), [stages, dropOffWarning])
  const failed = !loading && error != null && error !== false
  const ready = !loading && !failed && rows.length > 0
  const vertical = orientation === 'vertical'
  const n = rows.length

  const [hovered, setHovered] = React.useState<number | null>(null)
  const [focused, setFocused] = React.useState<number | null>(null)
  const [tabStop, setTabStop] = React.useState(0)
  // The list's unmount fires no blur or pointer leave: forget the stage on show while it's gone.
  if (!ready && (hovered != null || focused != null)) {
    setHovered(null)
    setFocused(null)
  }
  const stop = Math.min(tabStop, Math.max(0, n - 1))
  const pointer = hovered != null && hovered < n ? hovered : null
  const keyboard = focused != null && focused < n ? focused : null
  const active = !ready ? null : (pointer ?? keyboard ?? (highlight != null && highlight < n ? highlight : null))

  const listRef = React.useRef<HTMLOListElement>(null)
  const items = React.useRef<(HTMLElement | null)[]>([])
  const offset = React.useRef<GlidePoint>({ x: 0, y: 0 })
  const updateTooltip = React.useRef<(() => void) | null>(null)
  const marker = React.useCallback(
    () => (active == null ? null : (listRef.current?.querySelectorAll('[data-slot="funnel-chart-marker"]')[active] ?? null)),
    [active],
  )
  const markerRef = React.useRef(marker)
  React.useLayoutEffect(() => {
    markerRef.current = marker
  }, [marker])
  const anchor = React.useMemo(() => glideAnchor(() => markerRef.current(), offset), [])
  // The pointer's moves glide; the keyboard's (and a highlight's) jump.
  useGlide(active, {
    measure: () => {
      const el = marker()
      const box = listRef.current
      if (!el || !box) return null
      const r = el.getBoundingClientRect()
      const b = box.getBoundingClientRect()
      return { x: r.left - b.left, y: r.top - b.top }
    },
    apply: (o) => {
      offset.current = o
      updateTooltip.current?.()
    },
    immediate: pointer == null,
  })

  // A bar fades in when it mounts (the CSS plays once per element), so new values swap in place.
  const enter = !reducedMotion

  const move = (to: number) => {
    const i = Math.max(0, Math.min(n - 1, to))
    setTabStop(i)
    setFocused(i)
    setHovered(null)
    items.current[i]?.focus()
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLOListElement>) => {
    // Alt+← is the browser's Back; leave modified keys alone.
    if (e.altKey || e.metaKey || e.ctrlKey) return
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const next = e.key === 'ArrowDown' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')
    const prev = e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')
    const from = keyboard ?? stop
    if (next) move(from + 1)
    else if (prev) move(from - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(n - 1)
    else return
    e.preventDefault()
  }

  const body = vertical ? VERTICAL_BODY : HORIZONTAL_BODY
  const activeRow = active != null ? rows[active] : null

  return (
    <ChartCard title={title} range={range} aria-busy={loading || undefined} data-orientation={orientation} {...props}>
      <div data-slot="funnel-chart" data-state={loading ? 'loading' : failed ? 'error' : n === 0 ? 'empty' : undefined}>
        {/* Mounted before the error comes, so it is announced (a filled region that appears often isn't). */}
        <span role="status" className="sr-only">
          {failed ? (error === true ? labels.funnelError : error) : ''}
        </span>
        {loading ? (
          <div className={cn('flex', vertical ? 'gap-3' : 'flex-col', body)}>
            <span className="sr-only">{labels.funnelLoading}</span>
            {[0, 1, 2, 3, 4].map((i) =>
              vertical ? (
                <div key={i} aria-hidden className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton animated className="mx-auto mt-1 w-10" />
                  <Skeleton animated shape="rect" className="mt-1 h-40 w-full rounded-md" />
                  <Skeleton animated className="mx-auto mt-1 w-16" />
                </div>
              ) : (
                <div key={i} aria-hidden className={cn('flex flex-col', i > 0 && 'pt-7')}>
                  <div className="flex h-5 items-center justify-between">
                    <Skeleton animated width={96} />
                    <Skeleton animated width={40} />
                  </div>
                  <Skeleton animated shape="rect" className="mt-1 h-5 w-full rounded-md" style={{ maxWidth: `${100 - i * 18}%` }} />
                </div>
              ),
            )}
          </div>
        ) : failed ? (
          <div className={cn('flex flex-wrap items-center justify-center gap-2', body)}>
            <p className="flex min-w-0 items-center gap-1.5 text-sm leading-(--text-sm--line-height) text-text-muted">
              <WarningCircle aria-hidden className="size-icon-size-sm shrink-0" />
              <span className="min-w-0">{error === true ? labels.funnelError : error}</span>
            </p>
            {onRetry && (
              <Button size="xs" variant="secondary" onClick={onRetry}>
                {labels.funnelRetry}
              </Button>
            )}
          </div>
        ) : n === 0 ? (
          <div className={cn('flex items-center justify-center', body)}>
            <EmptyState title={empty ?? labels.funnelNoData} />
          </div>
        ) : (
          <>
            <ol
              ref={listRef}
              data-slot="funnel-chart-stages"
              aria-label={title}
              className={cn('relative', vertical ? 'grid auto-cols-fr grid-flow-col gap-3' : 'flex flex-col')}
              onKeyDown={onKeyDown}
              onPointerLeave={() => setHovered(null)}
            >
              {rows.map((row) => {
                const i = row.index
                const name = labels.funnelStageName(row.label, fmt.count(row.value), stageDetails(row, labels, fmt, showConversion))
                const stage = (
                  <FunnelChartStage
                    row={row}
                    orientation={orientation}
                    showConversion={showConversion}
                    format={format}
                    dimmed={active != null && active !== i}
                    enter={enter}
                  />
                )
                const focusRing =
                  'rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus-ring focus-visible:outline-solid'
                const focusProps = {
                  ref: (el: HTMLElement | null) => {
                    items.current[i] = el
                  },
                  tabIndex: i === stop ? 0 : -1,
                  'aria-label': name,
                  onFocus: () => {
                    setTabStop(i)
                    setFocused(i)
                  },
                  onBlur: () => setFocused(null),
                }
                return onStageSelect ? (
                  <li key={i} className="min-w-0" onPointerEnter={() => setHovered(i)}>
                    <button
                      type="button"
                      {...focusProps}
                      className={cn('block w-full cursor-pointer text-start', focusRing)}
                      onClick={() => onStageSelect(i, stages[i])}
                    >
                      {stage}
                    </button>
                  </li>
                ) : (
                  <li key={i} {...focusProps} className={cn('min-w-0', focusRing)} onPointerEnter={() => setHovered(i)}>
                    {stage}
                  </li>
                )
              })}
            </ol>
            {activeRow && (
              <ChartTooltip
                anchor={anchor}
                updateRef={updateTooltip}
                label={activeRow.label}
                // The count and one conversion keep it to a short line; the name and the table say the rest.
                value={[fmt.count(activeRow.value), ...stageDetails(activeRow, labels, fmt, showConversion).slice(0, 1)].join(' · ')}
              />
            )}
          </>
        )}
        {!loading && !failed && n > 0 && (
          <FunnelTable stages={stages} caption={title} format={format} dropOffWarning={dropOffWarning} visible={showTable} className={showTable ? 'mt-4' : undefined} />
        )}
      </div>
    </ChartCard>
  )
}
