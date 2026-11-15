import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { Spinner } from '@uisatin/ui/spinner'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  {
    id: 'use',
    label: 'Example',
    items: [
      { value: 'alone', label: 'Alone' },
      { value: 'text', label: 'With text' },
      { value: 'button', label: 'In a button' },
    ],
  },
  { id: 'size', label: 'Size', default: 'md', items: [{ value: 'xs', label: 'XS' }, { value: 'sm', label: 'SM' }, { value: 'md', label: 'MD' }, { value: 'lg', label: 'LG' }] },
]

function code(v: Record<string, string>) {
  const size = v.size !== 'md' ? ` size="${v.size}"` : ''
  if (v.use === 'button')
    return `import { Button } from '@uisatin/ui/button'

// The spinner takes the middle; the label keeps its room, so the button doesn't change width.
<Button loading={saving} onClick={save}>Save changes</Button>`
  if (v.use === 'text')
    return `import { Spinner } from '@uisatin/ui/spinner'

<p className="flex items-center gap-2 text-sm text-text-muted">
  <Spinner${size} label={null} />
  Syncing 24 files…
</p>`
  return `import { Spinner } from '@uisatin/ui/spinner'

<Spinner${size} />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: `${v.use} · ${v.size}`, code: code(v) }))

function SaveButton({ size }: { size: string }) {
  const [saving, setSaving] = React.useState(false)
  const b = { xs: 'xs', sm: 'md', md: 'lg', lg: 'xl' }[size] as 'md'
  return (
    <Button
      size={b}
      loading={saving}
      onClick={() => {
        setSaving(true)
        setTimeout(() => setSaving(false), 2000)
      }}
    >
      Save changes
    </Button>
  )
}

export default function SpinnerDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Spinner"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) =>
        v.use === 'button' ? (
          <SaveButton size={v.size} />
        ) : v.use === 'text' ? (
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Spinner size={v.size as 'md'} label={null} />
            Syncing 24 files…
          </p>
        ) : (
          <Spinner size={v.size as 'md'} className="text-text-default" />
        )
      }
    />
  )
}
