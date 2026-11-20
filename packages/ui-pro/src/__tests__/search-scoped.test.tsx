import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import {
  ScopedSearch,
  filterScopedGroups,
  formatScopedQuery,
  parseScopedQuery,
  type ScopedSearchFilter,
  type ScopedSearchGroup,
  type ScopedSearchQuery,
  type ScopedSearchScope,
} from '../components/search-scoped'

const scopes: ScopedSearchScope[] = [
  { value: 'all', label: 'Everywhere' },
  { value: 'candidates', label: 'Candidates', groups: ['candidates'], placeholder: 'Search candidates…' },
  { value: 'jobs', label: 'Jobs', groups: ['jobs'] },
  { value: 'mine', label: 'My pipeline', fields: { owner: 'tara' } },
]

const filters: ScopedSearchFilter[] = [
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
  { id: 'notes', label: 'Notes', items: [{ id: 'n1', label: 'Ada: strong React round', fields: { stage: 'interview', owner: 'jon' } }] },
]

const options = { scopes, filters }
const field = () => screen.getByRole('combobox')
const rows = () => screen.queryAllByRole('option').map((o) => o.textContent)
const scopeChip = (name = 'Everywhere') => screen.getByRole('button', { name: `Search in: ${name}` })
const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)))

describe('parseScopedQuery', () => {
  it('reads the scope, the filters of known keys, and leaves the rest as text', () => {
    expect(parseScopedQuery('in:candidates stage:interview react', options)).toEqual({ scope: 'candidates', tokens: [{ key: 'stage', value: 'interview' }], text: 'react' })
    // Without case, by the value's label, quoted, and only values a filter lists.
    expect(parseScopedQuery('In:"My pipeline" Stage:Interview owner:"Ada Novak" stage:hired', options)).toEqual({
      scope: 'mine',
      tokens: [
        { key: 'stage', value: 'interview' },
        { key: 'owner', value: 'Ada Novak' },
      ],
      text: 'stage:hired',
    })
    expect(parseScopedQuery('in:mars team:core', options)).toEqual({ tokens: [], text: 'in:mars team:core' })
    // Another word for the scope.
    expect(parseScopedQuery('w:jobs', { ...options, scopeKey: 'w' }).scope).toBe('jobs')
  })

  it('waits for a space while typing', () => {
    expect(parseScopedQuery('stage:interview', options, { partial: true })).toEqual({ tokens: [], text: 'stage:interview' })
    expect(parseScopedQuery('in:jobs stage:interview ', options, { partial: true })).toEqual({ scope: 'jobs', tokens: [{ key: 'stage', value: 'interview' }], text: '' })
    expect(parseScopedQuery('react stage:offer ', options, { partial: true }).text).toBe('react ')
  })

  it('writes a query back as it reads', () => {
    const query: ScopedSearchQuery = { scope: 'mine', tokens: [{ key: 'stage', value: 'interview' }, { key: 'owner', value: 'Ada Novak' }], text: 'react' }
    expect(formatScopedQuery(query)).toBe('in:mine stage:interview owner:"Ada Novak" react')
    expect(parseScopedQuery(formatScopedQuery(query), options)).toEqual(query)
  })

  it('filters by the scope, every filter and every word', () => {
    const found = (q: ScopedSearchQuery) => filterScopedGroups(groups, q, options).map((g) => [g.label, g.count, g.items.map((i) => i.id)])
    expect(found({ tokens: [{ key: 'stage', value: 'interview' }], text: 'react' })).toEqual([
      ['Candidates', 1, ['ada']],
      ['Notes', 1, ['n1']],
    ])
    // A scope by kind keeps its groups; a scope by place keeps the rows whose fields match.
    expect(found({ scope: 'jobs', tokens: [], text: 'react' })).toEqual([['Jobs', 1, ['fe']]])
    expect(found({ scope: 'mine', tokens: [], text: '' })).toEqual([
      ['Candidates', 2, ['ada', 'jon']],
      ['Jobs', 1, ['fe']],
    ])
    // Any value within a filter.
    expect(filterScopedGroups(groups, { tokens: [{ key: 'stage', value: 'interview' }, { key: 'stage', value: 'offer' }], text: '' }, options)[0].items.length).toBe(3)
    // A filter or a scope still being typed narrows nothing.
    expect(filterScopedGroups(groups, { tokens: [], text: 'stage:int' }, options).length).toBe(3)
    expect(filterScopedGroups(groups, { tokens: [], text: 'in:ca' }, options).length).toBe(3)
  })
})

