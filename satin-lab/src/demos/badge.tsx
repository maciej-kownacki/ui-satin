import { Badge, type BadgeTone } from '@satin/ui'
import { Calendar, Check, Flash, List, Group, EditPencil, Prohibition, Shop } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const badges: { tone: BadgeTone; label: string; Icon: typeof Check }[] = [
  { tone: 'neutral', label: 'Productivity', Icon: List },
  { tone: 'brand', label: 'Planning', Icon: Calendar },
  { tone: 'sky', label: 'CRM', Icon: Group },
  { tone: 'green', label: 'Published', Icon: Check },
  { tone: 'amber', label: 'E-commerce', Icon: Shop },
  { tone: 'red', label: 'Blocked', Icon: Prohibition },
  { tone: 'fuchsia', label: 'Payments', Icon: Flash },
  { tone: 'plum', label: 'Design', Icon: EditPencil },
]

// Most structural first: size sets the box, variant the fill, shape the corners; the icon
// is content that every size, variant and shape can carry.
export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', items: [{ value: 'lg', label: 'Large' }, { value: 'sm', label: 'Small' }] },
  { id: 'variant', label: 'Variant', items: [{ value: 'soft', label: 'Soft' }, { value: 'plain', label: 'Plain' }] },
  { id: 'shape', label: 'Shape', items: [{ value: 'default', label: 'Default' }, { value: 'rounded', label: 'Rounded' }] },
  { id: 'icon', label: 'Icon', type: 'switch', default: 'on' },
]

const props = ['size', 'variant', 'shape']
const defaults: Record<string, string> = { size: 'lg', variant: 'soft', shape: 'default' }
const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => {
  const attrs = props.filter((k) => v[k] !== defaults[k]).map((k) => ` ${k}="${v[k]}"`).join('')
  const icon = v.icon === 'on'
  return {
    id: comboId(controls, v),
    label: [...props.map((k) => labelOf(k, v[k])), icon ? 'Icon' : 'No icon'].join(' · '),
    code: `import { Badge } from '@satin/ui/badge'
${icon ? "import { Check, Prohibition } from 'iconoir-react'\n" : ''}
<Badge tone="green"${attrs}>${icon ? '<Check />' : ''}Published</Badge>
<Badge tone="red"${attrs}>${icon ? '<Prohibition />' : ''}Blocked</Badge>`,
  }
})

export default function BadgeDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Badge"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="flex max-w-xl flex-wrap justify-center gap-2">
          {badges.map(({ tone, label, Icon }) => (
            <Badge
              key={tone}
              tone={tone}
              size={v.size as 'lg' | 'sm'}
              variant={v.variant as 'soft' | 'plain'}
              shape={v.shape as 'default' | 'rounded'}
            >
              {v.icon === 'on' && <Icon aria-hidden />}
              {label}
            </Badge>
          ))}
        </div>
      )}
    />
  )
}
