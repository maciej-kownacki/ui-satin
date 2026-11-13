import { SegmentedControl } from '@uisatin/ui'
import { Home, Folder, User } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const segments = [
  { value: 'home', label: 'Home', Icon: Home, icon: 'Home' },
  { value: 'files', label: 'Files', Icon: Folder, icon: 'Folder' },
  { value: 'agent', label: 'Agent', Icon: User, icon: 'User' },
]

// Size sets the height, shape the corners, border outlines the track; the icon is content.
export const controls: ShowcaseControl[] = [
  {
    id: 'size',
    label: 'Size',
    default: 'md',
    items: [{ value: 'xs', label: 'Extra small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }],
  },
  { id: 'shape', label: 'Shape', items: [{ value: 'default', label: 'Default' }, { value: 'rounded', label: 'Rounded' }] },
  { id: 'border', label: 'Border', type: 'switch', default: 'off' },
  { id: 'icon', label: 'Icon', type: 'switch', default: 'off' },
]

const defaults: Record<string, string> = { size: 'md', shape: 'default' }
const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const icon = v.icon === 'on'
  const attrs = ['size', 'shape'].filter((k) => v[k] !== defaults[k]).map((k) => `\n  ${k}="${v[k]}"`).join('')
  const rows = segments
    .map((s) => `    { value: '${s.value}', label: '${s.label}'${icon ? `, icon: <${s.icon} />` : ''} },`)
    .join('\n')
  return `import { SegmentedControl } from '@uisatin/ui/segmented-control'
${icon ? `import { ${segments.map((s) => s.icon).join(', ')} } from 'iconoir-react'\n` : ''}
<SegmentedControl${attrs}${v.border === 'on' ? '\n  border' : ''}
  items={[
${rows}
  ]}
/>`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('size', v.size),
    labelOf('shape', v.shape),
    v.border === 'on' ? 'Border' : 'No border',
    v.icon === 'on' ? 'Icon' : 'No icon',
  ].join(' · '),
  code: code(v),
}))

export default function SegmentedControlDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Segmented control"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <SegmentedControl
          size={v.size as 'xs' | 'md' | 'lg'}
          shape={v.shape as 'default' | 'rounded'}
          border={v.border === 'on'}
          items={segments.map(({ value, label, Icon }) => ({
            value,
            label,
            icon: v.icon === 'on' ? <Icon aria-hidden /> : undefined,
          }))}
        />
      )}
    />
  )
}
