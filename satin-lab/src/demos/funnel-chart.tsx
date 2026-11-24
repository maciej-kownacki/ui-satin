import * as React from 'react'
import { FunnelChart, type FunnelConversion, type FunnelStage } from '@uisatin/pro/funnel-chart'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/**
 * Funnel chart (Satin Pro): a quarter of hiring, Applied 240 down to Hired 3, flowing left to
 * right as the page opens, or top to bottom. The controls set the orientation, which conversions each stage says
 * and whether the data table shows under the funnel. Three of the four steps lose half or more,
 * so they carry the amber drop-off Badge. The second demo is a sales pipeline in euros, as
 * a funnel flowing top to bottom, with a stricter `dropOffWarning`.
 *
 * The stage is pinned to the top at the tallest combination's height (rows with the table), so
 * switching the props never moves the controls under it.
 */

const hiring = (values: number[]): FunnelStage[] =>
  ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'].map((label, i) => ({ label, value: values[i] }))

// The period Select in the card's header swaps the quarter for another span.
const PERIODS: Record<string, { range: string; stages: FunnelStage[] }> = {
  'Last 30 days': { range: 'Aug 31 – Sep 30, 2026', stages: hiring([86, 24, 8, 2, 1]) },
  'This quarter': { range: 'Jul 1 – Sep 30, 2026', stages: hiring([240, 60, 18, 4, 3]) },
  'This year': { range: 'Jan 1 – Sep 30, 2026', stages: hiring([712, 196, 61, 15, 11]) },
}
const HIRING = PERIODS['This quarter'].stages

const SALES: FunnelStage[] = [
  { label: 'Leads', value: 1_200_000 },
  { label: 'Qualified', value: 480_000 },
  { label: 'Proposal', value: 180_000 },
  { label: 'Negotiation', value: 90_000 },
  { label: 'Won', value: 54_000 },
]

const euros = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

const CONVERSIONS: { value: FunnelConversion; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'previous', label: 'From previous' },
  { value: 'first', label: 'From first' },
]

const stagesCode = (name: string, stages: FunnelStage[], format: (v: number) => string) =>
  `const ${name} = [\n${stages.map((s) => `  { label: '${s.label}', value: ${format(s.value)} },`).join('\n')}\n]`

const plain = (v: number) => String(v)
const underscored = (v: number) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '_')

/* ---------- hiring ---------- */

export const controls: ShowcaseControl[] = [
  { id: 'orientation', label: 'Orientation', items: [{ value: 'horizontal', label: 'Left to right' }, { value: 'vertical', label: 'Top to bottom' }] },
  { id: 'conversion', label: 'Conversion', type: 'menu', default: 'both', items: CONVERSIONS },
  { id: 'table', label: 'Table', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const attrs = [
    'title="Hiring"',
    'range={PERIODS[period].range}',
    'stages={PERIODS[period].stages}',
    'periods={Object.keys(PERIODS)}',
    'value={period}',
    'onPeriodChange={setPeriod}',
    ...(v.orientation === 'vertical' ? ['orientation="vertical"'] : []),
    ...(v.conversion !== 'both' ? [`showConversion="${v.conversion}"`] : []),
    ...(v.table === 'on' ? ['showTable'] : []),
  ]
  return `import * as React from 'react'
import { FunnelChart } from '@uisatin/pro/funnel-chart'

// One entry per stage, first to last.
${stagesCode('hiring', HIRING, plain)}

// Each period's range and stages; the Select in the header picks one.
const PERIODS = {
  'Last 30 days': { range: 'Aug 31 – Sep 30, 2026', stages: [/* … */] },
  'This quarter': { range: 'Jul 1 – Sep 30, 2026', stages: hiring },
  'This year': { range: 'Jan 1 – Sep 30, 2026', stages: [/* … */] },
}

export function HiringFunnel() {
  const [period, setPeriod] = React.useState('This quarter')
  return (
    <FunnelChart
${attrs.map((a) => `      ${a}`).join('\n')}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    v.orientation === 'vertical' ? 'Top to bottom' : 'Left to right',
    CONVERSIONS.find((c) => c.value === v.conversion)?.label ?? '',
    v.table === 'on' ? 'Table shown' : 'Table hidden',
  ].join(' · '),
  code: code(v),
}))

export default function FunnelChartDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Funnel chart"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      align="top"
      render={(_, v) => <HiringCard v={v} />}
    />
  )
}

function HiringCard({ v }: { v: Record<string, string> }) {
  const [period, setPeriod] = React.useState('This quarter')
  return (
    <div className="w-[560px] max-w-full">
      <FunnelChart
        title="Hiring"
        range={PERIODS[period].range}
        stages={PERIODS[period].stages}
        periods={Object.keys(PERIODS)}
        value={period}
        onPeriodChange={setPeriod}
        orientation={v.orientation as 'horizontal' | 'vertical'}
        showConversion={v.conversion as FunnelConversion}
        showTable={v.table === 'on'}
      />
    </div>
  )
}

/* ---------- sales ---------- */

export const salesControls: ShowcaseControl[] = [{ id: 'conversion', label: 'Conversion', type: 'menu', default: 'both', items: CONVERSIONS }]

function salesCode(v: Record<string, string>) {
  const attrs = [
    'title="Sales pipeline"',
    'range="Q3 2026"',
    'stages={pipeline}',
    'orientation="vertical"',
    'format={euros}',
    'dropOffWarning={0.55}',
    ...(v.conversion !== 'both' ? [`showConversion="${v.conversion}"`] : []),
  ]
  return `import { FunnelChart } from '@uisatin/pro/funnel-chart'

// Pipeline value in euros at each stage, first to last.
${stagesCode('pipeline', SALES, underscored)}

const euros = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

export function SalesFunnel() {
  return (
    <FunnelChart
${attrs.map((a) => `      ${a}`).join('\n')}
    />
  )
}`
}

export const salesOptions: ShowcaseOption[] = combos(salesControls).map((v) => ({
  id: comboId(salesControls, v),
  label: CONVERSIONS.find((c) => c.value === v.conversion)?.label ?? '',
  code: salesCode(v),
}))

export function FunnelChartSalesDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Sales funnel"
      options={salesOptions}
      codeHtml={codeHtml}
      controls={salesControls}
      align="top"
      render={(_, v) => (
        <div className="w-[560px] max-w-full">
          <FunnelChart
            title="Sales pipeline"
            range="Q3 2026"
            stages={SALES}
            orientation="vertical"
            format={euros}
            dropOffWarning={0.55}
            showConversion={v.conversion as FunnelConversion}
          />
        </div>
      )}
    />
  )
}
