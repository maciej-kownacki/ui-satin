import { Toggle } from '@satin/ui/toggle'
import { Eye } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Pressed is live: click the toggle in the stage. The controls set what a toggle looks like.
export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', items: [{ value: 'md', label: 'Medium' }, { value: 'sm', label: 'Small' }] },
  { id: 'variant', label: 'Variant', items: [{ value: 'outline', label: 'Outline' }, { value: 'ghost', label: 'Ghost' }] },
  {
    id: 'icon',
    label: 'Icon',
    items: [{ value: 'none', label: 'None' }, { value: 'icon', label: 'With label' }, { value: 'only', label: 'Icon only' }],
  },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const attrs = [
    v.size !== 'md' && ` size="${v.size}"`,
    v.variant !== 'outline' && ` variant="${v.variant}"`,
    v.icon === 'only' && ' iconOnly',
    v.icon !== 'none' && ' icon={<Eye />}',
    v.icon === 'only' && ' aria-label="Preview"',
    ' defaultPressed',
    v.disabled === 'on' && ' disabled',
  ]
    .filter(Boolean)
    .join('')
  const jsx = v.icon === 'only' ? `<Toggle${attrs} />` : `<Toggle${attrs}>Preview</Toggle>`
  return `import { Toggle } from '@satin/ui/toggle'
${v.icon !== 'none' ? "import { Eye } from 'iconoir-react'\n" : ''}
${jsx}`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    ...['size', 'variant'].map((k) => labelOf(k, v[k])),
    v.icon === 'none' ? 'No icon' : v.icon === 'icon' ? 'Icon' : 'Icon only',
    ...(v.disabled === 'on' ? ['Disabled'] : []),
  ].join(' · '),
  code: code(v),
}))

export default function ToggleDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Toggle"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <Toggle
          size={v.size as 'md' | 'sm'}
          variant={v.variant as 'outline' | 'ghost'}
          iconOnly={v.icon === 'only'}
          icon={v.icon === 'none' ? undefined : <Eye />}
          aria-label={v.icon === 'only' ? 'Preview' : undefined}
          defaultPressed
          disabled={v.disabled === 'on'}
        >
          Preview
        </Toggle>
      )}
    />
  )
}
