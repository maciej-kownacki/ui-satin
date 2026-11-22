import * as React from 'react'
import { StatCard, StatCardSparkline, type StatCardProps } from '@uisatin/pro/stat-card'

/**
 * Every state of Satin Pro's StatCard, each tile 240px wide (the four-up row's width) on the
 * page's bg/card, in rows of four so heights can be compared across a row: a loading tile has
 * to stand exactly as tall as a loaded one. Count-up is off, so every number shows as it ends.
 */

const WEEKS = Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`)
const signups = [812, 845, 830, 902, 948, 921, 1003, 1046, 1018, 1121, 1146, 1284]
const refunds = [2.0, 2.1, 2.0, 2.2, 2.1, 2.3, 2.2, 2.3, 2.2, 2.4, 2.3, 2.4]
const pct = (v: number) => `${v.toFixed(1)}%`

type State = { name: string; props: StatCardProps }

const rows: State[][] = [
  [
    { name: 'up, good (default)', props: { label: 'Signups', value: 1284, change: { value: 12, period: 'vs last week', direction: 'up' }, sparkline: signups, sparklineLabels: WEEKS } },
    {
      name: 'up, bad (good: down)',
      props: { label: 'Refund rate', value: 2.4, format: pct, change: { value: 0.3, period: 'vs last week', direction: 'up', good: 'down', format: (v) => `${v} pp` }, sparkline: refunds },
    },
    {
      name: 'down, good (good: down)',
      props: { label: 'CAC', value: 38, format: (v) => `${v} €`, change: { value: 4, period: 'vs last week', direction: 'down', good: 'down' }, sparkline: [...signups].reverse() },
    },
    { name: 'loading (sparkline={[]})', props: { label: 'Revenue', value: null, loading: true, sparkline: [] } },
  ],
  [
    { name: 'flat', props: { label: 'Conversion', value: '3.1%', change: { value: 0, period: 'vs last week', direction: 'flat' }, sparkline: [3, 3.2, 3.1, 3, 3.1, 3.2, 3.1, 3, 3.1, 3.1, 3.2, 3.1] } },
    { name: 'no previous period (change left out)', props: { label: 'New accounts', value: 19, sparkline: [1, 2, 1, 3, 2, 2, 4, 3, 2, 3, 4, 3] } },
    { name: 'empty (value null)', props: { label: 'Pipeline value', value: null, change: null, sparkline: signups } },
    { name: 'error with Retry', props: { label: 'Revenue', value: null, error: true, onRetry: () => {}, sparkline: [] } },
  ],
  [
    { name: 'href (one link)', props: { label: 'Signups', value: 1284, change: { value: 12, period: 'vs last week', direction: 'up' }, sparkline: signups, href: '#' } },
    { name: 'disabled', props: { label: 'Signups', value: 1284, change: { value: 12, period: 'vs last week', direction: 'up' }, sparkline: signups, href: '#', disabled: true } },
    { name: 'error, its reason, no sparkline row', props: { label: 'Win rate', value: null, error: 'The CRM timed out.', onRetry: () => {} } },
  ],
  [
    { name: 'loading, no sparkline row', props: { label: 'Win rate', value: null, loading: true } },
    { name: 'no sparkline, value only', props: { label: 'Win rate', value: '31%', change: { value: 2, period: 'vs last quarter', direction: 'down' } } },
    { name: 'long label and period', props: { label: 'Average first response time', value: '2h 14m', change: { value: 18, period: 'vs previous 30 days', direction: 'down', good: 'down' }, sparkline: [...signups].reverse() } },
    { name: 'large value', props: { label: 'Annual recurring revenue', value: 12480000, format: (v) => `€${v.toLocaleString('en-US')}`, change: { value: 112.5, period: 'vs last year', direction: 'up' }, sparkline: signups } },
  ],
]

export function StatCardGrid() {
  return (
    <div className="flex flex-col gap-10 p-8 text-xs text-text-muted">
      {rows.map((row, r) => (
        <div key={r} className="grid grid-cols-[repeat(4,240px)] items-start gap-3">
          {row.map((state) => (
            <div key={state.name} className="flex flex-col gap-3">
              <span>{state.name}</span>
              <StatCard
                countUp={false}
                {...state.props}
                onClick={(e) => e.preventDefault()}
              />
            </div>
          ))}
        </div>
      ))}
      <div className="flex w-[240px] flex-col gap-3">
        {/* StatCard has no highlight prop: the part shows the hovered point, held still. */}
        <span>StatCardSparkline, highlight={'{8}'} (the hovered look)</span>
        <div className="rounded-2xl border border-border-default bg-bg-card p-4">
          <StatCardSparkline data={signups} labels={WEEKS} highlight={8} title="Signups" />
        </div>
      </div>
    </div>
  )
}
