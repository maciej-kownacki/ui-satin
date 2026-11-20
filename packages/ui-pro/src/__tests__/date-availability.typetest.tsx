/* Type test, never run: AvailabilityCalendar and AvailabilityDatePicker, controlled and uncontrolled, useAvailability on Free's parts, refs and the words in SatinLabels. */
import * as React from 'react'
import { Calendar, DatePickerPanel, DateRangePicker } from '@uisatin/ui/date-picker'
import { SatinLabels } from '@uisatin/ui/labels'
import { AvailabilityCalendar, AvailabilityDatePicker, isoDate, useAvailability, type Availability, type AvailabilityStatus } from '../components/date-availability'

const slots: Availability = { '2026-11-23': 0, [isoDate(new Date(2026, 10, 26))]: 3 }
const calendarRef = React.createRef<HTMLDivElement>()
const fieldRef = React.createRef<HTMLButtonElement>()

export const controlled = (
  <AvailabilityCalendar
    ref={calendarRef}
    availability={slots}
    fewSlots={1}
    reason={(d) => (d.getMonth() === 11 ? 'Office closed' : undefined)}
    isDisabled={(d) => d.getDay() === 5}
    value={null}
    onValueChange={(d: Date) => d}
    month={new Date(2026, 10, 1)}
    onMonthChange={() => {}}
    min={new Date()}
    today={new Date()}
    header="picker"
    aria-describedby="hint"
  />
)

export const uncontrolled = <AvailabilityCalendar availability={slots} defaultValue={new Date(2026, 10, 26)} />

export const field = (
  <AvailabilityDatePicker ref={fieldRef} label="Interview day" hint="Mondays are full" availability={slots} defaultValue={null} onValueChange={() => {}} size="lg" />
)

// The hook's isDisabled and renderDay fit every Free Calendar and picker.
export function Parts() {
  const hooks = useAvailability({ availability: slots, fewSlots: 2 })
  return (
    <>
      <Calendar {...hooks} />
      <DatePickerPanel {...hooks} />
      <DateRangePicker {...hooks} />
    </>
  )
}

export const status: AvailabilityStatus[] = ['free', 'few', 'full', 'none']

// @ts-expect-error: availability is required
export const missing = <AvailabilityCalendar />

// @ts-expect-error: a single day, not a range
export const range = <AvailabilityCalendar availability={slots} mode="range" />

// @ts-expect-error: the days are drawn by the availability
export const ownDays = <AvailabilityCalendar availability={slots} renderDay={() => null} />

// @ts-expect-error: slots are counted
export const wrongSlots = <AvailabilityCalendar availability={{ '2026-11-26': 'three' }} />

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels
    labels={{
      nextMonth: 'Następny miesiąc',
      availabilitySlots: (n) => `${n} terminy`,
      availabilityFreeSlots: (n) => `${n} wolne terminy`,
      availabilityFull: 'Brak terminów',
      availabilityDay: (date, status) => `${date}: ${status}`,
    }}
  >
    {uncontrolled}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ availabilitySlots: 'terminy' }}>{uncontrolled}</SatinLabels>
