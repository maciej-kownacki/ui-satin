import * as React from 'react'
import { MessageActions, type MessageFeedback } from '@satin/ui/message-actions'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const answer = 'Three deals moved to Negotiation this week. Acme is the largest at $48k, and two renewals close before Friday.'

// Content first: the timestamp (with its status) and Share are what the row carries.
// Delivery status and the pressed thumb are states, last. No "All" for feedback: it's one
// row you can click, so the thumbs stay live on the stage.
export const controls: ShowcaseControl[] = [
  { id: 'timestamp', label: 'Timestamp', type: 'switch', default: 'on' },
  { id: 'share', label: 'Share', type: 'switch', default: 'on' },
  { id: 'status', label: 'Status', items: [{ value: 'delivered', label: 'Delivered' }, { value: 'sending', label: 'Sending' }] },
  {
    id: 'feedback',
    label: 'Feedback',
    items: [{ value: 'none', label: 'None' }, { value: 'like', label: 'Like' }, { value: 'dislike', label: 'Dislike' }],
  },
]

function code(v: Record<string, string>) {
  const timestamp = v.timestamp === 'on'
  const attrs = [
    timestamp && 'timestamp="20 minutes ago"',
    timestamp && v.status === 'sending' && 'status="sending"',
    v.feedback !== 'none' && `feedback="${v.feedback}"`,
    v.share === 'off' && 'showShare={false}',
    'onFeedback={(value) => rate(value)}',
    'onCopy={() => copy(answer)}',
    v.share === 'on' && 'onShare={() => share(answer)}',
  ].filter(Boolean)
  return `import { MessageActions } from '@satin/ui/message-actions'

<div className="flex flex-col gap-2">
  <p>${answer}</p>
  <MessageActions
${attrs.map((a) => `    ${a}`).join('\n')}
  />
</div>`
}

const title = (s: string) => s[0].toUpperCase() + s.slice(1)

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    v.timestamp === 'on' ? 'Timestamp' : 'No timestamp',
    v.share === 'on' ? 'Share' : 'No share',
    title(v.status),
    v.feedback === 'none' ? 'No feedback' : title(v.feedback),
  ].join(' · '),
  code: code(v),
}))

function Demo({ v }: { v: Record<string, string> }) {
  const [note, setNote] = React.useState('')
  return (
    <div className="flex w-[min(520px,calc(100vw-80px))] flex-col gap-2">
      <p className="text-body text-text-default">{answer}</p>
      <MessageActions
        timestamp={v.timestamp === 'on' ? '20 minutes ago' : undefined}
        status={v.status as 'delivered' | 'sending'}
        feedback={v.feedback === 'none' ? null : (v.feedback as MessageFeedback)}
        showShare={v.share === 'on'}
        onFeedback={(f: MessageFeedback) => setNote(f ? `Marked as ${f === 'like' ? 'good' : 'bad'}.` : 'Feedback cleared.')}
        onCopy={() => {
          void navigator.clipboard?.writeText(answer)
          setNote('Copied.')
        }}
        onShare={() => setNote('Share link ready.')}
      />
      <p aria-live="polite" className="min-h-5 text-sm text-text-subtle">
        {note}
      </p>
    </div>
  )
}

export default function MessageActionsDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Message actions"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      // Keyed so a thumb clicked on the stage resets when the controls change.
      render={(id, v) => <Demo key={id} v={v} />}
    />
  )
}
