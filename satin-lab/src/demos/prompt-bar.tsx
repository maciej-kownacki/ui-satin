import * as React from 'react'
import { PromptBar } from '@satin/ui'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const code = (shape: 'rectangle' | 'rounded') => `import { PromptBar } from '@satin/ui/prompt-bar'

<PromptBar
  shape="${shape}"
  model="Sonnet"
  onSubmit={(message) => send(message)}
/>`

export const options: ShowcaseOption[] = [
  { id: 'rectangle', label: 'Rectangle', code: code('rectangle') },
  { id: 'rounded', label: 'Rounded', code: code('rounded') },
]

function Demo({ shape }: { shape: 'rectangle' | 'rounded' }) {
  const [sent, setSent] = React.useState<string | null>(null)
  return (
    <div className="grid w-[min(520px,calc(100vw-80px))] gap-3">
      <p aria-live="polite" className="min-h-5 text-center text-sm text-text-muted">
        {sent ? `Sent: “${sent}”` : 'Type a message and press Enter.'}
      </p>
      <PromptBar shape={shape} model="Sonnet" onSubmit={setSent} />
    </div>
  )
}

export default function PromptBarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Prompt bar"
      options={options}
      codeHtml={codeHtml}
      render={(id) => <Demo key={id} shape={id as 'rectangle' | 'rounded'} />}
    />
  )
}
