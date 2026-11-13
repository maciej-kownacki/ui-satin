import * as React from 'react'
import { AgentLoading, type AgentLoadingIndicator, type Glimmer } from '@uisatin/ui/agent-loading'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// The indicator first; the glimmer only crosses the tetris mark, and the timer comes last.
export const controls: ShowcaseControl[] = [
  { id: 'indicator', label: 'Indicator', items: [{ value: 'tetris', label: 'Tetris' }, { value: 'flappy', label: 'Flappy' }] },
  { id: 'glimmer', label: 'Glimmer', items: [{ value: 'color', label: 'Color' }, { value: 'neutral', label: 'Neutral' }] },
  { id: 'time', label: 'Time', type: 'switch', default: 'on' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

// Props left out at their defaults.
function code(v: Record<string, string>) {
  const props = [
    v.indicator === 'flappy' && 'indicator="flappy"',
    v.indicator === 'tetris' && v.glimmer === 'neutral' && 'glimmer="neutral"',
    v.time === 'on' && 'time="1.2s"',
  ].filter(Boolean)
  return `import { AgentLoading } from '@uisatin/ui/agent-loading'\n\n<AgentLoading${props.map((p) => ` ${p}`).join('')} />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [labelOf('indicator', v.indicator), ...(v.indicator === 'tetris' ? [labelOf('glimmer', v.glimmer)] : []), v.time === 'on' ? 'Time' : 'No time'].join(' · '),
  code: code(v),
}))

/** A running timer, so it reads as live. */
function Live({ time, ...props }: { indicator: AgentLoadingIndicator; glimmer: Glimmer; time: boolean }) {
  const [ms, setMs] = React.useState(0)
  React.useEffect(() => {
    const start = performance.now()
    const id = setInterval(() => setMs(performance.now() - start), 100)
    return () => clearInterval(id)
  }, [])
  return <AgentLoading {...props} time={time ? `${(ms / 1000).toFixed(1)}s` : undefined} />
}

export default function AgentLoadingDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Loading"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => <Live indicator={v.indicator as AgentLoadingIndicator} glimmer={v.glimmer as Glimmer} time={v.time === 'on'} />}
    />
  )
}
