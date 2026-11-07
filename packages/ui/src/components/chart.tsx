import * as React from 'react'
import { ToggleGroup } from 'radix-ui'
import { cn } from '../lib/utils'
import { Badge } from './badge'
import { Floating } from './floating'

/**
 * Chart cards, 1:1 with the uiKit `chart/barCard` (3607:18253) and `chart/channelCard`
 * (3608:18797) sets and their parts `chart/barColumn` (3602:17543), `chart/legendRow`
 * (3602:17559) and `chart/tooltip` (3602:17522). Plain React and CSS, no chart library.
 *
 * Both sit in the Card frame: bg/card, 1px border-default, radius-2xl. Header 16px in, title
 * medium 14/14, range regular 13/19.5 text-muted, 2px apart. Footer slot 16px in.
 * period=toggles adds a row of 28px toggles (radius-lg, medium 13/18; on: secondary pressed
 * fill + border-strong + text-default; off: popover + border-default + text-muted) in groups
 * split by 1×16 dividers, scrolling sideways under a 32px fade.
 *
 * BarCard: a 206px plot, 32px axis gutter, 4 dashed border-subtle gridlines at nice ticks,
 * axis labels regular 12/18 text-muted, columns 8px apart with a 180px track, bars radius-md
 * in chart/3 and day labels medium 13 text-muted 6px below. Hover (or `highlight`) keeps the
 * hovered bar, outlines it 2px out in chart/3, shows its value above and bolds its day; the
 * other bars dim to status/brand-border. A legend row sits under the plot.
 *
 * ChannelCard: a KPI (semibold 20/30) with a green change badge, a 14px stacked bar of fr
 * segments 2px apart in chart/1–5 (4px outer corners, 1.5px inner), and a legend row per
 * channel (8px swatch, label, value, 32 high, 2px apart). Hover (or `highlight`) fades the
 * other segments to 15% and the other rows to 45%, and fills the row bg/muted.
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

type Periods = string[] | string[][]

interface ChartCardBaseProps extends Omit<React.ComponentProps<'div'>, 'title'> {
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
  /** Footer slot, e.g. a tertiary and an inverse button. */
  footer?: React.ReactNode
}

const defaultFormat = (n: number) => n.toLocaleString('en-US')

/* ---------- shared parts ---------- */

