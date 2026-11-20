import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { Card } from '@uisatin/ui/card'
import { AvailabilityCalendar, AvailabilityDatePicker, isoDate, type Availability } from '@uisatin/pro/date-availability'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Pinned to a fixed "today" (Thursday 19 November 2026) so the docs read the same every day.
const TODAY = new Date(2026, 10, 19)

/**
 * The recruiter's free interview slots from today to the end of the year: Mondays fully booked,
 * Tuesday to Friday between 1 and 6, nothing at weekends, the office closed over Christmas.
 */
const SLOTS: number[][] = [
  // Mon, Tue, Wed, Thu, Fri
  [0, 0, 0, 2, 1],
  [0, 4, 1, 3, 5],
  [0, 2, 4, 6, 3],
  [0, 5, 3, 1, 4],
  [0, 3, 2, 5, 4],
  [0, 2, 1, 0, 0],
]
const CLOSED = { from: new Date(2026, 11, 24), to: new Date(2026, 11, 31) }

function availabilityFrom(today: Date): Availability {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
  const map: Availability = {}
  SLOTS.forEach((week, w) =>
    week.forEach((slots, d) => {
      const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + w * 7 + d)
      if (day >= today && (day < CLOSED.from || day > CLOSED.to)) map[isoDate(day)] = slots
    }),
  )
  return map
}

const AVAILABILITY = availabilityFrom(TODAY)
const closed = (d: Date) => (d >= CLOSED.from && d <= CLOSED.to ? 'Office closed' : undefined)

export const controls: ShowcaseControl[] = [
  { id: 'kind', label: 'Kind', items: [{ value: 'calendar', label: 'Calendar' }, { value: 'field', label: 'Date picker' }] },
]

const code = (v: Record<string, string>) =>
  v.kind === 'field'
    ? `import * as React from 'react'
import { AvailabilityDatePicker } from '@uisatin/pro/date-availability'

export function InterviewDay({ slots }: { slots: Record<string, number> }) {
  const [day, setDay] = React.useState<Date | null>(null)

  // slots: { '2026-11-23': 0, '2026-11-26': 3, … } from the recruiter's calendar.
  return (
    <AvailabilityDatePicker
      label="Interview day"
      hint="Mondays are fully booked."
      availability={slots}
      value={day}
      onValueChange={setDay}
    />
  )
}`
    : `import * as React from 'react'
import { Card } from '@uisatin/ui/card'
import { Button } from '@uisatin/ui/button'
import { AvailabilityCalendar, isoDate } from '@uisatin/pro/date-availability'

export function InterviewDay({ slots }: { slots: Record<string, number> }) {
  const [day, setDay] = React.useState<Date | null>(null)
  const free = day ? slots[isoDate(day)] : 0

  // slots: { '2026-11-23': 0, '2026-11-26': 3, … }. 0 is fully booked; a day left out
  // (weekends, the past) can't be picked. reason names why a day without slots is off.
  return (
    <Card title="Pick a day for your interview" description="Product Designer · 45 min video call">
      <AvailabilityCalendar
        availability={slots}
        value={day}
        onValueChange={setDay}
        reason={(d) => (isChristmas(d) ? 'Office closed' : undefined)}
      />
      <Button disabled={!day}>{day ? \`See \${free} times\` : 'Pick a day'}</Button>
    </Card>
  )
}`

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: v.kind === 'field' ? 'Date picker' : 'Calendar', code: code(v) }))

const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

/** The hiring scenario: a candidate picks an interview day; Mondays are full. */
function Preview({ kind }: { kind: string }) {
  const [day, setDay] = React.useState<Date | null>(new Date(2026, 10, 26))
  if (kind === 'field') {
    // Held at the top of a block the calendar's height, so the open calendar stays on the stage.
    return (
      <div className="h-[440px] w-[280px]">
        <AvailabilityDatePicker
          label="Interview day"
          hint="Mondays are fully booked."
          availability={AVAILABILITY}
          reason={closed}
          today={TODAY}
          value={day}
          onValueChange={setDay}
        />
      </div>
    )
  }
  const free = day ? AVAILABILITY[isoDate(day)] : 0
  return (
    <Card
      title="Pick a day for your interview"
      description="Product Designer · 45 min video call"
      className="w-auto"
      footer={
        <>
          <span className="min-w-0 flex-1 truncate text-sm text-text-muted">{day ? dayName.format(day) : 'No day picked'}</span>
          <Button disabled={!day}>{day ? `See ${free} ${free === 1 ? 'time' : 'times'}` : 'Pick a day'}</Button>
        </>
      }
    >
      <AvailabilityCalendar availability={AVAILABILITY} reason={closed} today={TODAY} value={day} onValueChange={setDay} />
    </Card>
  )
}

export default function DateAvailabilityDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Availability calendar" options={options} codeHtml={codeHtml} controls={controls} render={(_, v) => <Preview key={v.kind} kind={v.kind} />} />
}
