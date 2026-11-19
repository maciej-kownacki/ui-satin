import * as React from 'react'
import { Notes, Suitcase } from 'iconoir-react'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import {
  ScopedSearch,
  formatScopedQuery,
  parseScopedQuery,
  type ScopedSearchGroup,
  type ScopedSearchItem,
  type ScopedSearchQuery,
  type ScopedSearchScope,
} from '@uisatin/pro/search-scoped'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/* ---------- the ATS: candidates, jobs and notes ---------- */

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

const scopes: ScopedSearchScope[] = [
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
  { id: 'ben', name: 'Ben Carter', initials: 'BC', tone: 'sky', role: 'Engineering manager', location: 'London', stage: 'screening', owner: 'jon', skills: ['React', 'Hiring'] },
  { id: 'nora', name: 'Nora Lind', initials: 'NL', tone: 'green', role: 'Data engineer', location: 'Stockholm', stage: 'applied', owner: 'sam', skills: ['Python', 'dbt'] },
  { id: 'kai', name: 'Kai Müller', initials: 'KM', tone: 'amber', role: 'QA engineer', location: 'Hamburg', stage: 'hired', owner: 'tara', skills: ['Cypress', 'Playwright'] },
]

type Job = { id: string; title: string; team: string; applicants: number; owner: Owner; location: string; skills: string[] }
const JOBS: Job[] = [
  { id: 'job-fe', title: 'Senior React engineer', team: 'Web', applicants: 14, owner: 'tara', location: 'Berlin', skills: ['React'] },
  { id: 'job-de', title: 'Design engineer', team: 'Design systems', applicants: 9, owner: 'tara', location: 'Warsaw', skills: ['React', 'Figma'] },
  { id: 'job-be', title: 'Backend engineer', team: 'Platform', applicants: 21, owner: 'sam', location: 'Remote', skills: ['Go'] },
  { id: 'job-em', title: 'Engineering manager', team: 'Web', applicants: 6, owner: 'jon', location: 'London', skills: ['Hiring'] },
]

type Note = { id: string; about: string; text: string; stage: Stage; author: Owner; date: string }
const NOTES: Note[] = [
  { id: 'note-ada', about: 'Ada Novak', text: 'Strong React round, pair-programmed a data table', stage: 'interview', author: 'tara', date: '12 Nov' },
  { id: 'note-leo', about: 'Leo Fischer', text: 'Wants to move from Next.js to React Native', stage: 'interview', author: 'jon', date: '10 Nov' },
  { id: 'note-omar', about: 'Omar Haddad', text: 'System design went well, ask about on-call', stage: 'interview', author: 'sam', date: '8 Nov' },
  { id: 'note-julia', about: 'Julia Kowal', text: 'Offer call: asked about leading the React guild', stage: 'offer', author: 'tara', date: '6 Nov' },
  { id: 'note-ben', about: 'Ben Carter', text: 'Screening: references pending', stage: 'screening', author: 'jon', date: '4 Nov' },
]

const stageBadge = (stage: Stage) => (
  <Badge size="sm" tone={STAGES[stage].tone}>
    {STAGES[stage].label}
  </Badge>
)

const groups: ScopedSearchGroup[] = [
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
    // Jobs have no stage: a stage chip leaves them out.
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

const RECENT = ['stage:interview react', 'owner:tara stage:offer', 'location:Berlin']

/* ---------- the page ---------- */

const STATES = {
  results: 'stage:interview react',
  recent: '',
  typing: 'stage:',
  chip: 'stage:interview ',
  none: 'stage:hired react',
} as const
type State = keyof typeof STATES

const STATE_LABELS: Record<State, string> = {
  results: 'Grouped results',
  recent: 'Empty, with recents',
  typing: 'Typing a scope',
  chip: 'Chip only',
  none: 'No results',
}

// The state the list starts in, then whether ⌘K reaches it.
export const controls: ShowcaseControl[] = [
  { id: 'state', label: 'State', type: 'menu', items: Object.entries(STATE_LABELS).map(([value, label]) => ({ value, label })) },
  { id: 'hotkey', label: '⌘K', type: 'switch', default: 'on' },
]

/** The query each state starts from: complete tokens become chips, the last word stays typed. */
const startOf = (state: State): ScopedSearchQuery => parseScopedQuery(STATES[state], scopes, { partial: true })

function code(v: Record<string, string>) {
  const start = startOf(v.state as State)
  const defaultValue = start.tokens.length || start.text ? `\n  defaultValue={parseScopedQuery('${STATES[v.state as State]}', scopes, { partial: true })}` : ''
  return `import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { ScopedSearch, formatScopedQuery, parseScopedQuery } from '@uisatin/pro/search-scoped'

const scopes = [
  { key: 'stage', label: 'Stage', values: [{ value: 'interview', label: 'Interview' }, { value: 'offer', label: 'Offer' } /* … */] },
  { key: 'owner', label: 'Owner', values: [{ value: 'tara', label: 'Tara Mendes' } /* … */] },
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
      meta: <Badge size="sm" tone="plum">{c.stageLabel}</Badge>,
      // What the chips match; the words match the label, description, keywords and these.
      fields: { stage: c.stage, owner: c.owner, location: c.location },
      keywords: c.skills,
    })),
  },
  { id: 'jobs', label: 'Jobs', items: jobs.map(/* … */) },
  { id: 'notes', label: 'Notes', items: notes.map(/* … */) },
]

export function AtsSearch() {
  const [recent, setRecent] = React.useState(['stage:interview react', 'owner:tara stage:offer'])
  return (
    <ScopedSearch
      scopes={scopes}
      groups={groups}
      recent={recent}${defaultValue}
      placeholder="Search candidates, jobs, notes…"${v.hotkey === 'off' ? '\n      hotkey={false}' : ''}
      onSelect={(item, query) => {
        const q = formatScopedQuery(query)
        setRecent((r) => [q, ...r.filter((x) => x !== q)].slice(0, 5))
        open(item.id)
      }}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: `${STATE_LABELS[v.state as State]} · ${v.hotkey === 'on' ? 'With ⌘K' : 'Without ⌘K'}`,
  code: code(v),
}))

/**
 * The ATS scenario: 'stage:interview react' finds 6 candidates and 2 notes. The list is open on
 * load, inside the stage, without taking focus. ⌘K reaches this search, not the docs' own: the
 * page's sidebar search listens for it too, so the preview catches it first.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const input = React.useRef<HTMLInputElement>(null)
  const [recent, setRecent] = React.useState(RECENT)
  const [opened, setOpened] = React.useState<ScopedSearchItem | null>(null)

  React.useEffect(() => {
    if (v.hotkey !== 'on') return
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
  }, [v.hotkey])

  return (
    <div className="relative flex h-[500px] w-[560px] max-w-full flex-col pt-6">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
      {stage && (
        <ScopedSearch
          ref={input}
          container={stage}
          defaultOpen
          scopes={scopes}
          groups={groups}
          recent={recent}
          defaultValue={startOf(v.state as State)}
          placeholder="Search candidates, jobs, notes…"
          aria-label="Search candidates, jobs and notes"
          shortcut={v.hotkey === 'on'}
          hotkey={false}
          // Changing a prop in the bar under the stage keeps the list open.
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement | null)?.closest('[data-showcase-controls]')) e.preventDefault()
          }}
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
