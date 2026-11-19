/* Type test, never run: Scheduler's props, controlled and uncontrolled, its parts, refs, helpers and words. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  Scheduler,
  SchedulerGrid,
  SchedulerRoot,
  SchedulerToolbar,
  zonedDate,
  zonedParts,
  type SchedulerAvailability,
  type SchedulerEvent,
  type SchedulerSlot,
  type SchedulerView,
  type ZonedParts,
} from '../components/scheduler'

const zone = 'Europe/Warsaw'
const start: Date = zonedDate({ year: 2026, month: 11, day: 19, hour: 10 }, zone)
const parts: ZonedParts = zonedParts(start, zone)
const events: SchedulerEvent[] = [
  { id: 'tara', title: 'Interview', start, end: zonedDate({ ...parts, minute: 45 }, zone), tone: 'brand', attendees: [{ name: 'Tara Mendes', tone: 'fuchsia' }] },
  { id: 'hands', title: 'All-hands', start, end: start, readOnly: true, allDay: true },
]
const busy: SchedulerAvailability[] = [{ start, end: start, status: 'busy' }]

// @ts-expect-error: no such tone
const wrongTone: SchedulerEvent = { id: 'x', title: 'x', start, end: start, tone: 'danger' }
// @ts-expect-error: availability is free or busy
const wrongStatus: SchedulerAvailability = { start, end: start, status: 'maybe' }

const rootRef = React.createRef<HTMLDivElement>()

// Controlled: the app owns the view, the date and the events.
export function Controlled() {
  const [view, setView] = React.useState<SchedulerView>('week')
  const [date, setDate] = React.useState(start)
  const [list, setList] = React.useState(events)
  return (
    <Scheduler
      ref={rootRef}
      view={view}
      onViewChange={setView}
      date={date}
      onDateChange={setDate}
      events={list}
      onEventChange={(next, previous) => setList((all) => all.map((e) => (e.id === previous.id ? next : e)))}
      onSlotSelect={(slot: SchedulerSlot) => slot.allDay}
      onEventOpen={(e) => e.id}
      availability={busy}
      slotMinutes={15}
      workingHours={[8, 17]}
      timeZone={zone}
      weekStartsOn={1}
      now={start}
      eventPopover={(event, close) => <button onClick={close}>{event.title}</button>}
      slotPopover={(slot, close) => <button onClick={close}>{slot.start.toISOString()}</button>}
      aria-describedby="hint"
    />
  )
}

// Uncontrolled: the Scheduler keeps them.
export const uncontrolled = <Scheduler defaultView="month" defaultDate={start} defaultEvents={events} views={['week', 'month']} />

// @ts-expect-error: no such view
export const wrongView = <Scheduler view="year" />

// Parts: a toolbar of the app's own.
export const parts_ = (
  <SchedulerRoot ref={rootRef} events={events} timeZone={zone}>
    <SchedulerToolbar ref={React.createRef<HTMLDivElement>()}>
      <button>New event</button>
    </SchedulerToolbar>
    <SchedulerGrid ref={React.createRef<HTMLDivElement>()} />
  </SchedulerRoot>
)

// Pro's words join SatinLabels, typed.
export const translated = (
  <SatinLabels
    labels={{
      dateLocale: 'pl-PL',
      schedulerToday: 'Dziś',
      schedulerPrevious: (view) => (view === 'week' ? 'Poprzedni tydzień' : 'Wstecz'),
      schedulerMoved: (title, when) => `${title} przeniesione na ${when}`,
    }}
  >
    {uncontrolled}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ schedulerMore: '+ więcej' }}>{uncontrolled}</SatinLabels>

export { wrongTone, wrongStatus }
