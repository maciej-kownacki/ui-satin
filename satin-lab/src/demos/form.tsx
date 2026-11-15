import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { Form, FormActions, FormSection, type FormValues } from '@uisatin/ui/form'
import { FieldGroup } from '@uisatin/ui/field-group'
import { FormField } from '@uisatin/ui/form-field'
import { Input } from '@uisatin/ui/input'
import { Select } from '@uisatin/ui/select'
import { Textarea } from '@uisatin/ui/textarea'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Layout places every label at once; errors and disabled are states. Save validates for real.
export const controls: ShowcaseControl[] = [
  { id: 'layout', label: 'Layout', items: [{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }] },
  { id: 'errors', label: 'Errors', type: 'switch', default: 'off' },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

const roles = ['Design', 'Engineering', 'Product'].map((r) => ({ value: r.toLowerCase(), label: r }))

type Errors = Partial<Record<string, string>>

const sampleErrors: Errors = {
  name: 'Enter your name',
  email: 'Enter an email address, e.g. name@company.com',
  notify: 'Pick at least one',
}

/** The checks Save runs; an empty result means the form is valid. */
function validate(values: FormValues): Errors {
  const errors: Errors = {}
  if (!String(values.name ?? '').trim()) errors.name = sampleErrors.name
  if (!/^\S+@\S+\.\S+$/.test(String(values.email ?? ''))) errors.email = sampleErrors.email
  if (!values.notify) errors.notify = sampleErrors.notify
  return errors
}

function code(v: Record<string, string>) {
  const attrs = [
    v.layout === 'horizontal' && 'layout="horizontal"',
    'errors={errors}',
    v.disabled === 'on' && 'disabled',
    'onSubmitValues={(values) => setErrors(validate(values))}',
  ].filter(Boolean)
  return `import { Form, FormSection, FormActions } from '@uisatin/ui/form'
import { FieldGroup } from '@uisatin/ui/field-group'
import { FormField } from '@uisatin/ui/form-field'
import { Input } from '@uisatin/ui/input'
import { Select } from '@uisatin/ui/select'
import { Textarea } from '@uisatin/ui/textarea'
import { Checkbox } from '@uisatin/ui/checkbox'
import { Button } from '@uisatin/ui/button'

const roles = [{ value: 'design', label: 'Design' }, { value: 'engineering', label: 'Engineering' }]
const [errors, setErrors] = useState({})

<Form
${attrs.map((a) => `  ${a}`).join('\n')}
>
  <FormSection title="Profile" description="How your team sees you.">
    <FormField name="name" label="Name" required>
      <Input placeholder="Ada Lovelace" />
    </FormField>
    <FormField name="email" label="Email" description="We send receipts here." required>
      <Input type="email" placeholder="name@company.com" />
    </FormField>
    <FormField name="role" label="Role">
      <Select options={roles} />
    </FormField>
    <FormField name="bio" label="Bio">
      <Textarea placeholder="A line about you" />
    </FormField>
  </FormSection>
  <FormSection title="Notifications">
    <FieldGroup name="notify" legend="Email me about" variant="choices" required>
      <Checkbox name="notify" value="mentions" label="Mentions" description="Someone @-mentions you." />
      <Checkbox name="notify" value="digest" label="Weekly digest" />
      <Checkbox name="notify" value="product" label="Product news" />
    </FieldGroup>
  </FormSection>
  <FormActions>
    <Button variant="secondary" type="reset">Cancel</Button>
    <Button type="submit">Save</Button>
  </FormActions>
</Form>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.layout, v.errors === 'on' ? 'Errors' : 'No errors', v.disabled === 'on' ? 'Disabled' : 'Enabled'].join(' · '),
  code: code(v),
}))

function SettingsForm({ v }: { v: Record<string, string> }) {
  const [errors, setErrors] = React.useState<Errors>({})
  const [saved, setSaved] = React.useState(false)
  const shown = v.errors === 'on' ? sampleErrors : errors
  const horizontal = v.layout === 'horizontal'

  return (
    <div className={horizontal ? 'w-[600px] max-w-full' : 'w-[400px] max-w-full'}>
      <Form
        layout={v.layout as 'vertical' | 'horizontal'}
        errors={shown}
        disabled={v.disabled === 'on'}
        onSubmitValues={(values) => {
          const next = validate(values)
          setErrors(next)
          setSaved(Object.keys(next).length === 0)
        }}
        onReset={() => {
          setErrors({})
          setSaved(false)
        }}
      >
        <FormSection title="Profile" description="How your team sees you.">
          <FormField name="name" label="Name" required>
            <Input placeholder="Ada Lovelace" autoComplete="off" />
          </FormField>
          <FormField name="email" label="Email" description="We send receipts here." required>
            <Input type="email" placeholder="name@company.com" autoComplete="off" />
          </FormField>
          <FormField name="role" label="Role">
            <Select options={roles} />
          </FormField>
          <FormField name="bio" label="Bio">
            <Textarea placeholder="A line about you" />
          </FormField>
        </FormSection>
        <FormSection title="Notifications">
          <FieldGroup name="notify" legend="Email me about" variant="choices" required>
            <Checkbox name="notify" value="mentions" label="Mentions" description="Someone @-mentions you." />
            <Checkbox name="notify" value="digest" label="Weekly digest" />
            <Checkbox name="notify" value="product" label="Product news" />
          </FieldGroup>
        </FormSection>
        <FormActions align={horizontal ? 'start' : 'end'}>
          {saved && (
            <span className="mr-auto text-sm text-text-muted" role="status">
              Saved
            </span>
          )}
          <Button variant="secondary" type="reset">
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </FormActions>
      </Form>
    </div>
  )
}

export default function FormDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Form"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      align="top"
      render={(id, v) => <SettingsForm key={id} v={v} />}
    />
  )
}
