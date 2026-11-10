import * as React from 'react'
import { Button } from '@satin/ui/button'
import { BarCard } from '@satin/ui/bar-chart'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import { DATA, PERIODS, format } from './covers-data'

// The datum shown as hovered with Highlight: the busiest one in the period.
const busiest = (period: string) => {
  const values = DATA[period].data.map((d) => d.value)
  return values.indexOf(Math.max(...values))
}

// Periods, the picked period and the footer are content the card can carry; reduced motion
// and the highlighted (hover) look are states, last. The card's own toggles move Period too.
export const controls: ShowcaseControl[] = [
  { id: 'periods', label: 'Periods', type: 'switch', default: 'off' },
  { id: 'period', label: 'Period', type: 'menu', default: '7 days', items: PERIODS.flat().map((p) => ({ value: p, label: p })) },
  { id: 'footer', label: 'Footer', type: 'switch', default: 'on' },
  { id: 'reduced', label: 'Reduced motion', type: 'switch', default: 'off' },
  { id: 'highlight', label: 'Highlight', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const withPeriods = v.periods === 'on'
  const footer = v.footer === 'on'
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
    "legend={{ label: 'Total covers', note: '+8.4% vs last period' }}",
    ...(v.reduced === 'on' ? ['reducedMotion'] : []),
    ...(v.highlight === 'on' ? [`highlight={${busiest(v.period)}}`] : []),
    ...(footer ? ['footer={<><Button variant="tertiary">Save to reports</Button><Button variant="inverse">Save</Button></>}'] : []),
  ]
  const imports = [
    withPeriods && "import * as React from 'react'",
    "import { BarCard } from '@satin/ui/bar-chart'",
    footer && "import { Button } from '@satin/ui/button'",
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
  footer: ['Footer', 'No footer'],
  reduced: ['Reduced motion', 'Motion'],
  highlight: ['Highlighted', 'At rest'],
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.period, ...Object.entries(labels).map(([k, [on, off]]) => (v[k] === 'on' ? on : off))].join(' · '),
  code: code(v),
}))

function Footer() {
  return (
    <>
      <Button variant="tertiary">Save to reports</Button>
      <Button variant="inverse">Save</Button>
    </>
  )
}

function Card({ v, set }: { v: Record<string, string>; set: (id: string, value: string) => void }) {
  const { range, data } = DATA[v.period]
  return (
    <BarCard
      title="Covers"
      range={range}
      data={data}
      unit="covers"
      formatValue={format}
      legend={{ label: 'Total covers', note: '+8.4% vs last period' }}
      {...(v.periods === 'on' && { periods: PERIODS, value: v.period, onPeriodChange: (p: string) => set('period', p) })}
      reducedMotion={v.reduced === 'on'}
      highlight={v.highlight === 'on' ? busiest(v.period) : undefined}
      footer={v.footer === 'on' ? <Footer /> : undefined}
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
        <div className="w-[400px] max-w-full">
          <Card v={v} set={set} />
        </div>
      )}
    />
  )
}
