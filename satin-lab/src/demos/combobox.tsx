import * as React from 'react'
import { Combobox } from '@satin/ui/combobox'
import { Apple } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const fruit = ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Grapes', 'Mango', 'Orange', 'Peach'].map((f) => ({ value: f.toLowerCase(), label: f }))
const label = 'Fruit'
const hint = 'Pick what goes into the box.'

// How picks work first, then the field around the trigger.
export const controls: ShowcaseControl[] = [
  { id: 'multiple', label: 'Multiple', type: 'switch', default: 'off' },
  { id: 'field', label: 'Label & hint', type: 'switch', default: 'on' },
  { id: 'leading', label: 'Leading icon', type: 'switch', default: 'off' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const attrs = [
    on(v, 'multiple') && 'multiple',
    on(v, 'field') ? `label="${label}"` : `aria-label="${label}"`,
    on(v, 'field') && `hint="${hint}"`,
    `placeholder="Select fruit"`,
    `searchPlaceholder="Search fruit…"`,
    on(v, 'leading') && 'leadingIcon={<Apple />}',
    'options={fruit}',
    'onValueChange={(picked) => save(picked)}',
  ].filter(Boolean)
  return `import { Combobox } from '@satin/ui/combobox'
${on(v, 'leading') ? "import { Apple } from 'iconoir-react'\n" : ''}
const fruit = [
${fruit.map((f) => `  { value: '${f.value}', label: '${f.label}' },`).join('\n')}
]

// Picks only apply on Apply, which stays disabled until something is picked.
<Combobox
${attrs.map((a) => `  ${a}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    on(v, 'multiple') ? 'Multiple' : 'Single',
    on(v, 'field') ? 'Label & hint' : 'No label',
    on(v, 'leading') ? 'Leading icon' : 'No leading icon',
  ].join(' · '),
  code: code(v),
}))

/** Open on load inside the stage, without taking focus from the page. */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const openedOnce = React.useRef(false)
  return (
    <div className="relative flex h-[400px] w-72 max-w-full flex-col pt-6">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
      {stage && (
        <Combobox
          container={stage}
          defaultOpen
          onOpenAutoFocus={(e) => {
            if (!openedOnce.current) e.preventDefault()
            openedOnce.current = true
          }}
          multiple={on(v, 'multiple')}
          label={on(v, 'field') ? label : undefined}
          aria-label={on(v, 'field') ? undefined : label}
          hint={on(v, 'field') ? hint : undefined}
          placeholder="Select fruit"
          searchPlaceholder="Search fruit…"
          leadingIcon={on(v, 'leading') ? <Apple /> : undefined}
          options={fruit}
        />
      )}
    </div>
  )
}

export default function ComboboxDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Combobox" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
