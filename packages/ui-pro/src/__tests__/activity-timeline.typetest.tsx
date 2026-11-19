/* Type test, never run: ActivityTimeline's props, its parts, refs, and its words in SatinLabels. */
import * as React from 'react'
import type { AgentSuggestionChange } from '@uisatin/ui/agent-suggestion'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  ActivityTimeline,
  ActivityTimelineDay,
  ActivityTimelineEntry,
  ActivityTimelineList,
  ActivityTimelineRoot,
  ActivityTimelineRun,
  ActivityTimelineTime,
  type ActivityItem,
} from '../components/activity-timeline'

// The same changes AgentSuggestion takes.
const changes: AgentSuggestionChange[] = [{ field: 'Salary range', from: '7–9k', to: '8–10k' }]

const items: ActivityItem[] = [
  { id: 'a', actor: { name: 'Agent', kind: 'agent' }, verb: 'changed', target: 'salary range', changes, at: new Date(), revertible: true, label: 'salary range change' },
  { id: 'b', actor: { name: 'You', kind: 'person', avatar: <span /> }, verb: 'moved to', at: '2026-11-19T10:00:00Z', reverted: true },
  { id: 'c', actor: { name: 'Jon Park', kind: 'person', id: 'u-jon' }, verb: 'tagged', at: 1_795_000_000_000, reverted: { by: 'Ada Novak' } },
]

// @ts-expect-error: no such kind
const wrongKind: ActivityItem = { id: 'x', actor: { name: 'Bot', kind: 'robot' }, verb: 'ran', at: 0 }
// @ts-expect-error: `at` is required
const noTime: ActivityItem = { id: 'x', actor: { name: 'You', kind: 'person' }, verb: 'ran' }

const rootRef = React.createRef<HTMLDivElement>()
const liRef = React.createRef<HTMLLIElement>()
const listRef = React.createRef<HTMLOListElement>()
const timeRef = React.createRef<HTMLTimeElement>()

// Uncontrolled: the timeline keeps which runs are open.
export const uncontrolled = (
  <ActivityTimeline
    ref={rootRef}
    items={items}
    groupBy="day"
    collapseRuns={4}
    defaultExpanded={['a']}
    onRevert={async (item) => item.id}
    onUndoRevert={(item) => void item}
    empty="Nothing yet"
  />
)

// Controlled.
const [expanded, setExpanded] = [['a'], (next: string[]) => void next]
export const controlled = <ActivityTimeline items={items} groupBy="none" collapseRuns={false} expanded={expanded} onExpandedChange={setExpanded} loading />

// @ts-expect-error: groupBy is day or none
export const wrongGroup = <ActivityTimeline items={items} groupBy="week" />
// @ts-expect-error: items are required
export const noItems = <ActivityTimeline />

// Parts, with a run open and closed both ways.
export const parts = (
  <ActivityTimelineRoot ref={rootRef} onRevert={() => {}} aria-label="History">
    <ActivityTimelineDay ref={listRef} day={new Date()}>
      <ActivityTimelineEntry ref={liRef} item={items[0]} />
      <ActivityTimelineRun actor={items[0].actor} count={2} at={items[0].at} open onOpenChange={(open) => void open}>
        <ActivityTimelineEntry item={items[0]} />
      </ActivityTimelineRun>
      <ActivityTimelineRun actor={items[0].actor} count={2} at={items[0].at} defaultOpen summary="Two edits">
        <ActivityTimelineEntry item={items[1]} withDate />
      </ActivityTimelineRun>
    </ActivityTimelineDay>
    <ActivityTimelineDay day="Earlier">
      <ActivityTimelineEntry item={items[2]} />
    </ActivityTimelineDay>
    <ActivityTimelineList aria-label="Pinned" ref={listRef} />
    <ActivityTimelineTime ref={timeRef} at={Date.now()} withDate />
  </ActivityTimelineRoot>
)

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels labels={{ close: 'Zamknij', revert: 'Cofnij', revertChange: (label) => `Cofnij: ${label}`, activityRun: (actor, count) => <>{actor}: {count} zmiany</> }}>
    {uncontrolled}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ revertedBy: 'Cofnięte' }}>{uncontrolled}</SatinLabels>

export { wrongKind, noTime }
