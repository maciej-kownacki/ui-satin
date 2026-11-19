import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Calendar } from '../components/date-picker'

const NOV_19 = new Date(2026, 10, 19)
const weekdays = () => screen.getAllByRole('columnheader').map((h) => h.getAttribute('aria-label'))

describe('Calendar', () => {
  it('starts the week on Monday by default', () => {
    renderWithSatin(<Calendar value={NOV_19} today={NOV_19} />)
    expect(weekdays()[0]).toBe('Monday')
    // November 2026 begins on a Sunday: the first row starts on Monday 26 October.
    const first = within(screen.getAllByRole('row')[1]).getAllByRole('button')[0]
    expect(first.getAttribute('aria-label')).toBe('Monday, October 26, 2026')
  })

  it('starts the week where weekStartsOn says, Home and End included', async () => {
    const { user } = renderWithSatin(<Calendar value={NOV_19} today={NOV_19} weekStartsOn={0} />, { labels: { dateLocale: 'en-US' } })
    expect(weekdays()).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    const first = within(screen.getAllByRole('row')[1]).getAllByRole('button')[0]
    expect(first.getAttribute('aria-label')).toBe('Sunday, November 1, 2026')
    screen.getByRole('button', { name: 'Thursday, November 19, 2026' }).focus()
    await user.keyboard('{Home}')
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Sunday, November 15, 2026')
    await user.keyboard('{End}')
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Saturday, November 21, 2026')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<Calendar value={NOV_19} today={NOV_19} weekStartsOn={0} />, { theme })
    await expectNoAxeViolations()
  })
})
