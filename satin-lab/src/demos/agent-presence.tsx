import * as React from 'react'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Card } from '@uisatin/ui/card'
import { Table, type Column } from '@uisatin/ui/table'
import { AgentPresence, useAgentPresence, type AgentPresenceList } from '@uisatin/pro/agent-presence'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Stage = 'Screening' | 'Interview' | 'Offer'
type Candidate = { id: string; name: string; role: string; owner: string; ownerTone: AvatarTone; stage: Stage }

const STAGES: Stage[] = ['Screening', 'Interview', 'Offer']
const STAGE_TONE: Record<Stage, BadgeTone> = { Screening: 'sky', Interview: 'plum', Offer: 'green' }

const CANDIDATES: Candidate[] = [
  { id: 'tara', name: 'Tara Mendes', role: 'Product designer', owner: 'Ada Novak', ownerTone: 'fuchsia', stage: 'Screening' },
  { id: 'omar', name: 'Omar Haddad', role: 'Frontend engineer', owner: 'Ada Novak', ownerTone: 'fuchsia', stage: 'Screening' },
  { id: 'lena', name: 'Lena Fischer', role: 'Data analyst', owner: 'Jon Park', ownerTone: 'sky', stage: 'Screening' },
  { id: 'priya', name: 'Priya Nair', role: 'Product manager', owner: 'Jon Park', ownerTone: 'sky', stage: 'Interview' },
  { id: 'diego', name: 'Diego Alvarez', role: 'Support lead', owner: 'Ada Novak', ownerTone: 'fuchsia', stage: 'Offer' },
]

/** The three the agent moves to Interview, one after another. */
const PICKED = ['tara', 'omar', 'lena']

const AGENT = { name: 'Hiring assistant', tone: 'brand' } as const
const PERSON = { name: 'Jon Park', initials: 'JP', tone: 'sky' } as const

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')

const columns: Column<Candidate>[] = [
  { key: 'name', header: 'Candidate', width: 1.4 },
  { key: 'role', header: 'Role', width: 1.4 },
  {
    key: 'stage',
    header: 'Stage',
    width: 1,
    cell: (c) => (
      <Badge size="sm" tone={STAGE_TONE[c.stage]}>
        {c.stage}
      </Badge>
    ),
  },
  {
    key: 'owner',
    header: 'Owner',
    width: 1.2,
    cell: (c) => (
      <>
        <Avatar size={20} initials={initials(c.owner)} tone={c.ownerTone} />
        <span className="truncate">{c.owner}</span>
      </>
    ),
  },
]

