import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin, setReducedMotion } from 'satin-test'
import { Form, type FormValues } from '../components/form'
import { FormField } from '../components/form-field'
import { DateTimePicker, DateTimePickerPanel, TimeList, TimePicker, formatTime, localeTimeFormat, parseTime } from '../components/time-picker'

// Intl writes "2:30 PM" with a narrow no-break space; compare with plain spaces.
const plain = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ')
const t = (hours: number, minutes = 0) => ({ hours, minutes })
const NINE = t(9)

describe('parseTime', () => {
  it.each([
    ['930', t(9, 30)],
    ['0930', t(9, 30)],
    ['1430', t(14, 30)],
    ['9', t(9)],
    ['14', t(14)],
    ['9:30', t(9, 30)],
    ['9.30', t(9, 30)],
    ['9h30', t(9, 30)],
    ['9 30', t(9, 30)],
    ['21:30', t(21, 30)],
    ['9:30pm', t(21, 30)],
    ['9:30 PM', t(21, 30)],
    ['9 p.m.', t(21)],
    ['9a', t(9)],
    ['12am', t(0)],
    ['12 pm', t(12)],
    ['9:30:15', t(9, 30)],
    ['9:30 PM', t(21, 30)],
  ])('reads %s', (text, time) => {
    expect(parseTime(text)).toEqual(time)
  })

  it.each(['', 'abc', '25:00', '9:75', '13pm', '12345', '9:30 xm'])('rejects %j', (text) => {
    expect(parseTime(text)).toBeNull()
  })

  it('takes the locale’s own AM and PM words', () => {
    expect(parseTime('오후 2:30', 'ko-KR')).toEqual(t(14, 30))
  })
})

describe('formatTime', () => {
  it('writes 12 or 24 hours as the locale does', () => {
    expect(localeTimeFormat('en-US')).toBe('12h')
    expect(localeTimeFormat('pl-PL')).toBe('24h')
    expect(plain(formatTime(t(14, 30), 'en-US'))).toBe('2:30 PM')
    expect(formatTime(t(14, 30), 'pl-PL')).toBe('14:30')
    expect(plain(formatTime(t(14, 30), 'pl-PL', '12h'))).toMatch(/^2:30/)
  })
})