describe('ScopedSearch', () => {
  it('shows its scope as a chip, and the scope changes the results', async () => {
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} filters={filters} groups={groups} defaultValue={{ tokens: [], text: 'react' }} hotkey={false} />)
    await user.click(field())
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-labelledby') && document.getElementById(g.getAttribute('aria-labelledby')!)!.textContent)).toEqual([
      'Candidates2Candidates, 2 results',
      'Jobs1Jobs, 1 result',
      'Notes1Notes, 1 result',
    ])
    // The chip lists the scopes, each with what it holds for the query; the current one is checked.
    await user.click(scopeChip())
    expect(document.activeElement).toBe(field())
    expect(scopeChip().getAttribute('aria-expanded')).toBe('true')
    const list = within(screen.getByRole('group', { name: 'Search in' }))
    expect(list.getAllByRole('option').map((o) => o.textContent)).toEqual(['Everywhere44 results(selected)', 'Candidates22 results', 'Jobs11 result', 'My pipeline22 results'])
    await user.keyboard('{ArrowDown}{Enter}')
    expect(scopeChip('Candidates')).toBeTruthy()
    expect(rows()).toEqual(['Ada NovakFrontend engineer', 'Mia ChenProduct designer'])
    expect(field().getAttribute('placeholder')).toBe('Search candidates…')
    expect(screen.getByRole('status').textContent).toBe('Searching in Candidates')
  })

  it('takes a scope typed after in:', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} filters={filters} groups={groups} onValueChange={onValueChange} hotkey={false} />)
    await user.click(field())
    await user.keyboard('in:')
    expect(within(screen.getByRole('group', { name: 'Search in' })).getAllByRole('option').length).toBe(4)
    await user.keyboard('jo')
    expect(rows()).toEqual(['Jobs'])
    await user.keyboard('bs react')
    expect(scopeChip('Jobs')).toBeTruthy()
    expect(onValueChange).toHaveBeenLastCalledWith({ scope: 'jobs', tokens: [], text: 'react' })
    expect(rows()).toEqual(['Senior React engineer'])
  })

  it('opens on focus with recent searches and what can be typed', async () => {
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} filters={filters} groups={groups} recent={['in:candidates stage:interview react']} hotkey={false} />)
    await user.click(field())
    expect(field().getAttribute('aria-expanded')).toBe('true')
    expect(within(screen.getByRole('group', { name: 'Recent searches' })).getAllByRole('option')[0].textContent).toBe('CandidatesStage: Interviewreact')
    expect(within(screen.getByRole('group', { name: 'Filters' })).getAllByRole('option').map((o) => o.textContent)).toEqual(['in:Search in', 'stage:Stage', 'owner:Owner'])
    await user.keyboard('{Enter}')
    expect(scopeChip('Candidates')).toBeTruthy()
    expect((field() as HTMLInputElement).value).toBe('react')
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

  it('turns a typed key:value into a filter chip when a space follows it', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<ScopedSearch filters={filters} groups={groups} onValueChange={onValueChange} hotkey={false} />)
    await user.click(field())
    await user.keyboard('stage:interview')
    expect(screen.queryByRole('button', { name: 'Remove Stage: Interview' })).toBeNull()
    await user.keyboard(' react')
    expect(screen.getByRole('button', { name: 'Remove Stage: Interview' })).toBeTruthy()
    expect((field() as HTMLInputElement).value).toBe('react')
    expect(document.activeElement).toBe(field())
    expect(onValueChange).toHaveBeenLastCalledWith({ tokens: [{ key: 'stage', value: 'interview' }], text: 'react' })
    expect(document.getElementById(field().getAttribute('aria-describedby')!)!.textContent).toBe('Stage: Interview')
  })

  it('shows grouped results with counts, and the arrows and Enter pick one', async () => {
    const onSelect = vi.fn()
    const { user } = renderWithSatin(
      <ScopedSearch scopes={scopes} filters={filters} groups={groups} defaultValue={{ tokens: [{ key: 'stage', value: 'interview' }], text: '' }} onSelect={onSelect} hotkey={false} />,
    )
    await user.click(field())
    await user.keyboard('react')
    expect(screen.getByRole('group', { name: 'Candidates, 1 result' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Notes, 1 result' })).toBeTruthy()
    expect(screen.queryByRole('group', { name: /Jobs/ })).toBeNull()
    expect(rows()).toEqual(['Ada NovakFrontend engineer', 'Ada: strong React round'])
    expect(field().getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[0].id)
    await user.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true')
    await user.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true')
    await user.keyboard('{ArrowUp}{Enter}')
    expect(onSelect).toHaveBeenCalledWith(groups[2].items[0], { tokens: [{ key: 'stage', value: 'interview' }], text: 'react' })
    expect(field().getAttribute('aria-expanded')).toBe('false')
  })

  it('suggests a filter, then its values, and Enter makes the chip', async () => {
    const { user } = renderWithSatin(<ScopedSearch filters={filters} groups={groups} hotkey={false} />)
    await user.click(field())
    await user.keyboard('st')
    expect(within(screen.getByRole('group', { name: 'Filters' })).getAllByRole('option').map((o) => o.textContent)).toEqual(['stage:Stage'])
    await user.keyboard('{Enter}')
    expect((field() as HTMLInputElement).value).toBe('stage:')
    expect(within(screen.getByRole('group', { name: 'Stage' })).getAllByRole('option').map((o) => o.textContent)).toEqual(['Interview', 'Offer', 'screening'])
    await user.keyboard('off{Enter}')
    expect(screen.getByRole('button', { name: 'Remove Stage: Offer' })).toBeTruthy()
    expect((field() as HTMLInputElement).value).toBe('')
    expect(rows()).toEqual(['Mia ChenProduct designer'])
  })

  it('removes the filter chips with Backspace at the start of the query, then the scope', async () => {
    const { user } = renderWithSatin(
      <ScopedSearch scopes={scopes} filters={filters} groups={groups} defaultValue={{ scope: 'candidates', tokens: [{ key: 'stage', value: 'interview' }, { key: 'owner', value: 'tara' }], text: 'ad' }} hotkey={false} />,
    )
    await user.click(field())
    await user.keyboard('{Backspace}')
    // Inside the words, Backspace deletes a letter.
    expect((field() as HTMLInputElement).value).toBe('a')
    await user.keyboard('{Backspace}{Backspace}')
    expect(screen.queryByRole('button', { name: 'Remove Owner: tara' })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Filter removed: Owner: tara')
    await user.keyboard('{Backspace}')
    expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull()
    await user.keyboard('{Backspace}')
    expect(scopeChip('Everywhere')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Searching in Everywhere')
    expect(document.activeElement).toBe(field())
  })

  it('removes a chip with its button and keeps focus in the query', async () => {
    const { user } = renderWithSatin(<ScopedSearch filters={filters} groups={groups} defaultValue={{ tokens: [{ key: 'stage', value: 'offer' }], text: '' }} hotkey={false} />)
    await user.click(screen.getByRole('button', { name: 'Remove Stage: Offer' }))
    expect(screen.queryByRole('button', { name: 'Remove Stage: Offer' })).toBeNull()
    expect(document.activeElement).toBe(field())
  })

  it('in a scope that finds nothing, says so and offers the scopes that do', async () => {
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} filters={filters} groups={groups} defaultValue={{ scope: 'jobs', tokens: [], text: '' }} hotkey={false} />)
    await user.click(field())
    await user.keyboard('ada')
    expect(screen.getByText('No results for “ada” in Jobs')).toBeTruthy()
    expect(rows()).toEqual(['Everywhere22 results', 'Candidates11 result', 'My pipeline11 result'])
    await user.keyboard('{Enter}')
    expect(scopeChip('Everywhere')).toBeTruthy()
    expect(rows()).toEqual(['Ada NovakFrontend engineer', 'Ada: strong React round'])
  })

  it('says when nothing matches, and reads the count out once typing settles', async () => {
    const { user } = renderWithSatin(<ScopedSearch filters={filters} groups={groups} hotkey={false} />)
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
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} groups={server} filter={false} defaultValue={{ scope: 'jobs', tokens: [], text: 'zzz' }} hotkey={false} />)
    await user.click(field())
    expect(screen.getByRole('group', { name: 'Candidates, 42 results' })).toBeTruthy()
    expect(rows().length).toBe(2)
  })

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = React.useState<ScopedSearchQuery>({ tokens: [], text: '' })
      return (
        <>
          <ScopedSearch scopes={scopes} filters={filters} groups={groups} value={value} onValueChange={setValue} hotkey={false} />
          <output>{formatScopedQuery(value)}</output>
        </>
      )
    }
    const { user } = renderWithSatin(<Controlled />)
    await user.click(field())
    await user.keyboard('in:mine owner:tara jon')
    expect(document.querySelector('output')!.textContent).toBe('in:mine owner:tara jon')
    expect(scopeChip('My pipeline')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove Owner: tara' })).toBeTruthy()
  })

  it('speaks the app’s language', async () => {
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} filters={filters} groups={groups} recent={['react']} hotkey={false} />, {
      labels: {
        searchField: 'Szukaj',
        scopedSearchRecent: 'Ostatnie wyszukiwania',
        scopedSearchFilters: 'Filtry',
        scopedSearchScopes: 'Szukaj w',
        scopedSearchScope: (scope) => `Szukaj w: ${scope}`,
        scopedSearchResults: 'Wyniki wyszukiwania',
        scopedSearchToken: (filter, value) => `${filter} – ${value}`,
        scopedSearchGroup: (group, count) => `${group}: ${count}`,
        removeItem: (name) => `Usuń ${name}`,
      },
    })
    await user.click(screen.getByRole('combobox', { name: 'Szukaj' }))
    expect(screen.getByRole('listbox', { name: 'Wyniki wyszukiwania' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Ostatnie wyszukiwania' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Filtry' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Szukaj w: Everywhere' }))
    expect(screen.getByRole('group', { name: 'Szukaj w' })).toBeTruthy()
    await user.keyboard('stage:interview ')
    expect(screen.getByRole('button', { name: 'Usuń Stage – Interview' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Candidates: 2' })).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    const { user } = renderWithSatin(
      <ScopedSearch scopes={scopes} filters={filters} groups={groups} defaultValue={{ tokens: [{ key: 'stage', value: 'interview' }], text: '' }} hotkey={false} />,
      { theme },
    )
    await user.click(field())
    await user.keyboard('react')
    await expectNoAxeViolations()
  })

  it('has no axe violations in the scope list, nor with no results', async () => {
    const { user } = renderWithSatin(<ScopedSearch scopes={scopes} filters={filters} groups={groups} recent={['in:jobs react']} defaultValue={{ scope: 'jobs', tokens: [], text: '' }} hotkey={false} />, {
      theme: 'dark',
    })
    await user.click(scopeChip('Jobs'))
    await expectNoAxeViolations()
    await user.click(field())
    await user.keyboard('ada')
    await expectNoAxeViolations()
  }, 30000)
})
