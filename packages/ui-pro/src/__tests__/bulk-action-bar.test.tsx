import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin, setReducedMotion } from 'satin-test'
import { Table, type Column } from '@uisatin/ui/table'
import { Toaster, toast } from '@uisatin/ui/toast'
import { BulkActionBar, parseShortcut, type BulkAction } from '../components/bulk-action-bar'
import { toastBatch } from '../components/toast-batch'

type Deal = { id: string; company: string }
const deals: Deal[] = [
  { id: 'acme', company: 'Acme Corp' },
  { id: 'globex', company: 'Globex' },
  { id: 'initech', company: 'Initech' },
]
const columns: Column<Deal>[] = [{ key: 'company', header: 'Deal' }]

/** A Table with the bar under it, wired the way the docs show. */
function Deals({ initial = [] as string[], actions, overflow }: { initial?: string[]; actions?: BulkAction[]; overflow?: BulkAction[] }) {
  const [selected, setSelected] = React.useState<string[]>(initial)
  return (
    <div>
      <Table label="Deals" columns={columns} rows={deals} selectable selected={selected} onSelectedChange={setSelected} rowLabel={(d) => d.company} />
      <BulkActionBar count={selected.length} onClear={() => setSelected([])} actions={actions} overflow={overflow} />
    </div>
  )
}

const toolbar = () => screen.getByRole('toolbar', { hidden: true })
const status = () => screen.getByRole('status', { hidden: true })

afterEach(async () => {
  act(() => toast.dismiss())
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
})

