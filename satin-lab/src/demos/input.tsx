import { Input } from '@satin/ui/input'
import { Mail, Xmark } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const label = 'Work email'
const hint = 'We send the invite link here.'
const error = 'Enter an email address, e.g. name@company.com'

// Typing stays live in the stage. Size sets the field, then the content around it, and the
// state last: an error replaces the hint with its message.
export const controls: ShowcaseControl[] = [
  {
    id: 'size',
    label: 'Size',
    default: 'md',
    items: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }],
  },
  {
    id: 'icons',
    label: 'Icons',
    items: [{ value: 'none', label: 'None' }, { value: 'leading', label: 'Leading' }, { value: 'both', label: 'Both' }],
  },
  { id: 'label', label: 'Label', type: 'switch', default: 'on' },
  { id: 'hint', label: 'Hint', type: 'switch', default: 'on' },
  {
    id: 'state',
    label: 'State',
    items: [{ value: 'default', label: 'Default' }, { value: 'error', label: 'Error' }, { value: 'disabled', label: 'Disabled' }],
  },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const icons = { none: [], leading: ['Mail'], both: ['Mail', 'Xmark'] }[v.icons] ?? []
  const attrs = [
    v.size !== 'md' && `size="${v.size}"`,
    v.label === 'on' ? `label="${label}"` : `aria-label="${label}"`,
    v.state === 'error' ? 'defaultValue="name@company"' : 'placeholder="name@company.com"',
    v.hint === 'on' && `hint="${hint}"`,
    icons.includes('Mail') && 'leadingIcon={<Mail />}',
    icons.includes('Xmark') && 'trailingIcon={<Xmark />}',
    v.state === 'error' && `error="${error}"`,
    v.state === 'disabled' && 'disabled',
  ].filter(Boolean)
  return `import { Input } from '@satin/ui/input'
${icons.length ? `import { ${icons.join(', ')} } from 'iconoir-react'\n` : ''}
<Input
${attrs.map((a) => `  ${a}`).join('\n')}
/>`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('size', v.size),
    { none: 'No icons', leading: 'Leading icon', both: 'Both icons' }[v.icons],
    v.label === 'on' ? 'Label' : 'No label',
    v.hint === 'on' ? 'Hint' : 'No hint',
    labelOf('state', v.state),
  ].join(' · '),
  code: code(v),
}))

export default function InputDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Input"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="w-80 max-w-full">
          <Input
            // Remount when the state changes, so the error's starting value applies.
            key={v.state}
            size={v.size as 'sm' | 'md' | 'lg'}
            label={v.label === 'on' ? label : undefined}
            aria-label={v.label === 'on' ? undefined : label}
            placeholder={v.state === 'error' ? undefined : 'name@company.com'}
            defaultValue={v.state === 'error' ? 'name@company' : undefined}
            hint={v.hint === 'on' ? hint : undefined}
            leadingIcon={v.icons === 'none' ? undefined : <Mail />}
            trailingIcon={v.icons === 'both' ? <Xmark /> : undefined}
            error={v.state === 'error' ? error : undefined}
            disabled={v.state === 'disabled'}
          />
        </div>
      )}
    />
  )
}
