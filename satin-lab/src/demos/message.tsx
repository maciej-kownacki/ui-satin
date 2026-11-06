import * as React from 'react'
import { Message } from '@satin/ui/message'
import { Page } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const answer = 'Three deals moved to Negotiation this week. Acme is the largest at $48k, and two renewals close before Friday.'

const steps = [
  { label: 'Read the pipeline' },
  { label: 'Compared stages with last week' },
  { label: 'Summarised the changes', meta: '3 deals' },
]

export const options: ShowcaseOption[] = [
  {
    id: 'thread',
    label: 'Thread',
    code: `import { Message } from '@satin/ui/message'

<div className="flex flex-col gap-4">
  <Message role="user">What changed in the pipeline this week?</Message>
  <Message
    role="assistant"
    thinking={[
      { label: 'Read the pipeline' },
      { label: 'Compared stages with last week' },
      { label: 'Summarised the changes', meta: '3 deals' },
    ]}
    thinkingLabel="Thought for 12s"
    timestamp="20 minutes ago"
    onFeedback={(value) => rate(value)}
  >
    ${answer}
  </Message>
</div>`,
  },
  {
    id: 'user',
    label: 'User',
    code: `import { Message } from '@satin/ui/message'

<Message role="user">Who owns the Acme deal?</Message>
<Message
  role="user"
  source={{ icon: <Page />, title: 'Q3 pipeline review', url: 'docs.sature.app/q3-review' }}
>
  Summarize this thread and list the open questions.
</Message>`,
  },
  {
    id: 'assistant',
    label: 'Assistant',
    code: `import { Message } from '@satin/ui/message'

<Message role="assistant" timestamp="20 minutes ago">
  ${answer}
</Message>

// While it streams, or for a system note
<Message role="assistant" actions={false}>
  Pipeline synced from HubSpot at 09:41.
</Message>`,
  },
]

export default function MessageDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Message"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <div className="flex w-[min(400px,calc(100vw-80px))] flex-col gap-4">
          {id === 'thread' && (
            <>
              <Message role="user">What changed in the pipeline this week?</Message>
              <Message role="assistant" thinking={steps} thinkingLabel="Thought for 12s" timestamp="20 minutes ago">
                {answer}
              </Message>
            </>
          )}
          {id === 'user' && (
            <>
              <Message role="user">Who owns the Acme deal?</Message>
              <Message
                role="user"
                source={{
                  icon: <Page className="text-text-muted [stroke-width:1.875]" />,
                  title: 'Q3 pipeline review',
                  url: 'docs.sature.app/q3-review',
                }}
              >
                Summarize this thread and list the open questions.
              </Message>
            </>
          )}
          {id === 'assistant' && (
            <>
              <Message role="assistant" timestamp="20 minutes ago">
                {answer}
              </Message>
              <Message role="assistant" actions={false}>
                Pipeline synced from HubSpot at 09:41.
              </Message>
            </>
          )}
        </div>
      )}
    />
  )
}
