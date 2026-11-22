'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { niceMax } from './bar-chart'
import { ChartCard, ChartTooltip, defaultFormat, glideTransform, useGlide, type ChartCardBaseProps, type GlidePoint } from './chart'
import { useSatinLabels } from './labels'

/**
 * Line and Area chart, 1:1 with the uiKit `chart/lineCard` (4076:6759) and `chart/areaCard`
 * (4070:7627), in the shared ChartCard (chart.tsx).
 *
 * One metric over the period: a smooth 2px line in chart/3 (monotone, so it never overshoots a
 * point) over a 180px plot with a 32px axis gutter and 4 dashed border-subtle gridlines at nice
 * ticks, the x labels 6px under it (about seven, five when they are dates, evenly picked, or
 * every `labelEvery`th counted back from the last point; the last one ends at the plot's edge). `AreaCard` fills under
 * the line with chart/3 fading from 28% to nothing at the baseline. No legend: the title says
 * what is plotted and the KPI above gives its total.
 *
 * Hover (or `highlight`) picks the point nearest the cursor, so with a point per day the tooltip
 * follows the cursor along the line, its date and value changing as it goes: a dashed
 * border-strong drop line from the point to the baseline, an 8px dot ringed in chart/3 on bg/card,
 * the tooltip above it and its x label in text/default when that label is shown. The dot, the
 * drop line and the tooltip glide from point to point after the pointer (`useGlide`); the x label
 * and the live text change at once. Every point is also reachable with the keyboard (arrow keys on
 * the focused plot), where they jump. When the data changes the plot fades in on its new scale, unless motion is
 * reduced.
 */
export interface LineCardProps extends ChartCardBaseProps {
  /** Unit after the value in the tooltip ("orders"). */
  unit?: string
  /** Fill under the line. `AreaCard` sets it. */
  area?: boolean
  /** Show every nth x label, counted back from the last point (3 for every third month of a year).
   *  Left out, about seven labels spread across the plot (five when they are dates). */
  labelEvery?: number
  /** Swap the plot without the fade when the data changes, as under prefers-reduced-motion. */
  reducedMotion?: boolean
}

const TRACK = 180

/**
 * Monotone cubic (Fritsch–Carlson) through the points, as an SVG path: the curve the Line and
 * Area chart draw, which never overshoots a point. Exported for custom charts and sparklines that
 * should draw the same line (Satin Pro's Stat card uses it).
 */
