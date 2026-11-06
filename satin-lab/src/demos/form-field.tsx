import { FormField } from '@satin/ui/form-field'
import { Input } from '@satin/ui/input'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

export const options: ShowcaseOption[] = [
  {
    id: 'vertical',
    label: 'Vertical',
    code: `import { FormField } from '@satin/ui/form-field'
import { Input } from '@satin/ui/input'

<FormField label="Phone number" description="We text you when your table is ready." required>
  <Input placeholder="+48 600 123 456" />
</FormField>`,
  },
  {
    id: 'horizontal',
    label: 'Horizontal',
    code: `import { FormField } from '@satin/ui/form-field'
import { Input } from '@satin/ui/input'

<FormField
  layout="horizontal"
  label="Workspace name"
  description="Shown in the sidebar and in invites."
  required
>
  <Input defaultValue="Acme Studio" />
</FormField>`,
  },
  {
    id: 'error',
    label: 'Error',
    code: `import { FormField } from '@satin/ui/form-field'
import { Input } from '@satin/ui/input'

<FormField label="Email" error="Enter an email address, e.g. name@company.com" required>
  <Input defaultValue="name@company" />
</FormField>`,
  },
  {
    id: 'disabled',
    label: 'Disabled',
    code: `import { FormField } from '@satin/ui/form-field'
import { Input } from '@satin/ui/input'

<FormField label="Email" description="Managed by your company's SSO." disabled required>
  <Input placeholder="maciej@satin.design" />
</FormField>`,
  },
]

export default function FormFieldDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Form field"
      options={options}
      codeHtml={codeHtml}
      render={(id) =>
        id === 'horizontal' ? (
          <div className="w-[520px] max-w-full">
            <FormField layout="horizontal" label="Workspace name" description="Shown in the sidebar and in invites." required>
              <Input defaultValue="Acme Studio" />
            </FormField>
          </div>
        ) : (
          <div className="w-80 max-w-full">
            {id === 'vertical' ? (
              <FormField label="Phone number" description="We text you when your table is ready." required>
                <Input placeholder="+48 600 123 456" />
              </FormField>
            ) : id === 'error' ? (
              <FormField label="Email" error="Enter an email address, e.g. name@company.com" required>
                <Input defaultValue="name@company" />
              </FormField>
            ) : (
              <FormField label="Email" description="Managed by your company's SSO." disabled required>
                <Input placeholder="maciej@satin.design" />
              </FormField>
            )}
          </div>
        )
      }
    />
  )
}
