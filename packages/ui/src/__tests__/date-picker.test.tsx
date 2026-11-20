import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import {
  DatePicker,
  DatePickerPanel,
  DateRangePickerPanel,
  datePresets,
  type DatePreset,
  type DateRange,
} from '../components/date-picker'

// Wednesday 11 November 2026.
const TODAY = new Date(2026, 10, 11)
const day = (m: number, d: number, y = 2026) => new Date(y, m, d)
const NEW_YEAR: DatePreset<Date> = { label: 'New year', value: day(0, 1, 2027) }
const dayPresets = [datePresets.today, datePresets.tomorrow, datePresets.nextWeek, NEW_YEAR]
const rangePresets = [datePresets.last7Days, datePresets.last30Days, datePresets.thisQuarter]

function Panel(props: Omit<React.ComponentProps<typeof DatePickerPanel>, 'value' | 'onValueChange'> & { initial?: Date | null; onPick?: (d: Date) => void }) {
  const { initial = null, onPick, ...rest } = props
  const [value, setValue] = React.useState<Date | null>(initial)
  return (
    <DatePickerPanel
      today={TODAY}
      presets={dayPresets}
      {...rest}
      value={value}
      onValueChange={(d) => {
        setValue(d)
        onPick?.(d)
      }}
    />
  )
}

const options = () => screen.getAllByRole('option')
const option = (name: string) => screen.getByRole('option', { name: new RegExp(`^${name}`) })
const selected = () => options().filter((o) => o.getAttribute('aria-selected') === 'true')