describe('BulkActionBar', () => {
  it('is hidden at 0 and shows once rows are picked in the Table, saying how many', async () => {
    const { user } = renderWithSatin(<Deals actions={[{ label: 'Move', onSelect: () => {} }]} />)
    expect(toolbar().getAttribute('data-state')).toBe('closed')
    expect(toolbar().hasAttribute('inert')).toBe(true)
    await user.click(screen.getByRole('checkbox', { name: 'Select Acme Corp' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Globex' }))
    expect(toolbar().getAttribute('data-state')).toBe('open')
    expect(screen.getByRole('toolbar', { name: 'Bulk actions' })).toBeTruthy()
    expect(status().textContent).toBe('2 selected')
  })

  it('moves along the toolbar with the arrow keys, Home and End', async () => {
    const actions = ['Move', 'Assign', 'Delete'].map((label) => ({ label, onSelect: () => {} }))
    const { user } = renderWithSatin(<Deals initial={['acme']} actions={actions} />)
    const bar = within(toolbar())
    bar.getByRole('button', { name: 'Clear selection' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(bar.getByRole('button', { name: 'Move' }))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(bar.getByRole('button', { name: 'Assign' }))
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(bar.getByRole('button', { name: 'Delete' }))
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(bar.getByRole('button', { name: 'Clear selection' }))
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(bar.getByRole('button', { name: 'Delete' }))
  })

  it('clears with Escape from the table, and with the clear button', async () => {
    const { user } = renderWithSatin(<Deals initial={['acme', 'globex']} actions={[{ label: 'Move', onSelect: () => {} }]} />)
    screen.getByRole('checkbox', { name: 'Select Acme Corp' }).focus()
    await user.keyboard('{Escape}')
    expect(toolbar().getAttribute('data-state')).toBe('closed')
    expect(status().textContent).toBe('Selection cleared')
    await user.click(screen.getByRole('checkbox', { name: 'Select Initech' }))
    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(toolbar().getAttribute('data-state')).toBe('closed')
  })

  it('gives focus back to the checkbox when the bar hides under it', async () => {
    const { user } = renderWithSatin(<Deals initial={['acme']} actions={[{ label: 'Move', onSelect: () => {} }]} />)
    // The last checkbox in the table: the next Tab lands in the bar.
    const checkbox = screen.getByRole('checkbox', { name: 'Select Initech' })
    checkbox.focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Clear selection' }))
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(checkbox)
  })

  it('runs an action from its shortcut, and lists it with Kbd and aria-keyshortcuts', async () => {
    const move = vi.fn()
    const { user } = renderWithSatin(<Deals initial={['acme']} actions={[{ label: 'Move', shortcut: '⇧M', onSelect: move }]} />)
    const button = screen.getByRole('button', { name: /^Move/ })
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Shift+M')
    expect(button.querySelectorAll('kbd').length).toBe(2)
    screen.getByRole('checkbox', { name: 'Select Acme Corp' }).focus()
    await user.keyboard('{Shift>}M{/Shift}')
    expect(move).toHaveBeenCalledOnce()
    // Not without its modifier, and not while typing a plain key in a field.
    await user.keyboard('m')
    expect(move).toHaveBeenCalledOnce()
  })

  it('shows a Spinner while the action runs, then says it is done', async () => {
    let finish!: () => void
    const onSelect = () => new Promise<void>((resolve) => (finish = resolve))
    const { user } = renderWithSatin(<Deals initial={['acme']} actions={[{ label: 'Move', onSelect }]} />)
    const button = screen.getByRole('button', { name: 'Move' })
    await user.click(button)
    expect(button.getAttribute('aria-busy')).toBe('true')
    await user.click(button)
    await act(async () => finish())
    expect(button.getAttribute('aria-busy')).toBeNull()
    expect(button.getAttribute('data-state')).toBe('done')
    expect(status().textContent).toBe('Done')
  })

  it('runs overflow actions from the ⋯ menu', async () => {
    const archive = vi.fn()
    const { user } = renderWithSatin(<Deals initial={['acme']} overflow={[{ label: 'Archive', onSelect: archive }]} />)
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Archive' }))
    expect(archive).toHaveBeenCalledOnce()
  })

  it('rolls the count when it changes, but not under reduced motion', async () => {
    const { user } = renderWithSatin(<Deals initial={['acme']} actions={[{ label: 'Move', onSelect: () => {} }]} />)
    await user.click(screen.getByRole('checkbox', { name: 'Select Globex' }))
    const roll = document.querySelector('.satin-roll')
    expect(roll?.getAttribute('data-dir')).toBe('up')
    expect(roll?.querySelector('[data-roll="out"]')?.textContent).toBe('1')
    expect(roll?.querySelector('[data-roll="in"]')?.textContent).toBe('2')

    setReducedMotion(true)
    await user.click(screen.getByRole('checkbox', { name: 'Select Initech' }))
    expect(document.querySelector('.satin-roll')).toBeNull()
    expect(document.querySelector('[data-slot="bulk-action-bar-number"]')?.textContent).toBe('3')
  })

  it('speaks the words SatinLabels gives it', async () => {
    renderWithSatin(<Deals initial={['acme', 'globex']} overflow={[{ label: 'Archiwizuj', onSelect: () => {} }]} />, {
      labels: {
        bulkActions: 'Akcje zbiorcze',
        bulkSelected: (count, number) => <>Zaznaczono: {number}</>,
        clearSelection: 'Wyczyść zaznaczenie',
        moreActions: 'Więcej akcji',
      },
    })
    expect(screen.getByRole('toolbar', { name: 'Akcje zbiorcze' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Wyczyść zaznaczenie' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Więcej akcji' })).toBeTruthy()
    expect(status().textContent).toBe('Zaznaczono: 2')
  })

  it.each(['light', 'dark'] as const)('has no axe violations, shown and hidden, in %s', async (theme) => {
    const { user } = renderWithSatin(
      <Deals initial={['acme']} actions={[{ label: 'Move', shortcut: 'M', onSelect: () => {} }, { label: 'Delete', tone: 'destructive', onSelect: () => {} }]} overflow={[{ label: 'Archive', onSelect: () => {} }]} />,
      { theme },
    )
    await expectNoAxeViolations()
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await expectNoAxeViolations()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    await expectNoAxeViolations()
  })
})

describe('parseShortcut', () => {
  it('reads glyphs and words', () => {
    expect(parseShortcut('⌘⇧M')).toEqual({ meta: true, ctrl: false, shift: true, alt: false, key: 'M' })
    expect(parseShortcut('Ctrl + Shift + K')).toEqual({ meta: false, ctrl: true, shift: true, alt: false, key: 'K' })
    expect(parseShortcut('⌫').key).toBe('Backspace')
  })
})

describe('toastBatch', () => {
  const batch = () => {
    const undo = { acme: vi.fn(), globex: vi.fn(), initech: vi.fn() }
    const id = toastBatch({
      title: (count) => `${count} deals moved`,
      items: deals.map((d) => ({ id: d.id, label: d.company, undo: undo[d.id as keyof typeof undo] })),
    })
    return { undo, id }
  }

  it('undoes every item with the toast’s Undo', async () => {
    const { user } = renderWithSatin(<Toaster />)
    let undo!: ReturnType<typeof batch>['undo']
    act(() => void (undo = batch().undo))
    expect(screen.getByText('3 deals moved')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(undo.acme).toHaveBeenCalledOnce()
    expect(undo.globex).toHaveBeenCalledOnce()
    expect(undo.initech).toHaveBeenCalledOnce()
  })

  it('opens a list with an Undo per item; the title counts what is left', async () => {
    const { user } = renderWithSatin(<Toaster />, { labels: { showItems: 'Pokaż', undoItem: (item) => `Cofnij ${item}`, undone: 'Cofnięto' } })
    let undo!: ReturnType<typeof batch>['undo']
    act(() => void (undo = batch().undo))
    const show = screen.getByRole('button', { name: 'Pokaż' })
    expect(show.getAttribute('aria-expanded')).toBe('false')
    await user.click(show)
    // The same button, still focused, now open.
    expect(show.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(show)
    await user.click(screen.getByRole('button', { name: 'Cofnij Globex' }))
    expect(undo.globex).toHaveBeenCalledOnce()
    expect(undo.acme).not.toHaveBeenCalled()
    expect(screen.getByText('2 deals moved')).toBeTruthy()
    // The undone row keeps its button (and the focus), which now does nothing.
    const done = screen.getByRole('button', { name: 'Globex, Cofnięto' })
    expect(document.activeElement).toBe(done)
    await user.click(done)
    expect(undo.globex).toHaveBeenCalledOnce()
  })

  it('stays while its list is open, and closes after the last item is undone', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { user } = renderWithSatin(<Toaster />)
      act(() => void batch())
      await user.click(screen.getByRole('button', { name: 'Show' }))
      await act(async () => void vi.advanceTimersByTime(20_000))
      expect(screen.getByText('3 deals moved')).toBeTruthy()
      for (const name of ['Acme Corp', 'Globex', 'Initech']) await user.click(screen.getByRole('button', { name: `Undo ${name}` }))
      await act(async () => void vi.advanceTimersByTime(600))
      expect(screen.queryByText(/deals moved/)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it.each(['light', 'dark'] as const)('has no axe violations open, in %s', async (theme) => {
    const { user } = renderWithSatin(<Toaster />, { theme })
    act(() => void batch())
    await user.click(screen.getByRole('button', { name: 'Show' }))
    await expectNoAxeViolations()
  })
})
