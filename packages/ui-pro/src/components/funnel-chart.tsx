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
 * - The shape: one chart/3 flow, centred, its thickness each stage's share of the first stage to
 *   the power 0.35 (a quarter of the first draws 62% as thick, 1% draws 20%), so the middle
 *   stages stay full and only a very small share draws thin, easing on an S-curve from one
 *   stage's thickness to the next's across the stage. Horizontal (default) flows left to right,
 *   one column per stage, its words on top: the label and the count, with its share of the first
 *   when `showConversion` asks for it. Vertical flows top to bottom, one row per stage, its words
 *   at the start. A hairline in border-subtle parts the stages, with 2px either side, so they
 *   read as steps of one flow.
 * - The step between two stages is a small Badge on their hairline, just above the flow's edge:
 *   the conversion from the previous stage ("25%"). A drop-off of at least `dropOffWarning`
 *   (default half the previous stage) turns it amber with a warning icon, and puts the words
 *   "big drop-off" in the stage's name: never colour alone. `showConversion="first"` leaves the
 *   steps out. A stage of 0 keeps its column; the flow narrows to nothing.
 * - On first appearance each stage's shape fades in from 95% of its thickness (opacity and
 *   transform, 250 ms on ease-out, 25 ms apart, at most four steps), never from zero; none under
 *   reduced motion or with `reducedMotion`. New values swap in place.
 * - Hover and keyboard focus show the stage in a ChartTooltip on the shape's edge; after the
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
 * Parts: `FunnelChartStage` (one stage's drawing), `FunnelTable`, `funnelRows` (the numbers both
 * read) and `funnelShapePath`. Other props, `ref` included, go to the card's root `div`.
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

/**
 * The tooltip's line: the count, its share of the first ("7.5% of Applied") and the drop-off
 * ("drop-off 42"), what the column doesn't say. The first stage's is the count alone. Short, so
 * it fits a phone; the name and the table say the rest.
 */
