import { FormField } from '@satin/ui/form-field'
import { Input } from '@satin/ui/input'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Layout places the label; description and the required mark are content; error and disabled are
// states, last. An error replaces the description while it's set.
export const controls: ShowcaseControl[] = [
  { id: 'layout', label: 'Layout', items: [{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }] },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'required', label: 'Required', type: 'switch', default: 'on' },
  { id: 'error', label: 'Error', type: 'switch', default: 'off' },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

const field = {
  label: 'Email',
  description: 'We send the receipt here.',
  error: 'Enter an email address, e.g. name@company.com',
  placeholder: 'name@company.com',
  invalid: 'name@company',
}

function code(v: Record<string, string>) {
  const props = [
    v.layout === 'horizontal' && 'layout="horizontal"',
    `label="${field.label}"`,
    on(v, 'description') && `description="${field.description}"`,
    on(v, 'error') && `error="${field.error}"`,
    on(v, 'disabled') && 'disabled',
    on(v, 'required') && 'required',
  ].filter(Boolean) as string[]
  const input = on(v, 'error') ? `<Input defaultValue="${field.invalid}" />` : `<Input placeholder="${field.placeholder}" />`
  // One line while it fits, one prop per line once it doesn't.
  const open = `<FormField ${props.join(' ')}>`
  return `import { FormField } from '@satin/ui/form-field'
import { Input } from '@satin/ui/input'

${open.length <= 90 ? open : `<FormField\n${props.map((p) => `  ${p}`).join('\n')}\n>`}
  ${input}
</FormField>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    v.layout === 'horizontal' ? 'Horizontal' : 'Vertical',
    on(v, 'description') ? 'Description' : 'No description',
    on(v, 'required') ? 'Required' : 'Optional',
    on(v, 'error') ? 'Error' : 'No error',
    on(v, 'disabled') ? 'Disabled' : 'Enabled',
  ].join(' · '),
  code: code(v),
}))

export default function FormFieldDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Form field"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => (
        <div className={v.layout === 'horizontal' ? 'w-[520px] max-w-full' : 'w-80 max-w-full'}>
          <FormField
            layout={v.layout as 'vertical' | 'horizontal'}
            label={field.label}
            description={on(v, 'description') ? field.description : undefined}
            error={on(v, 'error') ? field.error : undefined}
            disabled={on(v, 'disabled')}
            required={on(v, 'required')}
          >
            {/* Keyed so the value resets when the error is switched. */}
            {on(v, 'error') ? (
              <Input key={id} defaultValue={field.invalid} />
            ) : (
              <Input key={id} placeholder={field.placeholder} />
            )}
          </FormField>
        </div>
      )}
    />
  )
}
