import { Calendar, Coins, Label, Text, User, ViewColumns3 } from 'iconoir-react'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { ChipAvatar } from '@uisatin/ui/chip'
import { Table, type Column } from '@uisatin/ui/table'
import { toFilterDate, type Filter, type FilterField } from '@uisatin/pro/filter-bar'

/*
 * What every Filter bar direction shares: the Sales deals, their fields, the scenario and the
 * table under the bar. Each direction renders `<DealsTable rows={shown} />`, so only the bar differs.
 */

export type Stage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won'
export type Deal = { id: string; company: string; owner: string; stage: Stage; value: number; close: string; tags: string[] }

export const STAGES: Stage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won']
export const STAGE_TONE: Record<Stage, BadgeTone> = { Lead: 'neutral', Qualified: 'sky', Proposal: 'plum', Negotiation: 'amber', Won: 'green' }

/** The person using the app. */
export const ME = 'tara'
export const PEOPLE = [
  { value: 'tara', label: 'Tara Mendes', initials: 'TM', tone: 'plum' as const },
  { value: 'jon', label: 'Jon Park', initials: 'JP', tone: 'sky' as const },
  { value: 'ada', label: 'Ada Novak', initials: 'AN', tone: 'green' as const },
  { value: 'sam', label: 'Sam Okafor', initials: 'SO', tone: 'amber' as const },
]
export const NAMES: Record<string, string> = Object.fromEntries(PEOPLE.map((p) => [p.value, p.label]))

/**
 * The Sales scenario: 48 deals, dated around today so "this quarter" always means something.
 * Tara (me) owns 26; 19 of hers are over €20,000; 14 of those close this quarter.
 */
export function pipeline(): Deal[] {
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

export const fields: FilterField[] = [
  { key: 'owner', label: 'Owner', type: 'person', icon: <User />, me: ME, options: PEOPLE.map((p) => ({ value: p.value, label: p.label, icon: avatar(p) })) },
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

/** One field by its key. */
export const fieldOf = (key: string) => fields.find((f) => f.key === key) as FilterField

/** My pipeline, over €20,000, closing this quarter: 14 deals. Every direction opens here. */
export const SCENARIO: Filter[] = [
  { field: 'owner', operator: 'is', value: ME },
  { field: 'value', operator: 'gt', value: 20000 },
  { field: 'close', operator: 'inThis', value: 'quarter' },
]

export const euro = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
export const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

export const columns: Column<Deal>[] = [
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

/** "14 deals", "1 deal". */
export const dealsLabel = (count: number) => `${count} ${count === 1 ? 'deal' : 'deals'}`

/** The first five rows and how many more there are: the same table under every direction's bar. */
export function DealsTable({ rows }: { rows: Deal[] }) {
  const more = rows.length - 5
  return (
    <>
      <Table label="Deals" columns={columns} rows={rows.slice(0, 5)} />
      {more > 0 && <p className="text-sm text-text-muted">{more} more {more === 1 ? 'deal' : 'deals'}</p>}
    </>
  )
}
