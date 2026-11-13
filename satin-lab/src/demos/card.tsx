import * as React from 'react'
import { Card } from '@uisatin/ui/card'
import { Button } from '@uisatin/ui/button'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Size sets the padding; the rest are the card's parts, top to bottom.
export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', items: [{ value: 'md', label: 'Medium' }, { value: 'sm', label: 'Small' }] },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'close', label: 'Close', type: 'switch', default: 'on' },
  { id: 'footer', label: 'Footer', type: 'switch', default: 'on' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const footer = v.footer === 'on'
  const attrs = [
    v.size === 'sm' && '  size="sm"',
    '  title="Notifications"',
    v.description === 'on' && '  description="Choose what we email you about."',
    footer &&
      `  footer={
    <>
      <Button variant="secondary">Cancel</Button>
      <Button>Save</Button>
    </>
  }`,
    v.close === 'on' && '  onClose={() => setOpen(false)}',
  ]
    .filter(Boolean)
    .join('\n')
  return `import { Card } from '@uisatin/ui/card'
${footer ? `import { Button } from '@uisatin/ui/button'\n` : ''}
<Card
${attrs}
>
  {content}
</Card>`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('size', v.size),
    v.description === 'on' ? 'Description' : 'No description',
    v.close === 'on' ? 'Close' : 'No close',
    v.footer === 'on' ? 'Footer' : 'No footer',
  ].join(' · '),
  code: code(v),
}))

// Closing stays live in the stage; a button brings the card back, and any change resets it.
function Example({ v }: { v: Record<string, string> }) {
  const [open, setOpen] = React.useState(true)
  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Show card
      </Button>
    )
  return (
    <Card
      size={v.size as 'md' | 'sm'}
      title="Notifications"
      description={v.description === 'on' ? 'Choose what we email you about.' : undefined}
      footer={
        v.footer === 'on' ? (
          <>
            <Button variant="secondary">Cancel</Button>
            <Button>Save</Button>
          </>
        ) : undefined
      }
      onClose={v.close === 'on' ? () => setOpen(false) : undefined}
    >
      {/* The content is the reader's: a neutral block stands in for it. */}
      <div aria-hidden className="h-24 rounded-lg bg-bg-muted" />
    </Card>
  )
}

export default function CardDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Card"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => <Example key={id} v={v} />}
    />
  )
}
