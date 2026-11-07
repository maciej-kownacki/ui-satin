import { Button } from '@satin/ui/button'
import { Tooltip } from '@satin/ui/tooltip'
import { Copy } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Side = 'top' | 'right' | 'bottom' | 'left'

export const controls: ShowcaseControl[] = [
  { id: 'shape', label: 'Shape', items: [{ value: 'default', label: 'Default' }, { value: 'rounded', label: 'Rounded' }] },
  {
    id: 'side',
    label: 'Side',
    items: [
      { value: 'top', label: 'Top' },
      { value: 'right', label: 'Right' },
      { value: 'bottom', label: 'Bottom' },
      { value: 'left', label: 'Left' },
    ],
  },
  { id: 'shortcut', label: 'Shortcut', type: 'switch', default: 'on' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  // The trigger's corners follow the tooltip's.
  const shape = v.shape === 'default' ? '' : ` shape="${v.shape}"`
  const side = v.side === 'top' ? '' : ` side="${v.side}"`
  const shortcut = v.shortcut === 'on' ? ' shortcut="⌘C"' : ''
  return `import { Tooltip } from '@satin/ui/tooltip'
import { Button } from '@satin/ui/button'
import { Copy } from 'iconoir-react'

<Tooltip label="Copy"${shortcut}${shape}${side}>
  <Button variant="secondary"${shape} iconOnly aria-label="Copy"><Copy /></Button>
</Tooltip>`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [labelOf('shape', v.shape), labelOf('side', v.side), v.shortcut === 'on' ? 'Shortcut' : 'No shortcut'].join(' · '),
  code: code(v),
}))

export default function TooltipDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Tooltip"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => {
        const shape = v.shape as 'default' | 'rounded'
        return (
          // Starts open, and opens again on every change, so the stage never looks empty.
          <Tooltip
            key={id}
            label="Copy"
            shortcut={v.shortcut === 'on' ? '⌘C' : undefined}
            shape={shape}
            side={v.side as Side}
            defaultOpen
          >
            <Button variant="secondary" shape={shape} iconOnly aria-label="Copy">
              <Copy />
            </Button>
          </Tooltip>
        )
      }}
    />
  )
}
