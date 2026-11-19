import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import {
  DataGrid,
  DataGridColumnsMenu,
  DataGridToolbar,
  DataGridViewMenu,
  type DataGridColumn,
  type DataGridProps,
  type DataGridSort,
  type DataGridView,
} from '../components/data-grid'

type Person = { id: string; name: string; stage: string; score: number }
const people: Person[] = [
  { id: 'ada', name: 'Ada Okafor', stage: 'Screening', score: 7 },
  { id: 'bruno', name: 'Bruno Lindqvist', stage: 'Interview', score: 9 },
  { id: 'chloe', name: 'Chloé Moreau', stage: 'Offer', score: 4 },
]
const columns: DataGridColumn<Person>[] = [
  { key: 'name', header: 'Name', sortable: true, pinned: 'start', hideable: false },
  { key: 'stage', header: 'Stage', editable: true, width: 140 },
  { key: 'score', header: 'Score', sortable: true, align: 'right', editable: true, width: 100 },
]

function Grid(props: Partial<DataGridProps<Person>>) {
  return <DataGrid label="People" columns={columns} rows={people} {...props} />
}

const grid = () => screen.getByRole('grid', { name: 'People' })
const cell = (row: number, col: number) => grid().querySelector<HTMLElement>(`[data-pos="${row}:${col}"]`)!
const names = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('gridcell')[0].textContent)
// The grid's own live region (a modal menu hides the rest of the page from role queries).
const status = () => document.querySelector<HTMLElement>('[data-slot="data-grid"] > [role="status"]')!

// Pagination's sliding pill animates with the Web Animations API, which jsdom lacks.
Element.prototype.getAnimations ??= () => []

