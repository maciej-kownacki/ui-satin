import * as React from 'react'
import { Flash } from 'iconoir-react'
import { AgentSuggestion } from '@uisatin/ui/agent-suggestion'
import { Badge } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
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

/** The deal as the CRM holds it: only what was accepted changes on Apply. */
function DealRecord({ deal, updated, onReset }: { deal: Deal; updated: boolean; onReset: () => void }) {
  const rows: [string, React.ReactNode][] = [
    ['Stage', deal.stage === DEAL.stage ? deal.stage : <Badge size="sm" tone="brand">{deal.stage}</Badge>],
    ['Value', deal.value],
    ['Close date', deal.closeDate],
  ]
  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3 rounded-xl border border-border-subtle bg-bg-card p-3 md:w-[200px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-medium text-text-default">Quanta</span>
        <span className="text-sm text-text-muted">Deal</span>
      </div>
      <dl className="m-0 flex flex-col gap-2 text-base">
        {rows.map(([field, value]) => (
          <div key={field} className="flex min-h-[21px] items-center justify-between gap-2">
            <dt className="text-text-muted">{field}</dt>
            <dd className="m-0 text-text-default">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex min-h-6 items-center justify-between gap-2 text-sm text-text-muted">
        {updated ? (
          <>
            <span>Updated just now</span>
            <Button variant="tertiary" size="xs" onClick={onReset}>
              Start over
            </Button>
          </>
        ) : (
          <span>Updated 3 days ago</span>
        )}
      </div>
    </div>
  )
}

/** The Sales scenario: the agent updates a deal; Stage and Close date are accepted, Value is rejected. */
function Preview({ control, onReset }: { control: 'buttons' | 'checkbox'; onReset: () => void }) {
  const [deal, setDeal] = React.useState(DEAL)
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 md:flex-row md:items-start">
      <AgentSuggestion kind="CRM update" icon={<Flash />} meta={<Badge size="sm">HubSpot</Badge>} title="Update the Quanta deal" description="Based on today's call:">
        <ReviewableChanges
          control={control}
          changes={changes}
          defaultValue={{ stage: 'accepted', value: 'rejected', closeDate: 'accepted' }}
          onApply={async (accepted) => {
            await wait(900)
            setDeal((d) => ({ ...d, ...Object.fromEntries(accepted.map((c) => [c.id, PROPOSAL[c.id as keyof Deal]])) }))
          }}
        />
      </AgentSuggestion>
      <DealRecord deal={deal} updated={deal !== DEAL} onReset={onReset} />
    </div>
  )
}

export default function AgentChangesReviewDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  const [round, setRound] = React.useState(0)
  return (
    <Showcase
      name="Reviewable changes"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id) => <Preview key={`${id}-${round}`} control={id as 'buttons' | 'checkbox'} onReset={() => setRound((r) => r + 1)} />}
    />
  )
}