function ChartCard({
  title,
  range,
  periods,
  value,
  onPeriodChange,
  footer,
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
      {footer && <div className="flex items-center justify-between p-4">{footer}</div>}
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
        'transition-[background-color,opacity] duration-(--duration-fast) ease-(--ease-out)',
        active && 'bg-bg-muted',
        dimmed && 'opacity-45',
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
function niceMax(max: number) {
  if (max <= 0) return 4
  const raw = max / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 1.5, 2, 2.5, 3, 5, 7.5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  return step * 4
}

/* ---------- BarCard ---------- */

export interface BarCardProps extends ChartCardBaseProps {
  /** The legend row under the plot. */
  legend?: { label: string; value?: string; note?: string }
  /** Unit after the value in the tooltip ("covers"). */
  unit?: string
}

const TRACK = 180

export function BarCard({
  data,
  formatValue = defaultFormat,
  highlight,
  legend,
  unit,
  periods,
  ...props
}: BarCardProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  const active = hovered ?? highlight ?? null
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const ticks = [4, 3, 2, 1, 0].map((i) => (max / 4) * i)
  const total = data.reduce((n, d) => n + d.value, 0)

  return (
    <ChartCard periods={periods} bodyClassName="pt-8" {...props}>
      <div className={periods ? 'pt-[9px]' : undefined}>
        <div className="relative flex h-[206px] items-end gap-2 pl-8" onPointerLeave={() => setHovered(null)}>
          {/* Gridlines at each tick but zero, dashed border-subtle. */}
          {ticks.slice(0, 4).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute right-0 left-8 h-px border-t border-dashed border-border-subtle"
              style={{ top: (TRACK / 4) * i }}
            />
          ))}
          {ticks.map((t, i) => (
            <span
              key={t}
              aria-hidden
              className="absolute left-6 w-6 -translate-x-full text-right text-xs leading-[18px] text-text-muted"
              style={{ top: (TRACK / 4) * i - 9 }}
            >
              {formatValue(t)}
            </span>
          ))}
          <ul className="contents" aria-label={props.title}>
            {data.map((d, i) => {
              const isActive = active === i
              const dimmed = active !== null && !isActive
              const height = (d.value / max) * TRACK
              return (
                <li
                  key={d.label}
                  tabIndex={0}
                  aria-label={`${d.tooltipLabel ?? d.label}: ${formatValue(d.value)}${unit ? ` ${unit}` : ''}`}
                  onPointerEnter={() => setHovered(i)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md focus-visible:outline-none"
                >
                  <div className="relative flex w-full flex-col items-center justify-end gap-1.5" style={{ height: TRACK }}>
                    {isActive && (
                      <>
                        {/* The tooltip floats 4px above the value. */}
                        <ChartTooltip
                          anchor={anchor}
                          label={d.tooltipLabel ?? d.label}
                          value={`${formatValue(d.value)}${unit ? ` ${unit}` : ''}`}
                        />
                        <span ref={setAnchor} className="text-sm leading-(--text-sm--line-height) font-medium text-text-default">
                          {formatValue(d.value)}
                        </span>
                      </>
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        'w-full rounded-md transition-[background-color,outline-color] duration-(--duration-fast) ease-(--ease-out)',
                        dimmed ? 'bg-status-brand-border' : 'bg-chart-3',
                        isActive && 'outline outline-offset-2 outline-chart-3',
                      )}
                      style={{ height }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-sm leading-(--text-sm--line-height) font-medium whitespace-nowrap',
                      isActive ? 'text-text-default' : 'text-text-muted',
                    )}
                  >
                    {d.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      {legend && (
        <ChartLegendRow
          color="var(--chart-3)"
          label={legend.label}
          value={legend.value ?? formatValue(total)}
          note={legend.note}
        />
      )}
    </ChartCard>
  )
}

/* ---------- ChannelCard ---------- */

export interface ChannelCardProps extends ChartCardBaseProps {
  /** The KPI, e.g. "€48,260". Defaults to the formatted sum. */
  total?: string
  /** Change badge next to the KPI, e.g. "+5.2%". */
  change?: string
}

const seriesColor = (i: number) => `var(--chart-${(i % 5) + 1})`

export function ChannelCard({
  data,
  formatValue = defaultFormat,
  highlight,
  total,
  change,
  periods,
  ...props
}: ChannelCardProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  const active = hovered ?? highlight ?? null
  const sum = data.reduce((n, d) => n + d.value, 0)
  const last = data.length - 1

  return (
    <ChartCard periods={periods} bodyClassName="pt-4" {...props}>
      <div className="relative flex flex-col gap-4" onPointerLeave={() => setHovered(null)}>
        <div className="flex items-center gap-2">
          <span className="text-xl leading-(--text-xl--line-height) font-semibold text-text-default">{total ?? formatValue(sum)}</span>
          {change && (
            <Badge tone="green" size="sm" className="[box-shadow:inset_0_0_0_1px_var(--tone-border)]">
              {change}
            </Badge>
          )}
        </div>
        <div
          aria-hidden
          className="relative grid h-3.5 gap-x-0.5"
          style={{ gridTemplateColumns: data.map((d) => `minmax(0, ${Math.max(d.value, 0)}fr)`).join(' ') }}
        >
          {data.map((d, i) => (
            <span
              key={d.label}
              ref={active === i ? setAnchor : undefined}
              onPointerEnter={() => setHovered(i)}
              className={cn(
                'relative rounded-[1.5px] transition-opacity duration-(--duration-fast) ease-(--ease-out)',
                i === 0 && 'rounded-l-[4px]',
                i === last && 'rounded-r-[4px]',
                active !== null && active !== i && 'opacity-15',
              )}
              style={{ background: seriesColor(i) }}
            >
              {active === i && (
                <ChartTooltip anchor={anchor} sideOffset={8} label={d.tooltipLabel ?? d.label} value={formatValue(d.value)} />
              )}
            </span>
          ))}
        </div>
        <ul className="flex flex-col gap-0.5" aria-label={props.title}>
          {data.map((d, i) => (
            <li
              key={d.label}
              tabIndex={0}
              onPointerEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              aria-label={`${d.label}: ${formatValue(d.value)}, ${Math.round((d.value / (sum || 1)) * 100)}%`}
              className="rounded-md focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]"
            >
              <ChartLegendRow
                color={seriesColor(i)}
                label={d.label}
                value={formatValue(d.value)}
                active={active === i}
                dimmed={active !== null && active !== i}
              />
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  )
}
