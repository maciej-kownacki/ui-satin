import * as React from 'react'
import { BarCard } from '@uisatin/ui/bar-chart'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import { DATA, PERIODS, format } from './covers-data'

// The datum shown as hovered with Highlight: the busiest one in the period.
const busiest = (period: string) => {
  const values = DATA[period].data.map((d) => d.value)
  return values.indexOf(Math.max(...values))
}

// Periods and the picked period are content the card can carry; reduced motion
// and the highlighted (hover) look are states, last. The card's own toggles move Period too.
export const controls: ShowcaseControl[] = [
  { id: 'width', label: 'Width', items: [{ value: 'compact', label: 'Compact' }, { value: 'wide', label: 'Wide' }] },
  { id: 'periods', label: 'Periods', type: 'switch', default: 'off' },
  { id: 'period', label: 'Period', type: 'menu', default: '7 days', items: PERIODS.flat().map((p) => ({ value: p, label: p })) },
  { id: 'reduced', label: 'Reduced motion', type: 'switch', default: 'off' },
  { id: 'highlight', label: 'Highlight', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const withPeriods = v.periods === 'on'
  const { range, data: first } = DATA[v.period]
  const d = first[0]
  const data = `const covers = {
  '${v.period}': {
    range: '${range}',
    data: [
      { label: '${d.label}', value: ${d.value}, tooltipLabel: '${d.tooltipLabel}' },
      // …one entry per bar
    ],
  },
  // …one entry per period
}

const compact = (n: number) => (n >= 1000 ? \`\${+(n / 1000).toFixed(1)}k\` : n.toLocaleString('en-US'))`
  const key = withPeriods ? 'period' : `'${v.period}'`
  const attrs = [
    'title="Covers"',
    `range={covers[${key}].range}`,
    `data={covers[${key}].data}`,
    'unit="covers"',
    'formatValue={compact}',
    ...(withPeriods
      ? [`periods={[['7 days', '30 days', '90 days', '365 days'], ['Sep', 'Oct', 'Nov'], ['2025', '2026']]}`, 'value={period}', 'onPeriodChange={setPeriod}']
      : []),
    'change="+8.4%"',
    ...(v.reduced === 'on' ? ['reducedMotion'] : []),
    ...(v.highlight === 'on' ? [`highlight={${busiest(v.period)}}`] : []),
  ]
  const imports = [
    withPeriods && "import * as React from 'react'",
    "import { BarCard } from '@uisatin/ui/bar-chart'",
  ]
  return `${imports.filter(Boolean).join('\n')}

${data}

export function Covers() {
${withPeriods ? `  const [period, setPeriod] = React.useState('${v.period}')\n` : ''}  return (
    <BarCard
${attrs.map((a) => `      ${a}`).join('\n')}
    />
  )
}`
}

const labels: Record<string, [string, string]> = {
  periods: ['Periods', 'No periods'],
  reduced: ['Reduced motion', 'Motion'],
  highlight: ['Highlighted', 'At rest'],
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.period, ...Object.entries(labels).map(([k, [on, off]]) => (v[k] === 'on' ? on : off)), v.width === 'wide' ? 'Wide' : 'Compact'].join(' · '),
  code: code(v),
}))

function Card({ v, set }: { v: Record<string, string>; set: (id: string, value: string) => void }) {
  const { range, data } = DATA[v.period]
  return (
    <BarCard
      title="Covers"
      range={range}
      data={data}
      unit="covers"
      formatValue={format}
      change="+8.4%"
      {...(v.periods === 'on' && { periods: PERIODS, value: v.period, onPeriodChange: (p: string) => set('period', p) })}
      reducedMotion={v.reduced === 'on'}
      highlight={v.highlight === 'on' ? busiest(v.period) : undefined}
    />
  )
}

export default function BarChartDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Bar chart"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v, set) => (
        <div className={v.width === 'wide' ? 'w-[720px] max-w-full' : 'w-[400px] max-w-full'}>
          <Card v={v} set={set} />
        </div>
      )}
    />
  )
}
