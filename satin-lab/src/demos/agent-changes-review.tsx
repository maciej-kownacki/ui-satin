import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { ReviewableChanges, type ReviewableChange } from '@uisatin/pro/agent-changes-review'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Title and Source are the parts a step can go without, as on DecisionCard's page.
export const controls: ShowcaseControl[] = [
  { id: 'title', label: 'Title', type: 'switch', default: 'on' },
  { id: 'source', label: 'Source', type: 'switch', default: 'on' },
]

const QUOTES = {
  stage: 'We’re ready to talk terms. Send the contract over.',
  value: 'We can go to $22k if onboarding is included.',
  closeDate: 'Let’s aim to sign by mid-December.',
}

function code(v: Record<string, string>) {
  const source = (id: keyof typeof QUOTES) =>
    v.source === 'on' ? `\n      // The line from the call that justifies it.\n      source: { icon: <MeetLogo />, label: 'Transcription', quote: '${QUOTES[id]}' },` : ''
  return `import * as React from 'react'
import { ReviewableChanges, type ReviewableChangesValue } from '@uisatin/pro/agent-changes-review'

// What the agent proposes, as the CRM takes it.
const proposal = { stage: 'negotiation', value: 22_000, closeDate: '2026-12-15' }

export function DealUpdate({ deal, recordRef }: { deal: Deal; recordRef: React.RefObject<HTMLElement> }) {
  const [value, setValue] = React.useState<ReviewableChangesValue>({})
  const [open, setOpen] = React.useState(true)
  if (!open) return null
  return (
    <ReviewableChanges${v.title === 'on' ? `\n      title="Update the Quanta deal"\n      description="Based on today's call"` : ''}
      changes={[
        {
          id: 'stage',
          field: 'Stage',
          from: 'Proposal',
          to: 'Negotiation',${source('stage')}
        },
        {
          id: 'value',
          field: 'Value',
          from: '$18,000',
          to: '$22,000',${source('value')}
        },
        {
          id: 'closeDate',
          field: 'Close date',
          from: '30 Nov',
          to: '15 Dec',${source('closeDate')}
        },
      ]}
      value={value}
      onValueChange={setValue}
      // Only the accepted fields: stage and closeDate when Value is dismissed.
      onApply={(accepted) =>
        updateDeal(deal.id, Object.fromEntries(accepted.map((c) => [c.id, proposal[c.id]])))
      }
      // Once applied, the card fades out; then it's yours to remove.
      onApplied={() => setOpen(false)}
      // Focus goes to the deal it updated; without this, to the page ("2 changes applied" is read out).
      returnFocus={() => recordRef.current}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.title === 'on' ? 'Title' : 'No title', v.source === 'on' ? 'Source' : 'No source'].join(' · '),
  code: code(v),
}))

type Deal = { stage: string; value: string; closeDate: string }
const DEAL: Deal = { stage: 'Proposal', value: '$18,000', closeDate: '30 Nov' }
const PROPOSAL: Deal = { stage: 'Negotiation', value: '$22,000', closeDate: '15 Dec' }

// Real favicon for the demo; in an app pass the logo you already have.
const MeetLogo = () => <img alt="" src="https://www.google.com/s2/favicons?domain=meet.google.com&sz=32" />

// Each change quotes the line from the call that justifies it.
const fromCall = (quote: string) => ({ icon: <MeetLogo />, label: 'Transcription', quote })

const changesWith = (source: boolean): ReviewableChange[] =>
  (['stage', 'value', 'closeDate'] as const).map((id) => ({
    id,
    field: { stage: 'Stage', value: 'Value', closeDate: 'Close date' }[id],
    from: DEAL[id],
    to: PROPOSAL[id],
    source: source ? fromCall(QUOTES[id]) : undefined,
  }))

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The Sales scenario: the agent updates a deal. Accept or dismiss each change and the next one
 * slides in; the last decision takes focus to Apply, which sends the accepted ones and the card
 * leaves. A quiet button brings it back, so the stage isn't left empty.
 */
function Preview({ v }: { v: Record<string, string> }) {
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
    <ReviewableChanges
      key={round}
      title={v.title === 'on' ? 'Update the Quanta deal' : undefined}
      description={v.title === 'on' ? "Based on today's call" : undefined}
      changes={changesWith(v.source === 'on')}
      onApply={() => wait(900)}
      onApplied={() => {
        applied.current = true
        setOpen(false)
      }}
    />
  )
}

export default function AgentChangesReviewDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Reviewable changes"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      // Pinned to the top, as DecisionCard's: a taller or shorter change never moves the header.
      align="top"
      render={(id, v) => (
        <div className="flex w-full justify-center">
          <Preview key={id} v={v} />
        </div>
      )}
    />
  )
}
