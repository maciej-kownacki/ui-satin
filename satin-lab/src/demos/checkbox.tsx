import * as React from 'react'
import { Checkbox } from '@satin/ui'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

export const options: ShowcaseOption[] = [
  {
    id: 'label',
    label: 'Label',
    code: `import { Checkbox } from '@satin/ui/checkbox'

<Checkbox label="Remember me" defaultChecked />`,
  },
  {
    id: 'description',
    label: 'Description',
    code: `import { Checkbox } from '@satin/ui/checkbox'

<Checkbox
  label="Email notifications"
  description="Send me a summary of new orders every evening."
/>`,
  },
  {
    id: 'group',
    label: 'Select all',
    code: `import { Checkbox } from '@satin/ui/checkbox'

const all = items.every((i) => i.checked)
const some = items.some((i) => i.checked)

<Checkbox
  label="All channels"
  checked={all ? true : some ? 'indeterminate' : false}
  onCheckedChange={(v) => setAll(v === true)}
/>`,
  },
]

const channels = ['Email', 'SMS', 'Push']

function SelectAll() {
  const [checked, setChecked] = React.useState<Record<string, boolean>>({ Email: true, SMS: false, Push: true })
  const values = Object.values(checked)
  const all = values.every(Boolean)
  const some = values.some(Boolean)
  return (
    <div className="grid gap-3">
      <Checkbox
        label="All channels"
        checked={all ? true : some ? 'indeterminate' : false}
        onCheckedChange={(v) => setChecked(Object.fromEntries(channels.map((c) => [c, v === true])))}
      />
      <div className="grid gap-3 pl-6">
        {channels.map((c) => (
          <Checkbox
            key={c}
            label={c}
            checked={checked[c]}
            onCheckedChange={(v) => setChecked((s) => ({ ...s, [c]: v === true }))}
          />
        ))}
      </div>
    </div>
  )
}

export default function CheckboxDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Checkbox"
      options={options}
      codeHtml={codeHtml}
      render={(id) =>
        id === 'label' ? (
          <Checkbox label="Remember me" defaultChecked />
        ) : id === 'description' ? (
          <div className="max-w-80">
            <Checkbox label="Email notifications" description="Send me a summary of new orders every evening." />
          </div>
        ) : (
          <SelectAll />
        )
      }
    />
  )
}
