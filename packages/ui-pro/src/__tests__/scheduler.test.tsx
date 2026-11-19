import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Scheduler, zonedDate, zonedParts, type SchedulerEvent, type SchedulerProps } from '../components/scheduler'

const ZONE = 'Europe/Warsaw'
const at = (day: number, hour: number, minute = 0) => zonedDate({ year: 2026, month: 11, day, hour, minute }, ZONE)
const NOW = at(19, 9, 40)

const EVENTS: SchedulerEvent[] = [
  { id: 'tara', title: 'Interview: Tara Mendes', start: at(19, 10), end: at(19, 10, 45), attendees: [{ name: 'Tara Mendes' }, { name: 'Jon Park' }] },
  { id: 'hands', title: 'All-hands', start: at(20, 16), end: at(20, 17), readOnly: true },
  { id: 'fair', title: 'Career fair', start: at(17, 0), end: at(18, 0), allDay: true },
]

/** Intl writes thin and narrow no-break spaces ("10:00 – 10:45 AM"); compare with plain ones. */
const plain = (s: string) => s.replace(/[   ]/g, ' ')
const named = (text: string) => (name: string) => plain(name).startsWith(text)

/** The Scheduler as an app wires it: events in state, moves saved. */
function Week(props: Partial<SchedulerProps> & { onChange?: (e: SchedulerEvent) => void }) {
  const [events, setEvents] = React.useState(props.events ?? EVENTS)
  return (
    <Scheduler
      defaultDate={at(19, 9)}
      now={NOW}
      timeZone={ZONE}
      {...props}
      events={events}
      onEventChange={(next, previous) => {
        props.onChange?.(next)
        setEvents((all) => all.map((e) => (e.id === previous.id ? next : e)))
      }}
    />
  )
}

// Role queries walk every slot (hundreds of them) and are slow in jsdom; these read the DOM.
const focusedCell = () => document.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')!
const headers = () => [...document.querySelectorAll<HTMLElement>('[role="grid"] [role="columnheader"]')]
const status = () => plain(screen.getByRole('status').textContent ?? '')

