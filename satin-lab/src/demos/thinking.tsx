import * as React from 'react'
import { Thinking, type ThinkingStep } from '@uisatin/ui/thinking'
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

// The indicator sets the header's mark; steps decide what the run holds, More caps a long one,
// and state comes last. While the agent works, Loading shows instead.
export const controls: ShowcaseControl[] = [
  { id: 'indicator', label: 'Indicator', items: [{ value: 'tetris', label: 'Tetris' }, { value: 'flappy', label: 'Flappy' }] },
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
      { value: 'collapsed', label: 'Collapsed' },
      { value: 'expanded', label: 'Expanded' },
    ],
  },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

// The mark's prop, left out at its default.
const markProps = (v: Record<string, string>) => (v.indicator === 'flappy' ? ['indicator="flappy"'] : [])

function code(v: Record<string, string>) {
  const set = sets[v.steps]
  const steps = [...set.code, ...(v.more === 'on' ? ["{ type: 'more', label: '+5 more' },"] : [])]
  return `import { Thinking } from '@uisatin/ui/thinking'

<Thinking
${markProps(v).map((p) => `  ${p}\n`).join('')}  state="${v.state}"
  label="${set.label}"
  steps={[
${steps.map((s) => `    ${s}`).join('\n')}
  ]}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [labelOf('indicator', v.indicator), labelOf('steps', v.steps), v.more === 'on' ? 'More' : 'No more', labelOf('state', v.state)].join(' · '),
  code: code(v),
}))

export default function ThinkingDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Thinking"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      align="top"
      render={(_, v) => {
        const set = sets[v.steps]
        return (
          <div className="grid w-[min(400px,calc(100vw-80px))] gap-4">
            <Thinking
              indicator={v.indicator as 'tetris' | 'flappy'}
              state={v.state as 'collapsed' | 'expanded'}
              label={set.label}
              steps={v.more === 'on' ? [...set.steps, more] : set.steps}
            />
          </div>
        )
      }}
    />
  )
}
