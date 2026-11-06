import * as React from 'react'
import { Thinking, type ThinkingStep } from '@satin/ui/thinking'
import { Globe } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const tasks: ThinkingStep[] = [
  { label: 'Read client order' },
  { label: 'Informed the kitchen' },
  { label: 'Ordered missing ingredients', meta: '2kg onions, 1kg leeks, 6 lemons' },
]

const stepTypes: ThinkingStep[] = [
  { type: 'task', label: 'Read client order', meta: '40 portions for Friday' },
  { type: 'text', text: 'Stock covers 32 portions, so the kitchen needs onions and leeks before service.' },
  {
    type: 'source',
    icon: <Globe className="text-text-muted [stroke-width:1.875]" />,
    label: 'Supplier price list',
    meta: 'freshfarm.example/prices',
  },
  { type: 'tool', label: 'Edit', target: 'orders/friday.csv', added: '+6', removed: '−2' },
  { type: 'more', label: '+5 more' },
]

const toolSteps: ThinkingStep[] = [
  { type: 'tool', label: 'Edit', target: 'src/auth/session.ts', added: '+6', removed: '−2' },
  { type: 'tool', label: 'Edit', target: 'src/auth/refresh.test.ts', added: '+24', removed: '−0' },
]

const longRun: ThinkingStep[] = [
  { label: 'Read client order' },
  { label: 'Informed the kitchen' },
  { type: 'more', label: '+5 more' },
]

export const options: ShowcaseOption[] = [
  {
    id: 'loading',
    label: 'Loading',
    code: `import { Thinking } from '@satin/ui/thinking'

<Thinking state="loading" label="Thinking…" time="1.2s" />`,
  },
  {
    id: 'tasks',
    label: 'Expanded',
    code: `import { Thinking } from '@satin/ui/thinking'

<Thinking
  state="expanded"
  label="Thought for 2m 45s"
  steps={[
    { label: 'Read client order' },
    { label: 'Informed the kitchen' },
    { label: 'Ordered missing ingredients', meta: '2kg onions, 1kg leeks, 6 lemons' },
  ]}
/>`,
  },
  {
    id: 'types',
    label: 'Step types',
    code: `import { Thinking } from '@satin/ui/thinking'

<Thinking
  state="expanded"
  label="Thought for 2m 45s"
  steps={[
    { type: 'task', label: 'Read client order', meta: '40 portions for Friday' },
    { type: 'text', text: 'Stock covers 32 portions, so the kitchen needs onions and leeks before service.' },
    { type: 'source', icon: <Favicon />, label: 'Supplier price list', meta: 'freshfarm.example/prices' },
    { type: 'tool', label: 'Edit', target: 'orders/friday.csv', added: '+6', removed: '−2' },
    { type: 'more', label: '+5 more' },
  ]}
/>`,
  },
  {
    id: 'tools',
    label: 'Tool steps',
    code: `import { Thinking } from '@satin/ui/thinking'

<Thinking
  state="expanded"
  label="Edited 2 files"
  steps={[
    { type: 'tool', label: 'Edit', target: 'src/auth/session.ts', added: '+6', removed: '−2' },
    { type: 'tool', label: 'Edit', target: 'src/auth/refresh.test.ts', added: '+24', removed: '−0' },
  ]}
/>`,
  },
]

/** A running timer, so the loading state reads as live; after a few seconds it settles. */
function Live() {
  const [ms, setMs] = React.useState(0)
  React.useEffect(() => {
    const start = performance.now()
    const id = setInterval(() => setMs(performance.now() - start), 100)
    return () => clearInterval(id)
  }, [])
  return <Thinking state="loading" time={`${(ms / 1000).toFixed(1)}s`} />
}

export default function ThinkingDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Thinking"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <div className="grid w-[min(400px,calc(100vw-80px))] gap-4">
          {id === 'loading' && (
            <>
              <Live />
              <Thinking state="collapsed" label="Thought for 2m 45s" steps={tasks} />
            </>
          )}
          {id === 'tasks' && <Thinking state="expanded" label="Thought for 2m 45s" steps={tasks} />}
          {id === 'types' && <Thinking state="expanded" label="Thought for 2m 45s" steps={stepTypes} />}
          {id === 'tools' && (
            <>
              <Thinking state="expanded" label="Edited 2 files" steps={toolSteps} />
              <Thinking state="expanded" label="Thought for 4m 10s" steps={longRun} />
            </>
          )}
        </div>
      )}
    />
  )
}
