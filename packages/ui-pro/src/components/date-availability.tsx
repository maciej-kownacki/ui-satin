'use client'

import * as React from 'react'
import { Calendar, CalendarDay, DatePicker, type CalendarDayState, type CalendarProps, type DatePickerProps } from '@uisatin/ui/date-picker'
import { Dot } from '@uisatin/ui/dot'
import { useSatinLabels } from '@uisatin/ui/labels'
import { Tooltip } from '@uisatin/ui/tooltip'

/**
 * AvailabilityCalendar: the Calendar for booking, showing which days have free slots and how
 * many. `availability` maps days (ISO dates, `2026-11-26`) to their free slots:
 *
 * - free: a green dot under the number, "3 slots" in its tooltip;
 * - few (`fewSlots` or fewer, 2 by default): the dot is a ring, so it reads without colour;
 * - full (0): faded and not pickable, "Fully booked" in its tooltip (or the app's `reason`);
 * - a day left out has no slots: faded, not pickable, and silent unless `reason` names why.
 *
 * Each day says the same in its name ("Thursday, November 26, 2026, 3 free slots"). A full day
 * keeps its focus (`aria-disabled`, from Calendar), so the arrow keys reach it, its tooltip opens
 * there and screen readers hear why it's off. Today keeps its dash under the dot, the picked day
 * its fill with the dot in white. No motion beyond Calendar's and Tooltip's.
 *
 * `AvailabilityDatePicker` is the same in a DatePicker field. `useAvailability()` returns the
 * `isDisabled` and `renderDay` to give any Satin Calendar or picker yourself.
 *
 * Other props, `ref` included, go to AvailabilityCalendar's root (Calendar's) and
 * AvailabilityDatePicker's trigger button.
 */

/** The words the availability calendar says on its own. They join SatinLabels, so the app translates them there. */
export const dateAvailabilityLabels = {
  /** A day's tooltip: "3 slots". */
  availabilitySlots: (count: number) => (count === 1 ? '1 slot' : `${count} slots`),
  /** A day's free slots, read after its date: "3 free slots". */
  availabilityFreeSlots: (count: number) => (count === 1 ? '1 free slot' : `${count} free slots`),
  /** Why a day with 0 free slots can't be picked: its tooltip, and read after its date. */
  availabilityFull: 'Fully booked',
  /** A day's name: its full date, then its slots or why it's off ("Thursday, November 26, 2026, 3 free slots"). */
  availabilityDay: (date: string, status: string) => `${date}, ${status}`,
}

type DateAvailabilityLabels = typeof dateAvailabilityLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends DateAvailabilityLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...dateAvailabilityLabels, ...labels }), [labels])
}

/** Free slots per day, keyed by the day's ISO date (`isoDate(date)`, "2026-11-26"). */
export type Availability = Record<string, number>

/** How a day reads: `none` is a day left out of `availability`, or ruled out by `isDisabled`, `min` or `max`. */
export type AvailabilityStatus = 'free' | 'few' | 'full' | 'none'

/** A day's key in `availability`: its local date as `YYYY-MM-DD`. */
export const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export interface AvailabilityOptions {
  /** Free slots per day, keyed by ISO date ("2026-11-26"). 0 is a full day. A day left out has no slots and can't be picked. */
  availability: Availability
  /** At or below this many free slots a day reads as nearly full: its dot becomes a ring. */
  fewSlots?: number
  /**
   * Why a day without free slots can't be picked (a holiday, a training day): its tooltip, read
   * after its date. Return nothing for the default, "Fully booked" for a day listed with 0 and
   * silence for a day left out.
   */
  reason?: (date: Date) => string | undefined
  /** More days that can't be picked, whatever their slots. */
  isDisabled?: (date: Date) => boolean
}

/** How a day reads in `availability`, before Calendar's own `min` and `max`. */
function statusOf(date: Date, { availability, fewSlots = 2, isDisabled }: AvailabilityOptions): { status: AvailabilityStatus; slots: number } {
  const slots = availability[isoDate(date)]
  if (isDisabled?.(date) || slots === undefined) return { status: 'none', slots: 0 }
  if (slots <= 0) return { status: 'full', slots: 0 }
  return { status: slots <= fewSlots ? 'few' : 'free', slots }
}

/**
 * Calendar's `isDisabled` and `renderDay` for an availability map, to give any Satin Calendar,
 * DatePicker or panel: `<Calendar {...useAvailability({ availability })} />`.
 */
