'use client'

import * as React from 'react'
import { ToggleGroup } from 'radix-ui'
import { cn } from '../lib/utils'
import { Floating } from './floating'

/**
 * The parts every chart card shares, 1:1 with the uiKit `chart/barCard` (3607:18253) and `chart/channelCard`
 * (3608:18797) frames and the parts `chart/legendRow`
 * (3602:17559) and `chart/tooltip` (3602:17522). Plain React and CSS, no chart library.
 *
 * Every card sits in the Card frame: bg/card, 1px border-default, radius-2xl. Header 16px in, title
 * medium 14/14, range regular 13/19.5 text-muted, 2px apart. Footer slot 16px in.
 * period=toggles adds a row of 28px toggles (radius-lg, medium 13/18; on: secondary pressed
 * fill + border-strong + text-default; off: popover + border-default + text-muted) in groups
 * split by 1×16 dividers, scrolling sideways under a 32px fade.
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
  range: string
  data: ChartDatum[]
  /** Period toggles. Nested arrays become groups split by a divider. */
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

export function ChartCard({
  title,
  range,
  periods,
  value,
  onPeriodChange,
  className,
  children,
  bodyClassName,
  ...props
}: Omit<ChartCardBaseProps, 'data' | 'formatValue' | 'highlight'> & { bodyClassName?: string }) {
  const titleId = React.useId()
  return (
    <div
      data-slot="chart-card"
      role="figure"
      aria-labelledby={titleId}
      className={cn('flex flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-card', className)}
      {...props}
    >
      <div className="flex flex-col gap-0.5 px-4 pt-4">
        <p id={titleId} className="text-base leading-[14px] font-medium tracking-normal text-text-default">
          {title}
        </p>
        <p className="text-sm leading-(--text-sm--line-height) text-text-muted">{range}</p>
      </div>
      <div className={cn('flex flex-col gap-4 px-4 pb-4', periods ? 'pt-3' : bodyClassName)}>
        {periods && <PeriodToggles periods={periods} value={value} onValueChange={onPeriodChange} />}
        {children}
      </div>
    </div>
  )
}

function PeriodToggles({
  periods,
  value,
  onValueChange,
}: {
  periods: Periods
  value?: string
  onValueChange?: (v: string) => void
}) {
  const groups: string[][] = Array.isArray(periods[0]) ? (periods as string[][]) : [periods as string[]]
  return (
    <div className="relative">
      <ToggleGroup.Root
        type="single"
        aria-label="Period"
        value={value}
        onValueChange={(v) => v && onValueChange?.(v)}
        className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((group, g) => (
          <React.Fragment key={g}>
            {g > 0 && <span aria-hidden className="h-4 w-px shrink-0 bg-border-default" />}
            <div className="flex shrink-0 items-center gap-1">
              {group.map((p) => (
                <ToggleGroup.Item
                  key={p}
                  value={p}
                  className={cn(
                    'flex h-7 shrink-0 items-center justify-center rounded-lg border px-2.5 text-sm leading-[18px] font-medium whitespace-nowrap',
                    'transition-[background-color,border-color,color,box-shadow] duration-(--duration-fast) ease-(--ease-out) focus-visible:outline-none',
                    'border-border-default bg-bg-popover text-text-muted',
                    'satin-hover:bg-bg-hover satin-hover:text-text-default',
                    'satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
                    'data-[state=on]:border-border-strong data-[state=on]:bg-action-secondary-bg-pressed data-[state=on]:text-text-default',
                  )}
                >
                  {p}
                </ToggleGroup.Item>
              ))}
            </div>
          </React.Fragment>
        ))}
      </ToggleGroup.Root>
      {/* The track runs under the card's right padding and fades out there. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -right-4 w-8 bg-linear-to-r from-bg-card-fade to-bg-card"
      />
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