describe('Date picker presets', () => {
  it('lists the presets as a listbox before the calendar, the one matching the value selected', () => {
    renderWithSatin(<Panel initial={day(10, 12)} />)
    const list = screen.getByRole('listbox', { name: 'Presets' })
    const grid = screen.getByRole('grid')
    expect(list.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual(['Today', 'Tomorrow(selected)', 'Next week', 'New year'])
    expect(selected()).toEqual([option('Tomorrow')])
  })

  it('takes one tab stop, moves with the arrows, Home and End, and picks with Enter', async () => {
    const onPick = vi.fn()
    const { user } = renderWithSatin(<Panel onPick={onPick} />)
    await user.tab()
    expect(document.activeElement).toBe(option('Today'))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(option('Tomorrow'))
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(option('New year'))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(option('New year'))
    await user.keyboard('{Home}{ArrowUp}')
    expect(document.activeElement).toBe(option('Today'))
    await user.keyboard('{ArrowRight}{Enter}')
    expect(onPick).toHaveBeenLastCalledWith(day(10, 12))
    expect(selected()).toEqual([option('Tomorrow')])
    // Arrows only move: nothing was picked on the way.
    expect(onPick).toHaveBeenCalledTimes(1)
    // Focus stays on the preset, and Tab leaves the list in one step.
    expect(document.activeElement).toBe(option('Tomorrow'))
    await user.tab()
    expect(screen.getByRole('listbox').contains(document.activeElement)).toBe(false)
  })

  it('picks with Space, and moves the calendar to the preset’s month with its day as the grid’s tab stop', async () => {
    const onPick = vi.fn()
    const { user } = renderWithSatin(<Panel onPick={onPick} />)
    expect(screen.getByRole('grid', { name: 'November' })).toBeTruthy()
    await user.tab()
    await user.keyboard('{End} ')
    expect(onPick).toHaveBeenLastCalledWith(day(0, 1, 2027))
    const grid = screen.getByRole('grid', { name: 'January' })
    const newYear = within(grid).getByRole('button', { name: 'Friday, January 1, 2027' })
    expect(newYear.closest('[role=gridcell]')?.getAttribute('aria-selected')).toBe('true')
    expect(newYear.tabIndex).toBe(0)
  })

  it('keeps a day reachable with Tab after the arrows turn the month', async () => {
    const { user } = renderWithSatin(<Panel initial={day(10, 18)} />)
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    const grid = screen.getByRole('grid', { name: 'December' })
    const tabbable = within(grid).getAllByRole('button').filter((b) => b.tabIndex === 0)
    expect(tabbable.map((b) => b.getAttribute('aria-label'))).toEqual(['Tuesday, December 1, 2026'])
  })

  it('in DatePicker, a preset picks its day and closes, focus back on the field', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<DatePicker label="Due" today={TODAY} presets={dayPresets} onValueChange={onValueChange} />)
    const trigger = screen.getByRole('button', { name: 'Due' })
    await user.click(trigger)
    // The popover opens on the presets: they go first.
    expect(document.activeElement).toBe(option('Today'))
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(day(10, 12))
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(trigger.textContent).toContain('Nov 12, 2026')
  })

  it('in a range, shows the preset’s range for Apply, and a range picked by hand selects none', async () => {
    const onApply = vi.fn()
    const { user } = renderWithSatin(<DateRangePickerPanel today={TODAY} presets={rangePresets} onApply={onApply} />)
    expect(selected()).toEqual([])
    await user.click(option('Last 30 days'))
    expect(selected()).toEqual([option('Last 30 days')])
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onApply).toHaveBeenLastCalledWith({ from: day(9, 13), to: day(10, 11) })
    // A custom range: no preset matches it.
    const november = within(screen.getByRole('grid', { name: 'November 2026' }))
    await user.click(november.getByRole('button', { name: 'Tuesday, November 3, 2026' }))
    await user.click(november.getByRole('button', { name: 'Friday, November 6, 2026' }))
    expect(selected()).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onApply).toHaveBeenLastCalledWith({ from: day(10, 3), to: day(10, 6) })
  })

  it('selects the preset matching the range it opens with', () => {
    renderWithSatin(<DateRangePickerPanel today={TODAY} presets={rangePresets} value={{ from: day(10, 5), to: day(10, 11) }} />)
    expect(selected()).toEqual([option('Last 7 days')])
  })

  it('cuts a range to min and max, and disables a preset outside them, skipped by the arrows', async () => {
    const onApply = vi.fn()
    const { user } = renderWithSatin(
      <DateRangePickerPanel today={TODAY} max={TODAY} presets={[datePresets.last7Days, datePresets.tomorrow, datePresets.thisQuarter]} onApply={onApply} />,
    )
    expect(option('Tomorrow').getAttribute('aria-disabled')).toBe('true')
    await user.tab()
    expect(document.activeElement).toBe(option('Last 7 days'))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(option('This quarter'))
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onApply).toHaveBeenLastCalledWith({ from: day(9, 1), to: day(10, 11) })
  })

  it('speaks the app’s words and starts the week where the locale does', async () => {
    const onPick = vi.fn()
    const { user } = renderWithSatin(<Panel onPick={onPick} presets={[datePresets.nextWeek, datePresets.today]} />, {
      labels: { dateLocale: 'pl-PL', presets: 'Skróty', presetNextWeek: 'Przyszły tydzień', presetToday: 'Dziś' },
    })
    expect(screen.getByRole('listbox', { name: 'Skróty' })).toBeTruthy()
    expect(screen.getAllByRole('columnheader')[0].getAttribute('aria-label')).toBe('poniedziałek')
    await user.click(option('Przyszły tydzień'))
    // Monday 16 November: the week starts on Monday in Poland.
    expect(onPick).toHaveBeenLastCalledWith(day(10, 16))
  })

  it('starts the week on Sunday in en-US, or on weekStartsOn', async () => {
    const onPick = vi.fn()
    const { user, unmount } = renderWithSatin(<Panel onPick={onPick} />)
    expect(screen.getAllByRole('columnheader')[0].getAttribute('aria-label')).toBe('Sunday')
    await user.click(option('Next week'))
    expect(onPick).toHaveBeenLastCalledWith(day(10, 15))
    unmount()
    renderWithSatin(<Panel weekStartsOn={1} />)
    expect(screen.getAllByRole('columnheader')[0].getAttribute('aria-label')).toBe('Monday')
  })

  it('works the built-in values out from today', () => {
    const value = <T,>(p: DatePreset<T & (Date | DateRange)>) => (typeof p.value === 'function' ? p.value(TODAY, { weekStartsOn: 1 }) : p.value)
    expect(value(datePresets.today)).toEqual(day(10, 11))
    expect(value(datePresets.tomorrow)).toEqual(day(10, 12))
    expect(value(datePresets.nextWeek)).toEqual(day(10, 16))
    expect(value(datePresets.last7Days)).toEqual({ from: day(10, 5), to: day(10, 11) })
    expect(value(datePresets.last30Days)).toEqual({ from: day(9, 13), to: day(10, 11) })
    expect(value(datePresets.thisQuarter)).toEqual({ from: day(9, 1), to: day(11, 31) })
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <>
        <Panel initial={day(10, 12)} />
        <DateRangePickerPanel today={TODAY} presets={rangePresets} value={{ from: day(9, 13), to: day(10, 11) }} />
      </>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})
