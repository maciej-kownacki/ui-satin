import * as React from 'react'
import { FormField } from '@uisatin/ui/form-field'
import { SatinLabels } from '@uisatin/ui/labels'
import { DateTimePicker, TimePicker, type TimeValue } from '@uisatin/ui/time-picker'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Book a client demo: Thursday 26 November, 14:30, in 30-minute slots, nothing before 9:00.
// "Today" is pinned so the calendar reads the same every day.
const TODAY = new Date(2026, 10, 19)
const START = new Date(2026, 10, 26, 14, 30)
const NINE: TimeValue = { hours: 9, minutes: 0 }
const ERROR = 'Pick a slot from 9:00'

// What's picked first, then the locale that decides 12 or 24 hours, then the form's error.
export const controls: ShowcaseControl[] = [
  { id: 'kind', label: 'Kind', items: [{ value: 'datetime', label: 'Date and time' }, { value: 'time', label: 'Time' }] },
  { id: 'locale', label: 'Locale', items: [{ value: 'en-US', label: 'en-US (12h)' }, { value: 'en-GB', label: 'en-GB (24h)' }] },
  { id: 'error', label: 'Error', type: 'switch', default: 'off' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const gb = v.locale === 'en-GB'
  const error = on(v, 'error') ? `\n  errors={{ ${v.kind === 'time' ? 'start' : 'when'}: '${ERROR}' }}` : ''
  const wrap = (body: string) =>
    gb
      ? `// en-GB writes times in 24 hours, so the picker does too (format="12h" or "24h" overrides it).
<SatinLabels labels={{ dateLocale: 'en-GB' }}>
${body.replace(/^/gm, '  ')}
</SatinLabels>`
      : body
  return v.kind === 'time'
    ? `import * as React from 'react'
import { Form } from '@uisatin/ui/form'
import { FormField } from '@uisatin/ui/form-field'${gb ? `\nimport { SatinLabels } from '@uisatin/ui/labels'` : ''}
import { TimePicker, type TimeValue } from '@uisatin/ui/time-picker'

const [start, setStart] = React.useState<TimeValue | null>({ hours: 14, minutes: 30 })

// Type "930", "9:30pm" or "1430", or pick from the list. Times before 9:00 are dimmed.
${wrap(`<Form onSubmitValues={book}${error}>
  <FormField label="Start time" name="start" description="30-minute slots from 9:00.">
    <TimePicker value={start} onValueChange={setStart} step={30} min={{ hours: 9, minutes: 0 }} />
  </FormField>
</Form>`)}`
    : `import * as React from 'react'
import { Form } from '@uisatin/ui/form'
import { FormField } from '@uisatin/ui/form-field'${gb ? `\nimport { SatinLabels } from '@uisatin/ui/labels'` : ''}
import { DateTimePicker } from '@uisatin/ui/time-picker'

const [when, setWhen] = React.useState<Date | null>(new Date(2026, 10, 26, 14, 30))

// Pick a day, then a time; the time closes it. Submits "2026-11-26T14:30" as "when".
${wrap(`<Form onSubmitValues={book}${error}>
  <FormField label="Date and time" name="when" description="30-minute slots from 9:00.">
    <DateTimePicker value={when} onValueChange={setWhen} step={30} minTime={{ hours: 9, minutes: 0 }} />
  </FormField>
</Form>`)}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.kind === 'time' ? 'Time' : 'Date and time', v.locale, on(v, 'error') ? 'Error' : 'No error'].join(' · '),
  code: code(v),
}))

/**
 * Open on load inside the stage, without taking focus from the page; changing a prop in the bar
 * under the stage keeps it open. Switching the kind starts that kind over, open.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(true)
  const [when, setWhen] = React.useState<Date | null>(START)
  const [start, setStart] = React.useState<TimeValue | null>({ hours: 14, minutes: 30 })
  const keepOpen = (e: Event) => {
    if ((e.target as HTMLElement | null)?.closest('[data-showcase-controls]')) e.preventDefault()
  }
  const error = on(v, 'error') ? ERROR : undefined
  return (
    <SatinLabels labels={{ dateLocale: v.locale }}>
      <div className="relative flex h-[460px] w-[440px] max-w-full flex-col gap-4 pt-6 max-[480px]:h-[720px]">
        <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
        <p className="text-base leading-5 font-medium text-text-default">Book a client demo</p>
        {stage &&
          (v.kind === 'time' ? (
            <FormField label="Start time" name="start" description="30-minute slots from 9:00." error={error}>
              <TimePicker
                container={stage}
                open={open}
                onOpenChange={setOpen}
                onInteractOutside={keepOpen}
                value={start}
                onValueChange={setStart}
                step={30}
                min={NINE}
              />
            </FormField>
          ) : (
            <FormField label="Date and time" name="when" description="30-minute slots from 9:00." error={error}>
              <DateTimePicker
                container={stage}
                open={open}
                onOpenChange={setOpen}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={keepOpen}
                value={when}
                onValueChange={setWhen}
                step={30}
                minTime={NINE}
                today={TODAY}
              />
            </FormField>
          ))}
      </div>
    </SatinLabels>
  )
}

export default function TimePickerDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Time picker" options={options} codeHtml={codeHtml} controls={controls} render={(_, v) => <Preview key={v.kind} v={v} />} />
}
