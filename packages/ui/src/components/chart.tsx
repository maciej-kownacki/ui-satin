'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { Badge } from './badge'
import { Floating } from './floating'
import { Select } from './select'
import { useSatinLabels } from './labels'

/**
 * The parts every chart card shares, 1:1 with the uiKit `chart/barCard` (3607:18253) and `chart/channelCard`
 * (3608:18797) frames and the parts `chart/legendRow`
 * (3602:17559) and `chart/tooltip` (3602:17522). Plain React and CSS, no chart library.
 *
 * Every card sits in ChartCard: the title and a period Select on one row, the KPI with its
 * change and the range under it, then the chart.
 *
 * The tooltip is a text/default pill with bg/canvas text, medium label + value at 72%, 10×6
 * padding, radius-md, a 12×6 pointer and a two-step sm shadow.
 */

export type ChartDatum = {
  label: string
  value: number
  /** Tooltip title; defaults to the label. */
  tooltipLabel?: string
}

export type Periods = string[] | string[][]

export interface ChartCardBaseProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  title: string
  /** The dates the card covers, under the KPI, e.g. "Oct 26 – Nov 1, 2026 · vs previous 7 days". */
  range: string
  data: ChartDatum[]
  /** The KPI under the title, e.g. "€48,260". Cards that have one default it to the formatted sum. */
  total?: string
  /** The change badge after the KPI, e.g. "+5.2%". A leading minus turns it red. */
  change?: string
  /** Periods for the Select in the header. Nested arrays become titled-less groups split by a rule. */
  periods?: Periods
  /** The selected period. */
  value?: string
  onPeriodChange?: (period: string) => void
  /** Formats values in the tooltip, the legend and the axis. */
  formatValue?: (value: number) => string
  /** Index of the datum shown as hovered (state sheets, docs). */
  highlight?: number
}

export const defaultFormat = (n: number) => n.toLocaleString('en-US')

/* ---------- shared parts ---------- */

/**
 * The card every chart sits in (uiKit "chart explorations" A, 4084:3591): bg/card, 1px
 * border-default, radius-2xl, 16px in and 16 between rows. Row one: the title (16/24 medium,
 * text/default) and, when there are `periods`, a small Select for the period at the right. Row
 * two: the KPI (text/xl semibold) with its change badge, and the range under it in text/muted, 2px
 * apart; without a KPI the range sits 4px under the title. Then the chart. The card is a size
 * container, so a chart can lay itself out wider from 560px (`@min-[560px]:`).
 */
export function ChartCard({
  title,
  range,
  total,
  change,
  periods,
  value,
  onPeriodChange,
  className,
  children,
  ...props
}: Omit<ChartCardBaseProps, 'data' | 'formatValue' | 'highlight'>) {
  const titleId = React.useId()
  return (
    <div
      data-slot="chart-card"
      role="figure"
      aria-labelledby={titleId}
      className={cn('@container flex flex-col gap-4 overflow-hidden rounded-2xl border border-border-default bg-bg-card p-4', className)}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <div className="flex min-h-7 items-center gap-3">
          <p id={titleId} className="min-w-0 flex-1 truncate text-lg leading-6 font-medium text-text-default">
            {title}
          </p>
          {periods && <PeriodSelect periods={periods} value={value} onValueChange={onPeriodChange} />}
        </div>
        {/* Without a KPI the range sits right under the title. */}
        {total == null && <p className="text-sm leading-(--text-sm--line-height) text-text-muted">{range}</p>}
      </div>
      {total != null && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-(--text-xl--line-height) font-semibold text-text-default tabular-nums">{total}</span>
            {change && (
              <Badge
                tone={/^[−-]/.test(change) ? 'red' : 'green'}
                size="sm"
                className="[box-shadow:inset_0_0_0_1px_var(--tone-border)]"
              >
                {change}
              </Badge>
            )}
          </div>
          <p className="text-sm leading-(--text-sm--line-height) text-text-muted">{range}</p>
        </div>
      )}
      {children}
    </div>
  )
}

function PeriodSelect({
  periods,
  value,
  onValueChange,
}: {
  periods: Periods
  value?: string
  onValueChange?: (v: string) => void
}) {
  const labels = useSatinLabels()
  const groups: string[][] = Array.isArray(periods[0]) ? (periods as string[][]) : [periods as string[]]
  return (
    <Select
      size="sm"
      aria-label={labels.period}
      options={groups.map((g) => ({ options: g.map((p) => ({ value: p, label: p })) }))}
      value={value}
      onValueChange={onValueChange}
      wrapperClassName="w-[132px] shrink-0"
    />
  )
}

/**
 * chart/legendPill (4061:4182).
 * - `outline`: an outline pill with no fill — 8px swatch, label, value 6 apart, 6 / 10 in. Active
 *   turns the ring border-strong.
 * - `plain` (the Donut legend): no ring and no value, 6 / 8 in; active fills bg/hover, as plain
 *   controls do on hover.
 * Dimmed fades the content to 45%, never the ground.
 */
