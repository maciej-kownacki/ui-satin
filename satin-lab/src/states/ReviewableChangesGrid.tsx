import { Badge } from '@uisatin/ui/badge'
import {
  ReviewableChanges,
  type ReviewableChange,
  type ReviewableChangesStatus,
  type ReviewableChangesValue,
} from '@uisatin/pro/agent-changes-review'

/**
 * Every ReviewableChanges state: a change pending, accepted and dismissed, the set applying, with a
 * title and without one (each field is the title then). Applying is held with `status`. Once
 * applied the card leaves, so there is no applied state to show.
 */
const changes: ReviewableChange[] = [
  {
    id: 'stage',
    field: 'Stage',
    label: 'Stage',
    from: 'Proposal',
    to: <Badge size="sm" tone="brand">Negotiation</Badge>,
    source: { label: 'Transcription', quote: 'We’re ready to talk terms. Send the contract over.' },
  },
  { id: 'value', field: 'Value', from: '$18,000', to: '$22,000', source: { label: 'Transcription', quote: 'We can go to $22k if onboarding is included.' } },
  { id: 'owner', field: 'Owner', to: 'Tara Mendes', source: { label: 'Transcription', quote: 'Tara will take it from here.' } },
]

const columns: { name: string; value: ReviewableChangesValue; status?: ReviewableChangesStatus }[] = [
  { name: 'pending', value: {} },
  { name: 'accepted', value: { stage: 'accepted' } },
  { name: 'dismissed', value: { stage: 'rejected', value: 'accepted' } },
  { name: 'applying', value: { stage: 'accepted', value: 'accepted' }, status: 'applying' },
]
const rows = ['title', 'no title'] as const

export function ReviewableChangesGrid() {
  return (
    <div className="inline-grid grid-cols-[80px_repeat(4,364px)] items-start gap-x-8 gap-y-8 p-8 text-xs text-text-muted">
      <span />
      {columns.map((c) => (
        <span key={c.name} className="text-text-default">{c.name}</span>
      ))}
      {rows.map((row) => (
        <div key={row} className="contents">
          <span className="text-sm text-text-default">{row}</span>
          {columns.map((c) => (
            <ReviewableChanges
              key={c.name}
              title={row === 'title' ? 'Update the Quanta deal' : undefined}
              description={row === 'title' ? "Based on today's call" : undefined}
              changes={changes}
              defaultValue={c.value}
              status={c.status}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
