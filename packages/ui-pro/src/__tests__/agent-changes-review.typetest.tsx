/* Type test, never run: ReviewableChanges' props, its ref, and its words in SatinLabels. */
import * as React from 'react'
import { type AgentSuggestionChange } from '@uisatin/ui/agent-suggestion'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  ReviewableChanges,
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

// @ts-expect-error: applied isn't a stage; the card leaves (onApplied)
const wrongStatus: ReviewableChangesStatus = 'applied'

const rootRef = React.createRef<HTMLDivElement>()

export function Controlled() {
  const [value, setValue] = React.useState<ReviewableChangesValue>({ value: 'rejected' })
  return (
    <ReviewableChanges
      ref={rootRef}
      title="Update the Quanta deal"
      description="Based on today's call"
      changes={changes}
      value={value}
      onValueChange={setValue}
      defaultStep={1}
      onApply={async (accepted, decisions) => {
        const fields: ReviewableChange[] = accepted
        void fields
        void decisions.value
      }}
      onApplied={(accepted, decisions) => {
        void accepted.length
        void decisions
      }}
      returnFocus={() => document.getElementById('deal')}
      status="review"
      aria-describedby="hint"
    />
  )
}

export const uncontrolled = <ReviewableChanges changes={plain} defaultValue={{ '0': 'accepted' }} onApply={() => {}} />

// @ts-expect-error: changes is required
export const missing = <ReviewableChanges onApply={() => {}} />

// @ts-expect-error: the title is text, as DecisionCard's is
export const richTitle = <ReviewableChanges changes={plain} title={<b>Deal</b>} />

// @ts-expect-error: the body is the changes; there are no children
export const withChildren = <ReviewableChanges changes={plain}>Hi</ReviewableChanges>

// The words join SatinLabels, functions where they carry data.
export const labels = (
  <SatinLabels
    labels={{
      acceptFieldChange: (field) => `Zaakceptuj zmianę: ${field}`,
      acceptFieldChangeText: 'Akceptuj',
      skipFieldChange: (field) => `Pomiń zmianę: ${field}`,
      fieldChangeAccepted: 'Zaakceptowano',
      fieldChangeSkipped: 'Pominięto',
      previousFieldChange: 'Poprzednia zmiana',
      nextFieldChange: 'Następna zmiana',
      fieldChangesApplied: (count, number) => `Zastosowano: ${number}`,
    }}
  >
    {uncontrolled}
  </SatinLabels>
)

// @ts-expect-error: acceptFieldChange takes the field's name
export const wrongLabel = <SatinLabels labels={{ acceptFieldChange: 'Accept' }}>{uncontrolled}</SatinLabels>

void wrong
void wrongStatus
