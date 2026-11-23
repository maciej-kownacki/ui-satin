import * as React from 'react'
import { StatCard, type StatCardProps } from '@uisatin/pro/stat-card'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/**
 * Stat card (Satin Pro): a dashboard's first row, four tiles per team, each with its value,
 * change and sparkline. Marketing is the one the page opens on: Signups up 12% with its 12
 * weeks, CAC down 4% (good, since down is good for it), Conversion flat and Revenue up 7%. Sales,
 * HR and Commerce show the same tile with other metrics, two of them where down is good or up is
 * bad. The Loading switch puts the last tile of the row in its loading state.
 */

/** One tile, as data: the props and the code that writes them. */
type Tile = { props: StatCardProps; code: string[] }

const WEEKS = Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`)
const DAYS = Array.from({ length: 8 }, (_, i) => `Nov ${15 + i}`)
const euro = (v: number) => `${Math.round(v)} €`
const pct = (v: number) => `${v.toFixed(1)}%`
const thousands = (v: number) => `€${(v / 1000).toFixed(1)}k`

const TEAMS: Record<string, Tile[]> = {
  marketing: [
    {
      props: {
        label: 'Signups',
        value: 1284,
        change: { value: 12, period: 'vs last week', direction: 'up' },
        sparkline: [812, 845, 830, 902, 948, 921, 1003, 1046, 1018, 1121, 1146, 1284],
        sparklineLabels: WEEKS,
      },
      code: ['label="Signups"', 'value={1284}', "change={{ value: 12, period: 'vs last week', direction: 'up' }}", 'sparkline={signups}', 'sparklineLabels={weeks}'],
    },
    {
      props: {
        label: 'CAC',
        value: 38,
        format: euro,
        change: { value: 4, period: 'vs last week', direction: 'down', good: 'down' },
        sparkline: [46, 45, 47, 44, 43, 44, 42, 41, 41, 40, 39, 38],
        sparklineLabels: WEEKS,
      },
      code: [
        'label="CAC"',
        'value={38}',
        'format={(v) => `${Math.round(v)} €`}',
        "change={{ value: 4, period: 'vs last week', direction: 'down', good: 'down' }}",
        'sparkline={cac}',
        'sparklineLabels={weeks}',
      ],
    },
    {
      props: {
        label: 'Conversion',
        value: 3.1,
        format: pct,
        change: { value: 0, period: 'vs last week', direction: 'flat' },
        sparkline: [3.0, 3.2, 3.1, 2.9, 3.1, 3.2, 3.0, 3.1, 3.2, 3.0, 3.1, 3.1],
        sparklineLabels: WEEKS,
      },
      code: ['label="Conversion"', 'value={3.1}', 'format={(v) => `${v.toFixed(1)}%`}', "change={{ value: 0, period: 'vs last week', direction: 'flat' }}", 'sparkline={conversion}', 'sparklineLabels={weeks}'],
    },
    {
      props: {
        label: 'Revenue',
        value: 48260,
        format: thousands,
        change: { value: 7, period: 'vs last week', direction: 'up' },
        sparkline: [36.1, 37.4, 36.8, 39.2, 40.5, 39.9, 42.3, 43.1, 42.6, 44.8, 45.1, 48.26].map((v) => v * 1000),
        sparklineLabels: WEEKS,
      },
      code: ['label="Revenue"', 'value={48260}', 'format={(v) => `€${(v / 1000).toFixed(1)}k`}', "change={{ value: 7, period: 'vs last week', direction: 'up' }}", 'sparkline={revenue}', 'sparklineLabels={weeks}'],
    },
  ],
  sales: [
    {
      props: {
        label: 'Pipeline value',
        value: 482000,
        format: thousands,
        change: { value: 8, period: 'vs last month', direction: 'up' },
        sparkline: [402, 410, 398, 421, 433, 429, 447, 452, 461, 458, 470, 482].map((v) => v * 1000),
        sparklineLabels: WEEKS,
      },
      code: ['label="Pipeline value"', 'value={482000}', 'format={(v) => `€${(v / 1000).toFixed(1)}k`}', "change={{ value: 8, period: 'vs last month', direction: 'up' }}", 'sparkline={pipeline}', 'sparklineLabels={weeks}'],
    },
    {
      props: {
        label: 'Win rate',
        value: 31,
        format: (v) => `${Math.round(v)}%`,
        change: { value: 2, period: 'vs last quarter', direction: 'down' },
        sparkline: [35, 34, 34, 33, 34, 33, 32, 33, 32, 31, 32, 31],
        sparklineLabels: WEEKS,
      },
      code: ['label="Win rate"', 'value={31}', 'format={(v) => `${Math.round(v)}%`}', "change={{ value: 2, period: 'vs last quarter', direction: 'down' }}", 'sparkline={winRate}', 'sparklineLabels={weeks}'],
    },
    {
      props: { label: 'Deals won', value: 46, change: { value: 5, period: 'vs last month', direction: 'up' }, sparkline: [2, 4, 3, 5, 4, 6, 3, 5, 4, 3, 4, 3], sparklineLabels: WEEKS },
      code: ['label="Deals won"', 'value={46}', "change={{ value: 5, period: 'vs last month', direction: 'up' }}", 'sparkline={won}', 'sparklineLabels={weeks}'],
    },
    {
      props: {
        label: 'New accounts',
        value: 19,
        change: { value: 27, period: 'vs last month', direction: 'up' },
        sparkline: [9, 11, 10, 13, 12, 14, 13, 15, 16, 15, 17, 19],
        sparklineLabels: WEEKS,
      },
      code: ['label="New accounts"', 'value={19}', "change={{ value: 27, period: 'vs last month', direction: 'up' }}", 'sparkline={newAccounts}', 'sparklineLabels={weeks}'],
    },
  ],
  hr: [
    {
      props: {
        label: 'Time to hire',
        value: 28,
        format: (v) => `${Math.round(v)} days`,
        change: { value: 9, period: 'vs last quarter', direction: 'down', good: 'down' },
        sparkline: [34, 33, 35, 32, 31, 31, 30, 29, 30, 29, 28, 28],
        sparklineLabels: WEEKS,
      },
      code: ['label="Time to hire"', 'value={28}', 'format={(v) => `${Math.round(v)} days`}', "change={{ value: 9, period: 'vs last quarter', direction: 'down', good: 'down' }}", 'sparkline={timeToHire}', 'sparklineLabels={weeks}'],
    },
    {
      props: {
        label: 'Open roles',
        value: 14,
        change: { value: 17, period: 'vs last month', direction: 'up' },
        sparkline: [9, 10, 10, 11, 12, 11, 12, 12, 13, 12, 13, 14],
        sparklineLabels: WEEKS,
      },
      code: ['label="Open roles"', 'value={14}', "change={{ value: 17, period: 'vs last month', direction: 'up' }}", 'sparkline={openRoles}', 'sparklineLabels={weeks}'],
    },
    {
      props: {
        label: 'Offer acceptance',
        value: 86,
        format: (v) => `${Math.round(v)}%`,
        change: { value: 4, period: 'vs last quarter', direction: 'up' },
        sparkline: [80, 82, 81, 83, 84, 82, 85, 84, 86, 85, 87, 86],
        sparklineLabels: WEEKS,
      },
      code: ['label="Offer acceptance"', 'value={86}', 'format={(v) => `${Math.round(v)}%`}', "change={{ value: 4, period: 'vs last quarter', direction: 'up' }}", 'sparkline={acceptance}', 'sparklineLabels={weeks}'],
    },
    {
      props: {
        label: 'Applicants',
        value: 1940,
        change: { value: 18, period: 'vs last month', direction: 'up' },
        sparkline: [120, 135, 142, 150, 148, 161, 170, 168, 175, 182, 190, 199],
        sparklineLabels: WEEKS,
      },
      code: ['label="Applicants"', 'value={1940}', "change={{ value: 18, period: 'vs last month', direction: 'up' }}", 'sparkline={applicants}', 'sparklineLabels={weeks}'],
    },
  ],
  commerce: [
    {
      props: {
        label: "Today's revenue",
        value: 8420,
        format: (v) => `€${Math.round(v).toLocaleString('en-US')}`,
        change: { value: 6, period: 'vs yesterday', direction: 'up' },
        sparkline: [4900, 5200, 6100, 5800, 7400, 6900, 7950, 8420],
        sparklineLabels: DAYS,
      },
      code: ['label="Today\'s revenue"', 'value={8420}', "format={(v) => `€${Math.round(v).toLocaleString('en-US')}`}", "change={{ value: 6, period: 'vs yesterday', direction: 'up' }}", 'sparkline={lastEightDays}', 'sparklineLabels={days}'],
    },
    {
      props: {
        label: 'Refund rate',
        value: 2.4,
        format: pct,
        change: { value: 0.3, period: 'vs last week', direction: 'up', good: 'down', format: (v) => `${v} pp` },
        sparkline: [2.1, 2.0, 2.1, 2.0, 2.2, 2.1, 2.3, 2.4],
        sparklineLabels: DAYS,
      },
      code: ['label="Refund rate"', 'value={2.4}', 'format={(v) => `${v.toFixed(1)}%`}', "change={{ value: 0.3, period: 'vs last week', direction: 'up', good: 'down', format: (v) => `${v} pp` }}", 'sparkline={refunds}', 'sparklineLabels={days}'],
    },
    {
      props: { label: 'Orders', value: 312, change: { value: 4, period: 'vs yesterday', direction: 'up' }, sparkline: [231, 240, 268, 255, 290, 284, 301, 312], sparklineLabels: DAYS },
      code: ['label="Orders"', 'value={312}', "change={{ value: 4, period: 'vs yesterday', direction: 'up' }}", 'sparkline={orders}', 'sparklineLabels={days}'],
    },
    {
      props: { label: 'Avg. order', value: 27, format: euro, change: { value: 0, period: 'vs yesterday', direction: 'flat' }, sparkline: [26, 27, 26, 27, 28, 27, 26, 27], sparklineLabels: DAYS },
      code: ['label="Avg. order"', 'value={27}', 'format={(v) => `${Math.round(v)} €`}', "change={{ value: 0, period: 'vs yesterday', direction: 'flat' }}", 'sparkline={avgOrder}', 'sparklineLabels={days}'],
    },
  ],
}

const TEAM_NAMES: Record<string, string> = { marketing: 'Marketing', sales: 'Sales', hr: 'HR', commerce: 'Commerce' }

export const controls: ShowcaseControl[] = [
  { id: 'team', label: 'Dashboard', type: 'menu', default: 'marketing', items: Object.keys(TEAMS).map((t) => ({ value: t, label: TEAM_NAMES[t] })) },
  { id: 'layout', label: 'Layout', items: [{ value: 'grid', label: 'Two-up' }, { value: 'row', label: 'Four-up, 240px' }] },
  { id: 'link', label: 'Link', type: 'switch', default: 'off' },
  { id: 'loading', label: 'Loading', type: 'switch', default: 'off' },
]

const slug = (label: React.ReactNode) => String(label).toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')

function code(v: Record<string, string>) {
  const tiles = TEAMS[v.team]
  const cols = v.layout === 'row' ? 'grid-cols-[repeat(4,240px)]' : 'grid-cols-1 sm:grid-cols-2'
  const cards = tiles
    .map((t, i) => {
      const loading = v.loading === 'on' && i === tiles.length - 1
      const attrs = [...t.code, ...(loading ? ['loading'] : v.link === 'on' ? [`href="/reports/${slug(t.props.label)}"`] : [])]
      return `      <StatCard\n${attrs.map((a) => `        ${a}`).join('\n')}\n      />`
    })
    .join('\n')
  return `import { StatCard } from '@uisatin/pro/stat-card'

