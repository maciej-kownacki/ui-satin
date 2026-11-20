/* Type test, never run: ReviewableChanges' props, its parts, refs, and its words in SatinLabels. */
import * as React from 'react'
import { AgentSuggestion, type AgentSuggestionChange } from '@uisatin/ui/agent-suggestion'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  ReviewableChanges,
  ReviewableChangesAcceptAll,
  ReviewableChangesApply,
  ReviewableChangesList,
  ReviewableChangesRoot,
  type ReviewableChange,
  type ReviewableChangesStatus,
  type ReviewableChangesValue,
} from '../components/agent-changes-review'

// AgentSuggestionChanges' entries go in as they are.
const plain: AgentSuggestionChange[] = [{ field: 'Stage', from: 'Proposal', to: 'Negotiation' }]
const changes: ReviewableChange[] = [
  ...plain,
  { id: 'value', field: <b>Value</b>, label: 'Value', from: '$18,000', to: '$22,000', source: { icon: <svg />, label: 'Transcription', quote: 'We can do 22k.' } },
]

// @ts-expect-error: a source needs its label
export const noSourceLabel: ReviewableChange = { field: 'Stage', to: 'Negotiation', source: { quote: 'Sure.' } }

// @ts-expect-error: no such decision
const wrong: ReviewableChangesValue = { stage: 'maybe' }

// @ts-expect-error: no such stage
const wrongStatus: ReviewableChangesStatus = 'done'

const rootRef = React.createRef<HTMLDivElement>()
const buttonRef = React.createRef<HTMLButtonElement>()

export function Controlled() {
  const [value, setValue] = React.useState<ReviewableChangesValue>({ value: 'rejected' })
  return (
    <ReviewableChanges
      ref={rootRef}
      changes={changes}
      value={value}
      onValueChange={setValue}
      onApply={async (accepted, decisions) => {
        const fields: ReviewableChange[] = accepted
        void fields
        void decisions.value
      }}
      control="checkbox"
      status="review"
      aria-describedby="hint"
    />
  )
}

export const uncontrolled = <ReviewableChanges changes={plain} defaultValue={{ '0': 'accepted' }} onApply={() => {}} />

export const parts = (
  <ReviewableChangesRoot ref={rootRef} changes={changes} onApply={() => {}}>
    <AgentSuggestion
      kind="CRM update"
      actions={
        <>
          <ReviewableChangesAcceptAll ref={buttonRef} variant="tertiary" />
          <ReviewableChangesApply ref={buttonRef}>Update deal</ReviewableChangesApply>
        </>
      }
    >
      <ReviewableChangesList className="gap-3" />
    </AgentSuggestion>
  </ReviewableChangesRoot>
)

// @ts-expect-error: changes is required
export const missing = <ReviewableChanges onApply={() => {}} />

// @ts-expect-error: no such control
export const wrongControl = <ReviewableChanges changes={plain} control="switch" />

// The words join SatinLabels, functions where they carry data.
export const labels = (
  <SatinLabels
    labels={{
      acceptFieldChange: (field) => `Zaakceptuj zmianę: ${field}`,
      acceptFieldChangeText: 'Akceptuj',
      rejectFieldChange: (field) => `Odrzuć zmianę: ${field}`,
      applyFieldChanges: (count, number) => `Zastosuj (${number})`,
      fieldChangesApplied: (count, number) => `Zastosowano: ${number}`,
      fieldChangeApplied: 'Zastosowano',
    }}
  >
    {uncontrolled}
  </SatinLabels>
)

// @ts-expect-error: acceptFieldChange takes the field's name
export const wrongLabel = <SatinLabels labels={{ acceptFieldChange: 'Accept' }}>{uncontrolled}</SatinLabels>

void wrong
void wrongStatus
