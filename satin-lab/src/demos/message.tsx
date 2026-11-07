import * as React from 'react'
import { Message } from '@satin/ui/message'
import { Page } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const question = 'What changed in the pipeline this week?'
const answer = 'Three deals moved to Negotiation this week. Acme is the largest at $48k, and two renewals close before Friday.'

const steps = [
  { label: 'Read the pipeline' },
  { label: 'Compared stages with last week' },
  { label: 'Summarised the changes', meta: '3 deals' },
]

// Role picks the message; "All roles" shows a user turn and its answer. Source belongs to the
// user's message, thinking and actions to the assistant's, so each switch shows where it applies.
export const controls: ShowcaseControl[] = [
  {
    id: 'role',
    label: 'Role',
    items: [
      { value: 'all', label: 'All roles' },
      { value: 'user', label: 'User' },
      { value: 'assistant', label: 'Assistant' },
    ],
  },
  { id: 'thinking', label: 'Thinking', type: 'switch', default: 'on' },
  { id: 'source', label: 'Source', type: 'switch', default: 'off' },
  { id: 'actions', label: 'Actions', type: 'switch', default: 'on' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function userCode(v: Record<string, string>, indent = '') {
  if (v.source === 'off') return `${indent}<Message role="user">${question}</Message>`
  return `<Message
  role="user"
  source={{ icon: <Page />, title: 'Q3 pipeline review', url: 'docs.sature.app/q3-review' }}
>
  ${question}
</Message>`
    .split('\n')
    .map((l) => indent + l)
    .join('\n')
}

function assistantCode(v: Record<string, string>, indent = '') {
  const props = [
    v.thinking === 'on' &&
      `thinking={[\n${steps
        .map((s) => `    { label: '${s.label}'${s.meta ? `, meta: '${s.meta}'` : ''} },`)
        .join('\n')}\n  ]}`,
    v.thinking === 'on' && 'thinkingLabel="Thought for 12s"',
    v.actions === 'on' ? 'timestamp="20 minutes ago"' : 'actions={false}',
    v.actions === 'on' && 'onFeedback={(value) => rate(value)}',
  ].filter(Boolean)
  const open = props.length > 1 ? `<Message\n${props.map((p) => `  ${p}`).join('\n')}\n>` : `<Message ${props[0]}>`
  return `${open}\n  ${answer}\n</Message>`
    .split('\n')
    .map((l) => indent + l)
    .join('\n')
}

function code(v: Record<string, string>) {
  const imports = `import { Message } from '@satin/ui/message'\n${v.role !== 'assistant' && v.source === 'on' ? "import { Page } from 'iconoir-react'\n" : ''}`
  if (v.role === 'user') return `${imports}\n${userCode(v)}`
  if (v.role === 'assistant') return `${imports}\n${assistantCode(v)}`
  return `${imports}
<div className="flex flex-col gap-4">
${userCode(v, '  ')}
${assistantCode(v, '  ')}
</div>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('role', v.role),
    v.thinking === 'on' ? 'Thinking' : 'No thinking',
    v.source === 'on' ? 'Source' : 'No source',
    v.actions === 'on' ? 'Actions' : 'No actions',
  ].join(' · '),
  code: code(v),
}))

export default function MessageDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Message"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="flex w-[min(400px,calc(100vw-80px))] flex-col gap-4">
          {v.role !== 'assistant' && (
            <Message
              role="user"
              source={
                v.source === 'on'
                  ? {
                      icon: <Page className="text-text-muted [stroke-width:1.875]" />,
                      title: 'Q3 pipeline review',
                      url: 'docs.sature.app/q3-review',
                    }
                  : undefined
              }
            >
              {question}
            </Message>
          )}
          {v.role !== 'user' && (
            <Message
              role="assistant"
              thinking={v.thinking === 'on' ? steps : undefined}
              thinkingLabel="Thought for 12s"
              actions={v.actions === 'on'}
              timestamp="20 minutes ago"
            >
              {answer}
            </Message>
          )}
        </div>
      )}
    />
  )
}
