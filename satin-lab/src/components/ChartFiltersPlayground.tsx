import * as React from 'react'
import { SegmentedControl, Switch, cn } from '@uisatin/ui'
import { ChartCard, ChartLegendRow, ChartTooltip, type ChartDatum } from '@uisatin/ui/chart'
import { DATA, PERIODS, format, type Dataset } from '../demos/covers-data'

/**
 * A playground, not in the nav and not in @uisatin/ui: three ways the bar chart could redraw
 * when its period changes, side by side, all driven by one period. A copy of BarCard
 * (bar-chart.tsx) with per-period data; the shipped card stays as it is until one is picked.
 *
 * A  Regrow   the new bars rise from the baseline, 250 ms.
 * B  Stagger  the old bars sink (150 ms), the new ones rise left to right, 250 ms each.
 * C  Morph    each bar's height morphs from what stood at its place to its new value while
 *             the old and new columns crossfade, 250 ms.
 *
 * A and B reveal the bars with clip-path (paint only, the radius never squashes); C has to
 * animate height so the value above a hovered bar rides along. All on --ease-out, nothing
 * moves under reduced motion.
 */

type Variant = 'regrow' | 'stagger' | 'morph'

/* ---------- motion ---------- */

const TRACK = 180

function niceMax(max: number) {
  if (max <= 0) return 4
  const raw = max / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 1.5, 2, 2.5, 3, 5, 7.5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  return step * 4
}

function heights(data: ChartDatum[]) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  return { max, h: data.map((d) => (d.value / max) * TRACK) }
}

/** The height that stood at a point across the plot (0–1), between the bar centres. */
function sample(h: number[], f: number) {
  const x = f * h.length - 0.5
  const i = Math.max(0, Math.min(h.length - 1, Math.floor(x)))
  const j = Math.min(h.length - 1, i + 1)
  const t = Math.max(0, Math.min(1, x - i))
  return h[i] + (h[j] - h[i]) * t
}

