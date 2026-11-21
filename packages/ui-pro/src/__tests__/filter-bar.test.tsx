import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Item, List } from '@uisatin/ui/list'
import {
  FilterBar,
  FilterBarClear,
  FilterBarCount,
  FilterBarFacet,
  FilterBarRoot,
  applyFilters,
  isFilterValid,
  type Filter,
  type FilterField,
  type FilterOperator,
} from '../components/filter-bar'

const fields: FilterField[] = [
  {
    key: 'owner',
    label: 'Owner',
    type: 'person',
    me: 'tara',
    // Tara is not first here: the menu puts "Me" first itself.
    options: [
      { value: 'jon', label: 'Jon Park' },
      { value: 'tara', label: 'Tara Mendes' },
      { value: 'ada', label: 'Ada Novak' },
    ],
  },
  {
    key: 'stage',
    label: 'Stage',
    type: 'enum',
    options: [
      { value: 'lead', label: 'Lead' },
      { value: 'qualified', label: 'Qualified', tone: 'sky' },
      { value: 'proposal', label: 'Proposal', tone: 'plum' },
      { value: 'won', label: 'Won', tone: 'green' },
    ],
  },
  {
    key: 'value',
    label: 'Value',
    type: 'number',
    format: { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 },
    presets: [
      { operator: 'gt', value: 10000, label: '> €10k' },
      { operator: 'gt', value: 20000, label: '> €20k' },
      { operator: 'lt', value: 10000 },
      { operator: 'between', value: [10000, 50000] },
    ],
  },
  { key: 'close', label: 'Close date', shortLabel: 'Close', type: 'date' },
  {
    key: 'tags',
    label: 'Tags',
    type: 'multi',
    options: [
      { value: 'vip', label: 'VIP' },
      { value: 'eu', label: 'EU' },
      { value: 'new', label: 'New' },
    ],
  },
]

type Deal = { company: string; owner: string; stage: string; value: number; close: string; tags: string[] }
const deals: Deal[] = [
  { company: 'Acme Corp', owner: 'tara', stage: 'proposal', value: 48000, close: '2026-11-28', tags: ['vip'] },
  { company: 'Globex', owner: 'jon', stage: 'lead', value: 12000, close: '2026-12-15', tags: ['eu'] },
  { company: 'Initech', owner: 'tara', stage: 'qualified', value: 31000, close: '2027-01-20', tags: ['eu', 'new'] },
  { company: 'Umbrella', owner: 'ada', stage: 'won', value: 9000, close: '2026-10-02', tags: [] },
]
// A Thursday in the fourth quarter.
const today = new Date(2026, 10, 19)

