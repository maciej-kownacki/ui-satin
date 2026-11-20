import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin, setReducedMotion } from 'satin-test'
import { Table, type Column } from '@uisatin/ui/table'
import { Toaster, toast } from '@uisatin/ui/toast'
import { BulkActionBar, type BulkAction } from '../components/bulk-action-bar'

type Deal = { id: string; company: string }
const deals: Deal[] = [
  { id: 'acme', company: 'Acme Corp' },
  { id: 'globex', company: 'Globex' },
  { id: 'initech', company: 'Initech' },
]
const columns: Column<Deal>[] = [{ key: 'company', header: 'Deal' }]

/** A Table with the bar under it, wired the way the docs show. */
function Deals({
  initial = [] as string[],
  actions,
  overflow,
  selectAll = true,
}: {
  initial?: string[]
  actions?: BulkAction[]
  overflow?: BulkAction[]
  selectAll?: boolean
}) {
  const [selected, setSelected] = React.useState<string[]>(initial)
  return (
    <div>
      <Table label="Deals" columns={columns} rows={deals} selectable selected={selected} onSelectedChange={setSelected} rowLabel={(d) => d.company} />
      <BulkActionBar
        count={selected.length}
        total={deals.length}
        onSelectAll={selectAll ? () => setSelected(deals.map((d) => d.id)) : undefined}
        onClear={() => setSelected([])}
        actions={actions}
        overflow={overflow}
      />
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

  it('moves along the toolbar with the arrow keys, Home and End: select all, the actions, then clear', async () => {
    const actions = ['Move', 'Assign', 'Delete'].map((label) => ({ label, onSelect: () => {} }))
    const { user } = renderWithSatin(<Deals initial={['acme']} actions={actions} />)
    const bar = within(toolbar())
    const selectAll = bar.getByRole('checkbox', { name: 'Select all' })
    selectAll.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(bar.getByRole('button', { name: 'Move' }))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(bar.getByRole('button', { name: 'Assign' }))
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(bar.getByRole('button', { name: 'Clear selection' }))
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(bar.getByRole('button', { name: 'Delete' }))
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(selectAll)
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(bar.getByRole('button', { name: 'Clear selection' }))
  })

  it('puts clear at the end, after a rule that follows the ⋯ menu', async () => {
    renderWithSatin(<Deals initial={['acme']} actions={[{ label: 'Move', onSelect: () => {} }]} overflow={[{ label: 'Archive', onSelect: () => {} }]} />)
    const slots = [...toolbar().querySelectorAll('[data-slot]')].map((el) => el.getAttribute('data-slot')).filter((s) => s?.startsWith('bulk-action-bar-') && s !== 'bulk-action-bar-number')
    expect(slots.slice(-3)).toEqual(['bulk-action-bar-overflow', 'bulk-action-bar-separator', 'bulk-action-bar-clear'])
  })

  it('selects all from its checkbox: indeterminate while some are picked, checked when all are, and a click then clears', async () => {
    const { user } = renderWithSatin(<Deals initial={['acme']} actions={[{ label: 'Move', onSelect: () => {} }]} />)
    const selectAll = screen.getByRole('checkbox', { name: 'Select all' })
    expect(selectAll.getAttribute('aria-checked')).toBe('mixed')
    await user.click(selectAll)
    expect(selectAll.getAttribute('aria-checked')).toBe('true')
    expect(status().textContent).toBe('3 selected')
    expect(screen.getByRole('checkbox', { name: 'Select Initech' }).getAttribute('aria-checked')).toBe('true')
    await user.click(selectAll)
    expect(toolbar().getAttribute('data-state')).toBe('closed')
    expect(status().textContent).toBe('Selection cleared')
  })

  it('has no select-all checkbox without onSelectAll', () => {
    renderWithSatin(<Deals initial={['acme']} selectAll={false} actions={[{ label: 'Move', onSelect: () => {} }]} />)
    expect(within(toolbar()).queryByRole('checkbox')).toBeNull()
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
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Select all' }))
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Clear selection' }))
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(checkbox)
  })

  it('shows no key hints on the actions, and keys other than Escape do nothing', async () => {
    const move = vi.fn()
    const { user } = renderWithSatin(<Deals initial={['acme']} actions={[{ label: 'Move', onSelect: move }]} />)
    expect(toolbar().querySelector('kbd')).toBeNull()
    expect(screen.getByRole('button', { name: 'Move' }).hasAttribute('aria-keyshortcuts')).toBe(false)
    screen.getByRole('checkbox', { name: 'Select Acme Corp' }).focus()
    await user.keyboard('m')
    expect(move).not.toHaveBeenCalled()
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

  it('shows the count in a Badge and rolls it when it changes, but not under reduced motion', async () => {
    const { user } = renderWithSatin(<Deals initial={['acme']} actions={[{ label: 'Move', onSelect: () => {} }]} />)
    expect(document.querySelector('[data-slot="bulk-action-bar-number"]')?.closest('[data-slot="badge"]')).toBeTruthy()
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
        selectAll: 'Zaznacz wszystkie',
        moreActions: 'Więcej akcji',
      },
    })
    expect(screen.getByRole('toolbar', { name: 'Akcje zbiorcze' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Zaznacz wszystkie' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Wyczyść zaznaczenie' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Więcej akcji' })).toBeTruthy()
    expect(status().textContent).toBe('Zaznaczono: 2')
  })

  it.each(['light', 'dark'] as const)('has no axe violations, shown and hidden, in %s', async (theme) => {
    const { user } = renderWithSatin(
      <Deals initial={['acme']} actions={[{ label: 'Move', onSelect: () => {} }, { label: 'Delete', tone: 'destructive', onSelect: () => {} }]} overflow={[{ label: 'Archive', onSelect: () => {} }]} />,
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
