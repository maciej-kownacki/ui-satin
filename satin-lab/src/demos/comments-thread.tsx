import * as React from 'react'
import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { Toaster, toast } from '@uisatin/ui/toast'
import {
  CommentsThread,
  type CommentAuthor,
  type CommentItem,
  type CommentMention,
} from '@uisatin/pro/comments-thread'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/* ---------- shared ---------- */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** The mentions of `people` in `body`, where it reads "@" and the label. */
function mentionsIn(body: string, people: CommentAuthor[]): CommentMention[] {
  return people.flatMap((p) => {
    const start = body.indexOf(`@${p.name}`)
    return start < 0 ? [] : [{ id: p.id, label: p.name, start, end: start + p.name.length + 1 }]
  })
}

/** `mentions.search`, a little slow as an API would be. */
const searchIn = (people: CommentAuthor[]) => (query: string) =>
  new Promise<CommentAuthor[]>((resolve) => {
    const q = query.toLowerCase()
    setTimeout(() => resolve(people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5)), 120)
  })

/** Times from the reader's clock: minutes ago (kept today), or a day back at a time. */
type Clock = { ago: (minutes: number) => Date; dayAt: (daysAgo: number, h: number, m: number) => Date }
function clock(now: number): Clock {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return {
    ago: (minutes) => new Date(Math.max(now - minutes * 60_000, today.getTime() + 60_000)),
    dayAt: (daysAgo, h, m) => {
      const d = new Date(today)
      d.setDate(d.getDate() - daysAgo)
      d.setHours(h, m)
      return d
    },
  }
}

/**
 * A thread that keeps its comments in state, as an app would after its API answers: replies
 * arrive after 600ms, edits after 400ms, Delete removes the comment (and a root's replies) once
 * the Undo window ends. `failNext` makes the next send reject, so "Not sent" and Retry show.
 */
function useLiveComments(build: (c: Clock) => CommentItem[], me: CommentAuthor, people: CommentAuthor[], failNext?: () => boolean) {
  // Timed from the reader's clock, so built on the client: the server's page shows no comments yet.
  const [comments, setComments] = React.useState<CommentItem[] | null>(null)
  React.useLayoutEffect(() => setComments(build(clock(Date.now()))), [])

  const onReply = async (parentId: string | null, body: string, mentions: CommentMention[]) => {
    await wait(600)
    if (failNext?.()) throw new Error('Network error')
    const comment: CommentItem = { id: `c${Date.now()}`, author: me, body, mentions, parentId, at: new Date() }
    setComments((list) => [...(list ?? []), comment])
  }
  const onEdit = async (id: string, body: string, mentions: CommentMention[]) => {
    await wait(400)
    setComments((list) => (list ?? []).map((c) => (c.id === id ? { ...c, body, mentions, edited: true } : c)))
  }
  const onDelete = (id: string) => {
    setComments((list) => (list ?? []).filter((c) => c.id !== id && c.parentId !== id))
  }
  return { comments, onReply, onEdit, onDelete, mentions: { search: searchIn(people) } }
}

/** The record the thread sits on, its comments on a lighter card inside, as on Activity timeline's page. */
function Record({ title, meta, badge, children }: { title: React.ReactNode; meta: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-canvas p-3 [box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)] dark:bg-bg-card dark:border-[color-mix(in_oklab,var(--border-subtle)_55%,var(--bg-card))]">
      <div className="flex items-start gap-3 px-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">{title}</div>
          <div className="mt-1 text-sm leading-5 text-text-muted">{meta}</div>
        </div>
        {badge}
      </div>
      <div className="rounded-xl border border-border-subtle bg-bg-card p-5 [box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)] dark:bg-bg-popover dark:border-border-default">
        {children}
      </div>
    </div>
  )
}

/* ---------- HR: Tara Mendes's salary, the main demo ---------- */