describe('zonedDate and zonedParts', () => {
  it('turn wall-clock times into moments with the zone’s own offset, either side of a change', () => {
    // Warsaw leaves summer time on 25 October 2026: 10:00 is 08:00 UTC the day before, 09:00 UTC after.
    expect(zonedDate({ year: 2026, month: 10, day: 24, hour: 10 }, ZONE).toISOString()).toBe('2026-10-24T08:00:00.000Z')
    expect(zonedDate({ year: 2026, month: 10, day: 25, hour: 10 }, ZONE).toISOString()).toBe('2026-10-25T09:00:00.000Z')
    // 02:30 happens twice that night: the first one.
    expect(zonedDate({ year: 2026, month: 10, day: 25, hour: 2, minute: 30 }, ZONE).toISOString()).toBe('2026-10-25T00:30:00.000Z')
    // 02:30 on 29 March 2026 doesn't happen: forward by the gap, to 03:30.
    expect(zonedParts(zonedDate({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, ZONE), ZONE)).toMatchObject({ hour: 3, minute: 30 })
    expect(zonedParts(new Date('2026-11-01T15:00:00Z'), 'America/New_York')).toEqual({ year: 2026, month: 11, day: 1, hour: 10, minute: 0 })
  })
})

describe('Scheduler', () => {
  it('names the grid after the week and the time zone, days from the locale’s first', () => {
    renderWithSatin(<Week />)
    const grid = screen.getByRole('grid')
    expect(plain(grid.getAttribute('aria-label')!)).toBe('November 15 – 21, 2026, Central European Standard Time')
    const days = headers().slice(1)
    // en-US: Sunday first; today is marked.
    expect(days.map((d) => d.querySelector('.sr-only')?.textContent)).toEqual([
      'Sunday, November 15',
      'Monday, November 16',
      'Tuesday, November 17',
      'Wednesday, November 18',
      'Thursday, November 19',
      'Friday, November 20',
      'Saturday, November 21',
    ])
    expect(days[4].getAttribute('aria-current')).toBe('date')
    expect(headers()[0].textContent).toBe('GMT+1')
  })

  it('names each event with its title and full time, and says who is in it', () => {
    renderWithSatin(<Week />)
    const event = screen.getByRole('button', { name: named('Interview: Tara Mendes, Thursday, November 19, 10:00 – 10:45 AM') })
    expect(event.getAttribute('aria-describedby')).toBeTruthy()
    const description = event.getAttribute('aria-describedby')!.split(' ').map((id) => document.getElementById(id)?.textContent)
    expect(description).toContain('With Tara Mendes and Jon Park')
  })

  it('moves through the slots with the arrows and picks one with Enter', async () => {
    const onSlotSelect = vi.fn()
    const { user } = renderWithSatin(<Week onSlotSelect={onSlotSelect} />)
    focusedCell().focus()
    expect(plain(focusedCell().getAttribute('aria-label')!)).toBe('Thursday, November 19, 9:00 – 9:30 AM')
    await user.keyboard('{ArrowRight}')
    expect(plain((document.activeElement as HTMLElement).getAttribute('aria-label')!)).toBe('Friday, November 20, 9:00 – 9:30 AM')
    await user.keyboard('{ArrowUp}{Enter}')
    expect(onSlotSelect).toHaveBeenCalledWith({ start: at(20, 8, 30), end: at(20, 9), allDay: false })
    expect(status()).toBe('Selected Friday, November 20, 8:30 – 9:00 AM')
  })

  it('stretches a pick with Shift and the arrows', async () => {
    const onSlotSelect = vi.fn()
    const { user } = renderWithSatin(<Week onSlotSelect={onSlotSelect} />)
    focusedCell().focus()
    await user.keyboard('{Shift>}{ArrowDown}{ArrowDown}{/Shift}{Enter}')
    expect(onSlotSelect).toHaveBeenCalledWith({ start: at(19, 9), end: at(19, 10, 30), allDay: false })
    expect(document.querySelectorAll('[role="gridcell"][aria-selected="true"]')).toHaveLength(3)
  })

  it('goes from an event’s slot to the event, opens it, and back with Escape', async () => {
    const onEventOpen = vi.fn()
    const { user } = renderWithSatin(<Week onEventOpen={onEventOpen} />)
    focusedCell().focus()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(plain((document.activeElement as HTMLElement).getAttribute('aria-label')!)).toBe('Thursday, November 19, 10:00 – 10:30 AM, Interview: Tara Mendes')
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: named('Interview: Tara Mendes') }))
    await user.keyboard('{Enter}')
    expect(onEventOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'tara' }))
    await user.keyboard('{Escape}')
    expect(plain((document.activeElement as HTMLElement).getAttribute('aria-label')!)).toMatch(/^Thursday, November 19, 10:00 – 10:30 AM/)
  })

  it('moves an event with Alt and the arrows, and changes its end with Alt Shift', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Week onChange={onChange} />)
    screen.getByRole('button', { name: named('Interview: Tara Mendes') }).focus()
    await user.keyboard('{Alt>}{ArrowDown}{ArrowDown}{ArrowDown}{/Alt}')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ start: at(19, 11, 30), end: at(19, 12, 15) }))
    expect(status()).toBe('Interview: Tara Mendes moved to Thursday, November 19, 11:30 AM – 12:15 PM')
    // Focus stays on the event as it moves.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: named('Interview: Tara Mendes, Thursday, November 19, 11:30 AM') }))
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ start: at(20, 11, 30), end: at(20, 12, 15) }))
    await user.keyboard('{Alt>}{Shift>}{ArrowDown}{/Shift}{/Alt}')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ start: at(20, 11, 30), end: at(20, 12, 45) }))
    expect(status()).toBe('Interview: Tara Mendes now Friday, November 20, 11:30 AM – 12:45 PM')
  })

  it('keeps the wall-clock time when a move crosses a daylight-saving change', async () => {
    const zone = 'America/New_York'
    // New York leaves summer time on Sunday 1 November 2026.
    const call = { id: 'call', title: 'Sales call', start: zonedDate({ year: 2026, month: 10, day: 31, hour: 10 }, zone), end: zonedDate({ year: 2026, month: 10, day: 31, hour: 11 }, zone) }
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Week events={[call]} timeZone={zone} defaultDate={call.start} now={call.start} onChange={onChange} />)
    screen.getByRole('button', { name: named('Sales call') }).focus()
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}')
    const moved = onChange.mock.calls[0][0] as SchedulerEvent
    expect(zonedParts(moved.start, zone)).toEqual({ year: 2026, month: 11, day: 1, hour: 10, minute: 0 })
    expect(+moved.start - +call.start).toBe(25 * 3_600_000)
    expect(+moved.end - +moved.start).toBe(3_600_000)
    // The next week is shown, Sunday first, and the event keeps focus there.
    expect(plain(screen.getByRole('grid').getAttribute('aria-label')!)).toMatch(/^November 1 – 7, 2026, Eastern Standard Time/)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: named('Sales call, Sunday, November 1, 10:00 – 11:00 AM') }))
  })

  it('leaves a read-only event where it is and says so', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Week onChange={onChange} />)
    screen.getByRole('button', { name: named('All-hands') }).focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(onChange).not.toHaveBeenCalled()
    expect(status()).toBe('All-hands is read-only')
  })

  it('pages with the toolbar and reads the new period out', async () => {
    const onDateChange = vi.fn()
    const { user } = renderWithSatin(<Week onDateChange={onDateChange} />)
    await user.click(screen.getByRole('button', { name: 'Next week' }))
    expect(onDateChange).toHaveBeenCalledWith(at(26, 0))
    expect(status()).toBe('November 22 – 28, 2026')
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(status()).toBe('November 15 – 21, 2026')
  })

  it('switches to Month, where the arrows move by day and week', async () => {
    const { user } = renderWithSatin(<Week />)
    await user.click(screen.getByRole('radio', { name: 'Month' }))
    const grid = screen.getByRole('grid')
    expect(plain(grid.getAttribute('aria-label')!)).toBe('November 2026, Central European Standard Time')
    focusedCell().focus()
    expect(focusedCell().getAttribute('aria-label')).toBe('Thursday, November 19, 1 event')
    await user.keyboard('{ArrowDown}')
    expect((document.activeElement as HTMLElement).getAttribute('aria-label')).toBe('Thursday, November 26')
    await user.keyboard('{ArrowUp}{Enter}')
    expect(document.activeElement).toBe(within(grid).getByRole('button', { name: named('Interview: Tara Mendes') }))
  })

  it('takes its words and dates from SatinLabels', () => {
    renderWithSatin(<Week />, {
      labels: { dateLocale: 'pl-PL', schedulerToday: 'Dziś', schedulerNext: () => 'Następny', schedulerAllDay: 'Cały dzień', schedulerGrid: (period, zone) => `${period} (${zone})` },
    })
    expect(screen.getByRole('button', { name: 'Dziś' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Następny' })).toBeTruthy()
    const grid = screen.getByRole('grid')
    // pl-PL: Monday first, a 24-hour clock, Polish names.
    expect(plain(grid.getAttribute('aria-label')!)).toBe('16–22 listopada 2026 (czas środkowoeuropejski standardowy)')
    expect(headers()[1].querySelector('.sr-only')?.textContent).toBe('poniedziałek, 16 listopada')
    expect(screen.getByRole('rowheader', { name: 'Cały dzień' })).toBeTruthy()
    expect(screen.getByRole('button', { name: named('Interview: Tara Mendes, czwartek, 19 listopada, 10:00–10:45') })).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, in Week and Month', async (theme) => {
    const { user } = renderWithSatin(<Week availability={[{ start: at(19, 13), end: at(19, 14), status: 'busy' }]} />, { theme })
    await expectNoAxeViolations()
    await user.click(screen.getByRole('radio', { name: 'Month' }))
    await new Promise((r) => setTimeout(r, 350))
    await expectNoAxeViolations()
  })
})
