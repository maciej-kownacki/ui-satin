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

export function DealUpdate({ deal, recordRef }: { deal: Deal; recordRef: React.RefObject<HTMLElement> }) {
  const [value, setValue] = React.useState<ReviewableChangesValue>({})
  const [open, setOpen] = React.useState(true)
  if (!open) return null
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
          {
            id: 'stage',
            field: 'Stage',
            from: 'Proposal',
            to: 'Negotiation',
            // The line from the call that justifies it, shown under the change.
            source: { icon: <MeetLogo />, label: 'Transcription', quote: 'We’re ready to talk terms. Send the contract over.' },
          },
          {
            id: 'value',
            field: 'Value',
            from: '$18,000',
            to: '$22,000',
            source: { icon: <MeetLogo />, label: 'Transcription', quote: 'We can go to $22k if onboarding is included.' },
          },
          {
            id: 'closeDate',
            field: 'Close date',
            from: '30 Nov',
            to: '15 Dec',
            source: { icon: <MeetLogo />, label: 'Transcription', quote: 'Let’s aim to sign by mid-December.' },
          },
        ]}
        value={value}
        onValueChange={setValue}
        // Only the accepted fields: stage and closeDate when Value is rejected.
        onApply={(accepted) =>
          updateDeal(deal.id, Object.fromEntries(accepted.map((c) => [c.id, proposal[c.id]])))
        }
        // Once applied, the suggestion fades out; then it's yours to remove.
        onApplied={() => setOpen(false)}
        // Focus goes to the deal it updated; without this, to the page ("2 changes applied" is read out).
        returnFocus={() => recordRef.current}
      />
    </AgentSuggestion>
  )
}`

export const options: ShowcaseOption[] = kinds.map((i) => ({ id: i.value, label: i.label, code: code(i.value) }))

type Deal = { stage: string; value: string; closeDate: string }
const DEAL: Deal = { stage: 'Proposal', value: '$18,000', closeDate: '30 Nov' }
const PROPOSAL: Deal = { stage: 'Negotiation', value: '$22,000', closeDate: '15 Dec' }

// Real favicon for the demo; in an app pass the logo you already have.
const MeetLogo = () => <img alt="" src="https://www.google.com/s2/favicons?domain=meet.google.com&sz=32" />

// Each change quotes the line from the call that justifies it.
const fromCall = (quote: string) => ({ icon: <MeetLogo />, label: 'Transcription', quote })

const changes: ReviewableChange[] = [
  { id: 'stage', field: 'Stage', from: DEAL.stage, to: PROPOSAL.stage, source: fromCall('We’re ready to talk terms. Send the contract over.') },
  { id: 'value', field: 'Value', from: DEAL.value, to: PROPOSAL.value, source: fromCall('We can go to $22k if onboarding is included.') },
  { id: 'closeDate', field: 'Close date', from: DEAL.closeDate, to: PROPOSAL.closeDate, source: fromCall('Let’s aim to sign by mid-December.') },
]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The Sales scenario: the agent updates a deal. Stage and Close date start accepted; reject Value
 * with its X and its card slides out of the list, then Apply sends Stage and Close date and the
 * suggestion leaves. A quiet button brings it back, so the stage isn't left empty.
 */
function Preview({ control }: { control: 'buttons' | 'checkbox' }) {
  const [round, setRound] = React.useState(0)
  const [open, setOpen] = React.useState(true)
  const again = React.useRef<HTMLButtonElement>(null)
  const applied = React.useRef(false)
  // After Apply, focus lands on the way back (the component sent it to the page while it left).
  React.useEffect(() => {
    if (!open && applied.current) again.current?.focus()
  }, [open])
  if (!open)
    return (
      <Button
        ref={again}
        variant="tertiary"
        className="mt-16"
        onClick={() => {
          applied.current = false
          setRound((r) => r + 1)
          setOpen(true)
        }}
      >
        Show the suggestion again
      </Button>
    )
  return (
    <AgentSuggestion key={round} kind="CRM update" icon={<Flash />} meta={<Badge size="sm">HubSpot</Badge>} title="Update the Quanta deal" description="Based on today's call:">
      <ReviewableChanges
        control={control}
        changes={changes}
        defaultValue={{ stage: 'accepted', closeDate: 'accepted' }}
        onApply={() => wait(900)}
        onApplied={() => {
          applied.current = true
          setOpen(false)
        }}
      />
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
      // Pinned to the top: when a dismissed card leaves, the panel shortens from its bottom and nothing above moves.
      align="top"
      render={(id) => (
        <div className="flex w-full justify-center">
          <Preview key={id} control={id as 'buttons' | 'checkbox'} />
        </div>
      )}
    />
  )
}
