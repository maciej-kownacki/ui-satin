import { Button } from '@satin/ui'
import { Calendar, Copy, EditPencil, Plus, Trash } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'destructive'

const buttons: { variant: Variant; label: string; Icon: typeof Calendar; icon: string }[] = [
  { variant: 'primary', label: 'Schedule', Icon: Calendar, icon: 'Calendar' },
  { variant: 'secondary', label: 'Edit', Icon: EditPencil, icon: 'EditPencil' },
  { variant: 'tertiary', label: 'Copy', Icon: Copy, icon: 'Copy' },
  { variant: 'inverse', label: 'Add', Icon: Plus, icon: 'Plus' },
  { variant: 'destructive', label: 'Delete', Icon: Trash, icon: 'Trash' },
]

const title = (s: string) => s[0].toUpperCase() + s.slice(1)

// Size sets the box, variant the fill, shape the corners; the icon is content any of them
// can carry, and "Icon only" is the `iconOnly` prop. "All" shows every variant as a loop.
export const controls: ShowcaseControl[] = [
  {
    id: 'size',
    label: 'Size',
    default: 'md',
    items: [{ value: 'xs', label: 'XS' }, { value: 'md', label: 'MD' }, { value: 'lg', label: 'LG' }, { value: 'xl', label: 'XL' }],
  },
  {
    id: 'variant',
    label: 'Variant',
    type: 'menu',
    items: [{ value: 'all', label: 'All variants' }, ...buttons.map((b) => ({ value: b.variant, label: title(b.variant) }))],
  },
  { id: 'shape', label: 'Shape', items: [{ value: 'default', label: 'Default' }, { value: 'rounded', label: 'Rounded' }] },
  {
    id: 'icon',
    label: 'Icon',
    default: 'icon',
    items: [{ value: 'none', label: 'None' }, { value: 'icon', label: 'With label' }, { value: 'only', label: 'Icon only' }],
  },
]

const props = ['size', 'shape']
const defaults: Record<string, string> = { size: 'md', variant: 'primary', shape: 'default' }
const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const attrs = props.filter((k) => v[k] !== defaults[k]).map((k) => ` ${k}="${v[k]}"`).join('')
  const icon = v.icon !== 'none'
  const only = v.icon === 'only'
  if (v.variant === 'all') {
    const rows = buttons
      .map((b) => `  { variant: '${b.variant}', label: '${b.label}'${icon ? `, Icon: ${b.icon}` : ''} },`)
      .join('\n')
    const body = only
      ? `  <Button key={variant} variant={variant}${attrs} iconOnly aria-label={label}>
    <Icon />
  </Button>`
      : `  <Button key={variant} variant={variant}${attrs}>
${icon ? '    <Icon />\n' : ''}    {label}
  </Button>`
    return `import { Button } from '@satin/ui/button'
${icon ? `import { ${buttons.map((b) => b.icon).join(', ')} } from 'iconoir-react'\n` : ''}
const buttons = [
${rows}
] as const

{buttons.map(({ variant, label${icon ? ', Icon' : ''} }) => (
${body}
))}`
  }
  const b = buttons.find((b) => b.variant === v.variant)!
  const variant = v.variant === defaults.variant ? '' : ` variant="${v.variant}"`
  const jsx = only
    ? `<Button${variant}${attrs} iconOnly aria-label="${b.label}"><${b.icon} /></Button>`
    : `<Button${variant}${attrs}>${icon ? `<${b.icon} />` : ''}${b.label}</Button>`
  return `import { Button } from '@satin/ui/button'
${icon ? `import { ${b.icon} } from 'iconoir-react'\n` : ''}
${jsx}`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    ...['size', 'variant', 'shape'].map((k) => labelOf(k, v[k])),
    v.icon === 'none' ? 'No icon' : v.icon === 'icon' ? 'Icon' : 'Icon only',
  ].join(' · '),
  code: code(v),
}))

export default function ButtonDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Button"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {buttons
            .filter(({ variant }) => v.variant === 'all' || v.variant === variant)
            .map(({ variant, label, Icon }) => (
              <Button
                key={variant}
                variant={variant}
                size={v.size as 'xs' | 'md' | 'lg' | 'xl'}
                shape={v.shape as 'default' | 'rounded'}
                iconOnly={v.icon === 'only'}
                aria-label={v.icon === 'only' ? label : undefined}
              >
                {v.icon !== 'none' && <Icon aria-hidden />}
                {v.icon !== 'only' && label}
              </Button>
            ))}
        </div>
      )}
    />
  )
}
