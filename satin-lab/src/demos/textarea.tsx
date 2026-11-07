import { Textarea } from '@satin/ui/textarea'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const hint = 'Shown to the host and printed on the kitchen ticket.'
const error = 'Keep it under 120 characters so it fits on the ticket.'
const long = 'Table by the window, one high chair. Guest is allergic to peanuts — please flag it for the kitchen.'
// Over the 120 limit, so the error state starts with text that earns it.
const tooLong = `${long} Birthday cake at 9, candles please.`

// Typing stays live in the stage. Content first (what sits around the field), the state last.
export const controls: ShowcaseControl[] = [
  { id: 'optional', label: 'Optional', type: 'switch', default: 'on' },
  { id: 'hint', label: 'Hint', type: 'switch', default: 'on' },
  { id: 'counter', label: 'Counter', type: 'switch', default: 'on' },
  {
    id: 'state',
    label: 'State',
    items: [{ value: 'default', label: 'Default' }, { value: 'error', label: 'Error' }, { value: 'disabled', label: 'Disabled' }],
  },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

const valueOf = (state: string) => (state === 'error' ? tooLong : state === 'disabled' ? long : undefined)

function code(v: Record<string, string>) {
  const value = valueOf(v.state)
  const attrs = [
    'label="Special requests"',
    v.optional === 'on' && 'optional',
    v.hint === 'on' && `hint="${hint}"`,
    v.state === 'error' && `error="${error}"`,
    v.counter === 'on' && 'maxLength={120}',
    value ? `defaultValue="${value}"` : 'placeholder="Allergies, seating, occasion…"',
    v.state === 'disabled' && 'disabled',
  ].filter(Boolean)
  return `import { Textarea } from '@satin/ui/textarea'

<Textarea
${attrs.map((a) => `  ${a}`).join('\n')}
/>`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    v.optional === 'on' ? 'Optional' : 'Required',
    v.hint === 'on' ? 'Hint' : 'No hint',
    v.counter === 'on' ? 'Counter' : 'No counter',
    labelOf('state', v.state),
  ].join(' · '),
  code: code(v),
}))

export default function TextareaDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Textarea"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="w-80 max-w-full">
          <Textarea
            // Remount when the state changes, so its starting text applies.
            key={v.state}
            label="Special requests"
            optional={v.optional === 'on'}
            hint={v.hint === 'on' ? hint : undefined}
            error={v.state === 'error' ? error : undefined}
            maxLength={v.counter === 'on' ? 120 : undefined}
            defaultValue={valueOf(v.state)}
            placeholder={valueOf(v.state) ? undefined : 'Allergies, seating, occasion…'}
            disabled={v.state === 'disabled'}
          />
        </div>
      )}
    />
  )
}
