import * as React from 'react'
import { Button } from '@satin/ui/button'
import { BarCard } from '@satin/ui/bar-chart'
import type { ChartDatum } from '@satin/ui/chart'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const covers: ChartDatum[] = [
  { label: 'Sun', value: 412, tooltipLabel: 'Sun, Oct 26' },
  { label: 'Mon', value: 186, tooltipLabel: 'Mon, Oct 27' },
  { label: 'Tue', value: 212, tooltipLabel: 'Tue, Oct 28' },
  { label: 'Wed', value: 236, tooltipLabel: 'Wed, Oct 29' },
  { label: 'Thu', value: 296, tooltipLabel: 'Thu, Oct 30' },
  { label: 'Fri', value: 468, tooltipLabel: 'Fri, Oct 31' },
  { label: 'Sat', value: 525, tooltipLabel: 'Sat, Nov 1' },
]

const periods = [
  ['7 days', '30 days', '90 days', '365 days'],
  ['Sep', 'Oct', 'Nov'],
  ['2025', '2026'],
]

// The datum shown as hovered with Highlight: the busiest day.
const highlighted = 6

// Periods and the footer are content the card can carry; the highlighted (hover) look is a
// state, last.
export const controls: ShowcaseControl[] = [
  { id: 'periods', label: 'Periods', type: 'switch', default: 'off' },
  { id: 'footer', label: 'Footer', type: 'switch', default: 'on' },
  { id: 'highlight', label: 'Highlight', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const withPeriods = v.periods === 'on'
  const footer = v.footer === 'on'
  const data = `const covers = [
  { label: 'Sun', value: 412, tooltipLabel: 'Sun, Oct 26' },
  { label: 'Mon', value: 186, tooltipLabel: 'Mon, Oct 27' },
  // …one entry per day
]`
  const attrs = [
    'title="Covers by day"',
    'range="Oct 26 – Nov 1, 2026"',
    'data={covers}',
    'unit="covers"',
    ...(withPeriods
      ? [`periods={[['7 days', '30 days', '90 days', '365 days'], ['Sep', 'Oct', 'Nov'], ['2025', '2026']]}`, 'value={period}', 'onPeriodChange={setPeriod}']
      : []),
    "legend={{ label: 'Total covers', note: '+8.4% vs next week' }}",
    ...(v.highlight === 'on' ? [`highlight={${highlighted}}`] : []),
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
${withPeriods ? "  const [period, setPeriod] = React.useState('7 days')\n" : ''}  return (
    <BarCard
${attrs.map((a) => `      ${a}`).join('\n')}
    />
  )
}`
}

const labels: Record<string, [string, string]> = {
  periods: ['Periods', 'No periods'],
  footer: ['Footer', 'No footer'],
  highlight: ['Highlighted', 'At rest'],
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [...Object.entries(labels).map(([k, [on, off]]) => (v[k] === 'on' ? on : off))].join(' · '),
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

function Card({ v }: { v: Record<string, string> }) {
  const [period, setPeriod] = React.useState('7 days')
  const shared = {
    title: 'Covers by day',
    range: 'Oct 26 – Nov 1, 2026',
    ...(v.periods === 'on' && { periods, value: period, onPeriodChange: setPeriod }),
    highlight: v.highlight === 'on' ? highlighted : undefined,
    footer: v.footer === 'on' ? <Footer /> : undefined,
  }
  return <BarCard {...shared} data={covers} unit="covers" legend={{ label: 'Total covers', note: '+8.4% vs next week' }} />
}

export default function BarChartDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Bar chart"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="w-[400px] max-w-full">
          <Card v={v} />
        </div>
      )}
    />
  )
}
