import { Checkbox } from '@uisatin/ui'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const label = 'Email notifications'
const description = 'Send me a summary of new orders every evening.'

// Clicking the box stays live; Checked sets where it starts, including the indeterminate
// look of a "select all" parent that a click can't reach.
export const controls: ShowcaseControl[] = [
  { id: 'placement', label: 'Placement', items: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
  {
    id: 'content',
    label: 'Content',
    default: 'label',
    items: [{ value: 'description', label: 'Label + description' }, { value: 'label', label: 'Label' }, { value: 'none', label: 'None' }],
  },
  {
    id: 'checked',
    label: 'Checked',
    default: 'true',
    items: [{ value: 'false', label: 'Unchecked' }, { value: 'true', label: 'Checked' }, { value: 'indeterminate', label: 'Indeterminate' }],
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
    v.checked === 'true' ? 'defaultChecked' : v.checked === 'indeterminate' && 'defaultChecked="indeterminate"',
    v.disabled === 'on' && 'disabled',
  ].filter(Boolean)
  const jsx = attrs.length > 2 ? `<Checkbox\n${attrs.map((a) => `  ${a}`).join('\n')}\n/>` : `<Checkbox ${attrs.join(' ')} />`
  return `import { Checkbox } from '@uisatin/ui/checkbox'

${jsx}`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    `Checkbox ${v.placement}`,
    v.content === 'none' ? 'No label' : labelOf('content', v.content),
    labelOf('checked', v.checked),
    ...(v.disabled === 'on' ? ['Disabled'] : []),
  ].join(' · '),
  code: code(v),
}))

export default function CheckboxDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Checkbox"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        // placement="right" gets a fixed width, so the box visibly goes to the far edge; on the left
        // the field hugs its text, so it sits centred on the stage.
        <div className={v.content === 'none' ? undefined : v.placement === 'right' ? 'w-80 max-w-full' : 'w-fit max-w-80'}>
          <Checkbox
            // Remount when Checked changes, so the new starting value applies.
            key={v.checked}
            placement={v.placement as 'left' | 'right'}
            label={v.content === 'none' ? undefined : label}
            aria-label={v.content === 'none' ? label : undefined}
            description={v.content === 'description' ? description : undefined}
            defaultChecked={v.checked === 'indeterminate' ? 'indeterminate' : v.checked === 'true'}
            disabled={v.disabled === 'on'}
          />
        </div>
      )}
    />
  )
}
