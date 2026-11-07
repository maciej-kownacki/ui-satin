import * as React from 'react'
import { Button } from '@satin/ui/button'
import { BarCard, ChannelCard, type ChartDatum } from '@satin/ui/chart'
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

// The datum each card shows as hovered with Highlight: the busiest day, the biggest channel.
const highlighted = { bar: 6, channel: 0 }

// The card is the component itself, so it leads. Periods and the footer are content the
// card can carry; the highlighted (hover) look is a state, last.
export const controls: ShowcaseControl[] = [
  { id: 'card', label: 'Card', items: [{ value: 'bar', label: 'Bar card' }, { value: 'channel', label: 'Channel card' }] },
  { id: 'periods', label: 'Periods', type: 'switch', default: 'off' },
  { id: 'footer', label: 'Footer', type: 'switch', default: 'on' },
  { id: 'highlight', label: 'Highlight', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const bar = v.card === 'bar'
  const withPeriods = v.periods === 'on'
  const footer = v.footer === 'on'
  const data = bar
    ? `const covers = [
  { label: 'Sun', value: 412, tooltipLabel: 'Sun, Oct 26' },
  { label: 'Mon', value: 186, tooltipLabel: 'Mon, Oct 27' },
  // …one entry per day
]`
    : `const channels = [\n${channels.map((c) => `  { label: '${c.label}', value: ${c.value} },`).join('\n')}\n]`
  const attrs = [
    `title="${bar ? 'Covers by day' : 'Revenue by channel'}"`,
    'range="Oct 26 – Nov 1, 2026"',
    `data={${bar ? 'covers' : 'channels'}}`,
    ...(bar ? ['unit="covers"'] : ['change="+5.2%"', "formatValue={(n) => `€${n.toLocaleString('en-US')}`}"]),
    ...(withPeriods
      ? [`periods={[['7 days', '30 days', '90 days', '365 days'], ['Sep', 'Oct', 'Nov'], ['2025', '2026']]}`, 'value={period}', 'onPeriodChange={setPeriod}']
      : []),
    ...(bar ? ["legend={{ label: 'Total covers', note: '+8.4% vs next week' }}"] : []),
    ...(v.highlight === 'on' ? [`highlight={${highlighted[bar ? 'bar' : 'channel']}}`] : []),
    ...(footer ? ['footer={<><Button variant="tertiary">Save to reports</Button><Button variant="inverse">Save</Button></>}'] : []),
  ]
  const imports = [
    withPeriods && "import * as React from 'react'",
    `import { ${bar ? 'BarCard' : 'ChannelCard'} } from '@satin/ui/chart'`,
    footer && "import { Button } from '@satin/ui/button'",
  ]
  return `${imports.filter(Boolean).join('\n')}

${data}

export function ${bar ? 'Covers' : 'Revenue'}() {
${withPeriods ? "  const [period, setPeriod] = React.useState('7 days')\n" : ''}  return (
    <${bar ? 'BarCard' : 'ChannelCard'}
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
  label: [v.card === 'bar' ? 'Bar card' : 'Channel card', ...Object.entries(labels).map(([k, [on, off]]) => (v[k] === 'on' ? on : off))].join(' · '),
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
  const bar = v.card === 'bar'
  const shared = {
    title: bar ? 'Covers by day' : 'Revenue by channel',
    range: 'Oct 26 – Nov 1, 2026',
    ...(v.periods === 'on' && { periods, value: period, onPeriodChange: setPeriod }),
    highlight: v.highlight === 'on' ? highlighted[bar ? 'bar' : 'channel'] : undefined,
    footer: v.footer === 'on' ? <Footer /> : undefined,
  }
  return bar ? (
    <BarCard {...shared} data={covers} unit="covers" legend={{ label: 'Total covers', note: '+8.4% vs next week' }} />
  ) : (
    <ChannelCard {...shared} data={channels} change="+5.2%" formatValue={euro} />
  )
}

export default function ChartDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Chart"
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
