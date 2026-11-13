import * as React from 'react'
import { Banner } from '@uisatin/ui/banner'
import { Button } from '@uisatin/ui/button'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Layout sets the box, background its fill, shape its corners; then the content any of them can
// carry, close last since it only adds a button.
export const controls: ShowcaseControl[] = [
  { id: 'layout', label: 'Layout', items: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'sidebar', label: 'Sidebar' }] },
  { id: 'tone', label: 'Tone', items: [{ value: 'default', label: 'Default' }, { value: 'primary', label: 'Primary' }] },
  { id: 'background', label: 'Background', items: [{ value: 'mesh', label: 'Mesh' }, { value: 'plain', label: 'Plain' }] },
  { id: 'shape', label: 'Shape', items: [{ value: 'rounded', label: 'Rounded' }, { value: 'pill', label: 'Pill' }] },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'action', label: 'Action', type: 'switch', default: 'on' },
  { id: 'close', label: 'Close', type: 'switch', default: 'on' },
  { id: 'shimmer', label: 'Shimmer', type: 'switch', default: 'off' },
]

const props = ['layout', 'tone', 'background', 'shape']
const defaults: Record<string, string> = { layout: 'horizontal', tone: 'default', background: 'mesh', shape: 'rounded' }
const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

const title = 'Not sure what you can ask?'
const description = 'Check out our guide and start using AI today.'

function code(v: Record<string, string>) {
  const lines = [
    ...props.filter((k) => v[k] !== defaults[k]).map((k) => `${k}="${v[k]}"`),
    `title="${title}"`,
    v.description === 'on' && `description="${description}"`,
    v.action === 'on' && 'action={<Button variant="secondary">Cheat sheet</Button>}',
    v.close === 'on' && 'onDismiss={() => setOpen(false)}',
    v.shimmer === 'on' && 'shimmer',
  ].filter(Boolean)
  return `import { Banner } from '@uisatin/ui/banner'
${v.action === 'on' ? `import { Button } from '@uisatin/ui/button'\n` : ''}
<Banner
${lines.map((l) => `  ${l}`).join('\n')}
/>`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    ...props.map((k) => labelOf(k, v[k])),
    v.description === 'on' ? 'Description' : 'No description',
    v.action === 'on' ? 'Action' : 'No action',
    v.close === 'on' ? 'Close' : 'No close',
    v.shimmer === 'on' ? 'Shimmer' : 'Still',
  ].join(' · '),
  code: code(v),
}))

function Example({ v }: { v: Record<string, string> }) {
  const [open, setOpen] = React.useState(true)
  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Show banner
      </Button>
    )
  return (
    <Banner
      layout={v.layout as 'horizontal' | 'sidebar'}
      tone={v.tone as 'default' | 'primary'}
      background={v.background as 'mesh' | 'plain'}
      shimmer={v.shimmer === 'on'}
      shape={v.shape as 'rounded' | 'pill'}
      title={title}
      description={v.description === 'on' ? description : undefined}
      action={v.action === 'on' ? <Button variant="secondary">Cheat sheet</Button> : undefined}
      onDismiss={v.close === 'on' ? () => setOpen(false) : undefined}
    />
  )
}

export default function BannerDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Banner"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      // Keyed by the combination, so a dismissed banner comes back when a prop changes.
      render={(id, v) => <Example key={id} v={v} />}
    />
  )
}
