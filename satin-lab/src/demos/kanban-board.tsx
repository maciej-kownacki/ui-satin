import * as React from 'react'
import { Calendar, ChatBubble, Label, Notes, SendDiagonal, Sparks, User } from 'iconoir-react'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Dialog } from '@uisatin/ui/dialog'
import { Link } from '@uisatin/ui/link'
import { Toaster, toast } from '@uisatin/ui/toast'
import { KanbanBoard, KanbanCard, moveKanbanItem, type KanbanColumn } from '@uisatin/pro/kanban-board'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/* The sales pipeline from the sature-lab prototype: deals that wait, refuse and ask. */

const OWNERS = {
  ola: { name: 'Ola Nowak', initials: 'O', tone: 'fuchsia' },
  marek: { name: 'Marek Zieliński', initials: 'M', tone: 'sky' },
  julia: { name: 'Julia Kowalczyk', initials: 'J', tone: 'plum' },
  tom: { name: 'Tom Becker', initials: 'T', tone: 'green' },
  nina: { name: 'Nina Berg', initials: 'N', tone: 'brand' },
} satisfies Record<string, { name: string; initials: string; tone: AvatarTone }>

type Deal = {
  id: string
  company: string
  close: string
  value: number
  owner: keyof typeof OWNERS
  /** Empty: the card shows "Set next step…", and the deal can't go past Qualified. */
  next?: string
  comments?: number
  /** Days in its column; from 14 it's stale. */
  days: number
  /** What the agent did to it, under the title. */
  status?: { text: string; by: 'nudge' | 'agent' }
  /** Goes up when the agent changes the deal: the card lights up once. */
  version?: number
}

const deal = (company: string, close: string, value: number, owner: Deal['owner'], next: string | undefined, days: number, rest: Partial<Deal> = {}): Deal => ({
  id: company.toLowerCase().replace(/[^a-z]+/g, '-'),
  company,
  close,
  value,
  owner,
  next,
  days,
  ...rest,
})

const PIPELINE: Record<string, Deal[]> = {
  lead: [deal('Northwind Labs', 'Dec 15, 2026', 24000, 'ola', undefined, 2), deal('Fjordline Logistics', 'Jan 20, 2027', 38000, 'marek', 'Intro call booked for Tue', 3)],
  qualified: [
    deal('Lumen Bank', 'Dec 12, 2026', 120000, 'julia', 'Security review in progress', 1),
    deal('Orbit Retail', 'Nov 30, 2026', 42000, 'tom', 'Waiting on budget owner', 1, { status: { text: 'Nudged by agent · 2h', by: 'nudge' } }),
    deal('Brightpath Edu', 'Nov 22, 2026', 19000, 'marek', undefined, 16, { comments: 1 }),
    deal('Vela Studios', 'Dec 2, 2026', 27000, 'nina', 'Sent two case studies', 8),
    deal('Corva Health', 'Dec 18, 2026', 61000, 'ola', 'Pilot plan with their IT lead', 5),
  ],
  discovery: [
    deal('Quanta Freight', 'Dec 10, 2026', 33000, 'marek', 'Data audit call on Monday', 7),
    deal('Halden Maritime', 'Jan 14, 2027', 47000, 'julia', 'Workshop with the ops team', 4),
  ],
  proposal: [
    deal('Tidewater Group', 'Nov 25, 2026', 96000, 'nina', 'Proposal sent, in procurement', 11, { comments: 2 }),
    deal('Nordlicht Bank', 'Dec 1, 2026', 180000, 'julia', 'Legal redlines on the MSA', 13, { comments: 1 }),
  ],
  negotiation: [
    deal('Helix Pharma', 'Nov 20, 2026', 210000, 'ola', 'Verbal yes, finalising terms', 12, { comments: 3 }),
    deal('Sierra Telecom', 'Nov 24, 2026', 150000, 'marek', 'Discount approval pending', 20, { comments: 2 }),
    deal('Ember Hotels', 'Nov 21, 2026', 58000, 'nina', 'Contract out for signature', 9, { comments: 1 }),
  ],
  won: [],
}

/** Lead's "+2 more": the leads the page hasn't loaded yet. */
const MORE_LEADS = [
  deal('Kestrel Analytics', 'Jan 8, 2027', 52000, 'julia', 'Pilot scoping on Friday', 4),
  deal('Moss & Pine Legal', 'Feb 3, 2027', 14000, 'tom', 'Sent the pricing page', 6),
]

