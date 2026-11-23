'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { ChartCard, ChartLegendRow, ChartTooltip, defaultFormat, glideAnchor, useGlide, type ChartCardBaseProps, type GlidePoint } from './chart'

/**
 * Channel chart, 1:1 with the uiKit `chart/channelCard` (3608:18797), in the shared card
 * frame (chart.tsx).
 *
 * ChannelCard: the KPI (the sum unless given) with its change badge, a 14px stacked bar of fr
 * segments 2px apart in chart/1–5 (4px outer corners, 1.5px inner), and a legend row per
 * channel (8px swatch, label, value, 32 high, 2px apart), in two columns from 560px. Hover (or `highlight`) fades the
 * other segments to 15% and the other rows to 45%, and fills the row bg/muted. The tooltip over
 * the segment glides from one to the next with the pointer (`useGlide`); from the keyboard it jumps.
 */
export interface ChannelCardProps extends ChartCardBaseProps {}

// Written out whole, so the npm build can point each at its --sa-chart-* name.
const SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']
const seriesColor = (i: number) => SERIES[i % SERIES.length]

export function ChannelCard({
  data,
  formatValue = defaultFormat,
  highlight,
  total,
  ...props
}: ChannelCardProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [byKey, setByKey] = React.useState(false)
  // The active segment's element, read when the tooltip measures: the old one has already left the page by then.
  const anchorRef = React.useRef<HTMLElement | null>(null)
  const setAnchor = React.useCallback((el: HTMLElement | null) => {
    anchorRef.current = el
  }, [])
  const active = (hovered != null && hovered < data.length ? hovered : null) ?? highlight ?? null
  // The tooltip points at the segment, drawn off it by the glide's offset while it moves.
  const barRef = React.useRef<HTMLDivElement>(null)
  const offset = React.useRef<GlidePoint>({ x: 0, y: 0 })
  const updateTooltip = React.useRef<(() => void) | null>(null)
  const tooltipAnchor = React.useMemo(() => glideAnchor(() => anchorRef.current, offset), [])
  useGlide(active, {
    measure: () => {
      const segment = active == null ? null : barRef.current?.children[active]
      if (!segment || !barRef.current) return null
      const r = segment.getBoundingClientRect()
      return { x: r.left + r.width / 2 - barRef.current.getBoundingClientRect().left, y: 0 }
    },
    apply: (o) => {
      offset.current = o
      updateTooltip.current?.()
    },
    immediate: byKey,
  })
  const hover = (i: number) => {
    setByKey(false)
    setHovered(i)
  }
  const sum = data.reduce((n, d) => n + d.value, 0)
  const last = data.length - 1

  return (
    <ChartCard total={total ?? formatValue(sum)} {...props}>
      <div className="relative flex flex-col gap-4" onPointerLeave={() => setHovered(null)}>
        <div
          ref={barRef}
          aria-hidden
          className="relative grid h-3.5 gap-x-0.5"
          style={{ gridTemplateColumns: data.map((d) => `minmax(0, ${Math.max(d.value, 0)}fr)`).join(' ') }}
        >
          {data.map((d, i) => (
            <span
              key={d.label}
              ref={active === i ? setAnchor : undefined}
              onPointerEnter={() => hover(i)}
              className={cn(
                'relative rounded-[1.5px] transition-opacity duration-(--duration-fast) ease-(--ease-out)',
                // The 14px bar is hit 16px above and below it too (the hit area in chart.tsx): a 46px target.
                'before:absolute before:inset-x-0 before:-inset-y-4',
                // The shares read from the start side, so the outer corners are logical.
                i === 0 && 'rounded-s-[4px]',
                i === last && 'rounded-e-[4px]',
                active !== null && active !== i && 'opacity-15',
              )}
              style={{ background: seriesColor(i) }}
            />
          ))}
        </div>
        {/* One tooltip for the bar, so it can glide from segment to segment. */}
        {active != null && (
          <ChartTooltip
            anchor={tooltipAnchor}
            sideOffset={8}
            updateRef={updateTooltip}
            label={data[active].tooltipLabel ?? data[active].label}
            value={formatValue(data[active].value)}
          />
        )}
        <ul
          className="flex flex-col gap-0.5 @min-[560px]:grid @min-[560px]:grid-flow-col @min-[560px]:auto-cols-fr @min-[560px]:gap-x-6"
          style={{ gridTemplateRows: `repeat(${Math.ceil(data.length / 2)}, auto)` }}
          aria-label={props.title}
        >
          {data.map((d, i) => (
            <li
              key={d.label}
              tabIndex={0}
              onPointerEnter={() => hover(i)}
              onFocus={() => {
                setByKey(true)
                setHovered(i)
              }}
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