/** The OS setting, or the page's own switch. */
function useReducedMotion() {
  const [os, setOs] = React.useState(false)
  React.useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    setOs(mq.matches)
    const on = () => setOs(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return os
}

/**
 * Keeps the dataset that was showing before the period changed, for as long as the outgoing
 * columns need it. `n` counts changes, so the incoming columns remount and play again.
 */
function useOutgoing(period: string, ms: number) {
  const [s, setS] = React.useState({ period, prev: null as Dataset | null, n: 0 })
  if (s.period !== period) setS({ period, prev: DATA[s.period], n: s.n + 1 })
  React.useEffect(() => {
    if (!s.prev) return
    const t = setTimeout(() => setS((c) => (c.n === s.n ? { ...c, prev: null } : c)), ms)
    return () => clearTimeout(t)
  }, [s.n, s.prev, ms])
  return s
}

/* ---------- the card ---------- */

type Motion = { k: number; reduced: boolean }

const dur = (base: number, m: Motion) => `${base * m.k}ms`

function Columns({
  data,
  ghost,
  active,
  onHover,
  bar,
  label,
  title,
}: {
  data: ChartDatum[]
  /** The outgoing columns: no hover, no reading out. */
  ghost?: boolean
  active?: number | null
  onHover?: (i: number | null) => void
  bar: (i: number) => { height: number; style?: React.CSSProperties; className?: string }
  label?: (i: number) => React.CSSProperties | undefined
  title: string
}) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  return (
    <ul
      className={cn('absolute inset-y-0 right-0 left-8 flex items-end gap-2', ghost && 'pointer-events-none')}
      aria-hidden={ghost || undefined}
      aria-label={ghost ? undefined : title}
      onPointerLeave={() => onHover?.(null)}
    >
      {data.map((d, i) => {
        const isActive = !ghost && active === i
        const dimmed = !ghost && active != null && !isActive
        const b = bar(i)
        return (
          <li
            key={`${d.label}-${i}`}
            tabIndex={ghost ? -1 : 0}
            aria-label={ghost ? undefined : `${d.tooltipLabel ?? d.label}: ${format(d.value)} covers`}
            onPointerEnter={() => onHover?.(i)}
            onFocus={() => onHover?.(i)}
            onBlur={() => onHover?.(null)}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md focus-visible:outline-none"
          >
            <div className="relative flex w-full flex-col items-center justify-end gap-1.5" style={{ height: TRACK }}>
              {isActive && (
                <>
                  <ChartTooltip anchor={anchor} label={d.tooltipLabel ?? d.label} value={`${format(d.value)} covers`} />
                  <span ref={setAnchor} className="text-sm leading-(--text-sm--line-height) font-medium text-text-default">
                    {format(d.value)}
                  </span>
                </>
              )}
              <span
                aria-hidden
                className={cn(
                  'w-full shrink-0 rounded-md transition-[background-color,outline-color] duration-(--duration-fast) ease-(--ease-out)',
                  dimmed ? 'bg-[color-mix(in_oklab,var(--chart-3)_30%,var(--bg-card))]' : 'bg-chart-3',
                  isActive && 'outline outline-offset-2 outline-chart-3',
                  b.className,
                )}
                style={{ height: b.height, ...b.style }}
              />
            </div>
            <span
              className={cn(
                'text-sm leading-(--text-sm--line-height) font-medium whitespace-nowrap',
                isActive ? 'text-text-default' : 'text-text-muted',
              )}
              style={label?.(i)}
            >
              {d.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function PlaygroundBarCard({
  variant,
  period,
  onPeriodChange,
  motion,
}: {
  variant: Variant
  period: string
  onPeriodChange: (p: string) => void
  motion: Motion
}) {
  const { range, data } = DATA[period]
  const { max, h } = heights(data)
  const [hovered, setHovered] = React.useState<number | null>(null)
  const active = hovered != null && hovered < data.length ? hovered : null
  const ticks = [4, 3, 2, 1, 0].map((i) => (max / 4) * i)
  const total = data.reduce((n, d) => n + d.value, 0)
  const animate = !motion.reduced

  // How long the outgoing columns stay: B sinks for 150, C crossfades for 250.
  const outMs = (variant === 'stagger' ? 150 : 250) * motion.k
  const { prev, n } = useOutgoing(period, outMs)
  const changed = n > 0 && animate
  const ghost = changed && variant !== 'regrow' ? prev : null
  const old = ghost ? heights(ghost.data) : null

  // B: the new bars wait for the old ones to sink most of the way, then rise left to right,
  // the whole sweep inside 160 ms however many bars there are.
  const step = data.length > 1 ? Math.min(30, 160 / (data.length - 1)) : 0
  const reveal = (delay = 0): React.CSSProperties => ({
    animation: `pg-reveal ${dur(250, motion)} var(--ease-out) ${delay * motion.k}ms backwards`,
  })
  const fadeIn = (delay = 0): React.CSSProperties => ({
    animation: `pg-fade-in ${dur(200, motion)} var(--ease-out) ${delay * motion.k}ms backwards`,
  })

  const bar = (i: number) => {
    if (!changed) return { height: h[i] }
    if (variant === 'regrow') return { height: h[i], style: reveal() }
    if (variant === 'stagger') return { height: h[i], style: reveal(100 + i * step) }
    // Morph: start from whatever stood at this place on the old axis.
    const from = old ? sample(old.h, (i + 0.5) / data.length) : h[i]
    return {
      height: h[i],
      style: { '--from': `${from}px`, animation: `pg-morph-in ${dur(250, motion)} var(--ease-out) backwards` } as React.CSSProperties,
    }
  }
  const label = (i: number) => {
    if (!changed) return undefined
    if (variant === 'stagger') return fadeIn(100 + i * step)
    return fadeIn()
  }

  return (
    <ChartCard
      title="Covers by day"
      range={range}
      periods={PERIODS}
      value={period}
      onPeriodChange={onPeriodChange}
      className="w-full"
    >
      <div className="pt-[9px]">
        <div className="relative h-[206px]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              aria-hidden
              className="absolute right-0 left-8 h-px border-t border-dashed border-border-subtle"
              style={{ top: (TRACK / 4) * i }}
            />
          ))}
          {/* The axis is redrawn with the bars: its labels fade in on the new scale. */}
          <div key={changed ? `ticks-${max}-${n}` : 'ticks'} aria-hidden style={changed ? fadeIn(variant === 'stagger' ? 100 : 0) : undefined}>
            {ticks.map((t, i) => (
              <span
                key={i}
                className="absolute left-6 w-6 -translate-x-full text-right text-xs leading-[18px] text-text-muted"
                style={{ top: (TRACK / 4) * i - 9 }}
              >
                {format(t)}
              </span>
            ))}
          </div>
          {/* The outgoing columns sit under the incoming ones and fade out as they go. */}
          {ghost && old && (
            <Columns
              key={`out-${n}`}
              ghost
              title=""
              data={ghost.data}
              bar={(i) =>
                variant === 'stagger'
                  ? { height: old.h[i], style: { animation: `pg-sink ${dur(150, motion)} var(--ease-out) forwards` } }
                  : {
                      height: old.h[i],
                      // Morph: head for whatever the new axis puts here, fading as it goes.
                      style: {
                        '--to': `${sample(h, (i + 0.5) / ghost.data.length)}px`,
                        animation: `pg-morph-out ${dur(250, motion)} var(--ease-out) forwards`,
                      } as React.CSSProperties,
                    }
              }
              label={() => ({ animation: `pg-fade-out ${dur(150, motion)} var(--ease-out) forwards` })}
            />
          )}
          <Columns
            key={`in-${n}`}
            title="Covers by day"
            data={data}
            active={active}
            onHover={setHovered}
            bar={bar}
            label={label}
          />
        </div>
      </div>
      <ChartLegendRow color="var(--chart-3)" label="Total covers" value={format(total)} note="+8.4% vs last period" />
    </ChartCard>
  )
}

/* ---------- the page ---------- */

const VARIANTS: { id: Variant; name: string; description: string; timing: string }[] = [
  {
    id: 'regrow',
    name: 'A · Regrow',
    description: 'The old bars go at once and the new ones rise from the baseline together.',
    timing: '250 ms reveal, labels and axis fade in 200 ms',
  },
  {
    id: 'stagger',
    name: 'B · Sink and stagger',
    description: 'The old bars sink into the baseline, then the new ones rise left to right.',
    timing: '150 ms out, 250 ms in, the sweep spread over 160 ms at most',
  },
  {
    id: 'morph',
    name: 'C · Morph',
    description: 'Each bar grows or shrinks from what stood in its place, while the columns crossfade.',
    timing: '250 ms height morph, 200 ms crossfade',
  },
]

export function ChartFiltersPlayground() {
  const [period, setPeriod] = React.useState('7 days')
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light')
  const [speed, setSpeed] = React.useState('1')
  const [reducedSim, setReducedSim] = React.useState(false)
  const reducedOs = useReducedMotion()

  React.useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])
  const switchTheme = (t: string) => {
    setTheme(t as 'light' | 'dark')
    document.documentElement.classList.toggle('dark', t === 'dark')
  }

  const motion: Motion = { k: Number(speed), reduced: reducedOs || reducedSim }

  return (
    <main id="main" className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-[640px] flex-col gap-1.5">
          <p className="text-sm text-text-muted">Playground · not in the docs</p>
          <h1 className="text-2xl font-medium tracking-tight text-text-default">Bar chart: redraw on a period change</h1>
          <p className="text-base text-text-muted">
            Pick a period on any card: all three share it, so one click plays the variants side by side. Hover a bar
            during or after the redraw to check the tooltip and the dimmed bars.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            aria-label="Theme"
            items={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={theme}
            onValueChange={switchTheme}
          />
          <SegmentedControl
            aria-label="Speed"
            items={[
              { value: '1', label: '1×' },
              { value: '4', label: 'Slow 4×' },
            ]}
            value={speed}
            onValueChange={setSpeed}
          />
          <Switch label="Reduced motion" checked={motion.reduced} disabled={reducedOs} onCheckedChange={setReducedSim} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {VARIANTS.map((v) => (
          <section key={v.id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 px-1">
              <h2 className="text-base font-medium text-text-default">{v.name}</h2>
              <p className="text-sm text-text-muted">{v.description}</p>
              <p className="text-xs text-text-subtle">{v.timing}</p>
            </div>
            <PlaygroundBarCard variant={v.id} period={period} onPeriodChange={setPeriod} motion={motion} />
          </section>
        ))}
      </div>
    </main>
  )
}
