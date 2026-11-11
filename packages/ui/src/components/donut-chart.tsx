'use client'

import * as React from 'react'
import { ChartCard, ChartLegendPill, defaultFormat, type ChartCardBaseProps } from './chart'

/**
 * Donut chart, 1:1 with the uiKit `chart/donutCard` (4067:7096), in the shared ChartCard
 * (chart.tsx).
 *
 * A 184px ring (20px thick) of chart/1–5 segments starting at 12 o'clock, a 2px gap between
 * them, with the sum in the middle (text/xl semibold) over `centerLabel` in text/muted. The sum
 * lives in the ring, so the card's summary shows only the range. Under the ring a legend of
 * plain pills (swatch and label, the value is in the ring on hover) in two columns, 16 × 8 apart.
 * From 560px the legend moves to the right of the ring as one column.
 *
 * Hover a segment or its pill (or set `highlight`): the other segments fade to 15%, the other
 * pills' content to 45% (the hovered one fills bg/hover), and the middle shows the hovered value over "Label · 20%".
 */
export interface DonutCardProps extends Omit<ChartCardBaseProps, 'total' | 'change'> {
  /** Under the sum in the middle. */
  centerLabel?: string
}

const SIZE = 184
const STROKE = 20
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R
const GAP = 2

const seriesColor = (i: number) => `var(--chart-${(i % 5) + 1})`

export function DonutCard({ data, formatValue = defaultFormat, highlight, centerLabel = 'Total', ...props }: DonutCardProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const active = (hovered != null && hovered < data.length ? hovered : null) ?? highlight ?? null
  const sum = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1
  const share = (v: number) => Math.round((v / sum) * 100)

  let offset = 0
  const arcs = data.map((d, i) => {
    const len = (Math.max(0, d.value) / sum) * C
    const arc = { i, start: offset, len: Math.max(0, len - GAP) }
    offset += len
    return arc
  })

  return (
    <ChartCard {...props}>
      <div
        className="flex flex-col items-center gap-4 @min-[560px]:flex-row @min-[560px]:gap-8"
        onPointerLeave={() => setHovered(null)}
      >
        <div className="relative shrink-0 py-2" style={{ width: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="block -rotate-90">
            {arcs.map(({ i, start, len }) => (
              <circle
                key={data[i].label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={seriesColor(i)}
                strokeWidth={STROKE}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-start}
                onPointerEnter={() => setHovered(i)}
                className="transition-opacity duration-(--duration-fast) ease-(--ease-out)"
                style={{ opacity: active !== null && active !== i ? 0.15 : 1 }}
              />
            ))}
          </svg>
          <div aria-live="polite" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl leading-(--text-xl--line-height) font-semibold text-text-default tabular-nums">
              {formatValue(active != null ? data[active].value : sum)}
            </span>
            <span className="text-sm leading-(--text-sm--line-height) text-text-muted">
              {active != null ? `${data[active].label} · ${share(data[active].value)}%` : centerLabel}
            </span>
          </div>
        </div>
        <ul
          className="grid w-full grid-cols-2 gap-x-4 gap-y-2 px-2 @min-[560px]:flex @min-[560px]:flex-1 @min-[560px]:flex-col @min-[560px]:gap-1 @min-[560px]:px-0"
          aria-label={props.title}
        >
          {data.map((d, i) => (
            <li
              key={d.label}
              tabIndex={0}
              onPointerEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              aria-label={`${d.label}: ${formatValue(d.value)}, ${share(d.value)}%`}
              className="min-w-0 rounded-pill outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]"
            >
              <ChartLegendPill
                variant="plain"
                className="flex w-full"
                color={seriesColor(i)}
                label={d.label}
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
