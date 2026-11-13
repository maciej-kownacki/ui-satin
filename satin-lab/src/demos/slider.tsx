import * as React from 'react'
import { Slider } from '@uisatin/ui/slider'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// One value or a range first, then where it runs, then what sits around it.
export const controls: ShowcaseControl[] = [
  { id: 'type', label: 'Type', items: [{ value: 'single', label: 'Single value' }, { value: 'range', label: 'Range' }] },
  { id: 'orientation', label: 'Orientation', items: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }] },
  { id: 'label', label: 'Label', type: 'switch', default: 'on' },
  { id: 'inputs', label: 'Inputs', type: 'switch', default: 'off' },
  { id: 'tooltip', label: 'Tooltip', type: 'switch', default: 'on' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

const props = (v: Record<string, string>) => {
  const range = v.type === 'range'
  return [
    range ? 'defaultValue={[20, 80]}' : 'defaultValue={40}',
    on(v, 'label') && (range ? 'label="Price"' : 'label="Volume"'),
    !on(v, 'label') && `aria-label="${range ? 'Price' : 'Volume'}"`,
    on(v, 'inputs') && 'inputs',
    on(v, 'tooltip') && 'tooltip',
    v.orientation === 'vertical' && 'orientation="vertical"',
  ].filter(Boolean) as string[]
}

function code(v: Record<string, string>) {
  const p = props(v)
  return `import { Slider } from '@uisatin/ui/slider'\n\n<Slider\n  ${p.join('\n  ')}\n/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.type === 'range' ? 'Range' : 'Single value', v.orientation === 'vertical' ? 'Vertical' : 'Horizontal'].join(' · '),
  code: code(v),
}))

export default function SliderDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Slider"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => {
        const range = v.type === 'range'
        const vertical = v.orientation === 'vertical'
        return (
          <div className={vertical ? 'flex justify-center' : 'w-80 max-w-full'}>
            <Slider
              // A fresh slider per combination, so switching Type starts from its own default.
              key={id}
              defaultValue={range ? [20, 80] : 40}
              label={on(v, 'label') ? (range ? 'Price' : 'Volume') : undefined}
              aria-label={range ? 'Price' : 'Volume'}
              inputs={on(v, 'inputs')}
              tooltip={on(v, 'tooltip')}
              orientation={vertical ? 'vertical' : 'horizontal'}
            />
          </div>
        )
      }}
    />
  )
}