describe('TimePicker', () => {
  const scrollTo = HTMLElement.prototype.scrollTo
  afterEach(() => {
    setReducedMotion(false)
    HTMLElement.prototype.scrollTo = scrollTo
  })

  it('is a combobox named by its label, with the format hint as its description', () => {
    renderWithSatin(<TimePicker label="Start" />)
    const input = screen.getByRole('combobox', { name: 'Start' })
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(plain(input.getAttribute('placeholder'))).toBe('2:30 PM')
    const hint = document.getElementById(input.getAttribute('aria-describedby')!.split(' ')[0])
    expect(plain(hint?.textContent)).toBe('Type a time like 2:30 PM')
  })

  it('reads a typed time on Enter and writes it in the locale', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<TimePicker label="Start" onValueChange={onValueChange} />)
    const input = screen.getByRole('combobox', { name: 'Start' }) as HTMLInputElement
    await user.click(input)
    await user.keyboard('930{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(t(9, 30))
    expect(plain(input.value)).toBe('9:30 AM')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('reads a typed time on leaving the field', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<TimePicker label="Start" onValueChange={onValueChange} />)
    await user.click(screen.getByRole('combobox', { name: 'Start' }))
    await user.keyboard('9:30pm')
    await user.tab()
    expect(onValueChange).toHaveBeenLastCalledWith(t(21, 30))
  })

  it('takes the afternoon for an hour without AM or PM when the morning is disabled', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<TimePicker label="Start" min={NINE} onValueChange={onValueChange} />)
    await user.click(screen.getByRole('combobox', { name: 'Start' }))
    await user.keyboard('2{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(t(14))
  })

  it('says when the typed text isn’t a time, and when the time isn’t available', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<TimePicker label="Start" min={NINE} defaultValue={t(10)} onValueChange={onValueChange} />)
    const input = screen.getByRole('combobox', { name: 'Start' })
    await user.clear(input)
    await user.keyboard('abc')
    await user.tab()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(plain(screen.getByText(/Enter a time/).textContent)).toBe('Enter a time like 2:30 PM')
    expect(onValueChange).toHaveBeenLastCalledWith(null)

    await user.clear(input)
    await user.keyboard('8:00am')
    await user.tab()
    expect(plain(screen.getByText(/available/).textContent)).toBe('8:00 AM isn’t available')
    await user.clear(input)
    await user.keyboard('10:30')
    await user.tab()
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(onValueChange).toHaveBeenLastCalledWith(t(10, 30))
  })

  it('opens with ↓ on the picked time, moves past disabled times, picks with Enter', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(
      <TimePicker label="Start" step={30} defaultValue={t(10)} isTimeDisabled={(x) => x.hours === 10 && x.minutes === 30} onValueChange={onValueChange} />,
    )
    const input = screen.getByRole('combobox', { name: 'Start' })
    await user.tab()
    expect(document.activeElement).toBe(input)
    await user.keyboard('{ArrowDown}')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    const active = () => plain(document.getElementById(input.getAttribute('aria-activedescendant')!)?.textContent)
    expect(active()).toMatch(/^10:00 AM/)
    expect(screen.getByRole('option', { name: /10:30 AM/ }).getAttribute('aria-disabled')).toBe('true')
    await user.keyboard('{ArrowDown}')
    expect(active()).toMatch(/^11:00 AM/)
    await user.keyboard('{PageDown}')
    expect(active()).toMatch(/^12:00 PM/)
    await user.keyboard('{PageUp}{ArrowUp}')
    expect(active()).toMatch(/^10:00 AM/)
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(t(11))
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(input)
  })

  it('jumps the list to what is typed (type-ahead)', async () => {
    const { user } = renderWithSatin(<TimePicker label="Start" step={30} format="24h" />)
    const input = screen.getByRole('combobox', { name: 'Start' })
    await user.click(input)
    await user.keyboard('14')
    expect(document.getElementById(input.getAttribute('aria-activedescendant')!)?.textContent).toMatch(/^14:00/)
    // "143" reads as 1:43 on the way to "1430".
    await user.keyboard('3')
    expect(document.getElementById(input.getAttribute('aria-activedescendant')!)?.textContent).toMatch(/^01:30/)
    await user.keyboard('0')
    expect(document.getElementById(input.getAttribute('aria-activedescendant')!)?.textContent).toMatch(/^14:30/)
  })

  it('closes with Escape and keeps the focus; a second Escape puts back the time', async () => {
    const { user } = renderWithSatin(<TimePicker label="Start" defaultValue={t(10)} />)
    const input = screen.getByRole('combobox', { name: 'Start' }) as HTMLInputElement
    await user.click(input)
    expect(screen.getByRole('listbox')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(input)
    await user.clear(input)
    await user.keyboard('11')
    await user.keyboard('{Escape}{Escape}')
    expect(plain(input.value)).toBe('10:00 AM')
  })

  it('picks a time with a click, from the chevron’s list', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<TimePicker label="Start" step={30} onValueChange={onValueChange} />)
    await user.click(screen.getByRole('button', { name: 'Show times' }))
    await user.click(screen.getByRole('option', { name: /^3:30 PM/ }))
    expect(onValueChange).toHaveBeenLastCalledWith(t(15, 30))
  })

  it('speaks the app’s language: 24 hours from the locale, translated words', async () => {
    const { user } = renderWithSatin(<TimePicker label="Start" defaultValue={t(14, 30)} />, {
      labels: { dateLocale: 'pl-PL', showTimes: 'Pokaż godziny', timeHint: (e) => `Wpisz godzinę, np. ${e}`, timeInvalid: (e) => `Wpisz godzinę, np. ${e}` },
    })
    const input = screen.getByRole('combobox', { name: 'Start' }) as HTMLInputElement
    expect(input.value).toBe('14:30')
    expect(document.getElementById(input.getAttribute('aria-describedby')!.split(' ')[0])?.textContent).toBe('Wpisz godzinę, np. 14:30')
    await user.clear(input)
    await user.keyboard('xx')
    await user.tab()
    expect(screen.getByText('Wpisz godzinę, np. 14:30', { selector: 'p' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pokaż godziny', hidden: true })).toBeTruthy()
  })

  it('fits a Form: submits HH:mm by name and shows the error keyed by it', async () => {
    const onSubmitValues = vi.fn<(v: FormValues) => void>()
    const { user } = renderWithSatin(
      <Form errors={{ start: 'Pick a time from 9:00' }} onSubmitValues={onSubmitValues}>
        <FormField label="Start" name="start" description="30-minute slots">
          <TimePicker defaultValue={t(14, 30)} step={30} />
        </FormField>
        <button type="submit">Book</button>
      </Form>,
    )
    const input = screen.getByRole('combobox', { name: 'Start' })
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Pick a time from 9:00')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Book' }))
    expect(onSubmitValues.mock.calls[0][0]).toEqual({ start: '14:30' })
    expect(document.activeElement).toBe(input)
    // The list takes the FormField's label as its name.
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox', { name: 'Start' })).toBeTruthy()
  })

  it('scrolls a type-ahead jump smoothly, and at once under reduced motion', async () => {
    const scrollTo = vi.fn()
    HTMLElement.prototype.scrollTo = scrollTo as unknown as HTMLElement['scrollTo']
    const { user } = renderWithSatin(<TimePicker label="Start" format="24h" />)
    await user.click(screen.getByRole('combobox', { name: 'Start' }))
    // Opening puts the time in view with no scroll to watch.
    expect(scrollTo.mock.calls.every(([o]) => o.behavior === 'auto')).toBe(true)
    await user.keyboard('1')
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'smooth' }))
    setReducedMotion(true)
    await user.keyboard('8')
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }))
  })

  it.each(['light', 'dark'] as const)('has no axe violations open, in %s', async (theme) => {
    const { user } = renderWithSatin(<TimePicker label="Start" defaultValue={t(14, 30)} min={NINE} step={30} />, { theme })
    await user.click(screen.getByRole('combobox', { name: 'Start' }))
    expect(screen.getByRole('listbox')).toBeTruthy()
    await expectNoAxeViolations()
  })
})

