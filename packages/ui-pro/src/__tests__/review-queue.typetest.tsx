/* Type test, never run: ReviewQueue's props, controlled and uncontrolled, its parts, refs, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  ReviewQueue,
  ReviewQueueActions,
  ReviewQueueHeader,
  ReviewQueueItem,
  ReviewQueueRoot,
  ReviewQueueSummary,
  useReviewQueue,
  type ReviewQueueDecisions,
} from '../components/review-queue'

type Email = { id: string; to: string; subject: string }
const emails: Email[] = [{ id: 'anna', to: 'Anna Kowalska', subject: 'Great meeting you' }]

const sectionRef = React.createRef<HTMLElement>()
const itemRef = React.createRef<HTMLDivElement>()

// Uncontrolled: the queue keeps its place, its decisions and its editor.
export const uncontrolled = (
  <ReviewQueue
    ref={sectionRef}
    title="Trade fair follow-ups"
    items={emails}
    itemLabel={(e) => e.to}
    renderItem={(e, { position, count, decision }) => (
      <p>
        {e.subject} {position}/{count} {decision}
      </p>
    )}
    onApprove={async (e) => e.id}
    onSkip={(e) => e.id}
    renderEditor={(e) => <input name="subject" defaultValue={e.subject} />}
    onEdit={(e, values) => values?.subject}
    defaultIndex={0}
    defaultDecisions={{ anna: 'skipped' }}
    shortcuts={{ approve: 'Y', edit: '' }}
    sheetProps={{ side: 'bottom' }}
    approveLabel="Send"
    summaryActions={<button>Back to inbox</button>}
  />
)

// Controlled: the app holds all three.
function Controlled() {
  const [index, setIndex] = React.useState(0)
  const [decisions, setDecisions] = React.useState<ReviewQueueDecisions>({})
  const [editing, setEditing] = React.useState(false)
  return (
    <ReviewQueue
      items={emails}
      itemLabel={(e) => e.to}
      itemKey={(e) => e.id}
      renderItem={(e) => e.subject}
      index={index}
      onIndexChange={setIndex}
      decisions={decisions}
      onDecisionsChange={setDecisions}
      editing={editing}
      onEditingChange={setEditing}
      shortcuts={false}
    />
  )
}
export const controlled = <Controlled />

function Approve() {
  const queue = useReviewQueue<Email>()
  const to: string | undefined = queue.item?.to
  return <button onClick={queue.approve}>{to}</button>
}

export const parts = (
  <ReviewQueueRoot items={emails} itemLabel={(e) => e.to} onApprove={(e) => e.subject}>
    <ReviewQueueHeader />
    <ReviewQueueItem<Email> ref={itemRef}>{(e) => e.subject}</ReviewQueueItem>
    <ReviewQueueActions />
    <Approve />
    <ReviewQueueSummary actions={<button>Done</button>} />
  </ReviewQueueRoot>
)

// @ts-expect-error: itemLabel is required
export const missing = <ReviewQueue items={emails} renderItem={(e) => e.to} />

// @ts-expect-error: renderItem gets an Email, which has no `name`
export const wrongItem = <ReviewQueue items={emails} itemLabel={(e) => e.to} renderItem={(e) => e.name} />

// @ts-expect-error: no such decision
export const wrongDecision: ReviewQueueDecisions = { anna: 'rejected' }

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels labels={{ close: 'Zamknij', reviewApprove: 'Zatwierdź', reviewPosition: (p, n) => `${p} z ${n}`, reviewTally: (a, s) => `zatwierdzone: ${a}, pominięte: ${s}` }}>
    {uncontrolled}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ reviewItemAt: 'Pozycja' }}>{uncontrolled}</SatinLabels>
