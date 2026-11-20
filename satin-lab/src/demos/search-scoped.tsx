import * as React from 'react'
import { Folder, Globe, Group, Notes, Page, Suitcase, User, UserCircle, WarningCircle } from 'iconoir-react'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import {
  ScopedSearch,
  formatScopedQuery,
  type ScopedSearchFilter,
  type ScopedSearchGroup,
  type ScopedSearchItem,
  type ScopedSearchQuery,
  type ScopedSearchScope,
} from '@uisatin/pro/search-scoped'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/* ---------- an ATS: candidates, jobs and notes ---------- */

type Stage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired'
const STAGES: Record<Stage, { label: string; tone: BadgeTone }> = {
  applied: { label: 'Applied', tone: 'neutral' },
  screening: { label: 'Screening', tone: 'plum' },
  interview: { label: 'Interview', tone: 'sky' },
  offer: { label: 'Offer', tone: 'amber' },
  hired: { label: 'Hired', tone: 'green' },
}
const OWNERS = { tara: 'Tara Mendes', jon: 'Jon Park', sam: 'Sam Ortiz' }
type Owner = keyof typeof OWNERS

// Where to look: everything, one kind of record, or a place (the candidates you own).
const atsScopes: ScopedSearchScope[] = [
  { value: 'all', label: 'Everywhere', icon: <Globe />, placeholder: 'Search candidates, jobs, notes…' },
  { value: 'candidates', label: 'Candidates', icon: <UserCircle />, groups: ['candidates'], placeholder: 'Search candidates…' },
  { value: 'jobs', label: 'Jobs', icon: <Suitcase />, groups: ['jobs'], placeholder: 'Search jobs…' },
  { value: 'notes', label: 'Notes', icon: <Notes />, groups: ['notes'], placeholder: 'Search notes…' },
  { value: 'mine', label: 'My pipeline', icon: <User />, description: 'Candidates you own', groups: ['candidates'], fields: { owner: 'tara' }, placeholder: 'Search your candidates…' },
]

// What narrows inside the scope, typed as key:value.
const atsFilters: ScopedSearchFilter[] = [
  { key: 'stage', label: 'Stage', values: Object.entries(STAGES).map(([value, s]) => ({ value, label: s.label })) },
  { key: 'owner', label: 'Owner', values: Object.entries(OWNERS).map(([value, label]) => ({ value, label })) },
  // No values: any word after `location:` makes a chip.
  { key: 'location', label: 'Location' },
]

type Candidate = { id: string; name: string; initials: string; tone: AvatarTone; role: string; location: string; stage: Stage; owner: Owner; skills: string[] }
const CANDIDATES: Candidate[] = [
  { id: 'ada', name: 'Ada Novak', initials: 'AN', tone: 'plum', role: 'Senior frontend engineer', location: 'Berlin', stage: 'interview', owner: 'tara', skills: ['React', 'TypeScript'] },
  { id: 'leo', name: 'Leo Fischer', initials: 'LF', tone: 'sky', role: 'Frontend engineer', location: 'Munich', stage: 'interview', owner: 'jon', skills: ['React', 'Next.js'] },
  { id: 'priya', name: 'Priya Raman', initials: 'PR', tone: 'amber', role: 'Full-stack engineer', location: 'Remote', stage: 'interview', owner: 'tara', skills: ['React', 'Node'] },
  { id: 'tomas', name: 'Tomás Silva', initials: 'TS', tone: 'green', role: 'UI engineer', location: 'Lisbon', stage: 'interview', owner: 'sam', skills: ['React', 'CSS'] },
  { id: 'hana', name: 'Hana Sato', initials: 'HS', tone: 'fuchsia', role: 'Mobile engineer', location: 'Remote', stage: 'interview', owner: 'jon', skills: ['React Native', 'Swift'] },
  { id: 'mia', name: 'Mia Chen', initials: 'MC', tone: 'brand', role: 'Design engineer', location: 'Warsaw', stage: 'interview', owner: 'tara', skills: ['React', 'Figma'] },
  { id: 'omar', name: 'Omar Haddad', initials: 'OH', tone: 'neutral', role: 'Backend engineer', location: 'Berlin', stage: 'interview', owner: 'sam', skills: ['Go', 'Postgres'] },
  { id: 'julia', name: 'Julia Kowal', initials: 'JK', tone: 'red', role: 'Frontend engineer', location: 'Warsaw', stage: 'offer', owner: 'tara', skills: ['React', 'Vue'] },
  { id: 'nora', name: 'Nora Lind', initials: 'NL', tone: 'green', role: 'Data engineer', location: 'Stockholm', stage: 'applied', owner: 'sam', skills: ['Python', 'dbt'] },
  { id: 'kai', name: 'Kai Müller', initials: 'KM', tone: 'amber', role: 'QA engineer', location: 'Hamburg', stage: 'hired', owner: 'tara', skills: ['Cypress', 'Playwright'] },
]

