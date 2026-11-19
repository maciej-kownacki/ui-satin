import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Combobox } from '../components/combobox'
import type { SelectGroup, SelectOption } from '../components/select'

const groups: SelectGroup[] = [
  { label: 'Recent', options: [{ value: 'waw', label: 'Warsaw' }] },
  {
    label: 'Europe',
    options: [
      { value: 'ams', label: 'Amsterdam' },
      { value: 'ber', label: 'Berlin' },
    ],
  },
]

const CITIES: SelectOption[] = [
  { value: 'ams', label: 'Amsterdam' },
  { value: 'ber', label: 'Berlin' },
  { value: 'waw', label: 'Warsaw' },
]

/** The app filters: results follow the query it gets, and the picks are kept as options. */
function Remote({ onQuery }: { onQuery?: (q: string) => void }) {
  const [results, setResults] = React.useState(CITIES)
  const [picked, setPicked] = React.useState<SelectOption[]>([])
  return (
    <Combobox
      label="City"
      multiple
      filter={false}
      options={results}
      selectedOptions={picked}
      value={picked.map((o) => o.value)}
      onValueChange={(v) => setPicked(v.map((x) => CITIES.find((o) => o.value === x)!))}
      onQueryChange={(q) => {
        onQuery?.(q)
        setResults(CITIES.filter((o) => o.label.toLowerCase().startsWith(q.toLowerCase())))
      }}
    />
  )
}

describe('Combobox: groups and app-side search', () => {
  it('lists titled groups, named by their headers, and moves across them with the arrows', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<Combobox label="City" options={groups} onValueChange={onValueChange} />)
    await user.click(screen.getByRole('button', { name: /City/ }))
    const recent = screen.getByRole('group', { name: 'Recent' })
    expect(within(recent).getAllByRole('option').map((o) => o.textContent)).toEqual(['Warsaw'])
    expect(screen.getByRole('group', { name: 'Europe' })).toBeTruthy()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(['ams'])
  })

  it('leaves out a group the query empties', async () => {
    const { user } = renderWithSatin(<Combobox label="City" options={groups} />)
    await user.click(screen.getByRole('button', { name: /City/ }))
    await user.keyboard('ber')
    expect(screen.queryByRole('group', { name: 'Recent' })).toBeNull()
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Berlin'])
  })

  it('with filter off, hands the query to the app and keeps picks the results no longer hold', async () => {
    const onQuery = vi.fn()
    const { user } = renderWithSatin(<Remote onQuery={onQuery} />)
    await user.click(screen.getByRole('button', { name: /City/ }))
    await user.keyboard('w')
    expect(onQuery).toHaveBeenLastCalledWith('w')
    await user.keyboard('{Enter}')
    await user.keyboard('{Backspace}a')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Amsterdam'])
    // Warsaw left the results but stays picked, with its chip.
    expect(screen.getByRole('button', { name: 'Remove Warsaw' })).toBeTruthy()
  })

  it('says it is loading while the app searches and nothing is listed yet', async () => {
    const { user } = renderWithSatin(<Combobox label="City" options={[]} filter={false} loading />, { labels: { loading: 'Ładowanie' } })
    await user.click(screen.getByRole('button', { name: /City/ }))
    expect(screen.getByRole('listbox').getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Ładowanie')).toBeTruthy()
  })

  it('draws rows and picks with renderOption and renderValue', async () => {
    const { user } = renderWithSatin(
      <Combobox
        label="City"
        options={CITIES}
        defaultValue={['ber']}
        renderOption={(o, { selected }) => <span>{`${o.label}${selected ? ' (here)' : ''}`}</span>}
        renderValue={(picked) => <span data-testid="value">{picked.map((o) => o.label.toUpperCase()).join()}</span>}
      />,
    )
    expect(screen.getByTestId('value').textContent).toBe('BERLIN')
    await user.click(screen.getByRole('button', { name: /City/ }))
    expect(screen.getByRole('option', { name: 'Berlin (here)' })).toBeTruthy()
  })

  it('gives focus back to the field after Clear', async () => {
    const { user } = renderWithSatin(<Combobox label="City" multiple options={CITIES} defaultValue={['ams', 'ber']} />)
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /City/ }))
  })

  it('says "no results" from a status region outside the listbox', async () => {
    const { user } = renderWithSatin(<Combobox label="City" options={groups} />)
    await user.click(screen.getByRole('button', { name: /City/ }))
    await user.keyboard('xyz')
    expect(screen.getByRole('status').textContent).toBe('No results')
    expect(screen.getByRole('listbox', { hidden: true }).children).toHaveLength(0)
  })

  it.each(['light', 'dark'] as const)('has no axe violations with groups open, and with no results, in %s', async (theme) => {
    const { user } = renderWithSatin(<Combobox label="City" options={groups} />, { theme })
    await user.click(screen.getByRole('button', { name: /City/ }))
    await expectNoAxeViolations()
    await user.keyboard('xyz')
    await expectNoAxeViolations()
  })
})
