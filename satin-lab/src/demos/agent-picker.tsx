import * as React from 'react'
import { AgentPicker, type Agent } from '@satin/ui/agent-picker'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const agents: Agent[] = [
  { id: 'flappy', name: 'Flappy researcher', description: 'Consumer insights analysis', tone: 'brand' },
  { id: 'agile', name: 'Agile researcher', description: 'Assists with research projects of all sizes', tone: 'sky' },
  { id: 'versatile', name: 'Versatile researcher', description: 'Supports research initiatives, big and small', tone: 'green' },
  { id: 'pipeline', name: 'Pipeline analyst', description: 'Explains forecast and stage changes', tone: 'amber' },
]

const agentsCode = `const agents = [
  { id: 'flappy', name: 'Flappy researcher', description: 'Consumer insights analysis', tone: 'brand' },
  { id: 'agile', name: 'Agile researcher', description: 'Assists with research projects of all sizes', tone: 'sky' },
  { id: 'versatile', name: 'Versatile researcher', description: 'Supports research initiatives, big and small', tone: 'green' },
  { id: 'pipeline', name: 'Pipeline analyst', description: 'Explains forecast and stage changes', tone: 'amber' },
]`

type Variant = { id: string; label: string; props: string; render: Partial<React.ComponentProps<typeof AgentPicker>> }

const variants: Variant[] = [
  { id: 'secondary', label: 'Secondary', props: '', render: {} },
  { id: 'tertiary', label: 'Tertiary', props: '\n      variant="tertiary"\n      size="xs"', render: { variant: 'tertiary', size: 'xs' } },
  { id: 'compact', label: 'Compact', props: '\n      showDescription={false}', render: { showDescription: false } },
  { id: 'create', label: 'Create', props: '\n      onCreate={() => openAgentBuilder()}', render: { onCreate: () => {} } },
]

const code = (props: string) => `import { AgentPicker } from '@satin/ui/agent-picker'

${agentsCode}

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

export const options: ShowcaseOption[] = variants.map((v) => ({ id: v.id, label: v.label, code: code(v.props) }))

function Demo({ variant }: { variant: Variant }) {
  const [agent, setAgent] = React.useState('flappy')
  return (
    <div className="flex flex-col items-center gap-3">
      <AgentPicker agents={agents} value={agent} onValueChange={setAgent} {...variant.render} />
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
      render={(id) => {
        const variant = variants.find((v) => v.id === id) ?? variants[0]
        return <Demo key={id} variant={variant} />
      }}
    />
  )
}
