import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import {
  ScopedSearch,
  filterScopedGroups,
  formatScopedQuery,
  parseScopedQuery,
  type ScopedSearchGroup,
  type ScopedSearchQuery,
  type ScopedSearchScope,
} from '../components/search-scoped'

const scopes: ScopedSearchScope[] = [
  { key: 'stage', label: 'Stage', values: [{ value: 'interview', label: 'Interview' }, { value: 'offer', label: 'Offer' }, 'screening'] },
  { key: 'owner', label: 'Owner' },
]

const groups: ScopedSearchGroup[] = [
  {
    id: 'candidates',
    label: 'Candidates',
    items: [
      { id: 'ada', label: 'Ada Novak', description: 'Frontend engineer', keywords: ['React'], fields: { stage: 'interview', owner: 'tara' } },
      { id: 'jon', label: 'Jon Park', description: 'Backend engineer', keywords: ['Go'], fields: { stage: 'interview', owner: 'tara' } },
      { id: 'mia', label: 'Mia Chen', description: 'Product designer', keywords: ['React'], fields: { stage: 'offer', owner: 'jon' } },
    ],
  },
  { id: 'jobs', label: 'Jobs', items: [{ id: 'fe', label: 'Senior React engineer', keywords: ['React'], fields: { owner: 'tara' } }] },
  { id: 'notes', label: 'Notes', items: [{ id: 'n1', label: 'Ada: strong React round', fields: { stage: 'interview' } }] },
]

const field = () => screen.getByRole('combobox', { name: 'Search' })
const options = () => screen.queryAllByRole('option').map((o) => o.textContent)
const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)))

describe('parseScopedQuery', () => {
  it('reads tokens of known scopes and leaves the rest as text', () => {
    expect(parseScopedQuery('stage:interview react', scopes)).toEqual({ tokens: [{ key: 'stage', value: 'interview' }], text: 'react' })
    // Without case, by the value's label, quoted, and only values a scope lists.
    expect(parseScopedQuery('Stage:Interview owner:"Ada Novak" stage:hired', scopes)).toEqual({
      tokens: [
        { key: 'stage', value: 'interview' },
        { key: 'owner', value: 'Ada Novak' },
      ],
      text: 'stage:hired',
    })
    expect(parseScopedQuery('team:core', scopes).tokens).toEqual([])
  })

  it('waits for a space while typing', () => {
    expect(parseScopedQuery('stage:interview', scopes, { partial: true })).toEqual({ tokens: [], text: 'stage:interview' })
    expect(parseScopedQuery('stage:interview ', scopes, { partial: true })).toEqual({ tokens: [{ key: 'stage', value: 'interview' }], text: '' })
    expect(parseScopedQuery('react stage:offer ', scopes, { partial: true }).text).toBe('react ')
  })

  it('writes a query back as it reads', () => {
    const query: ScopedSearchQuery = { tokens: [{ key: 'stage', value: 'interview' }, { key: 'owner', value: 'Ada Novak' }], text: 'react' }
    expect(formatScopedQuery(query)).toBe('stage:interview owner:"Ada Novak" react')
    expect(parseScopedQuery(formatScopedQuery(query), scopes)).toEqual(query)
  })

  it('filters by every scope and every word, any value within a scope', () => {
    const found = filterScopedGroups(groups, { tokens: [{ key: 'stage', value: 'interview' }], text: 'react' }, scopes)
    expect(found.map((g) => [g.label, g.count, g.items.map((i) => i.id)])).toEqual([
      ['Candidates', 1, ['ada']],
      ['Notes', 1, ['n1']],
    ])
    const either = filterScopedGroups(groups, { tokens: [{ key: 'stage', value: 'interview' }, { key: 'stage', value: 'offer' }], text: '' }, scopes)
    expect(either[0].items.map((i) => i.id)).toEqual(['ada', 'jon', 'mia'])
    // A scope still being typed narrows nothing.
    expect(filterScopedGroups(groups, { tokens: [], text: 'stage:int' }, scopes).length).toBe(3)
  })
})

