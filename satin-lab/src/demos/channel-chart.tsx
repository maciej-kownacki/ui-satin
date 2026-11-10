import * as React from 'react'
import { ChannelCard } from '@satin/ui/channel-chart'
import type { ChartDatum } from '@satin/ui/chart'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const channels: ChartDatum[] = [
  { label: 'Dine-in', value: 29430 },
  { label: 'Delivery apps', value: 9650 },
  { label: 'Takeaway', value: 5790 },
  { label: 'Catering', value: 2420 },
  { label: 'Gift cards', value: 970 },
]

const euro = (n: number) => `€${n.toLocaleString('en-US')}`

const periods = [
  ['7 days', '30 days', '90 days', '365 days'],
  ['Sep', 'Oct', 'Nov'],
  ['2025', '2026'],
]

// The datum shown as hovered with Highlight: the biggest channel.
const highlighted = 0

// Periods are content the card can carry; the highlighted (hover) look is a state, last.
export const controls: ShowcaseControl[] = [
  { id: 'periods', label: 'Periods', type: 'switch', default: 'off' },
  { id: 'highlight', label: 'Highlight', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const withPeriods = v.periods === 'on'
  const data = `const channels = [\n${channels.map((c) => `  { label: '${c.label}', value: ${c.value} },`).join('\n')}\n]`
  const attrs = [
    'title="Revenue by channel"',
    'range="Oct 26 – Nov 1, 2026"',
    'data={channels}',
    'change="+5.2%"',
    "formatValue={(n) => `€${n.toLocaleString('en-US')}`}",
    ...(withPeriods
      ? [`periods={[['7 days', '30 days', '90 days', '365 days'], ['Sep', 'Oct', 'Nov'], ['2025', '2026']]}`, 'value={period}', 'onPeriodChange={setPeriod}']
      : []),
    ...(v.highlight === 'on' ? [`highlight={${highlighted}}`] : []),
  ]
  const imports = [
    withPeriods && "import * as React from 'react'",
    "import { ChannelCard } from '@satin/ui/channel-chart'",
  ]
  return `${imports.filter(Boolean).join('\n')}

${data}

export function Revenue() {
${withPeriods ? "  const [period, setPeriod] = React.useState('7 days')\n" : ''}  return (
    <ChannelCard
${attrs.map((a) => `      ${a}`).join('\n')}
    />
  )
}`
}

const labels: Record<string, [string, string]> = {
  periods: ['Periods', 'No periods'],
  highlight: ['Highlighted', 'At rest'],
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [...Object.entries(labels).map(([k, [on, off]]) => (v[k] === 'on' ? on : off))].join(' · '),
  code: code(v),
}))

function Card({ v }: { v: Record<string, string> }) {
  const [period, setPeriod] = React.useState('7 days')
  const shared = {
    title: 'Revenue by channel',
    range: 'Oct 26 – Nov 1, 2026',
    ...(v.periods === 'on' && { periods, value: period, onPeriodChange: setPeriod }),
    highlight: v.highlight === 'on' ? highlighted : undefined,
  }
  return <ChannelCard {...shared} data={channels} change="+5.2%" formatValue={euro} />
}

export default function ChannelChartDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Channel chart"
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
