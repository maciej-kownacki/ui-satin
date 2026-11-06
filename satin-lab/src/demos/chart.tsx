import * as React from 'react'
import { Button } from '@satin/ui/button'
import { BarCard, ChannelCard, type ChartDatum } from '@satin/ui/chart'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

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

function Footer() {
  return (
    <>
      <Button variant="tertiary">Save to reports</Button>
      <Button variant="inverse">Save</Button>
    </>
  )
}

const barCode = `import { BarCard } from '@satin/ui/chart'
import { Button } from '@satin/ui/button'

const covers = [
  { label: 'Sun', value: 412, tooltipLabel: 'Sun, Oct 26' },
  { label: 'Mon', value: 186, tooltipLabel: 'Mon, Oct 27' },
  // …one entry per day
]

export function Covers() {
  return (
    <BarCard
      title="Covers by day"
      range="Oct 26 – Nov 1, 2026"
      data={covers}
      unit="covers"
      legend={{ label: 'Total covers', note: '+8.4% vs next week' }}
      footer={<><Button variant="tertiary">Save to reports</Button><Button variant="inverse">Save</Button></>}
    />
  )
}`

const channelCode = `import { ChannelCard } from '@satin/ui/chart'

const channels = [
  { label: 'Dine-in', value: 29430 },
  { label: 'Delivery apps', value: 9650 },
  { label: 'Takeaway', value: 5790 },
  { label: 'Catering', value: 2420 },
  { label: 'Gift cards', value: 970 },
]

export function Revenue() {
  return (
    <ChannelCard
      title="Revenue by channel"
      range="Oct 26 – Nov 1, 2026"
      data={channels}
      change="+5.2%"
      formatValue={(n) => \`€\${n.toLocaleString('en-US')}\`}
    />
  )
}`

const periodsCode = `import { BarCard } from '@satin/ui/chart'

export function Covers() {
  const [period, setPeriod] = React.useState('7 days')
  return (
    <BarCard
      title="Covers by day"
      range="Oct 26 – Nov 1, 2026"
      data={covers}
      unit="covers"
      periods={[['7 days', '30 days', '90 days', '365 days'], ['Sep', 'Oct', 'Nov'], ['2025', '2026']]}
      value={period}
      onPeriodChange={setPeriod}
      legend={{ label: 'Total covers', note: '+8.4% vs next week' }}
    />
  )
}`

export const options: ShowcaseOption[] = [
  { id: 'bar', label: 'Bar card', code: barCode },
  { id: 'channel', label: 'Channel card', code: channelCode },
  { id: 'periods', label: 'Periods', code: periodsCode },
]

function WithPeriods() {
  const [period, setPeriod] = React.useState('7 days')
  return (
    <BarCard
      title="Covers by day"
      range="Oct 26 – Nov 1, 2026"
      data={covers}
      unit="covers"
      periods={periods}
      value={period}
      onPeriodChange={setPeriod}
      legend={{ label: 'Total covers', note: '+8.4% vs next week' }}
      footer={<Footer />}
    />
  )
}

export default function ChartDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Chart"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <div className="w-[400px] max-w-full">
          {id === 'bar' && (
            <BarCard
              title="Covers by day"
              range="Oct 26 – Nov 1, 2026"
              data={covers}
              unit="covers"
              legend={{ label: 'Total covers', note: '+8.4% vs next week' }}
              footer={<Footer />}
            />
          )}
          {id === 'channel' && (
            <ChannelCard
              title="Revenue by channel"
              range="Oct 26 – Nov 1, 2026"
              data={channels}
              change="+5.2%"
              formatValue={euro}
              footer={<Footer />}
            />
          )}
          {id === 'periods' && <WithPeriods />}
        </div>
      )}
    />
  )
}
