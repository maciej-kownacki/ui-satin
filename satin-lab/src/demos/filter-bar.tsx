import * as React from 'react'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { ChipAvatar } from '@uisatin/ui/chip'
import { Table, type Column } from '@uisatin/ui/table'
import { FilterBar, applyFilters, toFilterDate, type Filter, type FilterField } from '@uisatin/pro/filter-bar'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

/*
 * The Sales pipeline: 48 deals dated around today, so "this quarter" always means something.
 * The bar opens on my pipeline, over €20,000, closing this quarter: 14 deals.
 */

type Stage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won'
type Deal = { id: string; company: string; owner: string; stage: Stage; value: number; close: string; tags: string[] }

const STAGES: Stage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won']
const STAGE_TONE: Record<Stage, BadgeTone> = { Lead: 'neutral', Qualified: 'sky', Proposal: 'plum', Negotiation: 'amber', Won: 'green' }

/** The person using the app. */
const ME = 'tara'
const PEOPLE = [
  { value: 'tara', label: 'Tara Mendes', initials: 'TM', tone: 'plum' as const },
  { value: 'jon', label: 'Jon Park', initials: 'JP', tone: 'sky' as const },
  { value: 'ada', label: 'Ada Novak', initials: 'AN', tone: 'green' as const },
  { value: 'sam', label: 'Sam Okafor', initials: 'SO', tone: 'amber' as const },
]
const NAMES: Record<string, string> = Object.fromEntries(PEOPLE.map((p) => [p.value, p.label]))

/** Tara (me) owns 26; 19 of hers are over €20,000; 14 of those close this quarter. */
function pipeline(): Deal[] {
  const now = new Date()
  const q = new Date(now.getFullYear(), now.getMonth() - (now.getMonth() % 3), 1)
  const day = (month: number, d: number) => toFilterDate(new Date(q.getFullYear(), q.getMonth() + month, d))
  const brands = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Stark', 'Wayne', 'Hooli', 'Vandelay', 'Soylent', 'Cyberdyne', 'Tyrell', 'Wonka']
  const kinds = ['', ' Health', ' Logistics', ' Labs']
  const names = kinds.flatMap((k) => brands.map((b) => `${b}${k}`))
  const tagsOf = (i: number) => [['vip'], ['eu'], [], ['eu', 'renewal'], ['renewal'], []][i % 6]
  const deals: Deal[] = []
  const add = (owner: string, value: number, close: string, i: number) =>
    deals.push({ id: `d${deals.length}`, company: names[deals.length], owner, stage: STAGES[i % 5], value, close, tags: tagsOf(i) })
  // Mine, over 20,000, closing this quarter.
  for (let i = 0; i < 14; i++) add('tara', 21500 + ((i * 7919) % 70) * 1000, day(i % 3, 3 + ((i * 5) % 25)), i)
  // Mine, over 20,000, closing another quarter.
  for (let i = 0; i < 5; i++) add('tara', 24000 + i * 9000, day(i % 2 ? 3 + i : -1 - i, 12), i + 2)
  // Mine, 20,000 or less.
  for (let i = 0; i < 7; i++) add('tara', 4000 + i * 2500, day(i % 4, 9), i + 1)
  // The team's.
  for (let i = 0; i < 22; i++) add(['jon', 'ada', 'sam'][i % 3], 6000 + ((i * 3571) % 80) * 1000, day((i % 7) - 2, 2 + i), i)
  return deals
}

const fields: FilterField[] = [
  {
    key: 'owner',
    label: 'Owner',
    type: 'person',
    me: ME,
    options: PEOPLE.map((p) => ({ value: p.value, label: p.label, icon: <ChipAvatar initials={p.initials} tone={p.tone} /> })),
  },
  { key: 'stage', label: 'Stage', type: 'enum', options: STAGES.map((s) => ({ value: s, label: s, tone: STAGE_TONE[s] })) },
  {
    key: 'value',
    label: 'Value',
    type: 'number',
    format: { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 },
    presets: [
      { operator: 'gt', value: 10_000, label: '> €10k' },
      { operator: 'gt', value: 20_000, label: '> €20k' },
      { operator: 'gt', value: 50_000, label: '> €50k' },
      { operator: 'lt', value: 10_000, label: '< €10k' },
    ],
  },
  { key: 'close', label: 'Close date', shortLabel: 'Close', type: 'date' },
  {
    key: 'tags',
    label: 'Tags',
    type: 'multi',
    options: [
      { value: 'vip', label: 'VIP' },
      { value: 'eu', label: 'EU' },
      { value: 'renewal', label: 'Renewal' },
    ],
  },
]

