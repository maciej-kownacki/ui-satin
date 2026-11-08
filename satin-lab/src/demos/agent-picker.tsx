import * as React from 'react'
import { AgentPicker, type Agent } from '@satin/ui/agent-picker'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const agents: Agent[] = [
  { id: 'flappy', name: 'Flappy researcher', description: 'Consumer insights analysis', tone: 'brand' },
  { id: 'agile', name: 'Agile researcher', description: 'Assists with research projects of all sizes', tone: 'sky' },
  { id: 'versatile', name: 'Versatile researcher', description: 'Supports research initiatives, big and small', tone: 'green' },
  { id: 'pipeline', name: 'Pipeline analyst', description: 'Explains forecast and stage changes', tone: 'amber' },
]

const agentsCode = (flappy: boolean) => `const agents = [
  { id: 'flappy', name: 'Flappy researcher', description: 'Consumer insights analysis', tone: 'brand'${flappy ? ", avatar: 'flappy'" : ''} },
  { id: 'agile', name: 'Agile researcher', description: 'Assists with research projects of all sizes', tone: 'sky'${flappy ? ", avatar: 'flappy'" : ''} },
  { id: 'versatile', name: 'Versatile researcher', description: 'Supports research initiatives, big and small', tone: 'green'${flappy ? ", avatar: 'flappy'" : ''} },
  { id: 'pipeline', name: 'Pipeline analyst', description: 'Explains forecast and stage changes', tone: 'amber'${flappy ? ", avatar: 'flappy'" : ''} },
]`

// The avatar first, then variant and size set the trigger; the switches change what the menu holds.
export const controls: ShowcaseControl[] = [
  { id: 'avatar', label: 'Avatar', items: [{ value: 'flappy', label: 'Flappy' }, { value: 'initials', label: 'Initials' }] },
  { id: 'variant', label: 'Variant', items: [{ value: 'secondary', label: 'Secondary' }, { value: 'tertiary', label: 'Tertiary' }] },
  { id: 'size', label: 'Size', items: [{ value: 'md', label: 'Medium' }, { value: 'xs', label: 'Extra small' }] },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'create', label: 'Create', type: 'switch', default: 'off' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const props = [
    v.variant !== 'secondary' && `variant="${v.variant}"`,
    v.size !== 'md' && `size="${v.size}"`,
    v.description === 'off' && 'showDescription={false}',
    v.create === 'on' && 'onCreate={() => openAgentBuilder()}',
  ]
    .filter(Boolean)
    .map((p) => `\n      ${p}`)
    .join('')
  return `import { AgentPicker } from '@satin/ui/agent-picker'

${agentsCode(v.avatar === 'flappy')}

export function Composer() {
  const [agent, setAgent] = React.useState('flappy')
  return (
    <AgentPicker
      agents={agents}
      value={agent}
      onValueChange={setAgent}${props}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('avatar', v.avatar),
    labelOf('variant', v.variant),
    labelOf('size', v.size),
    v.description === 'on' ? 'Description' : 'No description',
    v.create === 'on' ? 'Create' : 'No create',
  ].join(' · '),
  code: code(v),
}))

function Demo({ v }: { v: Record<string, string> }) {
  const [agent, setAgent] = React.useState('flappy')
  return (
    <div className="flex flex-col items-center gap-3">
      <AgentPicker
        agents={v.avatar === 'flappy' ? agents.map((a) => ({ ...a, avatar: 'flappy' as const })) : agents}
        value={agent}
        onValueChange={setAgent}
        variant={v.variant as 'secondary' | 'tertiary'}
        size={v.size as 'md' | 'xs'}
        showDescription={v.description === 'on'}
        onCreate={v.create === 'on' ? () => {} : undefined}
      />
      <p className="text-sm text-text-muted">Open the menu to switch agents.</p>
    </div>
  )
}

export default function AgentPickerDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Agent picker"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => <Demo v={v} />}
    />
  )
}