export function smoothPath(pts: [number, number][]) {
  const n = pts.length
  if (n === 0) return ''
  if (n === 1) return `M ${pts[0][0]} ${pts[0][1]}`
  const dx: number[] = [], dy: number[] = [], m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0]
    dy[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]
  }
  m[0] = dy[0]
  m[n - 1] = dy[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = dy[i - 1] * dy[i] <= 0 ? 0 : (dy[i - 1] + dy[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (dy[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / dy[i], b = m[i + 1] / dy[i], h = a * a + b * b
    if (h > 9) {
      const t = 3 / Math.sqrt(h)
      m[i] = t * a * dy[i]
      m[i + 1] = t * b * dy[i]
    }
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C ${pts[i][0] + h} ${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h} ${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]} ${pts[i + 1][1]}`
  }
  return d
}

export function LineCard({
  data,
  formatValue = defaultFormat,
  highlight,
  unit,
  area = false,
  labelEvery,
  reducedMotion,
  total,
  ...props
}: LineCardProps) {
  const labels = useSatinLabels()
  const gradientId = React.useId()
  const [hovered, setHovered] = React.useState<number | null>(null)
  // Whether the point on show was picked with the keyboard: those moves jump, the pointer's glide.
  const [byKey, setByKey] = React.useState(false)
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  const plotRef = React.useRef<HTMLDivElement>(null)
  const lineRef = React.useRef<HTMLSpanElement>(null)
  const updateTooltip = React.useRef<(() => void) | null>(null)
  const n = data.length
  const active = (hovered != null && hovered < n ? hovered : null) ?? highlight ?? null

  const signature = data.map((d) => `${d.label}:${d.value}`).join('|')
  const [redraw, setRedraw] = React.useState({ signature, n: 0 })
  if (redraw.signature !== signature) setRedraw({ signature, n: redraw.n + 1 })
  const fade = redraw.n > 0 && !reducedMotion

  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const ticks = [4, 3, 2, 1, 0].map((i) => (max / 4) * i)
  const sum = data.reduce((s, d) => s + d.value, 0)
  // x in 0–100 (percent of the plot), y in px down from the top of the track.
  const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100)
  const y = (v: number) => TRACK - (v / max) * TRACK
  const pts = data.map((d, i) => [x(i), y(d.value)] as [number, number])
  const line = smoothPath(pts)
  // About seven short labels ("Mon", "Jan"), five when they are dates ("Oct 31"), so they keep
  // apart in a compact card too.
  const longest = Math.max(0, ...data.map((d) => String(d.label).length))
  const step = labelEvery && labelEvery > 0 ? Math.round(labelEvery) : Math.max(1, Math.ceil(n / (longest > 4 ? 5 : 7)))
  const showLabel = (i: number) => (n - 1 - i) % step === 0

  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const f = (e.clientX - r.left) / r.width
    setByKey(false)
    setHovered(Math.max(0, Math.min(n - 1, Math.round(f * (n - 1)))))
  }

  useGlide(active, {
    measure: () => (active == null || !plotRef.current ? null : { x: (x(active) / 100) * plotRef.current.clientWidth, y: y(data[active].value) }),
    apply: (offset: GlidePoint) => {
      if (anchor) anchor.style.transform = glideTransform(offset)
      // The drop line's box moves across; its line moves down inside it, so its foot stays on the baseline.
      if (lineRef.current) {
        lineRef.current.style.transform = glideTransform({ x: offset.x, y: 0 })
        const inner = lineRef.current.firstElementChild as SVGElement | null
        if (inner) inner.style.transform = glideTransform({ x: 0, y: offset.y })
      }
      updateTooltip.current?.()
    },
    immediate: byKey,
  })
  const fmt = (v: number) => `${formatValue(v)}${unit ? ` ${unit}` : ''}`

  return (
    <ChartCard total={total ?? defaultFormat(sum)} {...props}>
      <div className="relative pt-2 pl-8">
        {ticks.map((t, i) => (
          <React.Fragment key={i}>
            {i < 4 && (
              <span
                aria-hidden
                className="absolute right-0 left-8 h-px border-t border-dashed border-border-subtle"
                style={{ top: 8 + (TRACK / 4) * i }}
              />
            )}
            <span
              aria-hidden
              key={`${redraw.n}-${i}`}
              className={cn('absolute left-6 w-6 -translate-x-full text-right text-xs leading-[18px] text-text-muted', fade && 'satin-bar-fade')}
              style={{ top: 8 + (TRACK / 4) * i - 9 }}
            >
              {formatValue(t)}
            </span>
          </React.Fragment>
        ))}
        <div
          role="group"
          aria-label={labels.chartPoints(props.title, n)}
          tabIndex={0}
          ref={plotRef}
          className="relative rounded-md outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]"
          style={{ height: TRACK }}
          onPointerMove={pick}
          onPointerLeave={() => setHovered(null)}
          onFocus={() => {
            setByKey(true)
            setHovered((h) => h ?? n - 1)
          }}
          onBlur={() => setHovered(null)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            setByKey(true)
            setHovered((h) => Math.max(0, Math.min(n - 1, (h ?? n - 1) + (e.key === 'ArrowRight' ? 1 : -1))))
          }}
        >
          <svg
            key={redraw.n}
            aria-hidden
            viewBox={`0 0 100 ${TRACK}`}
            preserveAspectRatio="none"
            className={cn('absolute inset-0 size-full overflow-visible', fade && 'satin-bar-fade')}
          >
            {area && (
              <>
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="var(--chart-3)" stopOpacity="0.28" />
                    <stop offset="1" stopColor="var(--chart-3)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${line} L 100 ${TRACK} L 0 ${TRACK} Z`} fill={`url(#${gradientId})`} />
              </>
            )}
            <path
              d={line}
              fill="none"
              stroke="var(--chart-3)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {active != null && (
            <>
              {/* The dashed drop line from the dot to the baseline: a 1px column the plot's height,
                  its line starting 4px under the dot and cut at the baseline. */}
              <span
                ref={lineRef}
                aria-hidden
                className="pointer-events-none absolute top-0 w-px overflow-hidden"
                style={{ left: `calc(${x(active)}% - 0.5px)`, height: TRACK }}
              >
                <svg width="1" height={TRACK} className="absolute left-0 block" style={{ top: y(data[active].value) + 4 }}>
                  <line x1="0.5" x2="0.5" y1="0" y2={TRACK} stroke="var(--border-strong)" strokeDasharray="4 4" />
                </svg>
              </span>
              <span
                ref={setAnchor}
                aria-hidden
                className="pointer-events-none absolute size-2 -translate-1/2 rounded-full border-2 border-chart-3 bg-bg-card"
                style={{ left: `${x(active)}%`, top: y(data[active].value) }}
              />
              <ChartTooltip
                anchor={anchor}
                sideOffset={6}
                updateRef={updateTooltip}
                label={data[active].tooltipLabel ?? data[active].label}
                value={fmt(data[active].value)}
              />
              <span className="sr-only" aria-live="polite">
                {`${data[active].tooltipLabel ?? data[active].label}: ${fmt(data[active].value)}`}
              </span>
            </>
          )}
        </div>
        <div aria-hidden className="relative mt-1.5 h-5">
          {data.map((d, i) =>
            showLabel(i) ? (
              <span
                key={`${redraw.n}-${d.label}-${i}`}
                className={cn(
                  // Centred on its point; the last one ends at the plot's edge instead, so a date
                  // ("Oct 31") isn't cut by the card. The first has the axis gutter to spill into.
                  'absolute text-sm leading-(--text-sm--line-height) whitespace-nowrap',
                  i === n - 1 && n > 1 ? '-translate-x-full' : '-translate-x-1/2',
                  i === active ? 'font-medium text-text-default' : 'text-text-muted',
                  fade && 'satin-bar-fade',
                )}
                style={{ left: `${x(i)}%` }}
              >
                {d.label}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </ChartCard>
  )
}

/** The Line chart with the gradient under its line. */
export function AreaCard(props: Omit<LineCardProps, 'area'>) {
  return <LineCard {...props} area />
}
