'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { Badge } from './badge'
import { Floating, type FloatingVirtualElement } from './floating'
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

/* ---------- glide ---------- */

export type GlidePoint = { x: number; y: number }

export interface GlideOptions {
  /** Where the point on show is, in px, in a box the glide doesn't move (the plot's). Read once per change of point. */
  measure: () => GlidePoint | null
  /**
   * Draws the glide: `offset` is how far from the point's own place to draw it, in px. Write it
   * as a transform (`glideTransform`) on what marks the point (the dot, the drop line) and move
   * the tooltip with it (ChartTooltip's `updateRef`). `{ x: 0, y: 0 }` at rest.
   */
  apply: (offset: GlidePoint) => void
  /** Jump instead of gliding: for a move made with the keyboard (MOTION.md, rule 6). */
  immediate?: boolean
}

// A critically damped spring that looks settled in about 200 ms (motion's visualDuration 0.2,
// bounce 0): ω = 2π / 0.24 s, so stiffness ω² ≈ 685 and damping 2ω ≈ 52.
const OMEGA = (2 * Math.PI) / 0.24
// It snaps onto the point once it is this close (px) and this slow (px/s).
const REST = 0.25
const REST_SPEED = 10
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * The glide a chart's tooltip makes after the pointer. When the point on show changes, what
 * marks it (dot, drop line, tooltip) moves from where it is drawn to the new point on a
 * critically damped spring instead of jumping, and catches up smoothly when the pointer moves
 * fast. Transform only, stepped on requestAnimationFrame with the real frame time, ending
 * exactly on the point, with no React render per frame.
 *
 * `point` names the point on show (its index), `null` when none is. Appearing from nothing, with
 * `immediate`, and under prefers-reduced-motion it jumps. Exported for custom charts.
 */
export function useGlide(point: React.Key | null, { measure, apply, immediate = false }: GlideOptions) {
  const callbacks = React.useRef({ measure, apply })
  React.useLayoutEffect(() => {
    callbacks.current = { measure, apply }
  })
  const state = React.useRef({ pos: null as GlidePoint | null, vel: { x: 0, y: 0 }, frame: 0 })

  React.useLayoutEffect(() => {
    const s = state.current
    cancelAnimationFrame(s.frame)
    const target = point == null ? null : callbacks.current.measure()
    if (!target) {
      s.pos = null
      s.vel = { x: 0, y: 0 }
      return
    }
    const to = { ...target }
    if (!s.pos || immediate || reducedMotion()) {
      s.pos = to
      s.vel = { x: 0, y: 0 }
      callbacks.current.apply({ x: 0, y: 0 })
      return
    }
    const pos = s.pos
    const vel = s.vel
    // Drawn where it was, before the first paint at the new point's place.
    callbacks.current.apply({ x: pos.x - to.x, y: pos.y - to.y })
    let last = performance.now()
    const step = (now: number) => {
      // A frame's timestamp can come before the change that started the glide: count a frame.
      const t = now > last ? (now - last) / 1000 : 1 / 60
      last = Math.max(last, now)
      // The spring solved exactly over the frame, per axis: d(t) = (d + (v + ωd)t)e^(−ωt).
      const decay = Math.exp(-OMEGA * t)
      let settled = true
      for (const axis of ['x', 'y'] as const) {
        const d = pos[axis] - to[axis]
        const c = vel[axis] + OMEGA * d
        const next = (d + c * t) * decay
        vel[axis] = (vel[axis] - OMEGA * c * t) * decay
        pos[axis] = to[axis] + next
        if (Math.abs(next) > REST || Math.abs(vel[axis]) > REST_SPEED) settled = false
      }
      if (settled) {
        s.pos = to
        s.vel = { x: 0, y: 0 }
        callbacks.current.apply({ x: 0, y: 0 })
        return
      }
      callbacks.current.apply({ x: pos.x - to.x, y: pos.y - to.y })
      s.frame = requestAnimationFrame(step)
    }
    s.frame = requestAnimationFrame(step)
  }, [point, immediate])

  React.useEffect(() => {
    const s = state.current
    return () => cancelAnimationFrame(s.frame)
  }, [])
}

/** The transform that draws a glide offset; none at rest. */
export const glideTransform = ({ x, y }: GlidePoint) => (x || y ? `translate(${x}px, ${y}px)` : '')

/**
 * A stand-in anchor for a tooltip that glides: `element`'s box moved by the offset in `offset`.
 * For charts whose anchor can't be moved itself (a bar's value, a segment).
 */
export function glideAnchor(element: Element, offset: React.RefObject<GlidePoint>) {
  return {
    contextElement: element,
    getBoundingClientRect() {
      const r = element.getBoundingClientRect()
      const x = r.left + offset.current.x
      const y = r.top + offset.current.y
      return { x, y, left: x, top: y, right: x + r.width, bottom: y + r.height, width: r.width, height: r.height } as DOMRect
    },
  }
}

/* ---------- shared parts ---------- */

/**
 * The card every chart sits in (uiKit "chart explorations" A, 4084:3591): bg/card, a
 * border-default edge, radius-2xl, 16px in and 16 between rows. Row one: the title (16/24 medium,
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
                className="[box-shadow:inset_0_0_0_var(--border-width-default)_var(--tone-border)]"
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
 * keeps pointing at the anchor. Without it, it renders in place. A chart whose tooltip follows the
 * pointer from point to point moves it with `useGlide`.
 */
export function ChartTooltip({
  label,
  value,
  anchor,
  sideOffset = 4,
  updateRef,
  className,
  ...props
}: {
  label: React.ReactNode
  value: React.ReactNode
  /** What it points at: an element, or a stand-in (`glideAnchor`). */
  anchor?: Element | FloatingVirtualElement | null
  /** Gets a function that moves it to the anchor within the frame, for an anchor that glides (see Floating). */
  updateRef?: React.RefObject<(() => void) | null>
  /** Gap between the anchor and the pointer's tip. */
  sideOffset?: number
} & React.ComponentProps<'div'>) {
  if (anchor !== undefined) {
    // The pointer is 6 high and overlaps the pill by 1px.
    return (
      <Floating anchor={anchor} side="top" sideOffset={sideOffset + 5} updateRef={updateRef} className="pointer-events-none">
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
      {note && <span className="shrink-0 text-end whitespace-nowrap text-text-muted">{note}</span>}
    </div>
  )
}

/** Rounds the top of the axis up to a nice number that splits into four steps. */
