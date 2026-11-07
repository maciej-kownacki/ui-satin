import * as React from 'react'
import { Thinking, type ThinkingStep } from '@satin/ui/thinking'
import { Globe } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/** Each set of steps with its code, so the stage and the Code tab can't drift apart. */
type StepSet = { label: string; steps: ThinkingStep[]; code: string[] }

const sets: Record<string, StepSet> = {
  tasks: {
    label: 'Thought for 2m 45s',
    steps: [
      { label: 'Read client order' },
      { label: 'Informed the kitchen' },
      { label: 'Ordered missing ingredients', meta: '2kg onions, 1kg leeks, 6 lemons' },
    ],
    code: [
      "{ label: 'Read client order' },",
      "{ label: 'Informed the kitchen' },",
      "{ label: 'Ordered missing ingredients', meta: '2kg onions, 1kg leeks, 6 lemons' },",
    ],
  },
  types: {
    label: 'Thought for 2m 45s',
    steps: [
      { type: 'task', label: 'Read client order', meta: '40 portions for Friday' },
      { type: 'text', text: 'Stock covers 32 portions, so the kitchen needs onions and leeks before service.' },
      {
        type: 'source',
        icon: <Globe className="text-text-muted [stroke-width:1.875]" />,
        label: 'Supplier price list',
        meta: 'freshfarm.example/prices',
      },
      { type: 'tool', label: 'Edit', target: 'orders/friday.csv', added: '+6', removed: '−2' },
    ],
    code: [
      "{ type: 'task', label: 'Read client order', meta: '40 portions for Friday' },",
      "{ type: 'text', text: 'Stock covers 32 portions, so the kitchen needs onions and leeks before service.' },",
      "{ type: 'source', icon: <Favicon />, label: 'Supplier price list', meta: 'freshfarm.example/prices' },",
      "{ type: 'tool', label: 'Edit', target: 'orders/friday.csv', added: '+6', removed: '−2' },",
    ],
  },
  tools: {
    label: 'Edited 2 files',
    steps: [
      { type: 'tool', label: 'Edit', target: 'src/auth/session.ts', added: '+6', removed: '−2' },
      { type: 'tool', label: 'Edit', target: 'src/auth/refresh.test.ts', added: '+24', removed: '−0' },
    ],
    code: [
      "{ type: 'tool', label: 'Edit', target: 'src/auth/session.ts', added: '+6', removed: '−2' },",
      "{ type: 'tool', label: 'Edit', target: 'src/auth/refresh.test.ts', added: '+24', removed: '−0' },",
    ],
  },
}

const more: ThinkingStep = { type: 'more', label: '+5 more' }

// Steps decide what the run holds, More caps a long one, and state comes last: loading shows
// only the live label and timer, collapsed and expanded show the steps behind the label.
export const controls: ShowcaseControl[] = [
  {
    id: 'steps',
    label: 'Steps',
    items: [
      { value: 'tasks', label: 'Tasks' },
      { value: 'types', label: 'Step types' },
      { value: 'tools', label: 'Tool calls' },
    ],
  },
  { id: 'more', label: 'More', type: 'switch', default: 'off' },
  {
    id: 'state',
    label: 'State',
    default: 'expanded',
    items: [
      { value: 'loading', label: 'Loading' },
      { value: 'collapsed', label: 'Collapsed' },
      { value: 'expanded', label: 'Expanded' },
    ],
  },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  // Loading is the default state and its label defaults to "Thinking…", so only the timer is left.
  if (v.state === 'loading') return `import { Thinking } from '@satin/ui/thinking'\n\n<Thinking time="1.2s" />`
  const set = sets[v.steps]
  const steps = [...set.code, ...(v.more === 'on' ? ["{ type: 'more', label: '+5 more' },"] : [])]
  return `import { Thinking } from '@satin/ui/thinking'

<Thinking
  state="${v.state}"
  label="${set.label}"
  steps={[
${steps.map((s) => `    ${s}`).join('\n')}
  ]}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [labelOf('steps', v.steps), v.more === 'on' ? 'More' : 'No more', labelOf('state', v.state)].join(' · '),
  code: code(v),
}))

/** A running timer, so the loading state reads as live. */
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
      controls={controls}
      render={(_, v) => {
        const set = sets[v.steps]
        return (
          <div className="grid w-[min(400px,calc(100vw-80px))] gap-4">
            {v.state === 'loading' ? (
              <Live />
            ) : (
              <Thinking
                state={v.state as 'collapsed' | 'expanded'}
                label={set.label}
                steps={v.more === 'on' ? [...set.steps, more] : set.steps}
              />
            )}
          </div>
        )
      }}
    />
  )
}
