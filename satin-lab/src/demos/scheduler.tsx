import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { Input } from '@uisatin/ui/input'
import { SatinLabels } from '@uisatin/ui/labels'
import { Scheduler, zonedDate, type SchedulerAvailability, type SchedulerEvent } from '@uisatin/pro/scheduler'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// The recruiter's week, pinned so the docs read the same every day: Thursday 19 November 2026,
// 9:40 in Warsaw.
const ZONE = 'Europe/Warsaw'
const at = (day: number, hour: number, minute = 0) => zonedDate({ year: 2026, month: 11, day, hour, minute }, ZONE)
const NOW = at(19, 9, 40)

const TARA = { name: 'Tara Mendes', tone: 'fuchsia' as const }
const ADA = { name: 'Ada Novak', tone: 'sky' as const }
const JON = { name: 'Jon Park', tone: 'amber' as const }
const LEA = { name: 'Lea Moreau', tone: 'green' as const }

const EVENTS: SchedulerEvent[] = [
  { id: 'fair', title: 'Career fair', start: at(17, 0), end: at(18, 0), allDay: true, tone: 'plum' },
  { id: 'refs', title: 'References due: Tara', start: at(19, 0), end: at(20, 0), allDay: true, tone: 'amber' },
  { id: 'pipeline', title: 'Pipeline review', start: at(16, 9, 30), end: at(16, 10, 30), tone: 'sky', attendees: [ADA, JON] },
  { id: 'screen', title: 'Phone screen: Sam Ortiz', start: at(17, 13), end: at(17, 13, 30), tone: 'plum', attendees: [ADA] },
  { id: 'portfolio', title: 'Portfolio review: Rina Cho', start: at(18, 11), end: at(18, 12), tone: 'fuchsia', attendees: [LEA, JON] },
  { id: 'sync', title: 'Hiring sync', start: at(18, 11, 30), end: at(18, 12, 15), tone: 'green', attendees: [ADA, JON, LEA] },
  { id: 'tara', title: 'Interview: Tara Mendes', start: at(19, 10), end: at(19, 10, 45), tone: 'brand', attendees: [TARA, ADA, JON] },
  { id: 'debrief', title: 'Debrief: Rina Cho', start: at(19, 14), end: at(19, 14, 30), tone: 'amber', attendees: [LEA, JON] },
  { id: 'offer', title: 'Offer call: Mia Ross', start: at(19, 14, 15), end: at(19, 15), tone: 'green', attendees: [ADA] },
  { id: 'allhands', title: 'Company all-hands', start: at(20, 16), end: at(20, 17), tone: 'neutral', readOnly: true },
]

// Jon, the hiring manager, is in a panel until 11:30 on Thursday: the interview has to move.
const BUSY: SchedulerAvailability[] = [
  { start: at(16, 13), end: at(16, 15), status: 'busy' },
  { start: at(17, 9), end: at(17, 11), status: 'busy' },
  { start: at(18, 15), end: at(18, 17), status: 'busy' },
  { start: at(19, 9), end: at(19, 9, 30), status: 'busy' },
  { start: at(19, 10), end: at(19, 11, 30), status: 'busy' },
  { start: at(19, 13), end: at(19, 14), status: 'busy' },
  { start: at(20, 9), end: at(20, 10, 30), status: 'busy' },
]

export const controls: ShowcaseControl[] = [
  { id: 'locale', label: 'dateLocale', items: [{ value: 'en-US', label: 'en-US' }, { value: 'en-GB', label: 'en-GB' }] },
  { id: 'slot', label: 'Slot', items: [{ value: '30', label: '30 min' }, { value: '15', label: '15 min' }, { value: '60', label: '60 min' }] },
  { id: 'busy', label: 'Busy slots', type: 'switch', default: 'on' },
]

function code(v: Record<string, string>) {
  const busy = v.busy === 'on'
  const slot = v.slot === '30' ? '' : `\n        slotMinutes={${v.slot}}`
  return `import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import { Scheduler, zonedDate, type SchedulerAvailability, type SchedulerEvent } from '@uisatin/pro/scheduler'

const zone = 'Europe/Warsaw'
const at = (day: number, hour: number, minute = 0) => zonedDate({ year: 2026, month: 11, day, hour, minute }, zone)

export function RecruiterWeek({ busy }: { busy: SchedulerAvailability[] }) {
  const [events, setEvents] = React.useState<SchedulerEvent[]>([
    {
      id: 'tara',
      title: 'Interview: Tara Mendes',
      start: at(19, 10),
      end: at(19, 10, 45),
      attendees: [{ name: 'Tara Mendes' }, { name: 'Ada Novak' }, { name: 'Jon Park' }],
    },
    { id: 'allhands', title: 'Company all-hands', start: at(20, 16), end: at(20, 17), tone: 'neutral', readOnly: true },
  ])

  // ${v.locale === 'en-US' ? 'en-US: the week starts on Sunday, times on a 12-hour clock.' : 'en-GB: the week starts on Monday, times on a 24-hour clock.'}
  return (
    <SatinLabels labels={{ dateLocale: '${v.locale}' }}>
      <Scheduler
        defaultDate={at(19, 9)}
        timeZone={zone}${slot}
        workingHours={[9, 18]}${busy ? '\n        availability={busy}' : ''}
        events={events}
        onEventChange={(next) => setEvents((all) => all.map((e) => (e.id === next.id ? next : e)))}
        onSlotSelect={(slot) => console.log('New event', slot.start, slot.end)}
      />
    </SatinLabels>
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.locale, `${v.slot} min`, v.busy === 'on' ? 'Busy slots' : 'No busy slots'].join(' · '),
  code: code(v),
}))

/** Thursday's interview with Tara Mendes, at 10:00 while Jon is busy: drag it to 11:30. */
function Preview({ v }: { v: Record<string, string> }) {
  const [events, setEvents] = React.useState(EVENTS)
  const [title, setTitle] = React.useState('')
  return (
    <SatinLabels labels={{ dateLocale: v.locale }}>
      <Scheduler
        className="h-[600px] w-[880px] max-w-full"
        defaultDate={at(19, 9)}
        now={NOW}
        timeZone={ZONE}
        slotMinutes={Number(v.slot)}
        workingHours={[9, 18]}
        availability={v.busy === 'on' ? BUSY : []}
        events={events}
        onEventChange={(next) => setEvents((all) => all.map((e) => (e.id === next.id ? next : e)))}
        eventPopover={(event, close) =>
          event.readOnly ? null : (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="xs" onClick={close}>
                Reschedule
              </Button>
              <Button size="xs" onClick={close}>
                Join call
              </Button>
            </div>
          )
        }
        slotPopover={(slot, close) => (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              setEvents((all) => [...all, { id: `new-${all.length}`, title: title || 'Untitled', start: slot.start, end: slot.end, allDay: slot.allDay, tone: 'sky' }])
              setTitle('')
              close()
            }}
          >
            <Input aria-label="Title" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="xs" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" size="xs">
                Add
              </Button>
            </div>
          </form>
        )}
      />
    </SatinLabels>
  )
}

export default function SchedulerDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Scheduler" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
