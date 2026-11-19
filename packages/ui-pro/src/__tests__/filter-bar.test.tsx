import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Item, List } from '@uisatin/ui/list'
import { FilterBar, applyFilters, isFilterValid, type Filter, type FilterField, type FilterView } from '../components/filter-bar'

const fields: FilterField[] = [
  {
    key: 'stage',
    label: 'Stage',
    type: 'enum',
    options: [
      { value: 'lead', label: 'Lead' },
      { value: 'interview', label: 'Interview' },
      { value: 'won', label: 'Won' },
    ],
  },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'value', label: 'Value', type: 'number', operators: ['gt', 'lt', 'between'], format: { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 } },
  { key: 'close', label: 'Close date', type: 'date', operators: ['inThis', 'inLast', 'between'] },
  {
    key: 'owner',
    label: 'Owner',
    type: 'person',
    me: 'tara',
    options: [
      { value: 'tara', label: 'Tara Mendes' },
      { value: 'jon', label: 'Jon Park' },
    ],
  },
  { key: 'tags', label: 'Tags', type: 'multi', options: [{ value: 'vip', label: 'VIP' }, { value: 'eu', label: 'EU' }, { value: 'new', label: 'New' }] },
]

type Deal = { company: string; stage: string; value: number; close: string; owner: string; tags: string[] }
const deals: Deal[] = [
  { company: 'Acme Corp', stage: 'interview', value: 48000, close: '2026-11-28', owner: 'tara', tags: ['vip'] },
  { company: 'Globex', stage: 'lead', value: 12000, close: '2026-12-15', owner: 'jon', tags: ['eu'] },
  { company: 'Initech', stage: 'interview', value: 31000, close: '2027-01-20', owner: 'tara', tags: ['eu', 'new'] },
  { company: 'Umbrella', stage: 'won', value: 9000, close: '2026-10-02', owner: 'tara', tags: [] },
]
const today = new Date(2026, 10, 19)

/** A FilterBar over a plain List, wired the way the docs show. */
function Deals({ initial = [] as Filter[], onChange, views, onSaveView, maxVisible }: { initial?: Filter[]; onChange?: (v: Filter[]) => void; views?: FilterView[]; onSaveView?: (name: string, v: Filter[]) => void; maxVisible?: number }) {
  const [value, setValue] = React.useState(initial)
  const [query, setQuery] = React.useState('')
  const shown = applyFilters(deals, value, fields, { today }).filter((d) => d.company.toLowerCase().includes(query.toLowerCase()))
  return (
    <div>
      <FilterBar
        fields={fields}
        value={value}
        onValueChange={(v) => {
          setValue(v)
          onChange?.(v)
        }}
        search
        query={query}
        onQueryChange={setQuery}
        resultCount={shown.length}
        resultLabel={(count, number) => (
          <>
            {number} {count === 1 ? 'deal' : 'deals'}
          </>
        )}
        views={views}
        onSaveView={onSaveView}
        maxVisible={maxVisible}
        today={today}
      />
      <List aria-label="Deals">
        {shown.map((d) => (
          <Item key={d.company} title={d.company} />
        ))}
      </List>
    </div>
  )
}

const chip = (name: string) => screen.getByRole('button', { name })
const rows = () => within(screen.getByRole('list', { name: 'Deals' })).queryAllByRole('listitem').map((li) => li.textContent)

