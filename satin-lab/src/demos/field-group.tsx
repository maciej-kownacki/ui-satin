import { Checkbox } from '@uisatin/ui/checkbox'
import { FieldGroup } from '@uisatin/ui/field-group'
import { FormField } from '@uisatin/ui/form-field'
import { Input } from '@uisatin/ui/input'
import { Radio, RadioGroup } from '@uisatin/ui/radio'
import { Switch } from '@uisatin/ui/switch'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// What the group holds comes first; layout places the legend; error and disabled are states.
export const controls: ShowcaseControl[] = [
  {
    id: 'content',
    label: 'Example',
    type: 'menu',
    items: [
      { value: 'address', label: 'Address (fields)' },
      { value: 'checkboxes', label: 'Checkboxes' },
      { value: 'radios', label: 'Radios' },
      { value: 'switches', label: 'Switches' },
    ],
  },
  { id: 'layout', label: 'Layout', items: [{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }] },
  { id: 'error', label: 'Error', type: 'switch', default: 'off' },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

const copy: Record<string, { legend: string; description: string; error: string }> = {
  address: { legend: 'Billing address', description: 'As it appears on your invoices.', error: 'Fill in the street and city' },
  checkboxes: { legend: 'Email me about', description: 'You can change this any time.', error: 'Pick at least one' },
  radios: { legend: 'Plan', description: 'Billed monthly, cancel any time.', error: 'Choose a plan' },
  switches: { legend: 'Agent permissions', description: 'What the agent may do without asking.', error: 'Allow at least reading' },
}

const bodies: Record<string, string> = {
  address: `  <FormField label="Street"><Input placeholder="1 Market St" /></FormField>
  <FormField label="City"><Input placeholder="Warsaw" /></FormField>
  <FormField label="Postcode"><Input placeholder="00-001" /></FormField>`,
  checkboxes: `  <Checkbox name="notify" value="mentions" label="Mentions" description="Someone @-mentions you." />
  <Checkbox name="notify" value="digest" label="Weekly digest" defaultChecked />
  <Checkbox name="notify" value="product" label="Product news" />`,
  radios: `  <RadioGroup name="plan" defaultValue="team">
    <Radio value="free" label="Free" description="Up to 3 people." />
    <Radio value="team" label="Team" description="$12 per person." />
    <Radio value="business" label="Business" description="SSO and audit log." />
  </RadioGroup>`,
  switches: `  <Switch name="read" label="Read files" defaultChecked />
  <Switch name="edit" label="Edit files" />
  <Switch name="send" label="Send email" />`,
}

const imports: Record<string, string> = {
  address: `import { FormField } from '@uisatin/ui/form-field'\nimport { Input } from '@uisatin/ui/input'`,
  checkboxes: `import { Checkbox } from '@uisatin/ui/checkbox'`,
  radios: `import { Radio, RadioGroup } from '@uisatin/ui/radio'`,
  switches: `import { Switch } from '@uisatin/ui/switch'`,
}

function code(v: Record<string, string>) {
  const c = copy[v.content]
  const attrs = [
    `legend="${c.legend}"`,
    `description="${c.description}"`,
    v.content !== 'address' && 'variant="choices"',
    v.content === 'address' && 'columns={2}',
    v.layout === 'horizontal' && 'layout="horizontal"',
    v.error === 'on' && `error="${c.error}"`,
    v.disabled === 'on' && 'disabled',
  ].filter(Boolean)
  // City and Postcode share a row; the street spans both.
  const body = v.content === 'address' ? bodies.address.replace('<FormField label="Street">', '<FormField label="Street" className="sm:col-span-2">') : bodies[v.content]
  return `import { FieldGroup } from '@uisatin/ui/field-group'
${imports[v.content]}

<FieldGroup
${attrs.map((a) => `  ${a}`).join('\n')}
>
${body}
</FieldGroup>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.content, v.layout, v.error === 'on' ? 'Error' : 'No error', v.disabled === 'on' ? 'Disabled' : 'Enabled'].join(' · '),
  code: code(v),
}))

function Body({ content }: { content: string }) {
  if (content === 'address')
    return (
      <>
        <FormField label="Street" className="sm:col-span-2">
          <Input placeholder="1 Market St" />
        </FormField>
        <FormField label="City">
          <Input placeholder="Warsaw" />
        </FormField>
        <FormField label="Postcode">
          <Input placeholder="00-001" />
        </FormField>
      </>
    )
  if (content === 'checkboxes')
    return (
      <>
        <Checkbox name="notify" value="mentions" label="Mentions" description="Someone @-mentions you." />
        <Checkbox name="notify" value="digest" label="Weekly digest" defaultChecked />
        <Checkbox name="notify" value="product" label="Product news" />
      </>
    )
  if (content === 'radios')
    return (
      <RadioGroup name="plan" defaultValue="team">
        <Radio value="free" label="Free" description="Up to 3 people." />
        <Radio value="team" label="Team" description="$12 per person." />
        <Radio value="business" label="Business" description="SSO and audit log." />
      </RadioGroup>
    )
  return (
    <>
      <Switch name="read" label="Read files" defaultChecked />
      <Switch name="edit" label="Edit files" />
      <Switch name="send" label="Send email" />
    </>
  )
}

export default function FieldGroupDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Field group"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => {
        const c = copy[v.content]
        return (
          <div className={v.layout === 'horizontal' ? 'w-[600px] max-w-full' : 'w-[400px] max-w-full'}>
            <FieldGroup
              key={id}
              legend={c.legend}
              description={c.description}
              variant={v.content === 'address' ? 'fields' : 'choices'}
              columns={v.content === 'address' ? 2 : 1}
              layout={v.layout as 'vertical' | 'horizontal'}
              error={v.error === 'on' ? c.error : undefined}
              disabled={v.disabled === 'on'}
            >
              <Body content={v.content} />
            </FieldGroup>
          </div>
        )
      }}
    />
  )
}
