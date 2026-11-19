import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { AvailabilityCalendar, AvailabilityDatePicker, isoDate, type Availability } from '../components/date-availability'

// Thursday 19 November 2026. Monday the 23rd is fully booked; the weekend isn't listed.
const TODAY = new Date(2026, 10, 19)
const SLOTS: Availability = {
  '2026-11-19': 2,
  '2026-11-20': 5,
  '2026-11-23': 0,
  '2026-11-24': 1,
  '2026-11-26': 3,
}

const day = (name: string | RegExp) => screen.getByRole('button', { name })
/** Calendar moves the focus on the next frame after an arrow key. */
const frame = () => act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))))
/** Into the grid: past the month arrows to its one tab stop. */
async function tabIntoGrid(user: ReturnType<typeof renderWithSatin>['user']) {
  await user.tab()
  await user.tab()
  await user.tab()
}

describe('AvailabilityCalendar', () => {
  it('names each day with its free slots, or why it is off', () => {
    renderWithSatin(<AvailabilityCalendar availability={SLOTS} today={TODAY} />)
    expect(day('Thursday, November 26, 2026, 3 free slots').getAttribute('data-availability')).toBe('free')
    expect(day('Tuesday, November 24, 2026, 1 free slot').getAttribute('data-availability')).toBe('few')
    const monday = day('Monday, November 23, 2026, Fully booked')
    expect(monday.getAttribute('data-availability')).toBe('full')
    expect(monday.getAttribute('aria-disabled')).toBe('true')
    // Left out: no slots, nothing to add to its name.
    const saturday = day('Saturday, November 21, 2026')
    expect(saturday.getAttribute('data-availability')).toBe('none')
    expect(saturday.getAttribute('aria-disabled')).toBe('true')
    // Today keeps aria-current alongside its slots.
    expect(day(/^Thursday, November 19, 2026/).getAttribute('aria-current')).toBe('date')
  })

  it('reads few slots as a ring, not only a colour', () => {
    renderWithSatin(<AvailabilityCalendar availability={SLOTS} fewSlots={3} today={TODAY} />)
    const dotOf = (name: RegExp) => day(name).querySelector('[data-slot=dot] > span')!.className
    expect(day(/November 26, 2026, 3 free slots/).getAttribute('data-availability')).toBe('few')
    expect(dotOf(/November 26/)).toMatch(/border/)
    expect(dotOf(/November 20/)).toMatch(/bg-tone-fg/)
    // The dot is decoration: the name says it.
    expect(day(/November 26/).querySelector('[data-slot=dot]')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('reaches a full day with the arrow keys and shows why it is off, without picking it', async () => {
    const picked = vi.fn()
    const { user } = renderWithSatin(<AvailabilityCalendar availability={SLOTS} today={TODAY} onValueChange={picked} />)
    await tabIntoGrid(user)
    expect(document.activeElement).toBe(day(/^Thursday, November 19, 2026/))
    expect(screen.getByRole('tooltip').textContent).toBe('2 slots')
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}')
    await frame()
    expect(document.activeElement).toBe(day('Monday, November 23, 2026, Fully booked'))
    expect(screen.getByRole('tooltip').textContent).toBe('Fully booked')
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(picked).not.toHaveBeenCalled()
    // The tooltip isn't added as a description: the name already says it.
    expect(document.activeElement?.hasAttribute('aria-describedby')).toBe(false)
  })

  it('picks a day with free slots with Enter, uncontrolled', async () => {
    const picked = vi.fn()
    const { user } = renderWithSatin(<AvailabilityCalendar availability={SLOTS} today={TODAY} onValueChange={picked} />)
    await tabIntoGrid(user)
    await user.keyboard('{ArrowDown}')
    await frame()
    await user.keyboard('{Enter}')
    expect(picked).toHaveBeenCalledWith(new Date(2026, 10, 26))
    expect(day(/November 26, 2026/).closest('[role=gridcell]')!.getAttribute('aria-selected')).toBe('true')
  })

  it('follows value when controlled, and picks with a click', async () => {
    function Controlled() {
      const [value, setValue] = React.useState<Date | null>(new Date(2026, 10, 20))
      return <AvailabilityCalendar availability={SLOTS} today={TODAY} value={value} onValueChange={setValue} />
    }
    const { user } = renderWithSatin(<Controlled />)
    const selected = () => screen.getAllByRole('gridcell').filter((c) => c.getAttribute('aria-selected') === 'true')
    expect(selected()).toHaveLength(1)
    expect(within(selected()[0]).getByRole('button').getAttribute('aria-label')).toMatch(/November 20/)
    await user.click(day(/November 24/))
    expect(within(selected()[0]).getByRole('button').getAttribute('aria-label')).toMatch(/November 24/)
    await user.click(day(/November 23/))
    expect(within(selected()[0]).getByRole('button').getAttribute('aria-label')).toMatch(/November 24/)
  })

  it('names the app’s reason for a day without slots', () => {
    renderWithSatin(<AvailabilityCalendar availability={SLOTS} today={TODAY} reason={(d) => (d.getDay() === 0 ? 'Office closed' : undefined)} />)
    expect(day('Sunday, November 22, 2026, Office closed')).toBeTruthy()
    expect(day('Monday, November 23, 2026, Fully booked')).toBeTruthy()
  })

  it('treats days ruled out by isDisabled or min as having no slots', () => {
    renderWithSatin(<AvailabilityCalendar availability={SLOTS} today={TODAY} min={new Date(2026, 10, 20)} isDisabled={(d) => isoDate(d) === '2026-11-26'} />)
    for (const name of ['Thursday, November 19, 2026', 'Thursday, November 26, 2026']) {
      expect(day(name).getAttribute('data-availability')).toBe('none')
      expect(day(name).getAttribute('aria-disabled')).toBe('true')
    }
    expect(day('Friday, November 20, 2026, 5 free slots').hasAttribute('aria-disabled')).toBe(false)
  })

  it('says its words in the app’s language', async () => {
    const { user } = renderWithSatin(<AvailabilityCalendar availability={SLOTS} today={TODAY} />, {
      labels: {
        dateLocale: 'pl-PL',
        availabilitySlots: (n) => `Terminy: ${n}`,
        availabilityFreeSlots: (n) => `wolne terminy: ${n}`,
        availabilityFull: 'brak terminów',
        availabilityDay: (date, status) => `${date} (${status})`,
      },
    })
    expect(day('czwartek, 26 listopada 2026 (wolne terminy: 3)')).toBeTruthy()
    expect(day('poniedziałek, 23 listopada 2026 (brak terminów)')).toBeTruthy()
    await tabIntoGrid(user)
    expect(screen.getByRole('tooltip').textContent).toBe('Terminy: 2')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, a tooltip open', async (theme) => {
    const { user } = renderWithSatin(<AvailabilityCalendar availability={SLOTS} today={TODAY} defaultValue={new Date(2026, 10, 26)} />, { theme })
    await tabIntoGrid(user)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    await expectNoAxeViolations()
  })
})

describe('AvailabilityDatePicker', () => {
  it('opens from the field, closes the tooltip and then the calendar with Escape, and picks', async () => {
    const picked = vi.fn()
    const { user } = renderWithSatin(<AvailabilityDatePicker label="Interview day" availability={SLOTS} today={TODAY} onValueChange={picked} />)
    const field = screen.getByRole('button', { name: 'Interview day' })
    field.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog')
    // The arrows, the year, then the grid.
    await user.tab()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: /^Thursday, November 19, 2026, 2 free slots/ }))
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}')
    await frame()
    expect(screen.getByRole('tooltip').textContent).toBe('Fully booked')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(screen.getByRole('dialog')).toBeTruthy()
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
    await frame()
    expect(screen.getByRole('tooltip').textContent).toBe('3 slots')
    await user.keyboard('{Enter}')
    expect(picked).toHaveBeenCalledWith(new Date(2026, 10, 26))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(field.textContent).toContain('Nov 26, 2026')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, open', async (theme) => {
    const { user } = renderWithSatin(<AvailabilityDatePicker label="Interview day" availability={SLOTS} today={TODAY} />, { theme })
    await user.click(screen.getByRole('button', { name: 'Interview day' }))
    await screen.findByRole('dialog')
    await expectNoAxeViolations()
  })
})
