import { Switch } from '@uisatin/ui'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const label = 'Email notifications'
const description = 'Send me a summary of new orders every evening.'

// Checked is live: flip the switch in the stage. Without a label it needs an aria-label.
export const controls: ShowcaseControl[] = [
  { id: 'placement', label: 'Placement', items: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
  {
    id: 'content',
    label: 'Content',
    items: [{ value: 'description', label: 'Label + description' }, { value: 'label', label: 'Label' }, { value: 'none', label: 'None' }],
  },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const attrs = [
    v.placement !== 'left' && `placement="${v.placement}"`,
    v.content === 'none' ? `aria-label="${label}"` : `label="${label}"`,
    v.content === 'description' && `description="${description}"`,
    'defaultChecked',
    v.disabled === 'on' && 'disabled',
  ].filter(Boolean)
  const jsx = attrs.length > 2 ? `<Switch\n${attrs.map((a) => `  ${a}`).join('\n')}\n/>` : `<Switch ${attrs.join(' ')} />`
  return `import { Switch } from '@uisatin/ui/switch'

${jsx}`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    `Switch ${v.placement}`,
    v.content === 'none' ? 'No label' : labelOf('content', v.content),
    ...(v.disabled === 'on' ? ['Disabled'] : []),
  ].join(' · '),
  code: code(v),
}))

export default function SwitchDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Switch"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        // A fixed width, so placement="right" visibly pushes the switch to the far edge.
        <div className={v.content === 'none' ? undefined : 'w-80 max-w-full'}>
          <Switch
            placement={v.placement as 'left' | 'right'}
            label={v.content === 'none' ? undefined : label}
            aria-label={v.content === 'none' ? label : undefined}
            description={v.content === 'description' ? description : undefined}
            defaultChecked
            disabled={v.disabled === 'on'}
          />
        </div>
      )}
    />
  )
}
