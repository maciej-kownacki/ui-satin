import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Calendar, CalendarDay, DatePicker, DatePickerPanel, DateRangePicker, datePresets } from '../components/date-picker'

// Thursday 19 November 2026; Saturday the 21st and Sunday the 22nd are the weekend.
const TODAY = new Date(2026, 10, 19)
const weekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
const day = (name: string) => screen.getByRole('button', { name })

/** The arrow keys focus the next day on the next frame. */
const frame = () => act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))))

function Picker({ onValueChange }: { onValueChange?: (d: Date) => void }) {
  const [value, setValue] = React.useState<Date | null>(null)
  return (
    <Calendar
      today={TODAY}
      value={value}
      isDisabled={weekend}
      onValueChange={(d) => {
        setValue(d)
        onValueChange?.(d)
      }}
    />
  )
}

describe('Calendar day hooks', () => {
  it('marks the days isDisabled rules out as unavailable, without taking them out of reach', () => {
    renderWithSatin(<Picker />)
    const saturday = day('Saturday, November 21, 2026')
    expect(saturday.getAttribute('aria-disabled')).toBe('true')
    expect(saturday.hasAttribute('disabled')).toBe(false)
    expect(day('Friday, November 20, 2026').hasAttribute('aria-disabled')).toBe(false)
  })

  it('walks onto a disabled day with the arrow keys, and Enter there picks nothing', async () => {
    const picked = vi.fn()
    const { user } = renderWithSatin(<Picker onValueChange={picked} />)
    // The month arrows, then the grid's one tab stop: today.
    await user.tab()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(day('Thursday, November 19, 2026'))
    await user.keyboard('{ArrowRight}{ArrowRight}')
    await frame()
    expect(document.activeElement).toBe(day('Saturday, November 21, 2026'))
    await user.keyboard('{Enter}')
    await user.click(day('Sunday, November 22, 2026'))
    expect(picked).not.toHaveBeenCalled()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    await frame()
    await user.keyboard('{Enter}')
    expect(picked).toHaveBeenCalledWith(new Date(2026, 10, 20))
    expect(day('Friday, November 20, 2026').closest('[role=gridcell]')?.getAttribute('aria-selected')).toBe('true')
  })

  it('draws each day with renderDay, its name and children replaced, still picking', async () => {
    const picked = vi.fn()
    const { user } = renderWithSatin(
      <Calendar
        today={TODAY}
        onValueChange={picked}
        renderDay={(date, state) => (
          <CalendarDay aria-label={`${state.label}${state.today ? ', today' : ''}`} data-weekend={weekend(date) || undefined}>
            {date.getDate()}
            {state.today && <span>•</span>}
          </CalendarDay>
        )}
      />,
    )
    const today = day('Thursday, November 19, 2026, today')
    expect(today.textContent).toContain('•')
    expect(today.getAttribute('aria-current')).toBe('date')
    expect(day('Sunday, November 22, 2026').hasAttribute('data-weekend')).toBe(true)
    await user.click(today)
    expect(picked).toHaveBeenCalledWith(new Date(2026, 10, 19))
  })

  it('says where CalendarDay belongs when it is used on its own', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderWithSatin(<CalendarDay />)).toThrow(/renderDay/)
    error.mockRestore()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<Picker />, { theme })
    await expectNoAxeViolations()
  })
})

describe('Date pickers', () => {
  it('name their open calendar after the field', async () => {
    const { user } = renderWithSatin(
      <>
        <DatePicker label="Delivery date" today={TODAY} />
        <DateRangePicker aria-label="Period" today={TODAY} />
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Delivery date' }))
    expect(screen.getByRole('dialog', { name: 'Delivery date' })).toBeTruthy()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Period' }))
    expect(screen.getByRole('dialog', { name: 'Period' })).toBeTruthy()
    await expectNoAxeViolations()
  })

  it('turn off a day preset whose day isDisabled rules out', () => {
    // Friday 20 November: tomorrow is a Saturday.
    renderWithSatin(<DatePickerPanel today={new Date(2026, 10, 20)} isDisabled={weekend} presets={[datePresets.today, datePresets.tomorrow]} />)
    expect(screen.getByRole('option', { name: 'Today' }).hasAttribute('aria-disabled')).toBe(false)
    expect(screen.getByRole('option', { name: 'Tomorrow' }).getAttribute('aria-disabled')).toBe('true')
  })
})

describe('Calendar week start', () => {
  const weekdays = () => screen.getAllByRole('columnheader').map((h) => h.getAttribute('aria-label'))
  const firstDay = () => within(screen.getAllByRole('row')[1]).getAllByRole('button')[0].getAttribute('aria-label')

  it('starts the week where dateLocale starts it', () => {
    const { unmount } = renderWithSatin(<Calendar value={TODAY} today={TODAY} />, { labels: { dateLocale: 'en-US' } })
    expect(weekdays()[0]).toBe('Sunday')
    expect(firstDay()).toBe('Sunday, November 1, 2026')
    unmount()
    // en-GB: Monday. November 2026 begins on a Sunday, so the first row starts on Monday 26 October.
    renderWithSatin(<Calendar value={TODAY} today={TODAY} />, { labels: { dateLocale: 'en-GB' } })
    expect(weekdays()[0]).toBe('Monday')
    expect(firstDay()).toBe('Monday, 26 October 2026')
  })

  it('starts the week where weekStartsOn says, Home and End included', async () => {
    const { user } = renderWithSatin(<Calendar value={TODAY} today={TODAY} weekStartsOn={0} />, { labels: { dateLocale: 'en-GB' } })
    expect(weekdays()).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    expect(firstDay()).toBe('Sunday, 1 November 2026')
    day('Thursday, 19 November 2026').focus()
    await user.keyboard('{Home}')
    await frame()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Sunday, 15 November 2026')
    await user.keyboard('{End}')
    await frame()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Saturday, 21 November 2026')
  })
})