const MARTA: CommentAuthor = { id: 'marta', name: 'Marta Nowak' } // the hiring manager: you
const JON: CommentAuthor = { id: 'jon', name: 'Jon Park' } // the recruiter
const LENA: CommentAuthor = { id: 'lena', name: 'Lena Fischer' } // finance
const PRIYA: CommentAuthor = { id: 'priya', name: 'Priya Nair' }
const MATEO: CommentAuthor = { id: 'mateo', name: 'Mateo Ruiz' }
const hrPeople = [JON, LENA, PRIYA, MATEO, MARTA]

const lenaAsk = '@Lena Fischer could a €5k signing bonus fit the Q1 budget?'
const priyaNote = 'Yes, €5k fits. Anything above that needs @Priya Nair to sign off.'

function taraThread({ ago, dayAt }: Clock): CommentItem[] {
  return [
    { id: 'band', author: JON, body: 'Tara Mendes expects €8–10k a month. Our band for a senior product designer tops out at €9.5k.', at: dayAt(1, 16, 20) },
    {
      id: 'meet',
      author: MARTA,
      parentId: 'band',
      body: 'Her portfolio is the strongest we’ve seen this round. Can we meet her at €9.5k with a signing bonus?',
      at: dayAt(1, 16, 45),
    },
    { id: 'bonus', author: JON, parentId: 'band', body: lenaAsk, mentions: mentionsIn(lenaAsk, [LENA]), edited: true, at: dayAt(1, 17, 5) },
    { id: 'budget', author: LENA, parentId: 'band', body: priyaNote, mentions: mentionsIn(priyaNote, [PRIYA]), at: ago(140) },
    {
      id: 'offer',
      author: JON,
      body: 'Offer sent: €9.5k a month plus the €5k bonus.\nTara accepted on the call and starts January 4.',
      at: ago(12),
    },
  ]
}

