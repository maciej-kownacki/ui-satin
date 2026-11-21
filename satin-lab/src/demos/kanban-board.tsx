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

/* Fictional companies' marks, drawn for this demo in the manner of Logoipsum: one plain shape each,
   in the text colour, so they hold up in Light and Dark. Keyed by deal id. */
const LOGOS: Record<string, React.ReactNode> = {
  'northwind-labs': <path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z" />,
  'fjordline-logistics': <path d="M1.5 4h5l8 8-8 8h-5l8-8zM10 4h5l8 8-8 8h-5l8-8z" />,
  'lumen-bank': <path fillRule="evenodd" d="M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zm3 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8z" />,
  'orbit-retail': (
    <>
      <circle cx="10" cy="14" r="8" />
      <circle cx="19.5" cy="4.5" r="3.5" />
    </>
  ),
  'brightpath-edu': <path d="M2 22v-6h6v-6h6V4h8v18z" />,
  'vela-studios': <path d="M11 2v15H3.5zM13 5.5L20.5 17H13zM2.5 19h19L19 22.5H5z" />,
  'corva-health': (
    <>
      <circle cx="12" cy="6.75" r="4.75" />
      <circle cx="17.25" cy="12" r="4.75" />
      <circle cx="12" cy="17.25" r="4.75" />
      <circle cx="6.75" cy="12" r="4.75" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'quanta-freight': (
    <>
      <rect x="2" y="2" width="9" height="9" rx="2" />
      <rect x="13" y="2" width="9" height="9" rx="2" />
      <rect x="2" y="13" width="9" height="9" rx="2" />
      <circle cx="17.5" cy="17.5" r="4.5" />
    </>
  ),
  'halden-maritime': (
    <>
      <path d="M3 12a9 9 0 0 1 18 0z" />
      <rect x="1" y="14" width="22" height="3" rx="1.5" />
      <rect x="5" y="19" width="14" height="3" rx="1.5" />
    </>
  ),
  'tidewater-group': (
    <path d="M2 6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v4.5c-3.3-2.7-6.7-2.7-10 0s-6.7 2.7-10 0zM2 14c3.3 2.7 6.7 2.7 10 0s6.7-2.7 10 0v4a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" />
  ),
  'nordlicht-bank': (
    <>
      <rect x="3" y="11" width="4.5" height="11" rx="2.25" />
      <rect x="9.75" y="6.5" width="4.5" height="15.5" rx="2.25" />
      <rect x="16.5" y="2" width="4.5" height="20" rx="2.25" />
    </>
  ),
  'helix-pharma': (
    <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" d="M7 2c0 6 10 6 10 10s-10 4-10 10M17 2c0 6-10 6-10 10s10 4 10 10" />
  ),
  'sierra-telecom': <path d="M1 21L8.5 6l4.6 9.2L16 10l7 11z" />,
  'ember-hotels': <path fillRule="evenodd" d="M12 1.5s7.5 7.8 7.5 13a7.5 7.5 0 0 1-15 0C4.5 9.3 12 1.5 12 1.5zM12 12.5a3 3 0 1 0 0 6a3 3 0 1 0 0-6z" />,
  'kestrel-analytics': <path d="M2 4.5l10 6 10-6V9l-10 6-10-6zM2 12l10 6 10-6v4.5l-10 6-10-6z" />,
  'moss-pine-legal': <path d="M12 1.5L18.5 10h-3l5.5 7h-7.5v5.5h-3V17H3l5.5-7h-3z" />,
}

const CompanyLogo = ({ id }: { id: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-5 text-text-default">
    {LOGOS[id]}
  </svg>
)

const euro = (n: number) => `€${n.toLocaleString('en-US')}`
const valueTone = (n: number): BadgeTone => (n >= 100000 ? 'green' : n >= 40000 ? 'sky' : 'neutral')

const updateDeal = (all: Record<string, Deal[]>, id: string, change: (d: Deal) => Deal) =>
  Object.fromEntries(Object.entries(all).map(([column, list]) => [column, list.map((d) => (d.id === id ? change(d) : d))]))

function DealCard({ d }: { d: Deal }) {
  const owner = OWNERS[d.owner]
  return (
    <KanbanCard
      logo={<CompanyLogo id={d.id} />}
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
            logo={<img src={d.logoUrl} alt="" className="size-5" />}
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
