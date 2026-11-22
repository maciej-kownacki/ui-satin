'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { ChartCard, ChartLegendRow, ChartTooltip, defaultFormat, glideAnchor, useGlide, type ChartCardBaseProps, type GlidePoint } from './chart'

/**
 * Bar chart, 1:1 with the uiKit `chart/barCard` (3607:18253) and its `chart/barColumn`
 * (3602:17543), in the shared card frame (chart.tsx).
 *
 * BarCard: a 206px plot, 32px axis gutter, 4 dashed border-subtle gridlines at nice ticks,
 * axis labels regular 12/18 text-muted, columns 8px apart with a 180px track, bars radius-md
 * in chart/3 and day labels medium 13 text-muted 6px below. Hover (or `highlight`) keeps the
 * hovered bar, outlines it 2px out in chart/3, shows its value above and bolds its day; the
 * other bars dim to a 30% tint of chart/3 on bg/card, so they follow the bar, not the brand.
 * Moving along the bars, the tooltip glides from one to the next (`useGlide`); from the keyboard it jumps.
 * The KPI above defaults to the sum, in full (formatValue is for the axis); an optional legend row can sit under the plot.
 *
 * When the data changes (a new period, say) the bars regrow from the baseline in 250 ms on
 * ease-out, revealed by clip-path so their rounded tops stay whole, and the day labels and the
 * axis fade in on the new scale. Not on the first paint; under reduced motion, or with
 * `reducedMotion`, the bars swap at once.
 */
export function niceMax(max: number) {
  if (max <= 0) return 4
  const raw = max / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 1.5, 2, 2.5, 3, 5, 7.5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  return step * 4
}


export interface BarCardProps extends ChartCardBaseProps {
  /** The legend row under the plot. */
  legend?: { label: string; value?: string; note?: string }
  /** Unit after the value in the tooltip ("covers"). */
  unit?: string
  /** Swap the bars without motion when the data changes, as under prefers-reduced-motion. */
  reducedMotion?: boolean
}

const TRACK = 180

export function BarCard({
  data,
  formatValue = defaultFormat,
  highlight,
  legend,
  unit,
  reducedMotion,
  total,
  ...props
}: BarCardProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [byKey, setByKey] = React.useState(false)
  // The active bar's element, read when the tooltip measures: the old one has already left the page by then.
  const anchorRef = React.useRef<HTMLElement | null>(null)
  const setAnchor = React.useCallback((el: HTMLElement | null) => {
    anchorRef.current = el
  }, [])
  const active = (hovered != null && hovered < data.length ? hovered : null) ?? highlight ?? null
  // The tooltip points at the bar's value, drawn off it by the glide's offset while it moves.
  const plotRef = React.useRef<HTMLDivElement>(null)
  const offset = React.useRef<GlidePoint>({ x: 0, y: 0 })
  const updateTooltip = React.useRef<(() => void) | null>(null)
  const tooltipAnchor = React.useMemo(() => glideAnchor(() => anchorRef.current, offset), [])
  useGlide(active, {
    measure: () => {
      const bar = active == null ? null : plotRef.current?.querySelectorAll('li')[active]
      if (!bar || !plotRef.current) return null
      const r = bar.getBoundingClientRect()
      return { x: r.left + r.width / 2 - plotRef.current.getBoundingClientRect().left, y: TRACK - (data[active!].value / max) * TRACK }
    },
    apply: (o) => {
      offset.current = o
      updateTooltip.current?.()
    },
    immediate: byKey,
  })
  // Counts real changes to the data (not a new array with the same values), so the bars
  // remount and regrow; zero until the first change.
  const signature = data.map((d) => `${d.label}:${d.value}`).join('|')
  const [redraw, setRedraw] = React.useState({ signature, n: 0 })
  if (redraw.signature !== signature) setRedraw({ signature, n: redraw.n + 1 })
  const regrow = redraw.n > 0 && !reducedMotion
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const ticks = [4, 3, 2, 1, 0].map((i) => (max / 4) * i)
  const sum = data.reduce((n, d) => n + d.value, 0)

  return (
    <ChartCard total={total ?? defaultFormat(sum)} {...props}>
      <div className="pt-2">
        {/* Time runs left to right in any page, as on the line chart, with the scale on the left. */}
        <div ref={plotRef} dir="ltr" className="relative flex h-[206px] items-end gap-2 pl-8" onPointerLeave={() => setHovered(null)}>
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
              key={`${redraw.n}-${i}`}
              aria-hidden
              className={cn(
                'absolute left-6 w-6 -translate-x-full text-right text-xs leading-[18px] text-text-muted',
                regrow && 'satin-bar-fade',
              )}
              style={{ top: (TRACK / 4) * i - 9 }}
            >
              {formatValue(t)}
            </span>
          ))}
          <ul key={redraw.n} className="contents" aria-label={props.title}>
            {data.map((d, i) => {
              const isActive = active === i
              const dimmed = active !== null && !isActive
              const height = (d.value / max) * TRACK
              return (
                <li
                  key={d.label}
                  tabIndex={0}
                  aria-label={`${d.tooltipLabel ?? d.label}: ${formatValue(d.value)}${unit ? ` ${unit}` : ''}`}
                  onPointerEnter={() => {
                    setByKey(false)
                    setHovered(i)
                  }}
                  onFocus={() => {
                    setByKey(true)
                    setHovered(i)
                  }}
                  onBlur={() => setHovered(null)}
                  className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md focus-visible:outline-none"
                >
                  <div className="relative flex w-full flex-col items-center justify-end gap-1.5" style={{ height: TRACK }}>
                    {isActive && (
                      <span ref={setAnchor} className="text-sm leading-(--text-sm--line-height) font-medium text-text-default">
                        {formatValue(d.value)}
                      </span>
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        'w-full rounded-md transition-[background-color,outline-color] duration-(--duration-fast) ease-(--ease-out)',
                        // Dimmed bars stay a tint of chart/3 on the card, so the brand colour never reaches them.
                        dimmed ? 'bg-[color-mix(in_oklab,var(--chart-3)_30%,var(--bg-card))]' : 'bg-chart-3',
                        isActive && 'outline outline-offset-2 outline-chart-3',
                        regrow && 'satin-bar-regrow',
                      )}
                      style={{ height }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-sm leading-(--text-sm--line-height) font-medium whitespace-nowrap',
                      isActive ? 'text-text-default' : 'text-text-muted',
                      regrow && 'satin-bar-fade',
                    )}
                  >
                    {d.label}
                  </span>
                </li>
              )
            })}
          </ul>
          {/* One tooltip for the plot, 4px above the active bar's value, so it can glide from bar to bar. */}
          {active != null && (
            <ChartTooltip
              anchor={tooltipAnchor}
              updateRef={updateTooltip}
              label={data[active].tooltipLabel ?? data[active].label}
              value={`${formatValue(data[active].value)}${unit ? ` ${unit}` : ''}`}
            />
          )}
        </div>
      </div>
      {legend && (
        <ChartLegendRow
          color="var(--chart-3)"
          label={legend.label}
          value={legend.value ?? formatValue(sum)}
          note={legend.note}
        />
      )}
    </ChartCard>
  )
}