/** From Discovery on, a deal needs a next step. */
const NEEDS_NEXT_STEP = ['discovery', 'proposal', 'negotiation', 'won']

const columnsFor = (limits: boolean, more: number): KanbanColumn[] => [
  { id: 'lead', title: 'Lead', more },
  { id: 'qualified', title: 'Qualified', tone: 'sky', limit: limits ? 4 : undefined },
  { id: 'discovery', title: 'Discovery', tone: 'fuchsia' },
  { id: 'proposal', title: 'Proposal', tone: 'plum' },
  { id: 'negotiation', title: 'Negotiation', tone: 'green', limit: limits ? 3 : undefined },
  { id: 'won', title: 'Won' },
]

const euro = (n: number) => `€${n.toLocaleString('en-US')}`
const valueTone = (n: number): BadgeTone => (n >= 100000 ? 'green' : n >= 40000 ? 'sky' : 'neutral')

const updateDeal = (all: Record<string, Deal[]>, id: string, change: (d: Deal) => Deal) =>
  Object.fromEntries(Object.entries(all).map(([column, list]) => [column, list.map((d) => (d.id === id ? change(d) : d))]))

function DealCard({ d }: { d: Deal }) {
  const owner = OWNERS[d.owner]
  return (
    <KanbanCard
      logo={<Avatar size={20} shape="rounded" initials={d.company[0]!} aria-hidden />}
      title={
        <Link href="#" underline="hover" onClick={(e) => e.preventDefault()}>
          {d.company}
        </Link>
      }
      status={
        d.status && (
          <Badge size="sm" tone="brand">
            {d.status.by === 'agent' ? <Sparks /> : <SendDiagonal />}
            {d.status.text}
          </Badge>
        )
      }
      fields={[
        { icon: <Calendar />, label: 'Close date', value: d.close },
        {
          icon: <Label />,
          label: 'Value',
          value: (
            <Badge size="sm" tone={valueTone(d.value)} className="align-top">
              {euro(d.value)}
            </Badge>
          ),
        },
        {
          icon: <User />,
          label: 'Owner',
          value: (
            <span className="inline-flex items-center gap-1.5 align-top">
              <Avatar size={16} initials={owner.initials} tone={owner.tone} aria-hidden />
              {owner.name}
            </span>
          ),
        },
        { icon: <Notes />, label: 'Next step', value: d.next ?? 'Set next step…', placeholder: !d.next },
      ]}
      footer={
        !!d.comments && (
          <span className="flex items-center gap-1">
            <ChatBubble aria-hidden className="size-3.5" />
            {d.comments}
            <span className="sr-only"> comments</span>
          </span>
        )
      }
      age={`${d.days}d`}
      stale={d.days >= 14}
      changed={d.version ?? 0}
    />
  )
}