/** A FilterBar over a plain List, wired the way the docs show. */
function Deals({ initial = [] as Filter[], onChange }: { initial?: Filter[]; onChange?: (v: Filter[]) => void }) {
  const [value, setValue] = React.useState(initial)
  const shown = applyFilters(deals, value, fields, { today })
  return (
    <div>
      <FilterBar
        fields={fields}
        value={value}
        onValueChange={(v) => {
          setValue(v)
          onChange?.(v)
        }}
        resultCount={shown.length}
        resultLabel={(count, number) => (
          <>
            {number} {count === 1 ? 'deal' : 'deals'}
          </>
        )}
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

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const rows = () => within(screen.getByRole('list', { name: 'Deals' })).queryAllByRole('listitem').map((li) => li.textContent)
const facetOf = (el: HTMLElement) => el.closest<HTMLElement>('[data-slot="filter-bar-facet"]')!
const count = () => document.querySelector('[data-slot="filter-bar-count"]')!
const SCENARIO: Filter[] = [
  { field: 'owner', operator: 'is', value: 'tara' },
  { field: 'value', operator: 'gt', value: 20000 },
  { field: 'close', operator: 'inThis', value: 'quarter' },
]

describe('FilterBar', () => {
  it('names a facet by its label while idle, and by the field and its value in full once set', () => {
    renderWithSatin(<Deals initial={SCENARIO} />)
    const bar = screen.getByRole('group', { name: 'Filters' })
    expect(within(bar).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
      'Owner: Me',
      'Clear Owner',
      'Stage',
      'Value: over €20,000',
      'Clear Value',
      'Close date: This quarter',
      'Clear Close date',
      'Tags',
      'Clear filters',
    ])
    // Shown short, heard in full: the preset's label, and the short label of a set date.
    expect(button('Value: over €20,000').textContent).toBe('Value:> €20k')
    expect(button('Close date: This quarter').textContent).toBe('Close:This quarter')
    expect(facetOf(button('Owner: Me')).hasAttribute('data-active')).toBe(true)
    expect(facetOf(button('Stage')).hasAttribute('data-active')).toBe(false)
    expect(rows()).toEqual(['Acme Corp'])
    expect(count().getAttribute('aria-live')).toBe('polite')
    expect(count().textContent).toBe('11 deal')
  })

  it('keeps the checkbox menu open, and a second pick turns is into isAnyOf', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals onChange={onChange} />)
    await user.click(button('Stage'))
    const menu = screen.getByRole('menu', { name: 'Stage' })
    await user.click(within(menu).getByRole('menuitemcheckbox', { name: 'Qualified' }))
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'stage', operator: 'is', value: 'qualified' }])
    // Still open; its name follows the trigger's (Radix labels a menu by its trigger).
    expect(screen.getByRole('menu', { name: 'Stage: Qualified' })).toBe(menu)
    await user.click(within(menu).getByRole('menuitemcheckbox', { name: 'Won' }))
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'stage', operator: 'isAnyOf', value: ['qualified', 'won'] }])
    expect(within(menu).getByRole('menuitemcheckbox', { name: 'Won' }).getAttribute('aria-checked')).toBe('true')
    expect(button('Stage: Qualified or Won')).toBeTruthy()
    expect(rows()).toEqual(['Initech', 'Umbrella'])
    // A multi field always writes hasAnyOf.
    await user.keyboard('{Escape}')
    await user.click(button('Tags'))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'EU' }))
    expect(onChange).toHaveBeenLastCalledWith([
      { field: 'stage', operator: 'isAnyOf', value: ['qualified', 'won'] },
      { field: 'tags', operator: 'hasAnyOf', value: ['eu'] },
    ])
  })

  it('lists the person using the app first, as Me', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals onChange={onChange} />)
    await user.click(button('Owner'))
    const items = screen.getAllByRole('menuitemcheckbox')
    expect(items.map((i) => i.textContent)).toEqual(['Me', 'Jon Park', 'Ada Novak'])
    await user.click(items[0])
    await user.click(items[1])
    // Picks keep the menu's order, so Me leads the facet.
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'owner', operator: 'isAnyOf', value: ['tara', 'jon'] }])
    const trigger = button('Owner: Me or Jon Park')
    expect(trigger.textContent).toBe('Owner:Me+1')
  })

  it('shows toned picks as Badges, two at most, then +N', () => {
    renderWithSatin(<Deals initial={[{ field: 'stage', operator: 'isAnyOf', value: ['lead', 'proposal', 'won'] }]} />)
    const trigger = button('Stage: Lead, Proposal, or Won')
    const badges = trigger.querySelectorAll<HTMLElement>('[data-slot="badge"]')
    expect([...badges].map((b) => b.textContent)).toEqual(['Lead', 'Proposal'])
    // An option without a tone is neutral.
    expect(badges[0].dataset.tone).toBe('neutral')
    expect(badges[1].dataset.tone).toBe('plum')
    expect(within(trigger).getByText('+1')).toBeTruthy()
  })

  it('picks one number preset; its row closes the menu', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals initial={SCENARIO} onChange={onChange} />)
    await user.click(button('Value: over €20,000'))
    const radios = screen.getAllByRole('menuitemradio')
    // A preset without a label reads compact.
    expect(radios.map((r) => r.textContent)).toEqual(['> €10k', '> €20k', '< €10K', '€10K – €50K'])
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false', 'false'])
    await user.click(radios[3])
    expect(onChange).toHaveBeenLastCalledWith([SCENARIO[0], { field: 'value', operator: 'between', value: [10000, 50000] }, SCENARIO[2]])
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(button('Value: €10,000 to €50,000').textContent).toBe('Value:€10K – €50K')
  })

  it('shows a number filter no preset matches as set, with no row checked', async () => {
    const { user } = renderWithSatin(<Deals initial={[{ field: 'value', operator: 'gte', value: 31000 }]} />)
    const trigger = button('Value: at least €31,000')
    expect(trigger.textContent).toBe('Value:≥ €31K')
    expect(rows()).toEqual(['Acme Corp', 'Initech'])
    await user.click(trigger)
    expect(screen.getAllByRole('menuitemradio').every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true)
  })

  it('opens the date list with ↓, moves with the arrows, Home and End, and picks with Enter', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals onChange={onChange} />)
    act(() => button('Close date').focus())
    await user.keyboard('{ArrowDown}')
    const list = await screen.findByRole('listbox', { name: 'Close date' })
    await waitFor(() => expect(document.activeElement).toBe(list))
    const lit = () => document.getElementById(list.getAttribute('aria-activedescendant')!)?.textContent
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual(['This month', 'This quarter', 'This year', 'Last 30 days', 'Custom range…'])
    expect(lit()).toBe('This month')
    await user.keyboard('{ArrowDown}')
    expect(lit()).toBe('This quarter')
    await user.keyboard('{End}')
    expect(lit()).toBe('Custom range…')
    await user.keyboard('{ArrowDown}')
    expect(lit()).toBe('This month')
    await user.keyboard('{ArrowUp}{Home}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'close', operator: 'inThis', value: 'quarter' }])
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(button('Close date: This quarter')))
    expect(rows()).toEqual(['Acme Corp', 'Globex', 'Umbrella'])
  })

  it('swaps the list for a calendar on Custom range…, and Escape goes back to the list', async () => {
    const { user } = renderWithSatin(<Deals />)
    await user.click(button('Close date'))
    await user.click(screen.getByRole('option', { name: 'Custom range…' }))
    const dialog = screen.getByRole('dialog', { name: 'Custom range' })
    expect(within(dialog).getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(within(dialog).queryByRole('listbox')).toBeNull()
    expect(within(dialog).getByText('Pick the first day')).toBeTruthy()
    await user.keyboard('{Escape}')
    const list = await screen.findByRole('listbox', { name: 'Close date' })
    expect(screen.getByRole('dialog', { name: 'Close date' })).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(list))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('writes a full range as between and closes', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals onChange={onChange} />)
    await user.click(button('Close date'))
    await user.click(screen.getByRole('option', { name: 'Custom range…' }))
    await user.click(screen.getByRole('button', { name: /November 3, 2026/ }))
    expect(screen.getByText('Nov 3 – pick the end')).toBeTruthy()
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /November 28, 2026/ }))
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'close', operator: 'between', value: ['2026-11-03', '2026-11-28'] }])
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(button('Close date: Nov 3 to Nov 28').textContent).toBe('Close:Nov 3 – Nov 28')
    expect(rows()).toEqual(['Acme Corp'])
    // Reopened, the range is the checked row, with its days beside it.
    await user.click(button('Close date: Nov 3 to Nov 28'))
    expect(screen.getByRole('option', { name: /Custom range…/ }).getAttribute('aria-selected')).toBe('true')
  })

  it('clears a facet with its ×, keeping focus on the facet', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals initial={SCENARIO} onChange={onChange} />)
    const trigger = button('Owner: Me')
    await user.click(button('Clear Owner'))
    expect(onChange).toHaveBeenLastCalledWith(SCENARIO.slice(1))
    expect(trigger.getAttribute('aria-label')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(trigger.textContent).toBe('Owner')
  })

  it('clears every filter with Clear filters and focuses the first facet; nothing to clear, no button', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Deals initial={[{ field: 'close', operator: 'inLast', value: 60 }]} onChange={onChange} />)
    await user.click(button('Clear filters'))
    expect(onChange).toHaveBeenLastCalledWith([])
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
    expect(document.activeElement).toBe(button('Owner'))
    expect(rows()).toHaveLength(4)
  })

  it('leaves a filter no facet can say idle and unapplied', () => {
    const broken: Filter[] = [
      { field: 'value', operator: 'between', value: [40000, 10000] },
      { field: 'stage', operator: 'isNot' as FilterOperator, value: 'won' },
      { field: 'owner', operator: 'is', value: 'gone' },
      { field: 'tags', operator: 'isAnyOf', value: ['eu'] },
      { field: 'close', operator: 'inLast', value: 0 },
      { field: 'nope', operator: 'is', value: 'x' },
    ]
    expect(broken.map((f) => isFilterValid(f, fields))).toEqual([false, false, false, false, false, false])
    renderWithSatin(<Deals initial={broken} />)
    for (const name of ['Owner', 'Stage', 'Value', 'Close date', 'Tags']) expect(facetOf(button(name)).hasAttribute('data-active')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
    expect(rows()).toHaveLength(4)
  })

  it('takes the first filter of a field, and a change replaces all of them', async () => {
    const onChange = vi.fn()
    const twice: Filter[] = [
      { field: 'stage', operator: 'is', value: 'lead' },
      { field: 'value', operator: 'gt', value: 10000 },
      { field: 'stage', operator: 'is', value: 'won' },
    ]
    const { user } = renderWithSatin(<Deals initial={twice} onChange={onChange} />)
    expect(button('Stage: Lead')).toBeTruthy()
    expect(rows()).toEqual(['Globex'])
    await user.click(button('Stage: Lead'))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Won' }))
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'stage', operator: 'isAnyOf', value: ['lead', 'won'] }, twice[1]])
    // A first filter that can't apply leaves the field unfiltered, whatever follows it.
    const stale: Filter[] = [
      { field: 'stage', operator: 'is', value: 'gone' },
      { field: 'stage', operator: 'is', value: 'won' },
    ]
    expect(applyFilters(deals, stale, fields)).toHaveLength(4)
  })

  it('ignores the values a field no longer has', async () => {
    const onChange = vi.fn()
    const partly: Filter[] = [{ field: 'stage', operator: 'isAnyOf', value: ['qualified', 'gone'] }]
    expect(isFilterValid(partly[0], fields)).toBe(true)
    const { user } = renderWithSatin(<Deals initial={partly} onChange={onChange} />)
    expect(button('Stage: Qualified')).toBeTruthy()
    expect(rows()).toEqual(['Initech'])
    await user.click(button('Stage: Qualified'))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Proposal' }))
    // The write keeps only what the field has.
    expect(onChange).toHaveBeenLastCalledWith([{ field: 'stage', operator: 'isAnyOf', value: ['qualified', 'proposal'] }])
  })

  it('shows days with their year once a range leaves the current year', () => {
    renderWithSatin(<Deals initial={[{ field: 'close', operator: 'between', value: ['2026-12-01', '2027-01-31'] }]} />)
    expect(button('Close date: Dec 1, 2026 to Jan 31, 2027').textContent).toBe('Close:Dec 1, 2026 – Jan 31, 2027')
    expect(rows()).toEqual(['Globex', 'Initech'])
  })

  it('speaks the words SatinLabels gives it', async () => {
    const { user } = renderWithSatin(<Deals initial={SCENARIO} />, {
      labels: {
        clear: 'Wyczyść',
        filterBar: 'Filtry',
        filterMe: 'Ja',
        filterFacetValue: (field, value) => `${field} – ${value}`,
        filterClearField: (field) => `Wyczyść ${field}`,
        filterClearAll: 'Wyczyść filtry',
        filterComparison: (operator, value) => `${operator === 'gt' ? 'od' : 'do'} ${value}`,
        filterComparisonName: (operator, value) => `${operator === 'gt' ? 'ponad' : 'poniżej'} ${value}`,
        filterThis: (period) => (period === 'quarter' ? 'Ten kwartał' : period),
        filterLastDays: (n) => `Ostatnie ${n} dni`,
        filterCustomRange: 'Własny zakres…',
      },
    })
    expect(screen.getByRole('group', { name: 'Filtry' })).toBeTruthy()
    expect(button('Owner – Ja')).toBeTruthy()
    expect(button('Wyczyść Owner')).toBeTruthy()
    expect(button('Value – ponad €20,000')).toBeTruthy()
    expect(button('Close date – Ten kwartał')).toBeTruthy()
    expect(button('Wyczyść filtry')).toBeTruthy()
    await user.click(button('Close date – Ten kwartał'))
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['month', 'Ten kwartał(selected)', 'year', 'Ostatnie 30 dni', 'Własny zakres…'])
    expect(screen.getByRole('button', { name: 'Wyczyść' })).toBeTruthy()
  })

  it('builds a bar from its parts; a facet for a key the fields lack renders nothing', () => {
    const root = React.createRef<HTMLDivElement>()
    const facet = React.createRef<HTMLSpanElement>()
    const clear = React.createRef<HTMLButtonElement>()
    renderWithSatin(
      <FilterBarRoot ref={root} fields={fields} defaultValue={SCENARIO} resultCount={1} data-testid="bar">
        <FilterBarFacet ref={facet} field="value" className="max-w-60" />
        <FilterBarFacet field="nope" />
        <FilterBarClear ref={clear} />
        <FilterBarCount />
      </FilterBarRoot>,
    )
    const bar = screen.getByRole('group', { name: 'Filters' })
    expect(root.current).toBe(bar)
    expect(bar.dataset.testid).toBe('bar')
    expect(bar.querySelectorAll('[data-slot="filter-bar-facet"]')).toHaveLength(1)
    expect(facet.current?.classList.contains('max-w-60')).toBe(true)
    expect(clear.current).toBe(button('Clear filters'))
    expect(count().textContent).toBe('11 result')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, closed and open', async (theme) => {
    const { user } = renderWithSatin(<Deals initial={[...SCENARIO, { field: 'stage', operator: 'isAnyOf', value: ['lead', 'won'] }]} />, { theme })
    await expectNoAxeViolations()
    await user.click(button('Stage: Lead or Won'))
    await expectNoAxeViolations()
    await user.keyboard('{Escape}')
    await user.click(button('Close date: This quarter'))
    await expectNoAxeViolations()
    await user.click(screen.getByRole('option', { name: 'Custom range…' }))
    await expectNoAxeViolations()
  })
})

