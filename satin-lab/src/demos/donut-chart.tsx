import { DonutCard } from '@satin/ui/donut-chart'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const base = [
  { label: 'Dine-in', value: 29430 },
  { label: 'Delivery apps', value: 9650 },
  { label: 'Takeaway', value: 5790 },
  { label: 'Catering', value: 2420 },
]

// Each period scales the week and tilts the mix a little, so switching shows the ring move.
const PERIOD_DATA: Record<string, { range: string; factor: number; tilt: number[] }> = {
  '7 days': { range: 'Oct 26 – Nov 1, 2026', factor: 1, tilt: [1, 1, 1, 1] },
  '30 days': { range: 'Oct 3 – Nov 1, 2026', factor: 4.1, tilt: [0.96, 1.08, 1.02, 1.1] },
  '90 days': { range: 'Aug 4 – Nov 1, 2026', factor: 12.6, tilt: [0.92, 1.14, 1.05, 1.24] },
  '365 days': { range: 'Nov 2, 2025 – Nov 1, 2026', factor: 50.8, tilt: [0.9, 1.2, 1.1, 1.3] },
}
const PERIODS = Object.keys(PERIOD_DATA)
const dataFor = (p: string) => base.map((d, i) => ({ ...d, value: Math.round(d.value * PERIOD_DATA[p].factor * PERIOD_DATA[p].tilt[i]) }))
const euro = (n: number) => `€${n.toLocaleString('en-US')}`

export const controls: ShowcaseControl[] = [
  { id: 'width', label: 'Width', items: [{ value: 'compact', label: 'Compact' }, { value: 'wide', label: 'Wide' }] },
  { id: 'period', label: 'Period', type: 'menu', default: '7 days', items: PERIODS.map((p) => ({ value: p, label: p })) },
  { id: 'highlight', label: 'Highlight', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  return `import * as React from 'react'
import { DonutCard } from '@satin/ui/donut-chart'

const channels = [
${dataFor(v.period).map((d) => `  { label: '${d.label}', value: ${d.value} },`).join('\n')}
]

export function Revenue() {
  const [period, setPeriod] = React.useState('${v.period}')
  return (
    <DonutCard
      title="Revenue by channel"
      range="${PERIOD_DATA[v.period].range}"
      data={channels}
      centerLabel="Total revenue"
      formatValue={(n) => \`€\${n.toLocaleString('en-US')}\`}
      periods={${JSON.stringify(PERIODS).replace(/"/g, "'")}}
      value={period}
      onPeriodChange={setPeriod}${v.highlight === 'on' ? '\n      highlight={1}' : ''}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.period, v.highlight === 'on' ? 'Highlighted' : 'At rest', v.width === 'wide' ? 'Wide' : 'Compact'].join(' · '),
  code: code(v),
}))

export default function DonutChartDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Donut chart"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v, set) => (
        <div className={v.width === 'wide' ? 'w-[720px] max-w-full' : 'w-[400px] max-w-full'}>
          <DonutCard
            title="Revenue by channel"
            range={PERIOD_DATA[v.period].range}
            data={dataFor(v.period)}
            centerLabel="Total revenue"
            formatValue={euro}
            periods={PERIODS}
            value={v.period}
            onPeriodChange={(p) => set('period', p)}
            highlight={v.highlight === 'on' ? 1 : undefined}
          />
        </div>
      )}
    />
  )
}
