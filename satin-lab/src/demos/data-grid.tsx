import * as React from 'react'
import { Search } from 'iconoir-react'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { Input } from '@uisatin/ui/input'
import { Select } from '@uisatin/ui/select'
import {
  DataGrid,
  DataGridColumnsMenu,
  DataGridToolbar,
  DataGridViewMenu,
  type DataGridColumn,
  type DataGridView,
} from '@uisatin/pro/data-grid'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/* ---------- the ATS: 1,200 candidates, the same on every load ---------- */

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'] as const
type Stage = (typeof STAGES)[number]
const STAGE_TONE: Record<Stage, BadgeTone> = { Applied: 'neutral', Screening: 'sky', Interview: 'plum', Offer: 'amber', Hired: 'green', Rejected: 'red' }

type Owner = { name: string; initials: string; tone: AvatarTone }
const OWNERS: Owner[] = [
  { name: 'Tara Mendes', initials: 'TM', tone: 'fuchsia' },
  { name: 'Jon Park', initials: 'JP', tone: 'sky' },
  { name: 'Ada Novak', initials: 'AN', tone: 'green' },
  { name: 'Leo Brandt', initials: 'LB', tone: 'amber' },
]

interface Candidate {
  id: string
  name: string
  stage: Stage
  skills: string[]
  source: string
  applied: Date
  owner: Owner
}

const FIRST = ['Ada', 'Bruno', 'Chloé', 'Dmitri', 'Elif', 'Farah', 'Gustav', 'Hana', 'Ines', 'Jonas', 'Kofi', 'Lena', 'Marek', 'Nadia', 'Omar', 'Priya', 'Quentin', 'Rosa', 'Sven', 'Tomás', 'Uma', 'Viktor', 'Wen', 'Yara', 'Zofia']
const LAST = ['Okafor', 'Lindqvist', 'Moreau', 'Petrov', 'Yilmaz', 'Haddad', 'Berg', 'Sato', 'Ferreira', 'Weber', 'Mensah', 'Kowalska', 'Novák', 'Rahman', 'Silva', 'Iyer', 'Laurent', 'García', 'Holm', 'Duarte']
const SKILLS = ['React', 'TypeScript', 'Go', 'Python', 'SQL', 'Figma', 'Kubernetes', 'Rust', 'GraphQL', 'Swift', 'Kotlin', 'Terraform']
const SOURCES = ['LinkedIn', 'Referral', 'Careers site', 'Indeed', 'Agency', 'Meetup']

/** A small seeded generator, so the list is the same for every reader and every render. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeCandidates(count: number): Candidate[] {
  const rand = seeded(7)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]
  const today = Date.UTC(2026, 10, 19)
  return Array.from({ length: count }, (_, i) => {
    const skills = new Set<string>()
    const n = 1 + Math.floor(rand() * 3)
    while (skills.size < n) skills.add(pick(SKILLS))
    return {
      id: `c${i + 1}`,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      // The newest few are all at Screening, so the scenario's row is the first one.
      stage: i < 3 ? 'Screening' : pick(STAGES),
      skills: [...skills],
      source: pick(SOURCES),
      applied: new Date(today - i * 3.6e6 * 7 - Math.floor(rand() * 3.6e6)),
      owner: pick(OWNERS),
    }
  })
}

const CANDIDATES = makeCandidates(1200)

const columns: DataGridColumn<Candidate>[] = [
  { key: 'name', header: 'Name', pinned: 'start', hideable: false, sortable: true, width: 190, minWidth: 140 },
  {
    key: 'stage',
    header: 'Stage',
    width: 140,
    sortable: true,
    editable: true,
    renderCell: ({ value }) => (
      <Badge size="sm" tone={STAGE_TONE[value]}>
        {value}
      </Badge>
    ),
    // Picking a stage saves it; closing the list without one leaves the cell as it was.
    renderEditor: ({ value, commit, cancel, inputProps }) => (
      <Select
        {...inputProps}
        size="sm"
        defaultOpen
        value={value}
        onValueChange={(v) => commit(v as Stage)}
        onOpenChange={(open) => !open && cancel()}
        options={STAGES.map((s) => ({ value: s, label: s }))}
        wrapperClassName="w-full"
        className="w-full"
      />
    ),
  },
  { key: 'skills', header: 'Skills', width: 200 },
  { key: 'source', header: 'Source', width: 130, sortable: true },
  { key: 'applied', header: 'Applied', width: 130, sortable: true },
  {
    key: 'owner',
    header: 'Owner',
    width: 170,
    renderCell: ({ value }) => (
      <>
        <Avatar size={20} initials={value.initials} tone={value.tone} />
        <span className="truncate">{value.name}</span>
      </>
    ),
  },
]

const VIEWS: DataGridView<{ query: string }>[] = [{ id: 'all', name: 'All candidates', sort: { key: 'applied', direction: 'desc' }, filters: { query: '' } }]

/* ---------- the page's controls and code ---------- */

