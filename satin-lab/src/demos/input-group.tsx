import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { FormField } from '@uisatin/ui/form-field'
import { Input } from '@uisatin/ui/input'
import { InputGroup, InputGroupAddon } from '@uisatin/ui/input-group'
import { Select } from '@uisatin/ui/select'
import { Check, Copy } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  {
    id: 'example',
    label: 'Example',
    type: 'menu',
    items: [
      { value: 'url', label: 'Addons' },
      { value: 'copy', label: 'Copy button' },
      { value: 'subscribe', label: 'Primary action' },
      { value: 'phone', label: 'Select + input' },
      { value: 'inline', label: 'Text inside the field' },
    ],
  },
  { id: 'size', label: 'Size', default: 'md', items: [{ value: 'sm', label: 'SM' }, { value: 'md', label: 'MD' }, { value: 'lg', label: 'LG' }] },
]

const codes: Record<string, (size: string) => string> = {
  url: (s) => `<FormField label="Workspace URL">
  <InputGroup${s}>
    <InputGroupAddon>https://</InputGroupAddon>
    <Input placeholder="acme" />
    <InputGroupAddon>.satin.dev</InputGroupAddon>
  </InputGroup>
</FormField>`,
  copy: (s) => `<FormField label="Invite link" description="Anyone with the link can join as a viewer.">
  <InputGroup${s}>
    <Input readOnly value="https://satin.dev/join/8f2k-q91x" />
    <Button onClick={copy}>{copied ? <Check /> : <Copy />}Copy</Button>
  </InputGroup>
</FormField>`,
  subscribe: (s) => `<InputGroup${s}>
  <Input type="email" placeholder="name@company.com" aria-label="Email" />
  <Button variant="primary">Subscribe</Button>
</InputGroup>`,
  phone: (s) => `<FormField label="Phone">
  <InputGroup${s}>
    <Select aria-label="Country code" defaultValue="+48" options={codes} />
    <Input type="tel" placeholder="600 100 200" />
  </InputGroup>
</FormField>`,
  inline: (s) => `// Text that belongs inside the field is a prop of Input, not an addon.
<FormField label="Monthly budget">
  <Input${s.replace('size', 'size')} leadingText="$" trailingText="USD" placeholder="0.00" inputMode="decimal" />
</FormField>`,
}

function code(v: Record<string, string>) {
  const s = v.size !== 'md' ? ` size="${v.size}"` : ''
  const imports = v.example === 'inline'
    ? `import { FormField } from '@uisatin/ui/form-field'\nimport { Input } from '@uisatin/ui/input'`
    : `import { InputGroup${v.example === 'url' ? ', InputGroupAddon' : ''} } from '@uisatin/ui/input-group'
import { Input } from '@uisatin/ui/input'${v.example === 'copy' || v.example === 'subscribe' ? "\nimport { Button } from '@uisatin/ui/button'" : ''}${v.example === 'phone' ? "\nimport { Select } from '@uisatin/ui/select'" : ''}${v.example !== 'subscribe' ? "\nimport { FormField } from '@uisatin/ui/form-field'" : ''}`
  return `${imports}

${codes[v.example](s)}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: `${v.example} · ${v.size}`, code: code(v) }))

const countries = ['+1', '+44', '+48', '+49'].map((c) => ({ value: c, label: c }))

function CopyGroup({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <FormField label="Invite link" description="Anyone with the link can join as a viewer.">
      <InputGroup size={size}>
        <Input readOnly value="https://satin.dev/join/8f2k-q91x" />
        <Button
          onClick={() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          Copy
        </Button>
      </InputGroup>
    </FormField>
  )
}

export default function InputGroupDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Input group"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => {
        const size = v.size as 'sm' | 'md' | 'lg'
        return (
          <div className="w-[380px] max-w-full">
            {v.example === 'url' && (
              <FormField label="Workspace URL">
                <InputGroup size={size}>
                  <InputGroupAddon>https://</InputGroupAddon>
                  <Input placeholder="acme" />
                  <InputGroupAddon>.satin.dev</InputGroupAddon>
                </InputGroup>
              </FormField>
            )}
            {v.example === 'copy' && <CopyGroup size={size} />}
            {v.example === 'subscribe' && (
              <InputGroup size={size}>
                <Input type="email" placeholder="name@company.com" aria-label="Email" />
                <Button variant="primary">Subscribe</Button>
              </InputGroup>
            )}
            {v.example === 'phone' && (
              <FormField label="Phone">
                <InputGroup size={size}>
                  <Select aria-label="Country code" defaultValue="+48" options={countries} />
                  <Input type="tel" placeholder="600 100 200" />
                </InputGroup>
              </FormField>
            )}
            {v.example === 'inline' && (
              <FormField label="Monthly budget">
                <Input size={size} leadingText="$" trailingText="USD" placeholder="0.00" inputMode="decimal" />
              </FormField>
            )}
          </div>
        )
      }}
    />
  )
}
