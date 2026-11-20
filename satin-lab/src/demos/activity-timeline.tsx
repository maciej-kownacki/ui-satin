import * as React from 'react'
import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { Toaster, toast } from '@uisatin/ui/toast'
import { ActivityTimeline, type ActivityActor, type ActivityItem } from '@uisatin/pro/activity-timeline'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  {
    id: 'state',
    label: 'State',
    items: [
      { value: 'entries', label: 'Entries' },
      { value: 'loading', label: 'Loading' },
      { value: 'empty', label: 'Empty' },
    ],
  },
  {
    id: 'group',
    label: 'Group by',
    items: [
      { value: 'day', label: 'Day' },
      { value: 'none', label: 'None' },
    ],
  },
  { id: 'fold', label: 'Fold runs', type: 'switch', default: 'on' },
]

function code(v: Record<string, string>) {
  // Every state is the same timeline with one more prop, so the shortest sample is the whole one.
  const props = [
    v.state === 'loading' ? '// Skeleton rows while the history loads; the region is aria-busy.\n        loading={isLoading}' : null,
    v.state === 'empty' ? 'empty="Nothing has happened to Tara Mendes yet."' : null,
    v.group === 'none' ? `groupBy="none"` : null,
    v.fold === 'off' ? 'collapseRuns={false}' : null,
  ].filter(Boolean)
  const extra = props.length ? `\n        ${props.join('\n        ')}` : ''
  const signature = v.state === 'loading' ? '{ items, isLoading }: { items: ActivityItem[]; isLoading: boolean }' : '{ items }: { items: ActivityItem[] }'
  return `import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { Toaster } from '@uisatin/ui/toast'
import { ActivityTimeline, type ActivityItem } from '@uisatin/pro/activity-timeline'

const agent = { name: 'Agent', kind: 'agent' } as const
const you = { name: 'You', kind: 'person', avatar: <Avatar initials="MK" tone="sky" size={24} /> } as const

// Tara Mendes's history, newest first or not: the timeline sorts.
export const taraMendes: ActivityItem[] = [
  {
    id: 'salary',
    actor: agent,
    verb: 'changed',
    target: 'salary range',
    // AgentSuggestionChange[]: drawn as AgentSuggestion draws them.
    changes: [{ field: 'Salary range', from: '€7–9k', to: '€8–10k' }],
    label: 'salary range change', // "Revert salary range change"
    revertible: true,
    at: '2026-11-19T10:58:00Z',
  },
  { id: 'offer', actor: agent, verb: 'drafted', target: 'offer email', at: '2026-11-19T10:57:00Z' },
  {
    id: 'stage',
    actor: you,
    verb: 'moved to',
    target: <Badge size="sm" tone="sky">Interview</Badge>,
    at: '2026-11-19T10:42:00Z',
  },
  // …yesterday's run of agent entries folds into "Agent made 4 changes".
]

export function CandidateActivity(${signature}) {
  return (
    <>
      <ActivityTimeline
        items={items}${extra}
        // Return the request: the button spins until it settles, then a toast offers Undo.
        onRevert={(item) => api.revert(item.id)}
        onUndoRevert={(item) => api.reapply(item.id)}
      />
      <Toaster />
    </>
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.state, v.group === 'day' ? 'by day' : 'one list', v.fold === 'on' ? 'runs folded' : 'runs open'].join(' · '),
  code: code(v),
}))

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const AGENT: ActivityActor = { name: 'Agent', kind: 'agent' }
const YOU: ActivityActor = { name: 'You', kind: 'person', avatar: <Avatar initials="MK" tone="sky" size={24} /> }
const JON: ActivityActor = { name: 'Jon Park', kind: 'person', avatar: <Avatar initials="JP" tone="amber" size={24} /> }
const TARA: ActivityActor = { name: 'Tara Mendes', kind: 'person', avatar: <Avatar initials="TM" tone="fuchsia" size={24} /> }

const stage = (name: string, tone: React.ComponentProps<typeof Badge>['tone']) => (
  <Badge size="sm" tone={tone}>
    {name}
  </Badge>
)

/** Tara Mendes's history, timed from now: today, a run of agent work yesterday, the application three days ago. */
function history(now: number): ActivityItem[] {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const ago = (minutes: number) => new Date(Math.max(now - minutes * 60_000, today.getTime() + 60_000))
  const dayAt = (daysAgo: number, h: number, m: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - daysAgo)
    d.setHours(h, m)
    return d
  }
  return [
    {
      id: 'salary',
      actor: AGENT,
      verb: 'changed',
      target: 'salary range',
      changes: [{ field: 'Salary range', from: '€7–9k', to: '€8–10k' }],
      label: 'salary range change',
      revertible: true,
      at: ago(2),
    },
    { id: 'offer', actor: AGENT, verb: 'drafted', target: 'offer email', at: ago(3) },
    { id: 'stage', actor: YOU, verb: 'moved to', target: stage('Interview', 'sky'), at: ago(18) },
    { id: 'schedule', actor: AGENT, verb: 'scheduled', target: 'interview with Jon Park', at: dayAt(1, 16, 42) },
    {
      id: 'notice',
      actor: AGENT,
      verb: 'changed',
      target: 'notice period',
      changes: [{ field: 'Notice period', from: '3 months', to: '1 month' }],
      label: 'notice period change',
      revertible: true,
      at: dayAt(1, 16, 40),
    },
    { id: 'tag', actor: AGENT, verb: 'tagged', target: stage('Senior', 'neutral'), at: dayAt(1, 16, 38) },
    { id: 'summary', actor: AGENT, verb: 'summarised', target: 'CV and portfolio', at: dayAt(1, 16, 35) },
    { id: 'screening', actor: JON, verb: 'moved to', target: stage('Screening', 'plum'), at: dayAt(1, 11, 20) },
    { id: 'applied', actor: TARA, verb: 'applied for', target: 'Product designer', at: dayAt(3, 9, 14) },
  ]
}

/** The Recruiting scenario: Tara Mendes's record, its salary undone from the timeline. */
function Preview({ v }: { v: Record<string, string> }) {
  // Timed from the reader's clock, so built on the client: the server's page shows the skeleton.
  const [items, setItems] = React.useState<ActivityItem[] | null>(null)
  React.useLayoutEffect(() => setItems(history(Date.now())), [])
  const [salary, setSalary] = React.useState('€8–10k')

  React.useEffect(() => () => toast.dismiss(), [])

  return (
    <div className="relative w-[480px] max-w-full pb-16">
      {/* The record on the canvas, its history on a card inside: darker underneath, lighter on top, in both themes. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-bg-canvas p-3">
        {/* No inset of its own: the avatar starts on the card's left edge and the badge ends on its right edge. */}
        <div className="flex items-center gap-3">
          <Avatar initials="TM" tone="fuchsia" size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-base leading-5 font-medium text-text-default">Tara Mendes</div>
            <div className="text-sm leading-5 text-text-muted">
              Product designer · Expected <span className="font-medium text-text-default tabular-nums">{salary}</span>
            </div>
          </div>
          {stage('Interview', 'sky')}
        </div>
        <div className="rounded-xl border border-border-default bg-bg-card p-5 [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]">
          {/* Right under the record: the timeline names itself "Activity" for screen readers. */}
          <ActivityTimeline
            items={v.state === 'entries' ? (items ?? []) : []}
            loading={v.state === 'loading' || (v.state === 'entries' && !items)}
            empty="Nothing has happened to Tara Mendes yet."
            groupBy={v.group === 'none' ? 'none' : 'day'}
            collapseRuns={v.fold === 'on' ? 3 : false}
            onRevert={async (item) => {
              await wait(900)
              if (item.id === 'salary') setSalary('€7–9k')
            }}
            onUndoRevert={(item) => {
              if (item.id === 'salary') setSalary('€8–10k')
            }}
          />
        </div>
      </div>
      {/* The revert toast comes up inside the stage, under the record. */}
      <Toaster className="absolute inset-x-0 bottom-0 mx-auto w-[397px] max-w-full" />
    </div>
  )
}

export default function ActivityTimelineDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  // Pinned to the top: opening a run grows the record downwards and nothing above it moves.
  return <Showcase name="Activity timeline" options={options} codeHtml={codeHtml} controls={controls} align="top" render={(id, v) => <Preview key={id} v={v} />} />
}
