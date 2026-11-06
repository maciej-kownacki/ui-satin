import * as React from 'react'
import { MessageActions, type MessageFeedback } from '@satin/ui/message-actions'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

export const options: ShowcaseOption[] = [
  {
    id: 'default',
    label: 'Default',
    code: `import { MessageActions } from '@satin/ui/message-actions'

<div className="flex flex-col gap-2">
  <p>Three deals moved to Negotiation this week. Acme is the largest at $48k.</p>
  <MessageActions
    timestamp="20 minutes ago"
    onFeedback={(value) => rate(value)}
    onCopy={() => copy(answer)}
    onShare={() => share(answer)}
  />
</div>`,
  },
  {
    id: 'feedback',
    label: 'Feedback',
    code: `import { MessageActions } from '@satin/ui/message-actions'

<MessageActions timestamp="20 minutes ago" />
<MessageActions timestamp="20 minutes ago" feedback="like" />
<MessageActions timestamp="20 minutes ago" feedback="dislike" />`,
  },
  {
    id: 'compact',
    label: 'Compact',
    code: `import { MessageActions } from '@satin/ui/message-actions'

// Without share, in private threads
<MessageActions timestamp="20 minutes ago" showShare={false} />

// Without metadata, when the thread header shows status and time
<MessageActions showShare={false} />`,
  },
]

function Default() {
  const [note, setNote] = React.useState('')
  const answer = 'Three deals moved to Negotiation this week. Acme is the largest at $48k, and two renewals close before Friday.'
  return (
    <div className="flex w-[min(520px,calc(100vw-80px))] flex-col gap-2">
      <p className="text-sm text-text-default">{answer}</p>
      <MessageActions
        timestamp="20 minutes ago"
        onFeedback={(v: MessageFeedback) => setNote(v ? `Marked as ${v === 'like' ? 'good' : 'bad'}.` : 'Feedback cleared.')}
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
      render={(id) => (
        <>
          {id === 'default' && <Default />}
          {id === 'feedback' && (
            <div className="flex flex-col gap-4">
              <MessageActions timestamp="20 minutes ago" />
              <MessageActions timestamp="20 minutes ago" feedback="like" />
              <MessageActions timestamp="20 minutes ago" feedback="dislike" />
            </div>
          )}
          {id === 'compact' && (
            <div className="flex flex-col items-center gap-4">
              <MessageActions timestamp="20 minutes ago" showShare={false} />
              <MessageActions showShare={false} />
            </div>
          )}
        </>
      )}
    />
  )
}
