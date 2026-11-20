import * as React from 'react'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { Toaster, toast } from '@uisatin/ui/toast'
import { KanbanBoard, KanbanCard, moveKanbanItem, type KanbanColumn } from '@uisatin/pro/kanban-board'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Source = 'Referral' | 'LinkedIn' | 'Careers page' | 'Agency'
type Candidate = { id: string; name: string; role: string; source: Source; owner: keyof typeof OWNERS; days: number }

const SOURCE_TONE: Record<Source, BadgeTone> = { Referral: 'green', LinkedIn: 'sky', 'Careers page': 'neutral', Agency: 'plum' }
const OWNERS = {
  JP: { name: 'Jon Park', tone: 'sky' },
  AN: { name: 'Ada Novak', tone: 'plum' },
  LO: { name: 'Lina Ortiz', tone: 'green' },
} satisfies Record<string, { name: string; tone: AvatarTone }>

const ROLES = ['Product designer', 'Frontend engineer', 'Data analyst', 'Customer success']
const SOURCES: Source[] = ['LinkedIn', 'Careers page', 'Referral', 'Agency']
const OWNER_IDS = Object.keys(OWNERS) as (keyof typeof OWNERS)[]

// prettier-ignore
const NAMES = {
  applied: ['Noah Fischer', 'Amara Okafor', 'Leo Brandt', 'Mia Kowalska', 'Ravi Shah', 'Elena Rossi', 'Tom Becker', 'Yuki Tanaka', 'Sara Lind', 'Omar Haddad', 'Chloe Martin', 'Jakub Nowak', 'Ines Duarte', 'Felix Wagner', 'Hana Sato', 'Lucas Moreau', 'Zoe Clarke', 'Mateo Garcia', 'Ana Petrova', 'Ben Walker', 'Nina Berg', 'Karim Aziz', 'Julia Weber', 'Owen Hughes'],
  screening: ['Tara Mendes', 'Priya Nair', 'Daniel Kim', 'Sofia Lopez', 'Marek Zielinski', 'Grace Liu', 'Adam Novak', 'Lea Schmidt', 'Ivan Horvat', 'Maya Cohen', 'Erik Johansson', 'Aisha Bello'],
  interview: ['Emma Laurent', 'Kenji Mori', 'Olivia Grant', 'Pavel Dvorak', 'Lucia Romero', 'Sam Turner'],
  offer: ['Hugo Lefebvre', 'Nora Ahmed'],
}

const candidates = (stage: keyof typeof NAMES, offset: number) =>
  NAMES[stage].map((name, i): Candidate => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    role: ROLES[(i + offset) % ROLES.length]!,
    source: SOURCES[(i * 3 + offset) % SOURCES.length]!,
    owner: OWNER_IDS[(i + offset) % OWNER_IDS.length]!,
    days: ((i * 5 + offset) % 9) + 1,
  }))

const HIRING = {
  applied: candidates('applied', 0),
  screening: candidates('screening', 1),
  interview: candidates('interview', 2),
  offer: candidates('offer', 3),
}
const EMPTY = { applied: HIRING.applied, screening: [], interview: [], offer: [] }

const columnsFor = (limits: boolean): KanbanColumn[] => [
  { id: 'applied', title: 'Applied' },
  { id: 'screening', title: 'Screening', tone: 'sky' },
  { id: 'interview', title: 'Interview', tone: 'plum', limit: limits ? 8 : undefined },
  { id: 'offer', title: 'Offer', tone: 'green', limit: limits ? 2 : undefined },
]

