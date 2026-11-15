import * as React from 'react'
import { ActionButton } from '@uisatin/ui/action-button'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// What the button looks like first, then how the action ends: done, or failed and ready again.
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
  { id: 'result', label: 'Result', items: [{ value: 'success', label: 'Succeeds' }, { value: 'error', label: 'Fails' }] },
]

function code(v: Record<string, string>) {
  const attrs = [
    v.variant !== 'primary' && `variant="${v.variant}"`,
    v.size !== 'md' && `size="${v.size}"`,
    v.shape !== 'default' && `shape="${v.shape}"`,
  ].filter(Boolean)
  const fails = v.result === 'error'
  return `import { ActionButton } from '@uisatin/ui/action-button'

// The spinner shows until the promise settles, then a checkmark for 1.8s.${fails ? '\n// If it rejects, the button is ready again and the error is yours to show.' : ''}
<ActionButton${attrs.length ? ` ${attrs.join(' ')}` : ''}
  onAction={() => fetch('/api/submit', { method: 'POST' })}${fails ? "\n  onError={() => setError('Couldn’t submit. Try again.')}" : ''}
>
  Submit
</ActionButton>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: Object.values(v).join(' · '), code: code(v) }))

function Stage({ v }: { v: Record<string, string> }) {
  const [error, setError] = React.useState<string | null>(null)
  return (
    <div className="grid justify-items-center gap-3">
      <ActionButton
        variant={v.variant as 'primary'}
        size={v.size as 'md'}
        shape={v.shape as 'default'}
        onAction={() => {
          setError(null)
          return new Promise((resolve, reject) => setTimeout(v.result === 'error' ? () => reject(new Error('failed')) : resolve, 1400))
        }}
        onError={() => setError('Couldn’t submit. Try again.')}
      >
        Submit
      </ActionButton>
      <p className="h-5 text-sm text-text-muted" aria-live="polite">
        {error}
      </p>
    </div>
  )
}

export default function ActionButtonDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Action button" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Stage key={id} v={v} />} />
}
