import * as React from 'react'
import { DatePickerPanel, DateRangePickerPanel, type DateRange } from '@uisatin/ui/date-picker'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Pinned to a fixed "today" so the docs read the same every day.
const TODAY = new Date(2026, 10, 11)

// The panels on their own, as in the kit. In a form, `DatePicker` and `DateRangePicker` put the
// same panels in a popover under an Input-like field.
export const controls: ShowcaseControl[] = [
  { id: 'kind', label: 'Kind', items: [{ value: 'date', label: 'Date picker' }, { value: 'range', label: 'Range picker' }] },
]

const code = (v: Record<string, string>) =>
  v.kind === 'range'
    ? `import * as React from 'react'
import { DateRangePicker, DateRangePickerPanel, type DateRange } from '@uisatin/ui/date-picker'

export function Period() {
  const [range, setRange] = React.useState<DateRange>({ from: new Date(2026, 10, 23), to: new Date(2026, 10, 27) })

  // In a form: a field that opens the panel.
  return <DateRangePicker label="Period" value={range} onValueChange={setRange} />

  // Or the panel in place, e.g. inside your own popover:
  // return <DateRangePickerPanel value={range} onApply={setRange} />
}`
    : `import * as React from 'react'
import { DatePicker, DatePickerPanel } from '@uisatin/ui/date-picker'

export function Delivery() {
  const [day, setDay] = React.useState<Date | null>(new Date(2026, 10, 18))

  // In a form: a field that opens the panel.
  return <DatePicker label="Delivery date" value={day} onValueChange={setDay} />

  // Or the panel in place:
  // return <DatePickerPanel value={day} onValueChange={setDay} />
}`

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: v.kind === 'range' ? 'Range picker' : 'Date picker', code: code(v) }))

function Live({ kind }: { kind: string }) {
  const [day, setDay] = React.useState<Date | null>(new Date(2026, 10, 18))
  const [range, setRange] = React.useState<DateRange>({ from: new Date(2026, 10, 23), to: new Date(2026, 10, 27) })
  if (kind === 'range') return <DateRangePickerPanel key={`${range.from}-${range.to}`} value={range} onApply={setRange} today={TODAY} />
  return <DatePickerPanel value={day} onValueChange={setDay} today={TODAY} />
}

export default function DatePickerDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Date picker" options={options} codeHtml={codeHtml} controls={controls} render={(_, v) => <Live key={v.kind} kind={v.kind} />} />
}