export const controls: ShowcaseControl[] = [
  { id: 'fail', label: 'Fail next send', type: 'switch', default: 'off' },
  { id: 'readonly', label: 'Read only', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const failing =
    v.fail === 'on'
      ? `
      // A rejected promise leaves the comment with "Not sent", Retry (focused) and Discard.`
      : ''
  const props =
    v.readonly === 'on'
      ? `
      // Read only: no composer, menu, Reply, Resolve or Reopen.
      disabled`
      : `${failing}
      // Return the request: a dimmed row with a Spinner shows until the comment is in \`comments\`.
      onReply={(parentId, body, mentions) => api.reply(candidate.id, { parentId, body, mentions })}
      onEdit={(id, body, mentions) => api.edit(id, { body, mentions })}
      // Runs when the Undo toast closes without Undo.
      onDelete={(id) => api.remove(id)}
      mentions={{ search: (query) => api.teammates(query) }}
      resolvable
      onResolve={(resolved) => api.setResolved(candidate.id, resolved)}`
  return `import { CommentsThread, type CommentItem } from '@uisatin/pro/comments-thread'
import { Toaster } from '@uisatin/ui/toast'

const marta = { id: 'marta', name: 'Marta Nowak' }
const jon = { id: 'jon', name: 'Jon Park' }

// Roots and replies, oldest first. Replies are one level deep.
const comments: CommentItem[] = [
  {
    id: 'band',
    author: jon,
    body: 'Tara Mendes expects €8–10k a month. Our band for a senior product designer tops out at €9.5k.',
    at: '2026-11-21T16:20:00Z',
  },
  { id: 'meet', parentId: 'band', author: marta, body: 'Can we meet her at €9.5k with a signing bonus?', at: '2026-11-21T16:45:00Z' },
  {
    id: 'bonus',
    parentId: 'band',
    author: jon,
    body: '${lenaAsk}',
    // Drawn as a Mention where the body reads "@" and the label.
    mentions: [{ id: 'lena', label: 'Lena Fischer', start: 0, end: 13 }],
    edited: true,
    at: '2026-11-21T17:05:00Z',
  },
  // …
]

export function CandidateComments({ candidate }: { candidate: Candidate }) {
  return (
    <>
      <CommentsThread
        comments={comments}
        currentUser={marta}${props}
      />
      {/* Delete's Undo toast shows here. */}
      <Toaster />
    </>
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.fail === 'on' ? 'next send fails' : 'sends', v.readonly === 'on' ? 'read only' : 'editable'].join(' · '),
  code: code(v),
}))

/** The HR scenario: a hiring manager and a recruiter settle Tara Mendes's salary; resolve it once the offer is in. */
function Preview({ v, set }: { v: Record<string, string>; set: (id: string, value: string) => void }) {
  // Read when a send settles, so the switch can be turned on while a comment is on its way.
  const fail = React.useRef(v.fail === 'on')
  fail.current = v.fail === 'on'
  const live = useLiveComments(taraThread, MARTA, hrPeople, () => {
    if (!fail.current) return false
    // One failure, then sends go through again, so Retry works.
    set('fail', 'off')
    return true
  })

  React.useEffect(() => () => toast.dismiss(), [])

  return (
    <div className="relative w-[520px] max-w-full pb-16">
      <Record
        title={
          <>
            <Avatar initials="TM" tone="fuchsia" size={20} />
            <span className="truncate text-base leading-5 font-medium text-text-default">Tara Mendes</span>
          </>
        }
        meta={
          <>
            Senior product designer · Expects <span className="font-medium text-text-default tabular-nums">€8–10k</span>
          </>
        }
        badge={
          <Badge size="sm" tone="green">
            Offer
          </Badge>
        }
      >
        {live.comments && (
          <CommentsThread
            comments={live.comments}
            currentUser={MARTA}
            onReply={live.onReply}
            onEdit={live.onEdit}
            onDelete={live.onDelete}
            mentions={live.mentions}
            resolvable
            disabled={v.readonly === 'on'}
          />
        )}
      </Record>
      {/* Delete's Undo toast comes up inside the stage, under the record. */}
      <Toaster className="absolute inset-x-0 bottom-0 mx-auto w-[397px] max-w-full" />
    </div>
  )
}

export default function CommentsThreadDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  // Pinned to the top: a reply composer or a new comment grows the thread downwards.
  return <Showcase name="Comments thread" options={options} codeHtml={codeHtml} controls={controls} align="top" render={(_, v, set) => <Preview v={v} set={set} />} />
}

/* ---------- Other teams ---------- */

// Sales: a discount on a deal, with an @ of the account executive.
const SOFIA: CommentAuthor = { id: 'sofia', name: 'Sofia Lind' } // sales director: you
const RAVI: CommentAuthor = { id: 'ravi', name: 'Ravi Shah' } // account executive
const salesPeople = [RAVI, { id: 'hana', name: 'Hana Sato' }, { id: 'omar', name: 'Omar Haddad' }]
const discountAsk = 'Acme asks for 15% off the 120-seat plan if they sign this quarter.'
const discountReply = '@Ravi Shah 10% works for a two-year term. Can you send the updated quote today?'
const salesThread = ({ ago }: Clock): CommentItem[] => [
  { id: 'ask', author: RAVI, body: discountAsk, at: ago(95) },
  { id: 'ten', author: SOFIA, parentId: 'ask', body: discountReply, mentions: mentionsIn(discountReply, [RAVI]), at: ago(40) },
]

// Marketing: a comment on a campaign draft.
const ANA: CommentAuthor = { id: 'ana', name: 'Ana Costa' } // designer
const LEO: CommentAuthor = { id: 'leo', name: 'Leo Brandt' } // copywriter: you
const marketingPeople = [ANA, { id: 'nina', name: 'Nina Weber' }]
const heroAsk = 'Shortened it to “Spring trail shoes are here”. @Ana Costa can the hero show the Ridge on wet rock?'
const marketingThread = ({ ago }: Clock): CommentItem[] => [
  { id: 'subject', author: ANA, body: 'The subject line runs past 60 characters, so it cuts off on phones.', at: ago(70) },
  { id: 'short', author: LEO, parentId: 'subject', body: heroAsk, mentions: mentionsIn(heroAsk, [ANA]), at: ago(25) },
]

// Commerce: an internal note on an order, never shown to the customer.
const TOM: CommentAuthor = { id: 'tom', name: 'Tom Becker' } // warehouse lead
const IRIS: CommentAuthor = { id: 'iris', name: 'Iris Moreau' } // customer care: you
const commercePeople = [TOM, { id: 'kai', name: 'Kai Lehmann' }]
const holdAsk = 'Customer called: swap to size 43 before it ships, no charge for the change. @Tom Becker can you hold the parcel?'
const commerceThread = ({ ago }: Clock): CommentItem[] => [
  { id: 'swap', author: IRIS, body: holdAsk, mentions: mentionsIn(holdAsk, [TOM]), at: ago(50) },
  { id: 'held', author: TOM, parentId: 'swap', body: 'Held. It ships tomorrow morning with the 43.', at: ago(20) },
]

const teams = {
  sales: { me: SOFIA, people: salesPeople, build: salesThread, title: 'Acme Corp', meta: '120 seats · Negotiation', badge: 'Deal' },
  marketing: { me: LEO, people: marketingPeople, build: marketingThread, title: 'Spring launch email', meta: 'Draft · Sends March 3', badge: 'Campaign' },
  commerce: { me: IRIS, people: commercePeople, build: commerceThread, title: 'Order #4821', meta: 'Ridge trail shoe · Internal notes', badge: 'Order' },
} as const

export const teamOptions: ShowcaseOption[] = [
  {
    id: 'sales',
    label: 'Sales: a discount on a deal',
    code: `import { CommentsThread } from '@uisatin/pro/comments-thread'

// The discount on the Acme deal, with an @ of the account executive.
<CommentsThread
  comments={deal.comments}
  currentUser={me}
  onReply={(parentId, body, mentions) => crm.comment(deal.id, { parentId, body, mentions })}
  mentions={{ search: (query) => crm.teammates(query) }}
  resolvable
  onResolve={(resolved) => crm.setResolved(deal.id, resolved)}
/>`,
  },
  {
    id: 'marketing',
    label: 'Marketing: a campaign draft',
    code: `import { CommentsThread } from '@uisatin/pro/comments-thread'

// Review comments on a campaign draft.
<CommentsThread
  comments={draft.comments}
  currentUser={me}
  onReply={(parentId, body, mentions) => campaigns.comment(draft.id, { parentId, body, mentions })}
  onEdit={(id, body, mentions) => campaigns.edit(id, { body, mentions })}
  mentions={{ search: (query) => team.search(query) }}
  resolvable
/>`,
  },
  {
    id: 'commerce',
    label: 'Commerce: an internal note on an order',
    code: `import { CommentsThread } from '@uisatin/pro/comments-thread'

// Notes for the team on an order. The customer never sees them: talking to them is a support inbox.
<CommentsThread
  comments={order.notes}
  currentUser={me}
  onReply={(parentId, body, mentions) => orders.note(order.id, { parentId, body, mentions })}
  mentions={{ search: (query) => staff.search(query) }}
/>`,
  },
]

function TeamThread({ team }: { team: keyof typeof teams }) {
  const t = teams[team]
  const live = useLiveComments(t.build, t.me, t.people)
  return (
    <div className="w-[520px] max-w-full">
      <Record
        title={<span className="truncate text-base leading-5 font-medium text-text-default">{t.title}</span>}
        meta={t.meta}
        badge={
          <Badge size="sm" tone="neutral">
            {t.badge}
          </Badge>
        }
      >
        {live.comments && (
          // No onDelete here: its Undo toast needs a Toaster, and the main demo above holds the page's one.
          <CommentsThread
            comments={live.comments}
            currentUser={t.me}
            onReply={live.onReply}
            onEdit={live.onEdit}
            mentions={live.mentions}
            resolvable={team !== 'commerce'}
          />
        )}
      </Record>
    </div>
  )
}

export function CommentsThreadTeamsDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Comments thread for other teams"
      options={teamOptions}
      codeHtml={codeHtml}
      align="top"
      render={(option) => <TeamThread key={option} team={option as keyof typeof teams} />}
    />
  )
}
