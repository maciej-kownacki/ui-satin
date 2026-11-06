import * as React from 'react'
import { Textarea } from '@satin/ui/textarea'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const long = 'Table by the window, one high chair. Guest is allergic to peanuts — please flag it for the kitchen.'

export const options: ShowcaseOption[] = [
  {
    id: 'counter',
    label: 'Counter',
    code: `import { Textarea } from '@satin/ui/textarea'

<Textarea
  label="Special requests"
  optional
  hint="Shown to the host and printed on the kitchen ticket."
  maxLength={120}
  placeholder="Allergies, seating, occasion…"
/>`,
  },
  {
    id: 'error',
    label: 'Error',
    code: `import { Textarea } from '@satin/ui/textarea'

const [value, setValue] = React.useState(text)
const tooLong = value.length > 120

<Textarea
  label="Special requests"
  optional
  hint="Shown to the host and printed on the kitchen ticket."
  error={tooLong && 'Keep it under 120 characters so it fits on the ticket.'}
  maxLength={120}
  value={value}
  onChange={setValue}
/>`,
  },
  {
    id: 'disabled',
    label: 'Disabled',
    code: `import { Textarea } from '@satin/ui/textarea'

<Textarea
  label="Special requests"
  optional
  hint="Shown to the host and printed on the kitchen ticket."
  defaultValue="${long}"
  disabled
/>`,
  },
]

function TooLong() {
  const [value, setValue] = React.useState(`${long} Birthday cake at 9.`)
  const tooLong = value.length > 120
  return (
    <Textarea
      label="Special requests"
      optional
      hint="Shown to the host and printed on the kitchen ticket."
      error={tooLong && 'Keep it under 120 characters so it fits on the ticket.'}
      maxLength={120}
      value={value}
      onChange={setValue}
    />
  )
}

export default function TextareaDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Textarea"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <div className="w-80 max-w-full">
          {id === 'counter' ? (
            <Textarea
              label="Special requests"
              optional
              hint="Shown to the host and printed on the kitchen ticket."
              maxLength={120}
              placeholder="Allergies, seating, occasion…"
            />
          ) : id === 'error' ? (
            <TooLong />
          ) : (
            <Textarea
              label="Special requests"
              optional
              hint="Shown to the host and printed on the kitchen ticket."
              defaultValue={long}
              disabled
            />
          )}
        </div>
      )}
    />
  )
}
