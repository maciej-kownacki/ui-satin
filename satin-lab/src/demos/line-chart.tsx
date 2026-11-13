import * as React from 'react'
import { LineCard, AreaCard } from '@uisatin/ui/line-chart'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import { DATA, PERIODS, format } from './covers-data'

// The point shown as hovered with Highlight: the busiest one in the period.
const busiest = (period: string) => {
  const values = DATA[period].data.map((d) => d.value)
  return values.indexOf(Math.max(...values))
}

export const controls: ShowcaseControl[] = [
  { id: 'width', label: 'Width', items: [{ value: 'compact', label: 'Compact' }, { value: 'wide', label: 'Wide' }] },
  { id: 'periods', label: 'Period select', type: 'switch', default: 'on' },
  { id: 'period', label: 'Period', type: 'menu', default: '7 days', items: PERIODS.flat().map((p) => ({ value: p, label: p })) },
  { id: 'highlight', label: 'Highlight', type: 'switch', default: 'off' },
]

export function makeDemo(kind: 'line' | 'area') {
  const Card = kind === 'area' ? AreaCard : LineCard
  const name = kind === 'area' ? 'AreaCard' : 'LineCard'
  const title = kind === 'area' ? 'Covers' : 'Orders'

  const code = (v: Record<string, string>) => {
    const withPeriods = v.periods === 'on'
    const { range, data } = DATA[v.period]
    const d = data[0]
    const key = withPeriods ? 'period' : `'${v.period}'`
    const attrs = [
      `title="${title}"`,
      `range={\`\${data[${key}].range} · vs previous period\`}`,
      `data={data[${key}].data}`,
      'change="+8.4%"',
      `unit="${title.toLowerCase()}"`,
      'formatValue={compact}',
      ...(withPeriods ? ["periods={[['7 days', '30 days', '90 days', '365 days'], ['Sep', 'Oct', 'Nov'], ['2025', '2026']]}", 'value={period}', 'onPeriodChange={setPeriod}'] : []),
      ...(v.highlight === 'on' ? [`highlight={${busiest(v.period)}}`] : []),
    ]
    return `${withPeriods ? "import * as React from 'react'\n" : ''}import { ${name} } from '@uisatin/ui/line-chart'

const data = {
  '${v.period}': {
    range: '${range}',
    data: [
      { label: '${d.label}', value: ${d.value}, tooltipLabel: '${d.tooltipLabel}' },
      // …one entry per point
    ],
  },
  // …one entry per period
}

const compact = (n: number) => (n >= 1000 ? \`\${+(n / 1000).toFixed(1)}k\` : n.toLocaleString('en-US'))

export function ${title}() {
${withPeriods ? `  const [period, setPeriod] = React.useState('${v.period}')\n` : ''}  return (
    <${name}
${attrs.map((a) => `      ${a}`).join('\n')}
    />
  )
}`
  }

  const options: ShowcaseOption[] = combos(controls).map((v) => ({
    id: comboId(controls, v),
    label: [v.period, v.periods === 'on' ? 'Period select' : 'No select', v.highlight === 'on' ? 'Highlighted' : 'At rest', v.width === 'wide' ? 'Wide' : 'Compact'].join(' · '),
    code: code(v),
  }))

  function Demo({ codeHtml }: { codeHtml: Record<string, string> }) {
    return (
      <Showcase
        name={kind === 'area' ? 'Area chart' : 'Line chart'}
        options={options}
        codeHtml={codeHtml}
        controls={controls}
        render={(_, v, set) => (
          <div className={v.width === 'wide' ? 'w-[720px] max-w-full' : 'w-[400px] max-w-full'}>
            <Card
              title={title}
              range={`${DATA[v.period].range} · vs previous period`}
              data={DATA[v.period].data}
              change="+8.4%"
              unit={title.toLowerCase()}
              formatValue={format}
              {...(v.periods === 'on' && { periods: PERIODS, value: v.period, onPeriodChange: (p: string) => set('period', p) })}
              highlight={v.highlight === 'on' ? busiest(v.period) : undefined}
            />
          </div>
        )}
      />
    )
  }
  return { options, Demo }
}

const line = makeDemo('line')
export const options = line.options
export default line.Demo
