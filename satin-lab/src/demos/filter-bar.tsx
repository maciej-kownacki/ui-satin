import * as React from 'react'
import { Calendar, Coins, Label, Text, User, ViewColumns3 } from 'iconoir-react'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { ChipAvatar } from '@uisatin/ui/chip'
import { Table, type Column } from '@uisatin/ui/table'
import { FilterBar, applyFilters, toFilterDate, type Filter, type FilterField, type FilterView } from '@uisatin/pro/filter-bar'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Stage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won'
type Deal = { id: string; company: string; owner: string; stage: Stage; value: number; close: string; tags: string[] }

const STAGES: Stage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won']
const STAGE_TONE: Record<Stage, BadgeTone> = { Lead: 'neutral', Qualified: 'sky', Proposal: 'plum', Negotiation: 'amber', Won: 'green' }
const PEOPLE = [
  { value: 'tara', label: 'Tara Mendes', initials: 'TM', tone: 'plum' as const },
  { value: 'jon', label: 'Jon Park', initials: 'JP', tone: 'sky' as const },
  { value: 'ada', label: 'Ada Novak', initials: 'AN', tone: 'green' as const },
  { value: 'sam', label: 'Sam Okafor', initials: 'SO', tone: 'amber' as const },
]
const NAMES = Object.fromEntries(PEOPLE.map((p) => [p.value, p.label]))

/**
 * The Sales scenario: 48 deals, dated around today so "this quarter" always means something.
 * Tara (me) owns 26; 19 of hers are over €20,000; 14 of those close this quarter.
 */
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

const avatar = (p: (typeof PEOPLE)[number]) => <ChipAvatar initials={p.initials} tone={p.tone} />

const fields: FilterField[] = [
  { key: 'owner', label: 'Owner', type: 'person', icon: <User />, me: 'tara', options: PEOPLE.map((p) => ({ value: p.value, label: p.label, icon: avatar(p) })) },
  { key: 'stage', label: 'Stage', type: 'enum', icon: <ViewColumns3 />, options: STAGES.map((s) => ({ value: s, label: s })) },
  {
    key: 'value',
    label: 'Value',
    type: 'number',
    icon: <Coins />,
    min: 0,
    step: 1000,
    operators: ['gt', 'lt', 'between', 'eq'],
    format: { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 },
  },
  { key: 'close', label: 'Close date', type: 'date', icon: <Calendar />, operators: ['inThis', 'inLast', 'is', 'before', 'after', 'between'] },
  { key: 'company', label: 'Deal', type: 'text', icon: <Text />, placeholder: 'Company name' },
  {
    key: 'tags',
    label: 'Tags',
    type: 'multi',
    icon: <Label />,
    options: [
      { value: 'vip', label: 'VIP' },
      { value: 'eu', label: 'EU' },
      { value: 'renewal', label: 'Renewal' },
    ],
  },
]

const SCENARIO: Filter[] = [
  { field: 'owner', operator: 'is', value: 'tara' },
  { field: 'value', operator: 'gt', value: 20000 },
  { field: 'close', operator: 'inThis', value: 'quarter' },
]
const MANY: Filter[] = [
  { field: 'owner', operator: 'isAnyOf', value: ['tara', 'jon'] },
  { field: 'stage', operator: 'isNot', value: 'Lead' },
  { field: 'value', operator: 'between', value: [5000, 100000] },
  { field: 'close', operator: 'inLast', value: 365 },
  { field: 'tags', operator: 'hasNoneOf', value: ['renewal'] },
  { field: 'company', operator: 'doesNotContain', value: 'Labs' },
  { field: 'stage', operator: 'isNot', value: 'Won' },
]
const STARTS: Record<string, Filter[]> = { scenario: SCENARIO, empty: [], many: MANY }

