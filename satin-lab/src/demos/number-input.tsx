import * as React from 'react'
import { NumberInput } from '@uisatin/ui/number-input'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', items: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }], default: 'md' },
  { id: 'label', label: 'Label', type: 'switch', default: 'on' },
]

function code(v: Record<string, string>) {
  const attrs = [v.label === 'on' ? 'label="Guests"' : 'aria-label="Guests"', 'hint="Up to 12 per table"', 'min={1}', 'max={12}', v.size !== 'md' && `size="${v.size}"`].filter(Boolean)
  return `import * as React from 'react'
import { NumberInput } from '@uisatin/ui/number-input'

export function Guests() {
  const [guests, setGuests] = React.useState(4)
  return <NumberInput ${attrs.join(' ')} value={guests} onValueChange={setGuests} />
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: `${v.size} · ${v.label === 'on' ? 'Label' : 'No label'}`, code: code(v) }))

function Live({ v }: { v: Record<string, string> }) {
  const [guests, setGuests] = React.useState(4)
  return (
    <div className="w-40">
      <NumberInput
        label={v.label === 'on' ? 'Guests' : undefined}
        aria-label="Guests"
        hint="Up to 12 per table"
        min={1}
        max={12}
        size={v.size as 'sm' | 'md' | 'lg'}
        value={guests}
        onValueChange={setGuests}
      />
    </div>
  )
}

export default function NumberInputDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Number input" options={options} codeHtml={codeHtml} controls={controls} render={(_, v) => <Live v={v} />} />
}