type Job = { id: string; title: string; team: string; applicants: number; owner: Owner; location: string; skills: string[] }
const JOBS: Job[] = [
  { id: 'job-fe', title: 'Senior React engineer', team: 'Web', applicants: 14, owner: 'tara', location: 'Berlin', skills: ['React'] },
  { id: 'job-de', title: 'Design engineer', team: 'Design systems', applicants: 9, owner: 'tara', location: 'Warsaw', skills: ['React', 'Figma'] },
  { id: 'job-be', title: 'Backend engineer', team: 'Platform', applicants: 21, owner: 'sam', location: 'Remote', skills: ['Go'] },
]

type Note = { id: string; about: string; text: string; stage: Stage; author: Owner; date: string }
const NOTES: Note[] = [
  { id: 'note-ada', about: 'Ada Novak', text: 'Strong React round, pair-programmed a data table', stage: 'interview', author: 'tara', date: '12 Nov' },
  { id: 'note-leo', about: 'Leo Fischer', text: 'Wants to move from Next.js to React Native', stage: 'interview', author: 'jon', date: '10 Nov' },
  { id: 'note-omar', about: 'Omar Haddad', text: 'System design went well, ask about on-call', stage: 'interview', author: 'sam', date: '8 Nov' },
  { id: 'note-julia', about: 'Julia Kowal', text: 'Offer call: asked about leading the React guild', stage: 'offer', author: 'tara', date: '6 Nov' },
]

const stageBadge = (stage: Stage) => (
  <Badge size="sm" tone={STAGES[stage].tone}>
    {STAGES[stage].label}
  </Badge>
)

const atsGroups: ScopedSearchGroup[] = [
  {
    id: 'candidates',
    label: 'Candidates',
    items: CANDIDATES.map((c) => ({
      id: c.id,
      label: c.name,
      description: `${c.role} · ${c.location}`,
      media: <Avatar size={20} initials={c.initials} tone={c.tone} />,
      meta: stageBadge(c.stage),
      fields: { stage: c.stage, owner: c.owner, location: c.location },
      keywords: c.skills,
    })),
  },
  {
    id: 'jobs',
    label: 'Jobs',
    // Jobs have no stage: a stage filter leaves them out.
    items: JOBS.map((j) => ({
      id: j.id,
      label: j.title,
      description: `${j.team} · ${j.applicants} applicants`,
      icon: <Suitcase />,
      fields: { owner: j.owner, location: j.location },
      keywords: j.skills,
    })),
  },
  {
    id: 'notes',
    label: 'Notes',
    items: NOTES.map((n) => ({
      id: n.id,
      label: n.text,
      description: `${n.about} · ${OWNERS[n.author]}, ${n.date}`,
      icon: <Notes />,
      // A note carries its candidate's stage, so stage:interview finds the interview notes.
      fields: { stage: n.stage, owner: n.author },
      keywords: [n.about],
    })),
  },
]

const ATS_RECENT = ['in:candidates stage:interview react', 'in:mine stage:offer', 'location:Berlin']

/* ---------- the lead demo: the scope changes the results ---------- */

export const controls: ShowcaseControl[] = [
  {
    id: 'scope',
    label: 'Scope',
    type: 'menu',
    items: atsScopes.map((s) => ({ value: s.value, label: s.label })),
  },
  { id: 'filter', label: 'stage:interview', type: 'switch', default: 'off' },
]

const startOf = (v: Record<string, string>): ScopedSearchQuery => ({
  scope: v.scope,
  tokens: v.filter === 'on' ? [{ key: 'stage', value: 'interview' }] : [],
  text: 'react',
})

