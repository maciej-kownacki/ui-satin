import { SplitButton } from '@uisatin/ui/split-button'
import { DropdownMenuItem } from '@uisatin/ui/dropdown'
import * as React from 'react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  {
    id: 'variant',
    label: 'Variant',
    type: 'menu',
    items: [
      { value: 'primary', label: 'Primary' },
      { value: 'secondary', label: 'Secondary' },
      { value: 'inverse', label: 'Inverse' },
      { value: 'destructive', label: 'Destructive' },
    ],
  },
  { id: 'size', label: 'Size', default: 'md', items: [{ value: 'xs', label: 'XS' }, { value: 'md', label: 'MD' }, { value: 'lg', label: 'LG' }, { value: 'xl', label: 'XL' }] },
  { id: 'shape', label: 'Shape', items: [{ value: 'default', label: 'Default' }, { value: 'rounded', label: 'Rounded' }] },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

// Each variant with a main action and its variations, the way they'd ship.
const examples: Record<string, { label: string; items: string[] }> = {
  primary: { label: 'Publish', items: ['Schedule…', 'Publish to staging', 'Save as draft'] },
  secondary: { label: 'Export', items: ['Export as PDF', 'Export as PNG', 'Copy link'] },
  inverse: { label: 'Run agent', items: ['Run on selection', 'Run every morning…', 'Dry run'] },
  destructive: { label: 'Delete', items: ['Archive instead', 'Delete for everyone'] },
}

function code(v: Record<string, string>) {
  const ex = examples[v.variant]
  const attrs = [
    v.variant !== 'primary' && `variant="${v.variant}"`,
    v.size !== 'md' && `size="${v.size}"`,
    v.shape !== 'default' && `shape="${v.shape}"`,
    v.disabled === 'on' && 'disabled',
  ].filter(Boolean)
  return `import { SplitButton } from '@uisatin/ui/split-button'
import { DropdownMenuItem } from '@uisatin/ui/dropdown'

<SplitButton${attrs.length ? ` ${attrs.join(' ')}` : ''}
  onClick={() => run('${ex.label}')}
  menu={
    <>
${ex.items.map((i) => `      <DropdownMenuItem label="${i}" onSelect={() => run('${i}')} />`).join('\n')}
    </>
  }
>
  ${ex.label}
</SplitButton>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.variant, v.size, v.shape, v.disabled === 'on' ? 'Disabled' : 'Enabled'].join(' · '),
  code: code(v),
}))

export default function SplitButtonDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Split button"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => <Stage v={v} />}
    />
  )
}

// What the last click ran, under the button, so both halves can be tried.
function Stage({ v }: { v: Record<string, string> }) {
  const ex = examples[v.variant]
  const [ran, setRan] = React.useState<string | null>(null)
  return (
    <div className="grid justify-items-center gap-3">
      <SplitButton
        variant={v.variant as 'primary'}
        size={v.size as 'md'}
        shape={v.shape as 'default'}
        disabled={v.disabled === 'on'}
        onClick={() => setRan(ex.label)}
        menu={ex.items.map((i) => (
          <DropdownMenuItem key={i} label={i} onSelect={() => setRan(i)} />
        ))}
      >
        {ex.label}
      </SplitButton>
      <p className="h-5 text-sm text-text-muted" aria-live="polite">
        {ran && `Ran: ${ran}`}
      </p>
    </div>
  )
}
