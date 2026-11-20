import * as React from 'react'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Card } from '@uisatin/ui/card'
import { Separator } from '@uisatin/ui/separator'
import { StreamingText } from '@uisatin/ui/streaming-text'
import { Table, type Column } from '@uisatin/ui/table'
import { AgentPresence, useAgentPresence, type AgentPresenceList } from '@uisatin/pro/agent-presence'
import { KanbanBoard, KanbanCard, moveKanbanItem, type KanbanColumn } from '@uisatin/pro/kanban-board'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Invite = 'none' | 'sent' | 'accepted'
/** An interview time: short on a card, with the date in the table, in full in the email. */
type Slot = { short: string; date: string; long: string }
type Candidate = {
  id: string
  name: string
  role: string
  email: string
  interviewer: string
  slot?: Slot
  invite: Invite
}

const INVITES: Invite[] = ['none', 'sent', 'accepted']
const INVITE: Record<Invite, { label: string; tone: BadgeTone }> = {
  none: { label: 'Not invited', tone: 'neutral' },
  sent: { label: 'Invite sent', tone: 'sky' },
  accepted: { label: 'Accepted', tone: 'green' },
}

const CANDIDATES: Candidate[] = [
  { id: 'tara', name: 'Tara Mendes', role: 'Product designer', email: 'tara.mendes@example.com', interviewer: 'Ada Novak', invite: 'none' },
  { id: 'omar', name: 'Omar Haddad', role: 'Frontend engineer', email: 'omar.haddad@example.com', interviewer: 'Ada Novak', invite: 'none' },
  { id: 'lena', name: 'Lena Fischer', role: 'Data analyst', email: 'lena.fischer@example.com', interviewer: 'Jon Park', invite: 'none' },
  {
    id: 'priya',
    name: 'Priya Nair',
    role: 'Product manager',
    email: 'priya.nair@example.com',
    interviewer: 'Jon Park',
    slot: { short: 'Mon 14:00', date: 'Mon 13 Jan, 14:00', long: 'Monday 13 January at 14:00' },
    invite: 'accepted',
  },
  {
    id: 'diego',
    name: 'Diego Alvarez',
    role: 'Support lead',
    email: 'diego.alvarez@example.com',
    interviewer: 'Ada Novak',
    slot: { short: 'Wed 11:00', date: 'Wed 15 Jan, 11:00', long: 'Wednesday 15 January at 11:00' },
    invite: 'accepted',
  },
]

/** The three the agent invites, one after another, and the time it finds for each. */
const PICKED: [string, Slot][] = [
  ['tara', { short: 'Tue 10:00', date: 'Tue 14 Jan, 10:00', long: 'Tuesday 14 January at 10:00' }],
  ['omar', { short: 'Tue 15:30', date: 'Tue 14 Jan, 15:30', long: 'Tuesday 14 January at 15:30' }],
  ['lena', { short: 'Thu 09:30', date: 'Thu 16 Jan, 09:30', long: 'Thursday 16 January at 09:30' }],
]

/** The steps the agent goes through for each candidate, said on its label. */
const STEP = { slot: 'Picking a slot…', draft: 'Drafting invite…', send: 'Sending…' }

const AGENT = { name: 'Hiring assistant', tone: 'brand' } as const
const PERSON = { name: 'Jon Park', initials: 'JP', tone: 'sky' } as const

const subjectOf = (c: Candidate, slot: Slot) => `Interview for ${c.role}: ${slot.date}`
const bodyOf = (c: Candidate, slot: Slot) =>
  `Hi ${c.name.split(' ')[0]}, thanks for applying for the ${c.role} role. ${c.interviewer} would like to meet you for a 45-minute video interview on ${slot.long}. If that time doesn't suit you, reply with one that does.`