${
    v.team === 'commerce'
      ? "// One value per day, oldest first.\nconst days = ['Nov 15', 'Nov 16', /* … */ 'Nov 22']"
      : "// One value per week, oldest first.\nconst weeks = ['Week 1', 'Week 2', /* … */ 'Week 12']"
  }

export function ${TEAM_NAMES[v.team]}Stats() {
  return (
    <div className="grid ${cols} gap-3">
${cards}
    </div>
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [TEAM_NAMES[v.team], v.layout === 'row' ? 'Four-up at 240px' : 'Two-up', v.link === 'on' ? 'Links' : 'Static', ...(v.loading === 'on' ? ['Last tile loading'] : [])].join(' · '),
  code: code(v),
}))

function Preview({ v }: { v: Record<string, string> }) {
  return (
    <div className={v.layout === 'row' ? 'grid grid-cols-[repeat(4,240px)] gap-3' : 'grid w-[600px] max-w-full grid-cols-1 gap-3 sm:grid-cols-2'}>
      {TEAMS[v.team].map((t, i, tiles) => (
        <StatCard
          key={String(t.props.label)}
          {...t.props}
          loading={v.loading === 'on' && i === tiles.length - 1}
          href={v.link === 'on' ? '#' : undefined}
          // The demo's links go nowhere.
          onClick={(e) => e.preventDefault()}
        />
      ))}
    </div>
  )
}

export default function StatCardDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Stat card" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
