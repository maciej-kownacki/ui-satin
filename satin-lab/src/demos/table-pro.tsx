import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { TableGrouped, type TableGroupedColumn } from '@uisatin/pro/table-pro'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Stage = 'Qualified' | 'Proposal' | 'Negotiation' | 'Won'
/** A deal, or one line of a deal (lines have no stage, owner or odds of their own). */
type Deal = { id: string; company: string; stage?: Stage; owner?: string; value: number; probability?: number; close?: string; lines?: Deal[] }

const STAGE_TONE: Record<Stage, BadgeTone> = { Qualified: 'sky', Proposal: 'plum', Negotiation: 'amber', Won: 'green' }
const STAGES: Stage[] = ['Qualified', 'Proposal', 'Negotiation', 'Won']

const DEALS: Deal[] = [
  {
    id: 'acme',
    company: 'Acme Corp',
    stage: 'Proposal',
    owner: 'Tara Mendes',
    value: 48000,
    probability: 0.5,
    close: '2026-12-12',
    lines: [
      { id: 'acme-licence', company: 'Platform licence', value: 36000 },
      { id: 'acme-onboarding', company: 'Onboarding', value: 12000 },
    ],
  },
  { id: 'globex', company: 'Globex', stage: 'Qualified', owner: 'Jon Park', value: 22500, probability: 0.3, close: '2027-01-20' },
  { id: 'initech', company: 'Initech', stage: 'Proposal', owner: 'Tara Mendes', value: 31200, probability: 0.45, close: '2026-12-19' },
  {
    id: 'wayne',
    company: 'Wayne Freight',
    stage: 'Negotiation',
    owner: 'Jon Park',
    value: 56400,
    probability: 0.7,
    close: '2026-12-05',
    lines: [
      { id: 'wayne-licence', company: 'Platform licence', value: 42000 },
      { id: 'wayne-support', company: 'Priority support', value: 14400 },
    ],
  },
  { id: 'hooli', company: 'Hooli', stage: 'Negotiation', owner: 'Ada Novak', value: 18900, probability: 0.65, close: '2026-12-08' },
  { id: 'stark', company: 'Stark Logistics', stage: 'Won', owner: 'Jon Park', value: 64000, probability: 1, close: '2026-11-14' },
  { id: 'soylent', company: 'Soylent Foods', stage: 'Won', owner: 'Ada Novak', value: 12300, probability: 1, close: '2026-11-03' },
]

const eur = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat('en-US', { style: 'percent' })
const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

const stageBadge = (stage: Stage) => (
  <Badge size="sm" tone={STAGE_TONE[stage]}>
    {stage}
  </Badge>
)

// With overflow="scroll", widths are pixels: 870 of them in a 640px stage, so the rest scroll
// under the pinned Company column.
const allColumns: TableGroupedColumn<Deal>[] = [
  { key: 'company', header: 'Company', width: 220, sortable: true },
  { key: 'stage', header: 'Stage', width: 130, cell: (d) => d.stage && stageBadge(d.stage) },
  { key: 'owner', header: 'Owner', width: 140 },
  { key: 'value', header: 'Value', width: 120, align: 'right', sortable: true, format: (v) => eur.format(v), aggregate: 'sum' },
  { key: 'probability', header: 'Odds', width: 100, align: 'right', sortable: true, format: (v) => percent.format(v), aggregate: 'avg' },
  {
    key: 'weighted',
    header: 'Weighted',
    width: 120,
    align: 'right',
    cell: (d) => d.probability != null && eur.format(d.value * d.probability),
    format: (v) => eur.format(v),
    aggregate: (rows) => rows.reduce((sum, d) => sum + d.value * (d.probability ?? 0), 0),
  },
  { key: 'close', header: 'Close', width: 110, sortable: true, cell: (d) => d.close && date.format(new Date(d.close)) },
]

export const controls: ShowcaseControl[] = [
  { id: 'group', label: 'Group by stage', type: 'switch', default: 'on' },
  { id: 'density', label: 'Density', items: [{ value: 'default', label: 'Default' }, { value: 'compact', label: 'Compact' }] },
  { id: 'footer', label: 'Totals', type: 'switch', default: 'on' },
]

function code(v: Record<string, string>) {
  const grouped = v.group === 'on'
  const attrs = [
    grouped && `\n      groupBy="stage"\n      groupOrder={['Qualified', 'Proposal', 'Negotiation', 'Won']}\n      renderGroup={(group) => <StageBadge stage={group.value} />}\n      defaultCollapsedGroups={['Won']}`,
    `\n      getSubRows={(deal) => deal.lines}\n      defaultExpanded={['acme']}`,
    '\n      pinned="start"\n      overflow="scroll"',
    v.density === 'compact' && '\n      density="compact"',
    v.footer === 'on' && '\n      footer',
  ]
    .filter(Boolean)
    .join('')
  return `import { TableGrouped, type TableGroupedColumn } from '@uisatin/pro/table-pro'

const eur = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat('en-US', { style: 'percent' })

// format writes the cells, the group subtotals and the totals alike; aggregate says how to total.
const columns: TableGroupedColumn<Deal>[] = [
  { key: 'company', header: 'Company', width: 220, sortable: true },${grouped ? '' : `\n  { key: 'stage', header: 'Stage', width: 130, cell: (d) => d.stage && <StageBadge stage={d.stage} /> },`}
  { key: 'owner', header: 'Owner', width: 140 },
  { key: 'value', header: 'Value', width: 120, align: 'right', sortable: true, format: (v) => eur.format(v), aggregate: 'sum' },
  { key: 'probability', header: 'Odds', width: 100, align: 'right', sortable: true, format: (v) => percent.format(v), aggregate: 'avg' },
  {
    key: 'weighted',
    header: 'Weighted',
    width: 120,
    align: 'right',
    cell: (d) => d.probability != null && eur.format(d.value * d.probability),
    format: (v) => eur.format(v),
    aggregate: (rows) => rows.reduce((sum, d) => sum + d.value * (d.probability ?? 0), 0),
  },
  { key: 'close', header: 'Close', width: 110, sortable: true, cell: (d) => d.close && formatDate(d.close) },
]

export function Pipeline({ deals }: { deals: Deal[] }) {
  return (
    <TableGrouped
      label="Deals"
      columns={columns}
      rows={deals}${attrs}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.group === 'on' ? 'Grouped' : 'Not grouped', v.density === 'compact' ? 'Compact' : 'Default', v.footer === 'on' ? 'Totals' : 'No totals'].join(' · '),
  code: code(v),
}))

export default function TableProDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Grouped table"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      align="top"
      render={(id, v) => {
        const grouped = v.group === 'on'
        return (
          <div className="w-[640px] max-w-full">
            <TableGrouped
              key={id}
              label="Deals"
              columns={grouped ? allColumns.filter((c) => c.key !== 'stage') : allColumns}
              rows={DEALS}
              getSubRows={(d) => d.lines}
              defaultExpanded={['acme']}
              groupBy={grouped ? 'stage' : undefined}
              groupOrder={STAGES}
              renderGroup={(g) => stageBadge(g.value as Stage)}
              defaultCollapsedGroups={['Won']}
              pinned="start"
              overflow="scroll"
              density={v.density as 'default' | 'compact'}
              footer={v.footer === 'on'}
            />
          </div>
        )
      }}
    />
  )
}