const columns: Column<Candidate>[] = [
  { key: 'name', header: 'Candidate', width: 1.3 },
  { key: 'role', header: 'Role', width: 1.4 },
  { key: 'slot', header: 'Interview', width: 1.2, cell: (c) => <span className="tabular-nums">{c.slot?.date}</span> },
  {
    key: 'invite',
    header: 'Invite',
    width: 1,
    cell: (c) => (
      <Badge size="sm" tone={INVITE[c.invite].tone}>
        {INVITE[c.invite].label}
      </Badge>
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
  const item = kanban ? 'card' : 'row'
  const list = kanban
    ? `      {/* KanbanBoard: spread item(id) on each KanbanCard. A card that moves column is followed. */}
      <KanbanBoard
        aria-label="Invites"
        columns={columns}
        items={items}
        getItemId={(c) => c.id}
        getItemLabel={(c) => c.name}
        onMove={(id, column, index) => setItems((all) => moveKanbanItem(all, (c) => c.id, id, column, index))}
        renderCard={(c) => <KanbanCard title={c.name} meta={c.role} {...presence.item(c.id)} />}
      />`
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
      // Someone has the ${item} open: the agent waits, then carries on.
      if (isBeingEdited(c.id)) {
        presence.start(c.id, c.name)
        presence.conflict({ name: 'Jon Park', initials: 'JP' })
        await editingEnds(c.id)
      }`
    : ''
  return `${kanban ? "import * as React from 'react'\n" : ''}import { AgentPresence, useAgentPresence } from '@uisatin/pro/agent-presence'
${kanban ? "import { KanbanBoard, KanbanCard, moveKanbanItem } from '@uisatin/pro/kanban-board'" : "import { Table } from '@uisatin/ui/table'"}

${
  kanban
    ? `export function Invites({ byInvite }: { byInvite: Record<string, Candidate[]> }) {
  const [items, setItems] = React.useState(byInvite)
  const presence = useAgentPresence()`
    : `export function Invites({ candidates }: { candidates: Candidate[] }) {
  const presence = useAgentPresence()`
}

  async function sendInvites(picked: Candidate[]) {
    for (const c of picked) {${conflictStep}
      // The ${item} gets the agent's edge; its label says the step, and screen readers
      // hear "Hiring assistant, Tara Mendes: Picking a slot…". Same ${item}: it stays put.
      presence.start(c.id, c.name, 'Picking a slot…')
      const slot = await findSlot(c.interviewer)
      presence.start(c.id, c.name, 'Drafting invite…')
      const email = await draftInvite(c, slot)
      presence.start(c.id, c.name, 'Sending…')
      await send(email)
      ${kanban ? "setItems((all) => moveKanbanItem(all, (x) => x.id, c.id, 'sent', all.sent.length))" : "await setInvite(c.id, 'sent')"}
      presence.done() // green with a check; the next start() takes it on${kanban ? ', and it follows the card to Invite sent' : ''}
    }
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

const BOARD_COLUMNS: KanbanColumn[] = [
  { id: 'none', title: INVITE.none.label },
  { id: 'sent', title: INVITE.sent.label, tone: 'sky' },
  { id: 'accepted', title: INVITE.accepted.label, tone: 'green' },
]
const byInvite = (all: Candidate[]) => Object.fromEntries(INVITES.map((s) => [s, all.filter((c) => c.invite === s)]))
const fromBoard = (items: Record<string, Candidate[]>) => INVITES.flatMap((s) => items[s].map((c) => ({ ...c, invite: s })))

/**
 * Satin Pro's Kanban board, a column per invite status. Its height is set, so a column filling
 * up never moves the email under it. A person can move cards too, by drag or the ⋯ menu.
 */
function Board({
  candidates,
  setCandidates,
  item,
}: {
  candidates: Candidate[]
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>
  item: AgentPresenceList['item']
}) {
  return (
    <KanbanBoard
      aria-label="Invites"
      className="h-[288px]"
      columnWidth={205}
      columns={BOARD_COLUMNS}
      items={byInvite(candidates)}
      getItemId={(c) => c.id}
      getItemLabel={(c) => c.name}
      onMove={(id, column, index) => setCandidates((all) => fromBoard(moveKanbanItem(byInvite(all), (c) => c.id, id, column, index)))}
      undoToast={false}
      renderCard={(c) => <KanbanCard title={c.name} meta={c.role} {...item(c.id)} />}
    />
  )
}

/** The email the agent is writing: empty until it drafts the first one, then the latest. */
function Draft({ candidate, sent }: { candidate: Candidate | null; sent: boolean }) {
  const slot = candidate?.slot
  return (
    <Card size="sm" className="w-full">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <dl className="grid min-w-0 grid-cols-[52px_minmax(0,1fr)] gap-x-2 gap-y-1 text-body">
            <dt className="text-text-muted">To</dt>
            <dd className="truncate text-text-default">
              {candidate && (
                <>
                  {candidate.name} <span className="text-text-muted">{candidate.email}</span>
                </>
              )}
            </dd>
            <dt className="text-text-muted">Subject</dt>
            <dd className="truncate text-text-default">{candidate && slot && subjectOf(candidate, slot)}</dd>
          </dl>
          {candidate && (
            <Badge size="sm" tone={sent ? 'green' : 'neutral'}>
              {sent ? 'Sent' : 'Draft'}
            </Badge>
          )}
        </div>
        <Separator />
        {/* Three lines held, so the card keeps its height from one email to the next. */}
        <div className="min-h-[3lh] text-body">
          {candidate && slot ? (
            <StreamingText key={candidate.id} text={bodyOf(candidate, slot)} />
          ) : (
            <p className="text-text-muted">The assistant writes each invite here before it sends it.</p>
          )}
        </div>
      </div>
    </Card>
  )
}

/**
 * The hiring scenario: the agent invites three candidates to an interview, one after another.
 * For each it picks a slot (the time fills in), drafts the email (it writes itself out below),
 * sends it, and marks the invite sent; its label says each step. With "Person editing" on, Jon
 * Park has Omar's row open when the agent gets there: it waits, then carries on.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [candidates, setCandidates] = React.useState(CANDIDATES)
  const [draft, setDraft] = React.useState<{ id: string; sent: boolean } | null>(null)
  const [running, setRunning] = React.useState(false)
  const presence = useAgentPresence()
  const { start, conflict, done, clear } = presence
  const run = React.useRef(0)

  const play = React.useCallback(async () => {
    const id = ++run.current
    const wait = (ms: number) =>
      new Promise<void>((resolve, reject) => setTimeout(() => (run.current === id ? resolve() : reject(new Error('stopped'))), ms))
    const update = (cid: string, change: Partial<Candidate>) => setCandidates((all) => all.map((x) => (x.id === cid ? { ...x, ...change } : x)))
    setCandidates(CANDIDATES)
    setDraft(null)
    setRunning(true)
    clear()
    try {
      await wait(500)
      for (const [i, [cid, slot]] of PICKED.entries()) {
        const c = CANDIDATES.find((x) => x.id === cid)!
        if (v.conflict === 'on' && i === 1) {
          start(c.id, c.name)
          conflict(PERSON)
          await wait(2400)
        }
        start(c.id, c.name, STEP.slot)
        await wait(1000)
        update(c.id, { slot })
        await wait(300)
        start(c.id, c.name, STEP.draft)
        setDraft({ id: c.id, sent: false })
        await wait(1700)
        start(c.id, c.name, STEP.send)
        await wait(800)
        setDraft({ id: c.id, sent: true })
        update(c.id, { invite: 'sent' })
        done()
        await wait(1000)
      }
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

  const sentCount = PICKED.filter(([cid]) => candidates.find((c) => c.id === cid)?.invite === 'sent').length
  const drafted = draft ? (candidates.find((c) => c.id === draft.id) ?? null) : null

  return (
    <div className="flex w-[640px] max-w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-medium text-text-default">Send interview invites</span>
          <span className="shrink-0 text-sm text-text-muted tabular-nums">{sentCount} of 3 sent</span>
        </div>
        <Button variant="secondary" size="xs" loading={running} onClick={() => void play()}>
          Run again
        </Button>
      </div>
      <div className="relative">
        {v.target === 'kanban' ? (
          <Board candidates={candidates} setCandidates={setCandidates} item={presence.item} />
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
      <Draft candidate={drafted} sent={draft?.sent ?? false} />
    </div>
  )
}

export default function AgentPresenceDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  // From the top: switching Table and Kanban keeps the heading put, and an email that wraps to another line on a phone grows down.
  return <Showcase name="Agent presence" align="top" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
