/* Type test, never run: the time pickers controlled and uncontrolled, their parts, and refs typed by element. */
import * as React from 'react'
import {
  DateTimePicker,
  DateTimePickerPanel,
  TimeList,
  TimePicker,
  formatTime,
  parseTime,
  type TimeFormat,
  type TimeValue,
} from '../components/time-picker'

const nine: TimeValue = { hours: 9, minutes: 0 }
const format: TimeFormat = '24h'

// Controlled: the value is `{ hours, minutes }`, null when cleared or typed wrong.
export function Controlled() {
  const [time, setTime] = React.useState<TimeValue | null>(null)
  const [open, setOpen] = React.useState(false)
  return <TimePicker label="Start" value={time} onValueChange={setTime} open={open} onOpenChange={setOpen} step={15} min={nine} max={{ hours: 18, minutes: 0 }} format={format} />
}

// Uncontrolled, with the input's own attributes and a ref to the <input>.
export const uncontrolled = (
  <TimePicker
    defaultValue={nine}
    defaultOpen
    name="start"
    placeholder="9:00"
    isTimeDisabled={(t) => t.hours === 12}
    size="sm"
    aria-label="Start"
    data-testid="x"
    onKeyDown={() => {}}
    ref={React.createRef<HTMLInputElement>()}
  />
)

export const list = <TimeList value={nine} onValueChange={(t: TimeValue) => t.hours} step={30} aria-label="Times" ref={React.createRef<HTMLDivElement>()} />
export const listUncontrolled = <TimeList defaultValue={null} format="12h" className="h-60" />

export function DateAndTime() {
  const [when, setWhen] = React.useState<Date | null>(new Date(2026, 10, 26, 14, 30))
  return (
    <DateTimePicker
      label="Demo"
      value={when}
      onValueChange={setWhen}
      step={30}
      minTime={nine}
      min={new Date(2026, 10, 19)}
      isTimeDisabled={(t: TimeValue, day: Date | null) => !!day && day.getDay() === 5 && t.hours >= 16}
      name="when"
      ref={React.createRef<HTMLButtonElement>()}
    />
  )
}

export const dateTimeUncontrolled = <DateTimePicker defaultValue={null} defaultOpen onOpenChange={(o: boolean) => o} aria-label="When" />
export const panel = <DateTimePickerPanel value={null} onValueChange={(d: Date) => d.getTime()} today={new Date()} ref={React.createRef<HTMLDivElement>()} />

export const parsed: TimeValue | null = parseTime('9:30pm', 'en-US')
export const written: string = formatTime(nine, 'pl-PL', '24h')

// @ts-expect-error: the value is an object, not a string
export const wrongValue = <TimePicker value="09:00" />
// @ts-expect-error: TimePicker's ref is the <input>
export const wrongRef = <TimePicker ref={React.createRef<HTMLButtonElement>()} />
// @ts-expect-error: the date-time value is a Date
export const wrongDate = <DateTimePicker value={nine} />
