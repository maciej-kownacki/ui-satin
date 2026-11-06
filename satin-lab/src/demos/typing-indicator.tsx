import * as React from 'react'
import { TypingIndicator } from '@satin/ui/typing-indicator'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

export const options: ShowcaseOption[] = [
  {
    id: 'avatar',
    label: 'With avatar',
    code: `import { TypingIndicator } from '@satin/ui/typing-indicator'

<TypingIndicator showAvatar initials="AT" label="Atlas is typing…" />`,
  },
  {
    id: 'tone',
    label: 'Tone',
    code: `import { TypingIndicator } from '@satin/ui/typing-indicator'

<TypingIndicator tone="fuchsia" />
<TypingIndicator tone="sky" />
<TypingIndicator tone="plum" />
<TypingIndicator tone="green" />`,
  },
  {
    id: 'label',
    label: 'With label',
    code: `import { TypingIndicator } from '@satin/ui/typing-indicator'

<TypingIndicator label="Agent is typing…" />`,
  },
]

export default function TypingIndicatorDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Typing indicator"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <>
          {id === 'avatar' && <TypingIndicator showAvatar initials="AT" label="Atlas is typing…" />}
          {id === 'tone' && (
            <div className="flex items-center gap-8">
              <TypingIndicator tone="fuchsia" />
              <TypingIndicator tone="sky" />
              <TypingIndicator tone="plum" />
              <TypingIndicator tone="green" />
            </div>
          )}
          {id === 'label' && <TypingIndicator label="Agent is typing…" />}
        </>
      )}
    />
  )
}