describe('ScopedSearch', () => {
  it('opens on focus with recent searches and the scopes', async () => {
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} groups={groups} recent={['stage:interview react']} hotkey={false} />)
    await user.click(field())
    expect(field().getAttribute('aria-expanded')).toBe('true')
    expect(within(screen.getByRole('group', { name: 'Recent searches' })).getAllByRole('option')[0].textContent).toBe('Stage: Interviewreact')
    expect(within(screen.getByRole('group', { name: 'Filters' })).getAllByRole('option').map((o) => o.textContent)).toEqual(['stage:Stage', 'owner:Owner'])
  })

  it('focuses with ⌘K and Ctrl+K from anywhere and opens', async () => {
    const { user } = renderWithSatin(
      <>
        <button type="button">Elsewhere</button>
        <ScopedSearch scopes={scopes} groups={groups} recent={['react']} />
      </>,
    )
    screen.getByRole('button', { name: 'Elsewhere' }).focus()
    await user.keyboard('{Meta>}k{/Meta}')
    expect(document.activeElement).toBe(field())
    expect(screen.getByRole('listbox', { name: 'Search results' })).toBeTruthy()
    screen.getByRole('button', { name: 'Elsewhere' }).focus()
    await user.keyboard('{Control>}k{/Control}')
    expect(document.activeElement).toBe(field())
  })

  it('turns a typed key:value into a chip when a space follows it', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} groups={groups} onValueChange={onValueChange} hotkey={false} />)
    await user.click(field())
    await user.keyboard('stage:interview')
    expect(screen.queryByRole('button', { name: 'Remove Stage: Interview' })).toBeNull()
    await user.keyboard(' react')
    expect(screen.getByRole('button', { name: 'Remove Stage: Interview' })).toBeTruthy()
    expect((field() as HTMLInputElement).value).toBe('react')
    expect(document.activeElement).toBe(field())
    expect(onValueChange).toHaveBeenLastCalledWith({ tokens: [{ key: 'stage', value: 'interview' }], text: 'react' })
    expect(field().getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(field().getAttribute('aria-describedby')!)!.textContent).toBe('Stage: Interview')
  })

  it('shows grouped results with counts, and the arrows and Enter pick one', async () => {
    const onSelect = vi.fn()
    const { user } = renderWithSatin(
      <ScopedSearch scopes={scopes} groups={groups} defaultValue={{ tokens: [{ key: 'stage', value: 'interview' }], text: '' }} onSelect={onSelect} hotkey={false} />,
    )
    await user.click(field())
    await user.keyboard('react')
    expect(screen.getByRole('group', { name: 'Candidates, 1 result' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Notes, 1 result' })).toBeTruthy()
    expect(screen.queryByRole('group', { name: /Jobs/ })).toBeNull()
    expect(options()).toEqual(['Ada NovakFrontend engineer', 'Ada: strong React round'])
    // The first row is highlighted; the arrows move it and wrap.
    expect(field().getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[0].id)
    await user.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true')
    await user.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true')
    await user.keyboard('{ArrowUp}{Enter}')
    expect(onSelect).toHaveBeenCalledWith(groups[2].items[0], { tokens: [{ key: 'stage', value: 'interview' }], text: 'react' })
    expect(field().getAttribute('aria-expanded')).toBe('false')
  })

  it('suggests a scope, then its values, and Enter makes the chip', async () => {
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} groups={groups} hotkey={false} />)
    await user.click(field())
    await user.keyboard('st')
    expect(within(screen.getByRole('group', { name: 'Filters' })).getAllByRole('option').map((o) => o.textContent)).toEqual(['stage:Stage'])
    await user.keyboard('{Enter}')
    expect((field() as HTMLInputElement).value).toBe('stage:')
    expect(within(screen.getByRole('group', { name: 'Stage' })).getAllByRole('option').map((o) => o.textContent)).toEqual(['Interview', 'Offer', 'screening'])
    await user.keyboard('off{Enter}')
    expect(screen.getByRole('button', { name: 'Remove Stage: Offer' })).toBeTruthy()
    expect((field() as HTMLInputElement).value).toBe('')
    expect(options()).toEqual(['Mia ChenProduct designer'])
  })

  it('removes the last chip with Backspace at the start of the query, and says so', async () => {
    const { user } = renderWithSatin(
      <ScopedSearch
        scopes={scopes}
        groups={groups}
        defaultValue={{ tokens: [{ key: 'stage', value: 'interview' }, { key: 'owner', value: 'tara' }], text: 'ad' }}
        hotkey={false}
      />,
    )
    await user.click(field())
    await user.keyboard('{Backspace}')
    // Inside the words, Backspace deletes a letter.
    expect((field() as HTMLInputElement).value).toBe('a')
    expect(screen.getAllByRole('button', { name: /^Remove/ }).length).toBe(2)
    await user.keyboard('{Backspace}{Backspace}')
    expect(screen.queryByRole('button', { name: 'Remove Owner: tara' })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Filter removed: Owner: tara')
    await user.keyboard('{Backspace}')
    expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull()
    expect(document.activeElement).toBe(field())
  })

  it('removes a chip with its button and keeps focus in the query', async () => {
    const { user } = renderWithSatin(
      <ScopedSearch scopes={scopes} groups={groups} defaultValue={{ tokens: [{ key: 'stage', value: 'offer' }], text: '' }} hotkey={false} />,
    )
    await user.click(screen.getByRole('button', { name: 'Remove Stage: Offer' }))
    expect(screen.queryByRole('button', { name: 'Remove Stage: Offer' })).toBeNull()
    expect(document.activeElement).toBe(field())
  })

  it('says when nothing matches, and reads the count out once typing settles', async () => {
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} groups={groups} hotkey={false} />)
    await user.click(field())
    await user.keyboard('stage:offer rust')
    expect(screen.getByText('No results for “stage:offer rust”')).toBeTruthy()
    await wait(700)
    expect(screen.getByRole('status').textContent).toBe('No results')
  })

  it('closes with Escape and keeps the words; Escape again clears them', async () => {
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} groups={groups} hotkey={false} />)
    await user.click(field())
    await user.keyboard('react')
    expect(screen.getByRole('listbox')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect((field() as HTMLInputElement).value).toBe('react')
    await user.keyboard('{Escape}')
    expect((field() as HTMLInputElement).value).toBe('')
    expect(screen.queryByRole('listbox')).toBeNull()
    // ↓ opens it again.
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeTruthy()
  })

  it('shows groups as given with filter off, and the server count', async () => {
    const server: ScopedSearchGroup[] = [{ id: 'candidates', label: 'Candidates', count: 42, items: groups[0].items.slice(0, 2) }]
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} groups={server} filter={false} defaultValue={{ tokens: [], text: 'zzz' }} hotkey={false} />)
    await user.click(field())
    expect(screen.getByRole('group', { name: 'Candidates, 42 results' })).toBeTruthy()
    expect(options().length).toBe(2)
  })

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = React.useState<ScopedSearchQuery>({ tokens: [], text: '' })
      return (
        <>
          <ScopedSearch scopes={scopes} groups={groups} value={value} onValueChange={setValue} hotkey={false} />
          <output>{formatScopedQuery(value)}</output>
        </>
      )
    }
    const { user } = renderWithSatin(<Controlled />)
    await user.click(field())
    await user.keyboard('owner:tara jon')
    expect(document.querySelector('output')!.textContent).toBe('owner:tara jon')
    expect(screen.getByRole('button', { name: 'Remove Owner: tara' })).toBeTruthy()
  })

  it('speaks the app’s language', async () => {
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} groups={groups} recent={['react']} hotkey={false} />, {
      labels: {
        searchField: 'Szukaj',
        scopedSearchRecent: 'Ostatnie wyszukiwania',
        scopedSearchFilters: 'Filtry',
        scopedSearchResults: 'Wyniki wyszukiwania',
        scopedSearchToken: (scope, value) => `${scope} – ${value}`,
        scopedSearchGroup: (group, count) => `${group}: ${count}`,
        removeItem: (name) => `Usuń ${name}`,
      },
    })
    await user.click(screen.getByRole('combobox', { name: 'Szukaj' }))
    expect(screen.getByRole('listbox', { name: 'Wyniki wyszukiwania' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Ostatnie wyszukiwania' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Filtry' })).toBeTruthy()
    await user.keyboard('stage:interview ')
    expect(screen.getByRole('button', { name: 'Usuń Stage – Interview' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Candidates: 2' })).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    const { user } = renderWithSatin(
      <ScopedSearch scopes={scopes} groups={groups} defaultValue={{ tokens: [{ key: 'stage', value: 'interview' }], text: '' }} hotkey={false} />,
      { theme },
    )
    await user.click(field())
    await user.keyboard('react')
    await expectNoAxeViolations()
  })

  it('has no axe violations with recent searches, nor with no results', async () => {
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} groups={groups} recent={['stage:interview react']} hotkey={false} />, { theme: 'dark' })
    await user.click(field())
    await expectNoAxeViolations()
    await user.keyboard('rust')
    await expectNoAxeViolations()
  }, 30000)
})
