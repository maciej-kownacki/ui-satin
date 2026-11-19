import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Select } from '../components/select'

const options = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'In review' },
  { value: 'done', label: 'Done' },
]

describe('Select', () => {
  it('opens with Enter, moves with the arrows and picks with Enter', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<Select label="Status" options={options} defaultValue="draft" onValueChange={onValueChange} />)
    const trigger = screen.getByRole('combobox', { name: 'Status' })
    await user.tab()
    expect(document.activeElement).toBe(trigger)
    await user.keyboard('{Enter}')
    expect(screen.getByRole('listbox')).toBeTruthy()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('review')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(trigger.textContent).toContain('In review')
  })

  it('closes with Escape, focus back on the trigger, value kept', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<Select label="Status" options={options} defaultValue="draft" onValueChange={onValueChange} />)
    const trigger = screen.getByRole('combobox', { name: 'Status' })
    await user.tab()
    await user.keyboard('{Enter}')
    await user.keyboard('{ArrowDown}{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it.each(['light', 'dark'] as const)('has no axe violations, closed and open, in %s', async (theme) => {
    const { user } = renderWithSatin(<Select label="Status" options={options} defaultValue="draft" />, { theme })
    await expectNoAxeViolations()
    await user.click(screen.getByRole('combobox', { name: 'Status' }))
    await expectNoAxeViolations()
  })
})