/** My pipeline, over €20,000, closing this quarter: 14 deals. */
const SCENARIO: Filter[] = [
  { field: 'owner', operator: 'is', value: ME },
  { field: 'value', operator: 'gt', value: 20000 },
  { field: 'close', operator: 'inThis', value: 'quarter' },
]

const euro = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

const columns: Column<Deal>[] = [
  { key: 'company', header: 'Deal', width: 1.5 },
  { key: 'owner', header: 'Owner', width: 1.3, cell: (d) => NAMES[d.owner] },
  {
    key: 'stage',
    header: 'Stage',
    width: 1.2,
    cell: (d) => (
      <Badge size="sm" tone={STAGE_TONE[d.stage]}>
        {d.stage}
      </Badge>
    ),
  },
  { key: 'value', header: 'Value', width: 1, align: 'right', cell: (d) => euro.format(d.value) },
  { key: 'close', header: 'Close', width: 0.9, align: 'right', cell: (d) => date.format(new Date(`${d.close}T00:00`)) },
]

/** The first five rows and how many more there are. */
function DealsTable({ rows }: { rows: Deal[] }) {
  const more = rows.length - 5
  return (
    <>
      <Table label="Deals" columns={columns} rows={rows.slice(0, 5)} />
      {more > 0 && <p className="text-sm text-text-muted">{more} more {more === 1 ? 'deal' : 'deals'}</p>}
    </>
  )
}

const code = `import { FilterBar, applyFilters, type Filter, type FilterField } from '@uisatin/pro/filter-bar'
import { Table } from '@uisatin/ui/table'

const fields: FilterField[] = [
  { key: 'owner', label: 'Owner', type: 'person', me: currentUser.id, options: people },
  { key: 'stage', label: 'Stage', type: 'enum', options: stages }, // { value, label, tone }
  {
    key: 'value',
    label: 'Value',
    type: 'number',
    format: { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 },
    presets: [
      { operator: 'gt', value: 10_000, label: '> €10k' },
      { operator: 'gt', value: 20_000, label: '> €20k' },
      { operator: 'lt', value: 10_000, label: '< €10k' },
    ],
  },
  { key: 'close', label: 'Close date', shortLabel: 'Close', type: 'date' },
  { key: 'tags', label: 'Tags', type: 'multi', options: tags },
]

export function Pipeline({ deals }: { deals: Deal[] }) {
  // Plain JSON: keep it in the URL or save it with the view.
  const [filters, setFilters] = React.useState<Filter[]>([
    { field: 'owner', operator: 'is', value: currentUser.id },
    { field: 'value', operator: 'gt', value: 20000 },
    { field: 'close', operator: 'inThis', value: 'quarter' },
  ])
  const shown = applyFilters(deals, filters, fields)

  return (
    <div>
      <FilterBar
        fields={fields}
        value={filters}
        onValueChange={setFilters}
        resultCount={shown.length}
        resultLabel={(count, number) => <>{number} {count === 1 ? 'deal' : 'deals'}</>}
      />
      <Table label="Deals" columns={columns} rows={shown} />
    </div>
  )
}`

export const options: ShowcaseOption[] = [{ id: 'default', label: 'Sales pipeline', code }]

/** A rep narrows the pipeline facet by facet and watches the count follow. */
function Pipeline() {
  const deals = React.useMemo(pipeline, [])
  const [filters, setFilters] = React.useState<Filter[]>(SCENARIO)
  const shown = applyFilters(deals, filters, fields)
  return (
    <div className="flex w-[760px] max-w-full flex-col gap-3">
      <FilterBar
        fields={fields}
        value={filters}
        onValueChange={setFilters}
        resultCount={shown.length}
        resultLabel={(count, number) => (
          <>
            {number} {count === 1 ? 'deal' : 'deals'}
          </>
        )}
      />
      <DealsTable rows={shown} />
    </div>
  )
}

export default function FilterBarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Filter bar" options={options} codeHtml={codeHtml} align="top" render={() => <Pipeline />} />
}