describe('TimeList', () => {
  it('moves with the keys, jumps to typed times, picks with Enter', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<TimeList step={30} format="24h" min={NINE} defaultValue={t(10)} onValueChange={onValueChange} />)
    const list = screen.getByRole('listbox', { name: 'Time' })
    const active = () => document.getElementById(list.getAttribute('aria-activedescendant')!)?.textContent
    await user.tab()
    expect(document.activeElement).toBe(list)
    expect(active()).toMatch(/^10:00/)
    await user.keyboard('{Home}')
    expect(active()).toMatch(/^09:00/)
    await user.keyboard('{ArrowUp}')
    expect(active()).toMatch(/^09:00/)
    await user.keyboard('{End}')
    expect(active()).toMatch(/^23:30/)
    await user.keyboard('1630')
    expect(active()).toMatch(/^16:30/)
    await user.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(t(16, 30))
    expect(screen.getByRole('option', { name: /^16:30/ }).getAttribute('aria-selected')).toBe('true')
  })
})

describe('DateTimePicker', () => {
  const TODAY = new Date(2026, 10, 19)

  it('picks a day, then a time, and stays open until Enter on the picked time', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(
      <DateTimePicker label="Demo" defaultValue={new Date(2026, 10, 26, 14, 30)} step={30} minTime={NINE} today={TODAY} onValueChange={onValueChange} name="when" />,
    )
    const trigger = screen.getByRole('button', { name: /Demo/ })
    expect(plain(trigger.textContent)).toContain('Thu, Nov 26, 2026, 2:30 PM')
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Demo' })).toBeTruthy()
    expect(screen.getByRole('option', { name: /^8:30 AM/ }).getAttribute('aria-disabled')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Friday, November 27, 2026' }))
    // The time stays, so the new day is picked at once.
    expect(onValueChange).toHaveBeenLastCalledWith(new Date(2026, 10, 27, 14, 30))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await user.click(screen.getByRole('option', { name: /^3:00 PM/ }))
    expect(onValueChange).toHaveBeenLastCalledWith(new Date(2026, 10, 27, 15, 0))
    // The panel stays, so the day can still change; the list keeps the focus.
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('listbox', { name: 'Time' }))
    expect(plain(trigger.textContent)).toContain('Fri, Nov 27, 2026, 3:00 PM')
    // Enter on a time not yet picked picks it; Enter on the picked time closes.
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(new Date(2026, 10, 27, 15, 30))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(plain(trigger.textContent)).toContain('Fri, Nov 27, 2026, 3:30 PM')
    expect((document.querySelector('input[name="when"]') as HTMLInputElement).value).toBe('2026-11-27T15:30')
  })

  it('closes with Escape and gives focus back to the field', async () => {
    const { user } = renderWithSatin(<DateTimePicker label="Demo" defaultValue={new Date(2026, 10, 26, 14, 30)} step={30} today={TODAY} />)
    const trigger = screen.getByRole('button', { name: /Demo/ })
    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: /^4:00 PM/ }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(plain(trigger.textContent)).toContain('4:00 PM')
  })

  it('moves to the times after a day is picked with nothing picked yet', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<DateTimePickerPanel today={TODAY} format="24h" step={60} onValueChange={onValueChange} />)
    await user.click(screen.getByRole('button', { name: 'Thursday, November 26, 2026' }))
    expect(onValueChange).not.toHaveBeenCalled()
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.activeElement).toBe(screen.getByRole('listbox', { name: 'Time' }))
    fireEvent.keyDown(document.activeElement!, { key: '1' })
    fireEvent.keyDown(document.activeElement!, { key: '4' })
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
    expect(onValueChange).toHaveBeenLastCalledWith(new Date(2026, 10, 26, 14, 0))
  })

  it.each(['light', 'dark'] as const)('has no axe violations open, in %s', async (theme) => {
    const { user } = renderWithSatin(<DateTimePicker label="Demo" defaultValue={new Date(2026, 10, 26, 14, 30)} step={30} minTime={NINE} today={TODAY} />, { theme })
    await user.click(screen.getByRole('button', { name: /Demo/ }))
    await expectNoAxeViolations()
  })
})