export function ChartLegendPill({
  color,
  label,
  value,
  variant = 'outline',
  active,
  dimmed,
  className,
  ...props
}: {
  color: string
  label: React.ReactNode
  value?: React.ReactNode
  variant?: 'outline' | 'plain'
  active?: boolean
  dimmed?: boolean
} & React.ComponentProps<'div'>) {
  const plain = variant === 'plain'
  return (
    <div
      data-slot="chart-legend-pill"
      data-variant={variant}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-pill text-sm leading-(--text-sm--line-height) whitespace-nowrap',
        'transition-[border-color,background-color] duration-(--duration-fast) ease-(--ease-out)',
        '*:transition-opacity *:duration-(--duration-fast) *:ease-(--ease-out)',
        plain ? 'px-2' : 'border px-2.5',
        !plain && (active ? 'border-border-strong' : 'border-border-default'),
        plain && active && 'bg-bg-hover',
        dimmed && '*:opacity-45',
        className,
      )}
      {...props}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="min-w-0 truncate text-text-default">{label}</span>
      {value != null && <span className="font-medium text-text-default tabular-nums">{value}</span>}
    </div>
  )
}

const pointerPath = 'M1.17721 0.5H13.1772L8.23721 5.62C7.65721 6.22 6.69721 6.22 6.11721 5.62L1.17721 0.5Z'
const tooltipShadow = '[filter:drop-shadow(0_2px_2px_var(--effect-shadow-sm))_drop-shadow(0_4px_3px_var(--effect-shadow-sm))]'

function TooltipPill({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-text-default px-2.5 py-1.5 text-sm leading-(--text-sm--line-height) whitespace-nowrap text-bg-canvas">
      <span className="font-medium">{label}</span>
      <span className="opacity-72">{value}</span>
    </div>
  )
}

/**
 * The chart tooltip pill with its pointer. Exported for custom charts.
 * With `anchor` it floats over the page (see Floating): it never gets cut off by the card,
 * flips below when there's no room above, slides in from the screen edge, and its pointer
 * keeps pointing at the anchor. Without it, it renders in place.
 */
export function ChartTooltip({
  label,
  value,
  anchor,
  sideOffset = 4,
  className,
  ...props
}: {
  label: React.ReactNode
  value: React.ReactNode
  /** The element it points at. */
  anchor?: Element | null
  /** Gap between the anchor and the pointer's tip. */
  sideOffset?: number
} & React.ComponentProps<'div'>) {
  if (anchor !== undefined) {
    // The pointer is 6 high and overlaps the pill by 1px.
    return (
      <Floating anchor={anchor} side="top" sideOffset={sideOffset + 5} className="pointer-events-none">
        {({ side, arrowRef, arrowStyle }) => (
          <div data-slot="chart-tooltip" className={cn('relative', tooltipShadow, className)} {...props}>
            <TooltipPill label={label} value={value} />
            <svg
              ref={arrowRef as React.Ref<SVGSVGElement>}
              width="12"
              height="6"
              viewBox="1.17 0.5 12 5.57"
              aria-hidden
              className={cn('absolute block text-text-default', side === 'bottom' ? 'bottom-full -mb-px rotate-180' : 'top-full -mt-px')}
              style={arrowStyle}
            >
              <path d={pointerPath} fill="currentColor" />
            </svg>
          </div>
        )}
      </Floating>
    )
  }
  return (
    <div
      data-slot="chart-tooltip"
      className={cn('pointer-events-none flex flex-col items-center', tooltipShadow, className)}
      {...props}
    >
      <TooltipPill label={label} value={value} />
      <svg width="12" height="6" viewBox="1.17 0.5 12 5.57" aria-hidden className="-mt-px block text-text-default">
        <path d={pointerPath} fill="currentColor" />
      </svg>
    </div>
  )
}

/** One legend row: 8px swatch, label, value and an optional note. */
export function ChartLegendRow({
  color,
  label,
  value,
  note,
  active,
  dimmed,
  className,
  ...props
}: {
  color: string
  label: React.ReactNode
  value: React.ReactNode
  note?: React.ReactNode
  active?: boolean
  dimmed?: boolean
} & React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="chart-legend-row"
      className={cn(
        'flex h-8 items-center gap-2 rounded-md px-2 py-1.5 text-sm leading-(--text-sm--line-height)',
        // The dim fades the row's content, never its ground: on the row itself it would multiply
        // the leaving highlight's fade-out and cut it short.
        'transition-[background-color] duration-(--duration-fast) ease-(--ease-out)',
        '*:transition-opacity *:duration-(--duration-fast) *:ease-(--ease-out)',
        active && 'bg-bg-muted',
        dimmed && '*:opacity-45',
        className,
      )}
      {...props}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="min-w-0 flex-1 text-text-default">{label}</span>
      <span className="shrink-0 font-medium whitespace-nowrap text-text-default">{value}</span>
      {note && <span className="shrink-0 text-right whitespace-nowrap text-text-muted">{note}</span>}
    </div>
  )
}

/** Rounds the top of the axis up to a nice number that splits into four steps. */
