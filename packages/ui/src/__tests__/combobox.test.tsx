import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Combobox } from '../components/combobox'

const options = [
  { value: 'ams', label: 'Amsterdam' },
  { value: 'ber', label: 'Berlin' },
  { value: 'waw', label: 'Warsaw' },
]

describe('Combobox', () => {
  it('opens with Enter, filters as you type, picks with the arrows and Enter', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<Combobox label="City" options={options} onValueChange={onValueChange} />)
    const trigger = screen.getByRole('button', { name: /City/ })
    await user.tab()
    expect(document.activeElement).toBe(trigger)
    await user.keyboard('{Enter}')
    const search = screen.getByRole('combobox')
    expect(document.activeElement).toBe(search)
    await user.keyboard('ar')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Warsaw'])
    await user.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(['waw'])
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('closes with Escape and gives focus back to the field', async () => {
    const { user } = renderWithSatin(<Combobox label="City" options={options} />)
    const trigger = screen.getByRole('button', { name: /City/ })
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('listbox')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('says "no results" in the words it is given', async () => {
    const { user } = renderWithSatin(<Combobox label="City" options={options} />, { labels: { noResults: 'Brak wyników' } })
    await user.click(screen.getByRole('button', { name: /City/ }))
    await user.keyboard('xyz')
    expect(screen.getByText('Brak wyników')).toBeTruthy()
  })

  it('names its panel after the field', async () => {
    const { user } = renderWithSatin(<Combobox label="City" options={options} />)
    await user.click(screen.getByRole('button', { name: /City/ }))
    expect(screen.getByRole('dialog', { name: 'City' })).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations open, in %s', async (theme) => {
    const { user } = renderWithSatin(<Combobox label="City" options={options} />, { theme })
    await user.click(screen.getByRole('button', { name: /City/ }))
    await expectNoAxeViolations()
  })
})