function code(v: Record<string, string>) {
  return `import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { ScopedSearch, formatScopedQuery } from '@uisatin/pro/search-scoped'
import { Globe, Notes, Suitcase, User, UserCircle } from 'iconoir-react'

// Where to look. The first is the default; a scope is a kind (groups), a place (fields), or both.
const scopes = [
  { value: 'all', label: 'Everywhere', icon: <Globe />, placeholder: 'Search candidates, jobs, notes…' },
  { value: 'candidates', label: 'Candidates', icon: <UserCircle />, groups: ['candidates'] },
  { value: 'jobs', label: 'Jobs', icon: <Suitcase />, groups: ['jobs'] },
  { value: 'notes', label: 'Notes', icon: <Notes />, groups: ['notes'] },
  { value: 'mine', label: 'My pipeline', icon: <User />, groups: ['candidates'], fields: { owner: me.id } },
]

// What narrows inside the scope, typed as key:value.
const filters = [
  { key: 'stage', label: 'Stage', values: [{ value: 'interview', label: 'Interview' }, { value: 'offer', label: 'Offer' } /* … */] },
  { key: 'location', label: 'Location' }, // any value
]

const groups = [
  {
    id: 'candidates',
    label: 'Candidates',
    items: candidates.map((c) => ({
      id: c.id,
      label: c.name,
      description: \`\${c.role} · \${c.location}\`,
      media: <Avatar size={20} initials={c.initials} tone={c.tone} />,
      meta: <Badge size="sm" tone="sky">{c.stageLabel}</Badge>,
      // What scopes and filters match; the words match the label, description, keywords and these.
      fields: { stage: c.stage, owner: c.ownerId, location: c.location },
      keywords: c.skills,
    })),
  },
  { id: 'jobs', label: 'Jobs', items: jobs.map(/* … */) },
  { id: 'notes', label: 'Notes', items: notes.map(/* … */) },
]

export function AtsSearch() {
  const [recent, setRecent] = React.useState<string[]>([])
  return (
    <ScopedSearch
      scopes={scopes}
      filters={filters}
      groups={groups}
      recent={recent}
      defaultValue={{ scope: '${v.scope}', tokens: [${v.filter === 'on' ? "{ key: 'stage', value: 'interview' }" : ''}], text: 'react' }}
      onSelect={(item, query) => {
        const q = formatScopedQuery(query) // "${formatScopedQuery(startOf(v))}"
        setRecent((r) => [q, ...r.filter((x) => x !== q)].slice(0, 5))
        open(item.id)
      }}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: `${atsScopes.find((s) => s.value === v.scope)?.label} · ${v.filter === 'on' ? 'stage:interview' : 'No filter'}`,
  code: code(v),
}))

/** Keeps the list open while the reader changes a prop in the bar under the stage. */
const keepOpen = (e: Event) => {
  if ((e.target as HTMLElement | null)?.closest('[data-showcase-controls]')) e.preventDefault()
}

/**
 * The ATS: "react" everywhere finds candidates, jobs and notes; Candidates, Jobs, Notes or My
 * pipeline (the chip in the field, `in:` typed, or the bar) narrows it. With stage:interview on,
 * everywhere finds 6 candidates and 2 notes. The list is open on load, inside the stage, without
 * taking focus. ⌘K reaches this search, not the docs' own: the page's sidebar search listens
 * for it too, so the preview catches it first.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const [recent, setRecent] = React.useState(ATS_RECENT)
  const [opened, setOpened] = React.useState<ScopedSearchItem | null>(null)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        e.stopImmediatePropagation()
        input.current?.focus()
        input.current?.select()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [])

  return (
    <div className="relative flex h-[500px] w-[560px] max-w-full flex-col pt-6">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
      {stage && (
        <ScopedSearch
          ref={input}
          container={stage}
          defaultOpen
          scopes={atsScopes}
          filters={atsFilters}
          groups={atsGroups}
          recent={recent}
          defaultValue={startOf(v)}
          aria-label="Search candidates, jobs and notes"
          hotkey={false}
          onInteractOutside={keepOpen}
          onSelect={(item, query) => {
            const q = formatScopedQuery(query)
            setRecent((r) => [q, ...r.filter((x) => x !== q)].slice(0, 4))
            setOpened(item)
          }}
        />
      )}
      {opened && (
        <p className="mt-3 text-sm text-text-muted">
          Opened <span className="font-medium text-text-default">{opened.label}</span>. The query went to the recent searches.
        </p>
      )}
    </div>
  )
}

export default function SearchScopedDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Scoped search" align="top" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}

/* ---------- places: the same search in a project tool ---------- */

const placeScopes: ScopedSearchScope[] = [
  { value: 'atlas', label: 'This project', icon: <Folder />, description: 'Atlas', fields: { project: 'atlas' }, placeholder: 'Search Atlas…' },
  { value: 'design', label: 'My team', icon: <Group />, description: 'Design', fields: { team: 'design' }, placeholder: 'Search Design…' },
  { value: 'all', label: 'Everywhere', icon: <Globe />, description: 'Every project and team', placeholder: 'Search everything…' },
]

const issue = (id: string, title: string, project: string, team: string, open = true): ScopedSearchItem => ({
  id,
  label: title,
  description: `${project === 'atlas' ? 'Atlas' : 'Beacon'} · ${team[0].toUpperCase()}${team.slice(1)}`,
  icon: <WarningCircle />,
  meta: (
    <Badge size="sm" variant="outline">
      {id}
    </Badge>
  ),
  fields: { project, team, state: open ? 'open' : 'closed' },
})
const doc = (id: string, title: string, where: string, fields: Record<string, string>): ScopedSearchItem => ({ id, label: title, description: where, icon: <Page />, fields })

const placeGroups: ScopedSearchGroup[] = [
  {
    id: 'issues',
    label: 'Issues',
    items: [
      issue('ATL-12', 'Onboarding checklist skips the invite step', 'atlas', 'design'),
      issue('ATL-31', 'Onboarding emails go out twice', 'atlas', 'platform'),
      issue('BCN-4', 'Onboarding tour for the mobile app', 'beacon', 'design'),
      issue('BCN-9', 'Billing page onboarding copy', 'beacon', 'growth', false),
    ],
  },
  {
    id: 'docs',
    label: 'Docs',
    items: [
      doc('d1', 'Atlas onboarding flow', 'Atlas · Design', { project: 'atlas', team: 'design' }),
      doc('d2', 'Design team onboarding guide', 'Design', { team: 'design' }),
      doc('d3', 'Company onboarding handbook', 'People', { team: 'people' }),
    ],
  },
]

const placeFilters: ScopedSearchFilter[] = [{ key: 'is', label: 'State', values: [{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }] }]

export const placeControls: ShowcaseControl[] = [
  { id: 'scope', label: 'Scope', items: placeScopes.map((s) => ({ value: s.value, label: s.label })) },
]

function placeCode(v: Record<string, string>) {
  return `import { ScopedSearch } from '@uisatin/pro/search-scoped'
import { Folder, Globe, Group } from 'iconoir-react'

// Scopes as places: each keeps the rows whose fields match.
const scopes = [
  { value: 'atlas', label: 'This project', icon: <Folder />, description: 'Atlas', fields: { project: 'atlas' } },
  { value: 'design', label: 'My team', icon: <Group />, description: 'Design', fields: { team: 'design' } },
  { value: 'all', label: 'Everywhere', icon: <Globe /> },
]

<ScopedSearch
  scopes={scopes}
  filters={[{ key: 'is', label: 'State', values: ['open', 'closed'] }]}
  groups={[
    { id: 'issues', label: 'Issues', items: issues }, // fields: { project, team, state }
    { id: 'docs', label: 'Docs', items: docs },
  ]}
  defaultValue={{ scope: '${v.scope}', tokens: [], text: 'onboarding' }}
/>`
}

export const placeOptions: ShowcaseOption[] = combos(placeControls).map((v) => ({
  id: comboId(placeControls, v),
  label: placeScopes.find((s) => s.value === v.scope)?.label ?? v.scope,
  code: placeCode(v),
}))

/** A project tool: "onboarding" in This project finds 3, in My team 4, everywhere 7. */
function PlacePreview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  return (
    <div className="relative flex h-[400px] w-[520px] max-w-full flex-col pt-6">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
      {stage && (
        <ScopedSearch
          container={stage}
          defaultOpen
          scopes={placeScopes}
          filters={placeFilters}
          groups={placeGroups}
          defaultValue={{ scope: v.scope, tokens: [], text: 'onboarding' }}
          aria-label="Search issues and docs"
          shortcut={false}
          hotkey={false}
          onInteractOutside={keepOpen}
        />
      )}
    </div>
  )
}

export function SearchScopedPlacesDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Scoped search, places" align="top" options={placeOptions} codeHtml={codeHtml} controls={placeControls} render={(id, v) => <PlacePreview key={id} v={v} />} />
}
