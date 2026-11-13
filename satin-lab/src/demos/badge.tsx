import { Badge, type BadgeTone } from '@uisatin/ui'
import { Calendar, Check, Flash, List, Group, EditPencil, Prohibition, Shop } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const badges: { tone: BadgeTone; label: string; Icon: typeof Check; icon: string }[] = [
  { tone: 'neutral', label: 'Productivity', Icon: List, icon: 'List' },
  { tone: 'brand', label: 'Planning', Icon: Calendar, icon: 'Calendar' },
  { tone: 'sky', label: 'CRM', Icon: Group, icon: 'Group' },
  { tone: 'green', label: 'Published', Icon: Check, icon: 'Check' },
  { tone: 'amber', label: 'E-commerce', Icon: Shop, icon: 'Shop' },
  { tone: 'red', label: 'Blocked', Icon: Prohibition, icon: 'Prohibition' },
  { tone: 'fuchsia', label: 'Payments', Icon: Flash, icon: 'Flash' },
  { tone: 'plum', label: 'Design', Icon: EditPencil, icon: 'EditPencil' },
]

const swatch = (tone: BadgeTone) => <span aria-hidden data-tone={tone} className="size-2.5 rounded-full bg-tone-fg" />
const title = (s: string) => s[0].toUpperCase() + s.slice(1)

// Most structural first: size sets the box, variant the fill, shape the corners. Tone only
// recolours it, and the icon is content that any of them can carry. "All" shows the whole
// palette and turns the code into a loop; one tone gives the one badge you'd paste.
export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', items: [{ value: 'lg', label: 'Large' }, { value: 'sm', label: 'Small' }] },
  { id: 'variant', label: 'Variant', items: [{ value: 'soft', label: 'Soft' }, { value: 'plain', label: 'Plain' }, { value: 'outline', label: 'Outline' }] },
  { id: 'shape', label: 'Shape', items: [{ value: 'default', label: 'Default' }, { value: 'rounded', label: 'Rounded' }] },
  {
    id: 'tone',
    label: 'Tone',
    type: 'menu',
    items: [{ value: 'all', label: 'All tones' }, ...badges.map((b) => ({ value: b.tone, label: title(b.tone), icon: swatch(b.tone) }))],
  },
  { id: 'icon', label: 'Icon', type: 'switch', default: 'on' },
]

const props = ['size', 'variant', 'shape']
const defaults: Record<string, string> = { size: 'lg', variant: 'soft', shape: 'default', tone: 'neutral' }
const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const attrs = props.filter((k) => v[k] !== defaults[k]).map((k) => ` ${k}="${v[k]}"`).join('')
  const icon = v.icon === 'on'
  if (v.tone === 'all') {
    const rows = badges
      .map((b) => `  { tone: '${b.tone}', label: '${b.label}'${icon ? `, Icon: ${b.icon}` : ''} },`)
      .join('\n')
    return `import { Badge } from '@uisatin/ui/badge'
${icon ? `import { ${badges.map((b) => b.icon).join(', ')} } from 'iconoir-react'\n` : ''}
const badges = [
${rows}
] as const

{badges.map(({ tone, label${icon ? ', Icon' : ''} }) => (
  <Badge key={tone} tone={tone}${attrs}>
${icon ? '    <Icon />\n' : ''}    {label}
  </Badge>
))}`
  }
  const b = badges.find((b) => b.tone === v.tone)!
  const tone = v.tone === defaults.tone ? '' : ` tone="${v.tone}"`
  return `import { Badge } from '@uisatin/ui/badge'
${icon ? `import { ${b.icon} } from 'iconoir-react'\n` : ''}
<Badge${tone}${attrs}>${icon ? `<${b.icon} />` : ''}${b.label}</Badge>`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [...[...props, 'tone'].map((k) => labelOf(k, v[k])), v.icon === 'on' ? 'Icon' : 'No icon'].join(' · '),
  code: code(v),
}))

export default function BadgeDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Badge"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="flex max-w-xl flex-wrap justify-center gap-2">
          {badges
            .filter(({ tone }) => v.tone === 'all' || v.tone === tone)
            .map(({ tone, label, Icon }) => (
              <Badge
                key={tone}
                tone={tone}
                size={v.size as 'lg' | 'sm'}
                variant={v.variant as 'soft' | 'plain' | 'outline'}
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