describe('FilterBar', () => {
  it('shows just + Filter when empty, and each filter as a chip button', () => {
    const { unmount } = renderWithSatin(<FilterBar fields={fields} />)
    const bar = screen.getByRole('group', { name: 'Filters' })
    expect(within(bar).getAllByRole('button').map((b) => b.textContent)).toEqual(['FilterF'])
    unmount()
    renderWithSatin(
      <FilterBar
        fields={fields}
        defaultValue={[
          { field: 'stage', operator: 'is', value: 'interview' },
          { field: 'value', operator: 'gt', value: 20000 },
          { field: 'close', operator: 'inThis', value: 'quarter' },
          { field: 'owner', operator: 'is', value: 'tara' },
        ]}
      />,
    )
    expect(chip('Stage is Interview')).toBeTruthy()
    // The symbol shows; screen readers hear it in words.
    expect(chip('Value greater than €20,000').textContent).toBe('Value>€20,000')
    expect(chip('Close date this quarter')).toBeTruthy()
    expect(chip('Owner is me')).toBeTruthy()
    expect(chip('Remove Stage is Interview')).toBeTruthy()
  })

  it('round-trips its value through JSON', async () => {
    const value: Filter[] = [
      { field: 'stage', operator: 'isAnyOf', value: ['interview', 'won'] },
      { field: 'value', operator: 'between', value: [10000, 50000] },
      { field: 'close', operator: 'between', value: ['2026-11-01', '2026-12-31'] },
    ]
    const copy: Filter[] = JSON.parse(JSON.stringify(value))
    expect(copy).toEqual(value)
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals initial={copy} onChange={onChange} />)
    expect(chip('Stage is any of Interview or Won')).toBeTruthy()
    expect(chip('Value between €10,000 and €50,000')).toBeTruthy()
    expect(chip('Close date between Nov 1 – Dec 31, 2026')).toBeTruthy()
    expect(rows()).toEqual(['Acme Corp'])
    await user.click(chip('Remove Close date between Nov 1 – Dec 31, 2026'))
    const emitted = onChange.mock.lastCall![0] as Filter[]
    expect(JSON.parse(JSON.stringify(emitted))).toEqual(value.slice(0, 2))
  })

  it('adds a filter from + Filter: pick a field, then a value, and the list follows', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals onChange={onChange} />)
    expect(rows()).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Stage' }))
    // The editor opens with the value list open (which hides the rest from screen readers meanwhile).
    expect(screen.getByRole('dialog', { name: 'Stage', hidden: true })).toBeTruthy()
    await user.click(await screen.findByRole('option', { name: 'Interview' }))
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'stage', operator: 'is', value: 'interview' }])
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(rows()).toEqual(['Acme Corp', 'Initech'])
    await waitFor(() => expect(document.activeElement).toBe(chip('Stage is Interview')))
  })

  it('drops a new chip closed before it has a value', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Company' }))
    expect(screen.getByRole('textbox', { name: 'Company contains' })).toBe(document.activeElement)
    await user.keyboard('{Escape}')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /^Company/ })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Filter' })))
  })

  it('edits text live and closes with Enter', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Company' }))
    await user.keyboard('glo')
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'company', operator: 'contains', value: 'glo' }])
    expect(rows()).toEqual(['Globex'])
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(chip('Company contains “glo”')).toBeTruthy()
  })

  it('takes a number, and a new operator keeps it', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Value' }))
    const field = screen.getByRole('spinbutton', { name: 'Value greater than' })
    expect(document.activeElement).toBe(field)
    await user.clear(field)
    await user.type(field, '20000{Enter}')
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'value', operator: 'gt', value: 20000 }])
    expect(rows()).toEqual(['Acme Corp', 'Initech'])
    await user.click(chip('Value greater than €20,000'))
    await user.click(screen.getByRole('combobox', { name: 'Value' }))
    await user.click(await screen.findByRole('option', { name: /between/ }))
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'value', operator: 'between', value: [20000, 20000] }])
  })

  it('sets a date period, and its list opens by itself', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Close date' }))
    await user.click(await screen.findByRole('option', { name: 'quarter' }))
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'close', operator: 'inThis', value: 'quarter' }])
    expect(rows()).toEqual(['Acme Corp', 'Globex', 'Umbrella'])
  })

  it('picks people from a searchable list, me first', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Owner' }))
    const options = await screen.findAllByRole('option')
    expect(options[0].textContent).toContain('Me')
    await user.click(options[0])
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'owner', operator: 'is', value: 'tara' }])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Owner' })).toBeNull())
    expect(chip('Owner is me')).toBeTruthy()
  })

  it('opens a chip with Enter, closes with Escape, and removes it with Backspace', async () => {
    const { user } = renderWithSatin(
      <Deals
        initial={[
          { field: 'stage', operator: 'is', value: 'interview' },
          { field: 'owner', operator: 'is', value: 'tara' },
        ]}
      />,
    )
    chip('Stage is Interview').focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog', { name: 'Stage' })).toBeTruthy()
    // The operator and the value are labelled: "Stage", "Stage is".
    expect(screen.getByRole('combobox', { name: 'Stage' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Stage is' }))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(document.activeElement).toBe(chip('Stage is Interview')))
    await user.keyboard('{Backspace}')
    expect(screen.queryByRole('button', { name: 'Stage is Interview' })).toBeNull()
    // Focus moves to the chip that took its place.
    expect(document.activeElement).toBe(chip('Owner is me'))
    expect(screen.getByRole('status').textContent).toBe('Stage is Interview removed')
  })

  it('removes the last chip with Backspace in the empty search', async () => {
    const { user } = renderWithSatin(
      <Deals
        initial={[
          { field: 'stage', operator: 'is', value: 'interview' },
          { field: 'owner', operator: 'is', value: 'tara' },
        ]}
      />,
    )
    const search = screen.getByRole('textbox', { name: 'Search' })
    await user.click(search)
    await user.keyboard('a{Backspace}')
    expect(chip('Owner is me')).toBeTruthy()
    await user.keyboard('{Backspace}')
    expect(screen.queryByRole('button', { name: 'Owner is me' })).toBeNull()
    expect(document.activeElement).toBe(search)
    await user.keyboard('{Backspace}')
    expect(screen.queryByRole('button', { name: 'Stage is Interview' })).toBeNull()
  })

  it('shows a filter that cannot apply, says why, and leaves it out', async () => {
    const broken: Filter[] = [{ field: 'value', operator: 'between', value: [40000, 10000] }]
    expect(isFilterValid(broken[0], fields)).toBe(false)
    const { user } = renderWithSatin(<Deals initial={broken} />)
    const c = chip('Value between €40,000 and €10,000')
    expect(c.closest('[data-slot="filter-chip"]')?.hasAttribute('data-invalid')).toBe(true)
    expect(c.getAttribute('aria-describedby') && document.getElementById(c.getAttribute('aria-describedby')!)?.textContent).toBe('Check the range')
    expect(rows()).toHaveLength(4)
    await user.click(c)
    expect(within(screen.getByRole('dialog', { name: 'Value' })).getByText('Check the range')).toBeTruthy()
  })

  it('folds chips past maxVisible into +N more', async () => {
    const many: Filter[] = ['lead', 'interview', 'won'].map((v) => ({ field: 'stage', operator: 'isNot', value: v }))
    const { user } = renderWithSatin(<Deals initial={many} maxVisible={1} />)
    expect(screen.queryByRole('button', { name: 'Stage is not Interview' })).toBeNull()
    await user.click(screen.getByRole('button', { name: '+2 more' }))
    expect(chip('Stage is not Won')).toBeTruthy()
    expect(document.activeElement).toBe(chip('Stage is not Interview'))
  })

  it('shows the count live and reads it out once it settles', async () => {
    const { user } = renderWithSatin(<Deals />)
    expect(screen.getByText((_, el) => el?.getAttribute('data-slot') === 'filter-bar-count' && el.textContent === '44 deals')).toBeTruthy()
    await user.click(screen.getByRole('textbox', { name: 'Search' }))
    await user.keyboard('acme')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('1 deal'))
  })

  it('applies a view and saves the filters as a new one', async () => {
    const onSaveView = vi.fn()
    const views: FilterView[] = [{ id: 'mine', label: 'My deals', value: [{ field: 'owner', operator: 'is', value: 'tara' }] }]
    const { user } = renderWithSatin(<Deals views={views} onSaveView={onSaveView} />)
    await user.click(screen.getByRole('button', { name: 'Views' }))
    await user.click(screen.getByRole('menuitem', { name: 'My deals' }))
    expect(chip('Owner is me')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'My deals' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save view' })).toBeNull()
    await user.click(screen.getByRole('textbox', { name: 'Search' }))
    await user.keyboard('{Backspace}')
    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await user.click(screen.getByRole('menuitem', { name: 'Stage' }))
    await user.click(await screen.findByRole('option', { name: 'Won' }))
    await user.click(screen.getByRole('button', { name: 'Save view' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Won{Enter}')
    expect(onSaveView).toHaveBeenCalledWith('Won', [{ field: 'stage', operator: 'is', value: 'won' }])
  })

  it('opens + Filter with F, but not while typing', async () => {
    const { user } = renderWithSatin(<Deals />)
    await user.click(screen.getByRole('textbox', { name: 'Search' }))
    await user.keyboard('f')
    expect(screen.queryByRole('menu')).toBeNull()
    act(() => screen.getByRole('button', { name: 'Filter' }).focus())
    await user.keyboard('f')
    // The menu takes its trigger's name.
    expect(screen.getByRole('menu', { name: 'Filter' })).toBeTruthy()
  })

  it('speaks the words SatinLabels gives it', () => {
    renderWithSatin(<FilterBar fields={fields} defaultValue={[{ field: 'close', operator: 'inLast', value: 30 }]} resultCount={3} />, {
      labels: {
        filterBar: 'Filtry',
        filterAdd: 'Filtr',
        filterOperator: (op) => (op === 'inLast' ? 'w ostatnich' : op),
        filterDays: (n) => `${n} dniach`,
        filterResults: (count, number) => <>{number} wyników</>,
        removeItem: (name) => `Usuń ${name}`,
      },
    })
    expect(screen.getByRole('group', { name: 'Filtry' })).toBeTruthy()
    expect(chip('Close date w ostatnich 30 dniach')).toBeTruthy()
    expect(chip('Usuń Close date w ostatnich 30 dniach')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Filtr' })).toBeTruthy()
    expect(screen.getByText('wyników', { exact: false }).textContent).toBe('33 wyników')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, closed and editing', async (theme) => {
    const { user } = renderWithSatin(
      <Deals
        initial={[
          { field: 'stage', operator: 'is', value: 'interview' },
          { field: 'value', operator: 'between', value: [40000, 10000] },
        ]}
        views={[{ id: 'all', label: 'All deals', value: [] }]}
      />,
      { theme },
    )
    await expectNoAxeViolations()
    await user.click(chip('Stage is Interview'))
    await expectNoAxeViolations()
  })
})

describe('applyFilters', () => {
  const at = (filters: Filter[]) => applyFilters(deals, filters, fields, { today }).map((d) => d.company)
  it('matches every operator the way the chips read', () => {
    expect(at([{ field: 'stage', operator: 'isNoneOf', value: ['interview', 'won'] }])).toEqual(['Globex'])
    expect(at([{ field: 'tags', operator: 'hasAllOf', value: ['eu', 'new'] }])).toEqual(['Initech'])
    expect(at([{ field: 'tags', operator: 'hasNoneOf', value: ['eu'] }])).toEqual(['Acme Corp', 'Umbrella'])
    expect(at([{ field: 'company', operator: 'startsWith', value: 'IN' }])).toEqual(['Initech'])
    expect(at([{ field: 'value', operator: 'lt', value: 12000 }])).toEqual(['Umbrella'])
    expect(at([{ field: 'close', operator: 'inLast', value: 60 }])).toEqual(['Umbrella'])
    expect(at([{ field: 'close', operator: 'inThis', value: 'month' }])).toEqual(['Acme Corp'])
    expect(at([{ field: 'close', operator: 'between', value: ['2026-12-01', '2027-01-31'] }])).toEqual(['Globex', 'Initech'])
    // A filter that can't apply lets everything through.
    expect(at([{ field: 'stage', operator: 'is', value: '' }])).toHaveLength(4)
  })
})
