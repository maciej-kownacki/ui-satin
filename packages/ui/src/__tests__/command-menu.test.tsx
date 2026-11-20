import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { CommandMenu, type CommandGroup } from '../components/command-menu'
import { KbdHint } from '../components/kbd'

const groups = (onSelect = vi.fn(), keepOpen = false): CommandGroup[] => [
  {
    label: 'Suggestions',
    items: [
      { id: 'new', label: 'New issue', onSelect },
      { id: 'docs', label: 'Search docs', keywords: ['guides'], onSelect },
    ],
  },
  { label: 'Workspace', items: [{ id: 'settings', label: 'Settings', keepOpen, onSelect }] },
]

const highlighted = () => screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')

describe('CommandMenu', () => {
  it('filters as you type, moves with the arrows and runs the row with Enter, closing the menu', async () => {
    const onSelect = vi.fn()
    const { user } = renderWithSatin(<CommandMenu defaultOpen hotkey={false} groups={groups(onSelect)} />)
    const field = screen.getByRole('combobox', { name: 'Search commands' })
    expect(document.activeElement).toBe(field)
    expect(screen.getAllByRole('option')).toHaveLength(3)
    await user.keyboard('{ArrowDown}')
    expect(highlighted()?.textContent).toBe('Search docs')
    await user.type(field, 'guid')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Search docs'])
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the menu open for a keepOpen item', async () => {
    const onSelect = vi.fn()
    const { user } = renderWithSatin(<CommandMenu defaultOpen hotkey={false} groups={groups(onSelect, true)} />)
    await user.type(screen.getByRole('combobox'), 'sett')
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('starts from the first row when the rows change under the same query', async () => {
    function Paged() {
      const [page, setPage] = React.useState(0)
      const second: CommandGroup[] = [{ label: 'Stages', items: ['Lead', 'Won'].map((s) => ({ id: s, label: s })) }]
      return (
        <CommandMenu
          defaultOpen
          hotkey={false}
          groups={page ? second : [{ label: 'Deal', items: ['Log a call', 'Add a note', 'Move…'].map((l, i) => ({ id: l, label: l, keepOpen: i === 2, onSelect: () => setPage(1) })) }]}
        />
      )
    }
    const { user } = renderWithSatin(<Paged />)
    await user.keyboard('{ArrowUp}')
    expect(highlighted()?.textContent).toBe('Move…')
    await user.keyboard('{Enter}')
    expect(highlighted()?.textContent).toBe('Lead')
  })

  it('takes a controlled query, emptied as it closes', async () => {
    function Controlled() {
      const [query, setQuery] = React.useState('docs')
      const [open, setOpen] = React.useState(true)
      return (
        <>
          <output>{query || 'empty'}</output>
          <button onClick={() => setOpen(true)}>Open</button>
          <CommandMenu open={open} onOpenChange={setOpen} hotkey={false} query={query} onQueryChange={setQuery} groups={groups()} />
        </>
      )
    }
    const { user } = renderWithSatin(<Controlled />)
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('docs')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Search docs'])
    await user.type(screen.getByRole('combobox'), '!')
    expect(screen.getByText('docs!')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.getByText('empty')).toBeTruthy()
  })

  it('shows a header, children in place of the list, and its own footer', () => {
    renderWithSatin(
      <CommandMenu defaultOpen hotkey={false} groups={groups()} header={<nav aria-label="Path">Deals</nav>} footer={<KbdHint keys={['⌫']} label="Back" />}>
        <p>The answer</p>
      </CommandMenu>,
    )
    expect(screen.getByRole('navigation', { name: 'Path' })).toBeTruthy()
    expect(screen.getByText('The answer')).toBeTruthy()
    expect(screen.queryByRole('listbox')).toBeNull()
    const field = screen.getByRole('combobox')
    expect(field.getAttribute('aria-expanded')).toBe('false')
    expect(field.hasAttribute('aria-controls')).toBe(false)
    expect(screen.getByText('Back')).toBeTruthy()
    expect(screen.queryByText('Navigate')).toBeNull()
  })

  it('speaks the app’s language', () => {
    renderWithSatin(<CommandMenu defaultOpen hotkey={false} groups={groups()} />, {
      labels: { searchCommands: 'Szukaj poleceń', commands: 'Polecenia', commandPlaceholder: 'Wpisz polecenie…' },
    })
    expect(screen.getByRole('combobox', { name: 'Szukaj poleceń' }).getAttribute('placeholder')).toBe('Wpisz polecenie…')
    expect(screen.getByRole('listbox', { name: 'Polecenia' })).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<CommandMenu defaultOpen hotkey={false} groups={groups()} />, { theme })
    await expectNoAxeViolations()
  })
})
