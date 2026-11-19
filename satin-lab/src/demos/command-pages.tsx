import * as React from 'react'
import { ArrowRight, Building, EditPencil, Group, Link, Phone, Suitcase, TriangleFlag, User, UserPlus, ViewColumns3 } from 'iconoir-react'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { SearchBar } from '@uisatin/ui/search-bar'
import { Toaster } from '@uisatin/ui/toast'
import { CommandPages, type CommandPage, type CommandPageGroup, type CommandPagesControl } from '@uisatin/pro/command-pages'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Stage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost'
const STAGES: Stage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']
const STAGE_TONE: Record<Stage, BadgeTone> = { Lead: 'neutral', Qualified: 'sky', Proposal: 'plum', Negotiation: 'amber', Won: 'green', Lost: 'neutral' }
const OWNERS = ['Tara Mendes', 'Jon Park', 'Ada Novak']
// What the deal touches, by kind: each kind has its icon.
const RELATED = [
  { label: 'People', icon: <User />, items: [['dana', 'Dana Whitfield', 'Head of operations'], ['marco', 'Marco Ruiz', 'Legal']] },
  { label: 'Companies', icon: <Building />, items: [['acme-log', 'Acme Logistics', 'Subsidiary'], ['acme-eu', 'Acme Europe', 'Berlin']] },
  { label: 'Jobs', icon: <Suitcase />, items: [['dpa', 'DPA review', 'Due Friday'], ['pilot', 'Berlin pilot', 'Q1']] },
]

const QUESTION = 'what did Acme say last call'
const ANSWER =
  'On Tuesday’s call Dana Whitfield, Acme’s head of operations, said the Q1 budget is approved, but legal wants the DPA before anyone signs. She asked for a two-year price lock and a pilot with their Berlin team first. Next step: send the DPA and a revised quote by Friday.'

// Where the menu starts, so each state can be looked at without typing; then it is live.
export const controls: ShowcaseControl[] = [
  {
    id: 'state',
    label: 'State',
    type: 'menu',
    items: [
      { value: 'root', label: 'First page' },
      { value: 'page', label: 'Sub-page' },
      { value: 'ask', label: 'No match' },
      { value: 'answer', label: 'Answering' },
    ],
  },
  { id: 'hints', label: 'Key hints', type: 'switch', default: 'on' },
]

const STATE_LABEL: Record<string, string> = { root: 'First page', page: 'Sub-page', ask: 'No match', answer: 'Answering' }

