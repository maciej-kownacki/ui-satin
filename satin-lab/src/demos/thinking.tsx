import * as React from 'react'
import { Thinking } from '@satin/ui'
import { Search, Page, EditPencil, Play } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

export const options: ShowcaseOption[] = [
  {
    id: 'loading',
    label: 'Loading',
    code: `import { Thinking } from '@satin/ui/thinking'

<Thinking state="loading" elapsed="1.2s" />`,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    code: `import { Thinking } from '@satin/ui/thinking'

<Thinking
  label="Thought for 2m 45s"
  defaultOpen
  steps={[
    { type: 'task', label: 'Read client order' },
    { type: 'task', label: 'Informed the kitchen' },
    { type: 'task', label: 'Ordered missing ingredients', meta: '2kg onions' },
  ]}
/>`,
  },
  {
    id: 'reasoning',
    label: 'Reasoning',
    code: `import { Thinking } from '@satin/ui/thinking'

<Thinking
  label="Thought for 12s"
  defaultOpen
  steps={[
    { type: 'text', text: 'The order asks for 40 portions; stock covers 32.' },
    { type: 'text', text: 'Ordering 2kg of onions closes the gap before service.' },
  ]}
/>`,
  },
  {
    id: 'tools',
    label: 'Dev tools',
    code: `import { Thinking } from '@satin/ui/thinking'
import { Search, Page, EditPencil, Play } from 'iconoir-react'

<Thinking
  label="Ran 4 tools"
  defaultOpen
  steps={[
    { type: 'tool', icon: <Search />, label: 'Grep', detail: '"refreshSession" in src/', meta: '3 files' },
    { type: 'tool', icon: <Page />, label: 'Read', detail: 'src/auth/session.ts' },
    { type: 'tool', icon: <EditPencil />, label: 'Edit', detail: 'src/auth/session.ts', meta: '+6 −2' },
    { type: 'tool', icon: <Play />, label: 'Bash', detail: 'npm test -- src/auth', meta: '14 passed' },
  ]}
/>`,
  },
]

/** A running timer, so the loading state reads as live. */
function Loading() {
  const [ms, setMs] = React.useState(0)
  React.useEffect(() => {
    const start = performance.now()
    const id = setInterval(() => setMs(performance.now() - start), 100)
    return () => clearInterval(id)
  }, [])
  return <Thinking state="loading" elapsed={`${(ms / 1000).toFixed(1)}s`} />
}

export default function ThinkingDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Thinking"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <div className="w-[min(420px,calc(100vw-80px))]">
          {id === 'loading' && <Loading />}
          {id === 'tasks' && (
            <Thinking
              label="Thought for 2m 45s"
              defaultOpen
              steps={[
                { type: 'task', label: 'Read client order' },
                { type: 'task', label: 'Informed the kitchen' },
                { type: 'task', label: 'Ordered missing ingredients', meta: '2kg onions' },
              ]}
            />
          )}
          {id === 'reasoning' && (
            <Thinking
              label="Thought for 12s"
              defaultOpen
              steps={[
                { type: 'text', text: 'The order asks for 40 portions; stock covers 32.' },
                { type: 'text', text: 'Ordering 2kg of onions closes the gap before service.' },
              ]}
            />
          )}
          {id === 'tools' && (
            <Thinking
              label="Ran 4 tools"
              defaultOpen
              steps={[
                { type: 'tool', icon: <Search />, label: 'Grep', detail: '"refreshSession" in src/', meta: '3 files' },
                { type: 'tool', icon: <Page />, label: 'Read', detail: 'src/auth/session.ts' },
                { type: 'tool', icon: <EditPencil />, label: 'Edit', detail: 'src/auth/session.ts', meta: '+6 −2' },
                { type: 'tool', icon: <Play />, label: 'Bash', detail: 'npm test -- src/auth', meta: '14 passed' },
              ]}
            />
          )}
        </div>
      )}
    />
  )
}
