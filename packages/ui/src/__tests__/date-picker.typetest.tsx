/* Type test, never run: the date pickers' presets, controlled and uncontrolled, the parts and `ref`. */
import * as React from 'react'
import {
  Calendar,
  DatePicker,
  DatePickerPanel,
  DateRangePicker,
  DateRangePickerPanel,
  datePresets,
  type DatePreset,
  type DateRange,
  type WeekDay,
} from '../components/date-picker'

// Presets of a day, built in and the app's own: a fixed date, or a function of today.
const dayPresets: DatePreset<Date>[] = [
  datePresets.today,
  datePresets.tomorrow,
  datePresets.nextWeek,
  { label: 'Launch day', value: new Date(2026, 11, 1) },
  { label: (labels) => labels.presetToday, value: (today) => today },
  { label: 'Next Monday', value: (today, { weekStartsOn }) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + ((8 - today.getDay() + weekStartsOn) % 7 || 7)) },
]

// Presets of a range; a day becomes a one-day range.
const rangePresets: DatePreset<DateRange | Date>[] = [
  datePresets.today,
  datePresets.last7Days,
  datePresets.last30Days,
  datePresets.thisQuarter,
  { label: 'Black Friday week', value: { from: new Date(2026, 10, 23), to: new Date(2026, 10, 29) } },
  { label: 'Year to date', value: (today): DateRange => ({ from: new Date(today.getFullYear(), 0, 1), to: today }) },
]

// Uncontrolled and controlled, with presets and a week start.
export const uncontrolled = <DatePicker label="Due" defaultValue={null} presets={dayPresets} weekStartsOn={1} />
export function Controlled() {
  const [day, setDay] = React.useState<Date | null>(null)
  const [range, setRange] = React.useState<DateRange>({ from: null, to: null })
  return (
    <>
      <DatePicker label="Due" value={day} onValueChange={setDay} presets={dayPresets} ref={React.createRef<HTMLButtonElement>()} />
      <DateRangePicker label="Period" value={range} onValueChange={setRange} presets={rangePresets} weekStartsOn={0} ref={React.createRef<HTMLButtonElement>()} />
      <DateRangePicker label="Period" defaultValue={{ from: null, to: null }} presets={rangePresets} />
    </>
  )
}

// The parts in place take the same presets; `ref` goes to the surface.
export const panels = (
  <>
    <DatePickerPanel value={null} onValueChange={() => {}} presets={dayPresets} weekStartsOn={6} ref={React.createRef<HTMLDivElement>()} />
    <DateRangePickerPanel value={{ from: null, to: null }} onApply={() => {}} presets={rangePresets} ref={React.createRef<HTMLDivElement>()} />
    <Calendar mode="range" months={2} weekStartsOn={0} ref={React.createRef<HTMLDivElement>()} />
  </>
)

// A day picker takes no range presets…
// @ts-expect-error last7Days is a range
export const noRangeInDayPicker = <DatePicker presets={[datePresets.last7Days]} />
// @ts-expect-error a range value
export const noRangeValue = <DatePickerPanel presets={[{ label: 'Week', value: { from: null, to: null } }]} />
// …the week starts on a day of the week, 0 to 6…
// @ts-expect-error 7 is not a day
export const noEighthDay = <Calendar weekStartsOn={7} />
// …and a preset needs a label.
// @ts-expect-error label missing
export const noLabel: DatePreset<Date> = { value: new Date() }

// The helpers keep their names and kinds.
export const kinds: [DatePreset<Date>, DatePreset<DateRange>] = [datePresets.nextWeek, datePresets.thisQuarter]
export const monday: WeekDay = 1