export const controls: ShowcaseControl[] = [
  {
    id: 'state',
    label: 'State',
    items: [
      { value: 'rows', label: 'Rows' },
      { value: 'loading', label: 'Loading' },
      { value: 'empty', label: 'Empty' },
      { value: 'error', label: 'Error' },
    ],
  },
  { id: 'density', label: 'Density', items: [{ value: 'default', label: 'Default' }, { value: 'compact', label: 'Compact' }] },
  { id: 'fail', label: 'Saves fail', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const props = [
    v.density === 'compact' && '      density="compact"',
    v.state === 'loading' && '      loading',
    v.state === 'error' && "      error=\"The ATS didn't answer.\"\n      onRetry={reload}",
  ]
    .filter(Boolean)
    .join('\n')
  return `import { Badge } from '@uisatin/ui/badge'
import { Select } from '@uisatin/ui/select'
import {
  DataGrid, DataGridToolbar, DataGridColumnsMenu, DataGridViewMenu, type DataGridColumn,
} from '@uisatin/pro/data-grid'

const columns: DataGridColumn<Candidate>[] = [
  { key: 'name', header: 'Name', pinned: 'start', hideable: false, sortable: true, width: 190 },
  {
    key: 'stage',
    header: 'Stage',
    editable: true,
    renderCell: ({ value }) => <Badge size="sm" tone={STAGE_TONE[value]}>{value}</Badge>,
    renderEditor: ({ value, commit, cancel, inputProps }) => (
      <Select {...inputProps} size="sm" defaultOpen value={value} options={stages}
        onValueChange={commit} onOpenChange={(open) => !open && cancel()} />
    ),
  },
  { key: 'skills', header: 'Skills', width: 200 },
  { key: 'source', header: 'Source', sortable: true },
  { key: 'applied', header: 'Applied', sortable: true },
  { key: 'owner', header: 'Owner', renderCell: ({ value }) => <Owner person={value} /> },
]

export function Candidates({ candidates }: { candidates: Candidate[] }) {
  const [query, setQuery] = React.useState('')
  const rows = candidates.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <DataGrid
      label="Candidates"
      className="h-[560px]"
      columns={columns}
      rows={rows}
      selectable
      defaultSort={{ key: 'applied', direction: 'desc' }}
      filtered={query !== ''}
      onClearFilters={() => setQuery('')}
      onCellEdit={(id, key, value) => saveCandidate(id, { [key]: value })}${props ? `\n${props}` : ''}
      toolbar={
        <DataGridToolbar>
          <Input aria-label="Search candidates" value={query} onChange={(e) => setQuery(e.target.value)} />
          <DataGridColumnsMenu className="ms-auto" />
          <DataGridViewMenu
            defaultViews={views}
            defaultValue="all"
            filters={{ query }}
            onValueChange={(id, view) => setQuery(view?.filters?.query ?? '')}
          />
        </DataGridToolbar>
      }
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.state, v.density, v.fail === 'on' ? 'saves fail' : 'saves succeed'].join(' · '),
  code: code(v),
}))

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The ATS scenario: 1,200 candidates. A recruiter hides Source in Columns, moves the first
 * Screening candidate to Interview in the Stage cell (Enter, pick, saved), and saves the grid as
 * a view named "My interviews".
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [candidates, setCandidates] = React.useState(() => (v.state === 'empty' ? [] : CANDIDATES))
  const [query, setQuery] = React.useState('')
  const fail = React.useRef(v.fail === 'on')
  fail.current = v.fail === 'on'
  const q = query.trim().toLowerCase()
  const rows = React.useMemo(() => (q ? candidates.filter((c) => c.name.toLowerCase().includes(q)) : candidates), [candidates, q])

  return (
    <div className="h-[460px] w-[760px] max-w-full">
      <DataGrid
        label="Candidates"
        className="h-full"
        columns={columns}
        rows={rows}
        selectable
        rowLabel={(c) => c.name}
        density={v.density === 'compact' ? 'compact' : 'default'}
        defaultSort={{ key: 'applied', direction: 'desc' }}
        loading={v.state === 'loading'}
        error={v.state === 'error' ? "The ATS didn't answer. Check the connection and try again." : undefined}
        onRetry={() => {}}
        filtered={q !== ''}
        onClearFilters={() => setQuery('')}
        onCellEdit={async (id, key, value) => {
          await wait(700)
          if (fail.current) throw new Error("The ATS didn't take the change.")
          setCandidates((all) => all.map((c) => (c.id === id ? { ...c, [key]: value } : c)))
        }}
        toolbar={
          <DataGridToolbar>
            <Input
              size="md"
              aria-label="Search candidates"
              placeholder="Search candidates"
              leadingIcon={<Search />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              wrapperClassName="w-56 max-w-full"
            />
            <DataGridColumnsMenu className="ms-auto" />
            <DataGridViewMenu<{ query: string }>
              defaultViews={VIEWS}
              defaultValue="all"
              filters={{ query: q }}
              onValueChange={(_, view) => setQuery(view?.filters?.query ?? '')}
            />
          </DataGridToolbar>
        }
      />
    </div>
  )
}

export default function DataGridDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Data grid" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
