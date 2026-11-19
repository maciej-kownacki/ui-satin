import * as React from 'react'
import { Flash } from 'iconoir-react'
import { AgentSuggestion } from '@uisatin/ui/agent-suggestion'
import { Badge } from '@uisatin/ui/badge'
import { ReviewableChanges, type ReviewableChange } from '@uisatin/pro/agent-changes-review'
import { Showcase, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const kinds = [
  { value: 'buttons', label: 'Buttons' },
  { value: 'checkbox', label: 'Checkbox' },
]

export const controls: ShowcaseControl[] = [{ id: 'control', label: 'Control', items: kinds }]

const code = (control: string) => `import { AgentSuggestion } from '@uisatin/ui/agent-suggestion'
import { Badge } from '@uisatin/ui/badge'
import { ReviewableChanges, type ReviewableChangesValue } from '@uisatin/pro/agent-changes-review'
import { Flash } from 'iconoir-react'

// What the agent proposes, as the CRM takes it.
const proposal = { stage: 'negotiation', value: 22_000, closeDate: '2026-12-15' }

export function DealUpdate({ deal }: { deal: Deal }) {
  const [value, setValue] = React.useState<ReviewableChangesValue>({})
  return (
    <AgentSuggestion
      kind="CRM update"
      icon={<Flash />}
      meta={<Badge size="sm">HubSpot</Badge>}
      title="Update the Quanta deal"
      description="Based on today's call:"
    >
      <ReviewableChanges${control === 'checkbox' ? '\n        control="checkbox"' : ''}
        changes={[
          { id: 'stage', field: 'Stage', from: 'Proposal', to: <Badge size="sm" tone="brand">Negotiation</Badge> },
          { id: 'value', field: 'Value', from: '$18,000', to: '$22,000' },
          { id: 'closeDate', field: 'Close date', from: '30 Nov', to: '15 Dec' },
        ]}
        value={value}
        onValueChange={setValue}
        // Only the accepted fields: stage and closeDate when Value is rejected.
        onApply={(accepted) =>
          updateDeal(deal.id, Object.fromEntries(accepted.map((c) => [c.id, proposal[c.id]])))
        }
      />
    </AgentSuggestion>
  )
}`

export const options: ShowcaseOption[] = kinds.map((i) => ({ id: i.value, label: i.label, code: code(i.value) }))

type Deal = { stage: string; value: string; closeDate: string }
const DEAL: Deal = { stage: 'Proposal', value: '$18,000', closeDate: '30 Nov' }
const PROPOSAL: Deal = { stage: 'Negotiation', value: '$22,000', closeDate: '15 Dec' }

const changes: ReviewableChange[] = [
  {
    id: 'stage',
    field: 'Stage',
    from: DEAL.stage,
    to: (
      <Badge size="sm" tone="brand">
        {PROPOSAL.stage}
      </Badge>
    ),
  },
  { id: 'value', field: 'Value', from: DEAL.value, to: PROPOSAL.value },
  { id: 'closeDate', field: 'Close date', from: DEAL.closeDate, to: PROPOSAL.closeDate },
]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The Sales scenario: the agent updates a deal. Stage and Close date start accepted; reject Value
 * with its X and it slides out of the list, then Apply sends Stage and Close date.
 */
function Preview({ control }: { control: 'buttons' | 'checkbox' }) {
  return (
    <AgentSuggestion kind="CRM update" icon={<Flash />} meta={<Badge size="sm">HubSpot</Badge>} title="Update the Quanta deal" description="Based on today's call:">
      <ReviewableChanges control={control} changes={changes} defaultValue={{ stage: 'accepted', closeDate: 'accepted' }} onApply={() => wait(900)} />
    </AgentSuggestion>
  )
}

export default function AgentChangesReviewDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Reviewable changes"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      // Pinned to the top: when a rejected row leaves, the card shortens from its bottom and nothing above moves.
      align="top"
      render={(id) => (
        <div className="flex w-full justify-center">
          <Preview key={id} control={id as 'buttons' | 'checkbox'} />
        </div>
      )}
    />
  )
}