function tooltipValue(row: FunnelRow, labels: Labels, fmt: Formatters) {
  return [
    fmt.count(row.value),
    row.fromFirst != null ? labels.funnelOf(fmt.percent(row.fromFirst), row.firstLabel) : null,
    row.dropOff != null ? labels.funnelDropOff(fmt.count(row.dropOff)) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * The step from the previous stage, as a small Badge: the conversion ("25%"), neutral; amber
 * with a warning icon after a big drop-off, so the warning never rests on colour alone.
 */
function StepBadge({ row, fmt }: { row: FunnelRow; fmt: Formatters }) {
  const text = row.fromPrevious != null ? fmt.percent(row.fromPrevious) : '—'
  return (
    <Badge
      tone={row.bigDropOff ? 'amber' : 'neutral'}
      size="sm"
      data-slot="funnel-chart-step"
      data-warning={row.bigDropOff || undefined}
      className="tabular-nums [box-shadow:inset_0_0_0_var(--border-width-default)_var(--tone-border)]"
    >
      {row.bigDropOff && <WarningTriangle />}
      {text}
    </Badge>
  )
}

/* ---------- one stage ---------- */

export interface FunnelChartStageProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  row: FunnelRow
  /** The next stage's share of the first (0–1): the shape eases to it across the stage. Default: the stage's own, flat. */
  nextShare?: number
  orientation?: 'horizontal' | 'vertical'
  showConversion?: FunnelConversion
  /** Writes the count. Default: the number in `dateLocale`. */
  format?: (value: number) => string
  /** Another stage is on show: this one's shape fades back. */
  dimmed?: boolean
  /** Fades the shape in from 95% of its thickness, once, when it mounts. */
  enter?: boolean
}

// The thickness is the share to the power 0.35: a straight share narrows so fast that the middle
// of a hiring funnel (2–25% of the first stage) is a thread. Only a very small share draws thin.
// Its words and the table give the true share. A stage that isn't 0 stays at least 3% thick
// (6px of the 200px shape).
const CURVE = 0.35
const MIN_THICK = 0.03
const thick = (share: number) => (share > 0 ? Math.max(share ** CURVE, MIN_THICK) : 0)
// The shape's edges, in a 0–100 box: centred on the flow's axis.
const near = (share: number) => 50 - thick(share) * 50
const far = (share: number) => 50 + thick(share) * 50
const n2 = (v: number) => Math.round(v * 100) / 100

/**
 * The shape for one stage, in a 100 × 100 box drawn to its cell: the stage's share of the first
 * to the power 0.35 as its thickness (at least 3% when it isn't 0), centred, easing on an S-curve to the next
 * stage's by the cell's far end.
 * Cells side by side join into one flowing funnel. `vertical` flows top to bottom.
 */
export function funnelShapePath(share: number, nextShare: number, vertical = false) {
  const [a1, a2, b1, b2] = [near(share), far(share), near(nextShare), far(nextShare)].map(n2)
  return vertical
    ? `M ${a1} 0 C ${a1} 50 ${b1} 50 ${b1} 100 L ${b2} 100 C ${b2} 50 ${a2} 50 ${a2} 0 Z`
    : `M 0 ${a1} C 50 ${a1} 50 ${b1} 100 ${b1} L 100 ${b2} C 50 ${b2} 50 ${a2} 0 ${a2} Z`
}

/**
 * One stage's drawing, hidden from screen readers (the stage that holds it carries its name). The
 * words on top (horizontal) or at the start (vertical): the label and the count, with its share
 * of the first when `showConversion` is `'first'` or `'both'` (not on the first stage, nor on
 * the second when its step already says the same number). Then its piece of the funnel: a
 * chart/3 shape whose thickness follows its share of the first, easing to the next stage's. A
 * hairline in border-subtle parts it from the stage before.
 *
 * On that hairline sits the step from the previous stage (`[data-slot="funnel-chart-step"]`,
 * not on the first stage, nor with `showConversion="first"`): a small Badge with the conversion,
 * amber with a warning icon after a big drop-off. Horizontal, it is centred on the hairline, its
 * bottom 4px above the flow's top edge there, and never above the shape's box (it may then
 * overlap the flow). Vertical, it is centred on the hairline (the row's top edge), its end 4px
 * before the flow's near edge there, and never past the shape area's start.
 *
 * The tooltip points at `[data-slot="funnel-chart-marker"]`, on the shape's edge mid-stage.
 * Spans only, so it can sit in a button. Other props, `ref` included, go to its root `span`.
 */
export function FunnelChartStage({
  row,
  nextShare,
  orientation = 'horizontal',
  showConversion = 'previous',
  format,
  dimmed = false,
  enter = false,
  className,
  ...props
}: FunnelChartStageProps) {
  const labels = useLabels()
  const fmt = useFormatters(labels, format)
  const vertical = orientation === 'vertical'
  const next = nextShare ?? row.share
  // The second stage's share of the first is its conversion from the previous: said once.
  const first =
    showsFirst(showConversion) && row.fromFirst != null && !(row.index === 1 && showsPrevious(showConversion)) ? fmt.percent(row.fromFirst) : null
  const step = showsPrevious(showConversion) && row.index > 0
  const edge = (near(row.share) + near(next)) / 2
  // Where the flow's near edge meets the hairline, as a share of the shape's box.
  const boundary = `${n2(near(row.share))}%`

  const words = (
    <span
      className={cn(
        'flex min-w-0 flex-col text-sm leading-(--text-sm--line-height)',
        vertical ? 'w-36 shrink-0 justify-center' : 'px-3 pb-3',
      )}
    >
      <span className="block h-5 truncate text-text-muted">{row.label}</span>
      <span className="flex h-7 min-w-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap tabular-nums">
        <span className="text-lg leading-7 font-semibold text-text-default">{fmt.count(row.value)}</span>
        {first && <span className="min-w-0 truncate text-text-muted">{first}</span>}
      </span>
    </span>
  )

  // A box on the hairline, 0 thick, so the Badge overflows it evenly either side (in either
  // direction of text): from the shape's start to 4px before the flow's edge, never smaller than
  // the Badge, the Badge at its far end. So it sits by the flow, and never past the shape's start.
  const stepBadge = step && (
    <span
      className={cn('absolute start-0 top-0 flex items-center justify-end', vertical ? 'h-0' : 'w-0 flex-col')}
      style={
        vertical
          ? { width: `calc(${boundary} - 4px)`, minWidth: 'max-content' }
          : { height: `calc(${boundary} - 4px)`, minHeight: 'max-content' }
      }
    >
      <StepBadge row={row} fmt={fmt} />
    </span>
  )

  return (
    <span
      aria-hidden
      data-slot="funnel-chart-stage"
      data-orientation={orientation}
      className={cn(
        'flex min-w-0',
        vertical ? 'gap-4' : 'flex-col',
        // The hairline between stages, across words and shape.
        row.index > 0 && (vertical ? 'border-t border-border-subtle' : 'border-s border-border-subtle'),
        className,
      )}
      {...props}
    >
      {words}
      <span className={cn('relative block', vertical ? 'h-22 min-w-0 flex-1' : 'h-50')}>
        <svg
          data-slot="funnel-chart-shape"
          data-orientation={orientation}
          data-tone={row.tone}
          data-enter={enter || undefined}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className={cn(
            'absolute block overflow-visible transition-opacity duration-(--duration-fast) ease-(--ease-out)',
            // 2px off the hairline on either side, so the stages read as steps of one flow.
            vertical ? 'inset-x-0 top-0.5 bottom-0.5 h-[calc(100%-4px)] w-full' : 'inset-y-0 start-0.5 end-0.5 h-full w-[calc(100%-4px)] rtl:-scale-x-100',
            row.tone ? 'text-tone-fg' : 'text-chart-3',
            dimmed && 'opacity-45',
          )}
          // Five steps at most, so a long funnel doesn't keep its last stages waiting.
          style={{ animationDelay: enter ? `${Math.min(row.index, 4) * 25}ms` : undefined }}
        >
          <path d={funnelShapePath(row.share, next, vertical)} fill="currentColor" />
        </svg>
        {stepBadge}
        <span
          data-slot="funnel-chart-marker"
          className="absolute start-1/2 size-0"
          style={vertical ? { top: 0 } : { top: `${edge}%` }}
        />
      </span>
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
  /**
   * Which conversions to show: from the previous stage (the step Badge on each hairline), from
   * the first (after each count), or both. Default 'previous'.
   */
  showConversion?: FunnelConversion
  /** Rows (default) or columns. */
  orientation?: 'horizontal' | 'vertical'
  /** Share of the previous stage lost (0–1) that turns the step amber with a warning icon and adds "big drop-off". Default 0.5. */
  dropOffWarning?: number
  /** Shows the data table under the funnel; it is always in the DOM for screen readers. */
  showTable?: boolean
  /** Skeleton rows at the height of five stages. */
  loading?: boolean
  /** The empty state's title when `stages` is empty. Default "No data". */
  empty?: React.ReactNode
  /** Shows the reason in place of the funnel, read out politely; `true` says "Couldn't load". */
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

// Loading, empty and error keep the loaded funnel's height: horizontal, 48px of words, 12 and a
// 200px shape; vertical, five rows of 88 and their hairlines.
const HORIZONTAL_BODY = 'min-h-[260px]'
const VERTICAL_BODY = 'min-h-[444px]'

/**
 * The funnel in its card. See the block comment above for the anatomy, states and keys. Other
 * props, `ref` included, go to the card's root `div`.
 */
export function FunnelChart({
  stages,
  title,
  range = '',
  format,
  showConversion = 'previous',
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

  // A shape fades in when it mounts (the CSS plays once per element), so new values swap in place.
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
          <div className={cn('flex', vertical ? 'flex-col' : '', body)}>
            <span className="sr-only">{labels.funnelLoading}</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                aria-hidden
                className={cn(
                  'flex min-w-0 flex-1',
                  vertical ? 'h-22 items-center gap-4' : 'flex-col',
                  i > 0 && (vertical ? 'border-t border-border-subtle' : 'border-s border-border-subtle'),
                )}
              >
                <div className={cn('flex flex-col gap-2', vertical ? 'w-36 shrink-0' : 'px-3 pt-1 pb-3')}>
                  {/* 4 + 12 + 8 + 24 + 12: the 60px of a column's words. */}
                  <Skeleton animated className="w-16 max-w-full" />
                  <Skeleton animated height={vertical ? 20 : 24} className="w-12 max-w-full" />
                </div>
                <div className={cn('flex items-center justify-center', vertical ? 'h-full flex-1' : 'h-50 px-0.5')}>
                  {/* The funnel's narrowing, roughly, so the skeleton already reads as one. */}
                  <Skeleton
                    animated
                    shape="rect"
                    className="rounded-none"
                    style={vertical ? { width: `${100 - i * 18}%`, height: '100%' } : { height: `${100 - i * 18}%`, width: '100%' }}
                  />
                </div>
              </div>
            ))}
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
              className={cn('relative', vertical ? 'flex flex-col' : 'grid auto-cols-fr grid-flow-col')}
              onKeyDown={onKeyDown}
              onPointerLeave={() => setHovered(null)}
            >
              {rows.map((row) => {
                const i = row.index
                const name = labels.funnelStageName(row.label, fmt.count(row.value), stageDetails(row, labels, fmt, showConversion))
                const stage = (
                  <FunnelChartStage
                    row={row}
                    nextShare={rows[i + 1]?.share}
                    orientation={orientation}
                    showConversion={showConversion}
                    format={format}
                    dimmed={active != null && active !== i}
                    enter={enter}
                  />
                )
                const focusRing =
                  'rounded-md outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action-focus-ring focus-visible:outline-solid'
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
                value={tooltipValue(activeRow, labels, fmt)}
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