export function useAvailability(options: AvailabilityOptions): Required<Pick<CalendarProps, 'isDisabled' | 'renderDay'>> {
  const { availability, fewSlots, reason, isDisabled } = options
  return React.useMemo(() => {
    const opts = { availability, fewSlots, isDisabled }
    return {
      isDisabled: (date: Date) => {
        const { status } = statusOf(date, opts)
        return status === 'full' || status === 'none'
      },
      renderDay: (date: Date, state: CalendarDayState) => <AvailabilityDay date={date} state={state} {...statusOf(date, opts)} reason={reason} />,
    }
  }, [availability, fewSlots, reason, isDisabled])
}

function AvailabilityDay({ date, state, status: listed, slots, reason }: { date: Date; state: CalendarDayState; status: AvailabilityStatus; slots: number; reason?: (date: Date) => string | undefined }) {
  const labels = useLabels()
  // Calendar's own min and max can rule out a day with slots: then it has nothing to offer.
  const status = state.disabled && (listed === 'free' || listed === 'few') ? 'none' : listed
  const open = status === 'free' || status === 'few'
  const why = open ? undefined : (reason?.(date) ?? (status === 'full' ? labels.availabilityFull : undefined))
  const tip = open ? labels.availabilitySlots(slots) : why
  const day = (
    <CalendarDay
      data-availability={status}
      aria-label={open ? labels.availabilityDay(state.label, labels.availabilityFreeSlots(slots)) : why ? labels.availabilityDay(state.label, why) : undefined}
      // The name already carries what the tooltip says; Radix would add it again as a description.
      aria-describedby={undefined}
    >
      {date.getDate()}
      {open && <Dot tone="green" variant={status === 'few' ? 'outline' : 'solid'} className="satin-date-availability-dot" />}
    </CalendarDay>
  )
  return tip ? <Tooltip label={tip}>{day}</Tooltip> : day
}

export interface AvailabilityCalendarProps extends Omit<CalendarProps, 'mode' | 'range' | 'onRangeChange' | 'value' | 'onValueChange' | 'isDisabled' | 'renderDay'> {
  /** Free slots per day, keyed by ISO date ("2026-11-26"). 0 is a full day. A day left out has no slots and can't be picked. */
  availability: Availability
  /** At or below this many free slots a day reads as nearly full: its dot becomes a ring. */
  fewSlots?: number
  /** Why a day without free slots can't be picked: its tooltip, read after its date. Defaults to "Fully booked" for a day listed with 0. */
  reason?: (date: Date) => string | undefined
  /** More days that can't be picked, whatever their slots. */
  isDisabled?: (date: Date) => boolean
  /** The picked day (controlled). */
  value?: Date | null
  /** The day picked at first (uncontrolled). */
  defaultValue?: Date | null
  onValueChange?: (value: Date) => void
}

/** The Calendar with each day's free slots: a dot, a tooltip and its name. Other props, `ref` included, go to Calendar's root. */
export function AvailabilityCalendar({
  availability,
  fewSlots = 2,
  reason,
  isDisabled,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  ...props
}: AvailabilityCalendarProps) {
  const [inner, setInner] = React.useState<Date | null>(defaultValue)
  const value = valueProp !== undefined ? valueProp : inner
  const hooks = useAvailability({ availability, fewSlots, reason, isDisabled })
  return (
    <Calendar
      {...props}
      {...hooks}
      value={value}
      onValueChange={(d) => {
        if (valueProp === undefined) setInner(d)
        onValueChange?.(d)
      }}
    />
  )
}

export interface AvailabilityDatePickerProps extends Omit<DatePickerProps, 'isDisabled' | 'renderDay'> {
  /** Free slots per day, keyed by ISO date ("2026-11-26"). 0 is a full day. A day left out has no slots and can't be picked. */
  availability: Availability
  /** At or below this many free slots a day reads as nearly full: its dot becomes a ring. */
  fewSlots?: number
  /** Why a day without free slots can't be picked: its tooltip, read after its date. Defaults to "Fully booked" for a day listed with 0. */
  reason?: (date: Date) => string | undefined
  /** More days that can't be picked, whatever their slots. */
  isDisabled?: (date: Date) => boolean
}

/** A DatePicker field whose calendar shows each day's free slots. Other props, `ref` included, go to the trigger button. */
export function AvailabilityDatePicker({ availability, fewSlots = 2, reason, isDisabled, ...props }: AvailabilityDatePickerProps) {
  const hooks = useAvailability({ availability, fewSlots, reason, isDisabled })
  return <DatePicker {...props} {...hooks} />
}