export const controls: ShowcaseControl[] = [
  {
    id: 'target',
    label: 'Target',
    items: [
      { value: 'table', label: 'Table rows' },
      { value: 'kanban', label: 'Kanban cards' },
    ],
  },
  { id: 'conflict', label: 'Person editing', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const kanban = v.target === 'kanban'
  const conflict = v.conflict === 'on'
  const list = kanban
    ? `      {/* Each card is a target: spread item(id) on it. A card that moves column is followed. */}
      <div className="grid grid-cols-3 gap-3">
        {stages.map((stage) => (
          <section key={stage} aria-label={stage} className="flex flex-col gap-2">
            {candidates
              .filter((c) => c.stage === stage)
              .map((c) => (
                <Card key={c.id} size="sm" title={c.name} description={c.role} {...presence.item(c.id)} />
              ))}
          </section>
        ))}
      </div>`
    : `      {/* Table rows: Table's renderRow puts the data attribute on each <tr>. */}
      <Table
        label="Candidates"
        columns={columns}
        rows={candidates}
        renderRow={({ row, rowProps, children }) => (
          <tr {...rowProps} {...presence.item(row.id)}>
            {children}
          </tr>
        )}
      />`
  const conflictStep = conflict
    ? `
    // Someone opens the same ${kanban ? 'card' : 'row'}: the agent waits, then carries on.
    if (isBeingEdited(c.id)) {
      presence.conflict({ name: 'Jon Park', initials: 'JP' })
      await editingEnds(c.id)
      presence.start(c.id, c.name)
    }`
    : ''
  return `import { AgentPresence, useAgentPresence } from '@uisatin/pro/agent-presence'
${kanban ? "import { Card } from '@uisatin/ui/card'" : "import { Table } from '@uisatin/ui/table'"}

export function Candidates({ candidates }: { candidates: Candidate[] }) {
  const presence = useAgentPresence()

  async function moveToInterview(picked: Candidate[]) {
    for (const c of picked) {
      // The ${kanban ? 'card' : 'row'} gets the agent's edge and label; screen readers hear
      // "Hiring assistant is updating ${'${c.name}'}".
      presence.start(c.id, c.name)${conflictStep}
      await updateStage(c.id, 'Interview')
    }
    presence.done() // green with a check, then it fades out
  }

  // The presence is laid over its target from this relative box, so nothing inside moves.
  return (
    <div className="relative">
${list}
      <AgentPresence {...presence.props} agent={{ name: 'Hiring assistant', tone: 'brand' }} />
    </div>
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.target === 'kanban' ? 'Kanban cards' : 'Table rows', v.conflict === 'on' ? 'Person editing' : 'No conflict'].join(' · '),
  code: code(v),
}))

/** The board: a column per stage, the candidates in it as cards. */
function Board({ candidates, item }: { candidates: Candidate[]; item: AgentPresenceList['item'] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {STAGES.map((stage) => {
        const inStage = candidates.filter((c) => c.stage === stage)
        return (
          <section key={stage} aria-label={stage} className="flex min-w-0 flex-col gap-2 rounded-xl bg-bg-muted p-2">
            <div className="flex items-center gap-2 px-1 pt-0.5">
              <Badge size="sm" tone={STAGE_TONE[stage]}>
                {stage}
              </Badge>
              <span className="text-sm text-text-muted tabular-nums">{inStage.length}</span>
            </div>
            {inStage.map((c) => (
              // Compact cards (name and owner, then the role), so a column of four fits the stage.
              <Card key={c.id} size="sm" className="w-full" {...item(c.id)}>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-text-default">{c.name}</span>
                    <Avatar size={16} initials={initials(c.owner)} tone={c.ownerTone} />
                  </div>
                  <span className="truncate text-sm text-text-muted">{c.role}</span>
                </div>
              </Card>
            ))}
          </section>
        )
      })}
    </div>
  )
}

/**
 * The hiring scenario: the agent moves three candidates from Screening to Interview, one after
 * another. With "Person editing" on, Jon Park is in Omar's row when the agent gets there: it
 * waits, then carries on.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [candidates, setCandidates] = React.useState(CANDIDATES)
  const [running, setRunning] = React.useState(false)
  const presence = useAgentPresence()
  const { start, conflict, done, clear } = presence
  const run = React.useRef(0)

  const play = React.useCallback(async () => {
    const id = ++run.current
    const wait = (ms: number) =>
      new Promise<void>((resolve, reject) => setTimeout(() => (run.current === id ? resolve() : reject(new Error('stopped'))), ms))
    setCandidates(CANDIDATES)
    setRunning(true)
    clear()
    try {
      await wait(500)
      for (const [i, cid] of PICKED.entries()) {
        const c = CANDIDATES.find((x) => x.id === cid)!
        start(c.id, c.name)
        await wait(900)
        if (v.conflict === 'on' && i === 1) {
          conflict(PERSON)
          await wait(2400)
          start(c.id, c.name)
          await wait(600)
        }
        setCandidates((all) => all.map((x) => (x.id === c.id ? { ...x, stage: 'Interview' } : x)))
        await wait(700)
      }
      done()
      setRunning(false)
    } catch {
      // A newer run (or leaving the page) took over.
    }
  }, [start, conflict, done, clear, v.conflict])

  React.useEffect(() => {
    void play()
    return () => {
      run.current++
    }
  }, [play])

  return (
    <div className="flex w-[640px] max-w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-default">Move 3 candidates to Interview</span>
        <Button variant="secondary" size="xs" loading={running} onClick={() => void play()}>
          Run again
        </Button>
      </div>
      <div className="relative">
        {v.target === 'kanban' ? (
          <Board candidates={candidates} item={presence.item} />
        ) : (
          <Table
            label="Candidates"
            columns={columns}
            rows={candidates}
            renderRow={({ row, rowProps, children }) => (
              <tr {...rowProps} {...presence.item(row.id)}>
                {children}
              </tr>
            )}
          />
        )}
        <AgentPresence {...presence.props} agent={AGENT} />
      </div>
    </div>
  )
}

export default function AgentPresenceDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Agent presence" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