export const controls: ShowcaseControl[] = [
  {
    id: 'state',
    label: 'State',
    items: [
      { value: 'pipeline', label: 'Pipeline' },
      { value: 'loading', label: 'Loading' },
    ],
  },
  { id: 'limits', label: 'Limits', type: 'switch', default: 'on' },
  { id: 'collapsible', label: 'Collapsible', type: 'switch', default: 'off' },
  { id: 'agent', label: 'Agent update', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const limits = v.limits === 'on'
  const limit = (n: number) => (limits ? `, limit: ${n}` : '')
  const extra = [v.collapsible === 'on' && '        collapsible', v.state === 'loading' && '        loading={!deals}'].filter(Boolean).join('\n')
  const confirm = limits
    ? `
        // A promise keeps the card at its new place, dimmed, until the dialog answers.
        confirmMove={(d, to) => {
          const column = columns.find((c) => c.id === to)!
          const full = column.limit !== undefined && deals[to].length >= column.limit && !deals[to].includes(d)
          return full ? new Promise<boolean>((resolve) => setAsk({ column, resolve, open: true })) : true
        }}`
    : ''
  const dialog = limits
    ? `
      <Dialog
        open={!!ask?.open}
        onOpenChange={(open) => !open && close(false)}
        onCloseAutoFocus={(e) => {
          e.preventDefault() // the board puts focus back on the card
          ask?.resolve(yes.current)
        }}
        title={ask && \`\${ask.column.title} is at its limit of \${ask.column.limit}\`}
        closeButton={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>Cancel</Button>
            <Button onClick={() => close(true)}>Move anyway</Button>
          </>
        }
      />`
    : ''
  const asking = limits
    ? `
  // A move into a full column waits for the dialog. It answers once the dialog has closed, so
  // the board's "Moved to…" isn't read out while the dialog still hides the page.
  const [ask, setAsk] = React.useState<{ column: KanbanColumn; resolve: (ok: boolean) => void; open: boolean }>()
  const yes = React.useRef(false)
  const close = (ok: boolean) => {
    yes.current = ok
    setAsk((a) => a && { ...a, open: false })
  }
`
    : ''
  return `import { Calendar, ChatBubble, Label, Notes, Sparks, User } from 'iconoir-react'
import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'${limits ? `\nimport { Button } from '@uisatin/ui/button'\nimport { Dialog } from '@uisatin/ui/dialog'` : ''}
import { Link } from '@uisatin/ui/link'
import { Toaster } from '@uisatin/ui/toast'
import { KanbanBoard, KanbanCard, moveKanbanItem, type KanbanColumn } from '@uisatin/pro/kanban-board'

const columns: KanbanColumn[] = [
  { id: 'lead', title: 'Lead', more: 2 },
  { id: 'qualified', title: 'Qualified', tone: 'sky'${limit(4)} },
  { id: 'discovery', title: 'Discovery', tone: 'fuchsia' },
  { id: 'proposal', title: 'Proposal', tone: 'plum' },
  { id: 'negotiation', title: 'Negotiation', tone: 'green'${limit(3)} },
  { id: 'won', title: 'Won' },
]
// From Discovery on, a deal needs a next step.
const needsNextStep = ['discovery', 'proposal', 'negotiation', 'won']

export function Pipeline({ initial }: { initial: Record<string, Deal[]> }) {
  const [deals, setDeals] = React.useState(initial)
${asking}
  return (
    <>
      <KanbanBoard
        aria-label="Sales pipeline"
        className="h-[720px]"
        columns={columns}
        items={deals}
        getItemId={(d) => d.id}
        getItemLabel={(d) => d.company}
        // The board only asks; the move happens here (and Undo comes back through here too).
        onMove={(id, column, index) => setDeals((all) => moveKanbanItem(all, (d) => d.id, id, column, index))}
        // A string refuses the column and says why, under the lifted card.
        canMove={(d, column) => !!d.next || !needsNextStep.includes(column) || 'Set a next step first'}${confirm}
        // Lead's "+2 more" becomes a button.
        onShowMore={(column) => loadMore(column)}${extra ? `\n${extra}` : ''}
        renderCard={(d) => (
          <KanbanCard
            logo={<Avatar size={20} shape="rounded" initials={d.company[0]} aria-hidden />}
            title={<Link href={\`/deals/\${d.id}\`} underline="hover">{d.company}</Link>}
            status={d.status && <Badge size="sm" tone="brand"><Sparks />{d.status}</Badge>}
            fields={[
              { icon: <Calendar />, label: 'Close date', value: d.closeDate },
              { icon: <Label />, label: 'Value', value: <Badge size="sm" tone={valueTone(d.value)}>{euro(d.value)}</Badge> },
              { icon: <User />, label: 'Owner', value: <Owner person={d.owner} /> },
              { icon: <Notes />, label: 'Next step', value: d.next ?? 'Set next step…', placeholder: !d.next },
            ]}
            footer={
              d.comments > 0 && (
                <span className="flex items-center gap-1">
                  <ChatBubble className="size-3.5" />
                  {d.comments}
                  <span className="sr-only"> comments</span>
                </span>
              )
            }
            age={\`\${d.days}d\`}
            stale={d.days >= 14}
            // When the agent edits the deal, the card lights up once and the board reads it out.
            changed={d.updatedAt}
          />
        )}
      />${dialog}
      {/* The "Moved to Negotiation" toast, with Undo, shows here. */}
      <Toaster />
    </>
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    v.state === 'pipeline' ? 'Pipeline' : 'Loading',
    v.limits === 'on' ? 'Limits' : 'No limits',
    v.collapsible === 'on' ? 'Collapsible' : 'Fixed',
    v.agent === 'on' ? 'Agent update' : 'No agent update',
  ].join(' · '),
  code: code(v),
}))

type Ask = { title: string; description: string; open: boolean }

/**
 * The sales pipeline: drag Northwind Labs to Discovery and it's refused (no next step yet); drag
 * Fjordline Logistics to Qualified (5 of 4) and a dialog asks first; "+2 more" loads two leads.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const limits = v.limits === 'on'
  const [items, setItems] = React.useState(PIPELINE)
  const [more, setMore] = React.useState(MORE_LEADS.length)
  const [ask, setAsk] = React.useState<Ask>({ title: '', description: '', open: false })
  // confirmMove's promise, and the answer it gets once the dialog has closed.
  const resolve = React.useRef<((ok: boolean) => void) | null>(null)
  const yes = React.useRef(false)
  const [layer, setLayer] = React.useState<HTMLDivElement | null>(null)
  const boardRef = React.useRef<HTMLElement>(null)
  const focusAfterLoad = React.useRef<string | null>(null)
  const columns = columnsFor(limits, more)
  React.useEffect(() => () => toast.dismiss(), [])

  // The agent: a moment after the switch turns on, it sets Northwind's next step.
  React.useEffect(() => {
    if (v.agent !== 'on') return
    const t = setTimeout(
      () =>
        setItems((all) =>
          updateDeal(all, 'northwind-labs', (d) => ({
            ...d,
            next: 'Discovery call Thu 10:00',
            status: { text: 'Next step by agent', by: 'agent' },
            version: (d.version ?? 0) + 1,
          })),
        ),
      600,
    )
    return () => clearTimeout(t)
  }, [v.agent])

  // "+2 more" goes away once they're loaded, so focus moves to the first of them.
  React.useEffect(() => {
    const name = focusAfterLoad.current
    if (!name) return
    focusAfterLoad.current = null
    boardRef.current?.querySelector<HTMLElement>(`[data-slot="kanban-item"][aria-label="${name}"]`)?.focus()
  }, [items])

  const answer = (ok: boolean) => {
    yes.current = ok
    setAsk((a) => ({ ...a, open: false }))
  }

  const confirmMove = (d: Deal, to: string) => {
    const column = columns.find((c) => c.id === to)
    const list = items[to] ?? []
    if (!column || column.limit === undefined || list.some((x) => x.id === d.id)) return true
    const count = list.length + (column.more ?? 0)
    if (count < column.limit) return true
    resolve.current?.(false)
    yes.current = false
    setAsk({
      title: `${column.title} is ${count > column.limit ? 'over' : 'at'} its limit of ${column.limit}`,
      description: `Moving ${d.company} there makes ${count + 1}.`,
      open: true,
    })
    return new Promise<boolean>((r) => (resolve.current = r))
  }

  return (
    // Wider than the stage's padding allows, so more of the board shows.
    <div className="relative -mx-6 w-[calc(100%+3rem)] py-6">
      <KanbanBoard
        ref={boardRef}
        aria-label="Sales pipeline"
        className="h-[720px]"
        columns={columns}
        items={items}
        getItemId={(d) => d.id}
        getItemLabel={(d) => d.company}
        onMove={(id, column, index) => setItems((all) => moveKanbanItem(all, (d) => d.id, id, column, index))}
        canMove={(d, column) => (d.next || !NEEDS_NEXT_STEP.includes(column) ? true : 'Set a next step first')}
        confirmMove={confirmMove}
        onShowMore={(column) => {
          if (column !== 'lead' || !more) return
          focusAfterLoad.current = MORE_LEADS[0]!.company
          setItems((all) => ({ ...all, lead: [...(all.lead ?? []), ...MORE_LEADS] }))
          setMore(0)
        }}
        collapsible={v.collapsible === 'on'}
        loading={v.state === 'loading'}
        renderCard={(d) => <DealCard d={d} />}
      />
      {/* The dialog and the toast come up inside the stage, over the board. */}
      <div ref={setLayer} className="pointer-events-none absolute inset-0 z-10" />
      {layer && (
        <Dialog
          container={layer}
          open={ask.open}
          onOpenChange={(open) => !open && answer(false)}
          // Answer once it has closed: a modal dialog hides the board from screen readers until
          // then, and the board's "Moved to…" would go unheard. Focus goes back to the card.
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            resolve.current?.(yes.current)
            resolve.current = null
          }}
          title={ask.title}
          description={ask.description}
          closeButton={false}
          footer={
            <>
              <Button variant="secondary" onClick={() => answer(false)}>
                Cancel
              </Button>
              <Button onClick={() => answer(true)}>Move anyway</Button>
            </>
          }
        />
      )}
      <Toaster className="absolute inset-x-0 bottom-0 mx-auto w-[397px] max-w-full" />
    </div>
  )
}

export default function KanbanBoardDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Kanban board" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