const VIEWS: FilterView[] = [
  { id: 'all', label: 'All deals', value: [] },
  { id: 'mine', label: 'My pipeline', value: [{ field: 'owner', operator: 'is', value: 'tara' }] },
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

export const controls: ShowcaseControl[] = [
  {
    id: 'start',
    label: 'Filters',
    items: [
      { value: 'scenario', label: 'Pipeline' },
      { value: 'empty', label: 'Empty' },
      { value: 'many', label: 'Many' },
    ],
  },
  { id: 'search', label: 'Search', type: 'switch', default: 'on' },
  { id: 'views', label: 'Views', type: 'switch', default: 'on' },
]

function code(v: Record<string, string>) {
  const search = v.search === 'on'
  const views = v.views === 'on'
  const start =
    v.start === 'scenario'
      ? `[
    { field: 'owner', operator: 'is', value: 'tara' },
    { field: 'value', operator: 'gt', value: 20000 },
    { field: 'close', operator: 'inThis', value: 'quarter' },
  ]`
      : v.start === 'many'
        ? 'savedFilters'
        : '[]'
  return `import { FilterBar, applyFilters, type Filter, type FilterField } from '@uisatin/pro/filter-bar'
import { Table } from '@uisatin/ui/table'

const fields: FilterField[] = [
  { key: 'owner', label: 'Owner', type: 'person', me: currentUser.id, options: people },
  { key: 'stage', label: 'Stage', type: 'enum', options: stages },
  { key: 'value', label: 'Value', type: 'number', min: 0, step: 1000, format: { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 } },
  { key: 'close', label: 'Close date', type: 'date', operators: ['inThis', 'inLast', 'is', 'before', 'after', 'between'] },
  { key: 'company', label: 'Deal', type: 'text' },
  { key: 'tags', label: 'Tags', type: 'multi', options: tags },
]

export function Pipeline({ deals }: { deals: Deal[] }) {
  // Plain JSON: keep it in the URL or save it as a view.
  const [filters, setFilters] = React.useState<Filter[]>(${start})${search ? `\n  const [query, setQuery] = React.useState('')` : ''}
  const shown = applyFilters(deals, filters, fields)${search ? `.filter((d) => d.company.toLowerCase().includes(query.toLowerCase()))` : ''}

  return (
    <div>
      <FilterBar
        fields={fields}
        value={filters}
        onValueChange={setFilters}
        resultCount={shown.length}
        resultLabel={(count, number) => <>{number} {count === 1 ? 'deal' : 'deals'}</>}${
          search
            ? `
        search
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search deals…"`
            : ''
        }${
          views
            ? `
        views={views}
        onSaveView={(label, value) => saveView({ label, value })}`
            : ''
        }
      />
      <Table label="Deals" columns={columns} rows={shown} />
    </div>
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [{ scenario: 'Pipeline', empty: 'Empty', many: 'Many' }[v.start], v.search === 'on' ? 'Search' : 'No search', v.views === 'on' ? 'Views' : 'No views'].join(' · '),
  code: code(v),
}))

/** The Sales scenario: a rep narrows the pipeline chip by chip and watches the count follow. */
function Preview({ v }: { v: Record<string, string> }) {
  const deals = React.useMemo(pipeline, [])
  const [filters, setFilters] = React.useState<Filter[]>(STARTS[v.start] ?? [])
  const [query, setQuery] = React.useState('')
  const [views, setViews] = React.useState(VIEWS)
  const shown = applyFilters(deals, filters, fields).filter((d) => d.company.toLowerCase().includes(query.trim().toLowerCase()))
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
        search={v.search === 'on'}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search deals…"
        views={v.views === 'on' ? views : undefined}
        onSaveView={v.views === 'on' ? (label, value) => setViews((all) => [...all, { id: `v${all.length}`, label, value }]) : undefined}
        maxVisible={v.start === 'many' ? 4 : undefined}
      />
      <Table label="Deals" columns={columns} rows={shown.slice(0, 5)} />
      {shown.length > 5 && <p className="text-sm text-text-muted">{shown.length - 5} more deals</p>}
    </div>
  )
}

export default function FilterBarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Filter bar" options={options} codeHtml={codeHtml} controls={controls} align="top" render={(id, v) => <Preview key={id} v={v} />} />
}
