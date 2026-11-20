import * as React from 'react'
import { PeoplePicker, type PeopleGroup, type Person } from '@uisatin/pro/people-picker'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// The hiring team an interview panel is drawn from.
const marta: Person = { id: 'marta', name: 'Marta Nowak', role: 'Hiring manager', tone: 'plum' }
const jon: Person = { id: 'jon', name: 'Jon Park', role: 'Staff engineer', tone: 'sky' }
const ada: Person = { id: 'ada', name: 'Ada Novak', role: 'Design lead', tone: 'fuchsia' }
const priya: Person = { id: 'priya', name: 'Priya Shah', role: 'Senior product designer', tone: 'amber' }
const sam: Person = { id: 'sam', name: 'Sam Okafor', role: 'Engineering manager', tone: 'green' }
const leo: Person = { id: 'leo', name: 'Leo Kim', role: 'Product manager', tone: 'brand' }
const ines: Person = { id: 'ines', name: 'Inês Duarte', role: 'Research lead', tone: 'sky' }
const tomas: Person = { id: 'tomas', name: 'Tomás Reyes', role: 'Frontend engineer', tone: 'amber' }
const hana: Person = { id: 'hana', name: 'Hana Sato', role: 'Data scientist', tone: 'green' }
const ola: Person = { id: 'ola', name: 'Ola Wiśniewska', role: 'Recruiter, on leave', tone: 'plum', disabled: true }

const TEAMS: PeopleGroup[] = [
  { label: 'Design', people: [ada, priya, ines] },
  { label: 'Engineering', people: [jon, sam, tomas, hana] },
  { label: 'Product', people: [marta, leo] },
  { label: 'People team', people: [ola] },
]
const EVERYONE = TEAMS.flatMap((t) => t.people)
const RECENT = [marta, priya, sam]

/** Answers like a quick directory API: 100 ms for a query, suggestions at once, nothing once aborted. */
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

async function searchDirectory(query: string, { signal }: { signal: AbortSignal }) {
  await wait(query ? 100 : 0, signal)
  const q = fold(query.trim())
  return EVERYONE.filter((p) => !q || fold(`${p.name} ${p.role}`).includes(q))
}

export const controls: ShowcaseControl[] = [
  {
    id: 'source',
    label: 'People from',
    items: [
      { value: 'search', label: 'Search' },
      { value: 'groups', label: 'Groups' },
    ],
  },
  { id: 'multiple', label: 'Multiple', type: 'switch', default: 'on' },
  { id: 'recent', label: 'Recent', type: 'switch', default: 'on' },
  { id: 'fold', label: '+N after 3', type: 'switch', default: 'off' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'
/** A panel of three is the goal; folding needs more picks than that to show. */
const start = (v: Record<string, string>) => (!on(v, 'multiple') ? [marta] : on(v, 'fold') ? [marta, jon, ada, sam, leo] : [marta])

function code(v: Record<string, string>) {
  const multiple = on(v, 'multiple')
  const attrs = [
    'label="Interview panel"',
    multiple && 'multiple',
    v.source === 'search' ? 'search={searchPeople}' : 'groups={teams}',
    on(v, 'recent') && 'recent={recentlyPicked}',
    on(v, 'fold') && 'maxChips={3}',
    'value={panel}',
    'onValueChange={setPanel}',
  ].filter(Boolean)
  const source =
    v.source === 'search'
      ? `// Called 150 ms after the last keystroke, and with '' when the list opens; meanwhile
// the last results, narrowed by the query, stay on screen.
// A newer query aborts this one through \`signal\`.
async function searchPeople(query: string, { signal }: { signal: AbortSignal }) {
  const res = await fetch(\`/api/people?q=\${encodeURIComponent(query)}\`, { signal })
  return (await res.json()) as Person[]
}`
      : `const teams: PeopleGroup[] = [
  { label: 'Design', people: [ada, priya, ines] },
  { label: 'Engineering', people: [jon, sam, tomas, hana] },
  { label: 'Product', people: [marta, leo] },
  { label: 'People team', people: [{ id: 'ola', name: 'Ola Wiśniewska', role: 'Recruiter, on leave', disabled: true }] },
]`
  return `import { PeoplePicker, type ${v.source === 'search' ? 'Person' : 'PeopleGroup, type Person'} } from '@uisatin/pro/people-picker'

${source}

export function InterviewPanel({ recentlyPicked }: { recentlyPicked: Person[] }) {
  // ${multiple ? 'Value holds the people themselves, so chips keep their faces whatever the search shows.' : 'One pick fills the field with the avatar and the name.'}
  const [panel, setPanel] = React.useState<Person[]>([marta])
  return (
    <PeoplePicker
${attrs.map((a) => `      ${a}`).join('\n')}
      hint="Pick three interviewers."
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    v.source === 'search' ? 'Search' : 'Groups',
    on(v, 'multiple') ? 'Multiple' : 'Single',
    on(v, 'recent') ? 'Recent' : 'No recent',
    on(v, 'fold') ? '+N after 3' : 'All chips',
  ].join(' · '),
  code: code(v),
}))

/**
 * The hiring scenario: an interview needs a panel of three. Marta, the hiring manager, is on it
 * already; the list is open on load, without taking focus from the page.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(true)
  const openedOnce = React.useRef(false)
  const [panel, setPanel] = React.useState<Person[]>(start(v))
  const multiple = on(v, 'multiple')
  const need = 3 - panel.length

  return (
    <div className="relative flex h-[416px] w-80 max-w-full flex-col pt-6">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
      {stage && (
        <PeoplePicker
          container={stage}
          open={open}
          onOpenChange={setOpen}
          onOpenAutoFocus={(e) => {
            if (!openedOnce.current) e.preventDefault()
            openedOnce.current = true
          }}
          // Changing a prop in the bar under the stage keeps the list open.
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement | null)?.closest('[data-showcase-controls]')) e.preventDefault()
          }}
          label={multiple ? 'Interview panel' : 'Lead interviewer'}
          hint={multiple ? (need > 0 ? `Pick ${need} more ${need === 1 ? 'interviewer' : 'interviewers'}.` : 'The panel is complete.') : 'They run the debrief.'}
          multiple={multiple}
          search={v.source === 'search' ? searchDirectory : undefined}
          groups={v.source === 'groups' ? TEAMS : undefined}
          recent={on(v, 'recent') ? RECENT : undefined}
          maxChips={on(v, 'fold') ? 3 : undefined}
          value={panel}
          onValueChange={setPanel}
        />
      )}
    </div>
  )
}

export default function PeoplePickerDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="People picker"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      align="top"
      render={(id, v) => <Preview key={`${v.multiple}-${v.fold}`} v={v} />}
    />
  )
}