describe('DataGrid', () => {
  it('renders a grid with numbered rows and columns', () => {
    renderWithSatin(<Grid selectable />)
    expect(grid().getAttribute('aria-rowcount')).toBe('4')
    expect(grid().getAttribute('aria-colcount')).toBe('4')
    expect(grid().getAttribute('aria-multiselectable')).toBe('true')
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['', 'Name', 'Stage', 'Score'])
    const rows = screen.getAllByRole('row')
    expect(rows[1].getAttribute('aria-rowindex')).toBe('2')
    expect(within(rows[1]).getByRole('checkbox', { name: 'Select Ada Okafor' })).toBeTruthy()
    // Editable grid: the cells that can't be edited say so.
    expect(screen.getByRole('gridcell', { name: 'Ada Okafor' }).getAttribute('aria-readonly')).toBe('true')
  })

  it('keeps one cell in the tab order and moves it with the arrows, Home, End and Page keys', async () => {
    const { user } = renderWithSatin(<Grid />)
    await user.tab()
    // The first header, a sortable one: its button holds the focus.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Name' }))
    expect(grid().querySelectorAll('[tabindex="0"]').length).toBe(2) // the header and its resize handle
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(cell(1, 0))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(cell(1, 1))
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(cell(1, 2))
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(cell(1, 0))
    await user.keyboard('{Control>}{End}{/Control}')
    expect(document.activeElement).toBe(cell(3, 2))
    await user.keyboard('{Control>}{Home}{/Control}')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Name' }))
    await user.keyboard('{PageDown}')
    expect(document.activeElement).toBe(cell(3, 0))
    await user.keyboard('{PageUp}')
    expect(document.activeElement).toBe(cell(1, 0))
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Name' }))
    // Only the focused cell is a tab stop.
    await user.keyboard('{ArrowDown}')
    expect(grid().querySelectorAll('[tabindex="0"]')).toHaveLength(1)
  })

  it('mirrors the arrow keys right to left', async () => {
    const { user } = renderWithSatin(<Grid />, { dir: 'rtl' })
    act(() => cell(1, 0).focus())
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(cell(1, 1))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(cell(1, 0))
  })

  it('sorts from the header with Enter, uncontrolled: ascending, descending, none', async () => {
    const onSortChange = vi.fn()
    const { user } = renderWithSatin(<Grid onSortChange={onSortChange} />)
    const header = screen.getByRole('columnheader', { name: 'Score' })
    expect(header.getAttribute('aria-sort')).toBe('none')
    act(() => screen.getByRole('button', { name: 'Score' }).focus())
    await user.keyboard('{Enter}')
    expect(header.getAttribute('aria-sort')).toBe('ascending')
    expect(names()).toEqual(['Chloé Moreau', 'Ada Okafor', 'Bruno Lindqvist'])
    expect(status().textContent).toBe('Sorted by Score, ascending')
    await user.keyboard('{Enter}')
    expect(header.getAttribute('aria-sort')).toBe('descending')
    expect(names()).toEqual(['Bruno Lindqvist', 'Ada Okafor', 'Chloé Moreau'])
    await user.keyboard('{Enter}')
    expect(header.getAttribute('aria-sort')).toBe('none')
    expect(onSortChange.mock.calls.map((c) => c[0])).toEqual([{ key: 'score', direction: 'asc' }, { key: 'score', direction: 'desc' }, null])
  })

  it('takes a controlled sort and leaves it to the app', async () => {
    const onSortChange = vi.fn()
    const sort: DataGridSort = { key: 'name', direction: 'desc' }
    const { user } = renderWithSatin(<Grid sort={sort} onSortChange={onSortChange} />)
    expect(names()).toEqual(['Chloé Moreau', 'Bruno Lindqvist', 'Ada Okafor'])
    await user.click(screen.getByRole('button', { name: 'Name' }))
    expect(onSortChange).toHaveBeenCalledWith(null)
    // Still the app's sort until it passes another.
    expect(names()).toEqual(['Chloé Moreau', 'Bruno Lindqvist', 'Ada Okafor'])
  })

  it('resizes a column from its handle with the keyboard, uncontrolled and controlled', async () => {
    const onColumnSizingChange = vi.fn()
    const { user, unmount } = renderWithSatin(<Grid onColumnSizingChange={onColumnSizingChange} />)
    act(() => screen.getByRole('columnheader', { name: 'Stage' }).focus())
    await user.tab()
    const handle = screen.getByRole('separator', { name: 'Resize Stage' })
    expect(document.activeElement).toBe(handle)
    expect(handle.getAttribute('aria-valuenow')).toBe('140')
    await user.keyboard('{ArrowRight}')
    expect(handle.getAttribute('aria-valuenow')).toBe('148')
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}')
    expect(handle.getAttribute('aria-valuenow')).toBe('108')
    await user.keyboard('{Home}')
    expect(handle.getAttribute('aria-valuenow')).toBe('64')
    expect(onColumnSizingChange).toHaveBeenLastCalledWith({ stage: 64 })
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(screen.getByRole('columnheader', { name: 'Stage' }))
    unmount()

    const onChange = vi.fn()
    const { user: u2 } = renderWithSatin(<Grid columnSizing={{ stage: 200 }} onColumnSizingChange={onChange} />)
    const controlled = screen.getByRole('separator', { name: 'Resize Stage' })
    expect(controlled.getAttribute('aria-valuenow')).toBe('200')
    act(() => controlled.focus())
    await u2.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith({ stage: 208 })
    expect(controlled.getAttribute('aria-valuenow')).toBe('200')
  })

  it('edits a cell: Enter opens the editor, Enter saves, Escape cancels, F2 opens it too', async () => {
    const onCellEdit = vi.fn()
    const { user } = renderWithSatin(<Grid onCellEdit={onCellEdit} />)
    act(() => cell(1, 1).focus())
    await user.keyboard('{Enter}')
    const input = screen.getByRole('textbox', { name: 'Stage' })
    expect(document.activeElement).toBe(input)
    await user.clear(input)
    await user.type(input, 'Interview{Enter}')
    expect(onCellEdit).toHaveBeenCalledWith('ada', 'stage', 'Interview')
    expect(document.activeElement).toBe(cell(1, 1))

    await user.keyboard('{F2}')
    await user.type(screen.getByRole('textbox', { name: 'Stage' }), ' later{Escape}')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(onCellEdit).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(cell(1, 1))

    // A number column gets its number back; Tab saves and moves on.
    act(() => cell(1, 2).focus())
    await user.keyboard('{Enter}')
    const score = screen.getByRole('textbox', { name: 'Score' })
    await user.clear(score)
    await user.type(score, '8')
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(onCellEdit).toHaveBeenLastCalledWith('ada', 'score', 8)
    expect(document.activeElement).toBe(cell(1, 1))
  })

  it('shows a cell saving while the promise runs, and its error when it rejects', async () => {
    let settle: { resolve: () => void; reject: (e: Error) => void } | undefined
    const onCellEdit = vi.fn(() => new Promise<void>((resolve, reject) => (settle = { resolve, reject })))
    const { user } = renderWithSatin(<Grid onCellEdit={onCellEdit} />)
    act(() => cell(1, 1).focus())
    await user.keyboard('{Enter}')
    await user.type(screen.getByRole('textbox', { name: 'Stage' }), '!{Enter}')
    expect(cell(1, 1).getAttribute('aria-busy')).toBe('true')
    expect(cell(1, 1).textContent).toContain('Screening!')
    await act(async () => settle!.reject(new Error('The ATS is down.')))
    expect(cell(1, 1).getAttribute('aria-invalid')).toBe('true')
    expect(cell(1, 1).getAttribute('aria-busy')).toBeNull()
    expect(screen.getByText(/The ATS is down\. Enter to try again, Escape to undo/)).toBeTruthy()
    expect(status().textContent).toBe('Couldn’t save this change: The ATS is down.')

    // Enter edits the value that failed; this time the save goes through.
    await user.keyboard('{Enter}')
    expect((screen.getByRole('textbox', { name: 'Stage' }) as HTMLInputElement).value).toBe('Screening!')
    await user.keyboard('{Enter}')
    await act(async () => settle!.resolve())
    expect(cell(1, 1).getAttribute('aria-invalid')).toBeNull()
    expect(status().textContent).toBe('Saved')
  })

  it('drops a failed change with Escape', async () => {
    const onCellEdit = () => Promise.reject(new Error('No'))
    const { user } = renderWithSatin(<Grid onCellEdit={onCellEdit} />)
    act(() => cell(2, 1).focus())
    await user.keyboard('{Enter}')
    await user.type(screen.getByRole('textbox', { name: 'Stage' }), 'x{Enter}')
    await act(() => Promise.resolve())
    expect(cell(2, 1).getAttribute('aria-invalid')).toBe('true')
    await user.keyboard('{Escape}')
    expect(cell(2, 1).getAttribute('aria-invalid')).toBeNull()
    expect(cell(2, 1).textContent).toBe('Interview')
  })

  it('selects rows with Space on a checkbox and Shift+Space anywhere in the row, controlled or not', async () => {
    const onSelectionChange = vi.fn()
    const { user, unmount } = renderWithSatin(<Grid selectable onSelectionChange={onSelectionChange} />)
    act(() => screen.getByRole('checkbox', { name: 'Select Ada Okafor' }).focus())
    await user.keyboard(' ')
    expect(onSelectionChange).toHaveBeenLastCalledWith(['ada'])
    expect(screen.getAllByRole('row')[1].getAttribute('aria-selected')).toBe('true')
    await user.keyboard('{ArrowDown}{ArrowRight}{Shift>} {/Shift}')
    expect(onSelectionChange).toHaveBeenLastCalledWith(['ada', 'bruno'])
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    expect(onSelectionChange).toHaveBeenLastCalledWith(['ada', 'bruno', 'chloe'])
    unmount()

    const onChange = vi.fn()
    renderWithSatin(<Grid selectable selection={['chloe']} onSelectionChange={onChange} />)
    expect(screen.getByRole('checkbox', { name: 'Select all rows' }).getAttribute('aria-checked')).toBe('mixed')
    await user.click(screen.getByRole('checkbox', { name: 'Select Ada Okafor' }))
    expect(onChange).toHaveBeenCalledWith(['chloe', 'ada'])
    expect(screen.getByRole('checkbox', { name: 'Select Ada Okafor' }).getAttribute('aria-checked')).toBe('false')
  })

  it('draws only the rows on screen above 200 rows, and counts them all', () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({ id: `p${i}`, name: `Person ${i}`, stage: 'Applied', score: i }))
    renderWithSatin(<Grid rows={many} />)
    expect(grid().getAttribute('aria-rowcount')).toBe('1001')
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.length).toBeLessThan(40)
    expect(rows.at(-1)!.getAttribute('aria-rowindex')).toBe(String(rows.length + 1))
  })

  it('hides and reorders columns from the Columns menu', async () => {
    const onColumnVisibilityChange = vi.fn()
    const onColumnOrderChange = vi.fn()
    const { user } = renderWithSatin(
      <Grid
        onColumnVisibilityChange={onColumnVisibilityChange}
        onColumnOrderChange={onColumnOrderChange}
        toolbar={
          <DataGridToolbar>
            <DataGridColumnsMenu />
          </DataGridToolbar>
        }
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Columns' }))
    const menu = screen.getByRole('menu', { name: 'Columns' })
    expect(within(menu).getByRole('menuitemcheckbox', { name: 'Name' }).getAttribute('aria-disabled')).toBe('true')
    await user.click(within(menu).getByRole('menuitemcheckbox', { name: 'Stage' }))
    expect(onColumnVisibilityChange).toHaveBeenLastCalledWith({ stage: false })
    expect(screen.queryByRole('columnheader', { name: 'Stage' })).toBeNull()
    // The menu stays open for the next column.
    expect(within(menu).getByRole('menuitemcheckbox', { name: 'Stage' }).getAttribute('aria-checked')).toBe('false')

    act(() => within(menu).getByRole('menuitemcheckbox', { name: 'Name' }).focus())
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(onColumnOrderChange).toHaveBeenLastCalledWith(['stage', 'name', 'score'])
    expect(status().textContent).toBe('Name, position 2 of 3')

    await user.click(within(menu).getByRole('menuitem', { name: 'Reset columns' }))
    expect(onColumnVisibilityChange).toHaveBeenLastCalledWith({})
    expect(screen.getByRole('columnheader', { name: 'Stage' })).toBeTruthy()
  })

  it('takes controlled visibility and order', () => {
    renderWithSatin(<Grid columnVisibility={{ score: false }} columnOrder={['stage', 'name']} />)
    // Name is pinned to the start, so it stays first whatever the order.
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Stage'])
  })

  it('saves the grid as a view and puts it back when the view is picked', async () => {
    const onViewsChange = vi.fn()
    const onValueChange = vi.fn()
    const views: DataGridView<{ q: string }>[] = [{ id: 'all', name: 'Everyone' }]
    const { user } = renderWithSatin(
      <Grid
        toolbar={
          <DataGridToolbar>
            <DataGridColumnsMenu />
            <DataGridViewMenu defaultViews={views} defaultValue="all" filters={{ q: 'a' }} onViewsChange={onViewsChange} onValueChange={onValueChange} />
          </DataGridToolbar>
        }
      />,
    )
    // The grid moves away from the view: Score hidden.
    await user.click(screen.getByRole('button', { name: 'Columns' }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Score' }))
    await user.keyboard('{Escape}')
    const trigger = screen.getByRole('button', { name: 'View: Everyone, unsaved changes' })

    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Save as new view…' }))
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
    const dialog = screen.getByRole('dialog', { name: 'Save view' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'My interviews{Enter}')
    expect(onViewsChange).toHaveBeenLastCalledWith([
      views[0],
      { id: 'my-interviews', name: 'My interviews', sort: null, columnVisibility: { score: false }, columnOrder: ['name', 'stage', 'score'], columnSizing: {}, filters: { q: 'a' } },
    ])
    expect(onValueChange).toHaveBeenLastCalledWith('my-interviews', expect.objectContaining({ name: 'My interviews' }))
    expect(screen.getByRole('button', { name: 'View: My interviews' })).toBeTruthy()
    expect(status().textContent).toBe('My interviews saved')

    // Back to Everyone: Score shows again and the body fades in.
    await user.click(screen.getByRole('button', { name: 'View: My interviews' }))
    await user.click(screen.getByRole('menuitem', { name: /Everyone/ }))
    expect(screen.getByRole('columnheader', { name: 'Score' })).toBeTruthy()
    expect(grid().querySelector('[data-slot="data-grid-body"]')!.hasAttribute('data-switch')).toBe(true)
    expect(onValueChange).toHaveBeenLastCalledWith('all', views[0])
  })

  it('shows Skeleton rows while loading, and the empty, no-results and error states', async () => {
    const { rerender, user } = renderWithSatin(<Grid loading />)
    expect(grid().getAttribute('aria-busy')).toBe('true')
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)

    rerender(<Grid rows={[]} />)
    expect(screen.getByText('Nothing here yet')).toBeTruthy()

    const onClearFilters = vi.fn()
    rerender(<Grid rows={[]} filtered onClearFilters={onClearFilters} />)
    expect(screen.getByText('No results')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClearFilters).toHaveBeenCalled()

    const onRetry = vi.fn()
    rerender(<Grid error="The ATS is down." onRetry={onRetry} />)
    expect(screen.getByText('Couldn’t load the rows')).toBeTruthy()
    expect(screen.getByText('The ATS is down.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('pages the rows with pageSize', async () => {
    const onPageChange = vi.fn()
    const { user } = renderWithSatin(<Grid pageSize={2} onPageChange={onPageChange} />)
    expect(names()).toEqual(['Ada Okafor', 'Bruno Lindqvist'])
    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
    expect(names()).toEqual(['Chloé Moreau'])
  })

  it('says its words through SatinLabels', async () => {
    const { user } = renderWithSatin(
      <Grid
        selectable
        toolbar={
          <DataGridToolbar>
            <DataGridColumnsMenu />
            <DataGridViewMenu />
          </DataGridToolbar>
        }
      />,
      {
        labels: {
          dataGridColumns: 'Kolumny',
          dataGridViews: 'Widoki',
          dataGridResizeColumn: (c) => `Zmień szerokość: ${c}`,
          dataGridSorted: (c, d) => `Sortowanie: ${c} ${d}`,
          selectAllRows: 'Zaznacz wszystkie',
        },
      },
    )
    expect(screen.getByRole('button', { name: 'Kolumny' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Widoki' })).toBeTruthy()
    expect(screen.getByRole('separator', { name: 'Zmień szerokość: Stage' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Zaznacz wszystkie' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Name' }))
    expect(status().textContent).toBe('Sortowanie: Name asc')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    const { user } = renderWithSatin(
      <Grid
        selectable
        toolbar={
          <DataGridToolbar>
            <DataGridColumnsMenu />
            <DataGridViewMenu defaultViews={[{ id: 'all', name: 'Everyone' }]} defaultValue="all" />
          </DataGridToolbar>
        }
      />,
      { theme },
    )
    await expectNoAxeViolations()
    // With a cell editing and the Columns menu open.
    act(() => cell(1, 2).focus())
    await user.keyboard('{Enter}')
    await expectNoAxeViolations()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Columns' }))
    await expectNoAxeViolations()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in its states in %s', async (theme) => {
    const { rerender } = renderWithSatin(<Grid loading selectable />, { theme })
    await expectNoAxeViolations()
    rerender(<Grid rows={[]} filtered onClearFilters={() => {}} />)
    await expectNoAxeViolations()
    rerender(<Grid error onRetry={() => {}} />)
    await expectNoAxeViolations()
  })
})