export const controls: ShowcaseControl[] = [
  {
    id: 'state',
    label: 'State',
    items: [
      { value: 'hiring', label: 'Hiring' },
      { value: 'empty', label: 'Empty columns' },
      { value: 'loading', label: 'Loading' },
    ],
  },
  { id: 'limits', label: 'Limits', type: 'switch', default: 'on' },
  { id: 'collapsible', label: 'Collapsible', type: 'switch', default: 'off' },
  { id: 'add', label: 'Add button', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const limit = (n: number) => (v.limits === 'on' ? `, limit: ${n}` : '')
  const extra = [
    v.collapsible === 'on' && '      collapsible',
    v.add === 'on' && '      onAddItem={(column) => openNewCandidate(column)}',
    v.state === 'loading' && '      loading={!candidates}',
  ]
    .filter(Boolean)
    .join('\n')
  return `import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { Toaster } from '@uisatin/ui/toast'
import { KanbanBoard, KanbanCard, moveKanbanItem } from '@uisatin/pro/kanban-board'

const columns = [
  { id: 'applied', title: 'Applied' },
  { id: 'screening', title: 'Screening', tone: 'sky' },
  { id: 'interview', title: 'Interview', tone: 'plum'${limit(8)} },
  { id: 'offer', title: 'Offer', tone: 'green'${limit(2)} },
]

export function HiringBoard({ initial }: { initial: Record<string, Candidate[]> }) {
  const [candidates, setCandidates] = React.useState(initial)

  return (
    <>
      <KanbanBoard
        aria-label="Hiring"
        className="h-[440px]"
        columns={columns}
        items={candidates}
        getItemId={(c) => c.id}
        getItemLabel={(c) => c.name}
        // The board only asks; the move happens here (and Undo comes back through here too).
        onMove={(id, column, index) => setCandidates((all) => moveKanbanItem(all, (c) => c.id, id, column, index))}${extra ? `\n${extra}` : ''}
        renderCard={(c) => (
          <KanbanCard
            title={c.name}
            meta={\`\${c.role} · \${c.days}d\`}
            badges={<Badge size="sm" tone={sourceTone[c.source]}>{c.source}</Badge>}
            avatar={<Avatar size={24} initials={c.owner.initials} tone={c.owner.tone} />}
          />
        )}
      />
      {/* The "Moved to Interview · Undo" toast shows here. */}
      <Toaster />
    </>
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    v.state === 'hiring' ? 'Hiring' : v.state === 'empty' ? 'Empty columns' : 'Loading',
    v.limits === 'on' ? 'Limits' : 'No limits',
    v.collapsible === 'on' ? 'Collapsible' : 'Fixed',
    v.add === 'on' ? 'Add button' : 'No add button',
  ].join(' · '),
  code: code(v),
}))

let added = 0

/** The Hiring scenario: drag Tara Mendes from Screening to Interview, get "Moved to Interview · Undo". */
function Preview({ v }: { v: Record<string, string> }) {
  const [items, setItems] = React.useState<Record<string, Candidate[]>>(() => (v.state === 'empty' ? EMPTY : HIRING))
  React.useEffect(() => () => toast.dismiss(), [])

  return (
    // Wider than the stage's padding allows, so Applied, Screening and Interview fit and Offer peeks in.
    <div className="relative -mx-6 w-[calc(100%+3rem)] py-6">
      <KanbanBoard
        aria-label="Hiring"
        className="h-[440px]"
        columnWidth={212}
        columns={columnsFor(v.limits === 'on')}
        items={items}
        getItemId={(c) => c.id}
        getItemLabel={(c) => c.name}
        onMove={(id, column, index) => setItems((all) => moveKanbanItem(all, (c) => c.id, id, column, index))}
        collapsible={v.collapsible === 'on'}
        loading={v.state === 'loading'}
        onAddItem={
          v.add === 'on'
            ? (column) =>
                setItems((all) => ({
                  ...all,
                  [column]: [...(all[column] ?? []), { id: `new-${++added}`, name: 'New candidate', role: 'Product designer', source: 'Careers page', owner: 'JP', days: 0 }],
                }))
            : undefined
        }
        renderCard={(c) => (
          <KanbanCard
            title={c.name}
            meta={`${c.role} · ${c.days}d`}
            badges={
              <Badge size="sm" tone={SOURCE_TONE[c.source]}>
                {c.source}
              </Badge>
            }
            avatar={<Avatar size={24} initials={c.owner} tone={OWNERS[c.owner].tone} />}
          />
        )}
      />
      {/* The toast comes up inside the stage, over the bottom of the board. */}
      <Toaster className="absolute inset-x-0 bottom-0 mx-auto w-[397px] max-w-full" />
    </div>
  )
}

export default function KanbanBoardDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Kanban board" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
