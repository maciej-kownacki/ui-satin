import { AgentSuggestion } from '@uisatin/ui/agent-suggestion'
import { Badge } from '@uisatin/ui/badge'
import { ReviewableChanges, type ReviewableChange, type ReviewableChangesStatus } from '@uisatin/pro/agent-changes-review'

/**
 * Every ReviewableChanges state: cards pending, accepted and rejected, the whole set in review,
 * applying and applied, with buttons and with checkboxes. Applying is held with `status`.
 */
const changes: ReviewableChange[] = [
  { id: 'stage', field: 'Stage', from: 'Proposal', to: <Badge size="sm" tone="brand">Negotiation</Badge> },
  { id: 'value', field: 'Value', from: '$18,000', to: '$22,000' },
  { id: 'close', field: 'Close date', from: '30 Nov', to: '15 Dec' },
  { id: 'owner', field: 'Owner', to: 'Tara Mendes' },
]
const decisions = { stage: 'accepted', value: 'rejected', close: 'accepted' } as const
const statuses: ReviewableChangesStatus[] = ['review', 'applying', 'applied']
const controls = ['buttons', 'checkbox'] as const

export function ReviewableChangesGrid() {
  return (
    <div className="inline-grid grid-cols-[80px_repeat(3,400px)] items-start gap-x-8 gap-y-8 p-8 text-xs text-text-muted">
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