describe('applyFilters', () => {
  const at = (...filters: Filter[]) => applyFilters(deals, filters, fields, { today }).map((d) => d.company)
  it('matches each operator the way the facets read', () => {
    expect(at({ field: 'owner', operator: 'is', value: 'tara' })).toEqual(['Acme Corp', 'Initech'])
    expect(at({ field: 'stage', operator: 'isAnyOf', value: ['lead', 'won'] })).toEqual(['Globex', 'Umbrella'])
    expect(at({ field: 'tags', operator: 'hasAnyOf', value: ['eu'] })).toEqual(['Globex', 'Initech'])
    expect(at({ field: 'value', operator: 'gt', value: 31000 })).toEqual(['Acme Corp'])
    expect(at({ field: 'value', operator: 'gte', value: 31000 })).toEqual(['Acme Corp', 'Initech'])
    expect(at({ field: 'value', operator: 'lt', value: 12000 })).toEqual(['Umbrella'])
    expect(at({ field: 'value', operator: 'lte', value: 12000 })).toEqual(['Globex', 'Umbrella'])
    expect(at({ field: 'value', operator: 'between', value: [12000, 31000] })).toEqual(['Globex', 'Initech'])
    expect(at({ field: 'close', operator: 'inThis', value: 'month' })).toEqual(['Acme Corp'])
    expect(at({ field: 'close', operator: 'inThis', value: 'quarter' })).toEqual(['Acme Corp', 'Globex', 'Umbrella'])
    expect(at({ field: 'close', operator: 'inLast', value: 60 })).toEqual(['Umbrella'])
    expect(at({ field: 'close', operator: 'between', value: ['2026-12-01', '2027-01-31'] })).toEqual(['Globex', 'Initech'])
    // Every filter at once.
    expect(at({ field: 'owner', operator: 'is', value: 'tara' }, { field: 'tags', operator: 'hasAnyOf', value: ['new'] })).toEqual(['Initech'])
  })

  it('reads rows through getValue', () => {
    const nested = deals.map((d) => ({ name: d.company, data: d }))
    const shown = applyFilters(nested, [{ field: 'owner', operator: 'is', value: 'jon' }], fields, { getValue: (row, key) => row.data[key as keyof Deal] })
    expect(shown.map((r) => r.name)).toEqual(['Globex'])
  })
})
