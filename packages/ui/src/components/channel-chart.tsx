'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { ChartCard, ChartLegendRow, ChartTooltip, defaultFormat, type ChartCardBaseProps } from './chart'

/**
 * Channel chart, 1:1 with the uiKit `chart/channelCard` (3608:18797), in the shared card
 * frame (chart.tsx).
 *
 * ChannelCard: the KPI (the sum unless given) with its change badge, a 14px stacked bar of fr
 * segments 2px apart in chart/1–5 (4px outer corners, 1.5px inner), and a legend row per
 * channel (8px swatch, label, value, 32 high, 2px apart), in two columns from 560px. Hover (or `highlight`) fades the
 * other segments to 15% and the other rows to 45%, and fills the row bg/muted.
 */
export interface ChannelCardProps extends ChartCardBaseProps {}

const seriesColor = (i: number) => `var(--chart-${(i % 5) + 1})`

export function ChannelCard({
  data,
  formatValue = defaultFormat,
  highlight,
  total,
  ...props
}: ChannelCardProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  const active = hovered ?? highlight ?? null
  const sum = data.reduce((n, d) => n + d.value, 0)
  const last = data.length - 1

  return (
    <ChartCard total={total ?? formatValue(sum)} {...props}>
      <div className="relative flex flex-col gap-4" onPointerLeave={() => setHovered(null)}>
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
        <ul
          className="flex flex-col gap-0.5 @min-[560px]:grid @min-[560px]:grid-flow-col @min-[560px]:auto-cols-fr @min-[560px]:gap-x-6"
          style={{ gridTemplateRows: `repeat(${Math.ceil(data.length / 2)}, auto)` }}
          aria-label={props.title}
        >
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
