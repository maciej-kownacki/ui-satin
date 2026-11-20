/* Type test, never run: Calendar's day hooks (isDisabled, renderDay, CalendarDay) and the pickers that pass them on. */
import * as React from 'react'
import { Calendar, CalendarDay, DatePicker, DatePickerPanel, DateRangePicker, DateRangePickerPanel, type CalendarDayState } from '../components/date-picker'
import { Tooltip } from '../components/tooltip'

const weekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
const dayRef = React.createRef<HTMLButtonElement>()

export const hooks = (
  <Calendar
    isDisabled={weekend}
    renderDay={(date, state) => (
      <Tooltip label={state.disabled ? 'Closed' : state.label}>
        <CalendarDay ref={dayRef} aria-label={`${state.label}, ${date.getDate()}`} data-mark="x" onFocus={() => {}}>
          {date.getDate()}
        </CalendarDay>
      </Tooltip>
    )}
  />
)

export const state = (s: CalendarDayState): boolean => s.today && s.selected && s.inRange && s.disabled && s.outside && s.focused && s.label.length > 0

// Every picker hands both hooks to its Calendar.
export const pickers = (
  <>
    <DatePicker isDisabled={weekend} renderDay={() => <CalendarDay />} />
    <DatePickerPanel isDisabled={weekend} renderDay={() => <CalendarDay />} />
    <DateRangePicker isDisabled={weekend} renderDay={() => <CalendarDay />} />
    <DateRangePickerPanel isDisabled={weekend} renderDay={() => <CalendarDay />} />
  </>
)

// @ts-expect-error: isDisabled gets a date and answers with a boolean
export const wrongHook = <Calendar isDisabled={(d: string) => d} />

// @ts-expect-error: a day is always a button
export const wrongType = <CalendarDay type="submit" />
