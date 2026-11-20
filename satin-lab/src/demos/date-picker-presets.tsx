import * as React from 'react'
import { DatePickerPanel, DateRangePickerPanel, datePresets, type DateRange } from '@uisatin/ui/date-picker'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// The presets section of the Date picker page: a marketing report opens on Last 30 days, then
// the reader compares it with a range picked by hand. Pinned to a fixed "today", like the page's
// first demo, so the docs read the same every day.
const TODAY = new Date(2026, 10, 11)

export const controls: ShowcaseControl[] = [
  { id: 'kind', label: 'Kind', items: [{ value: 'range', label: 'Range picker' }, { value: 'date', label: 'Date picker' }] },
  { id: 'value', label: 'Value', items: [{ value: 'preset', label: 'Preset' }, { value: 'custom', label: 'Custom' }] },
]

const rangePresets = [datePresets.today, datePresets.last7Days, datePresets.last30Days, datePresets.thisQuarter]
const dayPresets = [datePresets.today, datePresets.tomorrow, datePresets.nextWeek]

// Last 30 days ends today; the custom range matches no preset.
const RANGES: Record<string, DateRange> = {
  preset: { from: new Date(2026, 9, 13), to: new Date(2026, 10, 11) },
  custom: { from: new Date(2026, 9, 26), to: new Date(2026, 10, 8) },
}
const DAYS: Record<string, Date> = { preset: new Date(2026, 10, 12), custom: new Date(2026, 10, 20) }

const code = (v: Record<string, string>) =>
  v.kind === 'range'
    ? `import * as React from 'react'
import { DateRangePicker, datePresets, type DateRange } from '@uisatin/ui/date-picker'

const presets = [datePresets.today, datePresets.last7Days, datePresets.last30Days, datePresets.thisQuarter]

export function MarketingReport() {
${
  v.value === 'preset'
    ? `  // Opens on Last 30 days, the preset most reports start from.
  const [period, setPeriod] = React.useState<DateRange>({ from: new Date(2026, 9, 13), to: new Date(2026, 10, 11) })`
    : `  // Two weeks picked by hand to compare with: no preset is selected.
  const [period, setPeriod] = React.useState<DateRange>({ from: new Date(2026, 9, 26), to: new Date(2026, 10, 8) })`
}

  return <DateRangePicker label="Report period" presets={presets} value={period} onValueChange={setPeriod} />
}`
    : `import * as React from 'react'
import { DatePicker, datePresets } from '@uisatin/ui/date-picker'

const presets = [datePresets.today, datePresets.tomorrow, datePresets.nextWeek]

export function SendReport() {
  const [day, setDay] = React.useState<Date | null>(${v.value === 'preset' ? 'new Date(2026, 10, 12)' : 'new Date(2026, 10, 20)'})

  return <DatePicker label="Send the report on" presets={presets} value={day} onValueChange={setDay} />
}`

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: `${v.kind === 'range' ? 'Range picker' : 'Date picker'}, ${v.value === 'preset' ? 'preset' : 'custom'}`,
  code: code(v),
}))

function Live({ kind, value }: { kind: string; value: string }) {
  const [day, setDay] = React.useState<Date | null>(DAYS[value])
  const [range, setRange] = React.useState<DateRange>(RANGES[value])
  if (kind === 'range')
    return <DateRangePickerPanel key={`${range.from}-${range.to}`} value={range} onApply={setRange} presets={rangePresets} today={TODAY} />
  return <DatePickerPanel value={day} onValueChange={setDay} presets={dayPresets} today={TODAY} />
}

export default function DatePickerPresetsDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Date picker presets"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => <Live key={`${v.kind}-${v.value}`} kind={v.kind} value={v.value} />}
    />
  )
}
