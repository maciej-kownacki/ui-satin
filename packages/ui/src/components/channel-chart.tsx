import * as React from 'react'
import { cn } from '../lib/utils'
import { Badge } from './badge'
import { ChartCard, ChartLegendRow, ChartTooltip, defaultFormat, type ChartCardBaseProps } from './chart'

/**
 * Channel chart, 1:1 with the uiKit `chart/channelCard` (3608:18797), in the shared card
 * frame (chart.tsx).
 *
 * ChannelCard: a KPI (semibold 20/30) with a green change badge, a 14px stacked bar of fr
 * segments 2px apart in chart/1–5 (4px outer corners, 1.5px inner), and a legend row per
 * channel (8px swatch, label, value, 32 high, 2px apart). Hover (or `highlight`) fades the
 * other segments to 15% and the other rows to 45%, and fills the row bg/muted.
 */
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
