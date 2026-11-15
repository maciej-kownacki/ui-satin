import { FormField } from '@uisatin/ui/form-field'
import { PasswordInput } from '@uisatin/ui/password-input'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', default: 'md', items: [{ value: 'sm', label: 'SM' }, { value: 'md', label: 'MD' }, { value: 'lg', label: 'LG' }] },
  { id: 'error', label: 'Error', type: 'switch', default: 'off' },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const field = [
    'label="Password"',
    v.error === 'on' ? 'error="Use at least 12 characters"' : 'description="At least 12 characters."',
    v.disabled === 'on' && 'disabled',
  ].filter(Boolean)
  return `import { FormField } from '@uisatin/ui/form-field'
import { PasswordInput } from '@uisatin/ui/password-input'

<FormField ${field.join(' ')}>
  <PasswordInput${v.size !== 'md' ? ` size="${v.size}"` : ''} autoComplete="new-password" />
</FormField>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: Object.values(v).join(' · '), code: code(v) }))

export default function PasswordInputDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Password input"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => (
        <div className="w-80 max-w-full">
          <FormField
            label="Password"
            description={v.error === 'on' ? undefined : 'At least 12 characters.'}
            error={v.error === 'on' ? 'Use at least 12 characters' : undefined}
            disabled={v.disabled === 'on'}
          >
            <PasswordInput key={id} size={v.size as 'md'} autoComplete="new-password" defaultValue={v.error === 'on' ? 'satin' : 'calm-velvet-orbit-42'} />
          </FormField>
        </div>
      )}
    />
  )
}
