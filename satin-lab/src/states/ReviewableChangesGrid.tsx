import { AgentSuggestion } from '@uisatin/ui/agent-suggestion'
import { Badge } from '@uisatin/ui/badge'
import { ReviewableChanges, type ReviewableChange, type ReviewableChangesStatus } from '@uisatin/pro/agent-changes-review'

/**
 * Every ReviewableChanges state: cards pending, accepted and rejected, the whole set in review and
 * applying, with buttons and with checkboxes. Applying is held with `status`. Once applied the
 * suggestion leaves, so there is no applied state to show.
 */
const changes: ReviewableChange[] = [
  {
    id: 'stage',
    field: 'Stage',
    from: 'Proposal',
    to: <Badge size="sm" tone="brand">Negotiation</Badge>,
    source: { label: 'Transcription', quote: 'We’re ready to talk terms. Send the contract over.' },
  },
  { id: 'value', field: 'Value', from: '$18,000', to: '$22,000', source: { label: 'Transcription', quote: 'We can go to $22k if onboarding is included.' } },
  { id: 'close', field: 'Close date', from: '30 Nov', to: '15 Dec', source: { label: 'Transcription', quote: 'Let’s aim to sign by mid-December.' } },
  { id: 'owner', field: 'Owner', to: 'Tara Mendes', source: { label: 'Transcription', quote: 'Tara will take it from here.' } },
]
const decisions = { stage: 'accepted', value: 'rejected', close: 'accepted' } as const
const statuses: ReviewableChangesStatus[] = ['review', 'applying']
const controls = ['buttons', 'checkbox'] as const

export function ReviewableChangesGrid() {
  return (
    <div className="inline-grid grid-cols-[80px_repeat(2,400px)] items-start gap-x-8 gap-y-8 p-8 text-xs text-text-muted">
      <span />
      {statuses.map((s) => (
        <span key={s} className="text-text-default">{s}</span>
      ))}
      {controls.map((control) => (
        <div key={control} className="contents">
          <span className="text-sm text-text-default">{control}</span>
          {statuses.map((status) => (
            <AgentSuggestion key={status} kind="CRM update" title="Update the Quanta deal">
              <ReviewableChanges changes={changes} control={control} defaultValue={decisions} status={status} />
            </AgentSuggestion>
          ))}
        </div>
      ))}
    </div>
  )
}