function code(v: Record<string, string>) {
  return `import * as React from 'react'
import { CommandPages, type CommandPage } from '@uisatin/pro/command-pages'
import { ArrowRight, EditPencil, Group, Link, Phone, TriangleFlag, User, UserPlus, ViewColumns3 } from 'iconoir-react'

const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']

// Mount the app's <Toaster /> once: each command's \`success\` shows there when it has run.
export function DealCommands({ deal }: { deal: Deal }) {
  // The agent's answer, as it streams in (your chat hook, an SSE reader…).
  const { answer, answering, ask } = useAgentAnswer({ about: deal.id })

  const moveTo: CommandPage = {
    groups: [
      {
        label: 'Stages',
        // The kind of record every row is: a stage.
        icon: <TriangleFlag />,
        items: stages.map((stage) => ({
          id: stage,
          label: stage,
          description: stage === deal.stage ? 'Now' : undefined,
          onSelect: () => moveDeal(deal.id, stage), // a promise holds the toast until it resolves
          success: \`Moved to \${stage}\`,
        })),
      },
    ],
  }
  const owners: CommandPage = {
    groups: [
      {
        label: 'People',
        icon: <User />,
        items: team.map((person) => ({
          id: person.id,
          label: person.name,
          onSelect: () => setOwner(deal.id, person.id),
          success: \`Owner set to \${person.name}\`,
        })),
      },
    ],
  }

  return (
    <CommandPages
      rootTitle={deal.company}${v.hints === 'on' ? '' : '\n      hints={false}'}
      groups={[
        {
          label: deal.company,
          items: [
            { id: 'move', label: 'Move deal to…', icon: <ArrowRight />, page: moveTo },
            { id: 'owner', label: 'Assign owner…', icon: <UserPlus />, page: owners },
            { id: 'related', label: 'Open related…', icon: <Link />, page: relatedPage(deal) },
            { id: 'call', label: 'Log a call', icon: <Phone />, onSelect: () => logCall(deal.id), success: 'Call logged' },
            { id: 'note', label: 'Add a note', icon: <EditPencil />, onSelect: () => addNote(deal.id), success: 'Note added' },
          ],
        },
        {
          label: 'Go to',
          items: [
            { id: 'pipeline', label: 'Pipeline', icon: <ViewColumns3 />, onSelect: () => go('/pipeline'), success: 'Opened Pipeline' },
            { id: 'contacts', label: 'Contacts', icon: <Group />, onSelect: () => go('/contacts'), success: 'Opened Contacts' },
          ],
        },
      ]}
      // Any query adds 'Ask the agent about "…"' as the last row.
      onAsk={ask}
      answer={answer}
      answering={answering}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [STATE_LABEL[v.state], v.hints === 'on' ? 'Key hints' : 'No key hints'].join(' · '),
  code: code(v),
}))

/** A canned answer, written out in chunks after a short wait, as a model sends it. */
function useAgentAnswer() {
  const [answer, setAnswer] = React.useState('')
  const [answering, setAnswering] = React.useState(false)
  const timers = React.useRef<number[]>([])
  const stop = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  React.useEffect(() => stop, [])
  const ask = React.useCallback(() => {
    stop()
    setAnswer('')
    setAnswering(true)
    const words = ANSWER.split(/(?<= )/)
    let at = 1100
    for (let i = 0; i < words.length; i += 3) {
      const upTo = i + 3
      timers.current.push(window.setTimeout(() => setAnswer(words.slice(0, upTo).join('')), at))
      at += 110 + ((i * 37) % 90)
    }
    timers.current.push(window.setTimeout(() => setAnswering(false), at))
  }, [])
  return { answer, answering, ask }
}

/**
 * Opened over a deal, in the middle of the stage, then held by its top edge. Dismissed (Escape, a
 * click outside, a command), it leaves the deal with its stage and owner, the toast saying what
 * changed, and the search it came from, which opens it again. The page's own ⌘K stays with the
 * docs search.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stageEl, setStageEl] = React.useState<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(true)
  const [stage, setStage] = React.useState<Stage>('Proposal')
  const [owner, setOwner] = React.useState('Tara Mendes')
  const menu = React.useRef<CommandPagesControl>(null)
  const openedOnce = React.useRef(false)
  const { answer, answering, ask } = useAgentAnswer()

  const moveTo: CommandPage = {
    groups: [
      {
        label: 'Stages',
        icon: <TriangleFlag />,
        items: STAGES.map((s) => ({
          id: s,
          label: s,
          description: s === stage ? 'Now' : undefined,
          onSelect: () => setStage(s),
          success: `Moved to ${s}`,
        })),
      },
    ],
  }
  const owners: CommandPage = {
    groups: [
      {
        label: 'People',
        icon: <User />,
        items: OWNERS.map((o) => ({
          id: o,
          label: o,
          description: o === owner ? 'Owner' : undefined,
          onSelect: () => setOwner(o),
          success: `Owner set to ${o}`,
        })),
      },
    ],
  }
  const related: CommandPage = {
    groups: RELATED.map((g) => ({
      label: g.label,
      icon: g.icon,
      items: g.items.map(([id, label, description]) => ({ id, label, description, success: `Opened ${label}` })),
    })),
  }
  const groups: CommandPageGroup[] = [
    {
      label: 'Acme Corp',
      items: [
        { id: 'move', label: 'Move deal to…', icon: <ArrowRight />, page: moveTo },
        { id: 'owner', label: 'Assign owner…', icon: <UserPlus />, page: owners },
        { id: 'related', label: 'Open related…', icon: <Link />, page: related },
        { id: 'call', label: 'Log a call', icon: <Phone />, success: 'Call logged' },
        { id: 'note', label: 'Add a note', icon: <EditPencil />, success: 'Note added' },
      ],
    },
    {
      label: 'Go to',
      items: [
        { id: 'pipeline', label: 'Pipeline', icon: <ViewColumns3 />, success: 'Opened Pipeline' },
        { id: 'contacts', label: 'Contacts', icon: <Group />, success: 'Opened Contacts' },
      ],
    },
  ]

  // Start on the chosen state, as if the reader had got there.
  React.useEffect(() => {
    if (!stageEl || !menu.current) return
    if (v.state === 'page') menu.current.push({ ...moveTo, title: 'Move deal to…' })
    if (v.state === 'ask') menu.current.search(QUESTION)
    if (v.state === 'answer') menu.current.ask(QUESTION)
    // Once, on the stage's first render.
  }, [stageEl])

  return (
    <div className="relative flex h-[460px] w-[560px] max-w-full flex-col items-center justify-center gap-3">
      <SearchBar
        readOnly
        hotkey={false}
        placeholder="Search…"
        aria-haspopup="dialog"
        aria-expanded={open}
        wrapperClassName="w-60 cursor-pointer"
        className="cursor-pointer"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      />
      <p className="flex items-center gap-2 text-sm text-text-muted">
        <span className="font-medium text-text-default">Acme Corp</span>
        <Badge size="sm" tone={STAGE_TONE[stage]}>
          {stage}
        </Badge>
        <span>{owner}</span>
      </p>
      <div ref={setStageEl} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
      {/* Each command's success shows here, at the foot of the stage. */}
      <Toaster className="absolute inset-x-0 bottom-0 z-20 mx-auto w-[397px] max-w-full" />
      {stageEl && (
        <CommandPages
          container={stageEl}
          open={open}
          onOpenChange={setOpen}
          modal={false}
          hotkey={false}
          onOpenAutoFocus={(e) => {
            if (!openedOnce.current) e.preventDefault()
            openedOnce.current = true
          }}
          controlRef={menu}
          rootTitle="Acme Corp"
          hints={v.hints === 'on'}
          groups={groups}
          onAsk={ask}
          answer={answer}
          answering={answering}
        />
      )}
    </div>
  )
}

export default function CommandPagesDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Command pages" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
